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
        bank_account_id
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

    // Step 2: Find and update bank account balances, then delete related bank transactions
    console.log('🏦 Looking for related bank transactions...');
    const { data: bankTransactions, error: bankQueryError } = await supabase
      .from('bank_transactions')
      .select('id, bank_account_id, amount, description, type')
      .ilike('description', `%${payment.id.slice(0, 8)}%`);

    if (bankQueryError) {
      console.error('Error querying bank transactions:', bankQueryError);
    }

    if (bankTransactions && bankTransactions.length > 0) {
      // Update bank account balances BEFORE deleting transactions
      console.log('💰 Reversing bank account balances...');
      for (const bankTx of bankTransactions) {
        if (bankTx.bank_account_id) {
          // Reverse the transaction effect on bank balance
          // If it was a deposit (+), we subtract (-) to reverse
          // If it was a withdrawal (-), we add (+) to reverse
          const reverseAmount = bankTx.type === 'deposit' ? -bankTx.amount : bankTx.amount;
          
          const { error: balanceUpdateError } = await supabase.rpc('update_bank_balance', {
            account_id: bankTx.bank_account_id,
            delta: reverseAmount
          });

          if (balanceUpdateError) {
            console.error(`Error updating bank balance for account ${bankTx.bank_account_id}:`, balanceUpdateError);
          } else {
            console.log(`✅ Reversed bank balance: ${bankTx.type} of ${bankTx.amount} (delta: ${reverseAmount})`);
          }
        }
      }

      // Now delete the bank transactions
      const { error: bankDeleteError } = await supabase
        .from('bank_transactions')
        .delete()
        .ilike('description', `%${payment.id.slice(0, 8)}%`);

      if (bankDeleteError) {
        console.error('Error deleting bank transactions:', bankDeleteError);
      } else {
        console.log(`✅ Deleted ${bankTransactions.length} bank transactions`);
      }
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
        bankTransactions: bankTransactions?.length || 0,
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
