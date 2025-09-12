import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Check costs in products table
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, name, cost, price')
      .limit(10);

    if (productsError) {
      console.error('Products error:', productsError);
    }

    // Check costs in custom_products table
    const { data: customProductsData, error: customProductsError } = await supabase
      .from('custom_products')
      .select('id, name, cost_price, price')
      .limit(10);

    if (customProductsError) {
      console.error('Custom products error:', customProductsError);
    }

    // Check some actual sales items with their costs
    const { data: salesItemsData, error: salesItemsError } = await supabase
      .from('sales_order_items')
      .select(`
        product_id,
        custom_product_id,
        quantity,
        final_price,
        cost,
        products(id, name, cost, price),
        custom_products(id, name, cost_price, price)
      `)
      .limit(10);

    if (salesItemsError) {
      console.error('Sales items error:', salesItemsError);
    }

    return NextResponse.json({
      products: productsData,
      customProducts: customProductsData,
      salesItems: salesItemsData,
      errors: {
        productsError,
        customProductsError,
        salesItemsError
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ error: 'Failed to fetch debug data' }, { status: 500 });
  }
}