'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Employee {
  id?: string;
  employee_id?: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  hire_date: string;
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Intern';
  employment_status: 'active' | 'inactive' | 'terminated';
  salary?: number;
  address?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  nationality?: string;
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  manager_id?: string;
}

interface EmployeeFormProps {
  employee?: Employee | null;
  onSave: (employee: Employee) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const departments = [
  'Human Resources',
  'Finance',
  'Sales',
  'Marketing',
  'IT',
  'Operations',
  'Customer Service',
  'Logistics',
  'Manufacturing',
  'Procurement',
  'Administration'
];

const positions = [
  'Manager',
  'Assistant Manager',
  'Senior Executive',
  'Executive',
  'Associate',
  'Analyst',
  'Specialist',
  'Coordinator',
  'Administrator',
  'Supervisor',
  'Team Lead',
  'Representative',
  'Officer',
  'Assistant'
];

export default function EmployeeForm({ employee, onSave, onCancel, isSubmitting = false }: EmployeeFormProps) {
  const [formData, setFormData] = useState<Employee>({
    name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    hire_date: format(new Date(), 'yyyy-MM-dd'),
    employment_type: 'Full-time',
    employment_status: 'active',
    salary: 0,
    address: '',
    date_of_birth: '',
    gender: 'male',
    nationality: '',
    marital_status: 'single',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    manager_id: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employee) {
      setFormData({
        ...employee,
        hire_date: employee.hire_date ? format(new Date(employee.hire_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        date_of_birth: employee.date_of_birth ? format(new Date(employee.date_of_birth), 'yyyy-MM-dd') : '',
        salary: employee.salary || 0
      });
    }
  }, [employee]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    if (!formData.position) {
      newErrors.position = 'Position is required';
    }

    if (!formData.hire_date) {
      newErrors.hire_date = 'Hire date is required';
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.salary && formData.salary < 0) {
      newErrors.salary = 'Salary cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    // Convert empty strings to null for optional fields
    const submitData = {
      ...formData,
      phone: formData.phone?.trim() || undefined,
      address: formData.address?.trim() || undefined,
      date_of_birth: formData.date_of_birth || undefined,
      nationality: formData.nationality?.trim() || undefined,
      emergency_contact_name: formData.emergency_contact_name?.trim() || undefined,
      emergency_contact_phone: formData.emergency_contact_phone?.trim() || undefined,
      manager_id: formData.manager_id || undefined,
      salary: formData.salary || undefined
    };

    onSave(submitData);
  };

  const handleInputChange = (field: keyof Employee, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>
          
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter full name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter phone number"
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth || ''}
              onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender || 'male'} onValueChange={(value) => handleInputChange('gender', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="marital_status">Marital Status</Label>
            <Select value={formData.marital_status || 'single'} onValueChange={(value) => handleInputChange('marital_status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select marital status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married</SelectItem>
                <SelectItem value="divorced">Divorced</SelectItem>
                <SelectItem value="widowed">Widowed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="nationality">Nationality</Label>
            <Input
              id="nationality"
              value={formData.nationality || ''}
              onChange={(e) => handleInputChange('nationality', e.target.value)}
              placeholder="Enter nationality"
            />
          </div>
        </div>

        {/* Employment Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Employment Information</h3>

          <div>
            <Label htmlFor="employee_id">Employee ID</Label>
            <Input
              id="employee_id"
              value={formData.employee_id || ''}
              onChange={(e) => handleInputChange('employee_id', e.target.value)}
              placeholder="Auto-generated if empty"
              disabled={!!employee}
            />
            <p className="text-sm text-gray-500 mt-1">Leave empty to auto-generate</p>
          </div>

          <div>
            <Label htmlFor="department">Department *</Label>
            <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
              <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.department && <p className="text-sm text-red-500 mt-1">{errors.department}</p>}
          </div>

          <div>
            <Label htmlFor="position">Position *</Label>
            <Select value={formData.position} onValueChange={(value) => handleInputChange('position', value)}>
              <SelectTrigger className={errors.position ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.position && <p className="text-sm text-red-500 mt-1">{errors.position}</p>}
          </div>

          <div>
            <Label htmlFor="hire_date">Hire Date *</Label>
            <Input
              id="hire_date"
              type="date"
              value={formData.hire_date}
              onChange={(e) => handleInputChange('hire_date', e.target.value)}
              className={errors.hire_date ? 'border-red-500' : ''}
            />
            {errors.hire_date && <p className="text-sm text-red-500 mt-1">{errors.hire_date}</p>}
          </div>

          <div>
            <Label htmlFor="employment_type">Employment Type</Label>
            <Select value={formData.employment_type} onValueChange={(value) => handleInputChange('employment_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="employment_status">Employment Status</Label>
            <Select value={formData.employment_status} onValueChange={(value) => handleInputChange('employment_status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="salary">Monthly Salary</Label>
            <Input
              id="salary"
              type="number"
              value={formData.salary || ''}
              onChange={(e) => handleInputChange('salary', parseFloat(e.target.value) || 0)}
              placeholder="Enter monthly salary"
              min="0"
              step="100"
              className={errors.salary ? 'border-red-500' : ''}
            />
            {errors.salary && <p className="text-sm text-red-500 mt-1">{errors.salary}</p>}
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Enter full address"
          rows={3}
        />
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emergency_contact_name">Contact Name</Label>
            <Input
              id="emergency_contact_name"
              value={formData.emergency_contact_name || ''}
              onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
              placeholder="Enter emergency contact name"
            />
          </div>
          <div>
            <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
            <Input
              id="emergency_contact_phone"
              value={formData.emergency_contact_phone || ''}
              onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
              placeholder="Enter emergency contact phone"
            />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (employee ? 'Update Employee' : 'Create Employee')}
        </Button>
      </div>
    </form>
  );
}
