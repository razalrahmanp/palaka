'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Clock
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
    name: string;
    type: string;
    balance: number;
  }>;
}

export function DetailedFinanceOverview() {
  const [loading, setLoading] = useState(true);
  const [profitData, setProfitData] = useState<ProfitAnalysisData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'cashflow' | 'profitability' | 'products'>('overview');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [profitResponse, cashFlowResponse, productAnalyticsResponse] = await Promise.all([
        fetch('/api/finance/profit-analysis?period=mtd&t=' + Date.now()),
        fetch('/api/finance/enhanced-cashflow'),
        fetch('/api/finance/product-analytics?period=mtd&t=' + Date.now())
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
        console.log('🔍 DetailedFinanceOverview - Received Profit Data:', {
          netProfitMargin: profitResult?.summary?.netProfitMargin,
          netProfit: profitResult?.summary?.netProfit,
          apiEndpoint: '/api/finance/profit-analysis?period=mtd',
          timestamp: new Date().toISOString()
        });
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
  };

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Detailed Financial Overview
          </h2>
          <p className="text-gray-600 mt-1">Comprehensive insights into your business performance</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={activeView === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('overview')}
          >
            <PieChart className="h-4 w-4 mr-2" />
            Overview
          </Button>
          <Button
            variant={activeView === 'cashflow' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('cashflow')}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Cash Flow
          </Button>
          <Button
            variant={activeView === 'profitability' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('profitability')}
          >
            <Target className="h-4 w-4 mr-2" />
            Profitability
          </Button>
          <Button
            variant={activeView === 'products' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveView('products')}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Products
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAllData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
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
                        {profitData?.regularProducts.count || 0} orders • 
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
                        {profitData?.customProducts.count || 0} orders • 
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

          {/* Expense Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Expense Categories Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Horizontal Bar Chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={cashFlowData?.expenseBreakdown.slice(0, 8) || []}
                    layout="horizontal"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={120} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="amount" fill="#ef4444" name="Amount" />
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">Total Expenses</h4>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(cashFlowData?.expenseBreakdown.reduce((sum, cat) => sum + cat.amount, 0) || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-2">Top Category</h4>
                    <p className="text-lg font-bold text-orange-600">
                      {cashFlowData?.expenseBreakdown[0]?.category || 'N/A'}
                    </p>
                    <p className="text-sm text-orange-600">
                      {formatCurrency(cashFlowData?.expenseBreakdown[0]?.amount || 0)}
                    </p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2">Categories</h4>
                    <p className="text-2xl font-bold text-yellow-600">
                      {cashFlowData?.expenseBreakdown.length || 0}
                    </p>
                    <p className="text-sm text-yellow-600">Active expense types</p>
                  </div>
                </div>
                
                {/* Detailed List */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700 mb-3">Expense Details</h4>
                  {cashFlowData?.expenseBreakdown.slice(0, 8).map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full bg-red-${Math.min(500 + index * 50, 800)}`} />
                        <span className="font-medium">{category.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(category.amount)}
                        </span>
                        <p className="text-xs text-gray-500">
                          {((category.amount / (cashFlowData?.expenseBreakdown.reduce((sum, cat) => sum + cat.amount, 0) || 1)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chart of Accounts Summary */}
          {cashFlowData?.accountsSummary && cashFlowData.accountsSummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Expense Accounts Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Account Code</th>
                        <th className="text-left p-2">Account Name</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-right p-2">Current Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlowData.accountsSummary.slice(0, 10).map((account, index) => (
                        <tr key={account.code} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="p-2 font-mono text-xs">{account.code}</td>
                          <td className="p-2">{account.name}</td>
                          <td className="p-2">
                            <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                              {account.type || 'N/A'}
                            </span>
                          </td>
                          <td className="p-2 text-right font-medium">
                            <span className={account.balance < 0 ? 'text-red-600' : 'text-gray-900'}>
                              {formatCurrency(Math.abs(account.balance))}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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