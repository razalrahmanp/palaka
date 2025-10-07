import { NextRequest, NextResponse } from 'next/server';import { NextRequest, NextResponse } from 'next/server';

import { supabase } from '@/lib/supabaseAdmin';import { supabase } from '@/lib/supabaseAdmin';



// POST - Reverse processed refunds (for error correction only)// POST - Reverse processed refunds (for error correction)

export async function POST(request: NextRequest) {export async function POST(request: NextRequest) {

  try {  try {

    const body = await request.json();    const body = await request.json();

    const { refund_id, action, processed_by, notes } = body;    const { refund_id, action, processed_by, notes } = body;



    if (!refund_id || !action || !processed_by) {    if (!refund_id || !action || !processed_by) {

      return NextResponse.json(      return NextResponse.json(

        { success: false, error: 'Missing required fields: refund_id, action, processed_by' },        { success: false, error: 'Missing required fields: refund_id, action, processed_by' },

        { status: 400 }        { status: 400 }

      );      );

    }    }



    // Only support reversal since all refunds are now processed immediately    // Only support reversal since all refunds are now processed immediately

    if (action !== 'reverse_refund') {    if (action !== 'reverse_refund') {

      return NextResponse.json(      return NextResponse.json(

        { success: false, error: 'Only reverse_refund action is supported. Refunds are processed immediately upon creation.' },        { success: false, error: 'Only reverse_refund action is supported. Refunds are processed immediately upon creation.' },

        { status: 400 }        { status: 400 }

      );      );

    }    }



    // Get refund details    // Get refund details

    const { data: refund, error: refundError } = await supabase    const { data: refund, error: refundError } = await supabase

      .from('invoice_refunds')

      .select('*')        success: false,      .from('invoice_refunds')

      .eq('id', refund_id)

      .single();        error: 'Refund not found'      .select(`



    if (refundError || !refund) {      }, { status: 404 });        *,

      return NextResponse.json(

        { success: false, error: 'Refund not found' },    }        invoices:invoice_id (

        { status: 404 }

      );          id,

    }

    let updateData: any = {          customer_name,

    // Only allow reversal of processed refunds

    if (refund.status !== 'processed') {      processed_by,          total

      return NextResponse.json(

        { success: false, error: 'Only processed refunds can be reversed' },      processed_at: new Date().toISOString(),        ),

        { status: 400 }

      );      updated_at: new Date().toISOString(),        bank_accounts:bank_account_id (

    }

      notes: notes || refund.notes          id,

    // Reverse the refund

    if (action === 'reverse_refund') {    };          name,

      // Update refund status to reversed

      const { error: updateRefundError } = await supabase          account_number,

        .from('invoice_refunds')

        .update({    let balanceChange = 0;          current_balance

          status: 'reversed',

          processed_by,    let bankAccount = null;        )

          processed_date: new Date().toISOString(),

          notes: notes || 'Refund reversed'      `)

        })

        .eq('id', refund_id);    if (action === 'process_refund') {      .eq('id', refund_id)



      if (updateRefundError) {      // Validate that refund is approved      .single();

        return NextResponse.json(

          { success: false, error: 'Failed to reverse refund status' },      if (refund.status !== 'approved') {

          { status: 500 }

        );        return NextResponse.json({    if (refundError || !refund) {

      }

          success: false,      return NextResponse.json(

      // Reverse bank account balance if applicable

      if (refund.bank_account_id && refund.refund_method !== 'cash') {          error: 'Refund must be approved before processing'        { success: false, error: 'Refund not found' },

        // Get bank account details

        const { data: bankAccount, error: bankError } = await supabase        }, { status: 400 });        { status: 404 }

          .from('bank_accounts')

          .select('id, account_name, current_balance')      }      );

          .eq('id', refund.bank_account_id)

          .single();    }



        if (!bankError && bankAccount) {      updateData.status = 'processed';

          // Add the refund amount back to bank balance

          const newBalance = parseFloat(bankAccount.current_balance) + parseFloat(refund.refund_amount);    // Validate action

          

          const { error: balanceUpdateError } = await supabase      // If bank transfer or cheque, update bank account balance    if (action === 'process_refund') {

            .from('bank_accounts')

            .update({ current_balance: newBalance })      if (refund.refund_method === 'bank_transfer' || refund.refund_method === 'cheque') {      if (refund.status !== 'approved') {

            .eq('id', refund.bank_account_id);

        if (!refund.bank_account_id) {        return NextResponse.json(

          if (balanceUpdateError) {

            console.error('Error reversing bank balance:', balanceUpdateError);          return NextResponse.json({          { success: false, error: 'Refund must be approved before processing' },

          } else {

            // Create reversal transaction            success: false,          { status: 400 }

            const { error: transactionError } = await supabase

              .from('bank_transactions')            error: 'Bank account required for this refund method'        );

              .insert({

                bank_account_id: refund.bank_account_id,          }, { status: 400 });      }

                transaction_type: 'credit',

                amount: parseFloat(refund.refund_amount),        }

                description: `Refund Reversal - ${refund.reason}`,

                reference_number: `REV-${refund.id.slice(0, 8)}`,      // Check bank balance for bank transfer/cheque refunds

                transaction_date: new Date().toISOString(),

                balance_after_transaction: newBalance,        // Get bank account details      if (refund.refund_method === 'bank_transfer' || refund.refund_method === 'cheque') {

                category: 'Refund Reversal',

                created_by: processed_by        const { data: account, error: accountError } = await supabase        if (!refund.bank_account_id) {

              });

          .from('bank_accounts')          return NextResponse.json(

            if (transactionError) {

              console.error('Error creating reversal transaction:', transactionError);          .select('*')            { success: false, error: 'Bank account is required for this refund method' },

            }

          }          .eq('id', refund.bank_account_id)            { status: 400 }

        }

      }          .single();          );



      // Mark related expense as reversed (optional - could also delete)        }

      const { error: expenseUpdateError } = await supabase

        .from('expenses')        if (accountError || !account) {

        .update({

          description: `[REVERSED] ${refund.reason}`,          return NextResponse.json({        const bankAccount = Array.isArray(refund.bank_accounts) ? refund.bank_accounts[0] : refund.bank_accounts;

          notes: 'Refund reversed - expense nullified'

        })            success: false,        if (!bankAccount) {

        .eq('entity_reference_id', refund_id);

            error: 'Bank account not found'          return NextResponse.json(

      if (expenseUpdateError) {

        console.error('Error marking expense as reversed:', expenseUpdateError);          }, { status: 404 });            { success: false, error: 'Bank account not found' },

      }

        }            { status: 404 }

      return NextResponse.json({

        success: true,          );

        message: 'Refund reversed successfully',

        data: {        bankAccount = account;        }

          refund_id,

          new_status: 'reversed',        balanceChange = -refund.refund_amount; // Negative because it's going out

          bank_balance_restored: !!refund.bank_account_id,

          processed_by        if (bankAccount.current_balance < refund.refund_amount) {

        }

      });        // Check sufficient balance          return NextResponse.json(

    }

        if (account.current_balance < refund.refund_amount) {            { 

  } catch (error) {

    console.error('Manual refund processing API error:', error);          return NextResponse.json({              success: false, 

    return NextResponse.json(

      { success: false, error: 'Internal server error' },            success: false,              error: `Insufficient bank balance. Available: ₹${bankAccount.current_balance}, Required: ₹${refund.refund_amount}` 

      { status: 500 }

    );            error: 'Insufficient bank account balance'            },

  }

}          }, { status: 400 });            { status: 400 }

        }          );

        }

        // Update bank account balance      }

        const { error: balanceError } = await supabase    } else if (action === 'reverse_refund') {

          .from('bank_accounts')      if (refund.status !== 'processed') {

          .update({        return NextResponse.json(

            current_balance: account.current_balance - refund.refund_amount,          { success: false, error: 'Only processed refunds can be reversed' },

            updated_at: new Date().toISOString()          { status: 400 }

          })        );

          .eq('id', refund.bank_account_id);      }

    } else {

        if (balanceError) {      return NextResponse.json(

          console.error('Error updating bank balance:', balanceError);        { success: false, error: 'Invalid action. Must be process_refund or reverse_refund' },

          return NextResponse.json({        { status: 400 }

            success: false,      );

            error: 'Failed to update bank account balance'    }

          }, { status: 500 });

        }    let bankTransaction = null;

    let updatedBankAccount = null;

        // Create bank transaction record

        const { error: transactionError } = await supabase    // Handle bank balance and transaction for bank transfer/cheque refunds

          .from('bank_transactions')    if (refund.refund_method === 'bank_transfer' || refund.refund_method === 'cheque') {

          .insert({      const bankAccount = Array.isArray(refund.bank_accounts) ? refund.bank_accounts[0] : refund.bank_accounts;

            bank_account_id: refund.bank_account_id,      

            amount: -refund.refund_amount,      if (action === 'process_refund') {

            description: `Refund processed - Invoice ${refund.invoice_id.slice(0, 8)} - ${refund.reason}`,        // Reduce bank balance

            transaction_type: 'debit',        const newBalance = parseFloat(bankAccount.current_balance) - parseFloat(refund.refund_amount);

            reference_number: refund.reference_number,        

            date: new Date().toISOString().split('T')[0],        const { data: updatedAccount, error: balanceError } = await client

            created_by: processed_by          .from('bank_accounts')

          });          .update({

            current_balance: newBalance,

        if (transactionError) {            updated_at: new Date().toISOString()

          console.error('Error creating bank transaction:', transactionError);          })

        }          .eq('id', refund.bank_account_id)

      }          .select()

          .single();

      // Update invoice total_refunded

      const { data: invoice, error: invoiceGetError } = await supabase        if (balanceError) {

        .from('invoices')          return NextResponse.json(

        .select('total_refunded')            { success: false, error: 'Failed to update bank balance' },

        .eq('id', refund.invoice_id)            { status: 500 }

        .single();          );

        }

      if (!invoiceGetError && invoice) {        updatedBankAccount = updatedAccount;

        const newTotalRefunded = (invoice.total_refunded || 0) + refund.refund_amount;

                // Create bank transaction

        const { error: invoiceUpdateError } = await supabase        const { data: transaction, error: transactionError } = await client

          .from('invoices')          .from('bank_transactions')

          .update({          .insert({

            total_refunded: newTotalRefunded,            bank_account_id: refund.bank_account_id,

            updated_at: new Date().toISOString()            transaction_type: 'refund_outgoing',

          })            amount: -parseFloat(refund.refund_amount),

          .eq('id', refund.invoice_id);            description: `Refund for Invoice ${refund.invoices?.id} - ${refund.invoices?.customer_name}`,

            reference_number: refund.reference_number || `REF-${refund.id}`,

        if (invoiceUpdateError) {            transaction_date: new Date().toISOString(),

          console.error('Error updating invoice total_refunded:', invoiceUpdateError);            created_at: new Date().toISOString()

        }          })

      }          .select()

          .single();

    } else if (action === 'reverse_refund') {

      // Validate that refund is processed        if (transactionError) {

      if (refund.status !== 'processed') {          console.error('Error creating bank transaction:', transactionError);

        return NextResponse.json({          // Continue anyway - balance is already updated

          success: false,        } else {

          error: 'Only processed refunds can be reversed'          bankTransaction = transaction;

        }, { status: 400 });        }

      }

      } else if (action === 'reverse_refund') {

      updateData.status = 'cancelled';        // Restore bank balance

        const newBalance = parseFloat(bankAccount.current_balance) + parseFloat(refund.refund_amount);

      // If bank transfer or cheque, reverse bank account balance        

      if (refund.refund_method === 'bank_transfer' || refund.refund_method === 'cheque') {        const { data: updatedAccount, error: balanceError } = await client

        if (refund.bank_account_id) {          .from('bank_accounts')

          const { data: account, error: accountError } = await supabase          .update({

            .from('bank_accounts')            current_balance: newBalance,

            .select('*')            updated_at: new Date().toISOString()

            .eq('id', refund.bank_account_id)          })

            .single();          .eq('id', refund.bank_account_id)

          .select()

          if (!accountError && account) {          .single();

            bankAccount = account;

            balanceChange = refund.refund_amount; // Positive because money comes back        if (balanceError) {

          return NextResponse.json(

            // Restore bank account balance            { success: false, error: 'Failed to restore bank balance' },

            const { error: balanceError } = await supabase            { status: 500 }

              .from('bank_accounts')          );

              .update({        }

                current_balance: account.current_balance + refund.refund_amount,        updatedBankAccount = updatedAccount;

                updated_at: new Date().toISOString()

              })        // Create reversal transaction

              .eq('id', refund.bank_account_id);        const { data: transaction, error: transactionError } = await client

          .from('bank_transactions')

            if (balanceError) {          .insert({

              console.error('Error reversing bank balance:', balanceError);            bank_account_id: refund.bank_account_id,

            }            transaction_type: 'refund_reversal',

            amount: parseFloat(refund.refund_amount),

            // Create reversal bank transaction record            description: `Refund Reversal for Invoice ${refund.invoices?.id} - ${refund.invoices?.customer_name}`,

            const { error: transactionError } = await supabase            reference_number: `REV-${refund.reference_number || refund.id}`,

              .from('bank_transactions')            transaction_date: new Date().toISOString(),

              .insert({            created_at: new Date().toISOString()

                bank_account_id: refund.bank_account_id,          })

                amount: refund.refund_amount,          .select()

                description: `Refund reversal - Invoice ${refund.invoice_id.slice(0, 8)} - ${refund.reason}`,          .single();

                transaction_type: 'credit',

                reference_number: refund.reference_number,        if (transactionError) {

                date: new Date().toISOString().split('T')[0],          console.error('Error creating reversal transaction:', transactionError);

                created_by: processed_by        } else {

              });          bankTransaction = transaction;

        }

            if (transactionError) {      }

              console.error('Error creating reversal transaction:', transactionError);    }

            }

          }    // Update refund status

        }    const newStatus = action === 'process_refund' ? 'processed' : 'cancelled';

    const updateData: {

        // Reverse invoice total_refunded      status: string;

        const { data: invoice, error: invoiceGetError } = await supabase      updated_at: string;

          .from('invoices')      processed_by?: string;

          .select('total_refunded')      processed_at?: string;

          .eq('id', refund.invoice_id)      notes?: string;

          .single();    } = {

      status: newStatus,

        if (!invoiceGetError && invoice) {      updated_at: new Date().toISOString()

          const newTotalRefunded = Math.max(0, (invoice.total_refunded || 0) - refund.refund_amount);    };

          

          const { error: invoiceUpdateError } = await supabase    if (action === 'process_refund') {

            .from('invoices')      updateData.processed_by = processed_by;

            .update({      updateData.processed_at = new Date().toISOString();

              total_refunded: newTotalRefunded,    }

              updated_at: new Date().toISOString()

            })    if (notes) {

            .eq('id', refund.invoice_id);      updateData.notes = notes;

    }

          if (invoiceUpdateError) {

            console.error('Error reversing invoice total_refunded:', invoiceUpdateError);    const { data: updatedRefund, error: updateError } = await client

          }      .from('invoice_refunds')

        }      .update(updateData)

      }      .eq('id', refund_id)

    } else {      .select(`

      return NextResponse.json({        *,

        success: false,        invoices:invoice_id (

        error: 'Invalid action. Must be process_refund or reverse_refund'          id,

      }, { status: 400 });          customer_name,

    }          total

        ),

    // Update refund status        processed_by_user:processed_by (

    const { data: updatedRefund, error: updateError } = await supabase          id,

      .from('invoice_refunds')          name,

      .update(updateData)          email

      .eq('id', refund_id)        )

      .select()      `)

      .single();      .single();



    if (updateError) {    if (updateError) {

      console.error('Error updating refund:', updateError);      return NextResponse.json(

      return NextResponse.json({        { success: false, error: 'Failed to update refund status' },

        success: false,        { status: 500 }

        error: 'Failed to update refund status'      );

      }, { status: 500 });    }

    }

    return NextResponse.json({

    return NextResponse.json({      success: true,

      success: true,      message: `Refund ${action === 'process_refund' ? 'processed' : 'reversed'} successfully`,

      message: `Refund ${action.replace('_', ' ')} completed successfully`,      data: {

      data: {        refund: updatedRefund,

        refund: updatedRefund,        bank_transaction: bankTransaction,

        bank_account: bankAccount,        bank_account: updatedBankAccount,

        balance_change: balanceChange        balance_change: action === 'process_refund' ? -refund.refund_amount : refund.refund_amount

      }      }

    });    });



  } catch (error) {  } catch (error) {

    console.error('Manual bank processing API error:', error);    console.error('Manual refund processing API error:', error);

    return NextResponse.json({    return NextResponse.json(

      success: false,      { success: false, error: 'Internal server error' },

      error: 'Internal server error'      { status: 500 }

    }, { status: 500 });    );

  }  }

}}

// PUT - Manually adjust bank account balance with transaction record
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bank_account_id,
      adjustment_amount,
      adjustment_reason,
      adjusted_by,
      reference_number
    } = body;

    if (!bank_account_id || adjustment_amount === undefined || !adjustment_reason || !adjusted_by) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: bank_account_id, adjustment_amount, adjustment_reason, adjusted_by' },
        { status: 400 }
      );
    }

    const client = supabase;

    // Get current bank account
    const { data: bankAccount, error: bankError } = await client
      .from('bank_accounts')
      .select('*')
      .eq('id', bank_account_id)
      .single();

    if (bankError || !bankAccount) {
      return NextResponse.json(
        { success: false, error: 'Bank account not found' },
        { status: 404 }
      );
    }

    const oldBalance = parseFloat(bankAccount.current_balance);
    const adjustmentAmount = parseFloat(adjustment_amount);
    const newBalance = oldBalance + adjustmentAmount;

    // Update bank balance
    const { data: updatedAccount, error: updateError } = await client
      .from('bank_accounts')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', bank_account_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to update bank balance' },
        { status: 500 }
      );
    }

    // Create adjustment transaction
    const { data: transaction, error: transactionError } = await client
      .from('bank_transactions')
      .insert({
        bank_account_id,
        transaction_type: 'adjustment',
        amount: adjustmentAmount,
        description: `Manual balance adjustment: ${adjustment_reason}`,
        reference_number: reference_number || `ADJ-${Date.now()}`,
        transaction_date: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating adjustment transaction:', transactionError);
      return NextResponse.json(
        { success: false, error: 'Balance updated but failed to create transaction record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Bank balance adjusted successfully',
      data: {
        bank_account: updatedAccount,
        transaction: transaction,
        adjustment: {
          old_balance: oldBalance,
          new_balance: newBalance,
          adjustment_amount: adjustmentAmount,
          reason: adjustment_reason,
          adjusted_by
        }
      }
    });

  } catch (error) {
    console.error('Manual bank adjustment API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}