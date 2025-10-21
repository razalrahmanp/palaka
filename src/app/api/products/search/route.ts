import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

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
        image_url,
        created_at,
        updated_at,
        suppliers!inner (
          id,
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

    // Transform the data to match the ProductWithInventory interface exactly
    const transformedProducts = (products || []).map((product: {
      id: string;
      name: string;
      sku: string;
      price: number;
      cost: number;
      category: string;
      description: string;
      supplier_id: string;
      image_url: string | null;
      created_at: string;
      updated_at: string;
      suppliers: Array<{ id: string; name: string }> | null;
    }) => {
      const inventory = inventoryData?.find(inv => inv.product_id === product.id);
      return {
        // Match ProductWithInventory interface exactly
        inventory_id: `search-${product.id}`, // Generate a temporary ID for search results
        product_id: product.id,
        category: product.category,
        subcategory: null,
        material: null,
        location: inventory?.location || null,
        quantity: inventory?.quantity || 0,
        reorder_point: inventory?.reorder_point || 0,
        updated_at: product.updated_at,
        product_created_at: product.created_at,
        supplier_name: product.suppliers?.[0]?.name || null,
        supplier_id: product.supplier_id,
        price: product.price,
        product_name: product.name,
        product_description: product.description,
        product_category: product.category,
        product_image_url: product.image_url,
        sku: product.sku,
        applied_margin: 0, // Default value
        cost: product.cost
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