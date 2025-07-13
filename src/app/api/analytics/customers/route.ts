import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
    try {
        const { data: acquisition, error: acqError } = await supabaseAdmin.rpc('get_monthly_customer_acquisition');
        if (acqError) throw new Error(`Acquisition RPC Error: ${acqError.message}`);

        // The error was here. Calling the new RPC function to calculate CLTV (as total spend).
        const { data: cltv, error: cltvError } = await supabaseAdmin.rpc('get_customer_lifetime_value', { limit_count: 5 });
        if (cltvError) throw new Error(`CLTV RPC Error: ${cltvError.message}`);

        const responseData = {
            acquisitionAndChurn: acquisition.map(a => ({
                month: a.month,
                acquired: a.new_customers,
                churned: Math.floor(a.new_customers * 0.2) // Mocking churn as 20% of acquisition
            })),
            cltv: cltv.map(c => ({ segment: c.customer_name, value: c.total_spend })),
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('[CUSTOMER_ANALYTICS_GET]', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}
