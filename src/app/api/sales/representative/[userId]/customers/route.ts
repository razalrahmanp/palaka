import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabasePool'

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
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const customerType = searchParams.get('customer_type')

    // Build the query for customers assigned to this sales rep
    let customersQuery = supabase
      .from('customer_assignments')
      .select(`
        customer_id,
        assigned_date,
        is_active,
        customers!inner(
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          postal_code,
          customer_type,
          status,
          created_at
        )
      `, { count: 'exact' })
      .eq('sales_rep_id', userId)
      .eq('is_active', true)

    // Apply filters
    if (status && status !== 'all') {
      customersQuery = customersQuery.eq('customers.status', status)
    }

    if (customerType && customerType !== 'all') {
      customersQuery = customersQuery.eq('customers.customer_type', customerType)
    }

    // Apply pagination
    customersQuery = customersQuery
      .order('assigned_date', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: customerAssignments, error: customersError, count } = await customersQuery

    if (customersError) {
      console.error('Error fetching customers:', customersError)
      return NextResponse.json({ error: customersError.message }, { status: 500 })
    }

    if (!customerAssignments) {
      return NextResponse.json({
        customers: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Get customer IDs for additional data
    const customerIds = customerAssignments.map(ca => ca.customer_id)

    // Fetch sales orders for these customers to calculate stats
    const { data: salesOrders, error: ordersError } = await supabase
      .from('sales_orders')
      .select(`
        customer_id,
        final_price,
        created_at,
        status
      `)
      .in('customer_id', customerIds)
      .eq('sales_representative_id', userId)

    if (ordersError) {
      console.error('Error fetching customer orders:', ordersError)
    }

    // Process customers data with sales statistics
    const processedCustomers = customerAssignments.map(assignment => {
      // Handle potential array responses from Supabase joins
      const customer = Array.isArray(assignment.customers) ? assignment.customers[0] : assignment.customers
      
      // Calculate customer statistics
      const customerOrders = salesOrders?.filter(order => order.customer_id === customer.id) || []
      const totalOrders = customerOrders.length
      const totalSpent = customerOrders.reduce((sum, order) => sum + (order.final_price || 0), 0)
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0
      
      // Find last order date
      const lastOrderDate = customerOrders.length > 0 
        ? Math.max(...customerOrders.map(order => new Date(order.created_at).getTime()))
        : null

      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        postal_code: customer.postal_code,
        customer_type: customer.customer_type,
        status: customer.status,
        created_at: customer.created_at,
        assigned_date: assignment.assigned_date,
        last_order_date: lastOrderDate ? new Date(lastOrderDate).toISOString() : null,
        total_orders: totalOrders,
        total_spent: totalSpent,
        average_order_value: averageOrderValue,
        assigned_sales_rep: userId,
        satisfaction_rating: 4.2, // This could come from a customer feedback table
        notes: null // This could come from customer notes table
      }
    })

    // Apply search filter after processing (on processed data)
    let filteredCustomers = processedCustomers
    if (search) {
      const searchLower = search.toLowerCase()
      filteredCustomers = processedCustomers.filter(customer => 
        customer.name.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.includes(search)
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      customers: filteredCustomers,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      summary: {
        total_customers: count || 0,
        active_customers: filteredCustomers.filter(c => c.status === 'active').length,
        total_revenue: filteredCustomers.reduce((sum, customer) => sum + customer.total_spent, 0),
        average_order_value: filteredCustomers.reduce((sum, customer) => sum + customer.average_order_value, 0) / (filteredCustomers.length || 1)
      }
    })

  } catch (error) {
    console.error('Error in sales representative customers API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
