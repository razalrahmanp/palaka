'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users, TrendingUp, DollarSign, ShoppingBag, 
  Activity, ArrowUpRight, ArrowDownRight, 
  Phone, Mail, Star, TrendingDown, CalendarDays, UserCheck
} from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  customerGrowthRate: number;
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowthRate: number;
  avgOrderValue: number;
  totalOrders: number;
  monthlyOrders: number;
  conversionRate: number;
  topPerformingSegment: string;
}

interface CustomerGrowth {
  date: string;
  customers: number;
  revenue: number;
}

interface DailyVisit {
  date: string;
  visits: number;
  newCustomers: number;
}

interface TopCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  total_revenue: number;
  order_count: number;
}

interface RepeatCustomerData {
  orderCount: string;
  customers: number;
  percentage: number;
}

interface RetentionData {
  month: string;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
}

interface OrderWithCustomer {
  customer_id: string;
  final_price?: number;
  grand_total?: number;
  customers: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status?: string;
  } | {
    id: string;
    name: string;
    email: string;
    phone: string;
    status?: string;
  }[];
}

interface OrderWithStatus {
  customer_id: string;
  final_price?: number;
  grand_total?: number;
  customers: {
    status: string;
  } | {
    status: string;
  }[];
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function CRMDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCustomers: 0,
    activeCustomers: 0,
    newCustomersThisMonth: 0,
    customerGrowthRate: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    revenueGrowthRate: 0,
    avgOrderValue: 0,
    totalOrders: 0,
    monthlyOrders: 0,
    conversionRate: 0,
    topPerformingSegment: 'N/A',
  });
  
  const [customerGrowth, setCustomerGrowth] = useState<CustomerGrowth[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [revenueBySegment, setRevenueBySegment] = useState<{ name: string; value: number }[]>([]);
  const [dailyVisits, setDailyVisits] = useState<DailyVisit[]>([]);
  const [repeatCustomers, setRepeatCustomers] = useState<RepeatCustomerData[]>([]);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [totalVisitsInPeriod, setTotalVisitsInPeriod] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [showTimeSelector, setShowTimeSelector] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startDate = timeRange === '7d' ? subDays(now, 7)
        : timeRange === '30d' ? subDays(now, 30)
        : subDays(now, 90);

      // Fetch customers data
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      const { data: activeCustomerData } = await supabase
        .from('sales_orders')
        .select('customer_id')
        .gte('created_at', startDate.toISOString())
        .not('customer_id', 'is', null);

      const activeCustomers = new Set(activeCustomerData?.map(o => o.customer_id)).size;

      const monthStart = startOfMonth(now);
      const { count: newCustomersThisMonth } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthStart.toISOString());

      const lastMonthStart = subDays(monthStart, 30);
      const { count: lastMonthCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastMonthStart.toISOString())
        .lt('created_at', monthStart.toISOString());

      const customerGrowthRate = lastMonthCustomers 
        ? ((newCustomersThisMonth! - lastMonthCustomers) / lastMonthCustomers) * 100 
        : 0;

      // Fetch revenue data
      const { data: orders } = await supabase
        .from('sales_orders')
        .select('customer_id, final_price, grand_total, created_at')
        .gte('created_at', startDate.toISOString());

      const totalRevenue = orders?.reduce((sum, order) => 
        sum + (order.grand_total || order.final_price || 0), 0) || 0;

      const monthlyOrders = orders?.filter(o => 
        new Date(o.created_at) >= monthStart
      ) || [];

      const monthlyRevenue = monthlyOrders.reduce((sum, order) => 
        sum + (order.grand_total || order.final_price || 0), 0);

      const lastMonthOrders = orders?.filter(o => {
        const date = new Date(o.created_at);
        return date >= lastMonthStart && date < monthStart;
      }) || [];

      const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => 
        sum + (order.grand_total || order.final_price || 0), 0);

      const revenueGrowthRate = lastMonthRevenue 
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
        : 0;

      const avgOrderValue = orders?.length ? totalRevenue / orders.length : 0;
      const conversionRate = totalCustomers ? (activeCustomers / totalCustomers) * 100 : 0;

      setMetrics({
        totalCustomers: totalCustomers || 0,
        activeCustomers,
        newCustomersThisMonth: newCustomersThisMonth || 0,
        customerGrowthRate,
        totalRevenue,
        monthlyRevenue,
        revenueGrowthRate,
        avgOrderValue,
        totalOrders: orders?.length || 0,
        monthlyOrders: monthlyOrders.length,
        conversionRate,
        topPerformingSegment: 'Premium',
      });

      await fetchCustomerGrowth(startDate);
      await fetchTopCustomers();
      await fetchRevenueBySegment();
      await fetchDailyVisits(startDate);
      await fetchRepeatCustomers();
      await fetchRetentionData(startDate);

      // Count total visits in period
      const { count: visitsCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .gte('customer_visit_date', startDate.toISOString().split('T')[0])
        .not('customer_visit_date', 'is', null);
      
      setTotalVisitsInPeriod(visitsCount || 0);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchCustomerGrowth = async (startDate: Date) => {
    const { data: customers } = await supabase
      .from('customers')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    const { data: orders } = await supabase
      .from('sales_orders')
      .select('created_at, final_price, grand_total')
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    const growthMap = new Map<string, { customers: number; revenue: number }>();
    
    customers?.forEach(c => {
      const date = format(new Date(c.created_at), 'MMM dd');
      const existing = growthMap.get(date) || { customers: 0, revenue: 0 };
      growthMap.set(date, { ...existing, customers: existing.customers + 1 });
    });

    orders?.forEach(o => {
      const date = format(new Date(o.created_at), 'MMM dd');
      const existing = growthMap.get(date) || { customers: 0, revenue: 0 };
      growthMap.set(date, { 
        ...existing, 
        revenue: existing.revenue + (o.grand_total || o.final_price || 0) / 1000
      });
    });

    const growthData = Array.from(growthMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .slice(-20);

    setCustomerGrowth(growthData);
  };

  const fetchTopCustomers = async () => {
    const { data: orders } = await supabase
      .from('sales_orders')
      .select(`
        customer_id,
        final_price,
        grand_total,
        customers!inner (id, name, email, phone)
      `)
      .not('customer_id', 'is', null);

    const customerMap = new Map<string, { name: string; email: string; phone: string; revenue: number; count: number }>();
    
    orders?.forEach((order: OrderWithCustomer) => {
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      if (!customer) return;
      
      const existing = customerMap.get(order.customer_id) || {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        revenue: 0,
        count: 0,
      };
      
      customerMap.set(order.customer_id, {
        ...existing,
        revenue: existing.revenue + (order.grand_total || order.final_price || 0),
        count: existing.count + 1,
      });
    });

    const topCustomersData = Array.from(customerMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        email: data.email || 'N/A',
        phone: data.phone || 'N/A',
        total_revenue: data.revenue,
        order_count: data.count,
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5);

    setTopCustomers(topCustomersData);
  };

  const fetchRevenueBySegment = async () => {
    // Group revenue by customer status (Lead, Customer, etc.)
    const { data: orders } = await supabase
      .from('sales_orders')
      .select(`
        customer_id,
        final_price,
        grand_total,
        customers (status)
      `)
      .not('customer_id', 'is', null);

    const segmentMap = new Map<string, number>();
    
    orders?.forEach((order: OrderWithStatus) => {
      const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;
      if (!customer) return;
      
      const status = customer.status || 'Lead';
      const revenue = order.grand_total || order.final_price || 0;
      
      segmentMap.set(status, (segmentMap.get(status) || 0) + revenue);
    });

    const segmentData = Array.from(segmentMap.entries())
      .map(([name, value]) => ({ name, value: value / 1000 }))
      .sort((a, b) => b.value - a.value);

    setRevenueBySegment(segmentData);
  };

  const fetchRepeatCustomers = async () => {
    // Get customer order counts
    const { data: orders } = await supabase
      .from('sales_orders')
      .select('customer_id')
      .not('customer_id', 'is', null);

    // Count orders per customer
    const customerOrderCount = new Map<string, number>();
    orders?.forEach(order => {
      const count = customerOrderCount.get(order.customer_id) || 0;
      customerOrderCount.set(order.customer_id, count + 1);
    });

    // Group by order count
    const orderCountGroups = new Map<number, number>();
    customerOrderCount.forEach(count => {
      orderCountGroups.set(count, (orderCountGroups.get(count) || 0) + 1);
    });

    const totalCustomers = customerOrderCount.size;
    
    // Create data for chart
    const repeatData: RepeatCustomerData[] = [];
    
    // Group into categories
    const categories = [
      { range: [1, 1], label: '1 Order' },
      { range: [2, 2], label: '2 Orders' },
      { range: [3, 3], label: '3 Orders' },
      { range: [4, 5], label: '4-5 Orders' },
      { range: [6, 10], label: '6-10 Orders' },
      { range: [11, 999], label: '11+ Orders' }
    ];

    categories.forEach(({ range, label }) => {
      let count = 0;
      for (let i = range[0]; i <= range[1]; i++) {
        count += orderCountGroups.get(i) || 0;
      }
      if (count > 0) {
        repeatData.push({
          orderCount: label,
          customers: count,
          percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0
        });
      }
    });

    setRepeatCustomers(repeatData);
  };

  const fetchRetentionData = async (startDate: Date) => {
    // Get all customers and their orders
    const { data: customers } = await supabase
      .from('customers')
      .select(`
        id,
        created_at,
        sales_orders (
          id,
          created_at
        )
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at');

    // Group customers by month and calculate retention
    const monthlyData = new Map<string, { new: Set<string>, returning: Set<string> }>();

    customers?.forEach((customer: any) => {
      const customerMonth = format(new Date(customer.created_at), 'MMM yyyy');
      
      if (!monthlyData.has(customerMonth)) {
        monthlyData.set(customerMonth, { new: new Set(), returning: new Set() });
      }
      
      const data = monthlyData.get(customerMonth)!;
      data.new.add(customer.id);

      // Check if customer made repeat purchases
      if (customer.sales_orders && customer.sales_orders.length > 1) {
        customer.sales_orders.forEach((order: any, index: number) => {
          if (index > 0) { // Skip first order
            const orderMonth = format(new Date(order.created_at), 'MMM yyyy');
            if (orderMonth !== customerMonth) {
              if (!monthlyData.has(orderMonth)) {
                monthlyData.set(orderMonth, { new: new Set(), returning: new Set() });
              }
              monthlyData.get(orderMonth)!.returning.add(customer.id);
            }
          }
        });
      }
    });

    // Convert to array format
    const retentionArray: RetentionData[] = Array.from(monthlyData.entries())
      .map(([month, data]) => {
        const totalNew = data.new.size;
        const totalReturning = data.returning.size;
        const total = totalNew + totalReturning;
        return {
          month,
          newCustomers: totalNew,
          returningCustomers: totalReturning,
          retentionRate: total > 0 ? (totalReturning / total) * 100 : 0
        };
      })
      .slice(-6); // Last 6 months

    setRetentionData(retentionArray);
  };

  const fetchDailyVisits = async (startDate: Date) => {
    // Fetch customers with visit dates
    const { data: visitData } = await supabase
      .from('customers')
      .select('customer_visit_date, created_at')
      .gte('customer_visit_date', startDate.toISOString().split('T')[0])
      .order('customer_visit_date');

    // Group by date
    const visitMap = new Map<string, { visits: number; newCustomers: number }>();
    
    visitData?.forEach(customer => {
      if (!customer.customer_visit_date) return;
      
      const date = format(new Date(customer.customer_visit_date), 'MMM dd');
      const existing = visitMap.get(date) || { visits: 0, newCustomers: 0 };
      
      // Check if customer was created on same day as visit (new customer)
      const isNewCustomer = customer.created_at && 
        format(new Date(customer.created_at), 'yyyy-MM-dd') === customer.customer_visit_date;
      
      visitMap.set(date, {
        visits: existing.visits + 1,
        newCustomers: existing.newCustomers + (isNewCustomer ? 1 : 0)
      });
    });

    const visitsData = Array.from(visitMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .slice(-20); // Last 20 data points

    setDailyVisits(visitsData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompact = (num: number) => {
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
    return `₹${num}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 absolute top-0"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-10">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                CRM Dashboard
              </h1>
              <p className="text-gray-500 text-sm mt-1">Real-time customer insights and analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Time Period Selector */}
      <div className="fixed bottom-6 right-6 z-50">
        {showTimeSelector && (
          <div className="mb-4 bg-white rounded-2xl shadow-2xl p-2 animate-in slide-in-from-bottom-2">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setTimeRange('7d'); setShowTimeSelector(false); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  timeRange === '7d' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => { setTimeRange('30d'); setShowTimeSelector(false); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  timeRange === '30d' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => { setTimeRange('90d'); setShowTimeSelector(false); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  timeRange === '90d' 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                90 Days
              </button>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowTimeSelector(!showTimeSelector)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-2xl hover:shadow-3xl transition-all hover:scale-110 flex items-center justify-center group"
        >
          <CalendarDays className="h-6 w-6 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      <div className="w-full px-6 py-4 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Total Customers */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-500 to-purple-600">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-purple-100 text-xs font-medium">Total Customers</p>
                  <p className="text-2xl font-bold text-white">{metrics.totalCustomers}</p>
                  <div className="flex items-center gap-1 text-white/90 text-xs">
                    {metrics.customerGrowthRate >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    <span>{Math.abs(metrics.customerGrowthRate).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Users className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Customers */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-500 to-blue-600">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-blue-100 text-xs font-medium">Active</p>
                  <p className="text-2xl font-bold text-white">{metrics.activeCustomers}</p>
                  <div className="flex items-center gap-1 text-white/90 text-xs">
                    <span>{metrics.conversionRate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-emerald-500 to-emerald-600">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-emerald-100 text-xs font-medium">Revenue</p>
                  <p className="text-2xl font-bold text-white">{formatCompact(metrics.totalRevenue)}</p>
                  <div className="flex items-center gap-1 text-white/90 text-xs">
                    {metrics.revenueGrowthRate >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(metrics.revenueGrowthRate).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Avg Order Value */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-orange-500 to-orange-600">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-orange-100 text-xs font-medium">Avg Order</p>
                  <p className="text-2xl font-bold text-white">{formatCompact(metrics.avgOrderValue)}</p>
                  <div className="flex items-center gap-1 text-white/90 text-xs">
                    <span>{metrics.totalOrders} orders</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Visits */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-indigo-500 to-indigo-600">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-indigo-100 text-xs font-medium">Visits</p>
                  <p className="text-2xl font-bold text-white">{totalVisitsInPeriod}</p>
                  <div className="flex items-center gap-1 text-white/90 text-xs">
                    <span>in period</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Visits Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Daily Visit Chart */}
          <Card className="lg:col-span-3 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
                Daily Customer Visits
              </CardTitle>
              <p className="text-xs text-gray-500">Visit trends and new acquisitions</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dailyVisits}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="visits" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Total Visits" />
                  <Bar dataKey="newCustomers" fill="#10b981" radius={[6, 6, 0, 0]} name="New Customers" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Visit Statistics */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>
                Visit Stats
              </CardTitle>
              <p className="text-xs text-gray-500">Key metrics</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="flex items-center justify-between mb-1">
                  <CalendarDays className="h-6 w-6 text-blue-600" />
                  <div className="text-right">
                    <p className="text-xl font-bold text-blue-900">
                      {dailyVisits.reduce((sum, day) => sum + day.visits, 0)}
                    </p>
                    <p className="text-xs text-blue-600">Total Visits</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                <div className="flex items-center justify-between mb-1">
                  <UserCheck className="h-6 w-6 text-green-600" />
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-900">
                      {dailyVisits.reduce((sum, day) => sum + day.newCustomers, 0)}
                    </p>
                    <p className="text-xs text-green-600">New</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                <div className="flex items-center justify-between mb-1">
                  <Activity className="h-6 w-6 text-purple-600" />
                  <div className="text-right">
                    <p className="text-xl font-bold text-purple-900">
                      {dailyVisits.length > 0 
                        ? (dailyVisits.reduce((sum, day) => sum + day.visits, 0) / dailyVisits.length).toFixed(1)
                        : '0'}
                    </p>
                    <p className="text-xs text-purple-600">Avg/Day</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Growth Chart - Takes 2 columns */}
          <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-2 w-2 rounded-full bg-purple-600 animate-pulse"></div>
                Customer & Revenue Growth
              </CardTitle>
              <p className="text-xs text-gray-500">Trends over selected period</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={customerGrowth}>
                  <defs>
                    <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis yAxisId="left" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }} 
                  />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="customers" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    fill="url(#colorCustomers)"
                    name="Customers"
                  />
                  <Area 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fill="url(#colorRevenue)"
                    name="Revenue (₹K)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Distribution */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
                Revenue by Segment
              </CardTitle>
              <p className="text-xs text-gray-500">Distribution overview</p>
            </CardHeader>
            <CardContent className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={revenueBySegment}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={false}
                  >
                    {revenueBySegment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `₹${value.toFixed(1)}K`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                    formatter={(value, entry: any) => {
                      const data = entry.payload;
                      return `${value}: ₹${data.value.toFixed(1)}K`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {revenueBySegment.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-gray-400">No revenue data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Customer Order Frequency & Retention Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Repeat Customer Analysis */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-2 w-2 rounded-full bg-pink-600 animate-pulse"></div>
                Customer Order Frequency
              </CardTitle>
              <p className="text-xs text-gray-500">How many times customers have ordered</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={repeatCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '11px' }} />
                  <YAxis type="category" dataKey="orderCount" stroke="#9ca3af" style={{ fontSize: '10px' }} width={70} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'customers') return [`${value} customers`, 'Total'];
                      if (name === 'percentage') return [`${value.toFixed(1)}%`, 'Percentage'];
                      return [value, name];
                    }}
                  />
                  <Bar 
                    dataKey="customers" 
                    radius={[0, 8, 8, 0]}
                    name="Customers"
                  >
                    {repeatCustomers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-600">
                    {repeatCustomers.find(d => d.orderCount === '1 Order')?.customers || 0}
                  </p>
                  <p className="text-xs text-gray-500">One-time</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {repeatCustomers.filter(d => d.orderCount !== '1 Order').reduce((sum, d) => sum + d.customers, 0)}
                  </p>
                  <p className="text-xs text-gray-500">Repeat</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">
                    {repeatCustomers.length > 0 
                      ? ((repeatCustomers.filter(d => d.orderCount !== '1 Order').reduce((sum, d) => sum + d.customers, 0) / 
                         repeatCustomers.reduce((sum, d) => sum + d.customers, 0)) * 100).toFixed(1)
                      : '0'}%
                  </p>
                  <p className="text-xs text-gray-500">Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Retention Graph */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-2 w-2 rounded-full bg-orange-600 animate-pulse"></div>
                Customer Retention Rate
              </CardTitle>
              <p className="text-xs text-gray-500">New vs Returning customers over time</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={retentionData}>
                  <defs>
                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReturning" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#9ca3af" style={{ fontSize: '10px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '11px' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="newCustomers" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#colorNew)"
                    name="New"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="returningCustomers" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fill="url(#colorReturning)"
                    name="Returning"
                  />
                </AreaChart>
              </ResponsiveContainer>

              {/* Retention Stats */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">
                    {retentionData.reduce((sum, d) => sum + d.newCustomers, 0)}
                  </p>
                  <p className="text-xs text-gray-500">New</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">
                    {retentionData.reduce((sum, d) => sum + d.returningCustomers, 0)}
                  </p>
                  <p className="text-xs text-gray-500">Returning</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-600">
                    {retentionData.length > 0 
                      ? (retentionData.reduce((sum, d) => sum + d.retentionRate, 0) / retentionData.length).toFixed(1)
                      : '0'}%
                  </p>
                  <p className="text-xs text-gray-500">Avg Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Customers */}
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></div>
              Top Performing Customers
            </CardTitle>
            <p className="text-xs text-gray-500">Highest revenue contributors</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCustomers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No customer data available</p>
                  <p className="text-xs text-gray-300 mt-1">Start by creating sales orders</p>
                </div>
              ) : (
                topCustomers.map((customer, index) => {
                  const percentage = (customer.total_revenue / metrics.totalRevenue) * 100;
                  return (
                    <div key={customer.id} className="group">
                    <div className="flex items-center gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {index + 1}
                        </div>
                        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center">
                          <Star className="h-3 w-3 text-yellow-900" fill="currentColor" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{customer.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                              {formatCurrency(customer.total_revenue)}
                            </p>
                            <p className="text-xs text-gray-500">{customer.order_count} orders</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-600 transition-all duration-500"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                              title={`${percentage.toFixed(1)}% of total revenue`}
                            />
                          </div>
                          <span className="text-xs text-gray-500 mt-1 inline-block">
                            {percentage.toFixed(1)}% of total revenue
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
