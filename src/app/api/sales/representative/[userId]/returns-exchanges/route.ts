import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    // Filter parameters
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build the query for returns/exchanges
    let returnsQuery = supabase
      .from('returns')
      .select(`
        id,
        order_id,
        customer_id,
        type,
        status,
        reason,
        description,
        requested_at,
        approved_at,
        completed_at,
        refund_amount,
        refund_method,
        created_at,
        updated_at,
        sales_orders!inner(
          id,
          customer_id,
          final_price,
          customers(name, email, phone)
        )
      `, { count: 'exact' })
      .eq('sales_orders.sales_representative_id', userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      returnsQuery = returnsQuery.eq('status', status)
    }

    if (type && type !== 'all') {
      returnsQuery = returnsQuery.eq('type', type)
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

    if (returnsError) {
      console.error('Error fetching returns:', returnsError)
      return NextResponse.json({ error: returnsError.message }, { status: 500 })
    }

    if (!returns) {
      return NextResponse.json({
        returns: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Process returns data
    const processedReturns = returns.map(returnItem => {
      // Handle potential array responses from Supabase joins
      const salesOrder = Array.isArray(returnItem.sales_orders) ? returnItem.sales_orders[0] : returnItem.sales_orders
      const customer = Array.isArray(salesOrder?.customers) ? salesOrder?.customers[0] : salesOrder?.customers
      
      return {
        id: returnItem.id,
        order_id: returnItem.order_id,
        customer_id: returnItem.customer_id,
        customer_name: customer?.name || 'Unknown',
        customer_email: customer?.email,
        customer_phone: customer?.phone,
        type: returnItem.type,
        status: returnItem.status,
        reason: returnItem.reason,
        description: returnItem.description,
        requested_at: returnItem.requested_at,
        approved_at: returnItem.approved_at,
        completed_at: returnItem.completed_at,
        refund_amount: returnItem.refund_amount,
        refund_method: returnItem.refund_method,
        order_value: salesOrder?.final_price || 0,
        created_at: returnItem.created_at,
        updated_at: returnItem.updated_at,
        // Add calculated fields
        days_since_request: Math.floor((new Date().getTime() - new Date(returnItem.requested_at || returnItem.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        processing_time: returnItem.completed_at 
          ? Math.floor((new Date(returnItem.completed_at).getTime() - new Date(returnItem.requested_at || returnItem.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : null
      }
    })

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      returns: processedReturns,
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
        total_refund_amount: processedReturns.reduce((sum, r) => sum + (r.refund_amount || 0), 0),
        average_processing_time: processedReturns
          .filter(r => r.processing_time !== null)
          .reduce((sum, r, _, arr) => sum + (r.processing_time || 0) / arr.length, 0)
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
