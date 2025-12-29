import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({})
    }

    // Fetch sold quantities and values from sales_order_items
    // Only count confirmed, shipped, delivered orders (not draft)
    const { data: salesData, error } = await supabase
      .from('sales_order_items')
      .select(`
        product_id,
        quantity,
        unit_price,
        final_price,
        sales_orders!inner(status)
      `)
      .in('product_id', productIds)
      .in('sales_orders.status', ['confirmed', 'shipped', 'delivered', 'ready_for_delivery', 'partial_delivery_ready'])

    if (error) {
      console.error('Error fetching sales data:', error)
      return NextResponse.json({})
    }

    // Aggregate sold data by product
    const soldSummary: Record<string, { soldQty: number; soldValue: number }> = {}

    salesData?.forEach((item) => {
      const productId = item.product_id
      if (!productId) return

      if (!soldSummary[productId]) {
        soldSummary[productId] = { soldQty: 0, soldValue: 0 }
      }

      const qty = Number(item.quantity) || 0
      // Use final_price if available, otherwise fall back to unit_price
      const price = Number(item.final_price) || Number(item.unit_price) || 0

      soldSummary[productId].soldQty += qty
      soldSummary[productId].soldValue += price * qty
    })

    return NextResponse.json(soldSummary)

  } catch (error) {
    console.error('Error in sold-summary API:', error)
    return NextResponse.json({})
  }
}
