import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseAdmin'

type OrderRow = {
  id: string;
  quote_id?: string | null;
  customer_id: string;
  status: string;
  created_at: string;
  updated_at?: string;
  customer: { name: string; email?: string } | null;
};

type ItemRow = {
  order_id: string;
  quantity: number;
  unit_price: number | null;
  product: {
    name: string;
    price: number;
    sku?: string;
    supplier: { name: string } | null;
  } | null;
  custom_product: {
    name: string;
    price: number;
    supplier: { name: string } | null;
  } | null;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    // Filter parameters
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search') // For customer name search

    // Build the query for orders
    let ordersQuery = supabase
      .from("sales_orders")
      .select(`
        id,
        quote_id,
        customer_id,
        status,
        created_at,
        updated_at,
        customers(name, email)
      `, { count: 'exact' })
      .eq('created_by', userId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      ordersQuery = ordersQuery.eq('status', status)
    }

    if (startDate) {
      ordersQuery = ordersQuery.gte('created_at', startDate)
    }

    if (endDate) {
      ordersQuery = ordersQuery.lte('created_at', endDate)
    }

    // Apply pagination
    ordersQuery = ordersQuery.range(offset, offset + limit - 1)

    const { data: ordersRaw, error: ordersError, count } = await ordersQuery

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    if (!ordersRaw) {
      return NextResponse.json({
        orders: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      })
    }

    // Filter by customer name if search parameter is provided
    let filteredOrders = ordersRaw
    if (search) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filteredOrders = ordersRaw.filter((order: any) => 
        order.customers?.name?.toLowerCase().includes(search.toLowerCase())
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders: OrderRow[] = filteredOrders.map((o: any) => ({
      id: o.id,
      quote_id: o.quote_id,
      customer_id: o.customer_id,
      status: o.status,
      created_at: o.created_at,
      updated_at: o.updated_at,
      customer: o.customers ? { 
        name: o.customers.name,
        email: o.customers.email 
      } : null,
    }))

    // Get order items for all orders in this page
    const orderIds = orders.map(order => order.id)
    
    let itemsData: ItemRow[] = []
    if (orderIds.length > 0) {
      const { data: itemsRaw, error: itemsError } = await supabase
        .from("sales_order_items")
        .select(`
          order_id,
          quantity,
          unit_price,
          product:products(name, price, sku, suppliers(name)),
          custom_product:custom_products(name, price, suppliers(name))
        `)
        .in('order_id', orderIds)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itemsData = (itemsRaw ?? []).map((i: any) => ({
          order_id: i.order_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          product: i.product ? {
            name: i.product.name,
            price: i.product.price,
            sku: i.product.sku,
            supplier: i.product.suppliers || null,
          } : null,
          custom_product: i.custom_product ? {
            name: i.custom_product.name,
            price: i.custom_product.price,
            supplier: i.custom_product.suppliers || null,
          } : null,
        }))
      }
    }

    // Group orders with their items and calculate totals
    const ordersWithItems = orders.map((order) => {
      const orderItems = itemsData
        .filter((item) => item.order_id === order.id)
        .map((item) => ({
          name: item.product?.name ?? item.custom_product?.name ?? "(no name)",
          sku: item.product?.sku ?? "",
          quantity: item.quantity ?? 0,
          unit_price: item.unit_price ?? item.product?.price ?? item.custom_product?.price ?? 0,
          total_price: (item.quantity ?? 0) * (item.unit_price ?? item.product?.price ?? item.custom_product?.price ?? 0),
          supplier_name: item.product?.supplier?.name ?? item.custom_product?.supplier?.name ?? "",
        }))

      const calculatedTotal = orderItems.reduce((sum, item) => sum + item.total_price, 0)
      
      return {
        ...order,
        items: orderItems,
        items_count: orderItems.length,
        calculated_total: calculatedTotal,
        display_total: calculatedTotal
      }
    })

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      orders: ordersWithItems,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      summary: {
        total_orders: count || 0,
        pending_orders: ordersWithItems.filter(o => o.status === 'pending').length,
        completed_orders: ordersWithItems.filter(o => ['delivered', 'completed'].includes(o.status)).length,
        total_revenue: ordersWithItems.reduce((sum, order) => sum + order.display_total, 0)
      }
    })

  } catch (error) {
    console.error('Error in sales representative orders API:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
