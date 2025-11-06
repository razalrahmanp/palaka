'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Clock, Save, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface WorkScheduleProps {
  employeeId: string;
  employeeName: string;
}

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function EmployeeWorkSchedule({ employeeId, employeeName }: WorkScheduleProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState({
    work_start_time: '09:00',
    work_end_time: '18:00',
    work_hours_per_day: 8,
    working_days_per_week: 6,
    weekly_off_days: [0] as number[],
    break_duration_minutes: 60,
    grace_period_minutes: 15,
    overtime_eligible: true,
    overtime_rate_multiplier: 1.5,
  });

  useEffect(() => {
    const fetchWorkSchedule = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/hr/employees/${employeeId}/work-schedule`);
        if (!response.ok) throw new Error('Failed to fetch work schedule');
        
        const data = await response.json();
        
        setSchedule({
          work_start_time: data.work_start_time || '09:00',
          work_end_time: data.work_end_time || '18:00',
          work_hours_per_day: data.work_hours_per_day || 8,
          working_days_per_week: data.working_days_per_week || 6,
          weekly_off_days: data.weekly_off_days || [0],
          break_duration_minutes: data.break_duration_minutes || 60,
          grace_period_minutes: data.grace_period_minutes || 15,
          overtime_eligible: data.overtime_eligible ?? true,
          overtime_rate_multiplier: data.overtime_rate_multiplier || 1.5,
        });
      } catch (error) {
        console.error('Error fetching work schedule:', error);
        toast.error('Failed to load work schedule');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkSchedule();
  }, [employeeId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/hr/employees/${employeeId}/work-schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });

      if (!response.ok) throw new Error('Failed to update work schedule');

      toast.success('Work schedule updated successfully');
    } catch (error) {
      console.error('Error saving work schedule:', error);
      toast.error('Failed to save work schedule');
    } finally {
      setSaving(false);
    }
  };

  const toggleWeeklyOff = (dayValue: number) => {
    setSchedule(prev => {
      const newOffDays = prev.weekly_off_days.includes(dayValue)
        ? prev.weekly_off_days.filter(d => d !== dayValue)
        : [...prev.weekly_off_days, dayValue];
      
      return {
        ...prev,
        weekly_off_days: newOffDays,
        working_days_per_week: 7 - newOffDays.length,
      };
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Loading work schedule...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600">
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Work Schedule for {employeeName}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Working Hours */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-sm font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Working Hours
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="work_start_time" className="text-xs text-gray-700">
                Start Time
              </Label>
              <Input
                id="work_start_time"
                type="time"
                value={schedule.work_start_time}
                onChange={(e) => setSchedule({ ...schedule, work_start_time: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="work_end_time" className="text-xs text-gray-700">
                End Time
              </Label>
              <Input
                id="work_end_time"
                type="time"
                value={schedule.work_end_time}
                onChange={(e) => setSchedule({ ...schedule, work_end_time: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="work_hours_per_day" className="text-xs text-gray-700">
                Hours Per Day
              </Label>
              <Input
                id="work_hours_per_day"
                type="number"
                step="0.5"
                min="1"
                max="24"
                value={schedule.work_hours_per_day}
                onChange={(e) => setSchedule({ ...schedule, work_hours_per_day: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="text-sm font-semibold text-purple-900 mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weekly Schedule
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-700">Working Days Per Week</Label>
              <Badge variant="outline" className="text-sm">
                {schedule.working_days_per_week} days
              </Badge>
            </div>
            <div>
              <Label className="text-xs text-gray-700 mb-2 block">Weekly Off Days</Label>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    onClick={() => toggleWeeklyOff(day.value)}
                    className={`
                      px-3 py-2 rounded-lg text-xs font-medium transition-all
                      ${schedule.weekly_off_days.includes(day.value)
                        ? 'bg-red-500 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    {day.label.substring(0, 3)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click to toggle weekly off days (red = off day)
              </p>
            </div>
          </div>
        </div>

        {/* Break & Grace Period */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="text-sm font-semibold text-green-900 mb-4">
            Break & Grace Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="break_duration_minutes" className="text-xs text-gray-700">
                Break Duration (minutes)
              </Label>
              <Input
                id="break_duration_minutes"
                type="number"
                step="15"
                min="0"
                max="180"
                value={schedule.break_duration_minutes}
                onChange={(e) => setSchedule({ ...schedule, break_duration_minutes: parseInt(e.target.value) })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                {(schedule.break_duration_minutes / 60).toFixed(1)} hours
              </p>
            </div>
            <div>
              <Label htmlFor="grace_period_minutes" className="text-xs text-gray-700">
                Grace Period (minutes)
              </Label>
              <Input
                id="grace_period_minutes"
                type="number"
                step="5"
                min="0"
                max="60"
                value={schedule.grace_period_minutes}
                onChange={(e) => setSchedule({ ...schedule, grace_period_minutes: parseInt(e.target.value) })}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Late if check-in after {schedule.grace_period_minutes} minutes
              </p>
            </div>
          </div>
        </div>

        {/* Overtime Settings */}
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <h3 className="text-sm font-semibold text-orange-900 mb-4">
            Overtime Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="overtime_eligible" className="text-sm text-gray-900">
                  Overtime Eligible
                </Label>
                <p className="text-xs text-gray-600">
                  Can this employee earn overtime pay?
                </p>
              </div>
              <Switch
                id="overtime_eligible"
                checked={schedule.overtime_eligible}
                onCheckedChange={(checked) => setSchedule({ ...schedule, overtime_eligible: checked })}
              />
            </div>
            {schedule.overtime_eligible && (
              <div>
                <Label htmlFor="overtime_rate_multiplier" className="text-xs text-gray-700">
                  Overtime Rate Multiplier
                </Label>
                <Input
                  id="overtime_rate_multiplier"
                  type="number"
                  step="0.1"
                  min="1"
                  max="3"
                  value={schedule.overtime_rate_multiplier}
                  onChange={(e) => setSchedule({ ...schedule, overtime_rate_multiplier: parseFloat(e.target.value) })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Overtime pay = Regular hourly rate × {schedule.overtime_rate_multiplier}x
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Schedule Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-gray-600">Daily Hours</p>
              <p className="font-semibold text-gray-900">{schedule.work_hours_per_day}h</p>
            </div>
            <div>
              <p className="text-gray-600">Weekly Hours</p>
              <p className="font-semibold text-gray-900">
                {(schedule.work_hours_per_day * schedule.working_days_per_week).toFixed(1)}h
              </p>
            </div>
            <div>
              <p className="text-gray-600">Monthly Hours</p>
              <p className="font-semibold text-gray-900">
                {(schedule.work_hours_per_day * schedule.working_days_per_week * 4.33).toFixed(0)}h
              </p>
            </div>
            <div>
              <p className="text-gray-600">Overtime Rate</p>
              <p className="font-semibold text-gray-900">
                {schedule.overtime_eligible ? `${schedule.overtime_rate_multiplier}x` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Work Schedule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
