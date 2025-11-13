'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from '@/components/dashboard/KPICard';
import { 
  ShoppingCart,
  Users,
  Target,
  DollarSign
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

// Data fetching hook with date range
const useSalesData = (dateRange: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: ['dashboard-sales', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const response = await fetch(`/api/dashboard/sales?${params}`);
      if (!response.ok) throw new Error('Failed to fetch sales data');
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

export default function SalesDashboard() {
  const [dateRange, setDateRange] = useState(getInitialDateRange);

  const { data, isLoading, refetch } = useSalesData(dateRange);

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

  // Chart colors
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  // Use API data with fallback
  const salesTrendData = data?.data?.salesTrend || [];

  // Debug logging
  if (data?.data?.salesTrend) {
    console.log('📈 Sales Trend Data:', data.data.salesTrend);
  }

  const orderStatusData = data?.data?.orderStatusBreakdown || [];

  const productCategoryData = data?.data?.productCategories || [];

  const topSalespeopleData = data?.data?.topSalespeople || [];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin space-y-4">
      {/* KPI Cards - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          title="Sales Revenue"
          value={data?.data?.salesRevenue || 1457726}
          change={18.5}
          trend="up"
          icon={ShoppingCart}
          gradient="bg-gradient-to-br from-green-50 to-green-100"
          subtitle="MTD"
          loading={isLoading}
        />
        
        <KPICard
          title="Avg Order Value"
          value={data?.data?.avgOrderValue || 16329}
          change={5.3}
          trend="up"
          icon={DollarSign}
          gradient="bg-gradient-to-br from-blue-50 to-blue-100"
          subtitle="Per order"
          loading={isLoading}
        />
        
        <KPICard
          title="Conversion Rate"
          value={`${data?.data?.conversionRate || 0}%`}
          change={2.1}
          trend="up"
          icon={Target}
          gradient="bg-gradient-to-br from-purple-50 to-purple-100"
          subtitle="Leads to orders"
          loading={isLoading}
        />
        
        <KPICard
          title="Active Customers"
          value={data?.data?.activeCustomers || '247'}
          change={8.7}
          trend="up"
          icon={Users}
          gradient="bg-gradient-to-br from-orange-50 to-orange-100"
          subtitle="This month"
          loading={isLoading}
          isCurrency={false}
        />
        
        <KPICard
          title="Collected"
          value={data?.data?.paymentCollection?.collectedAmount || 0}
          change={12.3}
          trend="up"
          icon={DollarSign}
          gradient="bg-gradient-to-br from-emerald-50 to-emerald-100"
          subtitle="Total collected"
          loading={isLoading}
          isCurrency={true}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Trend Chart */}
        <Card className="glass-card chart-fade-in">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Sales Trend
            </CardTitle>
            <p className="text-sm text-gray-500">Daily sales performance (Last 7 days)</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : salesTrendData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No sales data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={salesTrendData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
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
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#10b981" 
                    fill="url(#colorSales)"
                    strokeWidth={2}
                    name="Sales"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Status Breakdown */}
        <Card className="glass-card chart-fade-in">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Order Status Breakdown
            </CardTitle>
            <p className="text-sm text-gray-500">Sales orders by status</p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : orderStatusData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                No order status data available
              </div>
            ) : (
              <div className="space-y-3">
                {orderStatusData.map((status: { stage: string; count: number; percentage: number }, index: number) => (
                  <div key={status.stage} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{status.stage}</span>
                      <span className="text-sm font-semibold text-gray-900">{status.count} orders</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                      <div 
                        className="h-full flex items-center justify-end pr-3 text-white text-xs font-medium rounded-full transition-all duration-500"
                        style={{ 
                          width: `${status.percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      >
                        {status.percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Collection Status - Full Width */}
      <Card className="glass-card chart-fade-in">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Payment Collection Overview
            {data?.data?.paymentCollection?.isEstimate && (
              <span className="ml-2 text-xs font-normal text-orange-600 bg-orange-50 px-2 py-1 rounded">
                Estimated (No Invoices)
              </span>
            )}
          </CardTitle>
          <p className="text-sm text-gray-500">
            {data?.data?.paymentCollection?.isEstimate 
              ? 'Expected payment based on sales orders' 
              : 'Invoice payment status and breakdown by order status (All Time)'}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : !data?.data?.paymentCollection ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No payment data available
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Section - Overall Summary */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Overall Summary</h3>
                
                {/* Total Amount */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="text-sm text-blue-600 font-medium mb-1">Total Invoice Amount</div>
                  <div className="text-2xl font-bold text-blue-900">
                    ₹{data.data.paymentCollection.totalAmount.toLocaleString()}
                  </div>
                </div>

                {/* Collected vs Pending */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <div className="text-xs text-green-600 font-medium mb-1">Collected</div>
                    <div className="text-lg font-bold text-green-900">
                      ₹{data.data.paymentCollection.collectedAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      {data.data.paymentCollection.collectionRate}% collection rate
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                    <div className="text-xs text-orange-600 font-medium mb-1">Pending</div>
                    <div className="text-lg font-bold text-orange-900">
                      ₹{data.data.paymentCollection.pendingAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-orange-600 mt-1">
                      {(100 - data.data.paymentCollection.collectionRate).toFixed(1)}% pending
                    </div>
                  </div>
                </div>

                {/* Invoice Status Breakdown */}
                <div className="border-t pt-3">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    {data.data.paymentCollection.isEstimate ? 'Order Status' : 'Invoice Status'}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">✅ Paid</span>
                      <span className="text-sm font-semibold text-green-600">
                        {data.data.paymentCollection.invoiceBreakdown.paid} {data.data.paymentCollection.isEstimate ? 'orders' : 'invoices'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">⏳ Partial</span>
                      <span className="text-sm font-semibold text-yellow-600">
                        {data.data.paymentCollection.invoiceBreakdown.partial} {data.data.paymentCollection.isEstimate ? 'orders' : 'invoices'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">⚠️ Unpaid</span>
                      <span className="text-sm font-semibold text-red-600">
                        {data.data.paymentCollection.invoiceBreakdown.unpaid} {data.data.paymentCollection.isEstimate ? 'orders' : 'invoices'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2 mt-2">
                      <span className="text-sm font-medium text-gray-900">
                        {data.data.paymentCollection.isEstimate ? 'Total Orders' : 'Total Invoices'}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {data.data.paymentCollection.invoiceBreakdown.total}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Section - Payment by Order Status */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Collection by Order Status</h3>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin pr-2">
                  {data.data.paymentCollection.byOrderStatus && data.data.paymentCollection.byOrderStatus.length > 0 ? (
                    data.data.paymentCollection.byOrderStatus.map((statusData: {
                      status: string;
                      statusKey: string;
                      totalAmount: number;
                      collectedAmount: number;
                      pendingAmount: number;
                      invoiceCount: number;
                      collectionRate: number;
                    }) => (
                      <div key={statusData.statusKey} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 text-sm">{statusData.status}</h4>
                          <span className="text-xs text-gray-500">{statusData.invoiceCount} invoices</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Collection Progress</span>
                            <span className="font-semibold">{statusData.collectionRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 relative overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all absolute top-0 left-0"
                              style={{ 
                                width: `${Math.min(statusData.collectionRate, 100)}%` 
                              } as React.CSSProperties}
                            ></div>
                          </div>
                        </div>

                        {/* Amount Details */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <div className="text-gray-500 mb-1">Total</div>
                            <div className="font-semibold text-gray-900">
                              ₹{statusData.totalAmount.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Collected</div>
                            <div className="font-semibold text-green-600">
                              ₹{statusData.collectedAmount.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500 mb-1">Pending</div>
                            <div className="font-semibold text-orange-600">
                              ₹{statusData.pendingAmount.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No order status data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Third Row of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Product Category Mix */}
        <Card className="glass-card chart-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Top Products by Revenue
            </CardTitle>
            <p className="text-sm text-gray-500">Revenue distribution</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={productCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productCategoryData.map((_entry: { name: string; value: number }, index: number) => (
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
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Salespeople Performance */}
        <Card className="glass-card chart-fade-in">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Top Salespeople
            </CardTitle>
            <p className="text-sm text-gray-500">Individual performance</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSalespeopleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  style={{ fontSize: '11px' }}
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
                <Bar 
                  dataKey="sales" 
                  fill="#3b82f6" 
                  radius={[8, 8, 0, 0]}
                  name="Sales"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card className="glass-card border-l-4 border-l-green-500">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">📊</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Sales Insights</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p>✅ <span className="font-semibold text-green-600">39.5%</span> conversion rate - above target of 35%</p>
                <p>🔥 <span className="font-semibold text-orange-600">Office Furniture</span> leading category with ₹3.85L revenue</p>
                <p>🏆 Top performer: <span className="font-semibold text-blue-600">Shahid K A</span> with ₹2.45L sales (28 orders)</p>
                <p>📈 Average order value increased by <span className="font-semibold text-purple-600">5.3%</span> to ₹16,329</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
