import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    
    // Get time period from query parameter
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'all'
    
    // Calculate date range based on period
    let startDate: string | null = null
    const now = new Date()
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        break
      case 'yesterday':
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString()
        break
      case 'this_week':
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).toISOString()
        break
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        break
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        startDate = lastMonth.toISOString()
        break
      case 'this_quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        startDate = quarterStart.toISOString()
        break
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString()
        break
      case 'all':
      default:
        startDate = null
        break
    }

    // Get basic statistics for the sales representative dashboard
    // Build queries with conditional date filtering
    let ordersQuery = supabase
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
      .eq('sales_representative_id', userId)
    
    if (startDate) {
      ordersQuery = ordersQuery.gte('created_at', startDate)
    }

    let returnsQuery = supabase
      .from('returns')
      .select(`
        id, 
        status, 
        created_at,
        order_id,
        sales_orders!inner(sales_representative_id)
      `)
      .eq('sales_orders.sales_representative_id', userId)
    
    if (startDate) {
      returnsQuery = returnsQuery.gte('created_at', startDate)
    }

    let complaintsQuery = supabase
      .from('customer_complaints')
      .select('id, status, created_at')
      .eq('sales_rep_id', userId)
    
    if (startDate) {
      complaintsQuery = complaintsQuery.gte('created_at', startDate)
    }

    const [
      ordersResult,
      returnsResult,
      complaintsResult,
      performanceResult,
      invoicesResult
    ] = await Promise.all([
      ordersQuery,
      returnsQuery,
      complaintsQuery,

      // Performance targets
      supabase
        .from('sales_targets')
        .select('revenue_target, achievement_revenue')
        .eq('sales_rep_id', userId)
        .eq('target_type', 'monthly')
        .gte('target_period_start', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
        .lte('target_period_end', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0])
        .eq('status', 'active')
        .single(),

      // Invoices for delivered orders payment status
      supabase
        .from('invoices')
        .select('id, sales_order_id, total, paid_amount, status')
    ])

    if (ordersResult.error) {
      console.error('Error fetching orders:', ordersResult.error)
    }

    const orders = ordersResult.data || []
    const returns = returnsResult.data || []
    const complaints = complaintsResult.data || []
    const performance = performanceResult.data
    const invoices = invoicesResult.data || []

    // Calculate statistics
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const totalOrders = orders.length
    const pendingOrders = orders.filter(order => order.status === 'pending').length
    const completedOrders = orders.filter(order => order.status === 'delivered' || order.status === 'completed').length
    
    // Calculate delivered orders and payment status
    const deliveredOrders = orders.filter(order => order.status === 'delivered' || order.status === 'Delivered')
    const deliveredOrderIds = new Set(deliveredOrders.map(o => o.id))
    
    // Get invoices for delivered orders - match by sales_order_id
    const deliveredInvoices = invoices.filter(inv => deliveredOrderIds.has(inv.sales_order_id))
    
    const deliveredCollected = deliveredInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0)
    const deliveredTotal = deliveredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
    const deliveredPending = deliveredTotal - deliveredCollected
    
    // Calculate total collected and total pending from ALL invoices for this sales rep
    const allOrderIds = new Set(orders.map(o => o.id))
    const allInvoices = invoices.filter(inv => allOrderIds.has(inv.sales_order_id))
    
    const totalCollected = allInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0)
    const totalInvoiceAmount = allInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
    const totalPending = totalInvoiceAmount - totalCollected
    
    // Calculate total revenue using final_price from orders
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + (order.final_price || 0)
    }, 0)
    
    // Calculate not invoiced amount (revenue from orders that don't have invoices yet)
    const totalNotInvoiced = totalRevenue - totalInvoiceAmount
    
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
      delivered_orders: deliveredOrders.length,
      delivered_collected: deliveredCollected,
      delivered_pending: deliveredPending,
      total_collected: totalCollected,
      total_pending: totalPending,
      total_not_invoiced: totalNotInvoiced,
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
