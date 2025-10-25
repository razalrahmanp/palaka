'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Users, BookOpen, Award } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TrainingProgram {
  id: string;
  title: string;
  description: string;
  duration_hours: number;
  trainer_name: string;
  training_type: 'internal' | 'external' | 'online';
  max_participants: number;
  cost_per_participant: number;
  is_active: boolean;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  position: string;
}

interface EmployeeTraining {
  id: string;
  employee_id: string;
  training_program_id: string;
  enrollment_date: string;
  start_date: string;
  completion_date: string;
  status: 'enrolled' | 'in_progress' | 'completed' | 'cancelled';
  score: number;
  feedback: string;
  certificate_url: string;
  employee: Employee;
  training_program: TrainingProgram;
}

export default function TrainingManagementPage() {
  const [trainingPrograms, setTrainingPrograms] = useState<TrainingProgram[]>([]);
  const [employeeTrainings, setEmployeeTrainings] = useState<EmployeeTraining[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [programFormData, setProgramFormData] = useState({
    title: '',
    description: '',
    duration_hours: '',
    trainer_name: '',
    training_type: 'internal' as 'internal' | 'external' | 'online',
    max_participants: '',
    cost_per_participant: '',
  });

  const [enrollFormData, setEnrollFormData] = useState({
    employee_id: '',
    training_program_id: '',
    enrollment_date: format(new Date(), 'yyyy-MM-dd'),
    start_date: '',
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchTrainingPrograms(),
        fetchEmployeeTrainings(),
        fetchEmployees(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrainingPrograms = async () => {
    try {
      const response = await fetch('/api/hr/training-programs?is_active=true');
      if (!response.ok) throw new Error('Failed to fetch training programs');
      const result = await response.json();
      setTrainingPrograms(result.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load training programs');
    }
  };

  const fetchEmployeeTrainings = async () => {
    try {
      const response = await fetch('/api/hr/employee-trainings');
      if (!response.ok) throw new Error('Failed to fetch employee trainings');
      const result = await response.json();
      setEmployeeTrainings(result.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load employee trainings');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      setEmployees(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = '/api/hr/training-programs';
      const method = editingProgram ? 'PUT' : 'POST';
      const payload = editingProgram
        ? { id: editingProgram.id, ...programFormData }
        : programFormData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save training program');

      toast.success(editingProgram ? 'Program updated successfully' : 'Program created successfully');
      setIsProgramDialogOpen(false);
      resetProgramForm();
      fetchTrainingPrograms();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save training program');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnrollEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/hr/employee-trainings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrollFormData),
      });

      if (!response.ok) throw new Error('Failed to enroll employee');

      toast.success('Employee enrolled successfully');
      setIsEnrollDialogOpen(false);
      resetEnrollForm();
      fetchEmployeeTrainings();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to enroll employee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTrainingStatus = async (id: string, status: string) => {
    setIsLoading(true);
    try {
      const updateData: Record<string, string> = { id, status };
      
      if (status === 'completed') {
        updateData.completion_date = new Date().toISOString().split('T')[0];
      }

      const response = await fetch('/api/hr/employee-trainings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error('Failed to update training status');

      toast.success('Training status updated');
      fetchEmployeeTrainings();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update training status');
    } finally {
      setIsLoading(false);
    }
  };

  const resetProgramForm = () => {
    setProgramFormData({
      title: '',
      description: '',
      duration_hours: '',
      trainer_name: '',
      training_type: 'internal',
      max_participants: '',
      cost_per_participant: '',
    });
    setEditingProgram(null);
  };

  const resetEnrollForm = () => {
    setEnrollFormData({
      employee_id: '',
      training_program_id: '',
      enrollment_date: format(new Date(), 'yyyy-MM-dd'),
      start_date: '',
    });
  };

  const handleEditProgram = (program: TrainingProgram) => {
    setEditingProgram(program);
    setProgramFormData({
      title: program.title,
      description: program.description || '',
      duration_hours: program.duration_hours?.toString() || '',
      trainer_name: program.trainer_name || '',
      training_type: program.training_type,
      max_participants: program.max_participants?.toString() || '',
      cost_per_participant: program.cost_per_participant?.toString() || '',
    });
    setIsProgramDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      enrolled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return <Badge className={variants[status] || ''}>{status.replace('_', ' ')}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      internal: 'bg-purple-100 text-purple-800',
      external: 'bg-orange-100 text-orange-800',
      online: 'bg-cyan-100 text-cyan-800',
    };
    return <Badge className={variants[type] || ''}>{type}</Badge>;
  };

  const filteredPrograms = trainingPrograms.filter(program =>
    program.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    program.trainer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalPrograms: trainingPrograms.length,
    activeEnrollments: employeeTrainings.filter(e => e.status === 'enrolled' || e.status === 'in_progress').length,
    completedTrainings: employeeTrainings.filter(e => e.status === 'completed').length,
    totalParticipants: new Set(employeeTrainings.map(e => e.employee_id)).size,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Training Management
            </h1>
            <p className="text-gray-600 mt-2">Organize training programs, courses, and skill development</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Enroll Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Enroll Employee in Training</DialogTitle>
                  <DialogDescription>Select employee and training program</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleEnrollEmployee} className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select
                      value={enrollFormData.employee_id}
                      onValueChange={(value) => setEnrollFormData({ ...enrollFormData, employee_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} ({emp.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Training Program</Label>
                    <Select
                      value={enrollFormData.training_program_id}
                      onValueChange={(value) => setEnrollFormData({ ...enrollFormData, training_program_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select training" />
                      </SelectTrigger>
                      <SelectContent>
                        {trainingPrograms.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.title} ({program.duration_hours}h)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Enrollment Date</Label>
                      <Input
                        type="date"
                        value={enrollFormData.enrollment_date}
                        onChange={(e) => setEnrollFormData({ ...enrollFormData, enrollment_date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={enrollFormData.start_date}
                        onChange={(e) => setEnrollFormData({ ...enrollFormData, start_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      Enroll
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEnrollDialogOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isProgramDialogOpen} onOpenChange={setIsProgramDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-cyan-600">
                  <Plus className="h-4 w-4 mr-2" />
                  New Training Program
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingProgram ? 'Edit' : 'Create'} Training Program</DialogTitle>
                  <DialogDescription>Fill in the training program details</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSaveProgram} className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={programFormData.title}
                      onChange={(e) => setProgramFormData({ ...programFormData, title: e.target.value })}
                      placeholder="e.g., Advanced Excel Training"
                      required
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={programFormData.description}
                      onChange={(e) => setProgramFormData({ ...programFormData, description: e.target.value })}
                      placeholder="Training program description..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Duration (hours)</Label>
                      <Input
                        type="number"
                        value={programFormData.duration_hours}
                        onChange={(e) => setProgramFormData({ ...programFormData, duration_hours: e.target.value })}
                        placeholder="8"
                        required
                      />
                    </div>
                    <div>
                      <Label>Training Type</Label>
                      <Select
                        value={programFormData.training_type}
                        onValueChange={(value: 'internal' | 'external' | 'online') => 
                          setProgramFormData({ ...programFormData, training_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="external">External</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Trainer Name</Label>
                      <Input
                        value={programFormData.trainer_name}
                        onChange={(e) => setProgramFormData({ ...programFormData, trainer_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <Label>Max Participants</Label>
                      <Input
                        type="number"
                        value={programFormData.max_participants}
                        onChange={(e) => setProgramFormData({ ...programFormData, max_participants: e.target.value })}
                        placeholder="20"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Cost Per Participant</Label>
                    <Input
                      type="number"
                      value={programFormData.cost_per_participant}
                      onChange={(e) => setProgramFormData({ ...programFormData, cost_per_participant: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {editingProgram ? 'Update' : 'Create'} Program
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsProgramDialogOpen(false);
                        resetProgramForm();
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
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Training Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BookOpen className="h-5 w-5 text-blue-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalPrograms}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Active Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-yellow-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.activeEnrollments}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Award className="h-5 w-5 text-green-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.completedTrainings}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-purple-600 mr-2" />
              <div className="text-2xl font-bold text-gray-900">{stats.totalParticipants}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="programs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="programs">Training Programs</TabsTrigger>
          <TabsTrigger value="enrollments">Employee Enrollments</TabsTrigger>
        </TabsList>

        <TabsContent value="programs">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Training Programs</CardTitle>
                  <CardDescription>Manage available training programs</CardDescription>
                </div>
                <Input
                  placeholder="Search programs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Trainer</TableHead>
                    <TableHead>Max Participants</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrograms.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{program.title}</div>
                          <div className="text-xs text-gray-500">{program.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(program.training_type)}</TableCell>
                      <TableCell>{program.duration_hours}h</TableCell>
                      <TableCell>{program.trainer_name || '-'}</TableCell>
                      <TableCell>{program.max_participants || '-'}</TableCell>
                      <TableCell>${program.cost_per_participant || 0}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProgram(program)}
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

        <TabsContent value="enrollments">
          <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle>Employee Enrollments</CardTitle>
              <CardDescription>Track employee training progress</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Training Program</TableHead>
                    <TableHead>Enrollment Date</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Completion Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeTrainings.map((training) => (
                    <TableRow key={training.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{training.employee.name}</div>
                          <div className="text-xs text-gray-500">{training.employee.employee_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{training.training_program.title}</div>
                          <div className="text-xs text-gray-500">{training.training_program.duration_hours}h</div>
                        </div>
                      </TableCell>
                      <TableCell>{training.enrollment_date ? format(new Date(training.enrollment_date), 'MMM dd, yyyy') : '-'}</TableCell>
                      <TableCell>{training.start_date ? format(new Date(training.start_date), 'MMM dd, yyyy') : '-'}</TableCell>
                      <TableCell>{training.completion_date ? format(new Date(training.completion_date), 'MMM dd, yyyy') : '-'}</TableCell>
                      <TableCell>{getStatusBadge(training.status)}</TableCell>
                      <TableCell>
                        {training.status !== 'completed' && training.status !== 'cancelled' && (
                          <Select
                            value={training.status}
                            onValueChange={(value) => handleUpdateTrainingStatus(training.id, value)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enrolled">Enrolled</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
