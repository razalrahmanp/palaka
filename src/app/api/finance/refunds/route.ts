import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

// GET - Fetch refunds for a specific invoice or all refunds
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoice_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const client = supabase;

    let query = client
      .from('invoice_refunds')
      .select(`
        *,
        invoices:invoice_id (
          id,
          total,
          customer_name,
          sales_order_id
        ),
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by invoice ID if provided
    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: refunds, error } = await query;

    if (error) {
      console.error('Error fetching refunds:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch refunds' },
        { status: 500 }
      );
    }

    // Get summary statistics
    const { data: summaryData, error: summaryError } = await client
      .from('invoice_refunds')
      .select('status, refund_amount')
      .eq(invoiceId ? 'invoice_id' : 'id', invoiceId || '*');

    const summary = {
      total_refunds: refunds?.length || 0,
      pending_amount: 0,
      approved_amount: 0,
      processed_amount: 0,
      rejected_amount: 0
    };

    if (!summaryError && summaryData) {
      summaryData.forEach(refund => {
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
    }

    return NextResponse.json({
      success: true,
      data: refunds,
      summary,
      pagination: {
        limit,
        offset,
        total: refunds?.length || 0
      }
    });

  } catch (error) {
    console.error('Refunds API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new refund request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      invoice_id,
      return_id,
      refund_amount,
      refund_type,
      reason,
      refund_method,
      bank_account_id,
      reference_number,
      requested_by,
      notes
    } = body;

    // Validate required fields
    if (!invoice_id || !refund_amount || !refund_type || !reason || !refund_method || !requested_by) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = supabase;

    // Validate invoice exists and get details
    const { data: invoice, error: invoiceError } = await client
      .from('invoices')
      .select('id, total, paid_amount, total_refunded')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Validate refund amount doesn't exceed available amount
    const availableForRefund = (invoice.paid_amount || 0) - (invoice.total_refunded || 0);
    if (refund_amount > availableForRefund) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Refund amount (${refund_amount}) exceeds available amount (${availableForRefund})` 
        },
        { status: 400 }
      );
    }

    // Create the refund record
    const { data: refund, error: createError } = await client
      .from('invoice_refunds')
      .insert({
        invoice_id,
        return_id: return_id || null,
        refund_amount,
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
        invoices:invoice_id (
          id,
          total,
          customer_name
        ),
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
      data: refund
    });

  } catch (error) {
    console.error('Create refund API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update refund status (approve/reject/process)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      refund_id,
      action, // 'approve', 'reject', 'process', 'cancel'
      user_id,
      notes,
      reference_number
    } = body;

    if (!refund_id || !action || !user_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = supabase;

    // Get current refund status
    const { data: currentRefund, error: fetchError } = await client
      .from('invoice_refunds')
      .select('id, status, refund_amount, invoice_id')
      .eq('id', refund_id)
      .single();

    if (fetchError || !currentRefund) {
      return NextResponse.json(
        { success: false, error: 'Refund not found' },
        { status: 404 }
      );
    }

    // Validate status transitions
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['approve', 'reject', 'cancel'],
      'approved': ['process', 'cancel'],
      'processed': [], // Final state
      'rejected': [], // Final state
      'cancelled': [] // Final state
    };

    if (!validTransitions[currentRefund.status]?.includes(action)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot ${action} refund in ${currentRefund.status} status` 
        },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: {
      updated_at: string;
      status?: string;
      approved_by?: string;
      approved_at?: string;
      processed_by?: string;
      processed_at?: string;
      reference_number?: string;
      notes?: string;
    } = {
      updated_at: new Date().toISOString()
    };

    switch (action) {
      case 'approve':
        updateData.status = 'approved';
        updateData.approved_by = user_id;
        updateData.approved_at = new Date().toISOString();
        break;
      case 'reject':
        updateData.status = 'rejected';
        updateData.approved_by = user_id;
        updateData.approved_at = new Date().toISOString();
        break;
      case 'process':
        updateData.status = 'processed';
        updateData.processed_by = user_id;
        updateData.processed_at = new Date().toISOString();
        if (reference_number) {
          updateData.reference_number = reference_number;
        }
        break;
      case 'cancel':
        updateData.status = 'cancelled';
        break;
    }

    if (notes) {
      updateData.notes = notes;
    }

    // Update the refund
    const { data: updatedRefund, error: updateError } = await client
      .from('invoice_refunds')
      .update(updateData)
      .eq('id', refund_id)
      .select(`
        *,
        invoices:invoice_id (
          id,
          total,
          customer_name
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
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating refund:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update refund' },
        { status: 500 }
      );
    }

    // The trigger will automatically update the invoice totals

    return NextResponse.json({
      success: true,
      message: `Refund ${action}ed successfully`,
      data: updatedRefund
    });

  } catch (error) {
    console.error('Update refund API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}