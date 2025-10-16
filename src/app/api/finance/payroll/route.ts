import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    console.log('👥 Fetching payroll records...', { startDate, endDate });

    // Build query
    let query = supabase
      .from("payroll_records")
      .select(`
        id,
        employee_id,
        month_year,
        processed_at,
        gross_salary,
        net_salary,
        total_deductions,
        employees!employee_id(
          id,
          name,
          email
        )
      `);

    // Apply date filters if provided
    if (startDate && endDate) {
      query = query
        .gte('processed_at', startDate)
        .lte('processed_at', endDate);
    }
    
    query = query.order("processed_at", { ascending: false });

    const { data: payroll, error } = await query;

    if (error) {
      console.error('❌ Error fetching payroll:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`💵 Found ${payroll?.length || 0} payroll records`);

    // Format data for Cash Flow dialog
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedPayroll = payroll?.map((p: any) => ({
      id: p.id,
      processed_at: p.processed_at,
      employee_id: p.employee_id,
      employee_name: p.employees?.name || 'Unknown Employee',
      month_year: p.month_year,
      gross_salary: p.gross_salary,
      net_salary: p.net_salary,
      total_deductions: p.total_deductions
    })) || [];

    return NextResponse.json(formattedPayroll);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ Error in payroll API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
