import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabasePool'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current_year'

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date
    let monthsToInclude = 12

    switch (period) {
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        monthsToInclude = now.getMonth() + 1 // Only show months up to current month
        break
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1)
        endDate = new Date(now.getFullYear() - 1, 11, 31)
        monthsToInclude = 12
        break
      case 'last_6_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        monthsToInclude = 6
        break
      case 'last_12_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        monthsToInclude = 12
        break
      default:
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        monthsToInclude = now.getMonth() + 1
    }

    // Get all sales orders for the period
    const { data: salesOrders, error: ordersError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        status,
        created_at,
        customer_id
      `)
      .eq('sales_representative_id', userId)
      .gte('created_at', startDate.toISOString().split('T')[0])
      .lte('created_at', endDate.toISOString().split('T')[0] + 'T23:59:59')

    if (ordersError) {
      console.error('Error fetching sales orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Get customer assignments for the period
    const { data: customerAssignments, error: customersError } = await supabase
      .from('customer_assignments')
      .select(`
        customer_id,
        assigned_date
      `)
      .eq('sales_rep_id', userId)
      .eq('is_active', true)
      .gte('assigned_date', startDate.toISOString().split('T')[0])
      .lte('assigned_date', endDate.toISOString().split('T')[0])

    if (customersError) {
      console.error('Error fetching customer assignments:', customersError)
    }

    // Get sales targets for each month in the period
    const { data: salesTargets, error: targetsError } = await supabase
      .from('sales_targets')
      .select('*')
      .eq('sales_rep_id', userId)
      .eq('target_type', 'monthly')
      .gte('target_period_start', startDate.toISOString().split('T')[0])
      .lte('target_period_end', endDate.toISOString().split('T')[0])
      .eq('status', 'active')

    if (targetsError) {
      console.error('Error fetching sales targets:', targetsError)
    }

    // Process data by month
    const orders = salesOrders || []
    const customers = customerAssignments || []
    const targets = salesTargets || []

    const monthlyPerformance = []
    
    for (let i = 0; i < monthsToInclude; i++) {
      const monthDate = new Date(startDate)
      monthDate.setMonth(startDate.getMonth() + i)
      
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      
      // Filter orders for this month
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at)
        return orderDate >= monthStart && orderDate <= monthEnd
      })

      // Filter customers for this month
      const monthCustomers = customers.filter(customer => {
        const assignDate = new Date(customer.assigned_date)
        return assignDate >= monthStart && assignDate <= monthEnd
      })

      // Find target for this month
      const monthTarget = targets.find(target => {
        const targetStart = new Date(target.target_period_start)
        const targetEnd = new Date(target.target_period_end)
        return targetStart <= monthStart && targetEnd >= monthEnd
      })

      // Calculate metrics
      const revenue = monthOrders.reduce((sum, order) => sum + (order.final_price || 0), 0)
      const ordersCount = monthOrders.length
      const customersCount = monthCustomers.length
      const target = monthTarget?.revenue_target || 0
      const achievementPercentage = target > 0 ? (revenue / target) * 100 : 0

      monthlyPerformance.push({
        month: monthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        revenue,
        orders: ordersCount,
        customers: customersCount,
        target,
        achievement_percentage: achievementPercentage
      })
    }

    // Sort by month chronologically
    monthlyPerformance.sort((a, b) => {
      const dateA = new Date(a.month + ' 1')
      const dateB = new Date(b.month + ' 1')
      return dateA.getTime() - dateB.getTime()
    })

    return NextResponse.json({
      months: monthlyPerformance,
      period_summary: {
        total_months: monthsToInclude,
        period_start: startDate.toISOString().split('T')[0],
        period_end: endDate.toISOString().split('T')[0]
      }
    })

  } catch (error) {
    console.error('Error in monthly performance API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monthly performance data' },
      { status: 500 }
    )
  }
}
