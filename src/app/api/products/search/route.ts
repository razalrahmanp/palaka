import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!name || name.length < 2) {
      return NextResponse.json({ products: [] });
    }

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        price,
        cost,
        category,
        description,
        supplier_id,
        suppliers!inner (
          name
        )
      `)
      .or(`name.ilike.%${name}%,sku.ilike.%${name}%,description.ilike.%${name}%`)
      .eq('is_deleted', false)
      .order('name')
      .limit(limit);

    if (error) {
      console.error('Product search error:', error);
      return NextResponse.json(
        { error: 'Failed to search products' },
        { status: 500 }
      );
    }

    // Get inventory information separately
    const productIds = (products || []).map(p => p.id);
    const { data: inventoryData } = await supabase
      .from('inventory_items')
      .select('product_id, quantity, location, reorder_point')
      .in('product_id', productIds);

    // Transform the data to match the expected format
    const transformedProducts = (products || []).map((product: {
      id: string;
      name: string;
      sku: string;
      price: number;
      cost: number;
      category: string;
      description: string;
      suppliers: Array<{ name: string }> | null;
    }) => {
      const inventory = inventoryData?.find(inv => inv.product_id === product.id);
      return {
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        price: product.price,
        cost: product.cost,
        category: product.category,
        description: product.description,
        quantity: inventory?.quantity || 0,
        location: inventory?.location || 'Unknown',
        supplier_name: product.suppliers?.[0]?.name || 'Unknown',
        reorder_point: inventory?.reorder_point || 0,
        hsn_code: '', // Not in current schema
        tax_rate: 18, // Default GST rate
        unit: 'PCS', // Default unit
        warehouse_name: 'Main Warehouse' // Default warehouse
      };
    });

    return NextResponse.json({ products: transformedProducts });
  } catch (error) {
    console.error('Product search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}