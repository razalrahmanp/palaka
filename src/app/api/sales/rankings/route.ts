import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    // Get all sales orders with their sales representatives and detailed item information
    const { data: orders, error: ordersError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        status,
        created_at,
        customer_id,
        final_price,
        original_price,
        discount_amount,
        sales_representative_id,
        users!sales_representative_id(
          id,
          name,
          email
        ),
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
      .not('sales_representative_id', 'is', null)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders for rankings:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Get invoice and payment data to calculate collections
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        sales_order_id,
        total,
        status,
        payments(
          amount
        )
      `)

    console.log('Invoices with payments:', invoices?.length)

    // Create collection lookup by sales_order_id
    const collectionsByOrder = new Map()
    if (invoices && !invoicesError) {
      invoices.forEach(invoice => {
        console.log(`Invoice ${invoice.id} for order ${invoice.sales_order_id}:`, invoice.payments)
        
        if (invoice.sales_order_id) {
          let invoicePaid = 0
          if (invoice.payments && Array.isArray(invoice.payments)) {
            invoicePaid = invoice.payments
              .reduce((sum: number, payment: { amount: number }) => {
                console.log(`  Payment: ₹${payment.amount}`)
                return sum + (payment.amount || 0)
              }, 0)
          }
          
          if (!collectionsByOrder.has(invoice.sales_order_id)) {
            collectionsByOrder.set(invoice.sales_order_id, 0)
          }
          const currentAmount = collectionsByOrder.get(invoice.sales_order_id) + invoicePaid
          collectionsByOrder.set(invoice.sales_order_id, currentAmount)
          
          if (invoicePaid > 0) {
            console.log(`Order ${invoice.sales_order_id} total collected: ₹${currentAmount}`)
          }
        }
      })
    }

    console.log('Collection lookup sample:', Array.from(collectionsByOrder.entries()).slice(0, 3))

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        rankings: {
          most_profitable: [],
          profit_efficiency: [],
          most_sales: [],
          highest_revenue: [],
          discount_control: [],
          best_collection: []
        }
      })
    }

    // Group orders by sales representative
    const salesRepMetrics = new Map()

    orders.forEach(order => {
      const repId = order.sales_representative_id
      const repInfo = Array.isArray(order.users) ? order.users[0] : order.users
      
      if (!repInfo) return

      if (!salesRepMetrics.has(repId)) {
        salesRepMetrics.set(repId, {
          id: repId,
          name: repInfo.name || repInfo.email,
          email: repInfo.email,
          total_orders: 0,
          total_revenue: 0,
          total_discount_given: 0,
          total_profit: 0,
          total_cost: 0,
          completed_orders: 0,
          unique_customers: new Set(),
          order_values: [],
          total_collected: 0,
          total_pending: 0
        })
      }

      const metrics = salesRepMetrics.get(repId)
      metrics.total_orders += 1
      metrics.total_revenue += (order.final_price || 0)
      metrics.total_discount_given += (order.discount_amount || 0)
      metrics.unique_customers.add(order.customer_id)
      metrics.order_values.push(order.final_price || 0)
      
      // Calculate collection metrics using actual payment data
      const orderTotal = order.final_price || 0
      const paidAmount = collectionsByOrder.get(order.id) || 0
      const pendingAmount = Math.max(0, orderTotal - paidAmount)
      
      metrics.total_collected += paidAmount
      metrics.total_pending += pendingAmount
      
      if (order.status === 'delivered' || order.status === 'completed') {
        metrics.completed_orders += 1
      }

      // Calculate profit from order items (same logic as finance overview)
      let orderProfit = 0
      let orderCost = 0

      if (order.sales_order_items && Array.isArray(order.sales_order_items)) {
        order.sales_order_items.forEach(item => {
          const itemRevenue = (item.final_price || 0) * item.quantity
          let itemCost = 0

          // Calculate cost based on product type
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

          orderCost += itemCost
          orderProfit += (itemRevenue - itemCost)
        })
      }

      metrics.total_cost += orderCost
      metrics.total_profit += orderProfit
    })

    // Calculate derived metrics and convert to array
    const salesRepArray = Array.from(salesRepMetrics.values()).map(rep => ({
      ...rep,
      unique_customers_count: rep.unique_customers.size,
      average_order_value: rep.total_orders > 0 ? rep.total_revenue / rep.total_orders : 0,
      average_profit_per_order: rep.total_orders > 0 ? rep.total_profit / rep.total_orders : 0,
      average_discount_per_order: rep.total_orders > 0 ? rep.total_discount_given / rep.total_orders : 0,
      discount_percentage: rep.total_revenue > 0 ? (rep.total_discount_given / (rep.total_revenue + rep.total_discount_given)) * 100 : 0,
      collection_rate: rep.total_revenue > 0 ? (rep.total_collected / rep.total_revenue) * 100 : 0,
      completion_rate: rep.total_orders > 0 ? (rep.completed_orders / rep.total_orders) * 100 : 0,
      revenue_per_customer: rep.unique_customers.size > 0 ? rep.total_revenue / rep.unique_customers.size : 0,
      efficiency_score: rep.total_orders > 0 ? (rep.completed_orders * rep.total_revenue) / rep.total_orders : 0,
      profit_margin: rep.total_revenue > 0 ? (rep.total_profit / rep.total_revenue) * 100 : 0
    }))

    // Create different rankings
    const rankings = {
      // Most Profitable (Primary ranking - best for business)
      most_profitable: [...salesRepArray]
        .sort((a, b) => b.total_profit - a.total_profit)
        .slice(0, 10)
        .map((rep, index) => ({
          rank: index + 1,
          id: rep.id,
          name: rep.name,
          email: rep.email,
          metric_value: rep.total_profit,
          metric_label: 'Total Profit',
          additional_info: `${rep.profit_margin.toFixed(1)}% margin • ${rep.total_orders} orders`,
          total_revenue: rep.total_revenue,
          total_pending: rep.total_pending
        })),

      // Profit Efficiency (Less orders, more profit per order)
      profit_efficiency: [...salesRepArray]
        .filter(rep => rep.total_orders >= 2) // Minimum 2 orders for fair comparison
        .sort((a, b) => b.average_profit_per_order - a.average_profit_per_order)
        .slice(0, 10)
        .map((rep, index) => ({
          rank: index + 1,
          id: rep.id,
          name: rep.name,
          email: rep.email,
          metric_value: rep.average_profit_per_order,
          metric_label: 'Avg Profit/Order',
          additional_info: `${rep.total_orders} orders • ₹${new Intl.NumberFormat('en-IN').format(rep.total_profit)} total profit`,
          total_revenue: rep.total_revenue,
          total_pending: rep.total_pending
        })),

      // Most Sales (by number of orders)
      most_sales: [...salesRepArray]
        .sort((a, b) => b.total_orders - a.total_orders)
        .slice(0, 10)
        .map((rep, index) => ({
          rank: index + 1,
          id: rep.id,
          name: rep.name,
          email: rep.email,
          metric_value: rep.total_orders,
          metric_label: 'Orders',
          additional_info: `₹${new Intl.NumberFormat('en-IN').format(rep.total_revenue)} revenue`,
          total_revenue: rep.total_revenue,
          total_pending: rep.total_pending
        })),

      // Highest Revenue
      highest_revenue: [...salesRepArray]
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 10)
        .map((rep, index) => ({
          rank: index + 1,
          id: rep.id,
          name: rep.name,
          email: rep.email,
          metric_value: rep.total_revenue,
          metric_label: 'Revenue',
          additional_info: `${rep.total_orders} orders`,
          total_revenue: rep.total_revenue,
          total_pending: rep.total_pending
        })),

      // Best Discount Control (who gives less discount per order)
      discount_control: [...salesRepArray]
        .filter(rep => rep.total_orders >= 2) // Minimum 2 orders for fair comparison
        .sort((a, b) => {
          // Sort by lowest average discount per order (better discount control)
          // Secondary sort by number of orders (more orders with low discount is better)
          if (Math.abs(a.average_discount_per_order - b.average_discount_per_order) < 1) {
            return b.total_orders - a.total_orders;
          }
          return a.average_discount_per_order - b.average_discount_per_order;
        })
        .slice(0, 10)
        .map((rep, index) => ({
          rank: index + 1,
          id: rep.id,
          name: rep.name,
          email: rep.email,
          metric_value: rep.average_discount_per_order,
          metric_label: 'Avg Discount/Order',
          additional_info: `${rep.total_orders} orders • ${rep.discount_percentage.toFixed(1)}% total discount`,
          total_revenue: rep.total_revenue,
          total_pending: rep.total_pending
        })),

      // Best Collection (highest collection rate)
      best_collection: [...salesRepArray]
        .filter(rep => rep.total_orders >= 2) // Minimum 2 orders for fair comparison
        .sort((a, b) => {
          // Sort by highest collection rate
          // Secondary sort by total revenue (higher revenue with good collection is better)
          if (Math.abs(a.collection_rate - b.collection_rate) < 1) {
            return b.total_revenue - a.total_revenue;
          }
          return b.collection_rate - a.collection_rate;
        })
        .slice(0, 10)
        .map((rep, index) => ({
          rank: index + 1,
          id: rep.id,
          name: rep.name,
          email: rep.email,
          metric_value: rep.collection_rate,
          metric_label: 'Collection Rate',
          additional_info: `₹${new Intl.NumberFormat('en-IN').format(rep.total_collected)} collected • ${rep.collection_rate.toFixed(1)}% rate • ₹${new Intl.NumberFormat('en-IN').format(rep.total_revenue)} revenue`,
          total_revenue: rep.total_revenue,
          total_pending: rep.total_pending
        }))
    }

    return NextResponse.json({ rankings })

  } catch (error) {
    console.error('Error fetching sales rankings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales rankings' },
      { status: 500 }
    )
  }
}