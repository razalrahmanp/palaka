'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Wallet, Users, Calendar, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  position: string;
  salary?: number;
  employment_status?: string;
}

interface DailyAttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time?: string;
  check_out_time?: string;
  status: 'present' | 'absent' | 'half_day' | 'late' | 'on_leave';
  total_hours?: number;
  employee: {
    id: string;
    name: string;
    employee_id: string;
    department: string;
    position: string;
  };
}

interface MonthlySalaryPayment {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  department: string;
  position: string;
  monthly_salary: number;
  working_days: number;
  present_days: number;
  absent_days: number;
  attendance_percentage: number;
  payable_amount: number;
}

interface SalaryStructure {
  id: string;
  employee_id: string;
  basic_salary: number;
  house_rent_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  other_allowances: Record<string, number>;
  provident_fund_deduction: number;
  tax_deduction: number;
  other_deductions: Record<string, number>;
  effective_from: string;
  effective_to: string;
  is_active: boolean;
  created_at: string;
  employee: Employee;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  salary_structure_id: string;
  pay_period_start: string;
  pay_period_end: string;
  basic_salary: number;
  total_allowances: number;
  total_deductions: number;
  gross_salary: number;
  net_salary: number;
  working_days: number;
  present_days: number;
  leave_days: number;
  overtime_hours: number;
  overtime_amount: number;
  bonus: number;
  status: 'draft' | 'processed' | 'paid';
  payment_type: string;
  processed_at: string;
  created_at: string;
  employee: Employee;
  salary_structure: SalaryStructure;
}

export default function PayrollManagementPage() {
  const router = useRouter();
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [monthlySalaries, setMonthlySalaries] = useState<MonthlySalaryPayment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (employeeId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const navigateToEmployeeAttendance = (employeeId: string) => {
    // Navigate to employee-specific attendance page
    // Note: (erp) is a route group and doesn't appear in the URL
    const url = `/hr/attendance/${employeeId}?month=${filterMonth}`;
    console.log('Navigating to:', url);
    router.push(url);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchSalaryStructures(),
        fetchPayrollRecords(),
        fetchMonthlySalaries(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const fetchSalaryStructures = async () => {
    try {
      const response = await fetch('/api/hr/salary-structures?is_active=true');
      if (!response.ok) {
        console.error('❌ Salary structures API error:', response.status);
        throw new Error('Failed to fetch salary structures');
      }
      const result = await response.json();
      console.log('✅ Salary structures raw response:', result);
      
      // Handle both result.data and direct array response
      const data = Array.isArray(result) ? result : (result.data || []);
      console.log('💼 Salary structures count:', data.length);
      console.log('💰 Salary structures data:', data);
      
      setSalaryStructures(data);
      
      if (data.length === 0) {
        console.warn('⚠️ No active salary structures found');
        toast.info('No active salary structures found. Create one first.');
      }
    } catch (error) {
      console.error('💥 Error fetching salary structures:', error);
      toast.error('Failed to load salary structures');
      setSalaryStructures([]);
    }
  };

  const fetchPayrollRecords = async () => {
    try {
      const url = `/api/hr/payroll-records?month=${filterMonth}`;
      console.log('🔍 Fetching payroll records from:', url);
      console.log('📅 Filter month:', filterMonth);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('❌ Payroll records API error:', response.status);
        throw new Error('Failed to fetch payroll records');
      }
      
      const result = await response.json();
      console.log('✅ Payroll records raw response:', result);
      
      // Handle both result.data and direct array response
      const data = Array.isArray(result) ? result : (result.data || []);
      console.log('📊 Payroll records count:', data.length);
      console.log('💰 Payroll records data:', data);
      
      setPayrollRecords(data);
      
      if (data.length === 0) {
        console.warn('⚠️ No payroll records found for month:', filterMonth);
        toast.info(`No payroll records found for ${filterMonth}`);
      }
    } catch (error) {
      console.error('💥 Error fetching payroll records:', error);
      toast.error('Failed to load payroll records');
      setPayrollRecords([]);
    }
  };

  const fetchMonthlySalaries = async () => {
    try {
      const url = `/api/hr/monthly-salaries?month=${filterMonth}`;
      console.log('🔍 Fetching monthly salaries from:', url);
      console.log('📅 Filter month:', filterMonth);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('❌ Monthly salaries API error:', response.status);
        // If API doesn't exist yet, calculate from employees and attendance
        await calculateMonthlySalaries();
        return;
      }
      
      const result = await response.json();
      console.log('✅ Monthly salaries raw response:', result);
      
      const data = Array.isArray(result) ? result : (result.data || []);
      console.log('📊 Monthly salaries count:', data.length);
      
      setMonthlySalaries(data);
      
      if (data.length === 0) {
        console.warn('⚠️ No monthly salary data found for month:', filterMonth);
        // Try to calculate from employees
        await calculateMonthlySalaries();
      }
    } catch (error) {
      console.error('💥 Error fetching monthly salaries:', error);
      // Try to calculate from employees and attendance
      await calculateMonthlySalaries();
    }
  };

  const calculateMonthlySalaries = async () => {
    try {
      // Fetch employees with salary field
      const employeesResponse = await fetch('/api/hr/employees?employment_status=active');
      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees');
      }
      const employees: Employee[] = await employeesResponse.json();
      
      // Calculate date range for the selected month
      const [year, month] = filterMonth.split('-');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
      
      console.log(`📅 Fetching attendance for date range: ${startDate} to ${endDate}`);
      
      // Fetch attendance records for the selected month (processed punch logs)
      const attendanceResponse = await fetch(
        `/api/hr/attendance?start_date=${startDate}&end_date=${endDate}`
      );
      
      let attendanceRecords: DailyAttendanceRecord[] = [];
      if (attendanceResponse.ok) {
        attendanceRecords = await attendanceResponse.json();
        console.log(`✅ Fetched ${attendanceRecords.length} attendance records for ${filterMonth}`);
      } else {
        console.warn('⚠️ Failed to fetch attendance records, using defaults');
      }
      
      // Group attendance by employee_id
      const attendanceByEmployee = new Map<string, DailyAttendanceRecord[]>();
      attendanceRecords.forEach(record => {
        if (!attendanceByEmployee.has(record.employee_id)) {
          attendanceByEmployee.set(record.employee_id, []);
        }
        attendanceByEmployee.get(record.employee_id)!.push(record);
      });
      
      // Calculate total working days in the month
      const totalDaysInMonth = lastDay;
      
      // Calculate monthly salaries
      const calculated: MonthlySalaryPayment[] = employees
        .filter(emp => emp.salary && emp.salary > 0)
        .map(emp => {
          const employeeAttendance = attendanceByEmployee.get(emp.id) || [];
          
          // Count present days (any day with attendance record that's not absent)
          const presentDays = employeeAttendance.filter(
            record => record.status !== 'absent'
          ).length;
          
          // Count absent days (days marked as absent)
          const absentDays = employeeAttendance.filter(
            record => record.status === 'absent'
          ).length;
          
          // Working days = total days in month (or you can set a fixed value like 26)
          const workingDays = totalDaysInMonth;
          
          const monthlySalary = emp.salary || 0;
          
          // Calculate payable amount based on present days
          const payableAmount = (monthlySalary / workingDays) * presentDays;
          const attendancePercentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;
          
          console.log(`👤 ${emp.name}: Working=${workingDays}, Present=${presentDays}, Absent=${absentDays}, Payable=₹${payableAmount.toFixed(2)}`);
          
          return {
            employee_id: emp.id,
            employee_name: emp.name,
            employee_code: emp.employee_id,
            department: emp.department,
            position: emp.position,
            monthly_salary: monthlySalary,
            working_days: workingDays,
            present_days: presentDays,
            absent_days: absentDays,
            attendance_percentage: Math.round(attendancePercentage * 100) / 100,
            payable_amount: Math.round(payableAmount * 100) / 100,
          };
        });
      
      console.log('💰 Calculated monthly salaries for', calculated.length, 'employees');
      setMonthlySalaries(calculated);
      
      if (calculated.length === 0) {
        toast.info('No employees with salary information found');
      }
    } catch (error) {
      console.error('💥 Error calculating monthly salaries:', error);
      toast.error('Failed to calculate monthly salaries');
      setMonthlySalaries([]);
    }
  };

  const fetchAllPayrollRecords = async () => {
    try {
      const url = '/api/hr/payroll-records'; // No month filter
      console.log('🔍 Fetching ALL payroll records from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error('❌ All payroll records API error:', response.status);
        throw new Error('Failed to fetch all payroll records');
      }
      
      const result = await response.json();
      console.log('✅ ALL payroll records raw response:', result);
      
      const data = Array.isArray(result) ? result : (result.data || []);
      console.log('📊 TOTAL payroll records in database:', data.length);
      console.log('💰 ALL payroll records:', data);
      
      setPayrollRecords(data);
      
      if (data.length === 0) {
        toast.error('No payroll records exist in database at all!');
      } else {
        toast.success(`Found ${data.length} total payroll records`);
      }
    } catch (error) {
      console.error('💥 Error fetching all payroll records:', error);
      toast.error('Failed to load all payroll records');
    }
  };

  // Group payroll records by employee_id
  interface GroupedPayroll {
    employee: Employee;
    employee_id: string;
    records: PayrollRecord[];
    totalBasicSalary: number;
    totalAllowances: number;
    totalDeductions: number;
    totalGrossSalary: number;
    totalNetSalary: number;
    totalPayments: number;
    firstPaymentDate: string;
    lastPaymentDate: string;
    // Breakdown by payment type
    paymentsByType: {
      salary: { count: number; total: number };
      overtime: { count: number; total: number };
      incentive: { count: number; total: number };
      bonus: { count: number; total: number };
      allowance: { count: number; total: number };
      reimbursement: { count: number; total: number };
    };
  }

  const groupedPayrollRecords = payrollRecords.reduce((acc, record) => {
    const employeeId = record.employee_id;
    if (!acc[employeeId]) {
      acc[employeeId] = {
        employee: record.employee,
        employee_id: employeeId,
        records: [],
        totalBasicSalary: 0,
        totalAllowances: 0,
        totalDeductions: 0,
        totalGrossSalary: 0,
        totalNetSalary: 0,
        totalPayments: 0,
        firstPaymentDate: record.pay_period_start,
        lastPaymentDate: record.pay_period_end,
        paymentsByType: {
          salary: { count: 0, total: 0 },
          overtime: { count: 0, total: 0 },
          incentive: { count: 0, total: 0 },
          bonus: { count: 0, total: 0 },
          allowance: { count: 0, total: 0 },
          reimbursement: { count: 0, total: 0 },
        },
      };
    }
    acc[employeeId].records.push(record);
    acc[employeeId].totalBasicSalary += Number(record.basic_salary) || 0;
    acc[employeeId].totalAllowances += Number(record.total_allowances) || 0;
    acc[employeeId].totalDeductions += Number(record.total_deductions) || 0;
    acc[employeeId].totalGrossSalary += Number(record.gross_salary) || 0;
    acc[employeeId].totalNetSalary += Number(record.net_salary) || 0;
    acc[employeeId].totalPayments += 1;
    
    // Categorize by payment type
    const paymentType = record.payment_type || 'salary';
    type PaymentTypeKey = 'salary' | 'overtime' | 'incentive' | 'bonus' | 'allowance' | 'reimbursement';
    if (paymentType in acc[employeeId].paymentsByType) {
      const typeKey = paymentType as PaymentTypeKey;
      acc[employeeId].paymentsByType[typeKey].count += 1;
      acc[employeeId].paymentsByType[typeKey].total += Number(record.net_salary) || 0;
    }
    
    // Track date range
    if (record.pay_period_start < acc[employeeId].firstPaymentDate) {
      acc[employeeId].firstPaymentDate = record.pay_period_start;
    }
    if (record.pay_period_end > acc[employeeId].lastPaymentDate) {
      acc[employeeId].lastPaymentDate = record.pay_period_end;
    }
    
    return acc;
  }, {} as Record<string, GroupedPayroll>);

  const groupedPayrollArray = Object.values(groupedPayrollRecords);

  const stats = {
    totalPayroll: payrollRecords.reduce((sum, r) => sum + (Number(r.net_salary) || 0), 0),
    processedCount: payrollRecords.filter(r => r.status === 'processed' || r.status === 'paid').length,
    pendingCount: payrollRecords.filter(r => r.status === 'draft').length,
    activeSalaries: salaryStructures.length,
    uniqueEmployees: groupedPayrollArray.length,
    totalTransactions: payrollRecords.length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Payroll Management
            </h1>
            <p className="text-gray-600 mt-2">Manage employee salaries, deductions, and payments</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Total Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {formatCurrency(stats.totalPayroll)}
                </div>
                <p className="text-xs text-blue-100 mt-1">This month</p>
              </div>
              <Wallet className="h-10 w-10 text-blue-200 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100">Employees Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.uniqueEmployees}</div>
                <p className="text-xs text-green-100 mt-1">{stats.totalTransactions} transactions</p>
              </div>
              <Users className="h-10 w-10 text-green-200 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-100">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.totalTransactions}</div>
                <p className="text-xs text-orange-100 mt-1">Payment records</p>
              </div>
              <Calendar className="h-10 w-10 text-orange-200 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">Active Salaries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.activeSalaries}</div>
                <p className="text-xs text-purple-100 mt-1">Structures</p>
              </div>
              <DollarSign className="h-10 w-10 text-purple-200 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="payroll" className="space-y-6">
        <TabsList>
          <TabsTrigger value="payroll">Payroll Records</TabsTrigger>
          <TabsTrigger value="salaries">Salary Structures</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payroll Records</CardTitle>
                  <CardDescription>Track employee payments</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAllPayrollRecords}
                    className="text-xs"
                  >
                    Show All Records
                  </Button>
                  <Input
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-48"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Incentive</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Allowance</TableHead>
                    <TableHead>Reimbursement</TableHead>
                    <TableHead>Total Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedPayrollArray.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                        No payroll records found for {filterMonth}
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupedPayrollArray.map((group) => {
                      const isExpanded = expandedRows.has(group.employee_id);
                      return (
                        <>
                          <TableRow 
                            key={group.employee_id}
                            className="cursor-pointer hover:bg-blue-50/50 transition-colors"
                            onClick={() => toggleRowExpansion(group.employee_id)}
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{group.employee.name}</div>
                                <div className="text-xs text-gray-500">{group.employee.employee_id}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {format(new Date(group.firstPaymentDate), 'MMM dd')} - {format(new Date(group.lastPaymentDate), 'MMM dd, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell>
                              {group.paymentsByType.salary.count > 0 && (
                                <div className="text-sm">
                                  <div className="font-medium">{formatCurrency(group.paymentsByType.salary.total)}</div>
                                  <div className="text-xs text-gray-500">{group.paymentsByType.salary.count}x</div>
                                </div>
                              )}
                              {group.paymentsByType.salary.count === 0 && <span className="text-gray-400">-</span>}
                            </TableCell>
                            <TableCell>
                              {group.paymentsByType.overtime.count > 0 && (
                                <div className="text-sm">
                                  <div className="font-medium">{formatCurrency(group.paymentsByType.overtime.total)}</div>
                                  <div className="text-xs text-gray-500">{group.paymentsByType.overtime.count}x</div>
                                </div>
                              )}
                              {group.paymentsByType.overtime.count === 0 && <span className="text-gray-400">-</span>}
                            </TableCell>
                            <TableCell>
                              {group.paymentsByType.incentive.count > 0 && (
                                <div className="text-sm">
                                  <div className="font-medium">{formatCurrency(group.paymentsByType.incentive.total)}</div>
                                  <div className="text-xs text-gray-500">{group.paymentsByType.incentive.count}x</div>
                                </div>
                              )}
                              {group.paymentsByType.incentive.count === 0 && <span className="text-gray-400">-</span>}
                            </TableCell>
                            <TableCell>
                              {group.paymentsByType.bonus.count > 0 && (
                                <div className="text-sm">
                                  <div className="font-medium">{formatCurrency(group.paymentsByType.bonus.total)}</div>
                                  <div className="text-xs text-gray-500">{group.paymentsByType.bonus.count}x</div>
                                </div>
                              )}
                              {group.paymentsByType.bonus.count === 0 && <span className="text-gray-400">-</span>}
                            </TableCell>
                            <TableCell>
                              {group.paymentsByType.allowance.count > 0 && (
                                <div className="text-sm">
                                  <div className="font-medium">{formatCurrency(group.paymentsByType.allowance.total)}</div>
                                  <div className="text-xs text-gray-500">{group.paymentsByType.allowance.count}x</div>
                                </div>
                              )}
                              {group.paymentsByType.allowance.count === 0 && <span className="text-gray-400">-</span>}
                            </TableCell>
                            <TableCell>
                              {group.paymentsByType.reimbursement.count > 0 && (
                                <div className="text-sm">
                                  <div className="font-medium">{formatCurrency(group.paymentsByType.reimbursement.total)}</div>
                                  <div className="text-xs text-gray-500">{group.paymentsByType.reimbursement.count}x</div>
                                </div>
                              )}
                              {group.paymentsByType.reimbursement.count === 0 && <span className="text-gray-400">-</span>}
                            </TableCell>
                            <TableCell className="font-bold text-green-600">
                              <div className="text-base">{formatCurrency(group.totalNetSalary)}</div>
                              <div className="text-xs text-gray-500 font-normal">{group.totalPayments} transactions</div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Ledger View */}
                          {isExpanded && (
                            <TableRow key={`${group.employee_id}-details`} className="bg-slate-50">
                              <TableCell colSpan={10} className="p-0">
                                <div className="p-6 space-y-4">
                                  <div className="flex items-center justify-between border-b pb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      Payment Ledger - {group.employee.name}
                                    </h3>
                                    <Badge variant="outline" className="bg-white">
                                      {group.totalPayments} Transactions
                                    </Badge>
                                  </div>
                                  
                                  {/* Ledger Table */}
                                  <div className="bg-white rounded-lg border overflow-hidden">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-gray-50">
                                          <TableHead className="font-semibold">Date</TableHead>
                                          <TableHead className="font-semibold">Type</TableHead>
                                          <TableHead className="font-semibold text-right">Salary</TableHead>
                                          <TableHead className="font-semibold text-right">Overtime</TableHead>
                                          <TableHead className="font-semibold text-right">Incentive</TableHead>
                                          <TableHead className="font-semibold text-right">Bonus</TableHead>
                                          <TableHead className="font-semibold text-right">Allowance</TableHead>
                                          <TableHead className="font-semibold text-right">Reimbursement</TableHead>
                                          <TableHead className="font-semibold text-right">Net Amount</TableHead>
                                          <TableHead className="font-semibold">Status</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {group.records
                                          .sort((a, b) => new Date(b.pay_period_start).getTime() - new Date(a.pay_period_start).getTime())
                                          .map((record, idx) => (
                                          <TableRow key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                            <TableCell className="font-medium">
                                              {format(new Date(record.pay_period_start), 'MMM dd, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                              <Badge 
                                                variant="outline"
                                                className={
                                                  record.payment_type === 'salary' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                  record.payment_type === 'overtime' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                  record.payment_type === 'incentive' ? 'bg-green-50 text-green-700 border-green-200' :
                                                  record.payment_type === 'bonus' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                  record.payment_type === 'allowance' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                                                  'bg-gray-50 text-gray-700 border-gray-200'
                                                }
                                              >
                                                {record.payment_type}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                              {record.payment_type === 'salary' ? formatCurrency(Number(record.net_salary) || 0) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-purple-600">
                                              {record.payment_type === 'overtime' ? formatCurrency(Number(record.net_salary) || 0) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-green-600">
                                              {record.payment_type === 'incentive' ? formatCurrency(Number(record.net_salary) || 0) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-yellow-600">
                                              {record.payment_type === 'bonus' ? formatCurrency(Number(record.net_salary) || 0) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-cyan-600">
                                              {record.payment_type === 'allowance' ? formatCurrency(Number(record.net_salary) || 0) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-gray-600">
                                              {record.payment_type === 'reimbursement' ? formatCurrency(Number(record.net_salary) || 0) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-green-700">
                                              {formatCurrency(Number(record.net_salary) || 0)}
                                            </TableCell>
                                            <TableCell>
                                              <Badge 
                                                className={
                                                  record.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                  record.status === 'processed' ? 'bg-blue-100 text-blue-800' :
                                                  'bg-gray-100 text-gray-800'
                                                }
                                              >
                                                {record.status}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                        
                                        {/* Totals Row */}
                                        <TableRow className="bg-blue-50 font-bold border-t-2 border-blue-200">
                                          <TableCell colSpan={2} className="text-right">TOTAL:</TableCell>
                                          <TableCell className="text-right font-mono text-blue-700">
                                            {formatCurrency(group.paymentsByType.salary.total)}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-purple-700">
                                            {formatCurrency(group.paymentsByType.overtime.total)}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-green-700">
                                            {formatCurrency(group.paymentsByType.incentive.total)}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-yellow-700">
                                            {formatCurrency(group.paymentsByType.bonus.total)}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-cyan-700">
                                            {formatCurrency(group.paymentsByType.allowance.total)}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-gray-700">
                                            {formatCurrency(group.paymentsByType.reimbursement.total)}
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-green-800 text-lg">
                                            {formatCurrency(group.totalNetSalary)}
                                          </TableCell>
                                          <TableCell></TableCell>
                                        </TableRow>
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salaries">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Monthly Salary Payments</CardTitle>
                  <CardDescription>Employee salary based on attendance records for {filterMonth}</CardDescription>
                </div>
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </CardHeader>
            <CardContent>
              {monthlySalaries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No salary data available for {filterMonth}</p>
                  <p className="text-sm mt-2">Make sure employees have salary information and attendance records</p>
                </div>
              ) : (
                <>
                  {/* Employee Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {monthlySalaries
                      .filter(salary =>
                        salary.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        salary.employee_code?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .sort((a, b) => a.employee_name.localeCompare(b.employee_name))
                      .map((salary) => {
                        return (
                        <Card 
                          key={salary.employee_id}
                          className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300 cursor-pointer"
                          onClick={() => navigateToEmployeeAttendance(salary.employee_id)}
                        >
                          <CardHeader className="pb-3">
                            {/* Employee Header */}
                            <div className="flex items-start gap-3">
                              <div className={`h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                                salary.attendance_percentage >= 95 ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                salary.attendance_percentage >= 80 ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                                salary.attendance_percentage >= 60 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                                'bg-gradient-to-br from-red-500 to-red-600'
                              }`}>
                                {salary.employee_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">{salary.employee_name}</h3>
                                <p className="text-xs text-gray-500">{salary.employee_code}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {salary.department}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  View Details
                                </Badge>
                                <Eye className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-3">
                            {/* Position */}
                            <div className="text-xs text-gray-600 pb-2 border-b">
                              {salary.position}
                            </div>

                            {/* Monthly Salary */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Monthly Salary</span>
                              <span className="font-semibold text-gray-900 font-mono">
                                ₹{salary.monthly_salary.toLocaleString('en-IN')}
                              </span>
                            </div>

                            {/* Attendance Stats */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Working Days</span>
                                <span className="font-semibold text-gray-900">{salary.working_days}</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Present</span>
                                <span className="font-semibold text-green-600">{salary.present_days} days</span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Absent</span>
                                <span className="font-semibold text-red-600">{salary.absent_days} days</span>
                              </div>
                              <div className="pt-2 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600">Attendance</span>
                                  <Badge 
                                    className={
                                      salary.attendance_percentage >= 95 ? 'bg-green-100 text-green-800' :
                                      salary.attendance_percentage >= 80 ? 'bg-blue-100 text-blue-800' :
                                      salary.attendance_percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }
                                  >
                                    {salary.attendance_percentage.toFixed(1)}%
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {/* Payable Amount */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-green-800">Payable Amount</span>
                                <span className="text-lg font-bold text-green-700 font-mono">
                                  ₹{salary.payable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                      })}
                  </div>

                  {/* Summary Footer */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Employees</p>
                        <p className="text-2xl font-bold text-blue-600">{monthlySalaries.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Monthly Salary</p>
                        <p className="text-2xl font-bold text-purple-600">
                          ₹{monthlySalaries.reduce((sum, s) => sum + s.monthly_salary, 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Payable Amount</p>
                        <p className="text-2xl font-bold text-green-600">
                          ₹{monthlySalaries.reduce((sum, s) => sum + s.payable_amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
