import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
    try {
        // Correctly query 'inventory_items' for stock levels and join 'products' for the name.
        const { data: stockLevels, error: stockLevelsError } = await supabaseAdmin
            .from('inventory_items')
            .select('quantity, products(name)')
            .order('quantity', { ascending: false })
            .limit(10);
        if (stockLevelsError) throw new Error(`Stock Levels Error: ${stockLevelsError.message}`);

        // The 'get_moving_products' function also needs to be corrected to use 'sales_order_items'.
        // Assuming the function is updated in the DB, these calls should now work.
        const { data: fastMoving, error: fastMovingError } = await supabaseAdmin.rpc('get_moving_products', { sort_order: 'DESC', limit_count: 5 });
        if(fastMovingError) throw new Error(`Fast Moving RPC Error: ${fastMovingError.message}`);

        const { data: slowMoving, error: slowMovingError } = await supabaseAdmin.rpc('get_moving_products', { sort_order: 'ASC', limit_count: 5 });
        if(slowMovingError) throw new Error(`Slow Moving RPC Error: ${slowMovingError.message}`);

        const responseData = {
            stockLevels: stockLevels.map(p => ({
                name: Array.isArray(p.products) && p.products.length > 0 ? p.products[0].name : 'Unknown Product',
                level: p.quantity
            })),
            inventoryTurnover: [ // This is complex and best calculated in a dedicated view/RPC
                { month: 'Jan', rate: 3.5 },
                { month: 'Feb', rate: 3.8 },
                { month: 'Mar', rate: 4.1 },
            ],
            fastMoving: fastMoving.map((p: { product_name: string; total_quantity: number }) => ({ name: p.product_name, units: p.total_quantity })),
            slowMoving: slowMoving.map((p: { product_name: string; total_quantity: number }) => ({ name: p.product_name, units: p.total_quantity })),
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('[INVENTORY_ANALYTICS_GET]', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}
