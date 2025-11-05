'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  PieChart,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Wallet,
  ShoppingCart,
  Factory,
  Calendar,
  Package,
  Wrench,
  FileText,
  Award,
  Truck,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';

interface ProfitAnalysisData {
  summary: {
    totalRevenue: number;
    totalCost: number;
    grossProfit: number;
    grossProfitMargin: number;
    totalExpenses: number;
    netProfit: number;
    netProfitMargin: number;
    totalPayments: number;
    cashConversionRate: number;
    outstandingAmount: number;
  };
  regularProducts: {
    count: number;
    revenue: number;
    grossMargin: number;
    avgOrderValue: number;
    profit: number;
  };
  customProducts: {
    count: number;
    revenue: number;
    grossMargin: number;
    avgOrderValue: number;
    profit: number;
  };
  unclassifiedProducts?: {
    count: number;
    revenue: number;
    grossMargin: number;
    avgOrderValue: number;
    profit: number;
  };
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  }>;
  topSuppliers: Array<{
    name: string;
    revenue: number;
    orders: number;
  }>;
  topProducts?: Array<{
    name: string;
    revenue: number;
    profit: number;
    quantity: number;
  }>;
  productComparison?: Array<{
    type: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    quantity: number;
  }>;
  dailyProfitData?: Array<{
    date: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
  }>;
  revenueAnalysis?: {
    processedOrdersRevenue: number;
    totalAllOrdersRevenue: number;
    processedOrdersCount: number;
    totalAllOrdersCount: number;
    includedStatuses?: string[];
    statusBreakdown: { [key: string]: { count: number; revenue: number } };
  };
  metrics: {
    totalOrders: number;
    averageOrderValue: number;
    customProductRatio: number;
    regularProductRatio: number;
    unclassifiedProductRatio?: number;
    discountRate: number;
  };
}

interface ProductAnalytics {
  topSellingProducts: Array<{
    id: string;
    name: string;
    vendor: string;
    totalQuantity: number;
    totalRevenue: number;
    orders: number;
  }>;
  mostProfitableProducts: Array<{
    id: string;
    name: string;
    vendor: string;
    totalProfit: number;
    totalRevenue: number;
    totalQuantity: number;
    avgProfitMargin: number;
    orders: number;
  }>;
  fastMovingVendors: Array<{
    vendorId: string;
    vendorName: string;
    totalQuantity: number;
    totalRevenue: number;
    productsCount: number;
    avgOrderValue: number;
    orders: number;
  }>;
  slowMovingProducts: Array<{
    id: string;
    name: string;
    vendor: string;
    stockQuantity: number;
    costPrice: number;
    sellingPrice: number;
    daysInStock: number;
  }>;
  summary: {
    totalProductsSold: number;
    totalProfit: number;
    activeVendors: number;
    slowMovingCount: number;
  };
}

interface CashFlowData {
  summary: {
    totalInflows: number;
    totalOutflows: number;
    netCashFlow: number;
    operatingCashFlow: number;
    cashFlowRatio: number;
    avgDailyInflow: number;
    avgDailyOutflow: number;
  };
  dailyCashFlow: Array<{
    date: string;
    displayDate: string;
    inflows: number;
    outflows: number;
    netFlow: number;
    runningBalance: number;
  }>;
  monthlyCashFlow: Array<{
    month: string;
    inflows: number;
    outflows: number;
    netFlow: number;
  }>;
  expenseBreakdown: Array<{
    category: string;
    amount: number;
  }>;
  accountsSummary?: Array<{
    code: string;
    displayCode?: string;
    name: string;
    type: string;
    balance: number;
    count?: number;
    category?: string;
  }>;
}

export function DetailedFinanceOverview() {
  const [loading, setLoading] = useState(true);
  const [profitData, setProfitData] = useState<ProfitAnalysisData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'cashflow' | 'profitability' | 'products'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<Array<{
    date?: string;
    transaction_date?: string;
    description?: string;
    particulars?: string;
    amount: number;
  }>>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState<'all_time' | 'today' | 'this_week' | 'last_month' | 'this_month' | 'custom'>('all_time');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Utility function to get date range based on filter
  const getDateRange = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();

    switch (dateFilter) {
      case 'today':
        const todayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
        return { startDate: todayStr, endDate: todayStr };
      
      case 'this_week':
        const startOfWeek = new Date(year, month, date - now.getDay());
        const endOfWeek = new Date(year, month, date + (6 - now.getDay()));
        return {
          startDate: `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`,
          endDate: `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`
        };
      
      case 'this_month':
        const monthEnd = new Date(year, month + 1, 0);
        return {
          startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
          endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`
        };
      
      case 'last_month':
        const prevMonth = month - 1;
        const prevYear = prevMonth < 0 ? year - 1 : year;
        const actualPrevMonth = prevMonth < 0 ? 11 : prevMonth;
        const lastDayOfPrevMonth = new Date(prevYear, actualPrevMonth + 1, 0);
        return {
          startDate: `${prevYear}-${String(actualPrevMonth + 1).padStart(2, '0')}-01`,
          endDate: `${prevYear}-${String(actualPrevMonth + 1).padStart(2, '0')}-${String(lastDayOfPrevMonth.getDate()).padStart(2, '0')}`
        };
      
      case 'custom':
        return { startDate: customStartDate, endDate: customEndDate };
      
      case 'all_time':
      default:
        return { startDate: '', endDate: '' };
    }
  }, [dateFilter, customStartDate, customEndDate]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      const dateRange = getDateRange();
      
      // Build API URLs with date parameters
      const buildApiUrl = (baseUrl: string) => {
        const url = new URL(baseUrl, window.location.origin);
        if (dateFilter === 'all_time') {
          url.searchParams.set('period', 'all_time');
        } else if (dateRange.startDate && dateRange.endDate) {
          url.searchParams.set('startDate', dateRange.startDate);
          url.searchParams.set('endDate', dateRange.endDate);
        } else {
          url.searchParams.set('period', 'mtd'); // fallback
        }
        url.searchParams.set('t', Date.now().toString());
        return url.toString();
      };
      
      const [profitResponse, cashFlowResponse, productAnalyticsResponse] = await Promise.all([
        fetch(buildApiUrl('/api/finance/profit-analysis')),
        fetch(buildApiUrl('/api/finance/enhanced-cashflow')),
        fetch(buildApiUrl('/api/finance/product-analytics'))
      ]);

      if (!profitResponse.ok) {
        throw new Error(`Profit analysis API error: ${profitResponse.status}`);
      }
      if (!cashFlowResponse.ok) {
        throw new Error(`Cash flow API error: ${cashFlowResponse.status}`);
      }
      if (!productAnalyticsResponse.ok) {
        console.warn(`Product analytics API error: ${productAnalyticsResponse.status}`);
      }

      const [profitResult, cashFlowResult, productAnalyticsResult] = await Promise.all([
        profitResponse.json(),
        cashFlowResponse.json(),
        productAnalyticsResponse.ok ? productAnalyticsResponse.json() : null
      ]);

      // Validate data structure before setting state
      if (profitResult && typeof profitResult === 'object') {
        setProfitData(profitResult);
      } else {
        console.error('Invalid profit data structure:', profitResult);
        setProfitData(null);
      }

      if (cashFlowResult && typeof cashFlowResult === 'object') {
        setCashFlowData(cashFlowResult);
      } else {
        console.error('Invalid cash flow data structure:', cashFlowResult);
        setCashFlowData(null);
      }

      if (productAnalyticsResult?.success && productAnalyticsResult?.data) {
        console.log('🔍 DetailedFinanceOverview - Received Product Analytics:', {
          topSellingCount: productAnalyticsResult.data.topSellingProducts?.length,
          profitableCount: productAnalyticsResult.data.mostProfitableProducts?.length,
          vendorsCount: productAnalyticsResult.data.fastMovingVendors?.length,
          slowMovingCount: productAnalyticsResult.data.slowMovingProducts?.length
        });
        setProductAnalytics(productAnalyticsResult.data);
      } else {
        console.warn('Product analytics data not available or invalid:', productAnalyticsResult);
        setProductAnalytics(null);
      }
    } catch (error) {
      console.error('Error fetching enhanced finance data:', error);
      setProfitData(null);
      setCashFlowData(null);
      setProductAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, getDateRange]);

  // Fetch individual account expenses
  const fetchAccountExpenses = useCallback(async (accountCode: string) => {
    try {
      setLoadingTransactions(true);
      const dateRange = getDateRange();
      
      const url = new URL('/api/finance/account-expenses', window.location.origin);
      url.searchParams.set('accountCode', accountCode);
      
      if (dateFilter !== 'all_time' && dateRange.startDate && dateRange.endDate) {
        url.searchParams.set('startDate', dateRange.startDate);
        url.searchParams.set('endDate', dateRange.endDate);
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();
      
      if (data.success) {
        setAccountTransactions(data.expenses || []);
      } else {
        setAccountTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching account expenses:', error);
      setAccountTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  }, [dateFilter, getDateRange]);

  const handleAccountClick = (accountCode: string) => {
    if (selectedAccount === accountCode) {
      setSelectedAccount(null);
      setAccountTransactions([]);
    } else {
      setSelectedAccount(accountCode);
      fetchAccountExpenses(accountCode);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-lg">Loading comprehensive financial data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Detailed Financial Overview
          </h2>
          <p className="text-gray-600 mt-1">
            Comprehensive insights into your business performance
            {dateFilter !== 'all_time' && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                {dateFilter === 'today' ? 'Today' :
                 dateFilter === 'this_week' ? 'This Week' :
                 dateFilter === 'this_month' ? 'This Month' :
                 dateFilter === 'last_month' ? 'Last Month' :
                 dateFilter === 'custom' ? 'Custom Range' : 'All Time'}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Floating Action Buttons - Right Side */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {/* Date Range Popover Button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform bg-white"
              title="Date Range"
            >
              <Calendar className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="end" side="left">
            <div className="space-y-3">
              <div className="font-semibold text-sm">Select Date Range</div>
              <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as typeof dateFilter)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_time">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Custom Date Range Inputs */}
              {dateFilter === 'custom' && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="text-xs font-medium text-gray-600">Custom Range</div>
                  <div className="space-y-2">
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full"
                      placeholder="Start date"
                    />
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full"
                      placeholder="End date"
                    />
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Divider */}
        <div className="h-px bg-gray-300 my-1"></div>

        {/* View Navigation Buttons */}
        <Button
          variant={activeView === 'overview' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveView('overview')}
          className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
          title="Overview"
        >
          <PieChart className="h-5 w-5" />
        </Button>
        <Button
          variant={activeView === 'cashflow' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveView('cashflow')}
          className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
          title="Cash Flow"
        >
          <Wallet className="h-5 w-5" />
        </Button>
        <Button
          variant={activeView === 'profitability' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveView('profitability')}
          className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
          title="Profitability"
        >
          <Target className="h-5 w-5" />
        </Button>
        <Button
          variant={activeView === 'products' ? 'default' : 'outline'}
          size="icon"
          onClick={() => setActiveView('products')}
          className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
          title="Products"
        >
          <ShoppingCart className="h-5 w-5" />
        </Button>
      </div>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Key Performance Indicators - Multiple Profit Margin Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Overall Profit Margin */}
            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Overall Profit Margin</p>
                    <p className="text-2xl font-bold text-purple-800">
                      {formatPercentage(profitData?.summary?.netProfitMargin || 0)}
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      ₹{formatCurrency(profitData?.summary?.netProfit || 0)} profit
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            {/* Regular Products Margin */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Regular Products</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {formatPercentage(profitData?.regularProducts?.grossMargin || 0)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      ₹{formatCurrency(profitData?.regularProducts?.profit || 0)} profit
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            {/* Custom Products Margin */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Custom Products</p>
                    <p className="text-2xl font-bold text-green-800">
                      {formatPercentage(profitData?.customProducts?.grossMargin || 0)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      ₹{formatCurrency(profitData?.customProducts?.profit || 0)} profit
                    </p>
                  </div>
                  <Wrench className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue vs Expenses vs Profit Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenue vs Cost vs Profit Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={profitData?.monthlyTrends || []}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.8}
                      name="Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Cost"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.4}
                      name="Profit"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Regular vs Custom Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Regular vs Custom Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Regular Products</p>
                      <p className="text-xl font-bold text-blue-800">
                        {formatCurrency(profitData?.regularProducts.revenue || 0)}
                      </p>
                      <p className="text-xs text-blue-600">
                        {profitData?.regularProducts.count || 0} items • 
                        {formatPercentage(profitData?.regularProducts.grossMargin || 0)} margin
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        Profit: {formatCurrency(profitData?.regularProducts.profit || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-600">Ratio</p>
                      <p className="text-lg font-bold text-blue-800">
                        {formatPercentage(profitData?.metrics?.regularProductRatio || 0)}
                      </p>
                      <p className="text-xs text-blue-600">of total revenue</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-purple-600">Custom Products</p>
                      <p className="text-xl font-bold text-purple-800">
                        {formatCurrency(profitData?.customProducts.revenue || 0)}
                      </p>
                      <p className="text-xs text-purple-600">
                        {profitData?.customProducts.count || 0} items • 
                        {formatPercentage(profitData?.customProducts.grossMargin || 0)} margin
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        Profit: {formatCurrency(profitData?.customProducts.profit || 0)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-purple-600">Ratio</p>
                      <p className="text-lg font-bold text-purple-800">
                        {formatPercentage(profitData?.metrics?.customProductRatio || 0)}
                      </p>
                      <p className="text-xs text-purple-600">of total revenue</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                    <span>Revenue Comparison:</span>
                    <span className="font-bold">
                      Custom {formatPercentage(profitData?.metrics?.customProductRatio || 0)} vs Regular {formatPercentage(profitData?.metrics?.regularProductRatio || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Analysis Section */}
          {profitData?.revenueAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue Analysis & Reconciliation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Revenue Comparison */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Revenue Breakdown</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm text-green-700">Processed Orders</span>
                        <span className="font-bold text-green-800">
                          {formatCurrency(profitData.revenueAnalysis.processedOrdersRevenue)}
                        </span>
                      </div>
                      <div className="text-xs text-green-600 px-3 -mt-2">
                        Includes: Confirmed, Delivered, Ready for Delivery
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-blue-700">All Orders (Total)</span>
                        <span className="font-bold text-blue-800">
                          {formatCurrency(profitData.revenueAnalysis.totalAllOrdersRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                        <span className="text-sm text-orange-700">Difference</span>
                        <span className="font-bold text-orange-800">
                          {formatCurrency(profitData.revenueAnalysis.totalAllOrdersRevenue - profitData.revenueAnalysis.processedOrdersRevenue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Status Breakdown */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Order Status Breakdown</h4>
                    <div className="space-y-2">
                      {Object.entries(profitData.revenueAnalysis.statusBreakdown).map(([status, data]) => (
                        <div key={status} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                          <div className="text-right">
                            <span className="text-sm font-medium">{formatCurrency(data.revenue)}</span>
                            <p className="text-xs text-gray-500">({data.count} orders)</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Collection Analysis */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">Coverage Analysis</h4>
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-800">
                          {((profitData.revenueAnalysis.processedOrdersRevenue / profitData.revenueAnalysis.totalAllOrdersRevenue) * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-blue-600">Analysis Coverage</p>
                        <p className="text-xs text-blue-500 mt-2">
                          {formatCurrency(profitData.revenueAnalysis.processedOrdersRevenue)} analyzed from 
                          {formatCurrency(profitData.revenueAnalysis.totalAllOrdersRevenue)} total
                        </p>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700">
                        <strong>Product Analysis:</strong> Now includes {profitData.revenueAnalysis.processedOrdersCount} orders 
                        ({typeof profitData.revenueAnalysis.includedStatuses === 'string' 
                          ? profitData.revenueAnalysis.includedStatuses 
                          : profitData.revenueAnalysis.includedStatuses?.join(', ')})
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Cash Flow Tab */}
      {activeView === 'cashflow' && (
        <div className="space-y-6">
          {/* Cash Flow Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-600">Total Inflows</p>
                    <p className="text-lg font-bold text-green-800">
                      {formatCurrency(cashFlowData?.summary.totalInflows || 0)}
                    </p>
                    <p className="text-xs text-green-600">
                      Daily Avg: {formatCurrency(cashFlowData?.summary.avgDailyInflow || 0)}
                    </p>
                  </div>
                  <ArrowUpRight className="h-6 w-6 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-red-600">Total Outflows</p>
                    <p className="text-lg font-bold text-red-800">
                      {formatCurrency(cashFlowData?.summary.totalOutflows || 0)}
                    </p>
                    <p className="text-xs text-red-600">
                      Daily Avg: {formatCurrency(cashFlowData?.summary.avgDailyOutflow || 0)}
                    </p>
                  </div>
                  <ArrowDownRight className="h-6 w-6 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600">Net Cash Flow</p>
                    <p className={`text-lg font-bold ${
                      (cashFlowData?.summary.netCashFlow || 0) >= 0 ? 'text-blue-800' : 'text-red-800'
                    }`}>
                      {formatCurrency(cashFlowData?.summary.netCashFlow || 0)}
                    </p>
                    <p className="text-xs text-blue-600">
                      Operating: {formatCurrency(cashFlowData?.summary.operatingCashFlow || 0)}
                    </p>
                  </div>
                  <DollarSign className="h-6 w-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600">Cash Flow Ratio</p>
                    <p className="text-lg font-bold text-purple-800">
                      {(cashFlowData?.summary.cashFlowRatio || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-purple-600">
                      Inflows ÷ Outflows
                    </p>
                  </div>
                  <BarChart3 className="h-6 w-6 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Daily Cash Flow (Last 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={cashFlowData?.dailyCashFlow.slice(-30) || []}>
                    <XAxis dataKey="displayDate" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="inflows"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Inflows"
                    />
                    <Line
                      type="monotone"
                      dataKey="outflows"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Outflows"
                    />
                    <Line
                      type="monotone"
                      dataKey="netFlow"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Net Flow"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly Cash Flow Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={cashFlowData?.monthlyCashFlow || []}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="inflows" fill="#10b981" name="Inflows" />
                    <Bar dataKey="outflows" fill="#ef4444" name="Outflows" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Expense Analysis - Full Width with Side-by-Side Layout */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Expense Categories Analysis
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Click on a category to view detailed breakdown
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Category List */}
                <div className="space-y-3">
                  {cashFlowData?.expenseBreakdown.slice(0, 6).map((category, index) => {
                    const totalExpenses = cashFlowData?.expenseBreakdown.reduce((sum, cat) => sum + cat.amount, 0) || 1;
                    const percentage = (category.amount / totalExpenses * 100);
                    const isSelected = selectedCategory === category.category;
                    
                    return (
                      <div 
                        key={category.category} 
                        className={`p-4 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-500 shadow-md' 
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                        onClick={() => setSelectedCategory(category.category)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div 
                              className={`w-4 h-4 rounded-full ${
                                index % 6 === 0 ? 'bg-red-500' :
                                index % 6 === 1 ? 'bg-orange-500' :
                                index % 6 === 2 ? 'bg-yellow-500' :
                                index % 6 === 3 ? 'bg-green-500' :
                                index % 6 === 4 ? 'bg-blue-500' :
                                'bg-purple-500'
                              }`}
                            />
                            <h4 className={`font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                              {category.category}
                            </h4>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                              {formatCurrency(category.amount)}
                            </p>
                            <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                              {percentage.toFixed(1)}% of total
                            </p>
                          </div>
                        </div>
                        
                        {/* Progress indicator */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                index % 6 === 0 ? 'bg-red-500' :
                                index % 6 === 1 ? 'bg-orange-500' :
                                index % 6 === 2 ? 'bg-yellow-500' :
                                index % 6 === 3 ? 'bg-green-500' :
                                index % 6 === 4 ? 'bg-blue-500' :
                                'bg-purple-500'
                              }`}
                              style={{ width: `${percentage}%` } as React.CSSProperties}
                            />
                          </div>
                          <span className={`text-xs font-medium min-w-[40px] ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        
                        <div className={`text-xs ${isSelected ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                          {percentage > 30 ? 'Major expense category' : 
                           percentage > 15 ? 'Significant category' : 
                           percentage > 5 ? 'Regular category' : 
                           'Minor category'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right: Selected Category Details */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-200">
                  {selectedCategory ? (
                    <>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-blue-600" />
                        {selectedCategory} - Detailed Breakdown
                      </h3>
                      
                      {(() => {
                        const categoryAccounts = cashFlowData?.accountsSummary?.filter(
                          account => account.name.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                                    account.type?.toLowerCase().includes(selectedCategory.toLowerCase())
                        ) || [];
                        
                        const totalCategoryAmount = categoryAccounts.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
                        
                        if (categoryAccounts.length === 0) {
                          return (
                            <div className="text-center py-8 text-gray-500">
                              <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                              <p>No detailed accounts found for this category</p>
                              <p className="text-xs mt-2">Try selecting another category</p>
                            </div>
                          );
                        }
                        
                        // Prepare data for vertical bar chart
                        const chartData = categoryAccounts.map((account) => ({
                          name: account.code,
                          fullName: account.name,
                          amount: Math.abs(account.balance),
                          percentage: (Math.abs(account.balance) / totalCategoryAmount * 100).toFixed(1)
                        }));
                        
                        return (
                          <div className="space-y-4">
                            {/* Vertical Bar Chart */}
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                  <XAxis 
                                    dataKey="name" 
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    interval={0}
                                    tick={{ fontSize: 10 }}
                                  />
                                  <YAxis 
                                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                                  />
                                  <Tooltip 
                                    formatter={(value: number) => formatCurrency(value)}
                                    labelFormatter={(label) => {
                                      const item = chartData.find(d => d.name === label);
                                      return item ? item.fullName : label;
                                    }}
                                  />
                                  <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                      <Cell 
                                        key={`cell-${index}`} 
                                        fill={[
                                          '#ef4444', '#f97316', '#f59e0b', '#eab308',
                                          '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
                                          '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'
                                        ][index % 12]}
                                      />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Complete List with Details */}
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3 pb-2 border-b">
                                <h4 className="font-semibold text-gray-800">All Accounts ({categoryAccounts.length})</h4>
                                <span className="text-sm font-bold text-gray-900">
                                  Total: {formatCurrency(totalCategoryAmount)}
                                </span>
                              </div>
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {categoryAccounts.map((account, index) => {
                                  const amount = Math.abs(account.balance);
                                  const percentage = (amount / totalCategoryAmount) * 100;
                                  const isExpanded = selectedAccount === account.code;
                                  
                                  return (
                                    <div key={account.code} className="border border-gray-200 rounded-lg overflow-hidden">
                                      <div 
                                        className="p-2 hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => handleAccountClick(account.code)}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2 flex-1">
                                            <span className={`inline-flex items-center justify-center w-6 h-6 text-white text-xs font-bold rounded-full ${
                                              index % 12 === 0 ? 'bg-red-500' :
                                              index % 12 === 1 ? 'bg-orange-500' :
                                              index % 12 === 2 ? 'bg-amber-500' :
                                              index % 12 === 3 ? 'bg-yellow-500' :
                                              index % 12 === 4 ? 'bg-lime-500' :
                                              index % 12 === 5 ? 'bg-green-500' :
                                              index % 12 === 6 ? 'bg-teal-500' :
                                              index % 12 === 7 ? 'bg-cyan-500' :
                                              index % 12 === 8 ? 'bg-indigo-500' :
                                              index % 12 === 9 ? 'bg-violet-500' :
                                              index % 12 === 10 ? 'bg-fuchsia-500' :
                                              'bg-pink-500'
                                            }`}>
                                              {index + 1}
                                            </span>
                                            <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                              {account.displayCode || account.code}
                                            </span>
                                            <span className="font-medium text-gray-700 text-sm truncate">
                                              {account.name}
                                            </span>
                                            {isExpanded ? (
                                              <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
                                            ) : (
                                              <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 ml-2">
                                            <span className="text-sm font-bold text-gray-900 min-w-[100px] text-right">
                                              {formatCurrency(amount)}
                                            </span>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded min-w-[55px] text-center ${
                                              index % 12 === 0 ? 'bg-red-50 text-red-600' :
                                              index % 12 === 1 ? 'bg-orange-50 text-orange-600' :
                                              index % 12 === 2 ? 'bg-amber-50 text-amber-600' :
                                              index % 12 === 3 ? 'bg-yellow-50 text-yellow-600' :
                                              index % 12 === 4 ? 'bg-lime-50 text-lime-600' :
                                              index % 12 === 5 ? 'bg-green-50 text-green-600' :
                                              index % 12 === 6 ? 'bg-teal-50 text-teal-600' :
                                              index % 12 === 7 ? 'bg-cyan-50 text-cyan-600' :
                                              index % 12 === 8 ? 'bg-indigo-50 text-indigo-600' :
                                              index % 12 === 9 ? 'bg-violet-50 text-violet-600' :
                                              index % 12 === 10 ? 'bg-fuchsia-50 text-fuchsia-600' :
                                              'bg-pink-50 text-pink-600'
                                            }`}>
                                              {percentage.toFixed(1)}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Expandable Expense Details */}
                                      {isExpanded && (
                                        <div className="bg-gray-50 border-t border-gray-200 p-3">
                                          {loadingTransactions ? (
                                            <div className="text-center py-4 text-gray-500 text-sm">
                                              Loading expenses...
                                            </div>
                                          ) : accountTransactions.length > 0 ? (
                                            <div className="space-y-1">
                                              <div className="flex items-center justify-between text-xs font-semibold text-gray-700 pb-2 border-b border-gray-300">
                                                <span>Date</span>
                                                <span>Description</span>
                                                <span>Amount</span>
                                              </div>
                                              <div className="max-h-60 overflow-y-auto space-y-1">
                                                {accountTransactions.map((expense, idx) => {
                                                  const dateValue = expense.date || expense.transaction_date;
                                                  const formattedDate = dateValue ? new Date(dateValue).toLocaleDateString('en-GB') : 'N/A';
                                                  
                                                  return (
                                                    <div 
                                                      key={idx} 
                                                      className="flex items-center justify-between text-xs py-1.5 px-2 bg-white rounded hover:bg-blue-50"
                                                    >
                                                      <span className="text-gray-600 font-mono min-w-[80px]">
                                                        {formattedDate}
                                                      </span>
                                                      <span className="text-gray-700 flex-1 px-3 truncate">
                                                        {expense.description || expense.particulars || 'Expense'}
                                                      </span>
                                                      <span className="text-gray-900 font-semibold min-w-[80px] text-right">
                                                        {formatCurrency(Math.abs(expense.amount))}
                                                      </span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                              <div className="flex items-center justify-between text-xs font-bold text-gray-900 pt-2 border-t border-gray-300">
                                                <span>{accountTransactions.length} transactions</span>
                                                <span>
                                                  Total: {formatCurrency(accountTransactions.reduce((sum, exp) => sum + Math.abs(exp.amount), 0))}
                                                </span>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-center py-4 text-gray-500 text-sm">
                                              No individual expenses found for this account
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <PieChart className="h-16 w-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">Select a category</p>
                        <p className="text-sm mt-2">Click on any expense category to view detailed breakdown</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comprehensive Expense Table */}
          {cashFlowData?.accountsSummary && cashFlowData.accountsSummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Complete Expense Accounts Overview
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Detailed breakdown of all expense accounts sorted by amount
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left p-3 font-semibold">Rank</th>
                        <th className="text-left p-3 font-semibold">Account Code</th>
                        <th className="text-left p-3 font-semibold">Account Name</th>
                        <th className="text-left p-3 font-semibold">Category</th>
                        <th className="text-right p-3 font-semibold">Amount</th>
                        <th className="text-right p-3 font-semibold">% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totalAmount = cashFlowData.accountsSummary.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
                        return cashFlowData.accountsSummary.slice(0, 15).map((account, index) => {
                          const percentage = (Math.abs(account.balance) / totalAmount * 100);
                          return (
                            <tr key={account.code} className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
                              <td className="p-3">
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                  {index + 1}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                  {account.displayCode || account.code}
                                </span>
                              </td>
                              <td className="p-3 font-medium">{account.name}</td>
                              <td className="p-3">
                                <span className={`text-xs px-2 py-1 rounded font-medium ${
                                  account.type === 'SUBCATEGORY EXPENSE' ? 'bg-red-100 text-red-800' :
                                  account.type === 'CATEGORY EXPENSE' ? 'bg-orange-100 text-orange-800' :
                                  account.type === 'Operating Expense' ? 'bg-red-100 text-red-800' :
                                  account.type === 'Cost Of Goods Sold' ? 'bg-orange-100 text-orange-800' :
                                  account.type === 'Other Expense' ? 'bg-yellow-100 text-yellow-800' :
                                  account.type === 'Depreciation' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {account.type || 'N/A'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold">
                                <span className={account.balance < 0 ? 'text-red-600' : 'text-gray-900'}>
                                  {formatCurrency(Math.abs(account.balance))}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <span className="text-sm font-medium text-gray-600">
                                  {percentage.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
                
                {/* Summary Statistics */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-sm text-red-600 font-medium">Total Accounts</p>
                    <p className="text-xl font-bold text-red-800">
                      {cashFlowData.accountsSummary.length}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg text-center">
                    <p className="text-sm text-orange-600 font-medium">Total Amount</p>
                    <p className="text-xl font-bold text-orange-800">
                      {formatCurrency(cashFlowData.accountsSummary.reduce((sum, acc) => sum + Math.abs(acc.balance), 0))}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <p className="text-sm text-yellow-600 font-medium">Avg per Account</p>
                    <p className="text-xl font-bold text-yellow-800">
                      {formatCurrency(cashFlowData.accountsSummary.reduce((sum, acc) => sum + Math.abs(acc.balance), 0) / cashFlowData.accountsSummary.length)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-sm text-green-600 font-medium">Top 3 Share</p>
                    <p className="text-xl font-bold text-green-800">
                      {(() => {
                        const total = cashFlowData.accountsSummary.reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
                        const top3 = cashFlowData.accountsSummary.slice(0, 3).reduce((sum, acc) => sum + Math.abs(acc.balance), 0);
                        return ((top3 / total) * 100).toFixed(1);
                      })()}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Profitability Tab */}
      {activeView === 'profitability' && (
        <div className="space-y-6">
          {/* Profitability Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Gross Profit</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(profitData?.summary?.grossProfit || 0)}
                    </p>
                    <p className="text-xs text-green-600">
                      {formatPercentage(profitData?.summary?.grossProfitMargin || 0)} margin
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Net Profit</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(profitData?.summary?.netProfit || 0)}
                    </p>
                    <p className="text-xs text-blue-600">
                      {formatPercentage(profitData?.summary?.netProfitMargin || 0)} margin
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(profitData?.summary?.totalCost || 0)}
                    </p>
                    <p className="text-xs text-red-600">
                      Cost of goods sold
                    </p>
                  </div>
                  <ArrowDownRight className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(profitData?.metrics?.averageOrderValue || 0)}
                    </p>
                    <p className="text-xs text-purple-600">
                      {profitData?.metrics?.totalOrders || 0} orders
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profitability Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Profit Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Daily Profit Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={profitData?.dailyProfitData || []}>
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'Profit Margin %') return formatPercentage(Number(value));
                      return formatCurrency(Number(value));
                    }} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Daily Profit"
                      yAxisId="left"
                    />
                    <Line
                      type="monotone"
                      dataKey="margin"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="Profit Margin %"
                      yAxisId="right"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Product Type Profitability Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Product Type Profitability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitData?.productComparison || []}>
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                    <Bar dataKey="cost" fill="#ef4444" name="Cost" />
                    <Bar dataKey="profit" fill="#10b981" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Profit Margin Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Product Type Profit Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Pie
                      data={[
                        { name: 'Regular Products', value: profitData?.regularProducts?.profit || 0 },
                        { name: 'Custom Products', value: profitData?.customProducts?.profit || 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span className="text-sm">Regular Products</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(profitData?.regularProducts?.profit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pl-5">
                      <span className="text-xs text-gray-600">Margin:</span>
                      <span className="text-xs font-medium">
                        {formatPercentage(profitData?.regularProducts?.grossMargin || 0)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm">Custom Products</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(profitData?.customProducts?.profit || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pl-5">
                      <span className="text-xs text-gray-600">Margin:</span>
                      <span className="text-xs font-medium">
                        {formatPercentage(profitData?.customProducts?.grossMargin || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Products Tab */}
      {activeView === 'products' && (
        <div className="space-y-6">
          {/* Product Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Regular Products</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {profitData?.regularProducts?.count || 0}
                    </p>
                    <p className="text-xs text-blue-600">
                      {formatCurrency(profitData?.regularProducts?.revenue || 0)} revenue
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Custom Products</p>
                    <p className="text-2xl font-bold text-green-800">
                      {profitData?.customProducts?.count || 0}
                    </p>
                    <p className="text-xs text-green-600">
                      {formatCurrency(profitData?.customProducts?.revenue || 0)} revenue
                    </p>
                  </div>
                  <Wrench className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Total Orders</p>
                    <p className="text-2xl font-bold text-purple-800">
                      {profitData?.metrics?.totalOrders || 0}
                    </p>
                    <p className="text-xs text-purple-600">
                      {formatCurrency(profitData?.metrics?.averageOrderValue || 0)} avg value
                    </p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Analysis Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Product Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Revenue by Product Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Pie
                      data={[
                        { 
                          name: 'Regular Products', 
                          value: profitData?.regularProducts?.revenue || 0,
                          percentage: profitData?.metrics?.regularProductRatio || 0
                        },
                        { 
                          name: 'Custom Products', 
                          value: profitData?.customProducts?.revenue || 0,
                          percentage: profitData?.metrics?.customProductRatio || 0
                        }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Product Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Product Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    {
                      metric: 'Revenue',
                      regular: profitData?.regularProducts?.revenue || 0,
                      custom: profitData?.customProducts?.revenue || 0
                    },
                    {
                      metric: 'Profit',
                      regular: profitData?.regularProducts?.profit || 0,
                      custom: profitData?.customProducts?.profit || 0
                    },
                    {
                      metric: 'Avg Order Value',
                      regular: profitData?.regularProducts?.avgOrderValue || 0,
                      custom: profitData?.customProducts?.avgOrderValue || 0
                    }
                  ]}>
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="regular" fill="#3b82f6" name="Regular Products" />
                    <Bar dataKey="custom" fill="#10b981" name="Custom Products" />
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Performance Comparison Cards */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-blue-800">Regular Products</h4>
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">Profit Margin:</span>
                        <span className="font-medium">{formatPercentage(profitData?.regularProducts?.grossMargin || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">Items Sold:</span>
                        <span className="font-medium">{profitData?.regularProducts?.count || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-600">Market Share:</span>
                        <span className="font-medium">{formatPercentage(profitData?.metrics?.regularProductRatio || 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-800">Custom Products</h4>
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Profit Margin:</span>
                        <span className="font-medium">{formatPercentage(profitData?.customProducts?.grossMargin || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Items Sold:</span>
                        <span className="font-medium">{profitData?.customProducts?.count || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Market Share:</span>
                        <span className="font-medium">{formatPercentage(profitData?.metrics?.customProductRatio || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Product Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Regular Products Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Regular Products Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-600">Total Revenue</p>
                      <p className="text-xl font-bold text-blue-800">
                        {formatCurrency(profitData?.regularProducts?.revenue || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-600">Total Profit</p>
                      <p className="text-xl font-bold text-blue-800">
                        {formatCurrency(profitData?.regularProducts?.profit || 0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Items Sold:</span>
                      <span className="font-medium">{profitData?.regularProducts?.count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Order Value:</span>
                      <span className="font-medium">{formatCurrency(profitData?.regularProducts?.avgOrderValue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Profit Margin:</span>
                      <span className="font-medium text-green-600">{formatPercentage(profitData?.regularProducts?.grossMargin || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Market Share:</span>
                      <span className="font-medium">{formatPercentage(profitData?.metrics?.regularProductRatio || 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Custom Products Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Custom Products Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-600">Total Revenue</p>
                      <p className="text-xl font-bold text-green-800">
                        {formatCurrency(profitData?.customProducts?.revenue || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-600">Total Profit</p>
                      <p className="text-xl font-bold text-green-800">
                        {formatCurrency(profitData?.customProducts?.profit || 0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Items Sold:</span>
                      <span className="font-medium">{profitData?.customProducts?.count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Avg Order Value:</span>
                      <span className="font-medium">{formatCurrency(profitData?.customProducts?.avgOrderValue || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Profit Margin:</span>
                      <span className="font-medium text-green-600">{formatPercentage(profitData?.customProducts?.grossMargin || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Market Share:</span>
                      <span className="font-medium">{formatPercentage(profitData?.metrics?.customProductRatio || 0)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products Performance */}
          {profitData?.topProducts && profitData.topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Top Performing Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profitData.topProducts.slice(0, 10).map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{product.name || 'Unknown Product'}</p>
                          <p className="text-sm text-gray-600">{product.quantity || 0} units sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(product.revenue || 0)}</p>
                        <p className="text-sm text-green-600">{formatCurrency(product.profit || 0)} profit</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Product Analytics Section */}
          {productAnalytics && (
            <>
              {/* Top Selling Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Top Selling Products (by Quantity)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {productAnalytics.topSellingProducts?.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-blue-900">{product.name}</p>
                            <p className="text-sm text-blue-600">Vendor: {product.vendor}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-800">{product.totalQuantity} units</p>
                          <p className="text-sm text-blue-600">{formatCurrency(product.totalRevenue)}</p>
                          <p className="text-xs text-blue-500">{product.orders} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Most Profitable Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Most Profitable Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {productAnalytics.mostProfitableProducts?.slice(0, 5).map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-green-900">{product.name}</p>
                            <p className="text-sm text-green-600">Vendor: {product.vendor}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-800">{formatCurrency(product.totalProfit)} profit</p>
                          <p className="text-sm text-green-600">{product.avgProfitMargin.toFixed(1)}% margin</p>
                          <p className="text-xs text-green-500">{product.totalQuantity} units sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Fast Moving Vendors */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Fast Moving Vendors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {productAnalytics.fastMovingVendors?.slice(0, 5).map((vendor, index) => (
                      <div key={vendor.vendorId} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-white">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-purple-900">{vendor.vendorName}</p>
                            <p className="text-sm text-purple-600">{vendor.productsCount} different products</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-800">{vendor.totalQuantity} units</p>
                          <p className="text-sm text-purple-600">{formatCurrency(vendor.totalRevenue)}</p>
                          <p className="text-xs text-purple-500">{vendor.orders} orders</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Slow Moving Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Slow Moving Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {productAnalytics.slowMovingProducts?.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-orange-900">{product.name}</p>
                            <p className="text-sm text-orange-600">Vendor: {product.vendor}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-800">{product.stockQuantity} units</p>
                          <p className="text-sm text-orange-600">{formatCurrency(product.sellingPrice)} price</p>
                          <p className="text-xs text-orange-500">{product.daysInStock} days in stock</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Analytics Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Product Analytics Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-600">Products Sold</p>
                      <p className="text-2xl font-bold text-blue-800">
                        {productAnalytics.summary?.totalProductsSold?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-600">Total Profit</p>
                      <p className="text-2xl font-bold text-green-800">
                        {formatCurrency(productAnalytics.summary?.totalProfit || 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm font-medium text-purple-600">Active Vendors</p>
                      <p className="text-2xl font-bold text-purple-800">
                        {productAnalytics.summary?.activeVendors || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm font-medium text-orange-600">Slow Moving</p>
                      <p className="text-2xl font-bold text-orange-800">
                        {productAnalytics.summary?.slowMovingCount || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}