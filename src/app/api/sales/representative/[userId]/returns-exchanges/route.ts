import { NextRequest, NextResponse } from 'next/server'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    const { searchParams } = new URL(request.url)
    const supabase = createClientComponentClient();
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    // Filter parameters
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build the query for returns/exchanges based on current schema
    // Use the same approach as stats API - inner join with sales_orders
    let returnsQuery = supabase
      .from('returns')
      .select(`
        *,
        sales_orders!inner(
          id,
          customer_id,
          grand_total,
          sales_representative_id,
          customers:customer_id(name, email, phone)
        ),
        return_items (
          *,
          sales_order_items:sales_order_item_id (
            name,
            quantity,
            unit_price
          )
        ),
        created_by_user:created_by (
          name,
          email
        ),
        sales_rep:sales_representative_id (
          name,
          email
        ),
        approved_by_user:approved_by (
          name,
          email
        )
      `, { count: 'exact' })
      .eq('sales_orders.sales_representative_id', userId)
      .order('created_at', { ascending: false })
    
    console.log(`[DEBUG] Fetching returns for user: ${userId}`);

    // Apply filters
    if (status && status !== 'all') {
      returnsQuery = returnsQuery.eq('status', status)
    }

    if (type && type !== 'all') {
      returnsQuery = returnsQuery.eq('return_type', type)
    }

    if (search) {
      returnsQuery = returnsQuery.or(`reason.ilike.%${search}%,inspection_notes.ilike.%${search}%`)
    }

    if (startDate) {
      returnsQuery = returnsQuery.gte('created_at', startDate)
    }

    if (endDate) {
      returnsQuery = returnsQuery.lte('created_at', endDate)
    }

    // Apply pagination
    returnsQuery = returnsQuery.range(offset, offset + limit - 1)

    const { data: returns, error: returnsError, count } = await returnsQuery

    console.log(`[DEBUG] Returns query result:`, { 
      count, 
      returnsLength: returns?.length, 
      error: returnsError,
      userId 
    });

    if (returnsError) {
      console.error('Error fetching returns:', returnsError)
      return NextResponse.json({ error: returnsError.message }, { status: 500 })
    }

    if (!returns) {
      return NextResponse.json({
        items: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Process returns data to match expected format
    const processedReturns = returns.map(returnItem => {
      // Handle potential array responses from Supabase joins
      const salesOrder = Array.isArray(returnItem.sales_orders) ? returnItem.sales_orders[0] : returnItem.sales_orders
      const customer = Array.isArray(salesOrder?.customers) ? salesOrder?.customers[0] : salesOrder?.customers
      
      console.log(`[DEBUG] Processing return:`, { 
        returnId: returnItem.id, 
        salesOrder: !!salesOrder, 
        customer: !!customer 
      });
      
      return {
        id: returnItem.id,
        order_id: returnItem.order_id,
        customer_name: customer?.name || 'Unknown Customer',
        customer_id: salesOrder?.customer_id || '',
        customer_email: customer?.email || '',
        customer_phone: customer?.phone || '',
        type: returnItem.return_type,
        reason: returnItem.reason || '',
        status: returnItem.status || 'pending',
        items_count: returnItem.return_items?.length || 0,
        total_amount: returnItem.return_value || 0,
        created_at: returnItem.created_at,
        updated_at: returnItem.updated_at,
        processed_at: returnItem.approved_by ? returnItem.updated_at : null,
        notes: returnItem.inspection_notes || '',
        return_items: returnItem.return_items || [],
        order_number: `SO-${salesOrder?.id?.slice(-8) || 'UNKNOWN'}`, // Generate order number from ID since order_number column doesn't exist
        order_value: salesOrder?.grand_total || 0,
        created_by_name: returnItem.created_by_user?.name || 'Unknown',
        sales_rep_name: returnItem.sales_rep?.name || 'Unassigned',
        approved_by_name: returnItem.approved_by_user?.name || '',
        // Add calculated fields
        days_since_request: Math.floor((new Date().getTime() - new Date(returnItem.created_at).getTime()) / (1000 * 60 * 60 * 24))
      }
    })

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      items: processedReturns,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      summary: {
        total_returns: count || 0,
        pending_returns: processedReturns.filter(r => r.status === 'pending').length,
        approved_returns: processedReturns.filter(r => r.status === 'approved').length,
        completed_returns: processedReturns.filter(r => r.status === 'completed').length,
        rejected_returns: processedReturns.filter(r => r.status === 'rejected').length,
        total_refund_amount: processedReturns.reduce((sum, r) => sum + (r.total_amount || 0), 0)
      }
    })

  } catch (error) {
    console.error('Error in sales representative returns API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
