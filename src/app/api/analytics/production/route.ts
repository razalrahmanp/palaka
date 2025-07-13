import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
    try {
        const { data: outputVsTarget, error: outputError } = await supabaseAdmin.rpc('get_production_summary');
        if (outputError) throw new Error(`Production Summary RPC Error: ${outputError.message}`);

        // The 'get_daily_defect_rate' function cannot be created as your schema
        // does not contain defect tracking data. Returning mock data instead.
        const mockDefectRates = [
            { date: '2023-06-01', rate: 1.2 },
            { date: '2023-06-02', rate: 0.8 },
            { date: '2023-06-03', rate: 1.5 },
        ];

        const responseData = {
            outputVsTarget: outputVsTarget.map(p => ({
                product: p.product_name,
                output: p.total_output,
                target: p.total_target
            })),
            defectRates: mockDefectRates,
        };

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('[PRODUCTION_ANALYTICS_GET]', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
    }
}
