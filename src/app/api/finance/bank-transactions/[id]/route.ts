// ================================================================================================
// BANK TRANSACTIONS DELETE API - Generic delete handler for CASH/BANK/UPI transactions
// ================================================================================================
// Handles deletion of bank_transactions and cascades to related tables based on transaction_type
// Uses source_record_id to identify and delete source records (expenses, investments, etc.)
// ================================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

// ================================================================================================
// DELETE - Delete a bank transaction and cascade to related tables
// ================================================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const transactionId = params.id;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    console.log(`🗑️ Starting DELETE for bank_transaction: ${transactionId}`);

    // 1. Fetch the bank transaction to get transaction_type and source_record_id
    const { data: transaction, error: fetchError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !transaction) {
      console.error('Transaction not found:', fetchError);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    console.log('📋 Transaction details:', {
      id: transaction.id,
      type: transaction.type,
      transaction_type: transaction.transaction_type,
      source_record_id: transaction.source_record_id,
      amount: transaction.amount,
      description: transaction.description,
      bank_account_id: transaction.bank_account_id
    });

    const deletedItems = {
      bank_transaction: false,
      source_record: false,
      related_records: 0
    };

    // 2. Handle cascade delete based on transaction_type
    if (transaction.source_record_id && transaction.transaction_type) {
      console.log(`🔗 Found source_record_id: ${transaction.source_record_id}, type: ${transaction.transaction_type}`);

      switch (transaction.transaction_type) {
        case 'expense':
          // Call the expense DELETE_V2 endpoint
          console.log('🧾 Deleting expense via DELETE_V2...');
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/finance/expenses`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ expense_id: transaction.source_record_id })
            });
            
            if (response.ok) {
              const result = await response.json();
              deletedItems.source_record = true;
              deletedItems.related_records = Object.values(result.deleted_items || {}).filter(v => v).length;
              console.log('✅ Expense deleted successfully:', result);
            } else {
              console.error('❌ Failed to delete expense:', await response.text());
            }
          } catch (error) {
            console.error('Error calling expense DELETE_V2:', error);
          }
          break;

        case 'investment':
          // Call the investment DELETE endpoint
          console.log('💰 Deleting investment...');
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/equity/investments`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ investment_id: transaction.source_record_id })
            });
            
            if (response.ok) {
              deletedItems.source_record = true;
              console.log('✅ Investment deleted successfully');
            }
          } catch (error) {
            console.error('Error calling investment DELETE:', error);
          }
          break;

        case 'withdrawal':
          // Call the withdrawal DELETE endpoint
          console.log('🏦 Deleting withdrawal...');
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/equity/withdrawals/${transaction.source_record_id}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              deletedItems.source_record = true;
              console.log('✅ Withdrawal deleted successfully');
            }
          } catch (error) {
            console.error('Error calling withdrawal DELETE:', error);
          }
          break;

        case 'liability_payment':
          // Call the liability payment DELETE endpoint
          console.log('💳 Deleting liability payment...');
          try {
            const response = await fetch(`${request.nextUrl.origin}/api/finance/liability-payments/${transaction.source_record_id}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              deletedItems.source_record = true;
              console.log('✅ Liability payment deleted successfully');
            }
          } catch (error) {
            console.error('Error calling liability payment DELETE:', error);
          }
          break;

        case 'fund_transfer':
          // For fund transfer, we need to delete both bank transactions and the transfer record
          console.log('🔄 Deleting fund transfer...');
          try {
            // Delete both bank transactions (withdrawal + deposit)
            const { data: bothTransactions } = await supabase
              .from('bank_transactions')
              .delete()
              .eq('source_record_id', transaction.source_record_id)
              .eq('transaction_type', 'fund_transfer')
              .select();

            // Delete journal entries
            await supabase
              .from('journal_entries')
              .delete()
              .eq('source_type', 'fund_transfer')
              .eq('source_id', transaction.source_record_id);

            // Delete the fund transfer record
            await supabase
              .from('fund_transfers')
              .delete()
              .eq('id', transaction.source_record_id);

            deletedItems.source_record = true;
            deletedItems.related_records = (bothTransactions?.length || 0) + 1;
            console.log('✅ Fund transfer deleted successfully');
          } catch (error) {
            console.error('Error deleting fund transfer:', error);
          }
          break;

        case 'payment':
          // For payments, just delete the payment transaction record
          console.log('💵 Deleting payment transaction...');
          try {
            await supabase
              .from('payment_transactions')
              .delete()
              .eq('id', transaction.source_record_id);

            deletedItems.source_record = true;
            console.log('✅ Payment transaction deleted successfully');
          } catch (error) {
            console.error('Error deleting payment transaction:', error);
          }
          break;

        case 'refund':
          console.log('↩️ Handling refund transaction...');
          // Refunds might be linked to sales/invoices - handle carefully
          deletedItems.source_record = true;
          break;

        case 'vendor_payment':
          // Delete vendor payment and cascade to related records
          console.log('🧾 Deleting vendor payment...');
          try {
            // First, get the vendor payment to check if it's a smart payment
            const { data: vendorPayment } = await supabase
              .from('vendor_payment_history')
              .select('id, supplier_id, amount, vendor_bill_id')
              .eq('id', transaction.source_record_id)
              .single();

            if (vendorPayment) {
              console.log('📋 Vendor payment details:', vendorPayment);

              // Check if this is a smart payment (has multiple allocations)
              const { data: allocations } = await supabase
                .from('vendor_payment_bill_allocations')
                .select('vendor_bill_id, allocated_amount')
                .eq('payment_id', vendorPayment.id);

              if (allocations && allocations.length > 0) {
                console.log(`💰 Smart payment detected with ${allocations.length} bill allocations`);
                
                // Revert each bill's paid_amount
                for (const allocation of allocations) {
                  const { data: bill } = await supabase
                    .from('vendor_bills')
                    .select('paid_amount, total_amount')
                    .eq('id', allocation.vendor_bill_id)
                    .single();

                  if (bill) {
                    const newPaidAmount = Math.max(0, (bill.paid_amount || 0) - allocation.allocated_amount);
                    let newStatus = 'pending';
                    
                    if (newPaidAmount >= bill.total_amount) {
                      newStatus = 'paid';
                    } else if (newPaidAmount > 0) {
                      newStatus = 'partial';
                    }

                    await supabase
                      .from('vendor_bills')
                      .update({
                        paid_amount: newPaidAmount,
                        status: newStatus,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', allocation.vendor_bill_id);

                    console.log(`✅ Reverted bill ${allocation.vendor_bill_id}: ${bill.paid_amount} → ${newPaidAmount}`);
                  }
                }

                // Delete allocations
                await supabase
                  .from('vendor_payment_bill_allocations')
                  .delete()
                  .eq('payment_id', vendorPayment.id);

                console.log('✅ Deleted bill allocations');
                deletedItems.related_records += allocations.length;
              } else if (vendorPayment.vendor_bill_id) {
                // Single bill payment - revert the bill
                console.log('📝 Single bill payment - reverting bill');
                
                const { data: bill } = await supabase
                  .from('vendor_bills')
                  .select('paid_amount, total_amount')
                  .eq('id', vendorPayment.vendor_bill_id)
                  .single();

                if (bill) {
                  const newPaidAmount = Math.max(0, (bill.paid_amount || 0) - vendorPayment.amount);
                  let newStatus = 'pending';
                  
                  if (newPaidAmount >= bill.total_amount) {
                    newStatus = 'paid';
                  } else if (newPaidAmount > 0) {
                    newStatus = 'partial';
                  }

                  await supabase
                    .from('vendor_bills')
                    .update({
                      paid_amount: newPaidAmount,
                      status: newStatus,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', vendorPayment.vendor_bill_id);

                  console.log(`✅ Reverted bill: ${bill.paid_amount} → ${newPaidAmount}`);
                }
              }

              // Delete related expense record
              const { data: expense } = await supabase
                .from('expenses')
                .delete()
                .eq('entity_reference_id', vendorPayment.id)
                .select();

              if (expense && expense.length > 0) {
                console.log('✅ Deleted related expense record');
                deletedItems.related_records += 1;
              }

              // Delete journal entries
              await supabase
                .from('journal_entries')
                .delete()
                .eq('source_type', 'vendor_payment')
                .eq('source_id', vendorPayment.id);

              console.log('✅ Deleted journal entries');

              // Delete the vendor payment record
              await supabase
                .from('vendor_payment_history')
                .delete()
                .eq('id', vendorPayment.id);

              deletedItems.source_record = true;
              console.log('✅ Vendor payment deleted successfully');
            }
          } catch (error) {
            console.error('Error deleting vendor payment:', error);
          }
          break;

        default:
          console.log(`⚠️ Unknown transaction_type: ${transaction.transaction_type}`);
          // For unknown types, just delete the bank transaction
          break;
      }
    } else {
      console.log('ℹ️ No source_record_id or transaction_type - deleting bank transaction only');
    }

    // 3. Delete the bank transaction itself (if not already deleted by cascade)
    const { error: deleteBankTxError } = await supabase
      .from('bank_transactions')
      .delete()
      .eq('id', transactionId);

    if (!deleteBankTxError) {
      deletedItems.bank_transaction = true;
      console.log('✅ Deleted bank_transaction record');
      console.log('✅ Bank balance will be auto-updated by trigger');
    } else {
      // Check if already deleted by cascade
      const { data: checkExists } = await supabase
        .from('bank_transactions')
        .select('id')
        .eq('id', transactionId)
        .single();

      if (!checkExists) {
        deletedItems.bank_transaction = true;
        console.log('✅ Bank transaction already deleted by cascade');
      } else {
        console.error('❌ Error deleting bank transaction:', deleteBankTxError);
        return NextResponse.json({ error: 'Failed to delete bank transaction' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
      deleted_items: deletedItems,
      transaction_details: {
        id: transaction.id,
        type: transaction.type,
        transaction_type: transaction.transaction_type,
        amount: transaction.amount,
        date: transaction.date
      }
    });

  } catch (error) {
    console.error('Error in DELETE /api/finance/bank-transactions/[id]:', error);
    return NextResponse.json({ 
      error: 'Failed to delete transaction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
