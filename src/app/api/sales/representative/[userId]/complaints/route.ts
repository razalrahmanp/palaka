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
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build the query for complaints assigned to this sales rep
    let complaintsQuery = supabase
      .from('customer_complaints')
      .select(`
        id,
        customer_id,
        order_id,
        category,
        priority,
        status,
        subject,
        description,
        resolution,
        resolution_notes,
        created_at,
        updated_at,
        resolved_at,
        customers!inner(
          name,
          email,
          phone
        ),
        sales_orders(
          id,
          final_price,
          status
        )
      `, { count: 'exact' })
      .eq('sales_rep_id', userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      complaintsQuery = complaintsQuery.eq('status', status)
    }

    if (priority && priority !== 'all') {
      complaintsQuery = complaintsQuery.eq('priority', priority)
    }

    if (category && category !== 'all') {
      complaintsQuery = complaintsQuery.eq('category', category)
    }

    if (startDate) {
      complaintsQuery = complaintsQuery.gte('created_at', startDate)
    }

    if (endDate) {
      complaintsQuery = complaintsQuery.lte('created_at', endDate)
    }

    // Apply pagination
    complaintsQuery = complaintsQuery.range(offset, offset + limit - 1)

    const { data: complaints, error: complaintsError, count } = await complaintsQuery

    if (complaintsError) {
      console.error('Error fetching complaints:', complaintsError)
      return NextResponse.json({ error: complaintsError.message }, { status: 500 })
    }

    if (!complaints) {
      return NextResponse.json({
        complaints: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Process complaints data
    const processedComplaints = complaints.map(complaint => {
      // Handle potential array responses from Supabase joins
      const customer = Array.isArray(complaint.customers) ? complaint.customers[0] : complaint.customers
      const salesOrder = Array.isArray(complaint.sales_orders) ? complaint.sales_orders[0] : complaint.sales_orders
      
      return {
        id: complaint.id,
        customer_id: complaint.customer_id,
        order_id: complaint.order_id,
        customer_name: customer?.name || 'Unknown',
        customer_email: customer?.email,
        customer_phone: customer?.phone,
        category: complaint.category,
        priority: complaint.priority,
        status: complaint.status,
        subject: complaint.subject,
        description: complaint.description,
        resolution: complaint.resolution,
        resolution_notes: complaint.resolution_notes,
        created_at: complaint.created_at,
        updated_at: complaint.updated_at,
        resolved_at: complaint.resolved_at,
        order_value: salesOrder?.final_price || 0,
        order_status: salesOrder?.status,
        // Add calculated fields
        days_open: Math.floor((new Date().getTime() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        resolution_time: complaint.resolved_at 
          ? Math.floor((new Date(complaint.resolved_at).getTime() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        is_overdue: (() => {
          const daysSinceCreated = Math.floor((new Date().getTime() - new Date(complaint.created_at).getTime()) / (1000 * 60 * 60 * 24))
          const slaThreshold = complaint.priority === 'high' ? 1 : complaint.priority === 'medium' ? 3 : 7
          return complaint.status === 'open' && daysSinceCreated > slaThreshold
        })()
      }
    })

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      complaints: processedComplaints,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      summary: {
        total_complaints: count || 0,
        open_complaints: processedComplaints.filter(c => c.status === 'open').length,
        in_progress_complaints: processedComplaints.filter(c => c.status === 'in_progress').length,
        resolved_complaints: processedComplaints.filter(c => ['resolved', 'closed'].includes(c.status)).length,
        overdue_complaints: processedComplaints.filter(c => c.is_overdue).length,
        high_priority_complaints: processedComplaints.filter(c => c.priority === 'high').length,
        average_resolution_time: processedComplaints
          .filter(c => c.resolution_time !== null)
          .reduce((sum, c, _, arr) => sum + (c.resolution_time || 0) / arr.length, 0),
        resolution_rate: processedComplaints.length > 0 
          ? (processedComplaints.filter(c => ['resolved', 'closed'].includes(c.status)).length / processedComplaints.length) * 100 
          : 0
      }
    })

  } catch (error) {
    console.error('Error in sales representative complaints API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
