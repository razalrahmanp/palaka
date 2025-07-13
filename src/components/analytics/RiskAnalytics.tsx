'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#FFBB28', '#FF8042', '#0088FE'];

const ChartContainer = ({ title, children }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>{children}</ResponsiveContainer>
        </CardContent>
    </Card>
);

const fetchRiskData = async () => {
    const res = await fetch('/api/analytics/risk');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to fetch risk data');
    }
    return res.json();
};

export default function RiskAnalytics() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['riskData'],
        queryFn: fetchRiskData,
    });

    if (isLoading) return <div>Loading Risk Analytics...</div>;
    if (isError) return <div className="text-red-500">Error: {error.message}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer title="Incidents by Type (Last Year)">
                <BarChart data={data.incidentsByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#ff8042" />
                </BarChart>
            </ChartContainer>

            <ChartContainer title="Open Incidents by Severity">
                <PieChart>
                    <Pie data={data.openIncidentsBySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                         {data.openIncidentsBySeverity.map((entry, index) => (
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
