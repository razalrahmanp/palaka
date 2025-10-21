import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status') || 'pending';

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    console.log(`🔍 Fetching payroll records for employee: ${employeeId}, status: ${status}`);

    // Fetch payroll records for the employee
    const { data: payrollRecords, error } = await supabase
      .from('payroll_records')
      .select(`
        id,
        pay_period_start,
        pay_period_end,
        basic_salary,
        total_allowances,
        total_deductions,
        gross_salary,
        net_salary,
        bonus,
        overtime_amount,
        status,
        working_days,
        present_days,
        leave_days,
        overtime_hours,
        created_at,
        processed_at,
        processed_by
      `)
      .eq('employee_id', employeeId)
      .eq('status', status)
      .order('pay_period_start', { ascending: false });

    if (error) {
      console.error('Error fetching payroll records:', error);
      return NextResponse.json({ error: 'Failed to fetch payroll records' }, { status: 500 });
    }

    console.log(`✅ Found ${payrollRecords?.length || 0} payroll records`);

    return NextResponse.json({
      success: true,
      data: payrollRecords || []
    });

  } catch (error) {
    console.error('Payroll records API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
