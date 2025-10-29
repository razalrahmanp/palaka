import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    const paymentType = searchParams.get('payment_type');
    const month = searchParams.get('month'); // YYYY-MM format
    const year = searchParams.get('year');

    let query = supabase
      .from('payroll_records')
      .select(`
        *,
        employee:employees (
          id,
          name,
          employee_id,
          department,
          position
        ),
        salary_structure:salary_structures (
          id,
          basic_salary,
          house_rent_allowance,
          transport_allowance,
          medical_allowance
        ),
        processor:users!payroll_records_processed_by_fkey (
          id,
          name
        )
      `)
      .order('pay_period_start', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (paymentType) {
      query = query.eq('payment_type', paymentType);
    }

    if (month) {
      const [yearPart, monthPart] = month.split('-');
      const startDate = `${yearPart}-${monthPart}-01`;
      const endDate = new Date(parseInt(yearPart), parseInt(monthPart), 0).toISOString().split('T')[0];
      query = query.gte('pay_period_start', startDate).lte('pay_period_end', endDate);
    } else if (year) {
      query = query.gte('pay_period_start', `${year}-01-01`).lte('pay_period_end', `${year}-12-31`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching payroll records:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll records' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employee_id,
      salary_structure_id,
      pay_period_start,
      pay_period_end,
      basic_salary,
      total_allowances,
      total_deductions,
      working_days,
      present_days,
      leave_days = 0,
      overtime_hours = 0,
      overtime_amount = 0,
      bonus = 0,
      payment_type = 'salary',
    } = body;

    if (!employee_id || !pay_period_start || !pay_period_end) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate gross and net salary
    const grossSalary = (basic_salary || 0) + (total_allowances || 0) + (overtime_amount || 0) + (bonus || 0);
    const netSalary = grossSalary - (total_deductions || 0);

    const { data, error } = await supabase
      .from('payroll_records')
      .insert({
        employee_id,
        salary_structure_id,
        pay_period_start,
        pay_period_end,
        basic_salary,
        total_allowances,
        total_deductions,
        gross_salary: grossSalary,
        net_salary: netSalary,
        working_days,
        present_days,
        leave_days,
        overtime_hours,
        overtime_amount,
        bonus,
        payment_type,
        status: 'draft',
      })
      .select(`
        *,
        employee:employees (
          id,
          name,
          employee_id,
          department,
          position
        ),
        salary_structure:salary_structures (
          id,
          basic_salary,
          house_rent_allowance,
          transport_allowance,
          medical_allowance
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Error creating payroll record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payroll record' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      basic_salary,
      total_allowances,
      total_deductions,
      working_days,
      present_days,
      leave_days,
      overtime_hours,
      overtime_amount,
      bonus,
      status,
      processed_by,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payroll record ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (basic_salary !== undefined) updateData.basic_salary = basic_salary;
    if (total_allowances !== undefined) updateData.total_allowances = total_allowances;
    if (total_deductions !== undefined) updateData.total_deductions = total_deductions;
    if (working_days !== undefined) updateData.working_days = working_days;
    if (present_days !== undefined) updateData.present_days = present_days;
    if (leave_days !== undefined) updateData.leave_days = leave_days;
    if (overtime_hours !== undefined) updateData.overtime_hours = overtime_hours;
    if (overtime_amount !== undefined) updateData.overtime_amount = overtime_amount;
    if (bonus !== undefined) updateData.bonus = bonus;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'processed' || status === 'paid') {
        updateData.processed_at = new Date().toISOString();
        if (processed_by) updateData.processed_by = processed_by;
      }
    }

    // Recalculate gross and net salary
    if (basic_salary !== undefined || total_allowances !== undefined || total_deductions !== undefined || overtime_amount !== undefined || bonus !== undefined) {
      const { data: currentRecord } = await supabase
        .from('payroll_records')
        .select('basic_salary, total_allowances, total_deductions, overtime_amount, bonus')
        .eq('id', id)
        .single();

      const finalBasicSalary = basic_salary ?? currentRecord?.basic_salary ?? 0;
      const finalAllowances = total_allowances ?? currentRecord?.total_allowances ?? 0;
      const finalDeductions = total_deductions ?? currentRecord?.total_deductions ?? 0;
      const finalOvertimeAmount = overtime_amount ?? currentRecord?.overtime_amount ?? 0;
      const finalBonus = bonus ?? currentRecord?.bonus ?? 0;

      updateData.gross_salary = finalBasicSalary + finalAllowances + finalOvertimeAmount + finalBonus;
      updateData.net_salary = (updateData.gross_salary as number) - finalDeductions;
    }

    const { data, error } = await supabase
      .from('payroll_records')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:employees (
          id,
          name,
          employee_id,
          department,
          position
        ),
        salary_structure:salary_structures (
          id,
          basic_salary,
          house_rent_allowance,
          transport_allowance,
          medical_allowance
        )
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating payroll record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payroll record' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payroll record ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('payroll_records')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Payroll record deleted successfully' });
  } catch (error) {
    console.error('Error deleting payroll record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete payroll record' },
      { status: 500 }
    );
  }
}
