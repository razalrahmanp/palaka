'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from '@/components/dashboard/KPICard';
import { 
  IndianRupee, 
  TrendingUp, 
  Wallet, 
  AlertCircle, 
  ShoppingBag,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
  ComposedChart,
  Line,
  LabelList
} from 'recharts';

// Data fetching hook
const useOverviewData = () => {
  return useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/overview');
      if (!response.ok) throw new Error('Failed to fetch overview data');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};

export default function OverviewDashboard() {
  const { data, isLoading, refetch } = useOverviewData();

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => refetch();
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [refetch]);

  // Use API data or fallback to empty array
  const revenueTrendData = data?.data?.revenueTrend || [];
  const topProductsData = data?.data?.topProducts || [];
  const topSuppliersData = data?.data?.topSuppliers || [];

  // Debug logging
  if (topProductsData.length > 0) {
    console.log('📊 Top Products Data in Component:', topProductsData);
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin space-y-4">
      {/* KPI Cards - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Revenue"
          value={data?.data?.revenue || 0}
          change={15.3}
          trend="up"
          icon={IndianRupee}
          gradient="bg-gradient-to-br from-blue-50 to-blue-100"
          subtitle="MTD"
          loading={isLoading}
        />
        
        <KPICard
          title="Net Profit"
          value={data?.data?.profit || 0}
          change={-8.2}
          trend="down"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-green-50 to-green-100"
          subtitle="After all expenses"
          loading={isLoading}
        />
        
        <KPICard
          title="Cash Position"
          value={data?.data?.cashPosition || 0}
          change={3.5}
          trend="up"
          icon={Wallet}
          gradient="bg-gradient-to-br from-purple-50 to-purple-100"
          subtitle="Current balance"
          loading={isLoading}
        />
        
        <KPICard
          title="Pending Collections"
          value={data?.data?.pendingCollections || 0}
          change={-5.2}
          trend="down"
          icon={AlertCircle}
          gradient="bg-gradient-to-br from-orange-50 to-orange-100"
          subtitle="Outstanding"
          loading={isLoading}
        />
        
        <KPICard
          title="Active Orders"
          value={data?.data?.activeOrders || 0}
          change={12.5}
          trend="up"
          icon={ShoppingBag}
          gradient="bg-gradient-to-br from-teal-50 to-teal-100"
          subtitle="In progress"
          loading={isLoading}
        />
        
        <KPICard
          title="Quick Ratio"
          value={data?.data?.quickRatio || '0.00'}
          change={0.8}
          trend="up"
          icon={Activity}
          gradient="bg-gradient-to-br from-indigo-50 to-indigo-100"
          subtitle="Liquidity health"
          loading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue vs Profit Trend */}
        <Card className="glass-card chart-fade-in">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Revenue vs Profit Trend
            </CardTitle>
            <p className="text-sm text-gray-500">Last 7 days performance</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  stroke="#6b7280" 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  fill="url(#colorProfit)"
                  strokeWidth={2}
                  name="Profit"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products by Revenue */}
        <Card className="glass-card chart-fade-in">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Top Products by Revenue
            </CardTitle>
            <p className="text-sm text-gray-500">Best performing products this month</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
              </div>
            ) : topProductsData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-gray-500">No product sales data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart 
                  data={topProductsData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  barSize={28}
                >
                  <defs>
                    <linearGradient id="colorBar1" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.9}/>
                    </linearGradient>
                    <linearGradient id="colorBar2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.9}/>
                    </linearGradient>
                    <linearGradient id="colorBar3" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.9}/>
                    </linearGradient>
                    <linearGradient id="colorBar4" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.9}/>
                    </linearGradient>
                    <linearGradient id="colorBar5" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0.9}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number"
                    stroke="#6b7280"
                    style={{ fontSize: '11px', fontWeight: '500' }}
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    domain={[0, 'dataMax']}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name" 
                    stroke="#6b7280"
                    style={{ fontSize: '11px', fontWeight: '600' }}
                    width={130}
                    tick={{ fill: '#374151' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.98)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                      fontWeight: '500',
                      padding: '12px 16px'
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Revenue']}
                    labelStyle={{ color: '#111827', fontWeight: '700', marginBottom: '4px' }}
                    cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                  />
                  <Bar 
                    dataKey="revenue" 
                    radius={[0, 12, 12, 0]}
                    name="Revenue"
                    background={{ fill: '#f3f4f6' }}
                  >
                    {topProductsData.map((_entry: unknown, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#colorBar${(index % 5) + 1})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Suppliers - Full Width */}
      <Card className="glass-card chart-fade-in">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Top Suppliers Performance
          </CardTitle>
          <p className="text-sm text-gray-500">Order volume and total purchase value this month</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[350px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : topSuppliersData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-gray-500">
              No supplier data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart 
                data={topSuppliersData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.7}/>
                  </linearGradient>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.7}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  hide={true}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#3b82f6" 
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981" 
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '13px',
                    padding: '16px'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Orders') return [value, 'Orders'];
                    if (name === 'Total Value') return [`₹${value.toLocaleString()}`, 'Total Value'];
                    return [value, name];
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                />
                <Bar 
                  yAxisId="left"
                  dataKey="orders" 
                  fill="url(#ordersGradient)"
                  radius={[8, 8, 0, 0]}
                  name="Orders"
                  maxBarSize={80}
                >
                  <LabelList 
                    dataKey="name" 
                    position="bottom" 
                    offset={10}
                    style={{ 
                      fill: '#374151', 
                      fontSize: '12px', 
                      fontWeight: '500'
                    }} 
                  />
                </Bar>
                <Line 
                  yAxisId="right"
                  type="monotone"
                  dataKey="value" 
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 6 }}
                  activeDot={{ r: 8 }}
                  name="Total Value"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* AI Insight Feed - Bottom */}
      <Card className="glass-card border-l-4 border-l-blue-500">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💡</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">AI Insights</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>✅ Revenue up <span className="font-semibold text-green-600">15.3%</span> compared to last month</p>
                <p>⚠️ Alert: <span className="font-semibold text-orange-600">12 products</span> below reorder level</p>
                <p>📊 Top performing category: <span className="font-semibold text-blue-600">Office Furniture</span> (+23% sales)</p>
                <p>💰 Cash runway: <span className="font-semibold text-purple-600">45 days</span> at current burn rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
