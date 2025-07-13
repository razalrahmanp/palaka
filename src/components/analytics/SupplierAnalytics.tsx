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

const fetchSupplierData = async () => {
    const res = await fetch('/api/analytics/suppliers');
    if (!res.ok) throw new Error('Failed to fetch supplier data');
    return res.json();
};

export default function SupplierAnalytics() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['supplierData'],
        queryFn: fetchSupplierData
    });

    if (isLoading) return <div>Loading Supplier Analytics...</div>;
    if (isError) return <div className="text-red-500">Error: {error.message}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer title="Top Suppliers by Spend">
                <BarChart data={data.topSuppliersBySpend} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="spend" fill="#8884d8" />
                </BarChart>
            </ChartContainer>

            <ChartContainer title="On-Time Delivery Performance (%)">
                <BarChart data={data.onTimeDelivery}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="performance" fill="#82ca9d" />
                </BarChart>
            </ChartContainer>
        </div>
    );
}
