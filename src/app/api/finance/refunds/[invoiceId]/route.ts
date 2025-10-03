import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

// GET - Fetch refunds for a specific invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const invoiceId = params.invoiceId;
    const client = supabase;

    // Get invoice details with refund summary
    const { data: invoice, error: invoiceError } = await client
      .from('invoices')
      .select(`
        id,
        total,
        paid_amount,
        total_refunded,
        refund_status,
        customer_name,
        sales_order_id,
        status,
        created_at
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Get all refunds for this invoice
    const { data: refunds, error: refundsError } = await client
      .from('invoice_refunds')
      .select(`
        *,
        returns:return_id (
          id,
          return_type,
          reason,
          status
        ),
        requested_by_user:requested_by (
          id,
          name,
          email
        ),
        approved_by_user:approved_by (
          id,
          name,
          email
        ),
        processed_by_user:processed_by (
          id,
          name,
          email
        ),
        bank_accounts:bank_account_id (
          id,
          account_name,
          account_number
        )
      `)
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: false });

    if (refundsError) {
      console.error('Error fetching refunds:', refundsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch refunds' },
        { status: 500 }
      );
    }

    // Calculate refund summary
    const summary = {
      total_refund_requests: refunds?.length || 0,
      pending_amount: 0,
      approved_amount: 0,
      processed_amount: 0,
      rejected_amount: 0,
      available_for_refund: (invoice.paid_amount || 0) - (invoice.total_refunded || 0)
    };

    refunds?.forEach(refund => {
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
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new refund for this specific invoice
export async function POST(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const invoiceId = params.invoiceId;
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

    // Validate required fields
    if (!refund_amount || !refund_type || !reason || !refund_method || !requested_by) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = supabase;

    // Validate invoice exists and get details
    const { data: invoice, error: invoiceError } = await client
      .from('invoices')
      .select('id, total, paid_amount, total_refunded, customer_name')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Validate refund amount
    const availableForRefund = (invoice.paid_amount || 0) - (invoice.total_refunded || 0);
    if (refund_amount > availableForRefund) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Refund amount (₹${refund_amount}) exceeds available amount (₹${availableForRefund})` 
        },
        { status: 400 }
      );
    }

    if (refund_amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Refund amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Create the refund record
    const { data: refund, error: createError } = await client
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
        requested_by,
        notes: notes || null,
        status: 'pending'
      })
      .select(`
        *,
        requested_by_user:requested_by (
          id,
          name,
          email
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating refund:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create refund request' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Refund request created successfully',
      data: {
        refund,
        invoice: {
          id: invoice.id,
          customer_name: invoice.customer_name,
          available_for_refund: availableForRefund - refund_amount
        }
      }
    });

  } catch (error) {
    console.error('Create invoice refund API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}