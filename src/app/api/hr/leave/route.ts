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
    const status = searchParams.get('status');
    const leave_type = searchParams.get('leave_type');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_id,
          department,
          position
        ),
        approved_by_user:users!leave_requests_approved_by_fkey(
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (leave_type) {
      query = query.eq('leave_type', leave_type);
    }

    if (start_date) {
      query = query.gte('start_date', start_date);
    }

    if (end_date) {
      query = query.lte('end_date', end_date);
    }

    const { data: leave_requests, error } = await query;

    if (error) {
      console.error('Error fetching leave requests:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leave requests' },
        { status: 500 }
      );
    }

    return NextResponse.json(leave_requests);
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
      start_date,
      end_date,
      days_requested,
      reason,
      emergency_contact,
      emergency_phone
    } = body;

    // Validate required fields
    if (!employee_id || !leave_type || !start_date || !end_date || !days_requested || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Start date cannot be after end date' },
        { status: 400 }
      );
    }

    if (startDate < new Date()) {
      return NextResponse.json(
        { error: 'Cannot request leave for past dates' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, name')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check for overlapping leave requests
    const { data: overlapping, error: overlapError } = await supabaseAdmin
      .from('leave_requests')
      .select('id')
      .eq('employee_id', employee_id)
      .in('status', ['pending', 'approved'])
      .or(`start_date.lte.${end_date},end_date.gte.${start_date}`);

    if (overlapError) {
      console.error('Error checking overlapping requests:', overlapError);
      return NextResponse.json(
        { error: 'Failed to validate leave request' },
        { status: 500 }
      );
    }

    if (overlapping && overlapping.length > 0) {
      return NextResponse.json(
        { error: 'Overlapping leave request already exists' },
        { status: 409 }
      );
    }

    // Create leave request
    const { data: leave_request, error: insertError } = await supabaseAdmin
      .from('leave_requests')
      .insert([{
        employee_id,
        leave_type,
        start_date,
        end_date,
        days_requested: Number(days_requested),
        reason,
        emergency_contact,
        emergency_phone,
        status: 'pending',
        created_at: new Date().toISOString()
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
      console.error('Error creating leave request:', insertError);
      return NextResponse.json(
        { error: 'Failed to create leave request' },
        { status: 500 }
      );
    }

    return NextResponse.json(leave_request, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
