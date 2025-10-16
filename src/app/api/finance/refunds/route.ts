import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const statusParam = searchParams.get('status') || '';
    const invoiceId = searchParams.get('invoice_id') || '';
    
    const offset = (page - 1) * limit;

    // Build the query - SIMPLIFIED for reliability
    let query = supabase
      .from('invoice_refunds')
      .select(`
        *,
        invoice:invoice_id (
          id,
          customer_id,
          customer_name,
          total,
          paid_amount,
          sales_order_id
        ),
        bank_account:bank_account_id (
          name,
          account_number
        ),
        requested_by_user:requested_by (
          name,
          email
        ),
        approved_by_user:approved_by (
          name,
          email
        ),
        processed_by_user:processed_by (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (statusParam) {
      // Handle comma-separated status values (e.g., "pending,approved")
      const statuses = statusParam.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      } else {
        query = query.in('status', statuses);
      }
    }
    
    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId);
    }

    const { data: refunds, error } = await query;

    if (error) {
      console.error('❌ Error fetching invoice refunds:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invoice refunds', details: error.message },
        { status: 500 }
      );
    }

    console.log('🔍 Invoice Refunds Query Result:', {
      totalFound: refunds?.length || 0,
      statusFilter: statusParam,
      firstRefund: refunds?.[0],
      allStatuses: refunds?.map(r => r.status),
      allAmounts: refunds?.map(r => r.refund_amount),
      allReturnIds: refunds?.map(r => r.return_id),
      returnIdTypes: refunds?.map(r => typeof r.return_id),
      refundsWithReturnId: refunds?.filter(r => r.return_id).length || 0,
      refundsWithNullReturnId: refunds?.filter(r => r.return_id === null).length || 0,
      refundsWithUndefinedReturnId: refunds?.filter(r => r.return_id === undefined).length || 0,
      processedRefunds: refunds?.filter(r => r.status === 'processed').length || 0,
      processedWithReturnId: refunds?.filter(r => r.status === 'processed' && r.return_id).length || 0,
      detailedRefundCheck: refunds?.slice(0, 3).map(r => ({
        id: r.id,
        return_id: r.return_id,
        return_id_type: typeof r.return_id,
        return_id_is_null: r.return_id === null,
        return_id_is_undefined: r.return_id === undefined,
        status: r.status,
        amount: r.refund_amount
      }))
    });

    // Get customer details for refunds that have customer_id in invoice
    const customerIds = refunds
      ?.map(r => r.invoice?.customer_id)
      .filter((id): id is string => !!id) || [];
    
    const customerMap = new Map();
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .in('id', [...new Set(customerIds)]);
      
      customers?.forEach(c => customerMap.set(c.id, c));
      console.log('📞 Customer Details Fetched:', customers?.length || 0);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('invoice_refunds')
      .select('*', { count: 'exact', head: true });

    if (statusParam) {
      const statuses = statusParam.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        countQuery = countQuery.eq('status', statuses[0]);
      } else {
        countQuery = countQuery.in('status', statuses);
      }
    }
    if (invoiceId) {
      countQuery = countQuery.eq('invoice_id', invoiceId);
    }

    const { count } = await countQuery;
    const totalPages = Math.ceil((count || 0) / limit);

    // Transform the data to include customer information
    const transformedRefunds = refunds?.map(refund => {
      const customerId = refund.invoice?.customer_id;
      const customerFromJoin = customerId ? customerMap.get(customerId) : null;
      
      return {
        ...refund,
        // Explicitly include return_id from the raw refund object
        return_id: refund.return_id,
        customer_name: refund.invoice?.customer_name || customerFromJoin?.name || 'Unknown Customer',
        customer_email: customerFromJoin?.email || '',
        customer_phone: customerFromJoin?.phone || '',
        invoice_number: `INV-${refund.invoice?.id?.slice(-8) || 'UNKNOWN'}`,
        invoice_total: refund.invoice?.total || 0,
        requested_by_name: refund.requested_by_user?.name || 'Unknown',
        approved_by_name: refund.approved_by_user?.name || '',
        processed_by_name: refund.processed_by_user?.name || '',
        bank_account_name: refund.bank_account?.name || '',
        bank_account_number: refund.bank_account?.account_number || ''
      };
    }) || [];

    console.log('✅ Transformed Refunds Final Check:', {
      totalTransformed: transformedRefunds.length,
      firstTransformed: transformedRefunds[0],
      returnIdsPresent: transformedRefunds.filter(r => r.return_id).length,
      returnIdsNull: transformedRefunds.filter(r => r.return_id === null).length,
      returnIdsUndefined: transformedRefunds.filter(r => r.return_id === undefined).length,
      sampleReturnIds: transformedRefunds.slice(0, 10).map(r => ({ 
        id: r.id, 
        return_id: r.return_id,
        return_id_type: typeof r.return_id,
        status: r.status, 
        amount: r.refund_amount,
        customer: r.customer_name 
      }))
    });

    return NextResponse.json({
      refunds: transformedRefunds,
      data: transformedRefunds, // Also provide as 'data' for compatibility
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        status: statusParam,
        invoice_id: invoiceId
      }
    });

  } catch (error) {
    console.error('Unexpected error in invoice refunds API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
