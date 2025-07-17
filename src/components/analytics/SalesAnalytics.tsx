'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndianRupee, Percent } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

// --- Helper for consistent currency formatting ---
const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// --- Helper for formatting dates ---
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// --- Reusable Components ---
type ChartContainerProps = {
    title: React.ReactNode;
    children: React.ReactNode;
};

const ChartContainer = ({ title, children }: ChartContainerProps) => (
    <Card>
        <CardHeader><CardTitle className="text-base font-semibold">{title}</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                {React.isValidElement(children) ? children : <></>}
            </ResponsiveContainer>
        </CardContent>
    </Card>
);

type KpiCardProps = {
  title: string;
  value: number;
  icon: React.ElementType;
  format?: 'currency' | 'percent' | 'number';
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, format = 'number' }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {format === 'currency' && '₹'}
        {(value || 0).toLocaleString('en-IN', { 
            minimumFractionDigits: format === 'percent' ? 1 : 2, 
            maximumFractionDigits: 2 
        })}
        {format === 'percent' && '%'}
      </div>
    </CardContent>
  </Card>
);

// --- API Fetching Function ---
const fetchSalesData = async () => {
    const res = await fetch('/api/analytics/sales');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to fetch sales data');
    }
    return res.json();
};

// --- Main Dashboard Component ---
export default function SalesAnalytics() {
    const [viewMode, setViewMode] = useState('chart');
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['salesAnalyticsData'],
        queryFn: fetchSalesData
    });

    if (isLoading) return <div className="p-4">Loading Sales Analytics...</div>;
    if (isError) return <div className="p-4 text-red-500">Error: {(error as Error).message}</div>;
    if (!data) return <div className="p-4">No data available.</div>;

    const renderContent = () => {
        if (viewMode === 'chart') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChartContainer title="Top 5 Products by Revenue">
                        <BarChart data={data.topProducts} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(value) => formatCurrency(value as number)} />
                            <YAxis dataKey="name" type="category" width={120} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="sales" name="Revenue" fill="#8884d8" />
                        </BarChart>
                    </ChartContainer>

                    <ChartContainer title="Sales Over Last 30 Days">
                        <LineChart data={data.salesOverTime} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis tickFormatter={(value) => formatCurrency(value as number)} />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="sales" name="Sales" stroke="#82ca9d" activeDot={{ r: 8 }} />
                        </LineChart>
                    </ChartContainer>

                    <ChartContainer title="Sales Channel Breakdown">
                       <PieChart>
                            <Pie data={data.salesChannelBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {(data.salesChannelBreakdown as { name: string; value: number }[]).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Legend />
                        </PieChart>
                    </ChartContainer>
                    
                    <Card>
                        <CardHeader><CardTitle>Regional Sales</CardTitle></CardHeader>
                        <CardContent className="flex items-center justify-center h-[300px] bg-gray-100 dark:bg-gray-800 rounded-md">
                            <p className="text-gray-500 dark:text-gray-400">Regional Sales Heatmap (Requires Map Library)</p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Top 5 Products by Revenue</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data.topProducts.map((item: { name: string; sales: number }) => (
                                    <TableRow key={item.name}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.sales)}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Sales Channel Breakdown</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Channel</TableHead><TableHead className="text-right">Total Sales</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {data.salesChannelBreakdown.map((item: { name: string; value: number }) => (
                                    <TableRow key={item.name}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.value)}</TableCell></TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader><CardTitle>Sales Over Last 30 Days</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Total Sales</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {data.salesOverTime.map((item: { date: string; sales: number }) => (
                                        <TableRow key={item.date}><TableCell className="font-medium">{formatDate(item.date)}</TableCell><TableCell className="text-right">{formatCurrency(item.sales)}</TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                <KpiCard title="Average Order Value" value={data.averageOrderValue} icon={IndianRupee} format="currency" />
                <KpiCard title="Quote to Order Conversion Rate" value={data.conversionRate * 100} icon={Percent} format="percent" />
            </div>

            {/* View Switcher */}
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
