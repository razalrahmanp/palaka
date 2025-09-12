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
  Wrench
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
  metrics: {
    totalOrders: number;
    averageOrderValue: number;
    customProductRatio: number;
    regularProductRatio: number;
    unclassifiedProductRatio?: number;
    discountRate: number;
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
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#413ea0', '#ff8042'];

// Color class mapping for consistent styling
const getColorClass = (index: number): string => {
  const colorClasses = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-yellow-500',
    'bg-orange-500',
    'bg-purple-500',
    'bg-red-500'
  ];
  return colorClasses[index % colorClasses.length];
};

export function DetailedFinanceOverview() {
  const [loading, setLoading] = useState(true);
  const [profitData, setProfitData] = useState<ProfitAnalysisData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'cashflow' | 'profitability' | 'products'>('overview');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [profitResponse, cashFlowResponse] = await Promise.all([
        fetch('/api/finance/profit-analysis'),
        fetch('/api/finance/enhanced-cashflow')
      ]);

      if (!profitResponse.ok) {
        throw new Error(`Profit analysis API error: ${profitResponse.status}`);
      }
      if (!cashFlowResponse.ok) {
        throw new Error(`Cash flow API error: ${cashFlowResponse.status}`);
      }

      const [profitResult, cashFlowResult] = await Promise.all([
        profitResponse.json(),
        cashFlowResponse.json()
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
    } catch (error) {
      console.error('Error fetching enhanced finance data:', error);
      setProfitData(null);
      setCashFlowData(null);
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
                <PieChart className="h-5 w-5" />
                Top Expense Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPieChart>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Pie
                      data={cashFlowData?.expenseBreakdown.slice(0, 6) || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="amount"
                      label={({ category, amount }) => `${category}: ${formatCurrency(amount)}`}
                    >
                      {cashFlowData?.expenseBreakdown.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
                
                <div className="space-y-2">
                  {cashFlowData?.expenseBreakdown.slice(0, 6).map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getColorClass(index)}`} />
                        <span className="text-sm">{category.category}</span>
                      </div>
                      <span className="text-sm font-medium">
                        {formatCurrency(category.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
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
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Daily Profit"
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
                      type: 'Regular',
                      revenue: profitData?.regularProducts?.revenue || 0,
                      avgOrderValue: profitData?.regularProducts?.avgOrderValue || 0,
                      margin: profitData?.regularProducts?.grossMargin || 0
                    },
                    {
                      type: 'Custom',
                      revenue: profitData?.customProducts?.revenue || 0,
                      avgOrderValue: profitData?.customProducts?.avgOrderValue || 0,
                      margin: profitData?.customProducts?.grossMargin || 0
                    }
                  ]}>
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => {
                      if (name === 'margin') return formatPercentage(Number(value));
                      return formatCurrency(Number(value));
                    }} />
                    <Legend />
                    <Bar dataKey="avgOrderValue" fill="#8b5cf6" name="Avg Order Value" />
                    <Bar dataKey="margin" fill="#f59e0b" name="Profit Margin %" />
                  </BarChart>
                </ResponsiveContainer>
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
        </div>
      )}
    </div>
  );
}