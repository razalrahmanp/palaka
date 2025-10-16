import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

// GET - Fetch refunds for a specific invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = await params;

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total, paid_amount, total_refunded, customer_name, status, created_at')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({
        success: false,
        error: 'Invoice not found'
      }, { status: 404 });
    }

    // Get all refunds for this invoice
    const { data: refunds, error: refundsError } = await supabase
      .from('invoice_refunds')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (refundsError) {
      console.error('Error fetching refunds:', refundsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch refunds'
      }, { status: 500 });
    }

    // Calculate summary
    const summary = {
      total_refund_requests: refunds?.length || 0,
      pending_amount: 0,
      approved_amount: 0,
      processed_amount: 0,
      rejected_amount: 0,
      available_for_refund: (invoice.paid_amount || 0) - (invoice.total_refunded || 0)
    };

    refunds?.forEach((refund) => {
      switch (refund.status) {
        case 'pending':
          summary.pending_amount += refund.refund_amount || 0;
          break;
        case 'approved':
          summary.approved_amount += refund.refund_amount || 0;
          break;
        case 'processed':
          summary.processed_amount += refund.refund_amount || 0;
          break;
        case 'rejected':
          summary.rejected_amount += refund.refund_amount || 0;
          break;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        invoice,
        refunds: refunds || [],
        summary
      }
    });

  } catch (error) {
    console.error('Invoice refunds API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST - Create a new refund request
export async function POST(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = await params;
    const body = await request.json();
    
    const {
      refund_amount,
      refund_type,
      reason,
      refund_method,
      bank_account_id,
      reference_number,
      requested_by,
      notes,
      return_id
    } = body;

    console.log('� FULL REQUEST BODY:', JSON.stringify(body, null, 2));
    console.log('🔗 RETURN_ID RECEIVED:', { 
      return_id, 
      type: typeof return_id,
      isNull: return_id === null,
      isUndefined: return_id === undefined,
      truthyValue: !!return_id
    });
    console.log('�📥 Received refund request:', { 
      refund_amount, 
      refund_type, 
      reason, 
      refund_method, 
      bank_account_id, 
      requested_by,
      requested_by_type: typeof requested_by 
    });

    // Validate user exists in database
    if (!requested_by || requested_by === 'current-user-id') {
      console.log('❌ User authentication failed:', { requested_by });
      return NextResponse.json({
        success: false,
        error: 'User authentication required. Please visit http://localhost:3000/set-valid-user.html to set a valid user, then refresh the page and try again.',
        code: 'INVALID_USER_ID',
        action: 'SETUP_USER'
      }, { status: 401 });
    }

    const { data: userExists, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', requested_by)
      .eq('is_deleted', false)
      .single();

    if (userError || !userExists) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user ID. Please log in again.'
      }, { status: 401 });
    }

    // Handle user authentication - use provided user ID
    const userId = requested_by;

    // Validate invoice exists
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total, paid_amount, total_refunded, customer_name')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({
        success: false,
        error: 'Invoice not found'
      }, { status: 404 });
    }

    // Validate refund amount
    const availableForRefund = (invoice.paid_amount || 0) - (invoice.total_refunded || 0);
    
    if (refund_amount > availableForRefund) {
      return NextResponse.json({
        success: false,
        error: 'Refund amount exceeds available amount'
      }, { status: 400 });
    }

    if (refund_amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Refund amount must be greater than 0'
      }, { status: 400 });
    }

    // Create the refund record with processed status (direct refund)
    const { data: refund, error: createError } = await supabase
      .from('invoice_refunds')
      .insert({
        invoice_id: invoiceId,
        return_id: return_id || null,
        refund_amount: parseFloat(refund_amount),
        refund_type,
        reason,
        refund_method,
        bank_account_id: bank_account_id || null,
        reference_number: reference_number || null,
        requested_by: userId,
        notes: notes || null,
        status: 'processed', // Direct refund - no approval needed
        approved_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
        approved_by: userId, // Same user approves and processes
        processed_by: userId
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating refund:', createError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create refund request'
      }, { status: 500 });
    }

    // Create expense entry for the refund
    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .insert({
        date: new Date().toISOString().split('T')[0],
        category: 'Customer Refunds',
        subcategory: 'Invoice Refund',
        description: `Refund for Invoice ${invoiceId.slice(0, 8)} - ${reason}`,
        amount: parseFloat(refund_amount),
        payment_method: refund_method,
        type: 'Direct',
        entity_type: 'customer',
        entity_id: invoiceId,
        entity_reference_id: refund.id,
        created_by: userId
      })
      .select()
      .single();

    if (expenseError) {
      console.error('Error creating refund expense:', expenseError);
    }

    // Process bank account balance update immediately (for non-cash refunds)
    let bankTransactionId = null;
    if (bank_account_id && refund_method !== 'cash') {
      try {
        // Get bank account details
        const { data: bankAccount, error: bankError} = await supabase
          .from('bank_accounts')
          .select('id, name, current_balance, account_type')
          .eq('id', bank_account_id)
          .single();

        if (bankError || !bankAccount) {
          console.error('Bank account not found:', bankError);
        } else {
          // Check if bank has sufficient balance
          const currentBalance = parseFloat(bankAccount.current_balance);
          const refundAmount = parseFloat(refund_amount);

          if (currentBalance >= refundAmount) {
            // Update bank account balance
            const newBalance = currentBalance - refundAmount;
            const { error: updateError } = await supabase
              .from('bank_accounts')
              .update({ current_balance: newBalance })
              .eq('id', bank_account_id);

            if (updateError) {
              console.error('Error updating bank balance:', updateError);
            } else {
              // Create bank transaction record
              const { data: transaction, error: transactionError } = await supabase
                .from('bank_transactions')
                .insert({
                  bank_account_id: bank_account_id,
                  transaction_type: 'debit',
                  amount: refundAmount,
                  description: `Customer Refund - Invoice ${invoiceId.slice(0, 8)}`,
                  reference_number: reference_number || `REF-${refund.id.slice(0, 8)}`,
                  transaction_date: new Date().toISOString(),
                  balance_after_transaction: newBalance,
                  category: 'Customer Refund',
                  created_by: userId
                })
                .select('id')
                .single();

              if (transactionError) {
                console.error('Error creating bank transaction:', transactionError);
              } else {
                bankTransactionId = transaction?.id;
              }
            }
          } else {
            console.warn(`Insufficient bank balance. Available: ₹${currentBalance}, Required: ₹${refundAmount}`);
          }
        }
      } catch (bankProcessingError) {
        console.error('Error processing bank account update:', bankProcessingError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refund,
        expense: expense || null,
        bankTransactionId,
        invoice: {
          id: invoice.id,
          customer_name: invoice.customer_name,
          available_for_refund: availableForRefund - refund_amount
        }
      }
    });

  } catch (error) {
    console.error('Create invoice refund API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}