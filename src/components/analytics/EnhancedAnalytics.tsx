'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp, TrendingDown, AlertTriangle, 
  Factory, DollarSign, Package, Target, Clock,
  Shield, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';

// Define types for better type safety
interface Alert {
  message: string;
  severity: 'high' | 'medium' | 'low';
}

interface InventoryItem {
  product_name: string;
  abc_category: 'A' | 'B' | 'C';
  current_stock: number;
  annual_usage_value: number;
  reorder_recommendation: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Helper function for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Enhanced KPI Card Component
interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  format?: 'currency' | 'percent' | 'number' | 'days';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
}

const KpiCard: React.FC<KpiCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  format = 'number', 
  trend = 'neutral',
  trendValue,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-200/30',
    green: 'from-green-500/10 to-green-600/5 border-green-200/30',
    orange: 'from-orange-500/10 to-orange-600/5 border-orange-200/30',
    red: 'from-red-500/10 to-red-600/5 border-red-200/30',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-200/30'
  };

  const iconColors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600', 
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600'
  };

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'days':
        return `${val} days`;
      default:
        return val.toLocaleString('en-IN');
    }
  };

  return (
    <div className="group relative">
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl -z-10" />
    
    <Card className={`relative bg-gradient-to-br ${colorClasses[color]} bg-white/80 backdrop-blur-sm border-2 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group-hover:scale-[1.02]`}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r opacity-60" />
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6">
          <CardTitle className="text-sm font-semibold text-gray-700 leading-tight">{title}</CardTitle>
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${iconColors[color]} flex items-center justify-center shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        
        <CardContent className="pb-6">
          <div className="space-y-3">
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              {formatValue(value)}
            </div>
            {trendValue && (
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  trend === 'up' ? 'bg-green-100 text-green-700' : 
                  trend === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {trend === 'up' ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : trend === 'down' ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  <span>{trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%</span>
                </div>
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Enhanced Chart Container Component
const ChartContainer: React.FC<{ title: string; children: React.ReactElement; subtitle?: string }> = ({ 
  title, 
  children, 
  subtitle 
}) => (
  <div className="group relative">
    <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-blue-50/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10" />
    
    <Card className="relative bg-white/80 backdrop-blur-sm border border-white/30 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden group-hover:scale-[1.01]">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-60" />
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-gray-900 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1 ml-11">{subtitle}</p>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="relative">
          <ResponsiveContainer width="100%" height={320}>
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  </div>
);

// API fetch function
const fetchEnhancedAnalytics = async () => {
  const res = await fetch('/api/analytics/enhanced');
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.details || 'Failed to fetch enhanced analytics');
  }
  return res.json();
};

// Loading Skeleton Component
const AnalyticsLoading = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-6">
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-gray-200 rounded-lg w-80 animate-pulse" />
        <div className="h-6 bg-gray-200 rounded-full w-24 animate-pulse" />
      </div>
      
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-32 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg animate-pulse border border-white/20" />
        ))}
      </div>
      
      {/* Chart Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg animate-pulse border border-white/20" />
        <div className="h-80 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg animate-pulse border border-white/20" />
      </div>
    </div>
  </div>
);

// Main Enhanced Analytics Component
export default function EnhancedAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['enhancedAnalytics'],
    queryFn: fetchEnhancedAnalytics,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return <AnalyticsLoading />;
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="border-red-200/50 bg-red-50/80 backdrop-blur-sm shadow-2xl">
            <CardContent className="p-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="h-10 w-10 text-red-500" />
                </div>
                <h3 className="text-xl font-semibold text-red-800 mb-2">Error Loading Analytics</h3>
                <p className="text-red-600 text-sm max-w-sm mx-auto">
                  {(error as Error)?.message || 'Unable to fetch analytics data. Please try again later.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { kpis, production, financial, inventory, alerts } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Enhanced Header */}
        <div className="flex items-center justify-between pb-6 border-b border-white/20">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                Enhanced Analytics Dashboard
              </h1>
              <p className="text-gray-600 text-sm mt-1">Real-time insights for your furniture business</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white/20">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-gray-700">Live Data</span>
            </div>
          </div>
        </div>

        {/* Enhanced Alerts Section */}
        {alerts && alerts.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-100/20 to-red-100/20 rounded-2xl" />
            <Card className="relative bg-white/70 backdrop-blur-sm shadow-xl border border-orange-200/50 rounded-2xl overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-red-500" />
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-orange-800">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold">System Alerts</span>
                  <Badge variant="destructive" className="ml-auto">{alerts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert: Alert, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/80 rounded-xl border border-orange-100/50 shadow-sm hover:shadow-md transition-all duration-200">
                      <span className="text-sm font-medium text-gray-700">{alert.message}</span>
                      <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'} className="font-semibold">
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Order Fulfillment Rate"
            value={kpis?.order_fulfillment_rate || 0}
            icon={Target}
            format="percent"
            color="green"
            trend="up"
            trendValue={2.5}
          />
          <KpiCard
            title="Avg Production Time"
            value={kpis?.average_production_days || 0}
            icon={Clock}
            format="days"
            color="blue"
            trend="down"
            trendValue={-1.2}
          />
          <KpiCard
            title="Material Cost %"
            value={kpis?.material_cost_percentage || 0}
            icon={Package}
            format="percent"
            color="orange"
            trend="neutral"
          />
          <KpiCard
            title="Inventory Health"
            value={kpis?.inventory_health_score || 0}
            icon={Shield}
            format="percent"
            color="purple"
            trend="up"
            trendValue={0.8}
          />
          <KpiCard
            title="Avg Defect Rate"
            value={kpis?.avg_defect_rate || 0}
            icon={AlertTriangle}
            format="percent"
            color="red"
            trend="down"
            trendValue={-0.5}
          />
          <KpiCard
            title="Active Orders"
            value={kpis?.total_active_orders || 0}
            icon={BarChart3}
            color="blue"
            trend="up"
            trendValue={12.3}
          />
          <KpiCard
            title="Critical Stock Items"
            value={kpis?.critical_stock_items || 0}
            icon={Package}
            color="red"
            trend="down"
            trendValue={-3.2}
          />
          <KpiCard
            title="Production Efficiency"
            value={production?.avgEfficiency || 0}
            icon={Factory}
            format="percent"
            color="green"
            trend="up"
            trendValue={4.1}
          />
        </div>

        {/* Enhanced Tabbed Analytics */}
        <div className="relative">
          <div className="absolute inset-0 bg-white/30 backdrop-blur-sm rounded-3xl" />
          <Card className="relative border-white/30 bg-white/70 backdrop-blur-sm shadow-2xl rounded-3xl overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b border-white/20 bg-gradient-to-r from-white/80 to-blue-50/50">
                <TabsList className="grid w-full grid-cols-4 bg-transparent p-2 h-auto">
                  <TabsTrigger 
                    value="overview" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-700 rounded-xl py-3 px-6 font-semibold transition-all duration-300"
                  >
                    <div className="flex items-center space-x-2">
                      <PieChartIcon className="h-4 w-4" />
                      <span>Overview</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="production" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-700 rounded-xl py-3 px-6 font-semibold transition-all duration-300"
                  >
                    <div className="flex items-center space-x-2">
                      <Factory className="h-4 w-4" />
                      <span>Production</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="financial" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-700 rounded-xl py-3 px-6 font-semibold transition-all duration-300"
                  >
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4" />
                      <span>Financial</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="inventory" 
                    className="data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-700 rounded-xl py-3 px-6 font-semibold transition-all duration-300"
                  >
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>Inventory</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                <TabsContent value="overview" className="space-y-8 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Enhanced Financial Overview */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-100/50 to-blue-100/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10" />
                      
                      <Card className="relative bg-white/90 backdrop-blur-sm border border-white/40 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                        
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                              <DollarSign className="h-5 w-5 text-white" />
                            </div>
                            Financial Performance
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="space-y-6">
                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                              <span className="text-sm font-semibold text-gray-700">Gross Profit</span>
                              <span className="text-xl font-bold text-green-600">
                                {formatCurrency(financial?.gross_profit || 0)}
                              </span>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-600">Gross Margin</span>
                                <span className="text-lg font-bold text-gray-900">
                                  {(financial?.gross_margin_percentage || 0).toFixed(1)}%
                                </span>
                              </div>
                              <div className="relative">
                                <Progress 
                                  value={financial?.gross_margin_percentage || 0} 
                                  className="h-3 bg-gray-100 rounded-full overflow-hidden" 
                                />
                              </div>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                              <span className="text-sm font-semibold text-gray-700">Net Profit</span>
                              <span className={`text-xl font-bold ${
                                (financial?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(financial?.net_profit || 0)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Enhanced Inventory Health */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-100/50 to-pink-100/30 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10" />
                      
                      <Card className="relative bg-white/90 backdrop-blur-sm border border-white/40 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-pink-500" />
                        
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center text-lg font-bold text-gray-900">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                              <PieChartIcon className="h-5 w-5 text-white" />
                            </div>
                            Inventory ABC Analysis
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent>
                          <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'High Value (A)', value: inventory?.categoryBreakdown?.A || 0, fill: '#3B82F6' },
                                  { name: 'Medium Value (B)', value: inventory?.categoryBreakdown?.B || 0, fill: '#10B981' },
                                  { name: 'Low Value (C)', value: inventory?.categoryBreakdown?.C || 0, fill: '#F59E0B' }
                                ]}
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}
                                labelLine={false}
                              >
                                {[
                                  { name: 'Category A', value: inventory?.categoryBreakdown?.A || 0 },
                                  { name: 'Category B', value: inventory?.categoryBreakdown?.B || 0 },
                                  { name: 'Category C', value: inventory?.categoryBreakdown?.C || 0 }
                                ].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                  border: 'none',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="production" className="space-y-8 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ChartContainer 
                      title="Production Efficiency by Product" 
                      subtitle="Top 10 products by efficiency score"
                    >
                      <BarChart data={production?.efficiency?.slice(0, 10) || []} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="product_name" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                        />
                        <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Bar 
                          dataKey="efficiency_score" 
                          fill="url(#blueGradient)" 
                          name="Efficiency %" 
                          radius={[4, 4, 0, 0]}
                        />
                        <defs>
                          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" />
                            <stop offset="100%" stopColor="#1E40AF" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ChartContainer>

                    <ChartContainer 
                      title="Quality Trends" 
                      subtitle="Daily defect rate over the last 30 days"
                    >
                      <LineChart data={production?.qualityTrends?.slice(-30) || []} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="log_date" 
                          tick={{ fontSize: 12, fill: '#6B7280' }}
                        />
                        <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="defect_rate" 
                          stroke="#EF4444" 
                          strokeWidth={3}
                          dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#EF4444', strokeWidth: 2, fill: '#fff' }}
                          name="Defect Rate %" 
                        />
                      </LineChart>
                    </ChartContainer>
                  </div>
                </TabsContent>

                <TabsContent value="financial" className="space-y-8 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-2 bg-white/90 backdrop-blur-sm border border-white/40 shadow-lg rounded-2xl overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
                      
                      <CardHeader className="pb-6">
                        <CardTitle className="text-xl font-bold text-gray-900">Financial Health Metrics</CardTitle>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                            <div className="text-sm font-semibold text-gray-600">Working Capital</div>
                            <div className="text-3xl font-bold text-blue-600">
                              {formatCurrency(financial?.working_capital || 0)}
                            </div>
                          </div>
                          <div className="space-y-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                            <div className="text-sm font-semibold text-gray-600">Accounts Receivable</div>
                            <div className="text-3xl font-bold text-orange-600">
                              {formatCurrency(financial?.accounts_receivable || 0)}
                            </div>
                          </div>
                          <div className="space-y-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                            <div className="text-sm font-semibold text-gray-600">Inventory Value</div>
                            <div className="text-3xl font-bold text-green-600">
                              {formatCurrency(financial?.inventory_value || 0)}
                            </div>
                          </div>
                          <div className="space-y-3 p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-100">
                            <div className="text-sm font-semibold text-gray-600">Operating Expenses</div>
                            <div className="text-3xl font-bold text-red-600">
                              {formatCurrency(financial?.operating_expenses || 0)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-sm border border-white/40 shadow-lg rounded-2xl overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-pink-500" />
                      
                      <CardHeader className="pb-6">
                        <CardTitle className="text-xl font-bold text-gray-900">Profitability</CardTitle>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-6">
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-gray-600">Gross Margin</span>
                              <span className="text-gray-900">{(financial?.gross_margin_percentage || 0).toFixed(1)}%</span>
                            </div>
                            <div className="relative">
                              <Progress value={financial?.gross_margin_percentage || 0} className="h-3 bg-gray-100 rounded-full" />
                            </div>
                          </div>
                          <div className="pt-6 border-t border-gray-200">
                            <div className="text-center space-y-3">
                              <div className="text-sm font-semibold text-gray-600">Net Profit</div>
                              <div className={`text-4xl font-bold ${
                                (financial?.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatCurrency(financial?.net_profit || 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="inventory" className="space-y-8 mt-0">
                  <Card className="bg-white/90 backdrop-blur-sm border border-white/40 shadow-lg rounded-2xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-orange-500" />
                    
                    <CardHeader className="pb-6">
                      <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                          <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                        Critical Inventory Items
                        <Badge variant="destructive" className="ml-3">Reorder Required</Badge>
                      </CardTitle>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left p-4 font-semibold text-gray-700">Product</th>
                              <th className="text-left p-4 font-semibold text-gray-700">Category</th>
                              <th className="text-right p-4 font-semibold text-gray-700">Current Stock</th>
                              <th className="text-right p-4 font-semibold text-gray-700">Annual Value</th>
                              <th className="text-left p-4 font-semibold text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(inventory?.abcAnalysis || [])
                              .filter((item: InventoryItem) => item.reorder_recommendation.includes('REORDER'))
                              .slice(0, 10)
                              .map((item: InventoryItem, index: number) => (
                              <tr key={index} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-200">
                                <td className="p-4 font-semibold text-gray-900">{item.product_name}</td>
                                <td className="p-4">
                                  <Badge 
                                    variant={item.abc_category === 'A' ? 'default' : 'secondary'}
                                    className={`font-semibold ${
                                      item.abc_category === 'A' ? 'bg-blue-100 text-blue-700' : 
                                      item.abc_category === 'B' ? 'bg-green-100 text-green-700' : 
                                      'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    Category {item.abc_category}
                                  </Badge>
                                </td>
                                <td className="p-4 text-right font-bold text-gray-900">{item.current_stock}</td>
                                <td className="p-4 text-right font-semibold text-gray-700">{formatCurrency(item.annual_usage_value)}</td>
                                <td className="p-4">
                                  <Badge 
                                    variant={
                                      item.reorder_recommendation.includes('HIGH') ? 'destructive' : 
                                      item.reorder_recommendation.includes('MEDIUM') ? 'secondary' : 'outline'
                                    }
                                    className="font-semibold"
                                  >
                                    {item.reorder_recommendation.includes('HIGH') ? 'Critical' : 
                                     item.reorder_recommendation.includes('MEDIUM') ? 'Medium' : 'Low'}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
