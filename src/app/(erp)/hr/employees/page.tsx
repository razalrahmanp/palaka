'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Search, Eye, Edit, Trash2, Mail, Phone, MapPin, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Employee } from '@/types';
import EmployeeForm from '@/components/hr/EmployeeForm';
import EmployeeWorkSchedule from '@/components/hr/EmployeeWorkSchedule';

interface Department {
  name: string;
  count: number;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isWorkScheduleModalOpen, setIsWorkScheduleModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/hr/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      
      const data = await response.json();
      setEmployees(data);

      // Extract departments and counts
      const deptMap = new Map<string, number>();
      data.forEach((emp: Employee) => {
        if (emp.employment_status === 'active') {
          deptMap.set(emp.department, (deptMap.get(emp.department) || 0) + 1);
        }
      });
      
      const deptList = Array.from(deptMap.entries()).map(([name, count]) => ({ name, count }));
      setDepartments(deptList.sort((a, b) => b.count - a.count));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = selectedDepartment === 'all' || employee.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'all' || employee.employment_status === selectedStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmployeeStats = () => {
    return {
      total: employees.filter(emp => emp.employment_status !== 'terminated').length,
      active: employees.filter(emp => emp.employment_status === 'active').length,
      inactive: employees.filter(emp => emp.employment_status === 'inactive').length,
      newThisMonth: employees.filter(emp => {
        const hireDate = new Date(emp.hire_date);
        const now = new Date();
        return hireDate.getMonth() === now.getMonth() && 
               hireDate.getFullYear() === now.getFullYear() &&
               emp.employment_status === 'active';
      }).length
    };
  };

  const stats = getEmployeeStats();

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewModalOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/hr/employees/${employeeToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete employee');
      }

      toast.success('Employee deleted successfully');
      fetchEmployees();
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEmployee = async (employeeData: Partial<Employee>) => {
    try {
      setIsSubmitting(true);
      const isEdit = !!selectedEmployee?.id;
      const url = isEdit ? `/api/hr/employees/${selectedEmployee.id}` : '/api/hr/employees';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEdit ? 'update' : 'create'} employee`);
      }

      const savedEmployee = await response.json();
      console.log('Employee saved:', savedEmployee); // For debugging
      toast.success(`Employee ${isEdit ? 'updated' : 'created'} successfully`);
      
      fetchEmployees();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error(`Error ${selectedEmployee?.id ? 'updating' : 'creating'} employee:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${selectedEmployee?.id ? 'update' : 'create'} employee`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      {/* Compact Header with Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <div className="p-4">
          {/* Top Row: Title and Action */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
              <p className="text-sm text-gray-600">Manage employee information and records</p>
            </div>
            <Button 
              onClick={() => setIsAddModalOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>

          {/* Stats Row - Compact */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3 border border-green-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Active</p>
                  <p className="text-2xl font-bold text-green-900">{stats.active}</p>
                </div>
                <Users className="h-8 w-8 text-green-400" />
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Inactive</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.inactive}</p>
                </div>
                <Users className="h-8 w-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">New This Month</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.newThisMonth}</p>
                </div>
                <UserPlus className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Filters Row - Inline */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name, ID, email, or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-52 h-9">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.name} value={dept.name}>
                    {dept.name} ({dept.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('all');
                setSelectedStatus('active');
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Compact Employee Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Employee Directory <span className="text-sm font-normal text-gray-500">({filteredEmployees.length} employees)</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600">Loading employees...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Employee</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Position</TableHead>
                  <TableHead className="font-semibold">Hire Date</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Manager</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => (
                  <TableRow key={employee.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                          <span className="font-mono">{employee.employee_id}</span>
                          {employee.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {employee.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{employee.department}</TableCell>
                    <TableCell className="text-sm">{employee.position}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(employee.hire_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(employee.employment_status)} variant="secondary">
                        {employee.employment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {employee.manager ? (
                        <div>
                          <div className="font-medium">{employee.manager.name}</div>
                          <div className="text-xs text-gray-500">{employee.manager.employee_id}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewEmployee(employee)}
                          title="View Details"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedEmployee(employee);
                            setIsWorkScheduleModalOpen(true);
                          }}
                          title="Work Schedule"
                          className="h-8 w-8 p-0"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditEmployee(employee)}
                          title="Edit Employee"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {employee.employment_status === 'active' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteEmployee(employee)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedDepartment !== 'all' || selectedStatus !== 'active'
                  ? 'Try adjusting your search criteria.'
                  : 'Start by adding your first employee.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* View Employee Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedEmployee.name}</h2>
                  <p className="text-gray-600">{selectedEmployee.position} • {selectedEmployee.department}</p>
                  <p className="text-sm text-gray-500 mt-1">Employee ID: {selectedEmployee.employee_id}</p>
                </div>
                <Badge className={getStatusColor(selectedEmployee.employment_status)}>
                  {selectedEmployee.employment_status}
                </Badge>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{selectedEmployee.email}</span>
                    </div>
                    {selectedEmployee.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{selectedEmployee.phone}</span>
                      </div>
                    )}
                    {selectedEmployee.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span>{selectedEmployee.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Employment Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Hired: {format(new Date(selectedEmployee.hire_date), 'MMMM dd, yyyy')}</span>
                    </div>
                    {selectedEmployee.salary && (
                      <div>
                        <span className="text-sm text-gray-500">Salary: </span>
                        <span>${selectedEmployee.salary.toLocaleString()}</span>
                      </div>
                    )}
                    {selectedEmployee.manager && (
                      <div>
                        <span className="text-sm text-gray-500">Reports to: </span>
                        <span>{selectedEmployee.manager.name} ({selectedEmployee.manager.employee_id})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              {(selectedEmployee.emergency_contact || selectedEmployee.emergency_phone) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Emergency Contact</h3>
                  <div className="space-y-2">
                    {selectedEmployee.emergency_contact && (
                      <div>
                        <span className="text-sm text-gray-500">Name: </span>
                        <span>{selectedEmployee.emergency_contact}</span>
                      </div>
                    )}
                    {selectedEmployee.emergency_phone && (
                      <div>
                        <span className="text-sm text-gray-500">Phone: </span>
                        <span>{selectedEmployee.emergency_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Personal Information */}
              {selectedEmployee.date_of_birth && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  <div>
                    <span className="text-sm text-gray-500">Date of Birth: </span>
                    <span>{format(new Date(selectedEmployee.date_of_birth), 'MMMM dd, yyyy')}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Employee Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            onSave={handleSaveEmployee}
            onCancel={handleCancelForm}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            employee={selectedEmployee}
            onSave={handleSaveEmployee}
            onCancel={handleCancelForm}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{employeeToDelete?.name}</strong>? 
              This action cannot be undone and will permanently remove the employee from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEmployee}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Work Schedule Modal */}
      <Dialog open={isWorkScheduleModalOpen} onOpenChange={setIsWorkScheduleModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Employee Work Schedule</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <EmployeeWorkSchedule
              employeeId={selectedEmployee.id}
              employeeName={selectedEmployee.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
