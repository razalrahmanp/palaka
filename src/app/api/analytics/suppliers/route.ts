// src/app/api/analytics/suppliers/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
  try {
    const [
      topSuppliersRes,
      deliveryPerfRes,
      totalSpendRes,
      avgDeliveryRes
    ] = await Promise.all([
      supabaseAdmin.rpc('get_top_suppliers_by_spend', { limit_count: 5 }),
      supabaseAdmin.rpc('get_supplier_delivery_performance'),
      supabaseAdmin.rpc('get_total_supplier_spend'),
      supabaseAdmin.rpc('get_average_on_time_delivery')
    ]);

    if (topSuppliersRes.error) throw new Error(`Top Suppliers RPC Error: ${topSuppliersRes.error.message}`);
    if (deliveryPerfRes.error) throw new Error(`Delivery Perf RPC Error: ${deliveryPerfRes.error.message}`);
    if (totalSpendRes.error) throw new Error(`Total Spend RPC Error: ${totalSpendRes.error.message}`);
    if (avgDeliveryRes.error) throw new Error(`Avg Delivery RPC Error: ${avgDeliveryRes.error.message}`);

    const responseData = {
      topSuppliersBySpend: topSuppliersRes.data,
      onTimeDelivery: deliveryPerfRes.data,
      kpis: {
        totalSpend: totalSpendRes.data,
        averageOnTimeDelivery: avgDeliveryRes.data
      }
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[SUPPLIER_ANALYTICS_GET]', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
  }
}
