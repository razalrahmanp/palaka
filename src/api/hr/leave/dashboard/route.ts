import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');

    // If specific employee requested, return their leave summary
    if (employee_id) {
      return getEmployeeLeaveBalance(employee_id);
    }

    // Otherwise return overall leave statistics
    return getLeaveStatistics();
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getEmployeeLeaveBalance(employee_id: string) {
  try {
    // Get employee info
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, name, employee_id, hire_date')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Calculate tenure in years
    const hireDate = new Date(employee.hire_date);
    const now = new Date();
    const tenureYears = Math.floor((now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365));

    // Standard leave entitlements (can be configured)
    const annualLeaveEntitlement = Math.min(20 + tenureYears, 30); // Max 30 days
    const sickLeaveEntitlement = 10;
    const personalLeaveEntitlement = 5;

    // Get current year's leave requests
    const currentYear = now.getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const { data: leaveRequests, error: requestsError } = await supabaseAdmin
      .from('leave_requests')
      .select('leave_type, days_requested, status, start_date, end_date')
      .eq('employee_id', employee_id)
      .eq('status', 'approved')
      .gte('start_date', yearStart)
      .lte('end_date', yearEnd);

    if (requestsError) {
      console.error('Error fetching leave requests:', requestsError);
      return NextResponse.json(
        { error: 'Failed to fetch leave data' },
        { status: 500 }
      );
    }

    // Calculate used leave by type
    const leaveUsed = {
      annual: 0,
      sick: 0,
      personal: 0,
      maternity: 0,
      paternity: 0,
      emergency: 0,
      unpaid: 0
    };

    leaveRequests?.forEach(request => {
      if (leaveUsed.hasOwnProperty(request.leave_type)) {
        leaveUsed[request.leave_type as keyof typeof leaveUsed] += request.days_requested;
      }
    });

    // Calculate balances
    const leaveBalances = {
      annual: {
        entitlement: annualLeaveEntitlement,
        used: leaveUsed.annual,
        remaining: annualLeaveEntitlement - leaveUsed.annual
      },
      sick: {
        entitlement: sickLeaveEntitlement,
        used: leaveUsed.sick,
        remaining: sickLeaveEntitlement - leaveUsed.sick
      },
      personal: {
        entitlement: personalLeaveEntitlement,
        used: leaveUsed.personal,
        remaining: personalLeaveEntitlement - leaveUsed.personal
      }
    };

    // Get pending requests
    const { data: pendingRequests, error: pendingError } = await supabaseAdmin
      .from('leave_requests')
      .select('id, leave_type, start_date, end_date, days_requested, reason')
      .eq('employee_id', employee_id)
      .eq('status', 'pending')
      .order('start_date', { ascending: true });

    if (pendingError) {
      console.error('Error fetching pending requests:', pendingError);
    }

    // Get recent leave history
    const { data: recentLeave, error: historyError } = await supabaseAdmin
      .from('leave_requests')
      .select('id, leave_type, start_date, end_date, days_requested, status')
      .eq('employee_id', employee_id)
      .in('status', ['approved', 'completed'])
      .order('start_date', { ascending: false })
      .limit(10);

    if (historyError) {
      console.error('Error fetching leave history:', historyError);
    }

    return NextResponse.json({
      employee,
      tenure_years: tenureYears,
      leave_balances: leaveBalances,
      total_used: Object.values(leaveUsed).reduce((sum, used) => sum + used, 0),
      pending_requests: pendingRequests || [],
      recent_leave: recentLeave || []
    });

  } catch (error) {
    console.error('Error getting employee leave balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getLeaveStatistics() {
  try {
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // Get all leave requests for current year
    const { data: allRequests, error: requestsError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        leave_type,
        days_requested,
        status,
        start_date,
        end_date,
        employee:employees(name, department)
      `)
      .gte('start_date', yearStart)
      .lte('end_date', yearEnd);

    if (requestsError) {
      console.error('Error fetching leave requests:', requestsError);
      return NextResponse.json(
        { error: 'Failed to fetch leave statistics' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = {
      total_requests: allRequests?.length || 0,
      pending: allRequests?.filter(r => r.status === 'pending').length || 0,
      approved: allRequests?.filter(r => r.status === 'approved').length || 0,
      rejected: allRequests?.filter(r => r.status === 'rejected').length || 0,
      cancelled: allRequests?.filter(r => r.status === 'cancelled').length || 0,
      total_days_requested: allRequests?.reduce((sum, r) => sum + r.days_requested, 0) || 0,
      approved_days: allRequests?.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.days_requested, 0) || 0
    };

    // Leave by type
    const leaveByType = allRequests?.reduce((acc: Record<string, number>, request) => {
      if (request.status === 'approved') {
        acc[request.leave_type] = (acc[request.leave_type] || 0) + request.days_requested;
      }
      return acc;
    }, {}) || {};

    // Leave by department
    const leaveByDepartment = allRequests?.reduce((acc: Record<string, number>, request) => {
      if (request.status === 'approved' && request.employee && Array.isArray(request.employee) && request.employee[0]?.department) {
        const dept = request.employee[0].department;
        acc[dept] = (acc[dept] || 0) + request.days_requested;
      }
      return acc;
    }, {}) || {};

    // Recent pending requests that need attention
    const { data: pendingRequests, error: pendingError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        days_requested,
        reason,
        created_at,
        employee:employees(
          name,
          employee_id,
          department
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (pendingError) {
      console.error('Error fetching pending requests:', pendingError);
    }

    // Upcoming approved leave (next 30 days)
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);

    const { data: upcomingLeave, error: upcomingError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        leave_type,
        start_date,
        end_date,
        days_requested,
        employee:employees(
          name,
          employee_id,
          department
        )
      `)
      .eq('status', 'approved')
      .gte('start_date', new Date().toISOString().split('T')[0])
      .lte('start_date', next30Days.toISOString().split('T')[0])
      .order('start_date', { ascending: true });

    if (upcomingError) {
      console.error('Error fetching upcoming leave:', upcomingError);
    }

    return NextResponse.json({
      overview: stats,
      leave_by_type: leaveByType,
      leave_by_department: leaveByDepartment,
      pending_requests: pendingRequests || [],
      upcoming_leave: upcomingLeave || [],
      year: currentYear
    });

  } catch (error) {
    console.error('Error getting leave statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
