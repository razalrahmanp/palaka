import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      check_in_time,
      check_out_time,
      status,
      notes
    } = body;

    // Get the current record to calculate total hours
    const { data: currentRecord, error: fetchError } = await supabaseAdmin
      .from('attendance_records')
      .select('date, check_in_time, check_out_time')
      .eq('id', id)
      .single();

    if (fetchError || !currentRecord) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // Calculate total hours if both times are available
    let total_hours = null;
    const finalCheckIn = check_in_time || currentRecord.check_in_time;
    const finalCheckOut = check_out_time || currentRecord.check_out_time;

    if (finalCheckIn && finalCheckOut) {
      const checkIn = new Date(`${currentRecord.date}T${finalCheckIn}`);
      const checkOut = new Date(`${currentRecord.date}T${finalCheckOut}`);
      total_hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    }

    // Update attendance record
    const { data: attendanceRecord, error: updateError } = await supabaseAdmin
      .from('attendance_records')
      .update({
        check_in_time: finalCheckIn,
        check_out_time: finalCheckOut,
        total_hours,
        status,
        notes
      })
      .eq('id', id)
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

    if (updateError) {
      console.error('Error updating attendance record:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(attendanceRecord);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error: deleteError } = await supabaseAdmin
      .from('attendance_records')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting attendance record:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
