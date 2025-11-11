import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;
    console.log('🗑️ Starting payment deletion process for:', paymentId);

    // First, fetch the payment details to understand what we're deleting
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        id,
        invoice_id,
        amount,
        method,
        bank_account_id,
        date
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Fetch invoice details separately
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, customer_name, total, paid_amount')
      .eq('id', payment.invoice_id)
      .single();

    console.log('💰 Payment to delete:', {
      id: payment.id,
      amount: payment.amount,
      customer: invoice?.customer_name,
      method: payment.method
    });

    // Step 1: Find and delete related journal entries
    console.log('📚 Looking for related journal entries...');
    const { data: journalEntries, error: journalQueryError } = await supabase
      .from('journal_entries')
      .select(`
        id,
        journal_number,
        total_debit,
        total_credit
      `)
      .eq('source_document_type', 'PAYMENT')
      .eq('source_document_id', paymentId);

    if (journalQueryError) {
      console.error('Error querying journal entries:', journalQueryError);
    }

    // Delete journal entry lines first (due to foreign key constraints)
    if (journalEntries && journalEntries.length > 0) {
      for (const entry of journalEntries) {
        console.log(`🗑️ Deleting journal entry lines for: ${entry.journal_number}`);
        
        // Get journal entry lines to understand which accounts were affected
        const { data: entryLines, error: linesQueryError } = await supabase
          .from('journal_entry_lines')
          .select(`
            id,
            account_id,
            debit_amount,
            credit_amount
          `)
          .eq('journal_entry_id', entry.id);

        if (linesQueryError) {
          console.error('Error querying journal entry lines:', linesQueryError);
          continue;
        }

        // Reverse the account balance changes
        if (entryLines && entryLines.length > 0) {
          console.log('💱 Reversing chart of accounts balance changes...');
          
          for (const line of entryLines) {
            // Get the account details
            const { data: account, error: accountError } = await supabase
              .from('chart_of_accounts')
              .select('id, account_name, current_balance, account_type')
              .eq('id', line.account_id)
              .single();

            if (accountError || !account) {
              console.error('Error fetching account details:', accountError);
              continue;
            }

            const currentBalance = account.current_balance || 0;
            
            // Reverse the effect: subtract debits, add back credits
            const reversalAmount = (line.debit_amount || 0) - (line.credit_amount || 0);
            const newBalance = currentBalance - reversalAmount;
            
            console.log(`💰 Reversing balance for ${account.account_name}:`, {
              currentBalance,
              reversalAmount,
              newBalance
            });

            const { error: balanceUpdateError } = await supabase
              .from('chart_of_accounts')
              .update({
                current_balance: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', account.id);

            if (balanceUpdateError) {
              console.error(`Error updating balance for ${account.account_name}:`, balanceUpdateError);
            } else {
              console.log(`✅ Updated ${account.account_name} balance: ${currentBalance} → ${newBalance}`);
            }
          }
        }

        // Delete journal entry lines
        const { error: linesDeleteError } = await supabase
          .from('journal_entry_lines')
          .delete()
          .eq('journal_entry_id', entry.id);

        if (linesDeleteError) {
          console.error(`Error deleting journal entry lines for ${entry.journal_number}:`, linesDeleteError);
        } else {
          console.log(`✅ Deleted journal entry lines for ${entry.journal_number}`);
        }
      }

      // Delete journal entries
      const { error: journalDeleteError } = await supabase
        .from('journal_entries')
        .delete()
        .eq('source_document_type', 'PAYMENT')
        .eq('source_document_id', paymentId);

      if (journalDeleteError) {
        console.error('Error deleting journal entries:', journalDeleteError);
      } else {
        console.log(`✅ Deleted ${journalEntries.length} journal entries`);
      }
    }

    // Step 2: Delete related bank transactions (the trigger will auto-update balances)
    console.log('🏦 Looking for related bank transactions...');
    
    // For payments, we need to find bank transactions by:
    // 1. bank_account_id from payment record
    // 2. amount matching payment amount
    // 3. date matching payment date
    // 4. type = 'deposit' (payments are money coming in)
    
    let bankTransactionsDeleted = 0;
    
    if (payment.bank_account_id) {
      console.log(`🔍 Searching for bank transaction: bank_account_id=${payment.bank_account_id}, amount=${payment.amount}, date=${payment.date}`);
      
      const { data: bankTransactions, error: bankQueryError } = await supabase
        .from('bank_transactions')
        .select('id, bank_account_id, amount, description, type, date')
        .eq('bank_account_id', payment.bank_account_id)
        .eq('type', 'deposit')
        .eq('amount', payment.amount)
        .eq('date', payment.date);

      if (bankQueryError) {
        console.error('Error querying bank transactions:', bankQueryError);
      } else if (bankTransactions && bankTransactions.length > 0) {
        console.log(`📋 Found ${bankTransactions.length} bank transaction(s) to delete`);
        
        // Delete the bank transactions (trigger will automatically update bank balance)
        const { error: bankDeleteError } = await supabase
          .from('bank_transactions')
          .delete()
          .in('id', bankTransactions.map(bt => bt.id));

        if (bankDeleteError) {
          console.error('Error deleting bank transactions:', bankDeleteError);
        } else {
          bankTransactionsDeleted = bankTransactions.length;
          console.log(`✅ Deleted ${bankTransactionsDeleted} bank transaction(s) - balance automatically updated by trigger`);
        }
      } else {
        console.log('ℹ️ No matching bank transactions found (may be cash payment or already deleted)');
      }
    } else {
      console.log('ℹ️ Payment has no bank_account_id (likely a cash payment without cash account selected)');
    }

    // Step 3: Update invoice paid_amount
    if (invoice) {
      const currentPaidAmount = invoice.paid_amount || 0;
      const newPaidAmount = Math.max(0, currentPaidAmount - payment.amount);
      
      console.log('📄 Updating invoice paid amount:', {
        invoiceId: payment.invoice_id,
        currentPaidAmount,
        paymentAmount: payment.amount,
        newPaidAmount
      });

      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount
        })
        .eq('id', payment.invoice_id);

      if (invoiceUpdateError) {
        console.error('Error updating invoice paid amount:', invoiceUpdateError);
      } else {
        console.log(`✅ Updated invoice paid amount: ${currentPaidAmount} → ${newPaidAmount}`);
      }
    }

    // Step 4: Finally, delete the payment record
    console.log('💳 Deleting payment record...');
    const { error: paymentDeleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (paymentDeleteError) {
      console.error('Error deleting payment:', paymentDeleteError);
      return NextResponse.json({ 
        error: 'Failed to delete payment record' 
      }, { status: 500 });
    }

    console.log('✅ Payment deletion completed successfully');

    return NextResponse.json({
      success: true,
      message: `Payment of ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(payment.amount)} deleted successfully`,
      deletedItems: {
        payment: 1,
        journalEntries: journalEntries?.length || 0,
        bankTransactions: bankTransactionsDeleted,
        updatedInvoice: payment.invoice_id
      }
    });

  } catch (error) {
    console.error('❌ Error deleting payment:', error);
    return NextResponse.json({ 
      error: 'Internal server error during payment deletion' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;
    const body = await request.json();
    const { amount, payment_date, description, method, reference, bank_account_id } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
    }

    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    console.log('🔄 Starting payment update with related records:', paymentId);

    // 1. Get the current payment to calculate difference and related data
    const { data: currentPayment, error: fetchError } = await supabase
      .from('payments')
      .select(`
        amount,
        payment_date,
        bank_account_id,
        invoice_id,
        invoices(paid_amount)
      `)
      .eq('id', paymentId)
      .single();

    if (fetchError || !currentPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const oldAmount = currentPayment.amount;
    const amountDifference = newAmount - oldAmount;
    
    console.log('💰 Payment amount change:', { oldAmount, newAmount, difference: amountDifference });

    // 2. Update the payment record
    // Convert empty string bank_account_id to null to avoid UUID errors
    const cleanBankAccountId = bank_account_id && bank_account_id.trim() !== '' ? bank_account_id : null;
    
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        amount: newAmount,
        date: payment_date,           // Update both date and payment_date
        payment_date,
        description,
        method,
        reference,
        bank_account_id: cleanBankAccountId
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Update invoice paid_amount if amount changed
    if (currentPayment.invoice_id && amountDifference !== 0) {
      console.log('📄 Updating invoice paid amount for invoice:', currentPayment.invoice_id);
      
      // Get current invoice paid amount separately to avoid TypeScript issues
      const { data: invoice } = await supabase
        .from('invoices')
        .select('paid_amount')
        .eq('id', currentPayment.invoice_id)
        .single();
      
      const currentPaidAmount = invoice?.paid_amount || 0;
      const newPaidAmount = Math.max(0, currentPaidAmount + amountDifference);
      
      await supabase
        .from('invoices')
        .update({ paid_amount: newPaidAmount })
        .eq('id', currentPayment.invoice_id);
      
      console.log('✅ Updated invoice paid amount by', amountDifference);
    }

    // 4. Update related bank transaction if it exists
    if (currentPayment.bank_account_id && amountDifference !== 0) {
      console.log('🏦 Updating bank transaction for bank account:', currentPayment.bank_account_id);
      
      // Find the related bank transaction (payments create deposits)
      const { data: bankTransaction } = await supabase
        .from('bank_transactions')
        .select('id, amount')
        .eq('bank_account_id', currentPayment.bank_account_id)
        .eq('date', currentPayment.payment_date)
        .eq('type', 'deposit')
        .eq('amount', oldAmount)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (bankTransaction) {
        // Update bank transaction amount
        await supabase
          .from('bank_transactions')
          .update({ 
            amount: newAmount,
            date: payment_date,
            description: `Payment: ${description}` 
          })
          .eq('id', bankTransaction.id);

        // Update bank account balance (payments increase balance)
        const { data: bankAccount, error: bankError } = await supabase
          .from('bank_accounts')
          .select('current_balance')
          .eq('id', currentPayment.bank_account_id)
          .single();

        if (!bankError && bankAccount) {
          // Adjust balance by the difference (add additional amount or subtract reduced amount)
          const newBalance = (bankAccount.current_balance || 0) + amountDifference;
          await supabase
            .from('bank_accounts')
            .update({ current_balance: newBalance })
            .eq('id', currentPayment.bank_account_id);
          
          console.log('✅ Updated bank balance by', amountDifference);
        }
      }
    }

    // 5. Journal entry updates would go here
    // Note: This requires complex reversal and recreation logic
    // For now, this is a known limitation that should be addressed in future updates
    
    console.log('✅ Payment update completed successfully');
    console.log('⚠️ Note: Journal entry updates not implemented - manual reconciliation may be needed');

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      message: 'Payment and related records updated successfully'
    });

  } catch (error) {
    console.error('Unexpected error in payment update:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
