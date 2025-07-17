'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndianRupeeIcon, ShoppingCart, TrendingUp, UserCheck } from 'lucide-react';

// --- Helper for consistent currency formatting ---
const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number') return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

// --- Helper for formatting dates ---
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

// --- API Fetching Function ---
const fetchExecutiveData = async () => {
  const res = await fetch('/api/analytics/executive');
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.details || 'Failed to fetch executive data');
  }
  return res.json();
};

// --- KPI Card Component ---
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
        {format === 'currency' && '₹'}
        {value.toLocaleString('en-IN', {
            minimumFractionDigits: format === 'percent' ? 0 : 2,
            maximumFractionDigits: 2
        })}
        {format === 'percent' && '%'}
      </div>
    </CardContent>
  </Card>
);

// --- Main Dashboard Component ---
export default function ExecutiveDashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['executiveData'],
    queryFn: fetchExecutiveData,
  });

  if (isLoading) return <div className="p-4">Loading Executive Dashboard...</div>;
  if (isError) return <div className="p-4 text-red-500">Error: {error.message}</div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Revenue" value={data.kpis.totalRevenue} icon={IndianRupeeIcon} />
        <KpiCard title="Net Profit" value={data.kpis.netProfit} icon={TrendingUp} />
        <KpiCard title="Gross Margin" value={data.kpis.grossMargin * 100} icon={UserCheck} format="percent" />
        <KpiCard title="Orders Fulfilled" value={data.kpis.ordersFulfilled} icon={ShoppingCart} format="number" />
      </div>

      {/* Top Performers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
            <CardHeader><CardTitle>Top Products by Revenue</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {data.topPerformers.map((item: { name: string; value: number }) => (
                            <TableRow key={item.name}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.value)}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Top Salespeople</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Salesperson</TableHead><TableHead className="text-right">Total Sales</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {data.topSalespeople.map((item: { name: string; value: number }) => (
                            <TableRow key={item.name}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.value)}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Top Vendors by Spend</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead className="text-right">PO Value</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {data.topVendors.map((item: { name: string; value: number }) => (
                            <TableRow key={item.name}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.value)}</TableCell></TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      {/* Sales Trends with Tabs */}
      <Card>
        <CardHeader><CardTitle>Sales Trends</CardTitle></CardHeader>
        <CardContent>
            <Tabs defaultValue="monthly" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
                <TabsContent value="daily">
                    <Table>
                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Total Sales</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {data.salesTrends.daily.map((item: { name: string; sales: number }) => (
                                <TableRow key={item.name}><TableCell className="font-medium">{formatDate(item.name)}</TableCell><TableCell className="text-right">{formatCurrency(item.sales)}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TabsContent>
                <TabsContent value="weekly">
                   <Table>
                        <TableHeader><TableRow><TableHead>Week Starting</TableHead><TableHead className="text-right">Total Sales</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {data.salesTrends.weekly.map((item: { name: string; sales: number }) => (
                                <TableRow key={item.name}><TableCell className="font-medium">{formatDate(item.name)}</TableCell><TableCell className="text-right">{formatCurrency(item.sales)}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TabsContent>
                <TabsContent value="monthly">
                    <Table>
                        <TableHeader><TableRow><TableHead>Month</TableHead><TableHead className="text-right">Total Sales</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {data.salesTrends.monthly.map((item: { name: string; sales: number }) => (
                                <TableRow key={item.name}><TableCell className="font-medium">{item.name}</TableCell><TableCell className="text-right">{formatCurrency(item.sales)}</TableCell></TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      {/* Monthly Financial Breakdown */}
      <Card>
          <CardHeader>
              <CardTitle>Monthly Financial Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                          <TableHead className="text-right">Expenses</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {data.profitVsExpenses.map((item: { name: string; profit: number; expenses: number }) => (
                          <TableRow key={item.name}>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.profit)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.expenses)}</TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
    </div>
  );
}