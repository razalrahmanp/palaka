'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ChartContainerProps = {
    title: React.ReactNode;
    children: React.ReactNode;
};

const ChartContainer = ({ title, children }: ChartContainerProps) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                {React.isValidElement(children) ? children : <></>}
            </ResponsiveContainer>
        </CardContent>
    </Card>
);

const fetchInventoryData = async () => {
    const res = await fetch('/api/analytics/inventory');
    if (!res.ok) throw new Error('Failed to fetch inventory data');
    return res.json();
};

export default function InventoryAnalytics() {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['inventoryData'],
        queryFn: fetchInventoryData,
    });

    if (isLoading) return <div>Loading Inventory Analytics...</div>;
    if (isError) return <div className="text-red-500">Error: {error.message}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartContainer title="Current Stock Levels">
                <BarChart data={data.stockLevels} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="level" fill="#8884d8" />
                </BarChart>
            </ChartContainer>

            <ChartContainer title="Inventory Turnover Rate">
                <BarChart data={data.inventoryTurnover}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip /> <Legend />
                    <Bar dataKey="rate" fill="#82ca9d" />
                </BarChart>
            </ChartContainer>

            <ChartContainer title="Fast-Moving Products (Units Sold Last 30d)">
                <BarChart data={data.fastMoving}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="units" fill="#ffc658" />
                </BarChart>
            </ChartContainer>

            <ChartContainer title="Slow-Moving Products (Units Sold Last 30d)">
                 <BarChart data={data.slowMoving}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="units" fill="#ff8042" />
                </BarChart>
            </ChartContainer>
        </div>
    );
}
