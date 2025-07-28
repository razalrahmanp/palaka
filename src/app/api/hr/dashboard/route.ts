import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // Get employees data
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('id, employment_status, hire_date, created_at');

    if (employeesError) {
      console.error('Error fetching employees:', employeesError);
      return NextResponse.json({ error: employeesError.message }, { status: 500 });
    }

    // Get attendance data for today
    const today = new Date().toISOString().split('T')[0];
    const { data: attendance } = await supabaseAdmin
      .from('attendance_records')
      .select('id, employee_id')
      .eq('date', today)
      .eq('status', 'present');

    // Get pending leave requests
    const { data: pendingLeaves } = await supabaseAdmin
      .from('leave_requests')
      .select('id')
      .eq('status', 'pending');

    // Get active performance reviews
    const { data: activeReviews } = await supabaseAdmin
      .from('performance_reviews')
      .select('id')
      .in('status', ['draft', 'submitted']);

    // Calculate statistics
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.employment_status === 'active').length;
    const todayAttendance = attendance?.length || 0;
    const pendingLeavesCount = pendingLeaves?.length || 0;
    const activeReviewsCount = activeReviews?.length || 0;

    // Calculate new hires in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newHires = employees.filter(e => {
      const hireDate = new Date(e.hire_date);
      return hireDate >= thirtyDaysAgo;
    }).length;

    return NextResponse.json({
      totalEmployees,
      activeEmployees,
      todayAttendance,
      pendingLeaves: pendingLeavesCount,
      activeReviews: activeReviewsCount,
      newHires
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
