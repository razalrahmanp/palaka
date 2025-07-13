import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
    try {
        const { data: topProducts, error: topProductsError } = await supabaseAdmin.rpc('get_top_products_by_sales', { limit_count: 5 });
        if (topProductsError) throw new Error(`Top Products RPC Error: ${topProductsError.message}`);

        const { data: salesOverTime, error: salesOverTimeError } = await supabaseAdmin.rpc('get_monthly_sales');
        if (salesOverTimeError) throw new Error(`Sales Over Time RPC Error: ${salesOverTimeError.message}`);
        
        const { data: salesChannelBreakdown, error: channelError } = await supabaseAdmin.rpc('get_sales_by_channel');
        if (channelError) throw new Error(`Channel RPC Error: ${channelError.message}`);

        const responseData = {
            topProducts: topProducts.map(p => ({ name: p.product_name, sales: p.total_sales })),
            salesOverTime: salesOverTime.map(s => ({ date: s.month, sales: s.total_sales })),
            salesChannelBreakdown: salesChannelBreakdown.map(c => ({ name: c.channel, value: c.total_sales })),
            conversionRate: 0.031, // Mocked
            averageOrderValue: 132.75, // Mocked
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('[SALES_ANALYTICS_GET]', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}

/**
 * Required Supabase SQL Functions:
 *
 * CREATE OR REPLACE FUNCTION get_top_products_by_sales(limit_count INT)
 * RETURNS TABLE(product_name TEXT, total_sales NUMERIC) AS $$
 * BEGIN
 * RETURN QUERY
 * SELECT p.name AS product_name, SUM(oi.price_at_sale * oi.quantity) AS total_sales
 * FROM order_items oi
 * JOIN products p ON oi.product_id = p.id
 * GROUP BY p.name
 * ORDER BY total_sales DESC
 * LIMIT limit_count;
 * END;
 * $$ LANGUAGE plpgsql;
 * * CREATE OR REPLACE FUNCTION get_sales_by_channel()
 * RETURNS TABLE(channel TEXT, total_sales NUMERIC) AS $$
 * BEGIN
 * RETURN QUERY
 * SELECT so.channel, SUM(oi.price_at_sale * oi.quantity) AS total_sales
 * FROM sales_orders so
 * JOIN order_items oi ON so.id = oi.order_id
 * GROUP BY so.channel;
 * END;
 * $$ LANGUAGE plpgsql;
 */
