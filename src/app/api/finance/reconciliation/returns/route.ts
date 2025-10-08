import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

interface FinancialReconciliationData {
  return_id: string;
  invoice_id: string;
  refund_amount: number;
  refund_method: string;
  payment_reference?: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FinancialReconciliationData = await request.json();
    
    const { 
      return_id, 
      invoice_id, 
      refund_amount, 
      refund_method, 
      payment_reference, 
      notes 
    } = body;

    // Get current user for audit trail (optional for now)
    const currentUser = { id: 'system' }; // Placeholder for system user

    // Validate the return exists and is in a processable state
    const { data: returnRecord, error: returnError } = await supabase
      .from('returns')
      .select(`
        id,
        return_type,
        status,
        return_value,
        order_id,
        return_items (
          id,
          quantity,
          refund_amount,
          sales_order_item_id
        )
      `)
      .eq('id', return_id)
      .single();

    if (returnError || !returnRecord) {
      return NextResponse.json(
        { error: 'Return record not found' },
        { status: 404 }
      );
    }

    if (returnRecord.status !== 'pending') {
      return NextResponse.json(
        { error: 'Return has already been processed' },
        { status: 400 }
      );
    }

    // Validate invoice exists
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total, paid_amount, customer_id, customer_name')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Start transaction-like operations
    
    // 1. Update return status to completed
    const { error: updateReturnError } = await supabase
      .from('returns')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
        approved_by: currentUser.id
      })
      .eq('id', return_id);

    if (updateReturnError) {
      console.error('Failed to update return status:', updateReturnError);
      return NextResponse.json(
        { error: 'Failed to update return status' },
        { status: 500 }
      );
    }

    // 2. Create or update invoice refund record
    const { data: existingRefund } = await supabase
      .from('invoice_refunds')
      .select('id, refund_amount')
      .eq('invoice_id', invoice_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let refundRecordId: string;

    if (existingRefund) {
      // Update existing pending refund
      const { data: updatedRefund, error: updateRefundError } = await supabase
        .from('invoice_refunds')
        .update({
          refund_amount: existingRefund.refund_amount + refund_amount,
          status: 'processed',
          processed_at: new Date().toISOString(),
          refund_method,
          payment_reference,
          notes: `${existingRefund.id ? 'Updated: ' : ''}${notes || ''}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRefund.id)
        .select('id')
        .single();

      if (updateRefundError) {
        console.error('Failed to update refund record:', updateRefundError);
        return NextResponse.json(
          { error: 'Failed to update refund record' },
          { status: 500 }
        );
      }
      refundRecordId = updatedRefund.id;
    } else {
      // Create new refund record
      const { data: newRefund, error: createRefundError } = await supabase
        .from('invoice_refunds')
        .insert({
          invoice_id,
          refund_amount,
          status: 'processed',
          processed_at: new Date().toISOString(),
          reason: `Return processed - ${returnRecord.return_type}`,
          refund_type: 'partial',
          refund_method,
          payment_reference,
          notes,
          created_by: currentUser.id
        })
        .select('id')
        .single();

      if (createRefundError) {
        console.error('Failed to create refund record:', createRefundError);
        return NextResponse.json(
          { error: 'Failed to create refund record' },
          { status: 500 }
        );
      }
      refundRecordId = newRefund.id;
    }

    // 3. Create financial transaction record for accounting
    const transactionDescription = `Refund - ${returnRecord.return_type} (Return #${return_id.slice(0, 8)})`;
    
    const { error: transactionError } = await supabase
      .from('financial_transactions')
      .insert({
        type: 'refund',
        amount: refund_amount,
        description: transactionDescription,
        reference_id: return_id,
        reference_type: 'return',
        customer_id: invoice.customer_id,
        invoice_id: invoice_id,
        payment_method: refund_method,
        payment_reference,
        status: 'completed',
        transaction_date: new Date().toISOString(),
        created_by: currentUser.id
      });

    if (transactionError) {
      console.warn('Failed to create financial transaction record:', transactionError);
      // Don't fail the operation, but log the warning
    }

    // 4. Update inventory for returned items (only for regular products)
    for (const item of returnRecord.return_items) {
      // Get product information to check if it's a regular product
      const { data: orderItem } = await supabase
        .from('sales_order_items')
        .select('product_id')
        .eq('id', item.sales_order_item_id)
        .single();

      if (orderItem?.product_id) {
        // Update inventory for regular product
        const { error: inventoryError } = await supabase.rpc('update_inventory_quantity', {
          p_product_id: orderItem.product_id,
          p_quantity_change: item.quantity
        });

        if (inventoryError) {
          console.warn('Failed to update inventory:', {
            product_id: orderItem.product_id,
            quantity: item.quantity,
            error: inventoryError
          });
        } else {
          console.log('Inventory updated for return:', {
            product_id: orderItem.product_id,
            quantity_added: item.quantity
          });
        }
      }
    }

    // 5. Create accounting journal entries (if accounting system is enabled)
    try {
      // Debit: Refund Expense Account
      // Credit: Cash/Bank Account (based on refund method)
      
      const accountingEntries = [
        {
          account_type: 'expense',
          account_name: 'Refunds and Returns',
          debit_amount: refund_amount,
          credit_amount: 0,
          description: transactionDescription,
          reference_id: refundRecordId,
          reference_type: 'refund'
        },
        {
          account_type: refund_method === 'cash' ? 'asset' : 'liability',
          account_name: refund_method === 'cash' ? 'Cash' : 
                       refund_method === 'bank_transfer' ? 'Bank Account' :
                       refund_method === 'store_credit' ? 'Store Credit Liability' : 'Accounts Payable',
          debit_amount: 0,
          credit_amount: refund_amount,
          description: transactionDescription,
          reference_id: refundRecordId,
          reference_type: 'refund'
        }
      ];

      for (const entry of accountingEntries) {
        const { error: journalError } = await supabase
          .from('journal_entries')
          .insert({
            ...entry,
            transaction_date: new Date().toISOString(),
            created_by: currentUser.id
          });

        if (journalError) {
          console.warn('Failed to create journal entry:', journalError);
        }
      }
    } catch (accountingError) {
      console.warn('Accounting integration failed:', accountingError);
      // Don't fail the operation for accounting errors
    }

    // 6. Send notification/receipt (optional)
    try {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          recipient_id: invoice.customer_id,
          type: 'refund_processed',
          title: 'Refund Processed',
          message: `Your refund of ₹${refund_amount.toLocaleString('en-IN')} has been processed for return ${return_id.slice(0, 8)}.`,
          data: {
            return_id,
            invoice_id,
            refund_amount,
            refund_method,
            payment_reference
          },
          created_by: currentUser.id
        });

      if (notificationError) {
        console.warn('Failed to create notification:', notificationError);
      }
    } catch (notificationError) {
      console.warn('Notification system failed:', notificationError);
    }

    return NextResponse.json({
      success: true,
      return_id,
      refund_record_id: refundRecordId,
      refund_amount,
      refund_method,
      message: 'Return processed and refund completed successfully',
      financial_summary: {
        return_value: returnRecord.return_value,
        refund_amount,
        difference: returnRecord.return_value - refund_amount
      }
    });

  } catch (error) {
    console.error('Financial reconciliation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process financial reconciliation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch financial reconciliation data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const return_id = searchParams.get('return_id');
    const invoice_id = searchParams.get('invoice_id');

    if (!return_id && !invoice_id) {
      return NextResponse.json(
        { error: 'Either return_id or invoice_id is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('returns')
      .select(`
        id,
        return_type,
        status,
        return_value,
        cost_value,
        created_at,
        updated_at,
        return_items (
          id,
          quantity,
          refund_amount,
          sales_order_items (
            name,
            product_id,
            unit_price,
            final_price
          )
        ),
        invoice_refunds (
          id,
          refund_amount,
          status,
          refund_method,
          payment_reference,
          processed_at
        )
      `);

    if (return_id) {
      query = query.eq('id', return_id);
    } else {
      // Find returns by invoice
      const { data: invoice } = await supabase
        .from('invoices')
        .select('sales_order_id')
        .eq('id', invoice_id)
        .single();

      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      query = query.eq('order_id', invoice.sales_order_id);
    }

    const { data: returns, error } = await query;

    if (error) {
      console.error('Error fetching reconciliation data:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reconciliation data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      returns: returns || [],
      summary: {
        total_returns: returns?.length || 0,
        total_refund_amount: returns?.reduce((sum, r) => sum + (r.return_value || 0), 0) || 0,
        processed_returns: returns?.filter(r => r.status === 'completed').length || 0,
        pending_returns: returns?.filter(r => r.status === 'pending').length || 0
      }
    });

  } catch (error) {
    console.error('Error in reconciliation GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}