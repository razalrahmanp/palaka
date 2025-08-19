'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Calculator,
  BookOpen,
  Receipt,
  CreditCard,
  PieChart,
  BarChart3,
  Plus,
  Eye,
  RefreshCw
} from 'lucide-react';

// Import subcomponents
import { SalesOrderInvoiceManager } from '@/components/finance/SalesOrderInvoiceManager';
import { SalesOrderPaymentDashboard } from '@/components/finance/SalesOrderPaymentDashboard';
import ChartOfAccounts from '@/components/finance/ChartOfAccounts';
import GeneralLedger from '@/components/finance/GeneralLedger';
import JournalEntryManager from '@/components/finance/JournalEntryManager';

interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  currentRatio: number;
}

interface DashboardMetrics {
  pendingInvoices: number;
  overdueInvoices: number;
  unpostedJournals: number;
  cashFlowTrend: 'up' | 'down' | 'stable';
  profitMargin: number;
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    cashBalance: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    currentRatio: 0,
  });
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    pendingInvoices: 0,
    overdueInvoices: 0,
    unpostedJournals: 0,
    cashFlowTrend: 'stable',
    profitMargin: 0,
  });

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      // Fetch data from our API endpoint
      const response = await fetch('/api/finance/financial-summary');
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial data');
      }
      
      const data = await response.json();
      
      setFinancialSummary(data.financialSummary);
      setMetrics(data.metrics);
    } catch (error) {
      console.error('Error fetching financial data:', error);
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Management</h1>
          <p className="text-gray-600 mt-1">Comprehensive financial management and reporting</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchFinancialData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Quick Entry
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Assets</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(financialSummary.totalAssets)}</p>
                <p className="text-xs text-blue-700 mt-1">Current financial position</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Net Income</p>
                <p className="text-2xl font-bold text-green-900">{formatCurrency(financialSummary.netIncome)}</p>
                <div className="flex items-center mt-1">
                  <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                    {formatPercentage(metrics.profitMargin)} margin
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-green-500 rounded-lg">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Cash Balance</p>
                <p className="text-2xl font-bold text-purple-900">{formatCurrency(financialSummary.cashBalance)}</p>
                <div className="flex items-center mt-1">
                  <Badge variant="outline" className="text-xs text-purple-700 border-purple-300">
                    {metrics.cashFlowTrend === 'up' ? '↗' : metrics.cashFlowTrend === 'down' ? '↘' : '→'} 
                    {metrics.cashFlowTrend}
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-purple-500 rounded-lg">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Current Ratio</p>
                <p className="text-2xl font-bold text-orange-900">{financialSummary.currentRatio.toFixed(2)}</p>
                <p className="text-xs text-orange-700 mt-1">Liquidity indicator</p>
              </div>
              <div className="p-3 bg-orange-500 rounded-lg">
                <Calculator className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items Alert */}
      {(metrics.pendingInvoices > 0 || metrics.overdueInvoices > 0 || metrics.unpostedJournals > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Action Required</h3>
                <div className="flex gap-6 mt-2 text-sm text-yellow-800">
                  {metrics.pendingInvoices > 0 && (
                    <span>{metrics.pendingInvoices} pending invoices</span>
                  )}
                  {metrics.overdueInvoices > 0 && (
                    <span>{metrics.overdueInvoices} overdue invoices</span>
                  )}
                  {metrics.unpostedJournals > 0 && (
                    <span>{metrics.unpostedJournals} unposted journal entries</span>
                  )}
                </div>
              </div>
              <Button size="sm" onClick={() => setActiveTab('invoices')}>
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Navigation Tabs */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-7 h-12">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Chart of Accounts
              </TabsTrigger>
              <TabsTrigger value="journals" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Journal Entries
              </TabsTrigger>
              <TabsTrigger value="ledger" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                General Ledger
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Financial Reports
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Financial Position */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Financial Position
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Total Assets</span>
                      <span className="font-semibold">{formatCurrency(financialSummary.totalAssets)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Total Liabilities</span>
                      <span className="font-semibold text-red-600">{formatCurrency(financialSummary.totalLiabilities)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-medium text-gray-600">Total Equity</span>
                      <span className="font-bold text-green-600">{formatCurrency(financialSummary.totalEquity)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Profitability */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Profitability
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                      <span className="font-semibold text-green-600">{formatCurrency(financialSummary.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Total Expenses</span>
                      <span className="font-semibold text-red-600">{formatCurrency(financialSummary.totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-sm font-medium text-gray-600">Net Income</span>
                      <span className="font-bold text-green-600">{formatCurrency(financialSummary.netIncome)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Working Capital */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Working Capital Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Accounts Receivable</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(financialSummary.accountsReceivable)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Accounts Payable</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(financialSummary.accountsPayable)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Net Working Capital</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(financialSummary.accountsReceivable - financialSummary.accountsPayable)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Management Tab */}
            <TabsContent value="payments">
              <SalesOrderPaymentDashboard />
            </TabsContent>

            {/* Invoice Management Tab */}
            <TabsContent value="invoices">
              <SalesOrderInvoiceManager />
            </TabsContent>

            {/* Chart of Accounts Tab */}
            <TabsContent value="accounts">
              <ChartOfAccounts />
            </TabsContent>

            {/* Journal Entries Tab */}
            <TabsContent value="journals">
              <JournalEntryManager />
            </TabsContent>

            {/* General Ledger Tab */}
            <TabsContent value="ledger">
              <GeneralLedger />
            </TabsContent>

            {/* Financial Reports Tab - Placeholder */}
            <TabsContent value="reports">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Balance Sheet
                    </CardTitle>
                    <CardDescription>Assets, liabilities, and equity snapshot</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Profit & Loss
                    </CardTitle>
                    <CardDescription>Revenue, expenses, and net income</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Trial Balance
                    </CardTitle>
                    <CardDescription>Verify accounting equation balance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Cash Flow Statement
                    </CardTitle>
                    <CardDescription>Operating, investing, financing activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      General Ledger
                    </CardTitle>
                    <CardDescription>Detailed transaction history by account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Aging Reports
                    </CardTitle>
                    <CardDescription>Accounts receivable and payable aging</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
