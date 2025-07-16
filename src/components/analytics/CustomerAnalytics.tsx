'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

const fetchCustomerData = async () => {
    const res = await fetch('/api/analytics/customers');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to fetch customer data');
    }
    return res.json();
};

export default function CustomerAnalytics() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['customerData'],
        queryFn: fetchCustomerData,
    });

    if (isLoading) return <div>Loading Customer Analytics...</div>;
    if (isError) return <div className="text-red-500">Error: {error.message}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer title="Customer Acquisition vs. Churn">
                <LineChart data={data.acquisitionAndChurn}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="acquired" stroke="#82ca9d" name="Acquired" />
                    <Line type="monotone" dataKey="churned" stroke="#ff8042" name="Churned" />
                </LineChart>
            </ChartContainer>

            <ChartContainer title="Top Customers by Lifetime Value (CLTV)">
                <BarChart data={data.cltv}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="segment" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
            </ChartContainer>
        </div>
    );
}
