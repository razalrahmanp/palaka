'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package, 
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  format?: 'currency' | 'number' | 'percentage';
  isLoading?: boolean;
}

interface AnalyticsData {
  overview: {
    kpis: {
      totalRevenue: number;
      totalOrders: number;
      avgOrderValue: number;
      activeCustomers: number;
      lowStockItems: number;
      completionRate: number;
    };
    trends: {
      revenueGrowth: number;
      orderGrowth: number;
      customerGrowth: number;
    };
  };
  operational: {
    sales: {
      dailySales: Array<{ date: string; revenue: number; orders: number }>;
      topProducts: Array<{ name: string; revenue: number; units: number }>;
      salesByChannel: Array<{ channel: string; revenue: number }>;
    };
    inventory: {
      stockLevels: Array<{ product: string; current: number; reorder: number; status: string }>;
      lowStockAlerts: Array<{ product: string; current: number; reorder: number }>;
      topMovers: Array<{ product: string; units: number; velocity: string }>;
    };
    production: {
      workOrders: Array<{ status: string; count: number }>;
      efficiency: Array<{ month: string; completed: number; planned: number }>;
      delays: Array<{ project: string; delayDays: number }>;
    };
  };
  financial: {
    profitLoss: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
    cashFlow: Array<{ month: string; inflow: number; outflow: number; net: number }>;
    expenses: Array<{ category: string; amount: number; percentage: number }>;
    bankAccounts: Array<{ name: string; balance: number; type: string }>;
  };
  people: {
    attendance: Array<{ month: string; present: number; absent: number; rate: number }>;
    performance: Array<{ employee: string; score: number; goals: number }>;
    departments: Array<{ dept: string; count: number; avgSalary: number }>;
  };
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  format = 'number',
  isLoading = false
}) => {
  const formatValue = (val: string | number) => {
    if (isLoading) return 'Loading...';
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString('en-IN');
    }
  };

  const getChangeColor = (change?: number) => {
    if (!change) return 'text-gray-500';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const ChangeIcon = change && change >= 0 ? ArrowUp : ArrowDown;

  return (
    <Card className="transition-all duration-300 hover:shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
            </div>
            {change !== undefined && (
              <div className={`flex items-center text-sm ${getChangeColor(change)}`}>
                <ChangeIcon className="h-4 w-4 mr-1" />
                <span>{Math.abs(change).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function CoreAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');

  const fetchAnalytics = React.useCallback(async (section = 'all') => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/analytics/dashboard?range=${timeRange}&section=${section}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        console.error('Analytics fetch failed:', result.error);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const refreshData = () => {
    fetchAnalytics(activeTab === 'overview' ? 'all' : activeTab);
  };

  const renderOverview = () => {
    if (!data?.overview) return <div>Loading overview...</div>;

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            title="Total Revenue"
            value={data.overview.kpis.totalRevenue}
            change={data.overview.trends.revenueGrowth}
            icon={DollarSign}
            format="currency"
            isLoading={isLoading}
          />
          <KPICard
            title="Total Orders"
            value={data.overview.kpis.totalOrders}
            change={data.overview.trends.orderGrowth}
            icon={ShoppingCart}
            isLoading={isLoading}
          />
          <KPICard
            title="Avg Order Value"
            value={data.overview.kpis.avgOrderValue}
            icon={TrendingUp}
            format="currency"
            isLoading={isLoading}
          />
          <KPICard
            title="Active Customers"
            value={data.overview.kpis.activeCustomers}
            change={data.overview.trends.customerGrowth}
            icon={Users}
            isLoading={isLoading}
          />
          <KPICard
            title="Low Stock Items"
            value={data.overview.kpis.lowStockItems}
            icon={AlertTriangle}
            isLoading={isLoading}
          />
          <KPICard
            title="Completion Rate"
            value={data.overview.kpis.completionRate}
            icon={Package}
            format="percentage"
            isLoading={isLoading}
          />
        </div>

        {/* Quick Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.operational?.sales.dailySales || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.operational?.sales.salesByChannel || []}
                    dataKey="revenue"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ channel, percentage }) => `${channel}: ${percentage}%`}
                  >
                    {(data.operational?.sales.salesByChannel || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderOperational = () => {
    if (!data?.operational) return <div>Loading operational data...</div>;

    return (
      <div className="space-y-6">
        {/* Sales Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.operational.sales.dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#3B82F6" name="Revenue (₹)" />
                <Bar yAxisId="right" dataKey="orders" fill="#10B981" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory & Production */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.operational.inventory.lowStockAlerts.slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <span className="font-medium text-red-900">{item.product}</span>
                    <Badge variant="destructive">
                      {item.current}/{item.reorder}
                    </Badge>
                  </div>
                ))}
                {data.operational.inventory.lowStockAlerts.length === 0 && (
                  <p className="text-green-600 text-center py-4">All items are adequately stocked!</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Orders Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.operational.production.workOrders}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {data.operational.production.workOrders.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderFinancial = () => {
    if (!data?.financial) return <div>Loading financial data...</div>;

    return (
      <div className="space-y-6">
        {/* P&L Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Profit & Loss Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.financial.profitLoss}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value}`, '']} />
                <Legend />
                <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
                <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
                <Bar dataKey="profit" fill="#3B82F6" name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cash Flow */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.financial.cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`₹${value}`, '']} />
                  <Legend />
                  <Line type="monotone" dataKey="inflow" stroke="#10B981" name="Inflow" />
                  <Line type="monotone" dataKey="outflow" stroke="#EF4444" name="Outflow" />
                  <Line type="monotone" dataKey="net" stroke="#3B82F6" name="Net" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bank Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Account Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.financial.bankAccounts.map((account, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-gray-600">{account.type}</p>
                    </div>
                    <span className="font-bold text-lg">
                      ₹{account.balance.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderPeople = () => {
    if (!data?.people) return <div>Loading people data...</div>;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Department Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.people.departments.map((dept, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-lg">{dept.dept}</h3>
                  <p className="text-gray-600">{dept.count} employees</p>
                  <p className="text-sm text-gray-500">
                    Avg Salary: ₹{dept.avgSalary.toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Select time range for analytics"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button
            onClick={refreshData}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-gray-200 px-6 py-4">
            <TabsList className="bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="overview" className="px-6 py-2">Overview</TabsTrigger>
              <TabsTrigger value="operational" className="px-6 py-2">Operations</TabsTrigger>
              <TabsTrigger value="financial" className="px-6 py-2">Financial</TabsTrigger>
              <TabsTrigger value="people" className="px-6 py-2">People</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="overview" className="mt-0">
              {renderOverview()}
            </TabsContent>
            
            <TabsContent value="operational" className="mt-0">
              {renderOperational()}
            </TabsContent>
            
            <TabsContent value="financial" className="mt-0">
              {renderFinancial()}
            </TabsContent>
            
            <TabsContent value="people" className="mt-0">
              {renderPeople()}
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
