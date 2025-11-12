'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from '@/components/dashboard/KPICard';
import { 
  ShoppingBag,
  TrendingDown,
  Users,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

// Data fetching hook
const useProcurementData = () => {
  return useQuery({
    queryKey: ['dashboard-procurement'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/procurement');
      if (!response.ok) throw new Error('Failed to fetch procurement data');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });
};

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export default function ProcurementDashboard() {
  const { data, isLoading, refetch } = useProcurementData();

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => refetch();
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [refetch]);

  // Sample data for charts (will be replaced with real API data)
  const purchaseTrendData = data?.data?.purchaseTrend || [
    { date: '05 Nov', purchases: 95000, orders: 8 },
    { date: '06 Nov', purchases: 112000, orders: 10 },
    { date: '07 Nov', purchases: 88000, orders: 7 },
    { date: '08 Nov', purchases: 145000, orders: 12 },
    { date: '09 Nov', purchases: 102000, orders: 9 },
    { date: '10 Nov', purchases: 125000, orders: 11 },
    { date: '11 Nov', purchases: 138000, orders: 13 },
  ];

  const topSuppliersData = data?.data?.topSuppliers || [
    { name: 'Timber Supplies Ltd', value: 285000, orders: 18 },
    { name: 'Hardware Solutions', value: 195000, orders: 24 },
    { name: 'Fabric & Upholstery Co', value: 145000, orders: 12 },
    { name: 'Metal Works Inc', value: 125000, orders: 15 },
    { name: 'Paint & Finishing', value: 95000, orders: 20 },
  ];

  const paymentStatusData = data?.data?.paymentStatus || [
    { name: 'Paid', value: 425000 },
    { name: 'Pending', value: 185000 },
    { name: 'Overdue', value: 45000 },
  ];

  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {/* KPI Cards - All inline */}
      <div className="grid grid-cols-6 gap-3">
        <KPICard
          title="Total Purchases"
          value={data?.data?.totalPurchases || 845000}
          change={12.4}
          trend="up"
          icon={ShoppingBag}
          gradient="bg-gradient-to-br from-purple-50 to-purple-100"
          subtitle="Purchase Orders"
          loading={isLoading}
        />
        
        <KPICard
          title="Vendor Bills"
          value={data?.data?.totalVendorBills || 0}
          change={8.5}
          trend="up"
          icon={ShoppingBag}
          gradient="bg-gradient-to-br from-indigo-50 to-indigo-100"
          subtitle="Total bills"
          loading={isLoading}
        />
        
        <KPICard
          title="Vendor Payments"
          value={data?.data?.totalVendorPayments || 0}
          change={15.2}
          trend="up"
          icon={ShoppingBag}
          gradient="bg-gradient-to-br from-green-50 to-green-100"
          subtitle="Paid amount"
          loading={isLoading}
        />
        
        <KPICard
          title="Pending POs"
          value={data?.data?.pendingPOs || 24}
          change={-8.3}
          trend="down"
          icon={TrendingDown}
          gradient="bg-gradient-to-br from-orange-50 to-orange-100"
          subtitle="Open orders"
          loading={isLoading}
          isCurrency={false}
        />
        
        <KPICard
          title="Active Suppliers"
          value={data?.data?.activeSuppliers || 42}
          change={5.0}
          trend="up"
          icon={Users}
          gradient="bg-gradient-to-br from-blue-50 to-blue-100"
          subtitle="This month"
          loading={isLoading}
          isCurrency={false}
        />
        
        <KPICard
          title="Avg Lead Time"
          value={`${data?.data?.avgLeadTime || 8.5} days`}
          change={-12.5}
          trend="down"
          icon={Clock}
          gradient="bg-gradient-to-br from-teal-50 to-teal-100"
          subtitle="Delivery time"
          loading={isLoading}
          isCurrency={false}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Purchase Order Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Purchase Order Trend
            </CardTitle>
            <p className="text-sm text-gray-500">Last 7 days purchase volume</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={purchaseTrendData}>
                <defs>
                  <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Purchases']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="purchases" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fill="url(#purchaseGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vendor Bills Overdue */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Vendor Bills Overdue
            </CardTitle>
            <p className="text-sm text-gray-500">Top vendors with overdue payments</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data?.data?.vendorOverdueData || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  width={120}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm text-xs">
                          <p className="font-semibold text-gray-800">{data.name}</p>
                          <p className="text-red-600">Overdue: ₹{data.overdueAmount.toLocaleString('en-IN')}</p>
                          <p className="text-gray-600">Bills: {data.overdueCount}</p>
                          <p className="text-gray-600">Avg Days Overdue: {data.avgOverdueDays}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="overdueAmount" 
                  fill="#ef4444" 
                  radius={[0, 4, 4, 0]}
                  label={{ 
                    position: 'right', 
                    fontSize: 11, 
                    fill: '#991b1b',
                    formatter: (value: number) => {
                      const item = data?.data?.vendorOverdueData?.find((i: { overdueAmount: number; overdueCount: number }) => i.overdueAmount === value);
                      return item ? `${item.overdueCount} bills` : '';
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Suppliers by Spend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Top Suppliers by Spend
            </CardTitle>
            <p className="text-sm text-gray-500">Monthly purchase volume</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topSuppliersData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  width={120}
                />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Spend']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#8b5cf6" 
                  radius={[0, 8, 8, 0]}
                  background={{ fill: '#f3f4f6' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Donut */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Payment Status Distribution
            </CardTitle>
            <p className="text-sm text-gray-500">Current payment breakdown</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {paymentStatusData.map((_entry: { name: string; value: number }, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section */}
      <Card className="glass-card border-l-4 border-purple-500">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Procurement Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-purple-700">Cost Optimization:</span> Lead time decreased by 12.5% this month - excellent supplier performance improving inventory efficiency.
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-green-700">Quality Improvement:</span> Return rate dropped to 2.3% - quality control measures showing positive impact.
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-blue-700">Supplier Diversity:</span> 42 active suppliers this month - good diversification reduces supply chain risk.
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-orange-700">Payment Alert:</span> ₹45,000 in overdue payments detected - prioritize clearing overdue balances to maintain supplier relationships.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
