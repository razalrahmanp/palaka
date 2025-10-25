import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { date } = await request.json();

    if (date) {
      // Process specific date
      return await processSingleDate(date);
    } else {
      // Process all unprocessed dates
      return await processAllDates();
    }
  } catch (error) {
    console.error('Error processing attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processSingleDate(targetDate: string) {
  try {
    console.log(`Processing attendance for date: ${targetDate}`);

    // Get all punch logs for the target date that haven't been processed
    const { data: punchLogs, error: punchError } = await supabaseAdmin
      .from('attendance_punch_logs')
      .select(`
        *,
        employee:employees(id, name, employee_id)
      `)
      .gte('punch_time', `${targetDate}T00:00:00`)
      .lte('punch_time', `${targetDate}T23:59:59`)
      .eq('processed', false)
      .order('punch_time', { ascending: true });

    if (punchError) throw punchError;

    if (!punchLogs || punchLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unprocessed punch logs found for this date',
        processed: 0
      });
    }

    // Group punch logs by employee
    const employeePunches = punchLogs.reduce((acc, log) => {
      if (!acc[log.employee_id]) {
        acc[log.employee_id] = [];
      }
      acc[log.employee_id].push(log);
      return acc;
    }, {} as Record<string, typeof punchLogs>);

    let processedCount = 0;
    const punchIdsToMark: string[] = [];

    // Process each employee's punches
    for (const [employeeId, punches] of Object.entries(employeePunches)) {
      // Type assertion for the punches array
      const typedPunches = punches as typeof punchLogs;
      
      // Sort punches by time
      const sortedPunches = typedPunches.sort((a, b) => 
        new Date(a.punch_time).getTime() - new Date(b.punch_time).getTime()
      );
      
      // Find first IN and last OUT punch
      const inPunches = sortedPunches.filter(p => p.punch_type === 'IN');
      const outPunches = sortedPunches.filter(p => p.punch_type === 'OUT');

      if (inPunches.length === 0) continue; // No check-in, skip

      let checkIn, checkOut;
      
      // Handle case where device records all punches as IN
      if (inPunches.length > 1 && outPunches.length === 0) {
        // Use first and last punch as IN and OUT
        checkIn = sortedPunches[0]; // First punch = IN
        checkOut = sortedPunches[sortedPunches.length - 1]; // Last punch = OUT
        console.log(`Employee ${employeeId}: Auto-alternating punches (${sortedPunches.length} total)`);
      } else {
        // Normal case: proper IN/OUT punches
        checkIn = inPunches[0]; // First IN
        checkOut = outPunches.length > 0 ? outPunches[outPunches.length - 1] : null; // Last OUT
      }

      const checkInTime = new Date(checkIn.punch_time);
      const checkOutTime = checkOut ? new Date(checkOut.punch_time) : null;

      // Calculate total hours
      let totalHours = 0;
      if (checkOutTime) {
        const diff = checkOutTime.getTime() - checkInTime.getTime();
        totalHours = Math.round((diff / (1000 * 60 * 60)) * 100) / 100; // Hours with 2 decimals
      }

      // Determine status
      let status = 'present';
      const checkInHour = checkInTime.getHours();
      const checkInMinute = checkInTime.getMinutes();
      
      // Late if check-in after 9:30 AM
      if (checkInHour > 9 || (checkInHour === 9 && checkInMinute > 30)) {
        status = 'late';
      }

      // Half day if less than 4 hours
      if (totalHours > 0 && totalHours < 4) {
        status = 'half_day';
      }

      // Upsert attendance record (insert or update if exists)
      const { error: upsertError } = await supabaseAdmin
        .from('attendance_records')
        .upsert({
          employee_id: employeeId,
          date: targetDate,
          check_in_time: checkIn.punch_time,
          check_out_time: checkOut?.punch_time,
          total_hours: totalHours,
          status,
          device_id: checkIn.device_id,
          punch_type: 'auto',
          verification_method: checkIn.verification_method,
        }, {
          onConflict: 'employee_id,date',
          ignoreDuplicates: false // Update if exists
        });

      if (upsertError) {
        console.error(`Error upserting attendance for employee ${employeeId}:`, upsertError);
        continue;
      }

      // Mark punches as processed
      punchIdsToMark.push(...typedPunches.map(p => p.id));
      processedCount++;
    }

    // Mark all processed punch logs
    if (punchIdsToMark.length > 0) {
      await supabaseAdmin
        .from('attendance_punch_logs')
        .update({ processed: true })
        .in('id', punchIdsToMark);
    }

    return NextResponse.json({
      success: true,
      message: `Processed attendance for ${processedCount} employees`,
      processed: processedCount,
      date: targetDate
    });
  } catch (error) {
    console.error('Error processing single date:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processAllDates() {
  try {
    console.log('Processing attendance for all unprocessed dates');

    // Get all unprocessed punch logs and group by date
    const { data: punchLogs, error: punchError } = await supabaseAdmin
      .from('attendance_punch_logs')
      .select('punch_time')
      .eq('processed', false);

    if (punchError) throw punchError;

    if (!punchLogs || punchLogs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No unprocessed punch logs found',
        processed: 0,
        dates: []
      });
    }

    // Get unique dates from punch logs
    const uniqueDates = [...new Set(
      punchLogs.map(log => new Date(log.punch_time).toISOString().split('T')[0])
    )].sort();

    console.log(`Found ${uniqueDates.length} dates with unprocessed punch logs:`, uniqueDates);

    // Process each date
    let totalProcessed = 0;
    const processedDates = [];

    for (const date of uniqueDates) {
      const result = await processSingleDate(date);
      const resultData = await result.json();
      
      if (resultData.success) {
        totalProcessed += resultData.processed || 0;
        processedDates.push(date);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed attendance for ${totalProcessed} employee records across ${processedDates.length} dates`,
      processed: totalProcessed,
      dates: processedDates
    });
  } catch (error) {
    console.error('Error processing all dates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
