import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employee_id');
    const date = searchParams.get('date');

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'employee_id and date are required' },
        { status: 400 }
      );
    }

    // Fetch punch logs for the specific employee and date
    const { data: punchLogs, error } = await supabase
      .from('attendance_punch_logs')
      .select(`
        id,
        punch_time,
        punch_type,
        verification_method,
        verification_quality,
        processed,
        device:essl_devices(
          device_name,
          ip_address
        )
      `)
      .eq('employee_id', employeeId)
      .gte('punch_time', `${date}T00:00:00`)
      .lte('punch_time', `${date}T23:59:59`)
      .order('punch_time', { ascending: true });

    if (error) {
      console.error('Error fetching punch logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch punch logs' },
        { status: 500 }
      );
    }

    return NextResponse.json(punchLogs || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
