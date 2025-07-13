'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const ChartContainer = ({ title, children }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>{children}</ResponsiveContainer>
        </CardContent>
    </Card>
);

const fetchSalesData = async () => {
    const res = await fetch('/api/analytics/sales');
    if (!res.ok) throw new Error('Failed to fetch sales data');
    return res.json();
};

export default function SalesAnalytics() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['salesData'],
        queryFn: fetchSalesData
    });

    if (isLoading) return <div>Loading Sales Analytics...</div>;
    if (isError) return <div className="text-red-500">Error: {error.message}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer title="Top Products by Sales">
                <BarChart data={data.topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip /> <Legend />
                    <Bar dataKey="sales" fill="#8884d8" />
                </BarChart>
            </ChartContainer>

            <ChartContainer title="Sales Over Time">
                <LineChart data={data.salesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip /> <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#82ca9d" />
                </LineChart>
            </ChartContainer>

            <ChartContainer title="Sales Channel Breakdown">
                 <PieChart>
                    <Pie data={data.salesChannelBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                        {data.salesChannelBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip /> <Legend />
                </PieChart>
            </ChartContainer>
            
            <Card>
                <CardHeader><CardTitle>Regional Sales</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-center h-[300px] bg-gray-100 rounded-md">
                    <p className="text-gray-500">Regional Sales Heatmap (Requires Map Library)</p>
                </CardContent>
            </Card>
        </div>
    );
}
