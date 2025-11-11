'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock, MapPin, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PunchLog {
  id: string;
  punch_time: string;
  punch_type: 'IN' | 'OUT' | 'BREAK';
  verification_method: string;
  verification_quality: number;
  device: {
    device_name: string;
    ip_address: string;
  };
  processed: boolean;
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

interface EmployeeDetails {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  position: string;
  email?: string;
  phone?: string;
}

export default function EmployeeAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.employeeId as string;
  
  const [employee, setEmployee] = useState<EmployeeDetails | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [punchLogs, setPunchLogs] = useState<Record<string, PunchLog[]>>({});
  const [loadingPunchLogs, setLoadingPunchLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeDetails();
      fetchAttendanceRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, selectedMonth]);

  const fetchEmployeeDetails = async () => {
    try {
      const response = await fetch(`/api/hr/employees/${employeeId}`);
      if (!response.ok) throw new Error('Failed to fetch employee details');
      const data = await response.json();
      setEmployee(data);
    } catch (error) {
      console.error('Error fetching employee:', error);
      toast.error('Failed to load employee details');
    }
  };

  const fetchAttendanceRecords = async () => {
    try {
      setIsLoading(true);
      const [year, month] = selectedMonth.split('-');
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

      const response = await fetch(
        `/api/hr/attendance?employee_id=${employeeId}&start_date=${startDate}&end_date=${endDate}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch attendance records');
      
      const data = await response.json();
      setAttendanceRecords(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Failed to load attendance records');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPunchLogs = async (date: string) => {
    const key = `${employeeId}_${date}`;
    
    if (loadingPunchLogs.has(key) || punchLogs[key]) {
      return;
    }

    try {
      setLoadingPunchLogs(prev => new Set(prev).add(key));
      
      const response = await fetch(
        `/api/hr/attendance/punch-logs?employee_id=${employeeId}&date=${date}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch punch logs');
      
      const data = await response.json();
      
      setPunchLogs(prev => ({
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
  };

  const toggleDateExpansion = (date: string) => {
    const newExpanded = new Set(expandedDates);
    
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
      fetchPunchLogs(date);
    }
    setExpandedDates(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 border-green-300';
      case 'late': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'absent': return 'bg-red-100 text-red-800 border-red-300';
      case 'half_day': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'on_leave': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPunchTypeColor = (type: string) => {
    switch (type) {
      case 'IN': return 'bg-green-100 text-green-800';
      case 'OUT': return 'bg-red-100 text-red-800';
      case 'BREAK': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    try {
      return format(new Date(time), 'hh:mm a');
    } catch {
      return '-';
    }
  };

  // Calculate statistics
  const stats = {
    totalDays: attendanceRecords.length,
    presentDays: attendanceRecords.filter(r => r.status === 'present' || r.status === 'late').length,
    absentDays: attendanceRecords.filter(r => r.status === 'absent').length,
    lateDays: attendanceRecords.filter(r => r.status === 'late').length,
    onLeave: attendanceRecords.filter(r => r.status === 'on_leave').length,
    totalHours: attendanceRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0),
  };

  const attendancePercentage = stats.totalDays > 0 
    ? ((stats.presentDays / stats.totalDays) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
              {employee?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{employee?.name || 'Loading...'}</h1>
              <p className="text-gray-600">{employee?.employee_id} • {employee?.department}</p>
              <p className="text-sm text-gray-500">{employee?.position}</p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-48"
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Total Days</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalDays}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Present</p>
            <p className="text-2xl font-bold text-green-600">{stats.presentDays}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-600">{stats.absentDays}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Late</p>
            <p className="text-2xl font-bold text-orange-600">{stats.lateDays}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">On Leave</p>
            <p className="text-2xl font-bold text-blue-600">{stats.onLeave}</p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Attendance</p>
            <p className="text-2xl font-bold text-purple-600">{attendancePercentage}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Records */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>
            Attendance Records - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-600">Loading attendance records...</p>
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No attendance records found</p>
              <p className="text-sm">No records for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {attendanceRecords.map((record) => {
                const isExpanded = expandedDates.has(record.date);
                const logsKey = `${employeeId}_${record.date}`;
                const dayPunchLogs = punchLogs[logsKey] || [];
                const isLoadingLogs = loadingPunchLogs.has(logsKey);

                return (
                  <div key={record.id} className="border rounded-lg overflow-hidden">
                    {/* Main Row */}
                    <div
                      className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleDateExpansion(record.date)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2 w-32">
                          <ChevronDown
                            className={`h-4 w-4 text-gray-400 transition-transform ${
                              isExpanded ? '' : '-rotate-90'
                            }`}
                          />
                          <span className="font-semibold text-gray-900">
                            {format(new Date(record.date), 'MMM dd, yyyy')}
                          </span>
                        </div>

                        <div className="flex items-center gap-6 flex-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-gray-600">In: {formatTime(record.check_in_time)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-gray-600">Out: {formatTime(record.check_out_time)}</span>
                          </div>
                          {record.total_hours && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium text-blue-600">
                                {record.total_hours.toFixed(1)}h
                              </span>
                            </div>
                          )}
                        </div>

                        <Badge className={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Expanded Punch Logs */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4">
                        <h4 className="font-semibold text-sm text-gray-900 mb-3">Punch Log Details</h4>
                        
                        {isLoadingLogs ? (
                          <div className="text-center py-4">
                            <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                          </div>
                        ) : dayPunchLogs.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No punch logs available</p>
                        ) : (
                          <div className="space-y-2">
                            {dayPunchLogs.map((log) => (
                              <div
                                key={log.id}
                                className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-4">
                                  <Badge className={getPunchTypeColor(log.punch_type)}>
                                    {log.punch_type}
                                  </Badge>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="font-medium text-gray-900">
                                      {format(new Date(log.punch_time), 'hh:mm:ss a')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                      {log.device.device_name}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>{log.verification_method}</span>
                                  <span>Quality: {log.verification_quality}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
