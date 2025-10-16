import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    console.log('🏦 Fetching loan disbursements...', { startDate, endDate });

    // Build query
    let query = supabase
      .from("loan_opening_balances")
      .select(`
        id,
        loan_provider,
        original_loan_amount,
        interest_rate,
        loan_start_date,
        loan_term_months,
        current_balance,
        status,
        notes
      `);

    // Apply date filters if provided
    if (startDate && endDate) {
      query = query
        .gte('loan_start_date', startDate)
        .lte('loan_start_date', endDate);
    }
    
    query = query.order("loan_start_date", { ascending: false });

    const { data: loans, error } = await query;

    if (error) {
      console.error('❌ Error fetching loans:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`💳 Found ${loans?.length || 0} loan disbursements`);

    return NextResponse.json(loans || []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ Error in loans API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
