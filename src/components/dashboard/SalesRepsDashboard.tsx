'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from './KPICard';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  Target, 
  Award, 
  User, 
  DollarSign, 
  Percent, 
  ShoppingCart,
  RotateCcw,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  FileQuestion,
  Clock,
  Package,
  Truck,
  Trophy,
  X
} from 'lucide-react';
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
import EmployeeRankings from '@/components/sales/representative/EmployeeRankings';

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
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalDiscount: number;
  avgOrderValue: number;
  totalReturns: number;
  pendingReturns: number;
  totalComplaints: number;
  openComplaints: number;
  // Order status breakdown
  pendingOrders: number;
  completedOrders: number;
  deliveredOrders: number;
  // Collection tracking
  deliveredCollected: number;
  deliveredPending: number;
  totalCollected: number;
  totalPending: number;
  totalNotInvoiced: number;
}

export default function SalesRepsDashboard() {
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);
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
  const topPerformersByRevenue = kpiData.topPerformersByRevenue || [];
  const topPerformersByConversion = kpiData.topPerformersByConversion || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="h-full overflow-y-auto space-y-6 pb-6">
      {/* KPI Cards - 4 rows with 6 cards each (now 18 total cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Row 1: Core Sales Metrics */}
        <KPICard
          title="Total Sales Reps"
          value={kpiData.totalSalesReps || 0}
          icon={Users}
          change={kpiData.salesRepsTrend || 0}
          gradient="from-blue-500 to-blue-600"
          isCurrency={false}
        />
        <KPICard
          title="Total Revenue"
          value={formatCurrency(kpiData.totalRevenue || 0)}
          icon={DollarSign}
          change={kpiData.revenueTrend || 0}
          gradient="from-green-500 to-green-600"
          isCurrency={false}
        />
        <KPICard
          title="Total Profit"
          value={formatCurrency(kpiData.totalProfit || 0)}
          icon={TrendingUp}
          change={kpiData.profitTrend || 0}
          gradient="from-emerald-500 to-emerald-600"
          isCurrency={false}
        />
        <KPICard
          title="Profit Margin"
          value={`${(kpiData.overallProfitMargin || 0).toFixed(1)}%`}
          icon={Percent}
          change={kpiData.profitMarginTrend || 0}
          gradient="from-teal-500 to-teal-600"
          isCurrency={false}
        />
        <KPICard
          title="Total Orders"
          value={kpiData.totalOrders || 0}
          icon={ShoppingCart}
          change={kpiData.ordersTrend || 0}
          gradient="from-purple-500 to-purple-600"
          isCurrency={false}
        />
        <KPICard
          title="Avg Order Value"
          value={formatCurrency(kpiData.avgOrderValue || 0)}
          icon={TrendingUp}
          change={kpiData.avgOrderValueTrend || 0}
          gradient="from-indigo-500 to-indigo-600"
          isCurrency={false}
        />

        {/* Row 2: Customer & Conversion Metrics */}
        <KPICard
          title="Customers Assigned"
          value={kpiData.totalCustomersAssigned || 0}
          icon={UserCheck}
          change={kpiData.customersAssignedTrend || 0}
          gradient="from-cyan-500 to-cyan-600"
          isCurrency={false}
        />
        <KPICard
          title="Converted Customers"
          value={kpiData.totalConversions || 0}
          icon={Target}
          change={kpiData.conversionsTrend || 0}
          gradient="from-blue-500 to-blue-600"
          isCurrency={false}
        />
        <KPICard
          title="Avg Conversion Rate"
          value={`${(kpiData.avgConversionRate || 0).toFixed(1)}%`}
          icon={Target}
          change={kpiData.conversionRateTrend || 0}
          gradient="from-sky-500 to-sky-600"
          isCurrency={false}
        />
        <KPICard
          title="Total Discount Given"
          value={formatCurrency(kpiData.totalDiscount || 0)}
          icon={Percent}
          change={kpiData.discountTrend || 0}
          gradient="from-orange-500 to-orange-600"
          isCurrency={false}
        />
        <KPICard
          title="Total Returns"
          value={kpiData.totalReturns || 0}
          icon={RotateCcw}
          change={kpiData.returnsTrend || 0}
          gradient="from-red-500 to-red-600"
          isCurrency={false}
        />
        <KPICard
          title="Total Complaints"
          value={kpiData.totalComplaints || 0}
          icon={MessageSquare}
          change={kpiData.complaintsTrend || 0}
          gradient="from-pink-500 to-pink-600"
          isCurrency={false}
        />

        {/* Row 3: Order Status Breakdown */}
        <KPICard
          title="Pending Orders"
          value={salesReps.reduce((sum: number, rep: SalesRep) => sum + (rep.pendingOrders || 0), 0)}
          icon={Clock}
          change={0}
          gradient="from-amber-500 to-amber-600"
          isCurrency={false}
        />
        <KPICard
          title="Completed Orders"
          value={salesReps.reduce((sum: number, rep: SalesRep) => sum + (rep.completedOrders || 0), 0)}
          icon={Package}
          change={0}
          gradient="from-blue-500 to-blue-600"
          isCurrency={false}
        />
        <KPICard
          title="Delivered Orders"
          value={salesReps.reduce((sum: number, rep: SalesRep) => sum + (rep.deliveredOrders || 0), 0)}
          icon={Truck}
          change={0}
          gradient="from-cyan-500 to-cyan-600"
          isCurrency={false}
        />
        <KPICard
          title="Collected Amount"
          value={formatCurrency(salesReps.reduce((sum: number, rep: SalesRep) => sum + (rep.totalCollected || 0), 0))}
          icon={CheckCircle}
          change={0}
          gradient="from-emerald-500 to-emerald-600"
          isCurrency={false}
        />
        <KPICard
          title="Pending Amount"
          value={formatCurrency(salesReps.reduce((sum: number, rep: SalesRep) => sum + (rep.totalPending || 0), 0))}
          icon={AlertCircle}
          change={0}
          gradient="from-yellow-500 to-yellow-600"
          isCurrency={false}
        />
        <KPICard
          title="Not Invoiced"
          value={formatCurrency(salesReps.reduce((sum: number, rep: SalesRep) => sum + (rep.totalNotInvoiced || 0), 0))}
          icon={FileQuestion}
          change={0}
          gradient="from-rose-500 to-rose-600"
          isCurrency={false}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Top Performers by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPerformersByRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
                <Bar dataKey="profit" fill="#6366f1" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Performers by Conversion */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Top Performers by Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPerformersByConversion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="conversions" fill="#f59e0b" name="Conversions" />
                <Bar dataKey="assigned" fill="#3b82f6" name="Assigned" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue vs Profit */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Revenue & Profit Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesReps.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="totalRevenue" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="totalProfit" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Discount & Returns Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5 text-orange-600" />
              Discount & Returns Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesReps.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value: number, name: string) => {
                  if (name === 'Discount') return formatCurrency(value);
                  return value;
                }} />
                <Legend />
                <Bar dataKey="totalDiscount" fill="#f97316" name="Discount" />
                <Bar dataKey="totalReturns" fill="#ef4444" name="Returns" />
                <Bar dataKey="totalComplaints" fill="#ec4899" name="Complaints" />
              </BarChart>
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
                  <th className="text-center py-3 px-4 font-semibold text-sm">Assigned</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Converted</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Conv. Rate</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Orders</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Revenue</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Profit</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Margin</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Collected</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Pending</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Delivered</th>
                  <th className="text-right py-3 px-4 font-semibold text-sm">Discount</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Returns</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Complaints</th>
                  <th className="text-center py-3 px-4 font-semibold text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {salesReps.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="text-center py-8 text-gray-500">
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
                          <div>
                            <div className="font-medium text-sm">{rep.name}</div>
                            <div className="text-xs text-gray-500">{rep.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm font-medium">{rep.customersAssigned || 0}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm font-medium text-green-600">{rep.conversions || 0}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`text-sm font-medium ${
                          (rep.conversionRate || 0) >= 50 ? 'text-green-600' : 
                          (rep.conversionRate || 0) >= 25 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {(rep.conversionRate || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm">{rep.totalOrders || 0}</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="text-sm font-medium text-green-700">
                          {formatCurrency(rep.totalRevenue || 0)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="text-sm font-medium text-indigo-700">
                          {formatCurrency(rep.totalProfit || 0)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`text-sm font-medium ${
                          (rep.profitMargin || 0) >= 30 ? 'text-green-600' : 
                          (rep.profitMargin || 0) >= 15 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {(rep.profitMargin || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="text-sm font-medium text-emerald-700">
                          {formatCurrency(rep.totalCollected || 0)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="text-sm font-medium text-amber-700">
                          {formatCurrency(rep.totalPending || 0)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className="text-sm text-cyan-600">{rep.deliveredOrders || 0}</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="text-sm text-orange-600">
                          {formatCurrency(rep.totalDiscount || 0)}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium text-red-600">{rep.totalReturns || 0}</span>
                          {(rep.pendingReturns || 0) > 0 && (
                            <span className="text-xs text-gray-500">({rep.pendingReturns} pending)</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-medium text-pink-600">{rep.totalComplaints || 0}</span>
                          {(rep.openComplaints || 0) > 0 && (
                            <span className="text-xs text-gray-500">({rep.openComplaints} open)</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          (rep.conversionRate || 0) >= 50
                            ? 'bg-green-100 text-green-800'
                            : (rep.conversionRate || 0) >= 25
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {(rep.conversionRate || 0) >= 50 ? 'Excellent' : (rep.conversionRate || 0) >= 25 ? 'Good' : 'Needs Improvement'}
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

      {/* Floating Rankings Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsRankingsOpen(true)}
          className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center group hover:scale-110 transform"
          title="View Employee Rankings"
        >
          <Trophy className="h-5 w-5" />
        </button>
      </div>

      {/* Rankings Sidebar Modal */}
      {isRankingsOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsRankingsOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 shadow-lg z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="h-6 w-6" />
                  <h2 className="text-2xl font-bold">Employee Rankings</h2>
                </div>
                <button
                  onClick={() => setIsRankingsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <EmployeeRankings timeFilter="all" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
