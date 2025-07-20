'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Users, 
  UserPlus, 
  Search, 
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  DollarSign,
  Edit,
  MoreHorizontal,
  Eye,
  Download,
  Upload
} from 'lucide-react'
import { hasPermission } from '@/lib/auth'

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  department: string
  salary: number
  hireDate: Date
  status: 'active' | 'inactive' | 'terminated'
  address: string
  emergencyContact: string
  emergencyPhone: string
  manager?: string
  employeeId: string
  workLocation: string
  notes?: string
}

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDepartment, setFilterDepartment] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  // Mock employees data
  useEffect(() => {
    const mockEmployees: Employee[] = [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@alramsfurniture.com',
        phone: '+1 (555) 123-4567',
        position: 'Sales Manager',
        department: 'Sales',
        salary: 75000,
        hireDate: new Date('2022-01-15'),
        status: 'active',
        address: '123 Main St, City, State 12345',
        emergencyContact: 'Jane Smith',
        emergencyPhone: '+1 (555) 987-6543',
        manager: 'Executive Team',
        employeeId: 'EMP001',
        workLocation: 'Main Office',
        notes: 'Excellent performance, team leader'
      },
      {
        id: '2',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@alramsfurniture.com',
        phone: '+1 (555) 234-5678',
        position: 'Production Manager',
        department: 'Manufacturing',
        salary: 80000,
        hireDate: new Date('2021-06-10'),
        status: 'active',
        address: '456 Oak Ave, City, State 12345',
        emergencyContact: 'Mike Johnson',
        emergencyPhone: '+1 (555) 876-5432',
        manager: 'Executive Team',
        employeeId: 'EMP002',
        workLocation: 'Factory Floor',
        notes: 'Production specialist, safety coordinator'
      },
      {
        id: '3',
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@alramsfurniture.com',
        phone: '+1 (555) 345-6789',
        position: 'Warehouse Supervisor',
        department: 'Warehouse',
        salary: 55000,
        hireDate: new Date('2023-03-20'),
        status: 'active',
        address: '789 Pine Rd, City, State 12345',
        emergencyContact: 'Lisa Brown',
        emergencyPhone: '+1 (555) 765-4321',
        manager: 'Sarah Johnson',
        employeeId: 'EMP003',
        workLocation: 'Warehouse',
        notes: 'Inventory management expert'
      },
      {
        id: '4',
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@alramsfurniture.com',
        phone: '+1 (555) 456-7890',
        position: 'Sales Representative',
        department: 'Sales',
        salary: 45000,
        hireDate: new Date('2023-08-01'),
        status: 'active',
        address: '321 Elm St, City, State 12345',
        emergencyContact: 'David Davis',
        emergencyPhone: '+1 (555) 654-3210',
        manager: 'John Smith',
        employeeId: 'EMP004',
        workLocation: 'Main Office',
        notes: 'New hire, showing great potential'
      },
      {
        id: '5',
        firstName: 'Robert',
        lastName: 'Wilson',
        email: 'robert.wilson@alramsfurniture.com',
        phone: '+1 (555) 567-8901',
        position: 'Accountant',
        department: 'Finance',
        salary: 60000,
        hireDate: new Date('2022-11-15'),
        status: 'inactive',
        address: '654 Maple Ave, City, State 12345',
        emergencyContact: 'Susan Wilson',
        emergencyPhone: '+1 (555) 543-2109',
        manager: 'Executive Team',
        employeeId: 'EMP005',
        workLocation: 'Main Office',
        notes: 'On medical leave'
      },
      {
        id: '6',
        firstName: 'Lisa',
        lastName: 'Garcia',
        email: 'lisa.garcia@alramsfurniture.com',
        phone: '+1 (555) 678-9012',
        position: 'Quality Inspector',
        department: 'Manufacturing',
        salary: 50000,
        hireDate: new Date('2022-05-30'),
        status: 'active',
        address: '987 Cedar Lane, City, State 12345',
        emergencyContact: 'Carlos Garcia',
        emergencyPhone: '+1 (555) 432-1098',
        manager: 'Sarah Johnson',
        employeeId: 'EMP006',
        workLocation: 'Factory Floor',
        notes: 'Quality assurance specialist'
      }
    ]
    setEmployees(mockEmployees)
  }, [])

  // Filter employees based on search term, department, and status
  useEffect(() => {
    let filtered = employees

    if (searchTerm) {
      filtered = filtered.filter(employee => 
        `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterDepartment !== 'all') {
      filtered = filtered.filter(employee => employee.department === filterDepartment)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(employee => employee.status === filterStatus)
    }

    setFilteredEmployees(filtered)
  }, [employees, searchTerm, filterDepartment, filterStatus])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'terminated': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(salary)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const departments = [...new Set(employees.map(emp => emp.department))]
  const employeeCounts = {
    total: employees.length,
    active: employees.filter(emp => emp.status === 'active').length,
    inactive: employees.filter(emp => emp.status === 'inactive').length,
    departments: departments.length
  }

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowDetailsDialog(true)
  }

  if (!hasPermission('employee:manage')) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <Users className="mx-auto h-16 w-16 mb-4 opacity-50 text-red-500" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-gray-600">You don&apos;t have permission to manage employees</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600">Manage employee information and records</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="personal" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
                </TabsList>
                
                <TabsContent value="personal" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="Enter first name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Enter last name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="employee@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" placeholder="+1 (555) 123-4567" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea id="address" placeholder="Full address" />
                  </div>
                </TabsContent>
                
                <TabsContent value="employment" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeId">Employee ID</Label>
                      <Input id="employeeId" placeholder="EMP007" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input id="position" placeholder="Job title" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salary">Salary</Label>
                      <Input id="salary" type="number" placeholder="60000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workLocation">Work Location</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main-office">Main Office</SelectItem>
                          <SelectItem value="factory-floor">Factory Floor</SelectItem>
                          <SelectItem value="warehouse">Warehouse</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manager">Manager</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="executive">Executive Team</SelectItem>
                          {employees.filter(emp => emp.status === 'active').map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="emergency" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                      <Input id="emergencyContact" placeholder="Full name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergencyPhone">Emergency Phone</Label>
                      <Input id="emergencyPhone" placeholder="+1 (555) 123-4567" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" placeholder="Additional notes..." />
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={() => setShowAddDialog(false)}>Add Employee</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{employeeCounts.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold">{employeeCounts.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Users className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold">{employeeCounts.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-2xl font-bold">{employeeCounts.departments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <div className="space-y-4">
        {filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="mx-auto h-16 w-16 mb-4 opacity-50 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No employees found</h3>
              <p className="text-gray-600">No employees match your current filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredEmployees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {employee.firstName[0]}{employee.lastName[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {employee.employeeId}
                        </Badge>
                        <Badge className={getStatusColor(employee.status)}>
                          {employee.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          <span>{employee.position}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{employee.department}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{employee.workLocation}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{employee.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{employee.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Hired {formatDate(employee.hireDate)}</span>
                        </div>
                        {employee.manager && (
                          <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3">
                            <Users className="h-4 w-4" />
                            <span>Reports to: {employee.manager}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewEmployee(employee)}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Employee Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedEmployee && (
                <>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                  </div>
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                  <Badge className={getStatusColor(selectedEmployee.status)}>
                    {selectedEmployee.status.toUpperCase()}
                  </Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="emergency">Emergency</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Position</p>
                        <p className="font-medium">{selectedEmployee.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Department</p>
                        <p className="font-medium">{selectedEmployee.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Work Location</p>
                        <p className="font-medium">{selectedEmployee.workLocation}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Salary</p>
                        <p className="font-medium">{formatSalary(selectedEmployee.salary)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Hire Date</p>
                        <p className="font-medium">{formatDate(selectedEmployee.hireDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Reports To</p>
                        <p className="font-medium">{selectedEmployee.manager || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {selectedEmployee.notes && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Notes</p>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm">{selectedEmployee.notes}</p>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{selectedEmployee.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{selectedEmployee.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium">{selectedEmployee.address}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="employment" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Employee ID</p>
                    <p className="font-medium text-lg">{selectedEmployee.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge className={getStatusColor(selectedEmployee.status)}>
                      {selectedEmployee.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium">{selectedEmployee.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Position</p>
                    <p className="font-medium">{selectedEmployee.position}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Hire Date</p>
                    <p className="font-medium">{formatDate(selectedEmployee.hireDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Salary</p>
                    <p className="font-medium text-green-600">{formatSalary(selectedEmployee.salary)}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="emergency" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Emergency Contact</p>
                    <p className="font-medium text-lg">{selectedEmployee.emergencyContact}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Emergency Phone</p>
                    <p className="font-medium text-lg">{selectedEmployee.emergencyPhone}</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default EmployeesPage
