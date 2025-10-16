import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    console.log('🏗️ Fetching capital expenditure...', { startDate, endDate });

    // Build query - only Capital Expenditure category
    let query = supabase
      .from("expenses")
      .select(`
        id,
        date,
        category,
        subcategory,
        amount,
        description,
        reference,
        vendor_id,
        vendors!vendor_id(name)
      `)
      .eq('category', 'Capital Expenditure');

    // Apply date filters if provided
    if (startDate && endDate) {
      query = query
        .gte('date', startDate)
        .lte('date', endDate);
    }
    
    query = query.order("date", { ascending: false });

    const { data: expenses, error } = await query;

    if (error) {
      console.error('❌ Error fetching capital expenditure:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`💰 Found ${expenses?.length || 0} capital expenditure items`);

    return NextResponse.json(expenses || []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ Error in capital expenditure API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
