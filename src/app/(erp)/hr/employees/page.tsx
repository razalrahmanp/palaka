'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, UserPlus, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- Type Definitions (assuming from your schema) ---
interface Employee {
    id: string;
    name: string;
    email: string;
    position: string;
    salary: number;
    created_at: string;
}

// --- API Fetching and Mutations ---
const fetchEmployees = async (): Promise<Employee[]> => {
    const res = await fetch('/api/employees');
    if (!res.ok) throw new Error('Failed to fetch employees');
    return res.json();
};

const addEmployee = async (newEmployee: Omit<Employee, 'id' | 'created_at'>): Promise<Employee> => {
    const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee),
    });
    if (!res.ok) throw new Error('Failed to add employee');
    return res.json();
};

// --- Employee Form Component (for adding/editing) ---
interface EmployeeFormProps {
    onSubmit: (formData: { name: string; email: string; position: string; salary: number }) => void;
    onCancel: () => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({ name: '', email: '', position: '', salary: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ ...formData, salary: parseFloat(formData.salary) });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" className="w-full p-2 border rounded" required />
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email Address" className="w-full p-2 border rounded" required />
            <input name="position" value={formData.position} onChange={handleChange} placeholder="Position / Job Title" className="w-full p-2 border rounded" required />
            <input name="salary" type="number" value={formData.salary} onChange={handleChange} placeholder="Salary" className="w-full p-2 border rounded" required />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Employee</Button>
            </div>
        </form>
    );
};


export default function EmployeesPage() {
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);
    const [viewedEmployee, setViewedEmployee] = useState<Employee | null>(null);

    const { data: employees = [], isLoading, isError } = useQuery<Employee[]>({
        queryKey: ['employees'],
        queryFn: fetchEmployees,
    });

    const mutation = useMutation({
        mutationFn: addEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            setAddDialogOpen(false);
        },
    });

    const handleAddEmployee = (formData: Omit<Employee, 'id' | 'created_at'>) => {
        mutation.mutate(formData);
    };

    return (
        <div className="p-6 space-y-4">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Employee Management</CardTitle>
                        <CardDescription>Add, view, and manage all employee records.</CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><UserPlus className="mr-2 h-4 w-4" /> Add Employee</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Employee</DialogTitle>
                            </DialogHeader>
                            <EmployeeForm onSubmit={handleAddEmployee} onCancel={() => setAddDialogOpen(false)} />
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {isLoading ? <p>Loading employees...</p> : isError ? <p className="text-red-500">Failed to load employees.</p> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Position</TableHead>
                                    <TableHead>Hire Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.map((employee) => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-medium">{employee.name}</TableCell>
                                        <TableCell>{employee.email}</TableCell>
                                        <TableCell><Badge variant="outline">{employee.position}</Badge></TableCell>
                                        <TableCell>{new Date(employee.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setViewedEmployee(employee)}>
                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* View Employee Details Dialog */}
            <Dialog open={!!viewedEmployee} onOpenChange={() => setViewedEmployee(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Employee Details</DialogTitle>
                    </DialogHeader>
                    {viewedEmployee && (
                        <div className="space-y-2">
                            <p><strong>Name:</strong> {viewedEmployee.name}</p>
                            <p><strong>Email:</strong> {viewedEmployee.email}</p>
                            <p><strong>Position:</strong> {viewedEmployee.position}</p>
                            <p><strong>Salary:</strong> {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(viewedEmployee.salary)}</p>
                            <p><strong>Hire Date:</strong> {new Date(viewedEmployee.created_at).toLocaleDateString()}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
