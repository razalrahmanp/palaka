'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from '@/components/dashboard/KPICard';
import { 
  Package,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  DollarSign,
  Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart,
  Bar,
  LineChart,
  Line,
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
const useInventoryData = () => {
  return useQuery({
    queryKey: ['dashboard-inventory'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/inventory');
      if (!response.ok) throw new Error('Failed to fetch inventory data');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });
};

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export default function InventoryDashboard() {
  const { data, isLoading, refetch } = useInventoryData();

  // Debug: Log the data
  useEffect(() => {
    if (data?.data) {
      console.log('📦 Inventory Dashboard Data:', {
        productsSold: data.data.productsSold,
        currentStockItems: data.data.currentStockItems
      });
    }
  }, [data]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => refetch();
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [refetch]);

  // Sample data for charts (will be replaced with real API data)
  const stockMovementData = data?.data?.stockMovement || [
    { date: '05 Nov', inbound: 145, outbound: 128, net: 17 },
    { date: '06 Nov', inbound: 132, outbound: 156, net: -24 },
    { date: '07 Nov', inbound: 168, outbound: 142, net: 26 },
    { date: '08 Nov', inbound: 125, outbound: 165, net: -40 },
    { date: '09 Nov', inbound: 198, outbound: 138, net: 60 },
    { date: '10 Nov', inbound: 155, outbound: 172, net: -17 },
    { date: '11 Nov', inbound: 180, outbound: 145, net: 35 },
  ];

  const inventoryAgingData = data?.data?.inventoryAging || [
    { range: '0-30 days', value: 485000, items: 245 },
    { range: '31-60 days', value: 285000, items: 156 },
    { range: '61-90 days', value: 145000, items: 85 },
    { range: '90+ days', value: 85000, items: 52 },
  ];

  const categoryValueData = data?.data?.categoryValue || [
    { name: 'Office Furniture', value: 425000 },
    { name: 'Home Furniture', value: 315000 },
    { name: 'Custom Products', value: 185000 },
    { name: 'Accessories', value: 125000 },
    { name: 'Raw Materials', value: 95000 },
  ];

  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard
          title="Inventory Value"
          value={`₹${((data?.data?.inventoryValue || 1145000) / 1000).toFixed(0)}k`}
          change={8.3}
          trend="up"
          icon={Package}
          gradient="bg-gradient-to-br from-purple-50 to-purple-100"
          subtitle="Total stock value"
          loading={isLoading}
        />
        
        <KPICard
          title="Stock Turnover"
          value={data?.data?.stockTurnover || '4.2x'}
          change={12.5}
          trend="up"
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-blue-50 to-blue-100"
          subtitle="Annual ratio"
          loading={isLoading}
        />
        
        <KPICard
          title="Low Stock Items"
          value={data?.data?.lowStockItems || 18}
          change={-22.0}
          trend="down"
          icon={AlertCircle}
          gradient="bg-gradient-to-br from-orange-50 to-orange-100"
          subtitle="Need reorder"
          loading={isLoading}
        />
        
        <KPICard
          title="Overstock Items"
          value={data?.data?.overstockItems || 12}
          change={-15.8}
          trend="down"
          icon={AlertTriangle}
          gradient="bg-gradient-to-br from-pink-50 to-pink-100"
          subtitle="Excess inventory"
          loading={isLoading}
        />
        
        <KPICard
          title="COGS (MTD)"
          value={`₹${((data?.data?.cogs || 915000) / 1000).toFixed(0)}k`}
          change={5.2}
          trend="up"
          icon={DollarSign}
          gradient="bg-gradient-to-br from-teal-50 to-teal-100"
          subtitle="Cost of goods"
          loading={isLoading}
        />
        
        <KPICard
          title="Gross Margin"
          value={data?.data?.grossMargin || '37.2%'}
          change={3.5}
          trend="up"
          icon={Percent}
          gradient="bg-gradient-to-br from-green-50 to-green-100"
          subtitle="Profit margin"
          loading={isLoading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Products Sold */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Products Sold
            </CardTitle>
            <p className="text-sm text-gray-500">Top products by revenue (All Time)</p>
          </CardHeader>
          <CardContent>
            {data?.data?.productsSold && data.data.productsSold.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.data.productsSold}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.data.productsSold.map((_entry: { name: string; value: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const itemData = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm text-xs">
                            <p className="font-semibold text-gray-800">{itemData.name}</p>
                            <p className="text-gray-600">Quantity: {itemData.quantity}</p>
                            <p className="text-gray-600">Revenue: ₹{itemData.value.toLocaleString('en-IN')}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500 py-16 text-sm">
                <p className="mb-2">No products sold data available</p>
                <p className="text-xs">Check if sales_order_items table has data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Movement Trend */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Stock Movement Trend
            </CardTitle>
            <p className="text-sm text-gray-500">Inbound vs Outbound items (7 days)</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stockMovementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
                <Line 
                  type="monotone" 
                  dataKey="inbound" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Inbound"
                />
                <Line 
                  type="monotone" 
                  dataKey="outbound" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Outbound"
                />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  name="Net Change"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Aging */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Inventory Aging Analysis
            </CardTitle>
            <p className="text-sm text-gray-500">Stock age distribution</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={inventoryAgingData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category" 
                  dataKey="range" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  width={80}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'value') return [`₹${value.toLocaleString()}`, 'Value'];
                    return [value, 'Items'];
                  }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#ec4899" 
                  radius={[0, 8, 8, 0]}
                  background={{ fill: '#f3f4f6' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Value Distribution */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Inventory Value by Category
            </CardTitle>
            <p className="text-sm text-gray-500">Stock value distribution</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryValueData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryValueData.map((_entry: { name: string; value: number }, index: number) => (
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

      {/* Full Width Chart - Current Stock Items with Cost and MRP */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Current Stock Items - Cost vs MRP
          </CardTitle>
          <p className="text-sm text-gray-500">Top 15 products by total value (aggregated by product name)</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data?.data?.currentStockItems || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: '#6b7280' }}
                height={60}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm text-xs">
                        <p className="font-semibold text-gray-800 mb-1">{data.name}</p>
                        <p className="text-gray-600">Total Quantity: {data.quantity} pcs</p>
                        <p className="text-blue-600 font-medium">Total Cost: ₹{data.totalCost.toLocaleString('en-IN')}</p>
                        <p className="text-green-600 font-medium">Total MRP: ₹{data.totalMrp.toLocaleString('en-IN')}</p>
                        <p className="text-purple-600 mt-1">Potential Profit: ₹{(data.totalMrp - data.totalCost).toLocaleString('en-IN')}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar 
                dataKey="totalCost" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
                name="Total Cost"
              />
              <Bar 
                dataKey="totalMrp" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                name="Total MRP"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AI Insights Section */}
      <Card className="glass-card border-l-4 border-purple-500">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            AI Inventory Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-green-700">Healthy Turnover:</span> Stock turnover at 4.2x annually - excellent inventory velocity maintaining optimal cash flow.
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-orange-700">Reorder Alert:</span> 18 items are below minimum stock levels - automated purchase orders recommended for critical items.
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-blue-700">Margin Optimization:</span> Gross margin at 37.2% - up 3.5% from last month. COGS optimization showing positive impact.
              </p>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-pink-700">Aging Concern:</span> ₹85,000 in inventory aged 90+ days - consider promotions or bundling to clear slow-moving stock.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
