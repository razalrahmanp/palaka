'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ChartContainer = ({ title, children }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>{children}</ResponsiveContainer>
        </CardContent>
    </Card>
);

const fetchProjectData = async () => {
    const res = await fetch('/api/analytics/projects');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to fetch project data');
    }
    return res.json();
};

export default function ProjectAnalytics() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['projectData'],
        queryFn: fetchProjectData,
    });

    if (isLoading) return <div>Loading Project Analytics...</div>;
    if (isError) return <div className="text-red-500">Error: {error.message}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer title="Project Progress (%)">
                <BarChart data={data.projectProgress} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="progress" fill="#8884d8" />
                </BarChart>
            </ChartContainer>

            <ChartContainer title="Budget vs. Actual Cost">
                <BarChart data={data.budgetVsActual}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="budget" fill="#82ca9d" />
                    <Bar dataKey="actual" fill="#ff8042" />
                </BarChart>
            </ChartContainer>
        </div>
    );
}
