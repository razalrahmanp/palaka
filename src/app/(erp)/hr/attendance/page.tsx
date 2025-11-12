'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, UserCheck, UserX, Search, Plus, Eye, Edit, ChevronLeft, ChevronRight, X, MessageSquare, Save, AlertTriangle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

// Attendance Calendar Component
interface AttendanceCalendarProps {
  attendanceRecords: AttendanceRecord[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
}

function AttendanceCalendar({ attendanceRecords, selectedDate, onDateSelect }: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get first day of month (0 = Sunday, 6 = Saturday)
  const firstDayOfWeek = monthStart.getDay();

  // Create calendar grid with empty cells for days before month starts
  const calendarDays = Array(firstDayOfWeek).fill(null).concat(daysInMonth);

  // Count attendance for each day
  const getAttendanceForDate = (date: Date | null) => {
    if (!date) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    const records = attendanceRecords.filter(r => r.date === dateStr);
    return {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      late: records.filter(r => r.status === 'late').length,
      absent: records.filter(r => r.status === 'absent').length,
    };
  };

  const getDayColor = (date: Date | null) => {
    if (!date) return '';
    const stats = getAttendanceForDate(date);
    if (!stats || stats.total === 0) return 'bg-gray-50 text-gray-400';
    
    const presentPercentage = (stats.present / stats.total) * 100;
    if (presentPercentage >= 90) return 'bg-green-100 text-green-700 font-semibold';
    if (presentPercentage >= 70) return 'bg-yellow-100 text-yellow-700 font-semibold';
    return 'bg-red-100 text-red-700 font-semibold';
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-lg">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-gray-600 py-2"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const isSelected = selectedDate === format(day, 'yyyy-MM-dd');
          const isToday = isSameDay(day, new Date());
          const stats = getAttendanceForDate(day);

          return (
            <button
              key={index}
              onClick={() => onDateSelect(format(day, 'yyyy-MM-dd'))}
              className={`
                aspect-square p-1 rounded-lg text-sm transition-all
                ${getDayColor(day)}
                ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                ${isToday ? 'border-2 border-blue-500' : 'border border-transparent'}
                hover:scale-105 hover:shadow-md
                flex flex-col items-center justify-center
              `}
            >
              <span className="text-sm">{format(day, 'd')}</span>
              {stats && stats.total > 0 && (
                <span className="text-[10px] leading-none mt-0.5">
                  {stats.present}/{stats.total}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span>≥90% Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 rounded"></div>
          <span>70-89% Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 rounded"></div>
          <span>&lt;70% Present</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
          <span>No Data</span>
        </div>
      </div>
    </div>
  );
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  check_out_time?: string;
  total_hours?: number;
  status: 'present' | 'absent' | 'half_day' | 'late' | 'on_leave';
  notes?: string;
  employee: {
    id: string;
    name: string;
    employee_id: string;
    department: string;
    position: string;
  };
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  position: string;
}

interface PunchLog {
  id: string;
  punch_time: string;
  punch_type: string;
  verification_method: string;
  verification_quality: number;
  device: {
    device_name: string;
    ip_address: string;
  };
  processed: boolean;
}

function AttendancePageContent() {
  const searchParams = useSearchParams();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasAutoProcessed, setHasAutoProcessed] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  
  // Employee punch logs state
  const [expandedEmployeeRows, setExpandedEmployeeRows] = useState<Set<string>>(new Set());
  const [employeePunchLogs, setEmployeePunchLogs] = useState<Record<string, PunchLog[]>>({});
  const [loadingPunchLogs, setLoadingPunchLogs] = useState<Set<string>>(new Set());
  
  // Punch log edit state
  const [isEditPunchLogModalOpen, setIsEditPunchLogModalOpen] = useState(false);
  const [selectedPunchLog, setSelectedPunchLog] = useState<PunchLog | null>(null);
  const [punchLogEditType, setPunchLogEditType] = useState<'IN' | 'OUT' | 'BREAK'>('IN');
  const [isUpdatingPunchLog, setIsUpdatingPunchLog] = useState(false);
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false);
  
  const [editFormData, setEditFormData] = useState({
    check_in_time: '',
    check_out_time: '',
    status: 'present' as AttendanceRecord['status'],
    notes: ''
  });

  const [addFormData, setAddFormData] = useState({
    employee_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    check_in_time: '',
    check_out_time: '',
    status: 'present' as AttendanceRecord['status'],
    notes: ''
  });

  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // Handle query parameters from payroll page
  useEffect(() => {
    const employeeId = searchParams.get('employee_id');
    const date = searchParams.get('date');
    const employeeName = searchParams.get('employee_name');
    
    if (employeeId) {
      setSelectedEmployee(employeeId);
      if (employeeName) {
        toast.info(`Viewing attendance for ${employeeName}`);
      }
    }
    
    if (date) {
      setSelectedDate(date);
    }
  }, [searchParams]);

  const fetchAttendanceRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      
      // Only filter by date if a specific date is selected
      if (selectedDate) {
        params.append('date', selectedDate);
      }
      if (selectedEmployee) {
        params.append('employee_id', selectedEmployee);
      }

      const response = await fetch(`/api/hr/attendance?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch attendance records');
      
      const data = await response.json();
      console.log('Fetched attendance records:', data.length);
      setAttendanceRecords(data);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedEmployee]);

  const fetchEmployeePunchLogs = useCallback(async (employeeId: string, date: string) => {
    const key = `${employeeId}_${date}`;
    
    // Don't fetch if already loading or already have data
    if (loadingPunchLogs.has(key) || employeePunchLogs[key]) {
      return;
    }

    try {
      setLoadingPunchLogs(prev => new Set(prev).add(key));
      
      const response = await fetch(
        `/api/hr/attendance/punch-logs?employee_id=${employeeId}&date=${date}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch punch logs');
      
      const data = await response.json();
      
      setEmployeePunchLogs(prev => ({
        ...prev,
        [key]: data
      }));
    } catch (error) {
      console.error('Error fetching punch logs:', error);
      toast.error('Failed to load punch logs');
    } finally {
      setLoadingPunchLogs(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  }, [loadingPunchLogs, employeePunchLogs]);

  // Auto-sync and process on page load
  const autoSyncAndProcess = useCallback(async () => {
    if (hasAutoProcessed) return; // Only run once
    
    try {
      setIsSyncing(true);
      
      // Step 1: Sync from ESSL devices (all devices)
      console.log('Auto-syncing attendance from devices...');
      const syncResponse = await fetch('/api/essl/sync-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body to sync all devices
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log('Sync completed:', syncData);
      }
      
      // Step 2: Process all unprocessed attendance
      console.log('Auto-processing attendance...');
      setIsProcessing(true);
      const processResponse = await fetch('/api/hr/attendance/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: null }) // Process all dates
      });

      if (processResponse.ok) {
        const processData = await processResponse.json();
        console.log('Processing completed:', processData);
        
        // Refresh attendance records
        await fetchAttendanceRecords();
      }
      
      setHasAutoProcessed(true);
    } catch (error) {
      console.error('Auto sync/process error:', error);
      // Don't show error toast for auto-processing
    } finally {
      setIsSyncing(false);
      setIsProcessing(false);
    }
  }, [hasAutoProcessed, fetchAttendanceRecords]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      
      const data = await response.json();
      setEmployees(data.filter((emp: Employee & { employment_status: string }) => emp.employment_status === 'active'));
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  // Auto-sync and process on initial load
  useEffect(() => {
    autoSyncAndProcess();
  }, [autoSyncAndProcess]);

  const filteredRecords = attendanceRecords
    .filter(record => {
      const matchesSearch = record.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.employee.department.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      // Sort by date in ascending order (oldest first)
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      // If same date, sort by employee name
      return a.employee.name.localeCompare(b.employee.name);
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'half_day': return 'bg-yellow-100 text-yellow-800';
      case 'late': return 'bg-orange-100 text-orange-800';
      case 'on_leave': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <UserCheck className="h-4 w-4" />;
      case 'absent': return <UserX className="h-4 w-4" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const getTodayStats = () => {
    const todayRecords = attendanceRecords.filter(record => record.date === selectedDate);
    
    return {
      total: todayRecords.length,
      present: todayRecords.filter(r => r.status === 'present').length,
      absent: todayRecords.filter(r => r.status === 'absent').length,
      late: todayRecords.filter(r => r.status === 'late').length,
      onLeave: todayRecords.filter(r => r.status === 'on_leave').length,
      halfDay: todayRecords.filter(r => r.status === 'half_day').length
    };
  };

  const stats = getTodayStats();

  const toggleEmployeeRow = (employeeId: string, date: string) => {
    const key = `${employeeId}_${date}`;
    const newExpanded = new Set(expandedEmployeeRows);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
      // Fetch punch logs when expanding
      fetchEmployeePunchLogs(employeeId, date);
    }
    setExpandedEmployeeRows(newExpanded);
  };

  const getPunchTypeColor = (type: string) => {
    switch (type) {
      case 'IN': return 'bg-green-100 text-green-800';
      case 'OUT': return 'bg-red-100 text-red-800';
      case 'BREAK': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewRecord = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const handleEditRecord = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setEditFormData({
      check_in_time: record.check_in_time ? format(new Date(record.check_in_time), "HH:mm") : '',
      check_out_time: record.check_out_time ? format(new Date(record.check_out_time), "HH:mm") : '',
      status: record.status,
      notes: record.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAttendance = async () => {
    if (!selectedRecord) return;
    
    try {
      setIsUpdatingAttendance(true);
      
      const response = await fetch(`/api/hr/attendance/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in_time: editFormData.check_in_time ? `${selectedRecord.date}T${editFormData.check_in_time}:00` : null,
          check_out_time: editFormData.check_out_time ? `${selectedRecord.date}T${editFormData.check_out_time}:00` : null,
          status: editFormData.status,
          notes: editFormData.notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          toast.error('Attendance record not found. It may have been deleted.');
          setIsEditModalOpen(false);
          fetchAttendanceRecords(); // Refresh to get current data
          return;
        }
        throw new Error(errorData.error || 'Failed to update attendance');
      }

      toast.success('Attendance updated successfully');
      setIsEditModalOpen(false);
      fetchAttendanceRecords();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update attendance');
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  const handleMarkAttendance = async () => {
    // Validate required fields
    if (!addFormData.employee_id || !addFormData.date) {
      toast.error('Please select an employee and date');
      return;
    }

    try {
      setIsSubmittingAttendance(true);
      
      // Build the request body
      const requestBody: {
        employee_id: string;
        date: string;
        status: string;
        notes: string | null;
        check_in_time?: string;
        check_out_time?: string;
      } = {
        employee_id: addFormData.employee_id,
        date: addFormData.date,
        status: addFormData.status,
        notes: addFormData.notes || null
      };

      // Add check-in time if provided
      if (addFormData.check_in_time) {
        requestBody.check_in_time = `${addFormData.date}T${addFormData.check_in_time}:00`;
      }

      // Add check-out time if provided
      if (addFormData.check_out_time) {
        requestBody.check_out_time = `${addFormData.date}T${addFormData.check_out_time}:00`;
      }

      const response = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.error('Attendance already marked for this employee on this date');
        } else {
          throw new Error(data.error || 'Failed to mark attendance');
        }
        return;
      }

      toast.success('Attendance marked successfully');
      
      // Reset form
      setAddFormData({
        employee_id: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        check_in_time: '',
        check_out_time: '',
        status: 'present',
        notes: ''
      });
      
      setIsAddModalOpen(false);
      
      // Refresh attendance records
      await fetchAttendanceRecords();
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to mark attendance');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return '-';
    try {
      // Parse the timestamp and convert to local time
      const date = new Date(time);
      if (isNaN(date.getTime())) return '-';
      
      // Format in 12-hour format with AM/PM for better readability
      return format(date, 'hh:mm a');
    } catch {
      return '-';
    }
  };

  const handleProcessAttendance = async () => {
    try {
      setIsSyncing(true);
      setIsProcessing(true);
      
      // Step 1: Sync from ESSL devices first
      console.log('Syncing attendance from devices...');
      const syncResponse = await fetch('/api/essl/sync-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Send empty object
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        console.log('Sync completed:', syncData);
        toast.success(`Synced ${syncData.totalRecords || 0} punch logs`);
      }
      
      setIsSyncing(false);
      
      // Step 2: Process attendance
      const response = await fetch('/api/hr/attendance/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // If no date selected, process all unprocessed dates
        body: JSON.stringify({ date: selectedDate || null })
      });

      if (!response.ok) throw new Error('Failed to process attendance');

      const data = await response.json();
      
      if (data.dates && data.dates.length > 0) {
        toast.success(`Processed ${data.processed} records across ${data.dates.length} dates`);
      } else {
        toast.success(data.message || `Processed attendance for ${data.processed} employees`);
      }
      
      // Refresh attendance records
      await fetchAttendanceRecords();
      
      // Close any open modals to prevent stale data issues
      setIsEditModalOpen(false);
      setIsViewModalOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error processing attendance:', error);
      toast.error('Failed to process attendance');
    } finally {
      setIsSyncing(false);
      setIsProcessing(false);
    }
  };

  const handleEditPunchLog = (punchLog: PunchLog) => {
    setSelectedPunchLog(punchLog);
    setPunchLogEditType(punchLog.punch_type as 'IN' | 'OUT' | 'BREAK');
    setIsEditPunchLogModalOpen(true);
  };

  const handleUpdatePunchLog = async () => {
    if (!selectedPunchLog) return;

    try {
      setIsUpdatingPunchLog(true);
      
      const response = await fetch(`/api/hr/attendance/punch-logs/${selectedPunchLog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          punch_type: punchLogEditType,
        }),
      });

      if (!response.ok) throw new Error('Failed to update punch log');

      await response.json();
      
      toast.success('Punch log updated successfully. Reprocess attendance to see changes.');
      setIsEditPunchLogModalOpen(false);
      setSelectedPunchLog(null);
      
      // Clear the cached punch logs to force refetch
      setEmployeePunchLogs({});
      
      // Refresh attendance records
      await fetchAttendanceRecords();
    } catch (error) {
      console.error('Error updating punch log:', error);
      toast.error('Failed to update punch log');
    } finally {
      setIsUpdatingPunchLog(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Attendance Management
          </h1>
          <p className="text-xs text-gray-600">Track employee attendance and working hours</p>
        </div>
      </div>

      {/* Floating Action Buttons - Bottom Right Corner */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-40">
        {/* Expanded Menu */}
        {isFabExpanded && (
          <div className="flex flex-col gap-2 mb-2 animate-in slide-in-from-bottom-2">
            <Button 
              onClick={() => {
                setIsCalendarOpen(!isCalendarOpen);
                setIsFabExpanded(false);
              }} 
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all rounded-full h-12 w-12 p-0"
              title="Calendar"
            >
              <Calendar className="h-5 w-5" />
            </Button>
            <Button 
              onClick={() => {
                handleProcessAttendance();
                setIsFabExpanded(false);
              }} 
              disabled={isProcessing || isSyncing}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all rounded-full h-12 w-12 p-0"
              title="Process Attendance"
            >
              <Clock className="h-5 w-5" />
            </Button>
            <Button 
              onClick={() => {
                setIsAddModalOpen(true);
                setIsFabExpanded(false);
              }} 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all rounded-full h-12 w-12 p-0"
              title="Mark Attendance"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        )}
        
        {/* Main FAB Button */}
        <Button 
          onClick={() => setIsFabExpanded(!isFabExpanded)}
          className={`bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all rounded-full h-14 w-14 p-0 ${
            isFabExpanded ? 'rotate-45' : ''
          }`}
          title="Actions"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
      {/* Main Content */}
      <div className="space-y-0">
        {/* Summary Cards - Full Width, No Gaps */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-0">
          <Card className="bg-gradient-to-br from-slate-600 to-slate-700 text-white border-0 rounded-none shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-xs font-medium text-slate-200">Total</CardTitle>
                <Users className="h-4 w-4 text-slate-300" />
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-slate-300 mt-0.5">Marked</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 rounded-none shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-xs font-medium text-green-100">Present</CardTitle>
                <UserCheck className="h-4 w-4 text-green-100" />
              </div>
              <div className="text-2xl font-bold">{stats.present}</div>
              <p className="text-xs text-green-100 mt-0.5">{stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}% attendance</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 rounded-none shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-xs font-medium text-orange-100">Late</CardTitle>
                <Clock className="h-4 w-4 text-orange-100" />
              </div>
              <div className="text-2xl font-bold">{stats.late}</div>
              <p className="text-xs text-orange-100 mt-0.5">Late arrivals</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0 rounded-none shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-xs font-medium text-yellow-100">Half Day</CardTitle>
                <Clock className="h-4 w-4 text-yellow-100" />
              </div>
              <div className="text-2xl font-bold">{stats.halfDay}</div>
              <p className="text-xs text-yellow-100 mt-0.5">Partial work</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 rounded-none shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-xs font-medium text-red-100">Absent</CardTitle>
                <UserX className="h-4 w-4 text-red-100" />
              </div>
              <div className="text-2xl font-bold">{stats.absent}</div>
              <p className="text-xs text-red-100 mt-0.5">Not present</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 rounded-none shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-xs font-medium text-blue-100">On Leave</CardTitle>
                <Calendar className="h-4 w-4 text-blue-100" />
              </div>
              <div className="text-2xl font-bold">{stats.onLeave}</div>
              <p className="text-xs text-blue-100 mt-0.5">Approved</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Table - Combined Card with No Gap */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 rounded-none shadow-none">
          {/* Filters Section */}
          <CardContent className="p-2 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                <Input
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-sm border-gray-300"
                />
              </div>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto md:w-40 h-8 text-sm border-gray-300"
              />
              <Select value={selectedEmployee || 'ALL'} onValueChange={(value) => setSelectedEmployee(value === 'ALL' ? '' : value)}>
                <SelectTrigger className="w-full md:w-44 h-8 text-sm border-gray-300">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                  setSelectedEmployee('');
                  setSearchTerm('');
                }}
                className="whitespace-nowrap h-8 text-sm"
              >
                Clear
              </Button>
            </div>
          </CardContent>

          {/* Attendance Records Table - Same Card */}
          <CardHeader className="pb-2 pt-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">Attendance Records</CardTitle>
              <Badge variant="outline" className="text-xs">
                {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <Clock className="h-8 w-8 text-gray-400 mx-auto mb-3 animate-spin" />
              <p className="text-gray-600">Loading attendance records...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
              <p className="text-gray-600 text-sm">
                {searchTerm || selectedEmployee || selectedDate !== format(new Date(), 'yyyy-MM-dd')
                  ? 'Try adjusting your search criteria.'
                  : 'Start by marking attendance for today.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150">
                    <TableHead className="w-10 font-semibold"></TableHead>
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Check In</TableHead>
                    <TableHead className="font-semibold">Break Start</TableHead>
                    <TableHead className="font-semibold">Break End</TableHead>
                    <TableHead className="font-semibold">Check Out</TableHead>
                    <TableHead className="font-semibold">Breaks</TableHead>
                    <TableHead className="font-semibold">Hours</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => {
                    const rowKey = `${record.employee_id}_${record.date}`;
                    const isExpanded = expandedEmployeeRows.has(rowKey);
                    const punchLogs = employeePunchLogs[rowKey] || [];
                    const isLoadingLogs = loadingPunchLogs.has(rowKey);

                    return (
                      <React.Fragment key={record.id}>
                    <TableRow 
                      className="hover:bg-blue-50/50 transition-colors border-b border-gray-100 cursor-pointer"
                      onClick={() => toggleEmployeeRow(record.employee_id, record.date)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                            record.status === 'present' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                            record.status === 'late' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                            record.status === 'absent' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                            record.status === 'half_day' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                            'bg-gradient-to-br from-blue-500 to-blue-600'
                          }`}>
                            {record.employee.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{record.employee.name}</div>
                            <div className="text-xs text-gray-500">
                              {record.employee.employee_id} • {record.employee.department}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {format(new Date(record.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {formatTime(record.check_in_time)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-orange-600">
                        {formatTime(record.break_start_time)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-green-600">
                        {formatTime(record.break_end_time)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900">
                        {formatTime(record.check_out_time)}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-amber-600">
                        {(() => {
                          if (record.break_start_time && record.break_end_time) {
                            try {
                              const breakStart = new Date(record.break_start_time);
                              const breakEnd = new Date(record.break_end_time);
                              const breakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60));
                              if (breakMinutes > 0) {
                                const hours = Math.floor(breakMinutes / 60);
                                const mins = breakMinutes % 60;
                                return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                              }
                            } catch {
                              return '-';
                            }
                          }
                          return '-';
                        })()}
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-gray-900">
                        {record.total_hours ? `${record.total_hours.toFixed(1)}h` : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(record.status)} font-medium`}>
                          <span className="flex items-center gap-1.5">
                            {getStatusIcon(record.status)}
                            {record.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewRecord(record);
                            }}
                            className="h-8 w-8 p-0 hover:bg-blue-100"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRecord(record);
                            }}
                            className="h-8 w-8 p-0 hover:bg-purple-100"
                            title="Edit Attendance"
                          >
                            <Edit className="h-4 w-4 text-purple-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Punch Logs Section */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={11} className="bg-gray-50 p-0 border-b-2 border-blue-200">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                Punch Logs for {record.employee.name}
                                {punchLogs.length > 0 && (
                                  <Badge className="ml-2 bg-blue-100 text-blue-800">
                                    {punchLogs.length} {punchLogs.length === 1 ? 'punch' : 'punches'}
                                  </Badge>
                                )}
                              </h4>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const response = await fetch('/api/hr/attendance/process', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ 
                                        date: record.date,
                                        employeeId: record.employee_id 
                                      })
                                    });
                                    
                                    if (!response.ok) throw new Error('Failed to reprocess');
                                    
                                    toast.success('Attendance reprocessed successfully');
                                    await fetchAttendanceRecords();
                                    
                                    // Clear cached punch logs to force refetch
                                    const key = `${record.employee_id}_${record.date}`;
                                    setEmployeePunchLogs(prev => {
                                      const newLogs = { ...prev };
                                      delete newLogs[key];
                                      return newLogs;
                                    });
                                    
                                    // Refetch punch logs
                                    await fetchEmployeePunchLogs(record.employee_id, record.date);
                                  } catch (error) {
                                    console.error('Error reprocessing:', error);
                                    toast.error('Failed to reprocess attendance');
                                  }
                                }}
                                className="h-7 text-xs"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Reprocess
                              </Button>
                            </div>

                            {isLoadingLogs ? (
                              <div className="text-center py-8">
                                <Clock className="h-6 w-6 text-gray-400 mx-auto mb-2 animate-spin" />
                                <p className="text-sm text-gray-600">Loading punch logs...</p>
                              </div>
                            ) : punchLogs.length === 0 ? (
                              <div className="text-center py-8">
                                <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">No punch logs found for this date</p>
                              </div>
                            ) : (
                              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
                                  <p className="text-xs text-blue-800">
                                    <strong>Note:</strong> First IN punch is used as Check-In, Last OUT punch as Check-Out
                                  </p>
                                </div>
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-100">
                                      <TableHead className="text-xs font-semibold">Date</TableHead>
                                      <TableHead className="text-xs font-semibold">Time</TableHead>
                                      <TableHead className="text-xs font-semibold">Type</TableHead>
                                      <TableHead className="text-xs font-semibold">Used As</TableHead>
                                      <TableHead className="text-xs font-semibold">Verification</TableHead>
                                      <TableHead className="text-xs font-semibold">Quality</TableHead>
                                      <TableHead className="text-xs font-semibold">Device</TableHead>
                                      <TableHead className="text-xs font-semibold">Processed</TableHead>
                                      <TableHead className="text-xs font-semibold">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {punchLogs.map((punch) => {
                                      // Find first IN and last OUT
                                      const inPunches = punchLogs.filter(p => p.punch_type === 'IN');
                                      const outPunches = punchLogs.filter(p => p.punch_type === 'OUT');
                                      const firstInPunch = inPunches.length > 0 ? inPunches[0] : null;
                                      const lastOutPunch = outPunches.length > 0 ? outPunches[outPunches.length - 1] : null;
                                      
                                      let usedAs = '-';
                                      if (punch.punch_type === 'IN' && firstInPunch && punch.id === firstInPunch.id) {
                                        usedAs = 'Check-In';
                                      } else if (punch.punch_type === 'OUT' && lastOutPunch && punch.id === lastOutPunch.id) {
                                        usedAs = 'Check-Out';
                                      }
                                      
                                      return (
                                      <TableRow 
                                        key={punch.id} 
                                        className={`hover:bg-gray-50 ${
                                          usedAs !== '-' ? 'bg-yellow-50 border-l-4 border-l-yellow-500' : ''
                                        }`}
                                      >
                                        <TableCell className="text-xs font-medium text-gray-700">
                                          {format(new Date(punch.punch_time), 'MMM dd, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">
                                          {formatTime(punch.punch_time)}
                                        </TableCell>
                                        <TableCell>
                                          <Badge className={`text-xs ${getPunchTypeColor(punch.punch_type)}`}>
                                            {punch.punch_type}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {usedAs !== '-' && (
                                            <Badge className="text-xs bg-yellow-100 text-yellow-800 border border-yellow-300">
                                              {usedAs}
                                            </Badge>
                                          )}
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-700">
                                          {punch.verification_method}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                          <span className={`font-semibold ${
                                            punch.verification_quality >= 80 ? 'text-green-600' :
                                            punch.verification_quality >= 60 ? 'text-orange-600' :
                                            'text-red-600'
                                          }`}>
                                            {punch.verification_quality}%
                                          </span>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-700">
                                          {punch.device.device_name}
                                          <div className="text-gray-500">{punch.device.ip_address}</div>
                                        </TableCell>
                                        <TableCell>
                                          <Badge className={`text-xs ${
                                            punch.processed 
                                              ? 'bg-green-100 text-green-800' 
                                              : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {punch.processed ? 'Yes' : 'Pending'}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditPunchLog(punch);
                                            }}
                                            className="h-7 w-7 p-0"
                                            title="Edit punch type"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Floating Calendar Panel - Right Side */}
      {isCalendarOpen && (
        <div 
          className="fixed inset-0 z-50 pointer-events-none"
          onMouseLeave={() => setIsCalendarOpen(false)}
        >
          <div className="absolute right-0 top-0 bottom-0 w-96 pointer-events-auto">
            <div className="h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col">
              {/* Calendar Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Attendance Calendar
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCalendarOpen(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Calendar Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <AttendanceCalendar
                  attendanceRecords={attendanceRecords}
                  selectedDate={selectedDate}
                  onDateSelect={(date) => setSelectedDate(date)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Record Modal - Professional Design */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 -m-6 mb-6 p-6 rounded-t-lg">
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Attendance Record Details
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              {/* Employee Info Card */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {selectedRecord.employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{selectedRecord.employee.name}</h3>
                    <p className="text-sm text-gray-600">{selectedRecord.employee.employee_id} • {selectedRecord.employee.department}</p>
                    <p className="text-sm text-gray-500">{selectedRecord.employee.position}</p>
                  </div>
                  <Badge className={`${getStatusColor(selectedRecord.status)} text-sm px-3 py-1`}>
                    {selectedRecord.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Attendance Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <label className="text-xs font-medium text-gray-500 uppercase">Date</label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {format(new Date(selectedRecord.date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <label className="text-xs font-medium text-gray-500 uppercase">Check In</label>
                  <p className="text-lg font-semibold text-green-600 mt-1">{formatTime(selectedRecord.check_in_time)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <label className="text-xs font-medium text-gray-500 uppercase">Check Out</label>
                  <p className="text-lg font-semibold text-red-600 mt-1">{formatTime(selectedRecord.check_out_time)}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <label className="text-xs font-medium text-gray-500 uppercase">Total Hours</label>
                  <p className="text-lg font-semibold text-blue-600 mt-1">
                    {selectedRecord.total_hours ? `${selectedRecord.total_hours.toFixed(1)}h` : '-'}
                  </p>
                </div>
              </div>

              {selectedRecord.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <label className="text-sm font-semibold text-yellow-900 flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4" />
                    Notes
                  </label>
                  <p className="text-sm text-gray-700">{selectedRecord.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEditRecord(selectedRecord);
                  }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Record
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Attendance Modal - Professional Design */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-gradient-to-r from-purple-600 to-blue-600 -m-6 mb-6 p-6 rounded-t-lg">
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Attendance Record
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedRecord.employee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedRecord.employee.name}</p>
                    <p className="text-xs text-gray-600">{format(new Date(selectedRecord.date), 'MMMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Check In Time</label>
                  <Input
                    type="time"
                    value={editFormData.check_in_time}
                    onChange={(e) => setEditFormData({ ...editFormData, check_in_time: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Check Out Time</label>
                  <Input
                    type="time"
                    value={editFormData.check_out_time}
                    onChange={(e) => setEditFormData({ ...editFormData, check_out_time: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={editFormData.status} onValueChange={(value) => setEditFormData({ ...editFormData, status: value as AttendanceRecord['status'] })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Notes (Optional)</label>
                <Input
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Add any notes about this attendance record..."
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isUpdatingAttendance}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateAttendance}
                  disabled={isUpdatingAttendance}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isUpdatingAttendance ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Attendance Modal - Professional Design */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-green-600 to-blue-600 -m-6 mb-6 p-6 rounded-t-lg">
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Mark Attendance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Employee *
              </label>
              <Select
                value={addFormData.employee_id}
                onValueChange={(value) => setAddFormData({ ...addFormData, employee_id: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{employee.name}</span>
                        <span className="text-xs text-gray-500">
                          {employee.employee_id} • {employee.department} • {employee.position}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </label>
              <Input
                type="date"
                value={addFormData.date}
                onChange={(e) => setAddFormData({ ...addFormData, date: e.target.value })}
                className="w-full"
              />
            </div>

            {/* Time Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Check In Time
                </label>
                <Input
                  type="time"
                  value={addFormData.check_in_time}
                  onChange={(e) => setAddFormData({ ...addFormData, check_in_time: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Check Out Time
                </label>
                <Input
                  type="time"
                  value={addFormData.check_out_time}
                  onChange={(e) => setAddFormData({ ...addFormData, check_out_time: e.target.value })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Status Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Status *
              </label>
              <Select
                value={addFormData.status}
                onValueChange={(value) => setAddFormData({ ...addFormData, status: value as AttendanceRecord['status'] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Present
                    </div>
                  </SelectItem>
                  <SelectItem value="late">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      Late
                    </div>
                  </SelectItem>
                  <SelectItem value="absent">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      Absent
                    </div>
                  </SelectItem>
                  <SelectItem value="half_day">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      Half Day
                    </div>
                  </SelectItem>
                  <SelectItem value="on_leave">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      On Leave
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Notes
              </label>
              <Input
                value={addFormData.notes}
                onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                placeholder="Optional notes about this attendance record..."
                className="w-full"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">Manual Attendance Entry</p>
                  <p className="text-xs text-blue-700">
                    This will create a manual attendance record. Check-in and check-out times are optional. 
                    If not provided, the system will only track the attendance status for the day.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                variant="outline"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddFormData({
                    employee_id: '',
                    date: format(new Date(), 'yyyy-MM-dd'),
                    check_in_time: '',
                    check_out_time: '',
                    status: 'present',
                    notes: ''
                  });
                }}
                disabled={isSubmittingAttendance}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleMarkAttendance}
                disabled={isSubmittingAttendance || !addFormData.employee_id || !addFormData.date}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {isSubmittingAttendance ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Marking...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Mark Attendance
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Punch Log Modal */}
      <Dialog open={isEditPunchLogModalOpen} onOpenChange={setIsEditPunchLogModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-gradient-to-r from-orange-600 to-red-600 -m-6 mb-6 p-6 rounded-t-lg">
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Punch Type
            </DialogTitle>
          </DialogHeader>
          
          {selectedPunchLog && (
            <div className="space-y-6">
              {/* Punch Log Details */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Time:</span>
                    <span className="text-sm font-semibold">
                      {format(new Date(selectedPunchLog.punch_time), 'MMM dd, yyyy hh:mm a')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Device:</span>
                    <span className="text-sm font-semibold">{selectedPunchLog.device.device_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Type:</span>
                    <Badge className={`text-xs ${getPunchTypeColor(selectedPunchLog.punch_type)}`}>
                      {selectedPunchLog.punch_type}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Punch Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  New Punch Type *
                </label>
                <Select
                  value={punchLogEditType}
                  onValueChange={(value: 'IN' | 'OUT' | 'BREAK') => setPunchLogEditType(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">IN</Badge>
                        <span>Check In</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="OUT">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-800">OUT</Badge>
                        <span>Check Out</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="BREAK">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-100 text-orange-800">BREAK</Badge>
                        <span>Break</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-yellow-900">Important</p>
                    <p className="text-xs text-yellow-700">
                      Changing the punch type will affect attendance calculations. 
                      Make sure to reprocess attendance after making changes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline"
                  onClick={() => setIsEditPunchLogModalOpen(false)}
                  disabled={isUpdatingPunchLog}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdatePunchLog}
                  disabled={isUpdatingPunchLog}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  {isUpdatingPunchLog ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Punch Type
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Wrapper component with Suspense boundary
export default function AttendancePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance...</p>
        </div>
      </div>
    }>
      <AttendancePageContent />
    </Suspense>
  );
}
