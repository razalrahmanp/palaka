import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // Get date range from query params or default to current month
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // If no dates provided, default to current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const defaultStartDate = new Date(year, month, 1).toISOString().split('T')[0];
    const defaultEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    // Start of week for attendance calculation (Monday)
    const dateRangeStart = new Date(finalStartDate);
    const dayOfWeek = dateRangeStart.getDay();
    const startOfWeek = new Date(dateRangeStart);
    startOfWeek.setDate(dateRangeStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekStart = startOfWeek.toISOString().split('T')[0];

    // Fetch all required data in parallel
    const [
      employeesResult,
      payrollResult,
      attendanceResult,
      monthlyPayrollResult,
      terminatedEmployeesResult,
    ] = await Promise.all([
      // Active employees
      supabase
        .from('employees')
        .select('id, department, salary, created_at')
        .eq('employment_status', 'active'),

      // Payroll for selected date range
      supabase
        .from('payroll_records')
        .select('net_salary, overtime_amount, created_at')
        .gte('created_at', finalStartDate)
        .lte('created_at', finalEndDate),

      // Attendance for selected week
      supabase
        .from('attendance_records')
        .select('employee_id, status, date')
        .gte('date', weekStart)
        .lte('date', finalEndDate),

      // Last 7 months payroll for trend (relative to end date)
      supabase
        .from('payroll_records')
        .select('net_salary, overtime_amount, created_at')
        .gte('created_at', new Date(new Date(finalEndDate).getFullYear(), new Date(finalEndDate).getMonth() - 6, 1).toISOString().split('T')[0])
        .lte('created_at', finalEndDate),

      // Terminated employees in last 12 months for turnover calculation
      supabase
        .from('employees')
        .select('id')
        .eq('employment_status', 'terminated')
        .gte('updated_at', new Date(new Date(finalEndDate).getFullYear() - 1, new Date(finalEndDate).getMonth(), 1).toISOString().split('T')[0]),
    ]);

    if (employeesResult.error) throw employeesResult.error;
    if (payrollResult.error) throw payrollResult.error;
    if (attendanceResult.error) throw attendanceResult.error;
    if (monthlyPayrollResult.error) throw monthlyPayrollResult.error;
    if (terminatedEmployeesResult.error) throw terminatedEmployeesResult.error;

    const employees = employeesResult.data || [];
    const payrolls = payrollResult.data || [];
    const attendance = attendanceResult.data || [];
    const monthlyPayrolls = monthlyPayrollResult.data || [];
    const terminatedEmployees = terminatedEmployeesResult.data || [];

    // Calculate KPIs
    const employeeCount = employees.length;

    const totalPayroll = payrolls.reduce((sum, p) => sum + (p.net_salary || 0), 0);
    const totalOvertime = payrolls.reduce((sum, p) => sum + (p.overtime_amount || 0), 0);

    // Attendance rate (% present out of total expected)
    const totalExpectedAttendance = employeeCount * 7; // 7 days
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalExpectedAttendance > 0 
      ? ((presentCount / totalExpectedAttendance) * 100).toFixed(1)
      : '0.0';

    // Productivity score (based on attendance rate as proxy)
    // Since performance_rating doesn't exist, we'll use attendance as a productivity indicator
    const productivityScore = attendanceRate;

    // Employee turnover (terminated employees in last 12 months / average total employees)
    const avgEmployeeCount = employeeCount + terminatedEmployees.length;
    const employeeTurnover = avgEmployeeCount > 0
      ? ((terminatedEmployees.length / avgEmployeeCount) * 100).toFixed(1)
      : '0.0';

    // Department headcount
    const departmentGroups: Record<string, number> = {};
    employees.forEach(emp => {
      const dept = emp.department || 'Unassigned';
      departmentGroups[dept] = (departmentGroups[dept] || 0) + 1;
    });

    const departmentHeadcount = Object.entries(departmentGroups).map(([dept, count]) => ({
      department: dept,
      employees: count,
      budget: Math.ceil(count * 1.15), // 15% buffer for budget
    }));

    // Payroll trend (last 7 months)
    const payrollByMonth: Record<string, { base: number; overtime: number }> = {};
    monthlyPayrolls.forEach(p => {
      const monthKey = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short' });
      if (!payrollByMonth[monthKey]) {
        payrollByMonth[monthKey] = { base: 0, overtime: 0 };
      }
      payrollByMonth[monthKey].base += p.net_salary || 0;
      payrollByMonth[monthKey].overtime += p.overtime_amount || 0;
    });

    const payrollTrend = Object.entries(payrollByMonth).map(([month, data]) => ({
      month,
      payroll: data.base,
      overtime: data.overtime,
    }));

    // Weekly attendance heatmap
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const attendanceByDay: Record<string, { present: number; absent: number; leave: number }> = {};
    
    daysOfWeek.forEach(day => {
      attendanceByDay[day] = { present: 0, absent: 0, leave: 0 };
    });

    attendance.forEach(a => {
      const day = daysOfWeek[new Date(a.date).getDay()];
      if (a.status === 'present') attendanceByDay[day].present++;
      else if (a.status === 'absent') attendanceByDay[day].absent++;
      else if (a.status === 'leave') attendanceByDay[day].leave++;
    });

    const attendanceHeatmap = daysOfWeek.map(day => ({
      day,
      ...attendanceByDay[day],
    }));

    // Performance distribution - based on salary ranges since performance_rating doesn't exist
    const performanceRanges = [
      { name: 'Senior (50K+)', min: 50000, max: Infinity, avgSalary: 0, employees: 0, color: '#22c55e' },
      { name: 'Mid-Level (30K-50K)', min: 30000, max: 50000, avgSalary: 0, employees: 0, color: '#3b82f6' },
      { name: 'Junior (20K-30K)', min: 20000, max: 30000, avgSalary: 0, employees: 0, color: '#f59e0b' },
      { name: 'Entry (10K-20K)', min: 10000, max: 20000, avgSalary: 0, employees: 0, color: '#ef4444' },
      { name: 'Trainee (<10K)', min: 0, max: 10000, avgSalary: 0, employees: 0, color: '#991b1b' },
    ];

    employees.forEach(emp => {
      const salary = emp.salary || 0;
      const range = performanceRanges.find(r => salary >= r.min && salary < r.max);
      if (range) {
        range.employees++;
        range.avgSalary += salary;
      }
    });

    const performanceDistribution = performanceRanges.map(range => ({
      name: range.name,
      employees: range.employees,
      avgSalary: range.employees > 0 ? Math.round(range.avgSalary / range.employees) : 0,
      color: range.color,
    }));

    return NextResponse.json({
      success: true,
      data: {
        employeeCount,
        totalPayroll,
        attendanceRate,
        productivityScore,
        employeeTurnover,
        departmentHeadcount,
        payrollTrend,
        attendanceHeatmap,
        performanceDistribution,
        summary: {
          totalOvertime,
          avgSalary: employeeCount > 0 ? Math.round(employees.reduce((sum, e) => sum + (e.salary || 0), 0) / employeeCount) : 0,
          departmentCount: Object.keys(departmentGroups).length,
          presentToday: attendance.filter(a => a.date === endDate && a.status === 'present').length,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching HR dashboard data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch HR data',
      },
      { status: 500 }
    );
  }
}
