import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');
    const leave_type = searchParams.get('leave_type');

    let query = supabaseAdmin
      .from('employee_leave_balances')
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_id,
          department,
          position
        )
      `)
      .order('leave_type');

    // Apply filters
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }

    if (leave_type) {
      query = query.eq('leave_type', leave_type);
    }

    const { data: leave_balances, error } = await query;

    if (error) {
      console.error('Error fetching leave balances:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leave balances' },
        { status: 500 }
      );
    }

    return NextResponse.json(leave_balances);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      leave_type,
      total_days,
      used_days = 0,
      year
    } = body;

    // Validate required fields
    if (!employee_id || !leave_type || total_days === undefined || !year) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate numeric values
    if (total_days < 0 || used_days < 0 || used_days > total_days) {
      return NextResponse.json(
        { error: 'Invalid leave balance values' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if balance already exists for this employee, leave type, and year
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('employee_leave_balances')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('leave_type', leave_type)
      .eq('year', year)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing balance:', existingError);
      return NextResponse.json(
        { error: 'Failed to validate leave balance' },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Leave balance already exists for this employee, leave type, and year' },
        { status: 409 }
      );
    }

    // Calculate remaining days
    const remaining_days = total_days - used_days;

    // Create leave balance
    const { data: leave_balance, error: insertError } = await supabaseAdmin
      .from('employee_leave_balances')
      .insert([{
        employee_id,
        leave_type,
        total_days: Number(total_days),
        used_days: Number(used_days),
        remaining_days,
        year: Number(year),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_id,
          department,
          position
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating leave balance:', insertError);
      return NextResponse.json(
        { error: 'Failed to create leave balance' },
        { status: 500 }
      );
    }

    return NextResponse.json(leave_balance, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
