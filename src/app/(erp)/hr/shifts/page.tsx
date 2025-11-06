'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, Edit, Trash2, Users, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface WorkShift {
  id: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  break_duration: number;
  grace_period_in: number;
  grace_period_out: number;
  overtime_threshold: number;
  is_active: boolean;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  employment_status: string;
}

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [selectedShift, setSelectedShift] = useState<WorkShift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [shiftFormData, setShiftFormData] = useState({
    shift_name: '',
    start_time: '',
    end_time: '',
    break_duration: 60,
    grace_period_in: 15,
    grace_period_out: 15,
    overtime_threshold: 30,
    is_active: true
  });

  const [assignFormData, setAssignFormData] = useState({
    employee_id: '',
    effective_from: format(new Date(), 'yyyy-MM-dd'),
    effective_to: ''
  });

  const fetchShifts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/hr/shifts');
      if (!response.ok) throw new Error('Failed to fetch shifts');
      const data = await response.json();
      setShifts(data);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Failed to fetch shifts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data.filter((emp: Employee) => emp.employment_status === 'active'));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    }
  }, []);

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, [fetchShifts, fetchEmployees]);

  const handleCreateShift = () => {
    setSelectedShift(null);
    setShiftFormData({
      shift_name: '',
      start_time: '',
      end_time: '',
      break_duration: 60,
      grace_period_in: 15,
      grace_period_out: 15,
      overtime_threshold: 30,
      is_active: true
    });
    setIsShiftModalOpen(true);
  };

  const handleEditShift = (shift: WorkShift) => {
    setSelectedShift(shift);
    setShiftFormData({
      shift_name: shift.shift_name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_duration: shift.break_duration,
      grace_period_in: shift.grace_period_in,
      grace_period_out: shift.grace_period_out,
      overtime_threshold: shift.overtime_threshold,
      is_active: shift.is_active
    });
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async () => {
    try {
      const url = selectedShift 
        ? `/api/hr/shifts/${selectedShift.id}`
        : '/api/hr/shifts';
      
      const method = selectedShift ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftFormData)
      });

      if (!response.ok) throw new Error('Failed to save shift');

      toast.success(`Shift ${selectedShift ? 'updated' : 'created'} successfully`);
      setIsShiftModalOpen(false);
      fetchShifts();
    } catch (error) {
      console.error('Error saving shift:', error);
      toast.error('Failed to save shift');
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      const response = await fetch(`/api/hr/shifts/${shiftId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete shift');

      toast.success('Shift deleted successfully');
      fetchShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast.error('Failed to delete shift');
    }
  };

  const handleAssignShift = (shift: WorkShift) => {
    setSelectedShift(shift);
    setAssignFormData({
      employee_id: '',
      effective_from: format(new Date(), 'yyyy-MM-dd'),
      effective_to: ''
    });
    setIsAssignModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!assignFormData.employee_id || !selectedShift) {
      toast.error('Please select an employee');
      return;
    }

    try {
      const response = await fetch('/api/hr/shifts/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: assignFormData.employee_id,
          shift_id: selectedShift.id,
          effective_from: assignFormData.effective_from,
          effective_to: assignFormData.effective_to || null
        })
      });

      if (!response.ok) throw new Error('Failed to assign shift');

      toast.success('Shift assigned successfully');
      setIsAssignModalOpen(false);
    } catch (error) {
      console.error('Error assigning shift:', error);
      toast.error('Failed to assign shift');
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '-';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateShiftHours = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (diff < 0) diff += 24; // Handle overnight shifts
    return diff;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Work Shift Management
            </h1>
            <p className="text-gray-600 mt-1">Manage work shifts and employee assignments</p>
          </div>
          <Button
            onClick={handleCreateShift}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Shift
          </Button>
        </div>

        {/* Shifts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-3 text-center py-12">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-600">Loading shifts...</p>
            </div>
          ) : shifts.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shifts found</h3>
              <p className="text-gray-600 text-sm mb-4">Create your first work shift to get started</p>
              <Button onClick={handleCreateShift}>
                <Plus className="h-4 w-4 mr-2" />
                Create Shift
              </Button>
            </div>
          ) : (
            shifts.map((shift) => (
              <Card key={shift.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{shift.shift_name}</CardTitle>
                      <Badge className={shift.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {shift.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditShift(shift)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteShift(shift.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Start Time</p>
                      <p className="font-semibold text-green-600">{formatTime(shift.start_time)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">End Time</p>
                      <p className="font-semibold text-red-600">{formatTime(shift.end_time)}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 mb-1">Shift Duration</p>
                    <p className="text-lg font-bold text-blue-900">
                      {calculateShiftHours(shift.start_time, shift.end_time).toFixed(1)} hours
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Break:</span>
                      <span className="font-semibold ml-1">{shift.break_duration} min</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Grace:</span>
                      <span className="font-semibold ml-1">±{shift.grace_period_in} min</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">OT Threshold:</span>
                      <span className="font-semibold ml-1">{shift.overtime_threshold} min</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleAssignShift(shift)}
                    className="w-full"
                    variant="outline"
                    size="sm"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Assign to Employees
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Shift Modal */}
        <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 -m-6 mb-6 p-6 rounded-t-lg">
              <DialogTitle className="text-white text-xl flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {selectedShift ? 'Edit Shift' : 'Create New Shift'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Shift Name</label>
                <Input
                  value={shiftFormData.shift_name}
                  onChange={(e) => setShiftFormData({ ...shiftFormData, shift_name: e.target.value })}
                  placeholder="e.g., Morning Shift, Evening Shift, Night Shift"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Start Time</label>
                  <Input
                    type="time"
                    value={shiftFormData.start_time}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">End Time</label>
                  <Input
                    type="time"
                    value={shiftFormData.end_time}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Break Duration (minutes)</label>
                  <Input
                    type="number"
                    value={shiftFormData.break_duration}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, break_duration: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Overtime Threshold (minutes)</label>
                  <Input
                    type="number"
                    value={shiftFormData.overtime_threshold}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, overtime_threshold: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Grace Period In (minutes)</label>
                  <Input
                    type="number"
                    value={shiftFormData.grace_period_in}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, grace_period_in: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Grace Period Out (minutes)</label>
                  <Input
                    type="number"
                    value={shiftFormData.grace_period_out}
                    onChange={(e) => setShiftFormData({ ...shiftFormData, grace_period_out: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={shiftFormData.is_active}
                  onChange={(e) => setShiftFormData({ ...shiftFormData, is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active Shift
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsShiftModalOpen(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveShift} className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <Save className="h-4 w-4 mr-2" />
                  Save Shift
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Assign Shift Modal */}
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 -m-6 mb-6 p-6 rounded-t-lg">
              <DialogTitle className="text-white text-xl flex items-center gap-2">
                <Users className="h-5 w-5" />
                Assign Shift to Employee
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Assigning Shift:</p>
                <p className="font-semibold text-blue-900">{selectedShift?.shift_name}</p>
                <p className="text-xs text-blue-700">
                  {selectedShift && formatTime(selectedShift.start_time)} - {selectedShift && formatTime(selectedShift.end_time)}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Select Employee</label>
                <select
                  value={assignFormData.employee_id}
                  onChange={(e) => setAssignFormData({ ...assignFormData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  aria-label="Select employee for shift assignment"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_id}) - {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Effective From</label>
                  <Input
                    type="date"
                    value={assignFormData.effective_from}
                    onChange={(e) => setAssignFormData({ ...assignFormData, effective_from: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Effective To (Optional)</label>
                  <Input
                    type="date"
                    value={assignFormData.effective_to}
                    onChange={(e) => setAssignFormData({ ...assignFormData, effective_to: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveAssignment} className="bg-gradient-to-r from-blue-600 to-purple-600">
                  <Save className="h-4 w-4 mr-2" />
                  Assign Shift
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
