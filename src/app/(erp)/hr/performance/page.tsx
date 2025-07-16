'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, PlusCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- Type Definitions ---
interface Employee {
    id: string;
    name: string;
}
interface PerformanceReview {
    id: string;
    employee_id: string;
    reviewer_id: string;
    score: number;
    feedback: string;
    review_date: string;
    employee_name?: string; // Optional, to be joined
    reviewer_name?: string; // Optional, to be joined
}

// --- API Fetching and Mutations ---
const fetchReviews = async (): Promise<PerformanceReview[]> => {
    const res = await fetch('/api/hr/performance');
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
};

const fetchEmployeesForSelect = async (): Promise<Employee[]> => {
    const res = await fetch('/api/employees?select=id,name');
    if (!res.ok) throw new Error('Failed to fetch employees');
    return res.json();
};

const addReview = async (newReview: Omit<PerformanceReview, 'id'>): Promise<PerformanceReview> => {
    const res = await fetch('/api/hr/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview),
    });
    if (!res.ok) throw new Error('Failed to add review');
    return res.json();
};

// --- Review Form Component ---
interface ReviewFormProps {
    employees: Employee[];
    onSubmit: (review: Omit<PerformanceReview, 'id'>) => void;
    onCancel: () => void;
}
const ReviewForm: React.FC<ReviewFormProps> = ({ employees, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({ employee_id: '', score: '', feedback: '', review_date: '' });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Assuming current user is the reviewer for simplicity
        const currentUser = { id: 'user-id-placeholder' }; // Replace with actual user logic
        onSubmit({ ...formData, score: parseInt(formData.score), reviewer_id: currentUser.id });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="employee_id" className="sr-only">Employee</label>
            <select
                id="employee_id"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                title="Select Employee"
            >
                <option value="">Select Employee</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
            <input name="score" type="number" min="1" max="5" value={formData.score} onChange={handleChange} placeholder="Score (1-5)" className="w-full p-2 border rounded" required />
            <input
                name="review_date"
                type="date"
                value={formData.review_date}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                required
                title="Review Date"
                placeholder="Select review date"
            />
            <textarea name="feedback" value={formData.feedback} onChange={handleChange} placeholder="Feedback" className="w-full p-2 border rounded" required />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit">Save Review</Button>
            </div>
        </form>
    );
};

export default function PerformancePage() {
    const queryClient = useQueryClient();
    const [isAddDialogOpen, setAddDialogOpen] = useState(false);

    const { data: reviews = [], isLoading: isLoadingReviews } = useQuery<PerformanceReview[]>({
        queryKey: ['performanceReviews'],
        queryFn: fetchReviews,
    });

    const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Employee[]>({
        queryKey: ['employeesForSelect'],
        queryFn: fetchEmployeesForSelect,
    });

    const mutation = useMutation({
        mutationFn: addReview,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['performanceReviews'] });
            setAddDialogOpen(false);
        },
    });

    return (
        <div className="p-6 space-y-4">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                        <CardTitle>Performance Reviews</CardTitle>
                        <CardDescription>Initiate and track employee performance review cycles.</CardDescription>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> New Review</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Create New Performance Review</DialogTitle></DialogHeader>
                            {isLoadingEmployees ? <p>Loading...</p> : <ReviewForm employees={employees} onSubmit={mutation.mutate} onCancel={() => setAddDialogOpen(false)} />}
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                     {isLoadingReviews ? <p>Loading reviews...</p> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Review Date</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Feedback</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reviews.map((review) => (
                                    <TableRow key={review.id}>
                                        <TableCell className="font-medium">{review.employee_name || review.employee_id}</TableCell>
                                        <TableCell>{new Date(review.review_date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <Star key={i} className={`h-4 w-4 ${i < review.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="truncate max-w-xs">{review.feedback}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
