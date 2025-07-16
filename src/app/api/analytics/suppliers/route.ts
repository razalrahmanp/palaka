import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
    try {
        // This is a complex query, simplified here. A real implementation might use a materialized view.
        const { data: topSuppliers, error: suppliersError } = await supabaseAdmin.rpc('get_top_suppliers_by_spend', { limit_count: 5 });
        if(suppliersError) throw new Error(`Top Suppliers RPC Error: ${suppliersError.message}`);

        const { data: deliveryPerf, error: deliveryPerfError } = await supabaseAdmin.rpc('get_supplier_delivery_performance');
        if(deliveryPerfError) throw new Error(`Delivery Perf RPC Error: ${deliveryPerfError.message}`);

        const responseData = {
            topSuppliersBySpend: topSuppliers.map((s: { supplier_name: string; total_spend: number }) => ({ name: s.supplier_name, spend: s.total_spend })),
            onTimeDelivery: deliveryPerf.map((s: { supplier_name: string; on_time_percentage: number }) => ({ name: s.supplier_name, performance: s.on_time_percentage })),
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('[SUPPLIER_ANALYTICS_GET]', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}

/**
 * Required Supabase SQL Functions:
 *
 * CREATE OR REPLACE FUNCTION get_top_suppliers_by_spend(limit_count INT)
 * RETURNS TABLE(supplier_name TEXT, total_spend NUMERIC) AS $$
 * BEGIN
 * RETURN QUERY
 * SELECT s.name as supplier_name, SUM(p.price * poi.quantity) as total_spend
 * FROM purchase_order_items poi -- Assuming this table exists
 * JOIN purchase_orders po ON poi.purchase_order_id = po.id
 * JOIN suppliers s ON po.supplier_id = s.id
 * JOIN products p ON poi.product_id = p.id
 * GROUP BY s.name
 * ORDER BY total_spend DESC
 * LIMIT limit_count;
 * END;
 * $$ LANGUAGE plpgsql;
 * * CREATE OR REPLACE FUNCTION get_supplier_delivery_performance()
 * RETURNS TABLE(supplier_name TEXT, on_time_percentage NUMERIC) AS $$
 * BEGIN
 * RETURN QUERY
 * SELECT
 * s.name as supplier_name,
 * (COUNT(CASE WHEN po.actual_delivery_date <= po.expected_delivery_date THEN 1 END) * 100.0) / COUNT(*) as on_time_percentage
 * FROM purchase_orders po
 * JOIN suppliers s ON po.supplier_id = s.id
 * WHERE po.status = 'Delivered' AND po.actual_delivery_date IS NOT NULL AND po.expected_delivery_date IS NOT NULL
 * GROUP BY s.name;
 * END;
 * $$ LANGUAGE plpgsql;
 * * -- NOTE: The above assumes a `purchase_order_items` table. If you don't have one, the logic for spend would need to be different.
 */
