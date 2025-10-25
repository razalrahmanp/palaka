'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Users, UserCheck, UserX, Search, Plus, Eye, Edit, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasAutoProcessed, setHasAutoProcessed] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

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
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayRecords = attendanceRecords.filter(record => record.date === today);
    
    return {
      total: todayRecords.length,
      present: todayRecords.filter(r => r.status === 'present').length,
      absent: todayRecords.filter(r => r.status === 'absent').length,
      late: todayRecords.filter(r => r.status === 'late').length,
      onLeave: todayRecords.filter(r => r.status === 'on_leave').length
    };
  };

  const stats = getTodayStats();

  const handleViewRecord = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
          <p className="text-gray-600 mt-1">Track employee attendance and working hours</p>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-40">
        <Button 
          onClick={() => setIsCalendarOpen(!isCalendarOpen)} 
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
          size="lg"
        >
          <Calendar className="h-5 w-5 mr-2" />
          Calendar
        </Button>
        <Button 
          onClick={handleProcessAttendance} 
          disabled={isProcessing || isSyncing}
          className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all"
          size="lg"
        >
          <Clock className="h-5 w-5 mr-2" />
          {isProcessing ? 'Processing...' : isSyncing ? 'Syncing...' : 'Process Attendance'}
        </Button>
        <Button 
          onClick={() => setIsAddModalOpen(true)} 
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Mark Attendance
        </Button>
      </div>

      {/* Main Content - Full Width */}
      <div className="space-y-6">
          {/* Today's Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Marked today</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.present}</div>
                <p className="text-xs text-muted-foreground">Currently present</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
                <p className="text-xs text-muted-foreground">Absent today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.late}</div>
                <p className="text-xs text-muted-foreground">Late arrivals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Leave</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.onLeave}</div>
                <p className="text-xs text-muted-foreground">On approved leave</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by employee name, ID, or department..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
                <Select value={selectedEmployee || undefined} onValueChange={(value) => setSelectedEmployee(value === 'ALL' ? '' : value)}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All employees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} ({employee.employee_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                    setSelectedEmployee('');
                    setSearchTerm('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

      {/* Attendance Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading attendance records...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.employee.name}</div>
                        <div className="text-sm text-gray-500">
                          {record.employee.employee_id} • {record.employee.department}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{formatTime(record.check_in_time)}</TableCell>
                    <TableCell>{formatTime(record.check_out_time)}</TableCell>
                    <TableCell>
                      {record.total_hours ? `${record.total_hours.toFixed(1)}h` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(record.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(record.status)}
                          {record.status.replace('_', ' ')}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewRecord(record)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filteredRecords.length === 0 && (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedEmployee || selectedDate !== format(new Date(), 'yyyy-MM-dd')
                  ? 'Try adjusting your search criteria.'
                  : 'Start by marking attendance for today.'}
              </p>
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

      {/* View Record Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attendance Record Details</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Employee</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedRecord.employee.name}</p>
                    <p className="text-xs text-gray-500">{selectedRecord.employee.employee_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Department</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedRecord.employee.department}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Position</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedRecord.employee.position}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {format(new Date(selectedRecord.date), 'MMMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Check In Time</label>
                    <p className="text-sm text-gray-900 mt-1">{formatTime(selectedRecord.check_in_time)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Check Out Time</label>
                    <p className="text-sm text-gray-900 mt-1">{formatTime(selectedRecord.check_out_time)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total Hours</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedRecord.total_hours ? `${selectedRecord.total_hours.toFixed(1)} hours` : 'Not calculated'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(selectedRecord.status)}>
                        {selectedRecord.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              {selectedRecord.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">
                    {selectedRecord.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Attendance Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mark Attendance</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-gray-600">Attendance marking form will be implemented here.</p>
            <Button 
              onClick={() => setIsAddModalOpen(false)} 
              className="mt-4"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
