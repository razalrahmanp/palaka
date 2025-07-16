'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupeeIcon, ShoppingCart, TrendingUp, UserCheck } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

type KpiCardProps = {
  title: string;
  value: number;
  icon: React.ElementType;
  format?: 'currency' | 'percent' | 'number';
};

const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, format = 'currency' }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {format === 'currency' && '$'}
        {value.toLocaleString(undefined, { minimumFractionDigits: format === 'percent' ? 0 : 2, maximumFractionDigits: 2 })}
        {format === 'percent' && '%'}
      </div>
    </CardContent>
  </Card>
);

type ChartContainerProps = {
    title: string;
    children: React.ReactElement;
};

const ChartContainer: React.FC<ChartContainerProps> = ({ title, children }) => (
    <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>{children}</ResponsiveContainer>
        </CardContent>
    </Card>
);

const fetchExecutiveData = async () => {
    const res = await fetch('/api/analytics/executive');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || 'Failed to fetch executive data');
    }
    return res.json();
};

export default function ExecutiveDashboard() {
  const { data, isLoading, isError, error } = useQuery({
      queryKey: ['executiveData'],
      queryFn: fetchExecutiveData
  });

  if (isLoading) return <div>Loading Executive Dashboard...</div>;
  if (isError) return <div className="text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Revenue" value={data.kpis.totalRevenue} icon={IndianRupeeIcon} />
        <KpiCard title="Net Profit" value={data.kpis.netProfit} icon={TrendingUp} />
        <KpiCard title="Gross Margin" value={data.kpis.grossMargin * 100} icon={UserCheck} format="percent" />
        <KpiCard title="Orders Fulfilled" value={data.kpis.ordersFulfilled} icon={ShoppingCart} format="number" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartContainer title="Profit vs. Expenses">
            <BarChart data={data.profitVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip /> <Legend />
                <Bar dataKey="profit" fill="#82ca9d" />
                <Bar dataKey="expenses" fill="#8884d8" />
            </BarChart>
        </ChartContainer>

        <div className="lg:col-span-2">
            <ChartContainer title="Sales Trends">
                <LineChart data={data.salesTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip /> <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#8884d8" />
                </LineChart>
            </ChartContainer>
        </div>
        
        <ChartContainer title="Top Performers (by unit)">
            <PieChart>
                <Pie data={data.topPerformers} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                    {data.topPerformers.map(( index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip /> <Legend />
            </PieChart>
        </ChartContainer>
      </div>
    </div>
  );
}
