'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, DollarSign, Wallet, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  position: string;
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
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [isPayrollDialogOpen, setIsPayrollDialogOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryStructure | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [salaryFormData, setSalaryFormData] = useState({
    employee_id: '',
    basic_salary: '',
    house_rent_allowance: '',
    transport_allowance: '',
    medical_allowance: '',
    provident_fund_deduction: '',
    tax_deduction: '',
    effective_from: format(new Date(), 'yyyy-MM-dd'),
  });

  const [payrollFormData, setPayrollFormData] = useState({
    employee_id: '',
    salary_structure_id: '',
    pay_period_start: '',
    pay_period_end: '',
    basic_salary: '',
    total_allowances: '',
    total_deductions: '',
    working_days: '',
    present_days: '',
    leave_days: '0',
    overtime_hours: '0',
    overtime_amount: '0',
    bonus: '0',
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMonth]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchSalaryStructures(),
        fetchPayrollRecords(),
        fetchEmployees(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalaryStructures = async () => {
    try {
      const response = await fetch('/api/hr/salary-structures?is_active=true');
      if (!response.ok) throw new Error('Failed to fetch salary structures');
      const result = await response.json();
      setSalaryStructures(result.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load salary structures');
    }
  };

  const fetchPayrollRecords = async () => {
    try {
      const url = `/api/hr/payroll-records?month=${filterMonth}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch payroll records');
      const result = await response.json();
      setPayrollRecords(result.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load payroll records');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSaveSalaryStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = '/api/hr/salary-structures';
      const method = editingSalary ? 'PUT' : 'POST';
      const payload = editingSalary
        ? { id: editingSalary.id, ...salaryFormData }
        : salaryFormData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save salary structure');

      toast.success(editingSalary ? 'Salary structure updated' : 'Salary structure created');
      setIsSalaryDialogOpen(false);
      resetSalaryForm();
      fetchSalaryStructures();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save salary structure');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/hr/payroll-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payrollFormData),
      });

      if (!response.ok) throw new Error('Failed to create payroll record');

      toast.success('Payroll record created');
      setIsPayrollDialogOpen(false);
      resetPayrollForm();
      fetchPayrollRecords();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create payroll record');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePayrollStatus = async (id: string, status: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/hr/payroll-records', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) throw new Error('Failed to update payroll status');

      toast.success(`Payroll marked as ${status}`);
      fetchPayrollRecords();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update payroll status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const salary = salaryStructures.find(s => s.employee_id === employeeId && s.is_active);
    if (salary) {
      setPayrollFormData(prev => ({
        ...prev,
        employee_id: employeeId,
        salary_structure_id: salary.id,
        basic_salary: salary.basic_salary.toString(),
        total_allowances: (
          salary.house_rent_allowance +
          salary.transport_allowance +
          salary.medical_allowance
        ).toString(),
        total_deductions: (
          salary.provident_fund_deduction +
          salary.tax_deduction
        ).toString(),
      }));
    } else {
      setPayrollFormData(prev => ({ ...prev, employee_id: employeeId }));
      toast.warning('No active salary structure found for this employee');
    }
  };

  const resetSalaryForm = () => {
    setSalaryFormData({
      employee_id: '',
      basic_salary: '',
      house_rent_allowance: '',
      transport_allowance: '',
      medical_allowance: '',
      provident_fund_deduction: '',
      tax_deduction: '',
      effective_from: format(new Date(), 'yyyy-MM-dd'),
    });
    setEditingSalary(null);
  };

  const resetPayrollForm = () => {
    setPayrollFormData({
      employee_id: '',
      salary_structure_id: '',
      pay_period_start: '',
      pay_period_end: '',
      basic_salary: '',
      total_allowances: '',
      total_deductions: '',
      working_days: '',
      present_days: '',
      leave_days: '0',
      overtime_hours: '0',
      overtime_amount: '0',
      bonus: '0',
    });
  };

  const handleEditSalary = (salary: SalaryStructure) => {
    setEditingSalary(salary);
    setSalaryFormData({
      employee_id: salary.employee_id,
      basic_salary: salary.basic_salary.toString(),
      house_rent_allowance: salary.house_rent_allowance.toString(),
      transport_allowance: salary.transport_allowance.toString(),
      medical_allowance: salary.medical_allowance.toString(),
      provident_fund_deduction: salary.provident_fund_deduction.toString(),
      tax_deduction: salary.tax_deduction.toString(),
      effective_from: salary.effective_from,
    });
    setIsSalaryDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      processed: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
    };
    return <Badge className={variants[status] || ''}>{status}</Badge>;
  };

  const filteredSalaries = salaryStructures.filter(salary =>
    salary.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    salary.employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalPayroll: payrollRecords.reduce((sum, r) => sum + (r.net_salary || 0), 0),
    processedCount: payrollRecords.filter(r => r.status === 'processed' || r.status === 'paid').length,
    pendingCount: payrollRecords.filter(r => r.status === 'draft').length,
    activeSalaries: salaryStructures.length,
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
          <div className="flex gap-3">
            <Dialog open={isPayrollDialogOpen} onOpenChange={setIsPayrollDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Process Payroll
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Process Payroll</DialogTitle>
                  <DialogDescription>Create payroll record for an employee</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreatePayroll} className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select
                      value={payrollFormData.employee_id}
                      onValueChange={handleEmployeeSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Pay Period Start</Label>
                      <Input
                        type="date"
                        value={payrollFormData.pay_period_start}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, pay_period_start: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Pay Period End</Label>
                      <Input
                        type="date"
                        value={payrollFormData.pay_period_end}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, pay_period_end: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Basic Salary</Label>
                      <Input
                        type="number"
                        value={payrollFormData.basic_salary}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, basic_salary: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Total Allowances</Label>
                      <Input
                        type="number"
                        value={payrollFormData.total_allowances}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, total_allowances: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Total Deductions</Label>
                      <Input
                        type="number"
                        value={payrollFormData.total_deductions}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, total_deductions: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Working Days</Label>
                      <Input
                        type="number"
                        value={payrollFormData.working_days}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, working_days: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Present Days</Label>
                      <Input
                        type="number"
                        value={payrollFormData.present_days}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, present_days: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Leave Days</Label>
                      <Input
                        type="number"
                        value={payrollFormData.leave_days}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, leave_days: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Overtime Hours</Label>
                      <Input
                        type="number"
                        value={payrollFormData.overtime_hours}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, overtime_hours: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Overtime Amount</Label>
                      <Input
                        type="number"
                        value={payrollFormData.overtime_amount}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, overtime_amount: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Bonus</Label>
                      <Input
                        type="number"
                        value={payrollFormData.bonus}
                        onChange={(e) => setPayrollFormData({ ...payrollFormData, bonus: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      Create Payroll
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsPayrollDialogOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
                  <Plus className="h-4 w-4 mr-2" />
                  New Salary Structure
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingSalary ? 'Edit' : 'Create'} Salary Structure</DialogTitle>
                  <DialogDescription>Set up employee salary components</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveSalaryStructure} className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select
                      value={salaryFormData.employee_id}
                      onValueChange={(value) => setSalaryFormData({ ...salaryFormData, employee_id: value })}
                      disabled={!!editingSalary}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Basic Salary</Label>
                    <Input
                      type="number"
                      value={salaryFormData.basic_salary}
                      onChange={(e) => setSalaryFormData({ ...salaryFormData, basic_salary: e.target.value })}
                      placeholder="50000"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>HRA</Label>
                      <Input
                        type="number"
                        value={salaryFormData.house_rent_allowance}
                        onChange={(e) => setSalaryFormData({ ...salaryFormData, house_rent_allowance: e.target.value })}
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <Label>Transport Allowance</Label>
                      <Input
                        type="number"
                        value={salaryFormData.transport_allowance}
                        onChange={(e) => setSalaryFormData({ ...salaryFormData, transport_allowance: e.target.value })}
                        placeholder="2000"
                      />
                    </div>
                    <div>
                      <Label>Medical Allowance</Label>
                      <Input
                        type="number"
                        value={salaryFormData.medical_allowance}
                        onChange={(e) => setSalaryFormData({ ...salaryFormData, medical_allowance: e.target.value })}
                        placeholder="1500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>PF Deduction</Label>
                      <Input
                        type="number"
                        value={salaryFormData.provident_fund_deduction}
                        onChange={(e) => setSalaryFormData({ ...salaryFormData, provident_fund_deduction: e.target.value })}
                        placeholder="6000"
                      />
                    </div>
                    <div>
                      <Label>Tax Deduction</Label>
                      <Input
                        type="number"
                        value={salaryFormData.tax_deduction}
                        onChange={(e) => setSalaryFormData({ ...salaryFormData, tax_deduction: e.target.value })}
                        placeholder="5000"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Effective From</Label>
                    <Input
                      type="date"
                      value={salaryFormData.effective_from}
                      onChange={(e) => setSalaryFormData({ ...salaryFormData, effective_from: e.target.value })}
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {editingSalary ? 'Update' : 'Create'} Salary Structure
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsSalaryDialogOpen(false);
                        resetSalaryForm();
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Payroll</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Wallet className="h-5 w-5 text-blue-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">
                ${stats.totalPayroll.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.processedCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-yellow-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.pendingCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Salaries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-purple-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.activeSalaries}</div>
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
                <Input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="w-48"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Basic</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.employee.name}</div>
                          <div className="text-xs text-gray-500">{record.employee.employee_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(record.pay_period_start), 'MMM dd')} - {format(new Date(record.pay_period_end), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.present_days}/{record.working_days}
                      </TableCell>
                      <TableCell>${record.basic_salary?.toLocaleString() || 0}</TableCell>
                      <TableCell>${record.total_allowances?.toLocaleString() || 0}</TableCell>
                      <TableCell>${record.total_deductions?.toLocaleString() || 0}</TableCell>
                      <TableCell className="font-medium">${record.gross_salary?.toLocaleString() || 0}</TableCell>
                      <TableCell className="font-bold text-green-600">
                        ${record.net_salary?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        {record.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdatePayrollStatus(record.id, 'processed')}
                          >
                            Process
                          </Button>
                        )}
                        {record.status === 'processed' && (
                          <Button
                            size="sm"
                            className="bg-green-600"
                            onClick={() => handleUpdatePayrollStatus(record.id, 'paid')}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
                  <CardTitle>Salary Structures</CardTitle>
                  <CardDescription>Manage employee compensation</CardDescription>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>HRA</TableHead>
                    <TableHead>Transport</TableHead>
                    <TableHead>Medical</TableHead>
                    <TableHead>PF Deduction</TableHead>
                    <TableHead>Tax</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSalaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{salary.employee.name}</div>
                          <div className="text-xs text-gray-500">{salary.employee.employee_id}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${salary.basic_salary.toLocaleString()}</TableCell>
                      <TableCell>${salary.house_rent_allowance.toLocaleString()}</TableCell>
                      <TableCell>${salary.transport_allowance.toLocaleString()}</TableCell>
                      <TableCell>${salary.medical_allowance.toLocaleString()}</TableCell>
                      <TableCell>${salary.provident_fund_deduction.toLocaleString()}</TableCell>
                      <TableCell>${salary.tax_deduction.toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(salary.effective_from), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditSalary(salary)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
