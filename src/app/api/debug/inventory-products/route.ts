import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Test 1: Check if products have cost values
    const { data: productsWithCost, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, cost, supplier_id')
      .not('cost', 'is', null)
      .limit(10);

    // Test 2: Check inventory items with product join
    const { data: inventoryWithProducts, error: inventoryError } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        id,
        supplier_id,
        quantity,
        product_id,
        products(
          id,
          name,
          cost
        )
      `)
      .limit(10);

    // Test 3: Check specific supplier inventory
    const { data: supplierInventory, error: supplierError } = await supabaseAdmin
      .from('inventory_items')
      .select(`
        id,
        supplier_id,
        quantity,
        product_id,
        products(
          id,
          name,
          cost
        )
      `)
      .eq('supplier_id', 'e3f56dde-1509-40e0-a1db-60916361ca60') // AFFON-OZOAN DECOR from logs
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        productsWithCost: {
          count: productsWithCost?.length || 0,
          items: productsWithCost,
          error: productError
        },
        inventoryWithProducts: {
          count: inventoryWithProducts?.length || 0,
          items: inventoryWithProducts,
          error: inventoryError
        },
        supplierInventory: {
          count: supplierInventory?.length || 0,
          items: supplierInventory,
          error: supplierError
        }
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debug data' },
      { status: 500 }
    );
  }
}
