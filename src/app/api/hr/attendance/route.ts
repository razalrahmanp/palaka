import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employee_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabaseAdmin
      .from('attendance_records')
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_id,
          department,
          position
        )
      `);

    // Apply filters
    if (date) {
      query = query.eq('date', date);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    query = query.order('date', { ascending: false });

    const { data: attendanceRecords, error } = await query;

    if (error) {
      console.error('Error fetching attendance records:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(attendanceRecords);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employee_id,
      date,
      check_in_time,
      check_out_time,
      status,
      notes
    } = body;

    // Validate required fields
    if (!employee_id || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, date' },
        { status: 400 }
      );
    }

    // Calculate total hours if both check-in and check-out times are provided
    let total_hours = null;
    if (check_in_time && check_out_time) {
      const checkIn = new Date(`${date}T${check_in_time}`);
      const checkOut = new Date(`${date}T${check_out_time}`);
      total_hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60); // Convert to hours
    }

    // Check if attendance record already exists for this employee and date
    const { data: existingRecord } = await supabaseAdmin
      .from('attendance_records')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('date', date)
      .single();

    if (existingRecord) {
      return NextResponse.json(
        { error: 'Attendance record already exists for this date' },
        { status: 409 }
      );
    }

    // Create attendance record
    const { data: attendanceRecord, error: insertError } = await supabaseAdmin
      .from('attendance_records')
      .insert({
        employee_id,
        date,
        check_in_time,
        check_out_time,
        total_hours,
        status: status || 'present',
        notes
      })
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
      console.error('Error creating attendance record:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(attendanceRecord, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
