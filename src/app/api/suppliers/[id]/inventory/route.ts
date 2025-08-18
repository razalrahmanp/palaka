// app/api/suppliers/[id]/inventory/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplierId } = await params;

    // Get detailed inventory items for this supplier
    const { data: inventoryItems, error } = await supabase
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
          supplier_id,
          image_url
        )
      `)
      .eq('products.supplier_id', supplierId)
      .order('quantity', { ascending: false });

    if (error) {
      console.error('Error fetching supplier inventory:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform and calculate metrics
    const transformedData = (inventoryItems || []).map(item => {
      const quantity = item.quantity || 0;
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      
      if (!product) return null;
      
      const price = product.price || 0;
      const cost = product.cost || 0;
      const stockValue = quantity * price;
      const stockCost = quantity * cost;
      const profit = stockValue - stockCost;
      const profitMargin = stockCost > 0 ? ((profit / stockCost) * 100) : 0;
      
      return {
        id: item.id,
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        description: product.description,
        category: product.category,
        image_url: product.image_url,
        quantity,
        reorder_point: item.reorder_point || 0,
        unit_price: price,
        unit_cost: cost,
        stock_value: stockValue,
        stock_cost: stockCost,
        profit_per_unit: profit / quantity || 0,
        total_profit: profit,
        profit_margin_percentage: profitMargin,
        stock_status: quantity <= (item.reorder_point || 0) ? 'Low Stock' : 
                     quantity === 0 ? 'Out of Stock' : 'In Stock',
        updated_at: item.updated_at
      };
    }).filter(Boolean);

    // Calculate summary metrics
    const summary = {
      total_products: transformedData.length,
      total_quantity: transformedData.reduce((sum, item) => sum + (item?.quantity || 0), 0),
      total_stock_value: transformedData.reduce((sum, item) => sum + (item?.stock_value || 0), 0),
      total_stock_cost: transformedData.reduce((sum, item) => sum + (item?.stock_cost || 0), 0),
      total_profit: transformedData.reduce((sum, item) => sum + (item?.total_profit || 0), 0),
      low_stock_items: transformedData.filter(item => item?.stock_status === 'Low Stock').length,
      out_of_stock_items: transformedData.filter(item => item?.stock_status === 'Out of Stock').length,
      categories: [...new Set(transformedData.map(item => item?.category).filter(Boolean))],
      overall_profit_margin: 0
    };

    // Add overall profit margin
    summary.overall_profit_margin = summary.total_stock_cost > 0 
      ? ((summary.total_profit / summary.total_stock_cost) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      supplier_id: supplierId,
      summary,
      inventory: transformedData,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in supplier inventory API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
