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
      // Orders statistics
      supabase
        .from('sales_orders')
        .select(`
          id, 
          status, 
          created_at,
          sales_order_items(
            quantity,
            unit_price
          )
        `)
        .eq('created_by', userId),

      // Customer statistics
      supabase
        .from('customers')
        .select('id, created_at')
        .eq('assigned_sales_rep', userId),

      // Returns/exchanges statistics - assuming this table might not exist yet
      supabase
        .from('order_returns')
        .select('id, status, created_at')
        .eq('sales_rep_id', userId),

      // Complaints statistics - assuming this table might not exist yet
      supabase
        .from('customer_complaints')
        .select('id, status, created_at')
        .eq('sales_rep_id', userId),

      // Performance targets (if exists)
      supabase
        .from('sales_targets')
        .select('target_amount, achieved_amount')
        .eq('sales_rep_id', userId)
        .eq('month', new Date().getMonth() + 1)
        .eq('year', new Date().getFullYear())
        .single()
    ])

    if (ordersResult.error) {
      console.error('Error fetching orders:', ordersResult.error)
    }

    const orders = ordersResult.data || []
    const customers = customersResult.data || []
    const returns = returnsResult.data || []
    const complaints = complaintsResult.data || []
    const performance = performanceResult.data

    // Calculate statistics
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const totalOrders = orders.length
    const pendingOrders = orders.filter(order => order.status === 'pending').length
    const completedOrders = orders.filter(order => order.status === 'delivered' || order.status === 'completed').length
    
    // Calculate total revenue from order items
    const totalRevenue = orders.reduce((sum, order) => {
      const orderTotal = (order.sales_order_items || []).reduce((orderSum, item) => {
        return orderSum + ((item.quantity || 0) * (item.unit_price || 0))
      }, 0)
      return sum + orderTotal
    }, 0)
    
    const totalCustomers = customers.length
    const newCustomersThisMonth = customers.filter(customer => {
      const createdDate = new Date(customer.created_at)
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
    }).length

    const pendingReturns = returns.filter(ret => ret.status === 'pending').length
    const totalReturns = returns.length

    const openComplaints = complaints.filter(complaint => complaint.status === 'open' || complaint.status === 'in_progress').length
    const resolvedComplaints = complaints.filter(complaint => complaint.status === 'resolved' || complaint.status === 'closed').length

    const monthlyTarget = performance?.target_amount || 0
    const monthlyAchievement = performance?.achieved_amount || totalRevenue
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
