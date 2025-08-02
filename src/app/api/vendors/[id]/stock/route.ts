// app/api/vendors/[id]/stock/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;

    // Get stock items for this vendor from inventory_items (which contains the actual data)
    const { data: stockItems, error } = await supabase
      .from('inventory_items')
      .select(`
        id,
        quantity,
        reorder_point,
        updated_at,
        products!inner(
          id,
          name,
          sku,
          description,
          category,
          price,
          cost,
          supplier_id
        ),
        suppliers!inner(
          id,
          name
        )
      `)
      .eq('products.supplier_id', vendorId);

    if (error) throw error;

    // Transform data to match the expected interface
    const transformedData = (stockItems || []).map(item => {
      const quantity = item.quantity || 0;
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      
      if (!product) return null;
      
      const price = product.price || 0;
      const cost = product.cost || 0;
      
      return {
        product_id: item.id,
        product_name: product.name,
        sku: product.sku,
        description: product.description,
        category: product.category,
        current_quantity: quantity,
        reorder_point: item.reorder_point || 0,
        unit_price: price,
        unit_cost: cost,
        total_value: quantity * price,
        total_cost: quantity * cost,
        profit_per_unit: price - cost,
        total_profit_potential: quantity * (price - cost),
        margin_percentage: price > 0 ? ((price - cost) / price * 100) : 0,
        last_restocked: item.updated_at
      };
    }).filter(Boolean);

    // Sort by product name client-side
    transformedData.sort((a, b) => (a?.product_name || '').localeCompare(b?.product_name || ''));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('GET /api/vendors/[id]/stock error', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
