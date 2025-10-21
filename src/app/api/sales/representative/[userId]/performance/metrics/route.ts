import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabasePool'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'current_month'

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date = new Date(now)

    switch (period) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'current_quarter':
        const currentQuarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1)
        endDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0)
        break
      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1
        const quarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear()
        const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter
        startDate = new Date(quarterYear, adjustedQuarter * 3, 1)
        endDate = new Date(quarterYear, (adjustedQuarter + 1) * 3, 0)
        break
      case 'current_year':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 11, 31)
        break
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1)
        endDate = new Date(now.getFullYear() - 1, 11, 31)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Get sales orders for the period
    const { data: salesOrders, error: ordersError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        status,
        created_at,
        customer_id,
        sales_order_items(
          quantity,
          unit_price,
          product_id,
          products(name, category, cost)
        )
      `)
      .eq('sales_representative_id', userId)
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr + 'T23:59:59')

    if (ordersError) {
      console.error('Error fetching sales orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Get sales target for the period
    const { data: salesTarget, error: targetError } = await supabase
      .from('sales_targets')
      .select('*')
      .eq('sales_rep_id', userId)
      .gte('target_period_start', startDateStr)
      .lte('target_period_end', endDateStr)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (targetError && targetError.code !== 'PGRST116') {
      console.error('Error fetching sales target:', targetError)
    }

    // Get customer assignments for the period
    const { data: customerAssignments, error: customersError } = await supabase
      .from('customer_assignments')
      .select(`
        customer_id,
        assigned_date,
        customers(id, created_at)
      `)
      .eq('sales_rep_id', userId)
      .eq('is_active', true)
      .gte('assigned_date', startDateStr)
      .lte('assigned_date', endDateStr)

    if (customersError) {
      console.error('Error fetching customer assignments:', customersError)
    }

    // Calculate metrics
    const orders = salesOrders || []
    const target = salesTarget
    const customers = customerAssignments || []

    const totalRevenue = orders.reduce((sum, order) => sum + (order.final_price || 0), 0)
    const totalOrders = orders.length
    const completedOrders = orders.filter(order => order.status === 'completed').length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0

    // Customer metrics
    const customerAcquisition = customers.length
    
    // Calculate customer retention (customers who made multiple orders)
    const customerOrderCounts = orders.reduce((acc, order) => {
      if (order.customer_id) {
        acc[order.customer_id] = (acc[order.customer_id] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
    
    const repeatCustomers = Object.values(customerOrderCounts).filter(count => count > 1).length
    const totalUniqueCustomers = Object.keys(customerOrderCounts).length
    const customerRetentionRate = totalUniqueCustomers > 0 ? (repeatCustomers / totalUniqueCustomers) * 100 : 0

    // Target achievement
    const quotaAssigned = target?.revenue_target || 0
    const quotaAchieved = totalRevenue
    const targetAchievement = quotaAssigned > 0 ? (quotaAchieved / quotaAssigned) * 100 : 0

    // Get ranking among all sales reps
    const { data: allSalesReps, error: repsError } = await supabase
      .from('employees')
      .select('user_id')
      .eq('position', 'Sales Representative')

    if (repsError) {
      console.error('Error fetching sales reps for ranking:', repsError)
    }

    // Calculate ranking by getting revenue for all sales reps in the same period
    let ranking = 1
    let totalSalesReps = 1

    if (allSalesReps && allSalesReps.length > 0) {
      const repRevenues = await Promise.all(
        allSalesReps.map(async (rep) => {
          const { data: repOrders } = await supabase
            .from('sales_orders')
            .select('final_price')
            .eq('sales_representative_id', rep.user_id)
            .gte('created_at', startDateStr)
            .lte('created_at', endDateStr + 'T23:59:59')

          const repRevenue = repOrders?.reduce((sum, order) => sum + (order.final_price || 0), 0) || 0
          return { userId: rep.user_id, revenue: repRevenue }
        })
      )

      // Sort by revenue descending and find ranking
      repRevenues.sort((a, b) => b.revenue - a.revenue)
      ranking = repRevenues.findIndex(rep => rep.userId === userId) + 1
      totalSalesReps = repRevenues.length
    }

    const metrics = {
      sales_period: `${startDateStr} to ${endDateStr}`,
      total_revenue: totalRevenue,
      total_orders: totalOrders,
      average_order_value: averageOrderValue,
      conversion_rate: conversionRate,
      customer_acquisition: customerAcquisition,
      customer_retention_rate: customerRetentionRate,
      target_achievement: targetAchievement,
      quota_assigned: quotaAssigned,
      quota_achieved: quotaAchieved,
      ranking: ranking,
      total_sales_reps: totalSalesReps
    }

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Error in performance metrics API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}
