import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params

    // Get basic statistics for the sales representative dashboard
    const [
      ordersResult,
      customersResult,
      returnsResult,
      complaintsResult,
      performanceResult
    ] = await Promise.all([
      // Orders statistics - Use sales_representative_id instead of created_by
      supabase
        .from('sales_orders')
        .select(`
          id, 
          status, 
          created_at,
          final_price,
          sales_order_items(
            quantity,
            unit_price
          )
        `)
        .eq('sales_representative_id', userId),

      // Customer statistics - Use customer_assignments table for better tracking
      supabase
        .from('customer_assignments')
        .select(`
          customer_id,
          assigned_date,
          customers(id, created_at)
        `)
        .eq('sales_rep_id', userId)
        .eq('is_active', true),

      // Returns/exchanges statistics
      supabase
        .from('returns')
        .select(`
          id, 
          status, 
          created_at,
          order_id,
          sales_orders!inner(sales_representative_id)
        `)
        .eq('sales_orders.sales_representative_id', userId),

      // Complaints statistics
      supabase
        .from('customer_complaints')
        .select('id, status, created_at')
        .eq('sales_rep_id', userId),

      // Performance targets
      supabase
        .from('sales_targets')
        .select('revenue_target, achievement_revenue')
        .eq('sales_rep_id', userId)
        .eq('target_type', 'monthly')
        .gte('target_period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        .lte('target_period_end', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0])
        .eq('status', 'active')
        .single()
    ])

    if (ordersResult.error) {
      console.error('Error fetching orders:', ordersResult.error)
    }

    const orders = ordersResult.data || []
    const customerAssignments = customersResult.data || []
    const returns = returnsResult.data || []
    const complaints = complaintsResult.data || []
    const performance = performanceResult.data

    // Calculate statistics
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const totalOrders = orders.length
    const pendingOrders = orders.filter(order => order.status === 'pending').length
    const completedOrders = orders.filter(order => order.status === 'delivered' || order.status === 'completed').length
    
    // Calculate total revenue using final_price from orders
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + (order.final_price || 0)
    }, 0)
    
    // Extract customers from assignments
    const customers = customerAssignments.map(assignment => {
      const customer = Array.isArray(assignment.customers) ? assignment.customers[0] : assignment.customers
      return customer
    }).filter(Boolean)
    
    const totalCustomers = customers.length
    const newCustomersThisMonth = customerAssignments.filter(assignment => {
      const assignedDate = new Date(assignment.assigned_date)
      return assignedDate.getMonth() === currentMonth && assignedDate.getFullYear() === currentYear
    }).length

    const pendingReturns = returns.filter(ret => ret.status === 'pending').length
    const totalReturns = returns.length

    const openComplaints = complaints.filter(complaint => complaint.status === 'open' || complaint.status === 'in_progress').length
    const resolvedComplaints = complaints.filter(complaint => complaint.status === 'resolved' || complaint.status === 'closed').length

    const monthlyTarget = performance?.revenue_target || 0
    const monthlyAchievement = performance?.achievement_revenue || totalRevenue
    const achievementPercentage = monthlyTarget > 0 ? (monthlyAchievement / monthlyTarget) * 100 : 0

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const conversionRate = 75.5 // This would be calculated based on leads/quotes to orders ratio

    const stats = {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      pending_orders: pendingOrders,
      completed_orders: completedOrders,
      total_customers: totalCustomers,
      new_customers_this_month: newCustomersThisMonth,
      pending_returns: pendingReturns,
      total_returns: totalReturns,
      open_complaints: openComplaints,
      resolved_complaints: resolvedComplaints,
      monthly_target: monthlyTarget,
      monthly_achievement: achievementPercentage,
      conversion_rate: conversionRate,
      average_order_value: averageOrderValue
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Error fetching sales rep stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
