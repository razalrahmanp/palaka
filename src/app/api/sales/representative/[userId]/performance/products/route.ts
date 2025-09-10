import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

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

    // Get sales orders with items and product details for the period
    const { data: salesOrders, error: ordersError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        status,
        created_at,
        sales_order_items(
          quantity,
          unit_price,
          product_id,
          products(
            name,
            category,
            cost,
            price
          )
        )
      `)
      .eq('sales_representative_id', userId)
      .gte('created_at', startDateStr)
      .lte('created_at', endDateStr + 'T23:59:59')

    if (ordersError) {
      console.error('Error fetching sales orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    // Process product performance data
    const productStats = new Map<string, {
      product_name: string
      category: string
      units_sold: number
      revenue: number
      cost: number
      profit: number
      profit_margin: number
      orders_count: number
    }>()

    const orders = salesOrders || []

    orders.forEach(order => {
      if (order.sales_order_items && Array.isArray(order.sales_order_items)) {
        order.sales_order_items.forEach(item => {
          if (item.products) {
            const product = Array.isArray(item.products) ? item.products[0] : item.products
            const productId = item.product_id
            const productName = product.name || 'Unknown Product'
            const category = product.category || 'Uncategorized'
            const quantity = item.quantity || 0
            const unitPrice = item.unit_price || 0
            const cost = product.cost || 0
            const revenue = quantity * unitPrice
            const totalCost = quantity * cost
            const profit = revenue - totalCost
            const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

            if (productStats.has(productId)) {
              const existing = productStats.get(productId)!
              existing.units_sold += quantity
              existing.revenue += revenue
              existing.cost += totalCost
              existing.profit += profit
              existing.profit_margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0
              existing.orders_count += 1
            } else {
              productStats.set(productId, {
                product_name: productName,
                category,
                units_sold: quantity,
                revenue,
                cost: totalCost,
                profit,
                profit_margin: profitMargin,
                orders_count: 1
              })
            }
          }
        })
      }
    })

    // Convert to array and sort by revenue
    const productPerformanceArray = Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)

    // Add ranking
    const productPerformance = productPerformanceArray.map((product, index) => ({
      rank: index + 1,
      product_name: product.product_name,
      category: product.category,
      units_sold: product.units_sold,
      revenue: product.revenue,
      profit_margin: product.profit_margin,
      orders_count: product.orders_count,
      total_profit: product.profit
    }))

    // Calculate summary metrics
    const totalProducts = productPerformance.length
    const totalUnits = productPerformance.reduce((sum, p) => sum + p.units_sold, 0)
    const totalRevenue = productPerformance.reduce((sum, p) => sum + p.revenue, 0)
    const totalProfit = productPerformance.reduce((sum, p) => sum + p.total_profit, 0)
    const averageProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    // Get top categories
    const categoryStats = new Map<string, { revenue: number, units: number, products: number }>()
    productPerformance.forEach(product => {
      if (categoryStats.has(product.category)) {
        const existing = categoryStats.get(product.category)!
        existing.revenue += product.revenue
        existing.units += product.units_sold
        existing.products += 1
      } else {
        categoryStats.set(product.category, {
          revenue: product.revenue,
          units: product.units_sold,
          products: 1
        })
      }
    })

    const topCategories = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        revenue: stats.revenue,
        units_sold: stats.units,
        products_count: stats.products
      }))
      .sort((a, b) => b.revenue - a.revenue)

    return NextResponse.json({
      products: productPerformance.slice(0, 50), // Limit to top 50 products
      summary: {
        total_products: totalProducts,
        total_units_sold: totalUnits,
        total_revenue: totalRevenue,
        total_profit: totalProfit,
        average_profit_margin: averageProfitMargin,
        period: `${startDateStr} to ${endDateStr}`
      },
      top_categories: topCategories.slice(0, 10) // Top 10 categories
    })

  } catch (error) {
    console.error('Error in products performance API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products performance data' },
      { status: 500 }
    )
  }
}
