'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

type ChartContainerProps = {
    title: React.ReactNode;
    children: React.ReactElement;
};

const ChartContainer = ({ title, children }: ChartContainerProps) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                {children}
            </ResponsiveContainer>
        </CardContent>
    </Card>
);

const fetchEmployeeData = async () => {
    const res = await fetch('/api/analytics/employees');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to fetch employee data');
    }
    return res.json();
};

export default function EmployeeAnalytics() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['employeeData'],
        queryFn: fetchEmployeeData,
    });

    if (isLoading) return <div>Loading Employee Analytics...</div>;
    if (isError) return <div className="text-red-500">Error: {error.message}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer title="Attendance & Leave Trends (Last 30 Days)">
                <BarChart data={data.attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
            </ChartContainer>

            <ChartContainer title="Productivity by Position (Tasks Completed)">
                <PieChart>
                    <Pie data={data.departmentProductivity} dataKey="tasks" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                         {data.departmentProductivity.map((index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ChartContainer>
        </div>
    );
}
