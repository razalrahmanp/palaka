'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartContainerProps {
    title: React.ReactNode;
    children: React.ReactNode;
}

const ChartContainer = ({ title, children }: ChartContainerProps) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                {children as React.ReactElement}
            </ResponsiveContainer>
        </CardContent>
    </Card>
);

const fetchFinanceData = async () => {
    const res = await fetch('/api/analytics/finance');
    if (!res.ok) throw new Error('Failed to fetch finance data');
    return res.json();
};

export default function FinanceAnalytics() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['financeData'],
        queryFn: fetchFinanceData,
    });

    if (isLoading) return <div>Loading Finance Analytics...</div>;
    if (isError) return <div className="text-red-500">Error: {error.message}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer title="Monthly Revenue vs. Expenses">
                <BarChart data={data.monthlyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip /> <Legend />
                    <Bar dataKey="revenue" fill="#82ca9d" />
                    <Bar dataKey="expenses" fill="#ff8042" />
                </BarChart>
            </ChartContainer>

            <ChartContainer title="Profit & Loss (P&L) Trends">
                <LineChart data={data.plTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip /> <Legend />
                    <Line type="monotone" dataKey="profit" stroke="#8884d8" />
                    <Line type="monotone" dataKey="loss" stroke="#e53e3e" />
                </LineChart>
            </ChartContainer>
            
            <div className="md:col-span-2">
                <ChartContainer title="Cashflow Projections">
                    <LineChart data={data.cashflow}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip /> <Legend />
                        <Line type="monotone" dataKey="inflow" stroke="#3182ce" name="Inflow" />
                        <Line type="monotone" dataKey="outflow" stroke="#dd6b20" name="Outflow" />
                        <Line type="monotone" dataKey="net" stroke="#38a169" name="Net Cashflow" />
                    </LineChart>
                </ChartContainer>
            </div>
        </div>
    );
}
