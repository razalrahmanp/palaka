import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PunchLog {
  id: string;
  employee_id: string;
  punch_time: string;
  punch_type: string;
  verification_method: string;
  device_id: string;
  employee: {
    id: string;
    name: string;
    employee_id: string;
    department: string;
    position: string;
  };
  device: {
    device_name: string;
    ip_address: string;
  };
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee: {
    id: string;
    name: string;
    employee_id: string;
    department: string;
    position: string;
  };
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  total_breaks: number;
  total_hours: number | null;
  status: string;
  notes: string | null;
  punch_logs: PunchLog[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const employeeId = searchParams.get('employee_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log('GET /api/hr/attendance - Params:', { date, employeeId, startDate, endDate });

    // Fetch punch logs instead of attendance_records
    let query = supabaseAdmin
      .from('attendance_punch_logs')
      .select(`
        *,
        employee:employees(
          id,
          name,
          employee_id,
          department,
          position
        ),
        device:essl_devices(
          device_name,
          ip_address
        )
      `);

    // Apply filters
    if (date) {
      // For punch logs, filter by date part of punch_time
      query = query.gte('punch_time', `${date}T00:00:00`)
                   .lte('punch_time', `${date}T23:59:59`);
    }
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (startDate && endDate) {
      query = query.gte('punch_time', `${startDate}T00:00:00`)
                   .lte('punch_time', `${endDate}T23:59:59`);
    }

    query = query.order('punch_time', { ascending: false });

    const { data: punchLogs, error } = await query;

    if (error) {
      console.error('Error fetching punch logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Group punch logs by employee and date
    const attendanceMap = new Map<string, AttendanceRecord>();

    punchLogs?.forEach((log: PunchLog) => {
      const logDate = log.punch_time.split('T')[0];
      const key = `${log.employee_id}_${logDate}`;
      
      if (!attendanceMap.has(key)) {
        attendanceMap.set(key, {
          id: log.id,
          employee_id: log.employee_id,
          employee: log.employee,
          date: logDate,
          check_in_time: null,
          check_out_time: null,
          break_start_time: null,
          break_end_time: null,
          total_breaks: 0,
          total_hours: null,
          status: 'present',
          notes: null,
          punch_logs: []
        });
      }

      const record = attendanceMap.get(key)!;
      record.punch_logs.push(log);
    });

    // Process each record to determine check-in, check-out, and break times
    const attendanceRecords = Array.from(attendanceMap.values()).map((record: AttendanceRecord) => {
      // Sort punch logs by time to get chronological order
      const sortedLogs = record.punch_logs.sort((a, b) => 
        new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
      );

      if (sortedLogs.length > 0) {
        // First punch is always check-in
        record.check_in_time = sortedLogs[0].punch_time;

        // Only show break times if there are 4 or more punches
        // This prevents showing the same checkout time in break columns
        if (sortedLogs.length >= 4) {
          // Second punch is break start
          record.break_start_time = sortedLogs[1].punch_time;
          
          // Third punch is break end
          record.break_end_time = sortedLogs[2].punch_time;
        }

        // Last punch is always check-out (if more than one punch)
        if (sortedLogs.length > 1) {
          record.check_out_time = sortedLogs[sortedLogs.length - 1].punch_time;
        }
      }

      // Calculate total hours if both check-in and check-out exist
      if (record.check_in_time && record.check_out_time) {
        try {
          const checkIn = new Date(record.check_in_time);
          const checkOut = new Date(record.check_out_time);
          const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          record.total_hours = Math.round(hours * 10) / 10; // Round to 1 decimal place
        } catch (e) {
          console.error('Error calculating hours:', e);
          record.total_hours = null;
        }
      }

      // Determine status based on check-in time
      if (record.check_in_time) {
        const checkInDate = new Date(record.check_in_time);
        const checkInHour = checkInDate.getHours();
        const checkInMinute = checkInDate.getMinutes();
        const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
        const nineAMMinutes = 9 * 60 + 15; // 9:15 AM with grace period

        if (checkInTotalMinutes <= nineAMMinutes) {
          record.status = 'present';
        } else {
          record.status = 'late';
        }
      }

      return record;
    });

    console.log(`GET /api/hr/attendance - Found ${attendanceRecords.length} records from punch logs`);
    
    // Debug: Log first record to verify data structure
    if (attendanceRecords.length > 0) {
      console.log('Sample attendance record:', JSON.stringify({
        employee: attendanceRecords[0].employee?.name,
        date: attendanceRecords[0].date,
        check_in_time: attendanceRecords[0].check_in_time,
        check_out_time: attendanceRecords[0].check_out_time,
        total_hours: attendanceRecords[0].total_hours,
        status: attendanceRecords[0].status,
        punch_count: attendanceRecords[0].punch_logs?.length
      }));
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
