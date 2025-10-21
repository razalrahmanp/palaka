import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabasePool'

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

    // Fetch returns data for service excellence ranking
    const { data: returns } = await supabase
      .from('returns')
      .select('sales_representative_id, order_id, status, created_at')

    // Fetch complaints data for service excellence ranking
    const { data: complaints } = await supabase
      .from('customer_complaints')
      .select('sales_rep_id, order_id, status, created_at, resolved_at, customer_satisfaction_rating')

    console.log('Returns data:', returns?.length)
    console.log('Complaints data:', complaints?.length)

    console.log('Collection lookup sample:', Array.from(collectionsByOrder.entries()).slice(0, 3))

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        rankings: {
          most_profitable: [],
          profit_efficiency: [],
          most_sales: [],
          highest_revenue: [],
          discount_control: [],
          best_collection: [],
          service_excellence: []
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
          total_pending: 0,
          // Service excellence metrics
          total_returns: 0,
          total_complaints: 0,
          resolved_complaints: 0,
          average_satisfaction_rating: 0,
          total_resolution_time: 0,
          complaint_count_with_rating: 0
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

    // Process returns data for service excellence metrics
    if (returns) {
      returns.forEach(returnItem => {
        const repId = returnItem.sales_representative_id
        if (salesRepMetrics.has(repId)) {
          const metrics = salesRepMetrics.get(repId)
          metrics.total_returns += 1
        }
      })
    }

    // Process complaints data for service excellence metrics
    if (complaints) {
      complaints.forEach(complaint => {
        const repId = complaint.sales_rep_id
        if (salesRepMetrics.has(repId)) {
          const metrics = salesRepMetrics.get(repId)
          metrics.total_complaints += 1
          
          // Track resolved complaints
          if (complaint.status === 'resolved' || complaint.status === 'closed') {
            metrics.resolved_complaints += 1
            
            // Calculate resolution time if both dates exist
            if (complaint.created_at && complaint.resolved_at) {
              const createdAt = new Date(complaint.created_at)
              const resolvedAt = new Date(complaint.resolved_at)
              const resolutionTime = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60) // in hours
              metrics.total_resolution_time += resolutionTime
            }
          }
          
          // Track satisfaction ratings
          if (complaint.customer_satisfaction_rating) {
            metrics.average_satisfaction_rating += complaint.customer_satisfaction_rating
            metrics.complaint_count_with_rating += 1
          }
        }
      })
    }

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
      profit_margin: rep.total_revenue > 0 ? (rep.total_profit / rep.total_revenue) * 100 : 0,
      // Service excellence derived metrics
      returns_rate: rep.total_orders > 0 ? (rep.total_returns / rep.total_orders) * 100 : 0,
      complaints_rate: rep.total_orders > 0 ? (rep.total_complaints / rep.total_orders) * 100 : 0,
      complaint_resolution_rate: rep.total_complaints > 0 ? (rep.resolved_complaints / rep.total_complaints) * 100 : 0,
      average_resolution_time: rep.resolved_complaints > 0 ? rep.total_resolution_time / rep.resolved_complaints : 0,
      customer_satisfaction_avg: rep.complaint_count_with_rating > 0 ? rep.average_satisfaction_rating / rep.complaint_count_with_rating : 0,
      service_excellence_score: 0 // Will be calculated below
    }))

    // Calculate service excellence score for each rep
    salesRepArray.forEach(rep => {
      if (rep.total_orders >= 2) { // Minimum orders requirement for fair comparison
        let score = 100 // Start with perfect score

        // Penalize for high returns rate (subtract up to 30 points)
        score -= Math.min(30, rep.returns_rate * 3)

        // Penalize for high complaints rate (subtract up to 25 points)  
        score -= Math.min(25, rep.complaints_rate * 5)

        // Penalize for low complaint resolution rate (subtract up to 20 points)
        if (rep.total_complaints > 0) {
          score -= Math.min(20, (100 - rep.complaint_resolution_rate) * 0.2)
        }

        // Penalize for slow resolution time (subtract up to 15 points)
        if (rep.average_resolution_time > 0) {
          // Penalize if resolution takes more than 24 hours
          const hoursOver24 = Math.max(0, rep.average_resolution_time - 24)
          score -= Math.min(15, hoursOver24 * 0.5)
        }

        // Bonus for high customer satisfaction (add up to 10 points)
        if (rep.customer_satisfaction_avg > 0) {
          score += Math.min(10, (rep.customer_satisfaction_avg - 3) * 5) // Bonus for ratings above 3
        }

        rep.service_excellence_score = Math.max(0, score) // Ensure non-negative
      }
    })

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
        })),

      // Service Excellence (lowest returns/complaints, best resolution)
      service_excellence: [...salesRepArray]
        .filter(rep => rep.total_orders >= 2) // Minimum 2 orders for fair comparison
        .sort((a, b) => {
          // Sort by highest service excellence score
          // Secondary sort by total orders (more orders with good service is better)
          if (Math.abs(a.service_excellence_score - b.service_excellence_score) < 1) {
            return b.total_orders - a.total_orders;
          }
          return b.service_excellence_score - a.service_excellence_score;
        })
        .slice(0, 10)
        .map((rep, index) => ({
          rank: index + 1,
          id: rep.id,
          name: rep.name,
          email: rep.email,
          metric_value: rep.service_excellence_score,
          metric_label: 'Service Score',
          additional_info: `${rep.returns_rate.toFixed(1)}% returns • ${rep.complaints_rate.toFixed(1)}% complaints • ${rep.total_orders} orders`,
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