'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndianRupee, PackageX } from 'lucide-react';

// --- Helper Functions ---

// --- Reusable Components ---
const ChartContainer = ({ title, children }: { title: React.ReactNode; children: React.ReactNode; }) => (
    <Card>
        <CardHeader><CardTitle className="text-base font-semibold">{title}</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                {React.isValidElement(children) ? children : <></>}
            </ResponsiveContainer>
        </CardContent>
    </Card>
);

const KpiCard = ({ title, value, icon: Icon, format = 'number' }: { title: string; value: number; icon: React.ElementType; format?: 'currency' | 'percent' | 'number' }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {format === 'currency' && '₹'}
        {(value || 0).toLocaleString('en-IN', { minimumFractionDigits: format === 'percent' ? 1 : 2, maximumFractionDigits: 2 })}
        {format === 'percent' && '%'}
      </div>
    </CardContent>
  </Card>
);

// --- API Fetching Function ---
const fetchInventoryData = async () => {
    const res = await fetch('/api/analytics/inventory');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to fetch inventory data');
    }
    return res.json();
};

// --- Main Dashboard Component ---
export default function InventoryAnalytics() {
    const [viewMode, setViewMode] = useState('chart');
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['inventoryAnalyticsData'],
        queryFn: fetchInventoryData,
    });

    if (isLoading) return <div className="p-4">Loading Inventory Analytics...</div>;
    if (isError) return <div className="p-4 text-red-500">Error: {(error as Error).message}</div>;
    if (!data) return <div className="p-4">No data available.</div>;

    const renderContent = () => {
        if (viewMode === 'chart') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChartContainer title="Top 10 Products by Stock Level">
                        <BarChart data={data.stockLevels} layout="vertical" margin={{ right: 30, left: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={120} /><Tooltip /><Bar dataKey="level" name="Stock Level" fill="#8884d8" /></BarChart>
                    </ChartContainer>
                    <ChartContainer title="Monthly Inventory Turnover Rate">
                        <BarChart data={data.inventoryTurnover}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="rate" fill="#82ca9d" /></BarChart>
                    </ChartContainer>
                    <ChartContainer title="Fast-Moving Products (Units Sold Last 30d)">
                        <BarChart data={data.fastMoving}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="units" name="Units Sold" fill="#ffc658" /></BarChart>
                    </ChartContainer>
                    <ChartContainer title="Slow-Moving Products (Units Sold Last 30d)">
                        <BarChart data={data.slowMoving}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="units" name="Units Sold" fill="#ff8042" /></BarChart>
                    </ChartContainer>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Current Stock Levels</CardTitle></CardHeader>
                    <CardContent><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Stock Level</TableHead></TableRow></TableHeader><TableBody>{data.stockLevels.map((item: { name: string; level: number }) => (<TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.level}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Monthly Inventory Turnover</CardTitle></CardHeader>
                    <CardContent><Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Rate</TableHead></TableRow></TableHeader><TableBody>{data.inventoryTurnover.map((item: { month: string; rate: number }) => (<TableRow key={item.month}><TableCell>{item.month}</TableCell><TableCell className="text-right">{item.rate}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Fast-Moving Products</CardTitle></CardHeader>
                    <CardContent><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Units Sold (30d)</TableHead></TableRow></TableHeader><TableBody>{data.fastMoving.map((item: { name: string; units: number }) => (<TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.units}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Slow-Moving Products</CardTitle></CardHeader>
                    <CardContent><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Units Sold (30d)</TableHead></TableRow></TableHeader><TableBody>{data.slowMoving.map((item: { name: string; units: number }) => (<TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right">{item.units}</TableCell></TableRow>))}</TableBody></Table></CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="grid gap-4 grid-cols-2">
                <KpiCard title="Total Inventory Value" value={data.kpis.totalValue} icon={IndianRupee} format="currency" />
                <KpiCard title="Stockout Rate" value={data.kpis.stockoutRate} icon={PackageX} format="percent" />
            </div>
            <Tabs defaultValue="chart" onValueChange={setViewMode} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="chart">Chart View</TabsTrigger>
                    <TabsTrigger value="table">Table View</TabsTrigger>
                </TabsList>
                <TabsContent value="chart" className="mt-4">{renderContent()}</TabsContent>
                <TabsContent value="table" className="mt-4">{renderContent()}</TabsContent>
            </Tabs>
        </div>
    );
}
