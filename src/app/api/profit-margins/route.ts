// app/api/profit-margins/route.ts
import { supabase } from '@/lib/supabasePool'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Recalculates and updates prices for a batch of products.
 * This function is the core of the new logic, ensuring prices in the DB are always current.
 * @param filter - An object specifying which products to update (by productId, category, or subcategory).
 */
async function updateProductPrices(filter: { productId?: string; category?: string; subcategory?: string }) {
  type ProductToUpdate = { id: string; cost: number; category: string };
  let productsToUpdate: ProductToUpdate[] | null = [];

  // 1. Fetch products based on filter
  if (filter.subcategory) {
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('product_id')
      .eq('subcategory', filter.subcategory);

    if (inventoryError) {
      console.error("Error fetching inventory_items:", inventoryError);
      return;
    }

    const productIds = [...new Set(inventoryData.map(item => item.product_id).filter(id => id))];
    if (productIds.length === 0) return;

    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('id, cost, category')
      .in('id', productIds);

    if (productError) {
      console.error("Error fetching products for subcategory update:", productError);
      return;
    }

    productsToUpdate = productData;

  } else {
    let query = supabase.from('products').select('id, cost, category');
    if (filter.productId) query = query.eq('id', filter.productId);
    if (filter.category) query = query.eq('category', filter.category);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching products to update prices:", error);
      return;
    }

    productsToUpdate = data;
  }

  if (!productsToUpdate || productsToUpdate.length === 0) return;

  // 2. Fetch context for margin calculation
  const [
    { data: marginRules },
    { data: settingData },
    { data: inventoryItems }
  ] = await Promise.all([
    supabase.from('profit_margins').select('*'),
    supabase.from('settings').select('value').eq('key', 'global_profit_margin').single(),
    supabase.from('inventory_items').select('product_id, subcategory').not('product_id', 'is', null)
  ]);

  const globalMargin = parseFloat(settingData?.value || '20');
  const productSubcategoryMap = new Map(inventoryItems?.map(item => [item.product_id, item.subcategory]));

  const productMargins = new Map(marginRules?.filter(r => r.product_id).map(r => [r.product_id, parseFloat(r.margin_percentage)]));
  const subcategoryMargins = new Map(marginRules?.filter(r => r.subcategory).map(r => [r.subcategory, parseFloat(r.margin_percentage)]));
  const categoryMargins = new Map(marginRules?.filter(r => r.category && !r.subcategory).map(r => [r.category, parseFloat(r.margin_percentage)]));

  // 3. Build valid update array with calculated prices
  const updates = productsToUpdate
    .filter(p => p.id && p.cost != null)
    .map(p => {
      const cost = p.cost;
      const subcategory = productSubcategoryMap.get(p.id);
      const margin =
        productMargins.get(p.id) ??
        (subcategory ? subcategoryMargins.get(subcategory) : undefined) ??
        (p.category ? categoryMargins.get(p.category) : undefined) ??
        globalMargin;

      const price = cost + (cost * (margin / 100));
      return {
        id: p.id,
        price: parseFloat(price.toFixed(2))
      };
    });

  if (updates.length === 0) return;

  // 4. Call PostgreSQL function
  const { error: rpcError } = await supabase.rpc('bulk_update_product_prices', { updates });

  if (rpcError) {
    console.error("Error calling bulk_update_product_prices:", rpcError);
  }
}


// POST: Create a new profit margin rule and trigger a price update
export async function POST(req: NextRequest) {
    const { level, target, margin } = await req.json();
    const insertData: { margin_percentage: number; product_id?: string; category?: string; subcategory?: string } = { margin_percentage: margin };
    const filterForUpdate: { productId?: string; category?: string; subcategory?: string } = {};

    if (level === 'product' && target) {
        insertData.product_id = target;
        filterForUpdate.productId = target;
    } else if (level === 'category' && target) {
        insertData.category = target;
        filterForUpdate.category = target;
    } else if (level === 'subcategory' && target) {
        insertData.subcategory = target;
        filterForUpdate.subcategory = target;
    } else {
        return NextResponse.json({ error: 'Invalid rule level or missing target' }, { status: 400 });
    }

    const { data, error } = await supabase.from('profit_margins').insert([insertData]).select().single();
    if (error) {
        console.error('POST /api/profit-margins error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // After successfully inserting the rule, trigger the price update for affected products
    await updateProductPrices(filterForUpdate);

    return NextResponse.json(data, { status: 201 });
}

// DELETE: Remove a profit margin rule and trigger a price update
export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ error: 'Missing rule ID' }, { status: 400 });
    }

    // We must fetch the rule first to know which products will be affected after its deletion.
    const { data: ruleToDelete, error: fetchError } = await supabase
        .from('profit_margins')
        .select('product_id, category, subcategory')
        .eq('id', id)
        .single();
    
    if (fetchError || !ruleToDelete) {
        return NextResponse.json({ error: 'Rule not found.' }, { status: 404 });
    }

    // Now, delete the rule
    const { error: deleteError } = await supabase.from('profit_margins').delete().eq('id', id);
    if (deleteError) {
        console.error('DELETE /api/profit-margins error:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Finally, trigger a price update for the products that were governed by the deleted rule.
    // They will now fall back to the next rule in the hierarchy.
    const filterForUpdate: { productId?: string; category?: string; subcategory?: string } = {};
    if (ruleToDelete.product_id)   filterForUpdate.productId = ruleToDelete.product_id;
    else if (ruleToDelete.subcategory) filterForUpdate.subcategory = ruleToDelete.subcategory;
    else if (ruleToDelete.category)    filterForUpdate.category = ruleToDelete.category;

    if (Object.keys(filterForUpdate).length > 0) {
        await updateProductPrices(filterForUpdate);
    }

    return NextResponse.json({ success: true });
}


// GET function remains the same as in the previous version.
export async function GET() {
  const { data, error } = await supabase
    .from('profit_margins')
    .select(`
      id,
      margin_percentage,
      product_id,
      category,
      subcategory,
      products ( name )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /api/profit-margins error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
