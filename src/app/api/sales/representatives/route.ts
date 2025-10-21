import { supabase } from '@/lib/supabasePool'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const withOrders = searchParams.get('withOrders') === 'true'

    // Base query for employees
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        user:users!employees_user_id_fkey(
          id,
          email,
          name
        )
      `)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let employees = data.map((employee: any) => ({
      id: employee.user_id,
      email: employee.user?.email || employee.email,
      name: employee.user?.name || employee.name,
      position: employee.position,
      role: employee.position,
      created_at: employee.created_at,
      has_orders: false, // Will be set below if needed
    }))

    // If withOrders=true, filter to only show employees with sales orders
    if (withOrders) {
      // Get all unique created_by user IDs from sales_orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('sales_orders')
        .select('created_by')
        .not('created_by', 'is', null)

      if (ordersError) {
        console.error('Error fetching sales orders:', ordersError)
      } else if (ordersData) {
        // Create a Set of user IDs who have created orders
        const userIdsWithOrders = new Set(ordersData.map(order => order.created_by))
        
        // Filter employees to only those with orders and mark them
        employees = employees
          .map(emp => ({
            ...emp,
            has_orders: userIdsWithOrders.has(emp.id)
          }))
          .filter(emp => emp.has_orders)
      }
    }

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching sales representatives:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
