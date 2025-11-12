import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // MTD date range
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    // Start of week for attendance calculation (Monday)
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const weekStart = startOfWeek.toISOString().split('T')[0];

    // Fetch all required data in parallel
    const [
      employeesResult,
      payrollResult,
      attendanceResult,
      monthlyPayrollResult,
    ] = await Promise.all([
      // Active employees
      supabase
        .from('employees')
        .select('id, department, salary, created_at, performance_rating')
        .eq('status', 'active'),

      // MTD payroll
      supabase
        .from('payroll')
        .select('amount, overtime_amount, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate),

      // Weekly attendance
      supabase
        .from('attendance_records')
        .select('employee_id, status, date')
        .gte('date', weekStart)
        .lte('date', endDate),

      // Last 7 months payroll for trend
      supabase
        .from('payroll')
        .select('amount, overtime_amount, created_at')
        .gte('created_at', new Date(year, month - 6, 1).toISOString().split('T')[0])
        .lte('created_at', endDate),
    ]);

    if (employeesResult.error) throw employeesResult.error;
    if (payrollResult.error) throw payrollResult.error;
    if (attendanceResult.error) throw attendanceResult.error;
    if (monthlyPayrollResult.error) throw monthlyPayrollResult.error;

    const employees = employeesResult.data || [];
    const payrolls = payrollResult.data || [];
    const attendance = attendanceResult.data || [];
    const monthlyPayrolls = monthlyPayrollResult.data || [];

    // Calculate KPIs
    const employeeCount = employees.length;

    const totalPayroll = payrolls.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalOvertime = payrolls.reduce((sum, p) => sum + (p.overtime_amount || 0), 0);

    // Attendance rate (% present out of total expected)
    const totalExpectedAttendance = employeeCount * 7; // 7 days
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = totalExpectedAttendance > 0 
      ? ((presentCount / totalExpectedAttendance) * 100).toFixed(1)
      : '0.0';

    // Productivity score (average performance rating)
    const validRatings = employees.filter(e => e.performance_rating && e.performance_rating > 0);
    const avgPerformance = validRatings.length > 0
      ? validRatings.reduce((sum, e) => sum + (e.performance_rating || 0), 0) / validRatings.length
      : 0;
    const productivityScore = avgPerformance.toFixed(1);

    // Employee turnover (calculate based on employees who left in last 12 months)
    // For now using a placeholder calculation
    const employeeTurnover = '8.5';

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
      payrollByMonth[monthKey].base += p.amount || 0;
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

    // Performance distribution
    const performanceRanges = [
      { name: 'Outstanding (90+)', min: 90, max: 100, avgSalary: 0, employees: 0, color: '#22c55e' },
      { name: 'Excellent (80-90)', min: 80, max: 90, avgSalary: 0, employees: 0, color: '#3b82f6' },
      { name: 'Good (70-80)', min: 70, max: 80, avgSalary: 0, employees: 0, color: '#f59e0b' },
      { name: 'Satisfactory (60-70)', min: 60, max: 70, avgSalary: 0, employees: 0, color: '#ef4444' },
      { name: 'Needs Improvement (<60)', min: 0, max: 60, avgSalary: 0, employees: 0, color: '#991b1b' },
    ];

    employees.forEach(emp => {
      const rating = emp.performance_rating || 0;
      const range = performanceRanges.find(r => rating >= r.min && rating < r.max);
      if (range) {
        range.employees++;
        range.avgSalary += emp.salary || 0;
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
