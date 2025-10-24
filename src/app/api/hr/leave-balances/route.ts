import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: Fetch leave balances
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    let query = supabase
      .from('employee_leave_balances')
      .select(`
        *,
        employee:employees(id, name, employee_id, department),
        leave_type:leave_types(id, name, description, max_days_per_year)
      `)
      .eq('year', parseInt(year));

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching leave balances:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leave balances' },
      { status: 500 }
    );
  }
}

// POST: Initialize leave balances for an employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      year,
    } = body;

    if (!employee_id || !year) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and year are required' },
        { status: 400 }
      );
    }

    // Get all active leave types
    const { data: leaveTypes, error: leaveTypesError } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true);

    if (leaveTypesError) throw leaveTypesError;

    // Create balance records for each leave type
    const balances = leaveTypes.map(leaveType => ({
      employee_id,
      leave_type_id: leaveType.id,
      year: parseInt(year),
      allocated_days: leaveType.max_days_per_year || 0,
      used_days: 0,
      remaining_days: leaveType.max_days_per_year || 0,
      carry_forward_days: 0,
    }));

    const { data, error } = await supabase
      .from('employee_leave_balances')
      .insert(balances)
      .select(`
        *,
        employee:employees(id, name, employee_id),
        leave_type:leave_types(id, name, description)
      `);

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error initializing leave balances:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize leave balances' },
      { status: 500 }
    );
  }
}
