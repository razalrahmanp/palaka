// app/api/vendors/[id]/payments/route.ts
import { supabase } from '@/lib/supabasePool'
import { NextRequest, NextResponse } from 'next/server'
import { createVendorPaymentJournalEntry } from '@/lib/journalHelper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;

    // First try to get from new vendor_payment_history table
    const { data: newPayments, error: newError } = await supabase
      .from('vendor_payment_history')
      .select(`
        id,
        amount,
        payment_date as date,
        payment_method as method,
        reference_number as reference,
        notes as description,
        status
      `)
      .eq('supplier_id', vendorId)
      .order('payment_date', { ascending: false });

    if (!newError && newPayments && newPayments.length > 0) {
      return NextResponse.json(newPayments);
    }

    // Fallback to purchase_order_payments for existing data
    const { data: poPayments, error: poError } = await supabase
      .from('purchase_order_payments')
      .select(`
        id,
        amount,
        payment_date,
        purchase_orders!inner(supplier_id)
      `)
      .eq('purchase_orders.supplier_id', vendorId)
      .order('payment_date', { ascending: false });

    if (poError) throw poError;

    // Format the data consistently
    const formattedPayments = poPayments?.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      date: payment.payment_date,
      method: 'cash', // default for old records
      reference: null,
      description: 'Purchase Order Payment',
      status: 'Paid'
    })) || [];

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error('GET /api/vendors/[id]/payments error', error);
    return NextResponse.json({ error: 'Failed to fetch payment data' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;
    const body = await request.json();

    const {
      amount,
      payment_date,
      payment_method = 'cash',
      reference_number,
      notes,
      purchase_order_id,
      vendor_bill_id,
      created_by,
      bank_account_id,
      upi_account_id
    } = body;

    // Insert into vendor_payment_history table
    const insertData = {
      supplier_id: vendorId,
      amount,
      payment_date,
      payment_method,
      reference_number,
      notes,
      status: 'completed' as const,
      ...(vendor_bill_id && { vendor_bill_id }),
      ...(purchase_order_id && { purchase_order_id }),
      ...(bank_account_id && bank_account_id !== 'no-accounts' && { bank_account_id })
    };
    // Skip created_by for now to avoid user constraint issues

    console.log('🔄 Attempting to insert vendor payment with data:', insertData);

    const { data: payment, error: paymentError } = await supabase
      .from('vendor_payment_history')
      .insert(insertData)
      .select()
      .single();

    if (paymentError) {
      console.error('❌ Failed to insert into vendor_payment_history:', paymentError);
      console.log('🔄 Falling back to purchase_order_payments for compatibility');
    }

    if (paymentError) {
      const { data: poPayment, error: poError } = await supabase
        .from('purchase_order_payments')
        .insert({
          purchase_order_id,
          amount,
          payment_date
        })
        .select()
        .single();

      if (poError) throw poError;

      // Create journal entry for the fallback payment
      console.log('💰 Vendor payment created via fallback, creating journal entry...');
      
      // Handle cash payments vs bank payments differently (fallback)
      if (payment_method === 'cash') {
        console.log('💰 Processing fallback cash payment - creating cash transaction...');
        
        // 1. Create cash transaction record
        const { data: cashAccount } = await supabase
          .from('bank_accounts')
          .select('id')
          .eq('account_type', 'CASH')
          .single();

        if (cashAccount) {
          const { data: cashTransaction, error: cashTransactionError } = await supabase
            .from('cash_transactions')
            .insert({
              transaction_date: payment_date,
              amount: -parseFloat(amount), // Negative for outgoing payment
              transaction_type: 'DEBIT',
              description: `Vendor payment (fallback) - ${notes || 'Smart settlement'}`,
              reference_number: reference_number,
              source_type: 'expense',
              source_id: poPayment.id,
              cash_account_id: cashAccount.id,
              notes: `Fallback payment to vendor via cash settlement`
            })
            .select()
            .single();

          if (cashTransactionError) {
            console.error('❌ Failed to create fallback cash transaction:', cashTransactionError);
          } else {
            console.log('✅ Created fallback cash transaction:', cashTransaction.id);

            // 2. Update cash balance
            const { data: currentBalance } = await supabase
              .from('cash_balances')
              .select('current_balance')
              .eq('cash_account_id', cashAccount.id)
              .single();

            const newBalance = (currentBalance?.current_balance || 0) - parseFloat(amount);

            const { error: balanceUpdateError } = await supabase
              .from('cash_balances')
              .upsert({
                cash_account_id: cashAccount.id,
                current_balance: newBalance,
                last_transaction_id: cashTransaction.id,
                last_updated: new Date().toISOString()
              }, {
                onConflict: 'cash_account_id'
              });

            if (balanceUpdateError) {
              console.error('❌ Failed to update fallback cash balance:', balanceUpdateError);
            } else {
              console.log(`✅ Updated fallback cash balance: ${currentBalance?.current_balance || 0} → ${newBalance}`);
            }
          }
        }

        // 3. Create journal entry for fallback cash payment
        const journalResult = await createVendorPaymentJournalEntry({
          paymentId: poPayment.id,
          amount: parseFloat(amount),
          date: payment_date,
          reference: reference_number,
          description: notes || `Vendor fallback cash payment via smart settlement`,
          paymentMethod: payment_method,
          bankAccountId: cashAccount?.id // Use cash account ID
        });

        if (journalResult.success) {
          console.log('✅ Vendor fallback cash payment journal entry created:', journalResult.journalEntryId);
          console.log(`📊 Dr. ${journalResult.apAccount} ${amount}, Cr. Cash ${amount}`);
        } else {
          console.error('❌ Failed to create vendor fallback cash payment journal entry:', journalResult.error);
        }
      } else {
        // Handle bank/UPI payments as before (fallback)
        const selectedBankAccountId = payment_method === 'upi' ? upi_account_id : bank_account_id;
        
        const journalResult = await createVendorPaymentJournalEntry({
          paymentId: poPayment.id,
          amount: parseFloat(amount),
          date: payment_date,
          reference: reference_number,
          description: notes || `Vendor payment via ${payment_method}`,
          paymentMethod: payment_method,
          bankAccountId: selectedBankAccountId
        });
        
        if (journalResult.success) {
          console.log('✅ Vendor fallback payment journal entry created:', journalResult.journalEntryId);
          console.log(`📊 Dr. ${journalResult.apAccount} ${amount}, Cr. ${journalResult.cashAccount} ${amount}`);
        } else {
          console.error('❌ Failed to create vendor fallback payment journal entry:', journalResult.error);
        }
      }

      // Update vendor bill paid amount if bill is provided
      if (vendor_bill_id) {
        const { data: currentBill } = await supabase
          .from('vendor_bills')
          .select('paid_amount, total_amount')
          .eq('id', vendor_bill_id)
          .single();

        const newPaidAmount = (currentBill?.paid_amount || 0) + amount;
        const remainingAmount = (currentBill?.total_amount || 0) - newPaidAmount;
        
        // Determine new status
        let newStatus = 'pending';
        if (newPaidAmount >= (currentBill?.total_amount || 0)) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }

        const { error: updateError } = await supabase
          .from('vendor_bills')
          .update({ 
            paid_amount: newPaidAmount,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', vendor_bill_id);

        if (updateError) {
          console.error('Error updating vendor bill amounts:', updateError);
        } else {
          console.log(`✅ Updated vendor bill ${vendor_bill_id}: paid ${newPaidAmount}, remaining ${remainingAmount}, status ${newStatus}`);
        }
      }

      // Update purchase order paid amount
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({ 
          paid_amount: supabase.rpc('coalesce_sum', { value: amount })
        })
        .eq('id', purchase_order_id);

      if (updateError) console.error('Error updating PO paid amount:', updateError);

      // Create corresponding expense record for the fallback vendor payment
      console.log('📝 Creating expense record for fallback vendor payment...');
      
      // Get vendor details for expense description
      const { data: vendor } = await supabase
        .from('suppliers')
        .select('name')
        .eq('id', vendorId)
        .single();

      const vendorName = vendor?.name || 'Unknown Vendor';
      
      // Create expense record
      const expenseDescription = vendor_bill_id 
        ? `Payment for vendor bill - ${vendorName}` 
        : `Vendor payment - ${vendorName}`;

      const { data: expenseRecord, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          date: payment_date || new Date().toISOString().split('T')[0],
          category: 'Manufacturing',
          type: 'Direct',
          description: `${expenseDescription}${notes ? ` (${notes})` : ''}`,
          amount: parseFloat(amount),
          payment_method: payment_method,
          entity_type: 'supplier',
          entity_id: vendorId,
          entity_reference_id: poPayment.id,
          created_by: created_by || null
        })
        .select()
        .single();

      if (expenseError) {
        console.error('⚠️ Failed to create expense record for fallback vendor payment:', expenseError);
        // Don't fail the payment, just log the error
      } else {
        console.log('✅ Created expense record for fallback vendor payment:', expenseRecord.id);
      }

      return NextResponse.json(poPayment, { status: 201 });
    }

    // Handle cash payments vs bank payments differently
    if (payment_method === 'cash') {
      console.log('💰 Processing cash payment - creating cash transaction and bank transaction...');
      
      // 1. Get cash account
      const { data: cashAccount } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('account_type', 'CASH')
        .eq('is_active', true)
        .single();

      if (cashAccount) {
        // 2. Create bank transaction entry for cash payment
        console.log('📝 Creating bank transaction for cash payment...');
        
        const { data: bankTransaction, error: bankTxnError } = await supabase
          .from('bank_transactions')
          .insert({
            bank_account_id: cashAccount.id,
            date: payment_date,
            amount: parseFloat(amount),
            type: 'withdrawal',
            description: `Vendor payment (Cash) - ${notes || 'Smart settlement'}`,
            reference: reference_number || `VP-${payment.id.slice(0, 8)}`
          })
          .select()
          .single();

        if (bankTxnError) {
          console.error('❌ Failed to create bank transaction for cash:', bankTxnError);
        } else {
          console.log('✅ Created bank transaction for cash payment:', bankTransaction.id);
        }

        // 3. Create cash transaction record
        const { data: cashTransaction, error: cashTransactionError } = await supabase
          .from('cash_transactions')
          .insert({
            transaction_date: payment_date,
            amount: -parseFloat(amount), // Negative for outgoing payment
            transaction_type: 'DEBIT',
            description: `Vendor payment - ${notes || 'Smart settlement'}`,
            reference_number: reference_number,
            source_type: 'expense',
            source_id: payment.id,
            cash_account_id: cashAccount.id,
            notes: `Payment to vendor via cash settlement`
          })
          .select()
          .single();

        if (cashTransactionError) {
          console.error('❌ Failed to create cash transaction:', cashTransactionError);
        } else {
          console.log('✅ Created cash transaction:', cashTransaction.id);

          // 4. Update cash balance
          const { data: currentBalance } = await supabase
            .from('cash_balances')
            .select('current_balance')
            .eq('cash_account_id', cashAccount.id)
            .single();

          const newBalance = (currentBalance?.current_balance || 0) - parseFloat(amount);

          const { error: balanceUpdateError } = await supabase
            .from('cash_balances')
            .upsert({
              cash_account_id: cashAccount.id,
              current_balance: newBalance,
              last_transaction_id: cashTransaction.id,
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'cash_account_id'
            });

          if (balanceUpdateError) {
            console.error('❌ Failed to update cash balance:', balanceUpdateError);
          } else {
            console.log(`✅ Updated cash balance: ${currentBalance?.current_balance || 0} → ${newBalance}`);
          }
        }
      }

      // 5. Create journal entry for cash payment
      const journalResult = await createVendorPaymentJournalEntry({
        paymentId: payment.id,
        amount: parseFloat(amount),
        date: payment_date,
        reference: reference_number,
        description: notes || `Vendor cash payment via smart settlement`,
        paymentMethod: payment_method,
        bankAccountId: cashAccount?.id // Use cash account ID
      });

      if (journalResult.success) {
        console.log('✅ Vendor cash payment journal entry created:', journalResult.journalEntryId);
        console.log(`📊 Dr. ${journalResult.apAccount} ${amount}, Cr. Cash ${amount}`);
      } else {
        console.error('❌ Failed to create vendor cash payment journal entry:', journalResult.error);
      }
    } else {
      // Handle bank/UPI payments as before
      console.log('💰 Processing bank/UPI payment - creating journal entry and bank transaction...');
      
      // Determine bank account ID based on payment method
      const selectedBankAccountId = payment_method === 'upi' ? upi_account_id : bank_account_id;
      
      // CRITICAL FIX: Create bank transaction entry for bank payments
      if (selectedBankAccountId) {
        console.log('📝 Creating bank transaction for vendor payment...');
        
        const { data: bankTransaction, error: bankTxnError } = await supabase
          .from('bank_transactions')
          .insert({
            bank_account_id: selectedBankAccountId,
            date: payment_date,
            amount: parseFloat(amount),
            type: 'withdrawal',
            description: `Vendor payment - ${notes || 'Smart settlement'}`,
            reference: reference_number || `VP-${payment.id.slice(0, 8)}`
          })
          .select()
          .single();

        if (bankTxnError) {
          console.error('❌ Failed to create bank transaction:', bankTxnError);
        } else {
          console.log('✅ Created bank transaction:', bankTransaction.id);
          
          // Update bank account balance
          const { data: currentAccount } = await supabase
            .from('bank_accounts')
            .select('current_balance')
            .eq('id', selectedBankAccountId)
            .single();

          const newBalance = (currentAccount?.current_balance || 0) - parseFloat(amount);

          const { error: balanceUpdateError } = await supabase
            .from('bank_accounts')
            .update({
              current_balance: newBalance,
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedBankAccountId);

          if (balanceUpdateError) {
            console.error('❌ Failed to update bank balance:', balanceUpdateError);
          } else {
            console.log(`✅ Updated bank balance: ${currentAccount?.current_balance || 0} → ${newBalance}`);
          }
        }
      }
      
      const journalResult = await createVendorPaymentJournalEntry({
        paymentId: payment.id,
        amount: parseFloat(amount),
        date: payment_date,
        reference: reference_number,
        description: notes || `Vendor payment via ${payment_method}`,
        paymentMethod: payment_method,
        bankAccountId: selectedBankAccountId
      });

      if (journalResult.success) {
        console.log('✅ Vendor bank payment journal entry created:', journalResult.journalEntryId);
        console.log(`📊 Dr. ${journalResult.apAccount} ${amount}, Cr. ${journalResult.cashAccount} ${amount}`);
      } else {
        console.error('❌ Failed to create vendor bank payment journal entry:', journalResult.error);
      }
    }

    // Update vendor bill paid amount if bill is provided
    if (vendor_bill_id) {
      const { data: currentBill } = await supabase
        .from('vendor_bills')
        .select('paid_amount, total_amount')
        .eq('id', vendor_bill_id)
        .single();

      const newPaidAmount = (currentBill?.paid_amount || 0) + amount;
      const remainingAmount = (currentBill?.total_amount || 0) - newPaidAmount;
      
      // Determine new status
      let newStatus = 'pending';
      if (newPaidAmount >= (currentBill?.total_amount || 0)) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      const { error: updateError } = await supabase
        .from('vendor_bills')
        .update({ 
          paid_amount: newPaidAmount,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', vendor_bill_id);

      if (updateError) {
        console.error('Error updating vendor bill amounts:', updateError);
      } else {
        console.log(`✅ Updated vendor bill ${vendor_bill_id}: paid ${newPaidAmount}, remaining ${remainingAmount}, status ${newStatus}`);
      }
    }

    // Update purchase order paid amount if PO is provided
    if (purchase_order_id) {
      const { data: currentPO } = await supabase
        .from('purchase_orders')
        .select('paid_amount')
        .eq('id', purchase_order_id)
        .single();

      const newPaidAmount = (currentPO?.paid_amount || 0) + amount;

      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({ paid_amount: newPaidAmount })
        .eq('id', purchase_order_id);

      if (updateError) console.error('Error updating PO paid amount:', updateError);
    }

    // Create corresponding expense record for the vendor payment
    console.log('📝 Creating expense record for vendor payment...');
    
    // Get vendor details for expense description
    const { data: vendor } = await supabase
      .from('suppliers')
      .select('name')
      .eq('id', vendorId)
      .single();

    const vendorName = vendor?.name || 'Unknown Vendor';
    
    // Create expense record
    const expenseDescription = vendor_bill_id 
      ? `Payment for vendor bill - ${vendorName}` 
      : `Vendor payment - ${vendorName}`;

    const { data: expenseRecord, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        date: payment_date || new Date().toISOString().split('T')[0],
        category: 'Manufacturing',
        type: 'Direct',
        description: `${expenseDescription}${notes ? ` (${notes})` : ''}`,
        amount: parseFloat(amount),
        payment_method: payment_method,
        entity_type: 'supplier',
        entity_id: vendorId,
        entity_reference_id: payment.id,
        created_by: created_by || null
      })
      .select()
      .single();

    if (expenseError) {
      console.error('⚠️ Failed to create expense record for vendor payment:', expenseError);
      // Don't fail the payment, just log the error
    } else {
      console.log('✅ Created expense record for vendor payment:', expenseRecord.id);
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
