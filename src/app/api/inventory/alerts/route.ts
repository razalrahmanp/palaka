import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
    try {
        // Fetch inventory items where quantity is at or below the reorder point
        const { data: lowStockItems, error } = await supabaseAdmin
            .from('inventory_items')
            .select('quantity, reorder_point, products(name)')
            .lte('quantity', supabaseAdmin.from('inventory_items').select('reorder_point').limit(1)); // This is a way to reference another column

        if (error) {
            // A more direct but potentially less performant way if the above fails
            const { data: allItems, error: allItemsError } = await supabaseAdmin
                .from('inventory_items')
                .select('quantity, reorder_point, products(name)');
            
            if (allItemsError) throw new Error(`Inventory Items Error: ${allItemsError.message}`);

            const filteredItems = allItems.filter(item => item.quantity <= item.reorder_point);
            return NextResponse.json(filteredItems);
        }

        return NextResponse.json(lowStockItems);
    } catch (error) {
        console.error('[INVENTORY_ALERTS_GET]', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}
