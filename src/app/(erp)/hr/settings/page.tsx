'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Settings as SettingsIcon, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveType {
  id: string;
  name: string;
  description: string;
  max_days_per_year: number;
  carry_forward_allowed: boolean;
  is_active: boolean;
  created_at: string;
}

export default function HRSettingsPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLeaveTypeDialogOpen, setIsLeaveTypeDialogOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);

  const [leaveTypeFormData, setLeaveTypeFormData] = useState({
    name: '',
    description: '',
    max_days_per_year: '',
    carry_forward_allowed: false,
  });

  const [generalSettings, setGeneralSettings] = useState({
    working_days_per_week: '5',
    working_hours_per_day: '8',
    overtime_multiplier: '1.5',
    late_arrival_threshold: '15',
    early_departure_threshold: '15',
    attendance_grace_period: '10',
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/hr/leave-types');
      if (!response.ok) throw new Error('Failed to fetch leave types');
      const result = await response.json();
      setLeaveTypes(result.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load leave types');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = '/api/hr/leave-types';
      const method = editingLeaveType ? 'PUT' : 'POST';
      const payload = editingLeaveType
        ? { id: editingLeaveType.id, ...leaveTypeFormData }
        : leaveTypeFormData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save leave type');

      toast.success(editingLeaveType ? 'Leave type updated' : 'Leave type created');
      setIsLeaveTypeDialogOpen(false);
      resetLeaveTypeForm();
      fetchLeaveTypes();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save leave type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
    setLeaveTypeFormData({
      name: leaveType.name,
      description: leaveType.description || '',
      max_days_per_year: leaveType.max_days_per_year.toString(),
      carry_forward_allowed: leaveType.carry_forward_allowed,
    });
    setIsLeaveTypeDialogOpen(true);
  };

  const resetLeaveTypeForm = () => {
    setLeaveTypeFormData({
      name: '',
      description: '',
      max_days_per_year: '',
      carry_forward_allowed: false,
    });
    setEditingLeaveType(null);
  };

  const handleSaveGeneralSettings = () => {
    toast.success('General settings saved');
    // In production, this would save to backend
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              HR Settings
            </h1>
            <p className="text-gray-600 mt-2">Configure HR policies, leave types, and system settings</p>
          </div>
          <SettingsIcon className="h-10 w-10 text-blue-600" />
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="leave-types" className="space-y-6">
        <TabsList>
          <TabsTrigger value="leave-types">Leave Types</TabsTrigger>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="leave-types">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leave Types</CardTitle>
                  <CardDescription>Manage leave categories and policies</CardDescription>
                </div>
                <Dialog open={isLeaveTypeDialogOpen} onOpenChange={setIsLeaveTypeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Leave Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingLeaveType ? 'Edit' : 'Add'} Leave Type</DialogTitle>
                      <DialogDescription>Configure leave type settings</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveLeaveType} className="space-y-4">
                      <div>
                        <Label>Leave Type Name</Label>
                        <Input
                          value={leaveTypeFormData.name}
                          onChange={(e) => setLeaveTypeFormData({ ...leaveTypeFormData, name: e.target.value })}
                          placeholder="e.g., Annual Leave, Sick Leave"
                          required
                        />
                      </div>

                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={leaveTypeFormData.description}
                          onChange={(e) => setLeaveTypeFormData({ ...leaveTypeFormData, description: e.target.value })}
                          placeholder="Leave type description..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>Maximum Days Per Year</Label>
                        <Input
                          type="number"
                          value={leaveTypeFormData.max_days_per_year}
                          onChange={(e) => setLeaveTypeFormData({ ...leaveTypeFormData, max_days_per_year: e.target.value })}
                          placeholder="12"
                          required
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Allow Carry Forward</Label>
                          <p className="text-xs text-gray-500">
                            Unused days can be carried to next year
                          </p>
                        </div>
                        <Switch
                          checked={leaveTypeFormData.carry_forward_allowed}
                          onCheckedChange={(checked) => 
                            setLeaveTypeFormData({ ...leaveTypeFormData, carry_forward_allowed: checked })
                          }
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <Button type="submit" disabled={isLoading} className="flex-1">
                          {editingLeaveType ? 'Update' : 'Create'} Leave Type
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsLeaveTypeDialogOpen(false);
                            resetLeaveTypeForm();
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
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Max Days/Year</TableHead>
                    <TableHead>Carry Forward</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map((leaveType) => (
                    <TableRow key={leaveType.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                          <span className="font-medium">{leaveType.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{leaveType.description || '-'}</TableCell>
                      <TableCell>{leaveType.max_days_per_year} days</TableCell>
                      <TableCell>
                        {leaveType.carry_forward_allowed ? (
                          <Badge className="bg-green-100 text-green-800">Yes</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {leaveType.is_active ? (
                          <Badge className="bg-blue-100 text-blue-800">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditLeaveType(leaveType)}
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

        <TabsContent value="general">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure general HR system settings</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label>Working Days Per Week</Label>
                    <Input
                      type="number"
                      value={generalSettings.working_days_per_week}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, working_days_per_week: e.target.value })}
                      min="1"
                      max="7"
                    />
                  </div>
                  <div>
                    <Label>Working Hours Per Day</Label>
                    <Input
                      type="number"
                      value={generalSettings.working_hours_per_day}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, working_hours_per_day: e.target.value })}
                      min="1"
                      max="24"
                    />
                  </div>
                </div>

                <div>
                  <Label>Overtime Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={generalSettings.overtime_multiplier}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, overtime_multiplier: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Multiplier for overtime pay calculation (e.g., 1.5 means 1.5x regular rate)
                  </p>
                </div>

                <Button onClick={handleSaveGeneralSettings} className="w-full">
                  Save General Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle>Attendance Policies</CardTitle>
              <CardDescription>Configure attendance tracking rules</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label>Late Arrival Threshold (minutes)</Label>
                    <Input
                      type="number"
                      value={generalSettings.late_arrival_threshold}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, late_arrival_threshold: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Mark as late if arrival is beyond this threshold
                    </p>
                  </div>
                  <div>
                    <Label>Early Departure Threshold (minutes)</Label>
                    <Input
                      type="number"
                      value={generalSettings.early_departure_threshold}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, early_departure_threshold: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Mark as early departure if leaving before threshold
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Attendance Grace Period (minutes)</Label>
                  <Input
                    type="number"
                    value={generalSettings.attendance_grace_period}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, attendance_grace_period: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Grace period before marking attendance as late
                  </p>
                </div>

                <Button onClick={handleSaveGeneralSettings} className="w-full">
                  Save Attendance Policies
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
