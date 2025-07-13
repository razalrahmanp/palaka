'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ChartContainer = ({ title, children }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>{children}</ResponsiveContainer>
        </CardContent>
    </Card>
);

const fetchProductionData = async () => {
    const res = await fetch('/api/analytics/production');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to fetch production data');
    }
    return res.json();
};

export default function ProductionAnalytics() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['productionData'],
        queryFn: fetchProductionData,
    });

    if (isLoading) return <div>Loading Production Analytics...</div>;
    if (isError) return <div className="text-red-500">Error: {error.message}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer title="Output vs. Target">
                <BarChart data={data.outputVsTarget}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="product" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="output" fill="#82ca9d" name="Actual Output" />
                    <Bar dataKey="target" fill="#8884d8" name="Target Output" />
                </BarChart>
            </ChartContainer>

            <ChartContainer title="Defect Rates (%) Over Time">
                <LineChart data={data.defectRates}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 'dataMax + 2']} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="rate" stroke="#ff8042" name="Defect Rate" />
                </LineChart>
            </ChartContainer>
        </div>
    );
}
