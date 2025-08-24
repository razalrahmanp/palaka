// app/api/products/route.ts
import { supabase as adminSupabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * A helper function to find the correct profit margin for a given product
 * based on the hierarchy: Product > Subcategory > Category > Global.
 * @param productId - The ID of the product. Can be null if the product is new.
 * @param category - The product's category.
 * @param subcategory - The product's subcategory.
 * @returns The applicable margin percentage.
 */
async function getMarginForProduct(productId: string | null, category?: string, subcategory?: string): Promise<number> {
    // Fetch all rules and the global setting once for efficiency.
    const [
        { data: marginRules },
        { data: settingData }
    ] = await Promise.all([
        adminSupabase.from('profit_margins').select('*'),
        adminSupabase.from('settings').select('value').eq('key', 'global_profit_margin').single()
    ]);

    const globalMargin = parseFloat(settingData?.value || '20'); // Default to 20%

    if (!marginRules) return globalMargin;

    // Create Maps for fast lookups
    const productMargins = new Map(marginRules.filter(r => r.product_id).map(r => [r.product_id, parseFloat(r.margin_percentage)]));
    const subcategoryMargins = new Map(marginRules.filter(r => r.subcategory).map(r => [r.subcategory, parseFloat(r.margin_percentage)]));
    const categoryMargins = new Map(marginRules.filter(r => r.category && !r.subcategory).map(r => [r.category, parseFloat(r.margin_percentage)]));

    // Apply the hierarchy
    const margin =
      (productId ? productMargins.get(productId) : undefined) ??
      (subcategory ? subcategoryMargins.get(subcategory) : undefined) ??
      (category ? categoryMargins.get(category) : undefined) ??
      globalMargin;
    
    return margin;
}

// POST: Create a new product with a calculated price
export async function POST(req: NextRequest) {
  const { name, sku, description, category, cost, image_url } = await req.json();

  if (cost === undefined || cost === null) {
      return NextResponse.json({ error: 'Cost is a required field.' }, { status: 400 });
  }

  // 1. Determine the margin to apply (product ID is null as it doesn't exist yet)
  const margin = await getMarginForProduct(null, category);
  
  // 2. Calculate the price
  const calculatedPrice = cost + (cost * (margin / 100));

  // 3. Insert the new product with both cost and the calculated price
  const { data, error } = await adminSupabase
    .from('products')
    .insert([{ 
        name, 
        sku, 
        description, 
        category, 
        cost, 
        image_url, 
        price: parseFloat(calculatedPrice.toFixed(2)) 
    }])
    .select()
    .single();

  if (error) {
    console.error('POST /api/products insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json(data, { status: 201 });
}

// GET: Fetch all products with pagination support
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const supplier = searchParams.get('supplier') || '';
  
  const offset = (page - 1) * limit;

  // Build query with filters
  let query = adminSupabase
    .from('inventory_items')
    .select(`
      *,
      products!inner(
        id,
        name,
        sku,
        description,
        category,
        image_url,
        cost,
        price,
        created_at,
        updated_at,
        supplier_id
      ),
      suppliers(
        id,
        name
      )
    `, { count: 'exact' });

  // Apply filters
  if (search) {
    // Simple text search in product name first, then extend if needed
    query = query.filter('products.name', 'ilike', `%${search}%`);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (supplier) {
    query = query.eq('supplier_id', supplier);
  }

  // Apply ordering - show recently updated inventory items first
  query = query.order('updated_at', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);
  
  const { data: products, error, count } = await query;

  if (error) {
    console.error('GET /api/products error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform the data to match ProductWithInventory interface
  const productsWithMargin = products?.map(item => {
      const product = item.products;
      const supplier = item.suppliers;
      const cost = product?.cost || 0;
      const price = product?.price || 0;
      let applied_margin = 0;

      if (cost && price && cost > 0) {
          applied_margin = ((price / cost) - 1) * 100;
      }
      
      return {
        inventory_id: item.id,
        product_id: product.id,
        category: item.category,
        subcategory: item.subcategory,
        material: item.material,
        location: item.location,
        quantity: item.quantity,
        reorder_point: item.reorder_point,
        updated_at: item.updated_at,
        product_created_at: product.created_at, // Add product creation date
        supplier_name: supplier?.name || null,
        supplier_id: item.supplier_id,
        price: product.price,
        product_name: product.name,
        product_description: product.description,
        product_category: product.category,
        product_image_url: product.image_url,
        sku: product.sku, // Just fetch the SKU directly from products table
        cost: product.cost,
        applied_margin: applied_margin.toFixed(1)
      };
  }) || [];

  return NextResponse.json({
    products: productsWithMargin,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      hasNext: (count || 0) > offset + limit,
      hasPrev: page > 1
    }
  });
}

// PUT: Update a product and recalculate price if cost changes
export async function PUT(req: NextRequest) {
    const { id, ...updates } = await req.json();
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // If the cost is being updated, we must recalculate the price.
    if (updates.cost !== undefined) {
        const { data: product } = await adminSupabase.from('products').select('category, subcategory').eq('id', id).single();
        if (product) {
            const margin = await getMarginForProduct(id, product.category, product.subcategory);
            const newPrice = updates.cost + (updates.cost * (margin / 100));
            updates.price = parseFloat(newPrice.toFixed(2));
        }
    }

    const { error } = await adminSupabase.from('products').update(updates).eq('id', id);
    if (error) {
        console.error('PUT /api/products error', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
}

// DELETE remains the same
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  const { error } = await adminSupabase.from('products').delete().eq('id', id)
  if (error) {
    console.error('DELETE /api/products error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
