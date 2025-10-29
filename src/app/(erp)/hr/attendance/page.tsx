'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, UserCheck, UserX, Search, Plus, Eye, Edit, ChevronLeft, ChevronRight, X, MessageSquare, Save } from 'lucide-react';
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

export default function AttendancePage() {
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
  const [editFormData, setEditFormData] = useState({
    check_in_time: '',
    check_out_time: '',
    status: 'present' as AttendanceRecord['status'],
    notes: ''
  });

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

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
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

      if (!response.ok) throw new Error('Failed to update attendance');

      toast.success('Attendance updated successfully');
      setIsEditModalOpen(false);
      fetchAttendanceRecords();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
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
    } catch (error) {
      console.error('Error processing attendance:', error);
      toast.error('Failed to process attendance');
    } finally {
      setIsSyncing(false);
      setIsProcessing(false);
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
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        <Button 
          onClick={() => setIsCalendarOpen(!isCalendarOpen)} 
          className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all"
          size="sm"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Calendar
        </Button>
        <Button 
          onClick={handleProcessAttendance} 
          disabled={isProcessing || isSyncing}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all"
          size="sm"
        >
          <Clock className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processing...' : isSyncing ? 'Syncing...' : 'Process'}
        </Button>
        <Button 
          onClick={() => setIsAddModalOpen(true)} 
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Mark
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
                    <TableHead className="font-semibold">Employee</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Check In</TableHead>
                    <TableHead className="font-semibold">Check Out</TableHead>
                    <TableHead className="font-semibold">Hours</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-100">
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
                      <TableCell className="text-sm font-medium text-gray-900">
                        {formatTime(record.check_out_time)}
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
                            onClick={() => handleViewRecord(record)}
                            className="h-8 w-8 p-0 hover:bg-blue-100"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditRecord(record)}
                            className="h-8 w-8 p-0 hover:bg-purple-100"
                            title="Edit Attendance"
                          >
                            <Edit className="h-4 w-4 text-purple-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateAttendance}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Attendance Modal - Professional Design */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-gradient-to-r from-green-600 to-blue-600 -m-6 mb-6 p-6 rounded-t-lg">
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Mark Attendance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manual Attendance Form</h3>
              <p className="text-sm text-gray-600 mb-4">This feature allows you to manually mark attendance for employees</p>
              <p className="text-xs text-gray-500">Form implementation coming soon...</p>
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
