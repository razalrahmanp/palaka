'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Star,
  RefreshCw,
  Download
} from 'lucide-react';

interface CustomerSegment {
  segment: string;
  customerCount: number;
  avgLifetimeValue: number;
  avgOrderValue: number;
  avgOrderFrequency: number;
  retentionRate: number;
  profitMargin: number;
  color: string;
}

interface CLVTrend {
  month: string;
  newCustomers: number;
  existingCustomers: number;
  avgCLV: number;
  totalRevenue: number;
}

interface CustomerLifetimeData {
  summary: {
    totalCustomers: number;
    avgLifetimeValue: number;
    topSegmentValue: number;
    retentionRate: number;
    customerGrowthRate: number;
  };
  segments: CustomerSegment[];
  trends: CLVTrend[];
  topCustomers: Array<{
    id: string;
    name: string;
    lifetimeValue: number;
    totalOrders: number;
    avgOrderValue: number;
    lastOrderDate: string;
    segment: string;
  }>;
}

interface CustomerLifetimeValueWidgetProps {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  onExport?: () => void;
}

export default function CustomerLifetimeValueWidget({ 
  dateRange,
  onExport 
}: CustomerLifetimeValueWidgetProps) {
  const [data, setData] = useState<CustomerLifetimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'segments' | 'trends' | 'top-customers'>('segments');

  // Fetch customer lifetime value data
  const fetchCLVData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: dateRange?.startDate || '2024-01-01',
        end_date: dateRange?.endDate || new Date().toISOString().split('T')[0],
        segment: selectedSegment
      });
      
      const response = await fetch(`/api/analytics/customer-lifetime-value?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        console.error('API Error:', result.error);
        // Fallback to mock data if API fails
        setData({
          summary: {
            totalCustomers: 2847,
            avgLifetimeValue: 45650,
            topSegmentValue: 89350,
            retentionRate: 73.5,
            customerGrowthRate: 15.2
          },
          segments: [
            {
              segment: 'VIP Customers',
              customerCount: 156,
              avgLifetimeValue: 89350,
              avgOrderValue: 15420,
              avgOrderFrequency: 5.8,
              retentionRate: 94.2,
              profitMargin: 32.1,
              color: '#8B5CF6'
            },
            {
              segment: 'Regular Customers',
              customerCount: 1245,
              avgLifetimeValue: 52300,
              avgOrderValue: 8760,
              avgOrderFrequency: 4.2,
              retentionRate: 78.5,
              profitMargin: 24.7,
              color: '#10B981'
            },
            {
              segment: 'Occasional Buyers',
              customerCount: 987,
              avgLifetimeValue: 28450,
              avgOrderValue: 5230,
              avgOrderFrequency: 2.1,
              retentionRate: 45.8,
              profitMargin: 18.3,
              color: '#F59E0B'
            },
            {
              segment: 'New Customers',
              customerCount: 459,
              avgLifetimeValue: 12580,
              avgOrderValue: 4120,
              avgOrderFrequency: 1.3,
              retentionRate: 28.9,
              profitMargin: 15.2,
              color: '#EF4444'
            }
          ],
          trends: [
            { month: 'Jan', newCustomers: 45, existingCustomers: 892, avgCLV: 42300, totalRevenue: 2850000 },
            { month: 'Feb', newCustomers: 52, existingCustomers: 934, avgCLV: 43100, totalRevenue: 3120000 },
            { month: 'Mar', newCustomers: 48, existingCustomers: 967, avgCLV: 44200, totalRevenue: 3380000 },
            { month: 'Apr', newCustomers: 61, existingCustomers: 1001, avgCLV: 45100, totalRevenue: 3650000 },
            { month: 'May', newCustomers: 58, existingCustomers: 1045, avgCLV: 45650, totalRevenue: 3890000 },
            { month: 'Jun', newCustomers: 67, existingCustomers: 1089, avgCLV: 46200, totalRevenue: 4120000 }
          ],
          topCustomers: [
            {
              id: '1',
              name: 'Premium Hotels Ltd',
              lifetimeValue: 245000,
              totalOrders: 34,
              avgOrderValue: 18500,
              lastOrderDate: '2025-10-05',
              segment: 'VIP Customers'
            },
            {
              id: '2', 
              name: 'Elite Furnishings',
              lifetimeValue: 189000,
              totalOrders: 28,
              avgOrderValue: 15200,
              lastOrderDate: '2025-10-02',
              segment: 'VIP Customers'
            },
            {
              id: '3',
              name: 'Corporate Solutions Inc',
              lifetimeValue: 156000,
              totalOrders: 22,
              avgOrderValue: 12800,
              lastOrderDate: '2025-09-28',
              segment: 'VIP Customers'
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching CLV data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedSegment]);

  useEffect(() => {
    fetchCLVData();
  }, [dateRange, selectedSegment, fetchCLVData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Lifetime Value Analysis
              </CardTitle>
              <CardDescription>Comprehensive customer value segmentation and trends</CardDescription>
            </div>
            <div className="animate-pulse">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Customer Lifetime Value Analysis
            </CardTitle>
            <CardDescription>Comprehensive customer value segmentation and trends</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(value: 'segments' | 'trends' | 'top-customers') => setViewMode(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="segments">Segment Analysis</SelectItem>
                <SelectItem value="trends">Trends & Growth</SelectItem>
                <SelectItem value="top-customers">Top Customers</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchCLVData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total Customers</p>
                  <p className="text-lg font-bold text-purple-900">{data.summary.totalCustomers.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Avg CLV</p>
                  <p className="text-lg font-bold text-green-900">{formatCurrency(data.summary.avgLifetimeValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Top Segment</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(data.summary.topSegmentValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-orange-600 font-medium">Retention Rate</p>
                  <p className="text-lg font-bold text-orange-900">{data.summary.retentionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-indigo-600 font-medium">Growth Rate</p>
                  <p className="text-lg font-bold text-indigo-900">+{data.summary.customerGrowthRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Content Based on View Mode */}
        {viewMode === 'segments' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Segment Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.segments}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="customerCount"
                      label={({ segment, customerCount }) => `${segment}: ${customerCount}`}
                    >
                      {data.segments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* CLV by Segment Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Average CLV by Segment</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.segments}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="segment" angle={-45} textAnchor="end" height={100} />
                    <YAxis tickFormatter={(value) => `₹${(value/1000).toFixed(0)}K`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Avg CLV']} />
                    <Bar dataKey="avgLifetimeValue" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {viewMode === 'trends' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CLV Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.trends}>
                  <defs>
                    <linearGradient id="colorCLV" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" tickFormatter={(value) => `₹${(value/1000).toFixed(0)}K`} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === 'avgCLV') return [formatCurrency(value), 'Avg CLV'];
                      return [value, name];
                    }}
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="avgCLV" 
                    stroke="#8B5CF6" 
                    fillOpacity={1} 
                    fill="url(#colorCLV)" 
                  />
                  <Line yAxisId="right" type="monotone" dataKey="newCustomers" stroke="#10B981" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {viewMode === 'top-customers' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Customers by Lifetime Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topCustomers.map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-purple-500 text-white rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-semibold">{customer.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{customer.totalOrders} orders</span>
                          <span>Avg: {formatCurrency(customer.avgOrderValue)}</span>
                          <Badge variant="outline">{customer.segment}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">
                        {formatCurrency(customer.lifetimeValue)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Last: {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Segment Details Table */}
        {viewMode === 'segments' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Segment Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Segment</th>
                      <th className="text-right p-2">Customers</th>
                      <th className="text-right p-2">Avg CLV</th>
                      <th className="text-right p-2">Avg Order Value</th>
                      <th className="text-right p-2">Order Frequency</th>
                      <th className="text-right p-2">Retention %</th>
                      <th className="text-right p-2">Profit Margin %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.segments.map((segment) => (
                      <tr key={segment.segment} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full bg-purple-500" 
                            ></div>
                            {segment.segment}
                          </div>
                        </td>
                        <td className="text-right p-2">{segment.customerCount.toLocaleString()}</td>
                        <td className="text-right p-2">{formatCurrency(segment.avgLifetimeValue)}</td>
                        <td className="text-right p-2">{formatCurrency(segment.avgOrderValue)}</td>
                        <td className="text-right p-2">{segment.avgOrderFrequency.toFixed(1)}</td>
                        <td className="text-right p-2">{segment.retentionRate}%</td>
                        <td className="text-right p-2">{segment.profitMargin}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}