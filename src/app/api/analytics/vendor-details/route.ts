// src/app/api/analytics/vendor-details/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');

    if (!vendorId) {
      return new NextResponse(JSON.stringify({ error: "Bad Request", details: "vendorId is required" }), { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('get_vendor_performance_details', {
      vendor_id_in: vendorId
    });

    if (error) {
      throw new Error(`Vendor Details RPC Error: ${error.message}`);
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('[VENDOR_DETAILS_ANALYTICS_GET]', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(JSON.stringify({ error: "Internal Server Error", details: errorMessage }), { status: 500 });
  }
}
