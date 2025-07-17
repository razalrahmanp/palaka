// src/app/api/analytics/inventory/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

interface InventoryItem {
  quantity: number;
  products?: {
    name?: string;
  };
}

interface MovingProduct {
  product_name: string;
  total_quantity: number;
}

export async function GET() {
  try {
    const [
      stockLevelsRes,
      turnoverRes,
      fastMovingRes,
      slowMovingRes,
      totalValueRes,
      stockoutRateRes
    ] = await Promise.all([
      supabaseAdmin.from('inventory_items').select('quantity, products(name)').order('quantity', { ascending: false }).limit(10),
      supabaseAdmin.rpc('get_inventory_turnover_rate'),
      supabaseAdmin.rpc('get_moving_products', { sort_order: 'DESC', limit_count: 5 }),
      supabaseAdmin.rpc('get_moving_products', { sort_order: 'ASC', limit_count: 5 }),
      supabaseAdmin.rpc('get_total_inventory_value'),
      supabaseAdmin.rpc('get_stockout_rate')
    ]);

    if (stockLevelsRes.error) throw new Error(`Stock Levels Error: ${stockLevelsRes.error.message}`);
    if (turnoverRes.error) throw new Error(`Inventory Turnover RPC Error: ${turnoverRes.error.message}`);
    if (fastMovingRes.error) throw new Error(`Fast Moving RPC Error: ${fastMovingRes.error.message}`);
    if (slowMovingRes.error) throw new Error(`Slow Moving RPC Error: ${slowMovingRes.error.message}`);
    if (totalValueRes.error) throw new Error(`Total Value RPC Error: ${totalValueRes.error.message}`);
    if (stockoutRateRes.error) throw new Error(`Stockout Rate RPC Error: ${stockoutRateRes.error.message}`);

    const responseData = {
      stockLevels: (stockLevelsRes.data as InventoryItem[]).map((p) => ({
        name: p.products?.name ?? 'Unknown Product',
        level: p.quantity
      })),
      inventoryTurnover: turnoverRes.data,
      fastMoving: (fastMovingRes.data as MovingProduct[]).map((p) => ({ name: p.product_name, units: p.total_quantity })),
      slowMoving: (slowMovingRes.data as MovingProduct[]).map((p) => ({ name: p.product_name, units: p.total_quantity })),
      kpis: {
        totalValue: totalValueRes.data,
        stockoutRate: stockoutRateRes.data
      }
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[INVENTORY_ANALYTICS_GET]', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
  }
}
