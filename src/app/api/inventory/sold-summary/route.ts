import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json()

    console.log('Sold summary request for product IDs:', productIds?.length)

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({})
    }

    // Batch the requests to avoid URL length limits (50 IDs per batch)
    const BATCH_SIZE = 50
    const batches: string[][] = []
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      batches.push(productIds.slice(i, i + BATCH_SIZE))
    }

    console.log('Processing in', batches.length, 'batches')

    // Aggregate sold data by product
    const soldSummary: Record<string, { soldQty: number; soldValue: number }> = {}

    // Process each batch
    for (const batch of batches) {
      const { data: salesData, error } = await supabase
        .from('sales_order_items')
        .select('product_id, quantity, final_price')
        .in('product_id', batch)

      if (error) {
        console.error('Error fetching sales data for batch:', error)
        continue
      }

      salesData?.forEach((item) => {
        const productId = item.product_id
        if (!productId) return

        if (!soldSummary[productId]) {
          soldSummary[productId] = { soldQty: 0, soldValue: 0 }
        }

        const qty = Number(item.quantity) || 0
        const price = Number(item.final_price) || 0

        soldSummary[productId].soldQty += qty
        soldSummary[productId].soldValue += price
      })
    }

    console.log('Sold summary result:', Object.keys(soldSummary).length, 'products with sales')

    return NextResponse.json(soldSummary)

  } catch (error) {
    console.error('Error in sold-summary API:', error)
    return NextResponse.json({})
  }
}
