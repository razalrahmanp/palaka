'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from './KPICard';
import { Truck, Clock, Gauge, DollarSign, PackageX, TrendingUp, MapPin, AlertCircle } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

// Custom hook to fetch Logistics data with date range
const useLogisticsData = (dateRange: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: ['dashboard-logistics', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const response = await fetch(`/api/dashboard/logistics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch Logistics data');
      }
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });
};

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

export default function LogisticsDashboard() {
  const [dateRange, setDateRange] = useState(getInitialDateRange);

  const { data, isLoading, refetch } = useLogisticsData(dateRange);

  // Listen for date filter changes and refresh events
  useEffect(() => {
    const handleDateChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { startDate, endDate } = customEvent.detail;
      if (startDate && endDate) {
        setDateRange({ startDate, endDate });
      }
    };

    const handleRefresh = () => {
      refetch();
    };

    window.addEventListener('dashboard-date-change', handleDateChange);
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-date-change', handleDateChange);
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [refetch]);

  // Sample data for development
  const totalDeliveries = data?.data?.totalDeliveries || 284;
  const onTimePercentage = data?.data?.onTimePercentage || '91.5';
  const fleetUtilization = data?.data?.fleetUtilization || '78.3';
  const avgDeliveryCost = data?.data?.avgDeliveryCost || 1250;
  const pendingDeliveries = data?.data?.pendingDeliveries || 42;

  const deliveryTrendData = data?.data?.deliveryTrend || [
    { date: '05 Nov', completed: 38, pending: 8, failed: 2 },
    { date: '06 Nov', completed: 42, pending: 6, failed: 1 },
    { date: '07 Nov', completed: 45, pending: 9, failed: 3 },
    { date: '08 Nov', completed: 39, pending: 7, failed: 2 },
    { date: '09 Nov', completed: 41, pending: 5, failed: 1 },
    { date: '10 Nov', completed: 44, pending: 8, failed: 2 },
    { date: '11 Nov', completed: 35, pending: 9, failed: 1 },
  ];

  const routeEfficiencyData = data?.data?.routeEfficiency || [
    { route: 'Route A', avgTime: 2.5, deliveries: 45, efficiency: 95 },
    { route: 'Route B', avgTime: 3.2, deliveries: 38, efficiency: 88 },
    { route: 'Route C', avgTime: 2.8, deliveries: 42, efficiency: 92 },
    { route: 'Route D', avgTime: 4.1, deliveries: 28, efficiency: 78 },
    { route: 'Route E', avgTime: 3.5, deliveries: 35, efficiency: 85 },
    { route: 'Route F', avgTime: 2.3, deliveries: 48, efficiency: 97 },
  ];

  const vehiclePerformanceData = data?.data?.vehiclePerformance || [
    { vehicle: 'V-101', trips: 45, utilization: 85, fuel: 425, maintenance: 'Good' },
    { vehicle: 'V-102', trips: 38, utilization: 72, fuel: 380, maintenance: 'Good' },
    { vehicle: 'V-103', trips: 52, utilization: 95, fuel: 510, maintenance: 'Fair' },
    { vehicle: 'V-104', trips: 28, utilization: 58, fuel: 285, maintenance: 'Good' },
    { vehicle: 'V-105', trips: 42, utilization: 78, fuel: 415, maintenance: 'Good' },
    { vehicle: 'V-106', trips: 35, utilization: 68, fuel: 345, maintenance: 'Fair' },
  ];

  const deliveryStatusData = data?.data?.deliveryStatus || [
    { status: 'Completed', count: 242, percentage: 85.2, color: '#22c55e' },
    { status: 'In Transit', count: 28, percentage: 9.9, color: '#3b82f6' },
    { status: 'Pending', count: 14, percentage: 4.9, color: '#f59e0b' },
    { status: 'Failed', count: 0, percentage: 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Deliveries"
          value={totalDeliveries}
          change={8.3}
          trend="up"
          icon={Truck}
          gradient="from-blue-500 to-blue-600"
          subtitle="MTD completed"
          loading={isLoading}
        />
        <KPICard
          title="On-Time Delivery"
          value={`${onTimePercentage}%`}
          change={2.5}
          trend="up"
          icon={Clock}
          gradient="from-green-500 to-green-600"
          subtitle="Performance rate"
          loading={isLoading}
        />
        <KPICard
          title="Fleet Utilization"
          value={`${fleetUtilization}%`}
          change={-1.2}
          trend="down"
          icon={Gauge}
          gradient="from-purple-500 to-purple-600"
          subtitle="Active vehicles"
          loading={isLoading}
        />
        <KPICard
          title="Avg Delivery Cost"
          value={`₹${avgDeliveryCost}`}
          change={-3.8}
          trend="down"
          icon={DollarSign}
          gradient="from-orange-500 to-orange-600"
          subtitle="Per delivery"
          loading={isLoading}
        />
        <KPICard
          title="Pending Deliveries"
          value={pendingDeliveries}
          change={-12.5}
          trend="down"
          icon={PackageX}
          gradient="from-red-500 to-red-600"
          subtitle="Awaiting dispatch"
          loading={isLoading}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Delivery Trend */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Daily Delivery Trend (7 Days)
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={deliveryTrendData}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                  name="Completed"
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  stroke="#f59e0b"
                  fillOpacity={1}
                  fill="url(#colorPending)"
                  name="Pending"
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Failed"
                  dot={{ fill: '#ef4444', r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Route Efficiency */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              Route Efficiency Analysis
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={routeEfficiencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="route" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: 'Deliveries', angle: 90, position: 'insideRight' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="avgTime" fill="#8b5cf6" name="Avg Time (hrs)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="deliveries" fill="#3b82f6" name="Deliveries" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Vehicle Performance Table */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Gauge className="h-5 w-5 text-orange-600" />
              Fleet Performance
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading data...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-gray-700">Vehicle</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">Trips</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">Util%</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">Fuel(L)</th>
                    <th className="text-center py-2 px-2 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vehiclePerformanceData.map((vehicle: { vehicle: string; trips: number; utilization: number; fuel: number; maintenance: string }, idx: number) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-medium text-gray-800">{vehicle.vehicle}</td>
                      <td className="py-2 px-2 text-center text-gray-700">{vehicle.trips}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          vehicle.utilization >= 80 ? 'bg-green-100 text-green-700' :
                          vehicle.utilization >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {vehicle.utilization}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-gray-700">{vehicle.fuel}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          vehicle.maintenance === 'Good' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {vehicle.maintenance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delivery Status Distribution */}
        <div className="glass-card p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              Delivery Status Distribution
            </h3>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart...</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deliveryStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percentage }: { status: string; percentage: number }) => `${status}: ${percentage}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {deliveryStatusData.map((entry: { color: string }, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* AI Insights */}
      <div className="glass-card p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-indigo-600" />
          AI-Powered Logistics Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-900">Excellent On-Time Rate</p>
                <p className="text-xs text-green-700 mt-1">
                  91.5% on-time delivery exceeds industry standard of 85%. Route F performing exceptionally at 97% efficiency.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Gauge className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-900">Optimize Fleet Usage</p>
                <p className="text-xs text-orange-700 mt-1">
                  Vehicle V-104 only at 58% utilization. Consider route reassignment to maximize fleet efficiency.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-900">Cost Reduction Trend</p>
                <p className="text-xs text-blue-700 mt-1">
                  Average delivery cost down 3.8% to ₹1,250. Fuel optimization and route planning showing results.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-900">Route D Needs Attention</p>
                <p className="text-xs text-purple-700 mt-1">
                  Route D has highest avg time (4.1 hrs) and lowest efficiency (78%). Review route optimization.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
