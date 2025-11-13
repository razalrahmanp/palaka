'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from './KPICard';
import { Users, UserCheck, TrendingUp, Target, Award, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Helper to get initial date range from sessionStorage or default to current month
const getInitialDateRange = () => {
  const stored = sessionStorage.getItem('dashboard-date-range');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.startDate && parsed.endDate) {
        return { startDate: parsed.startDate, endDate: parsed.endDate };
      }
    } catch (e) {
      console.error('Failed to parse stored date range:', e);
    }
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    startDate: new Date(year, month, 1).toISOString().split('T')[0],
    endDate: new Date(year, month + 1, 0).toISOString().split('T')[0]
  };
};

// Data fetching hook with date range
const useSalesRepsData = (dateRange: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: ['dashboard-sales-reps', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const response = await fetch(`/api/dashboard/sales-reps?${params}`);
      if (!response.ok) throw new Error('Failed to fetch sales reps data');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });
};

interface SalesRep {
  id: number;
  name: string;
  email?: string;
  customersAssigned: number;
  conversions: number;
  conversionRate: number;
}

export default function SalesRepsDashboard() {
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const { data, isLoading, refetch } = useSalesRepsData(dateRange);

  // Listen for date filter changes and refresh events
  useEffect(() => {
    const handleDateChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { startDate, endDate } = customEvent.detail;
      if (startDate && endDate) {
        setDateRange({ startDate, endDate });
      }
    };

    const handleRefresh = () => refetch();
    
    window.addEventListener('dashboard-date-change', handleDateChange);
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-date-change', handleDateChange);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const kpiData = data?.data || {};
  const salesReps = kpiData.salesReps || [];
  const topPerformers = kpiData.topPerformers || [];
  const conversionTrend = kpiData.conversionTrend || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Sales Reps"
          value={kpiData.totalSalesReps || 0}
          icon={Users}
          change={kpiData.salesRepsTrend || 0}
          gradient="from-blue-500 to-blue-600"
          isCurrency={false}
        />
        <KPICard
          title="Total Customers Assigned"
          value={kpiData.totalCustomersAssigned || 0}
          icon={UserCheck}
          change={kpiData.customersAssignedTrend || 0}
          gradient="from-green-500 to-green-600"
          isCurrency={false}
        />
        <KPICard
          title="Converted Customers"
          value={kpiData.totalConversions || 0}
          icon={TrendingUp}
          change={kpiData.conversionsTrend || 0}
          gradient="from-purple-500 to-purple-600"
          isCurrency={false}
        />
        <KPICard
          title="Avg Conversion Rate"
          value={`${kpiData.avgConversionRate || 0}%`}
          icon={Target}
          change={kpiData.conversionRateTrend || 0}
          gradient="from-orange-500 to-orange-600"
          isCurrency={false}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Top Performers by Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPerformers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="conversions" fill="#10b981" name="Conversions" />
                <Bar dataKey="assigned" fill="#3b82f6" name="Assigned" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Conversion Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="conversions" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Conversions"
                />
                <Line 
                  type="monotone" 
                  dataKey="assigned" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Assigned"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sales Reps Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Sales Representatives Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Sales Rep</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Customers Assigned</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Converted</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Conversion Rate</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {salesReps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No sales representatives data available
                    </td>
                  </tr>
                ) : (
                  salesReps.map((rep: SalesRep, index: number) => (
                    <tr key={rep.id || index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{rep.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium text-sm">
                          {rep.customersAssigned || 0}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium text-sm">
                          {rep.conversions || 0}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                              style={{ width: `${Math.min(rep.conversionRate || 0, 100)}%` }}
                            ></div>
                          </div>
                          <span className="font-semibold text-sm">{rep.conversionRate?.toFixed(1) || 0}%</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rep.conversionRate >= 50 
                            ? 'bg-green-100 text-green-800'
                            : rep.conversionRate >= 25
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {rep.conversionRate >= 50 ? 'Excellent' : rep.conversionRate >= 25 ? 'Good' : 'Needs Improvement'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
