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
      returnsResult,
      complaintsResult,
      performanceResult
    ] = await Promise.all([
      // Orders statistics - Include order items for proper profit calculation
      supabase
        .from('sales_orders')
        .select(`
          id, 
          status, 
          created_at,
          customer_id,
          final_price,
          original_price,
          discount_amount,
          customers!inner(id, name, created_at),
          sales_order_items(
            id,
            quantity,
            final_price,
            product_id,
            custom_product_id,
            cost,
            products(
              id,
              name,
              cost
            ),
            custom_products(
              id,
              name,
              cost_price
            )
          )
        `)
        .eq('sales_representative_id', userId),

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
    
    // Calculate total discount given
    const totalDiscountGiven = orders.reduce((sum, order) => {
      return sum + (order.discount_amount || 0)
    }, 0)
    
    // Calculate actual profit (selling price - cost) for each item
    let totalProfit = 0
    let totalCost = 0
    
    orders.forEach(order => {
      if (order.sales_order_items && Array.isArray(order.sales_order_items)) {
        order.sales_order_items.forEach(item => {
          const itemRevenue = (item.final_price || 0) * item.quantity
          let itemCost = 0

          // Calculate cost based on product type (same logic as finance overview)
          if (item.product_id && item.products) {
            // Regular product
            const product = Array.isArray(item.products) ? item.products[0] : item.products
            itemCost = (product?.cost || 0) * item.quantity
          } else if (item.custom_product_id && item.custom_products) {
            // Custom product
            const customProduct = Array.isArray(item.custom_products) ? item.custom_products[0] : item.custom_products
            itemCost = (customProduct?.cost_price || 0) * item.quantity
          } else {
            // Fallback to item cost
            itemCost = (item.cost || 0) * item.quantity
          }

          totalCost += itemCost
          totalProfit += (itemRevenue - itemCost)
        })
      }
    })
    
    // Calculate profit margin percentage
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    
    // Count unique customers from orders (filter out null/undefined customer_ids)
    const validCustomerIds = orders
      .map(order => order.customer_id)
      .filter(id => id !== null && id !== undefined)
    const uniqueCustomerIds = new Set(validCustomerIds)
    const totalCustomers = uniqueCustomerIds.size
    
    // Count new customers this month (customers with first order this month)
    const customerFirstOrders = new Map()
    orders.forEach(order => {
      const customerId = order.customer_id
      if (!customerId) return // Skip orders without customer_id
      
      const orderDate = new Date(order.created_at)
      if (!customerFirstOrders.has(customerId) || orderDate < customerFirstOrders.get(customerId)) {
        customerFirstOrders.set(customerId, orderDate)
      }
    })
    
    const newCustomersThisMonth = Array.from(customerFirstOrders.values()).filter(firstOrderDate => {
      return firstOrderDate.getMonth() === currentMonth && firstOrderDate.getFullYear() === currentYear
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
      total_discount_given: totalDiscountGiven,
      total_profit: totalProfit,
      total_cost: totalCost,
      profit_margin: profitMargin,
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
