'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, DollarSign, Package } from 'lucide-react';

interface VendorAnalyticsData {
  summary: {
    totalVendors: number;
    activeVendors: number;
    totalOrders: number;
    totalAmount: number;
    averageDeliveryTime: number;
    onTimeDeliveryRate: number;
  };
  topVendors: Array<{
    id: string;
    name: string;
    totalOrders: number;
    totalAmount: number;
    onTimeRate: number;
    rating: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    orders: number;
    amount: number;
    deliveryTime: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    value: number;
    color: string;
  }>;
  performanceMetrics: Array<{
    vendorId: string;
    vendorName: string;
    qualityScore: number;
    deliveryScore: number;
    priceScore: number;
    overallScore: number;
  }>;
}

interface VendorAnalyticsProps {
  vendorId?: string; // If provided, show analytics for specific vendor
}

export function VendorAnalytics({ vendorId }: VendorAnalyticsProps) {
  const [data, setData] = useState<VendorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('3m');

  const fetchAnalytics = React.useCallback(async () => {
    try {
      setLoading(true);
      const url = vendorId 
        ? `/api/vendors/${vendorId}/analytics?range=${timeRange}`
        : `/api/vendors/analytics?range=${timeRange}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [vendorId, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No analytics data available</p>
        <Button onClick={fetchAnalytics} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {vendorId ? 'Vendor Performance Analytics' : 'Vendor Analytics Dashboard'}
        </h2>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1m">Last Month</SelectItem>
            <SelectItem value="3m">Last 3 Months</SelectItem>
            <SelectItem value="6m">Last 6 Months</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalVendors}</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.activeVendors} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ${data.summary.totalAmount.toLocaleString()} value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Delivery Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.averageDeliveryTime} days</div>
            <p className="text-xs text-muted-foreground">
              {data.summary.onTimeDeliveryRate}% on-time rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.summary.totalAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              This period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Orders and spending over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="orders" fill="#8884d8" name="Orders" />
                <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#82ca9d" name="Amount ($)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Category Distribution</CardTitle>
            <CardDescription>Spending by vendor category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Vendors</CardTitle>
          <CardDescription>Best vendors by orders and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topVendors.map((vendor, index) => (
              <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                    <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{vendor.name}</h4>
                    <p className="text-sm text-gray-500">
                      {vendor.totalOrders} orders • ${vendor.totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={vendor.onTimeRate >= 90 ? "default" : vendor.onTimeRate >= 80 ? "secondary" : "destructive"}>
                    {vendor.onTimeRate}% On-time
                  </Badge>
                  <div className="flex items-center">
                    <span className="text-sm font-medium mr-1">{vendor.rating}</span>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-xs ${star <= vendor.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Performance Scores</CardTitle>
          <CardDescription>Quality, delivery, and pricing performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.performanceMetrics} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="vendorName" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="qualityScore" stackId="a" fill="#8884d8" name="Quality" />
              <Bar dataKey="deliveryScore" stackId="a" fill="#82ca9d" name="Delivery" />
              <Bar dataKey="priceScore" stackId="a" fill="#ffc658" name="Price" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
