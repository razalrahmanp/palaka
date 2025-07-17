// src/app/api/analytics/sales/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Define types for the data structures
type TopProduct = {
  product_name: string;
  total_sales: number;
};

type SalesOverTime = {
  date: string;
  sales: number;
};

type SalesChannel = {
  name: string;
  value: number;
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
  try {
    // Fetch all sales analytics data in parallel
    const [
      topProductsRes,
      salesOverTimeRes,
      salesChannelRes,
      averageOrderValueRes,
      conversionRateRes
    ] = await Promise.all([
      supabaseAdmin.rpc('get_top_products_by_sales', { limit_count: 5 }),
      supabaseAdmin.rpc('get_sales_over_time'), // Using daily data now
      supabaseAdmin.rpc('get_sales_by_channel'),
      supabaseAdmin.rpc('get_average_order_value'),
      supabaseAdmin.rpc('get_quote_conversion_rate')
    ]);

    // Handle potential errors from the parallel calls
    if (topProductsRes.error) throw new Error(`Top Products RPC Error: ${topProductsRes.error.message}`);
    if (salesOverTimeRes.error) throw new Error(`Sales Over Time RPC Error: ${salesOverTimeRes.error.message}`);
    if (salesChannelRes.error) throw new Error(`Sales Channel RPC Error: ${salesChannelRes.error.message}`);
    if (averageOrderValueRes.error) throw new Error(`AOV RPC Error: ${averageOrderValueRes.error.message}`);
    if (conversionRateRes.error) throw new Error(`Conversion Rate RPC Error: ${conversionRateRes.error.message}`);
    
    // Structure the response data for the frontend component
    const responseData = {
      topProducts: (topProductsRes.data as TopProduct[]).map((p) => ({ name: p.product_name, sales: p.total_sales })),
      salesOverTime: (salesOverTimeRes.data as SalesOverTime[]),
      salesChannelBreakdown: (salesChannelRes.data as SalesChannel[]),
      averageOrderValue: averageOrderValueRes.data,
      conversionRate: conversionRateRes.data,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[SALES_ANALYTICS_GET]', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
  }
}
