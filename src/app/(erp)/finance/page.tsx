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
  RefreshCw,
  Users
} from 'lucide-react';

// Import subcomponents
import { BankAccountManager } from '@/components/finance/BankAccountManager';
import ChartOfAccounts from '@/components/finance/ChartOfAccounts';
import JournalEntryManager from '@/components/finance/JournalEntryManager';
import LedgerManager from '@/components/finance/LedgerManager';
import GeneralLedger from '@/components/finance/GeneralLedger';
import FinancialReportsManager from '@/components/finance/FinancialReportsManager';

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

interface SalesMetrics {
  totalSalesRevenue: number;
  totalPaymentsReceived: number;
  totalOutstanding: number;
  collectionRate: number;
  fullyPaidOrders: number;
  partialPaidOrders: number;
  pendingPaymentOrders: number;
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
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    totalSalesRevenue: 0,
    totalPaymentsReceived: 0,
    totalOutstanding: 0,
    collectionRate: 0,
    fullyPaidOrders: 0,
    partialPaidOrders: 0,
    pendingPaymentOrders: 0,
  });

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Fetch financial summary data
      const financialResponse = await fetch('/api/finance/financial-summary');
      if (!financialResponse.ok) {
        throw new Error('Failed to fetch financial data');
      }
      const financialData = await financialResponse.json();
      
      // Fetch dedicated sales stats
      const statsResponse = await fetch('/api/finance/stats');
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch sales stats');
      }
      const statsData = await statsResponse.json();
      
      setFinancialSummary(financialData.financialSummary);
      setMetrics(financialData.metrics);
      setSalesMetrics({
        totalSalesRevenue: statsData.totalSalesRevenue || 0,
        totalPaymentsReceived: statsData.totalPaymentsReceived || 0,
        totalOutstanding: statsData.totalOutstanding || 0,
        collectionRate: statsData.collectionRate || 0,
        fullyPaidOrders: statsData.fullyPaidOrders || 0,
        partialPaidOrders: statsData.partialPaidOrders || 0,
        pendingPaymentOrders: statsData.pendingPaymentOrders || 0,
      });
    } catch (error) {
      console.error('Error fetching financial data:', error);
      // Set default values on error
      setSalesMetrics({
        totalSalesRevenue: 0,
        totalPaymentsReceived: 0,
        totalOutstanding: 0,
        collectionRate: 0,
        fullyPaidOrders: 0,
        partialPaidOrders: 0,
        pendingPaymentOrders: 0,
      });
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

      {/* Sales Payment Analytics - Real Payment Data */}
      <Card className="border-black bg-white">
        <CardHeader className="border-b border-black">
          <CardTitle className="text-black">Real-Time Sales Payment Analytics</CardTitle>
          <CardDescription className="text-gray-600">
            Live payment metrics from sales orders and invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Total Sales Revenue */}
            <Card className="border-black bg-white">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <FileText className="h-5 w-5 text-black" />
                    <Badge variant="outline" className="text-xs border-black text-black">SALES</Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-black">
                      Rs. {(salesMetrics.totalSalesRevenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Total Sales Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Collected */}
            <Card className="border-black bg-white">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <Badge variant="outline" className="text-xs border-green-600 text-green-600">PAID</Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      Rs. {(salesMetrics.totalPaymentsReceived || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Payments Received</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outstanding Amount */}
            <Card className="border-black bg-white">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <CreditCard className="h-5 w-5 text-red-600" />
                    <Badge variant="outline" className="text-xs border-red-600 text-red-600">DUE</Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      Rs. {(salesMetrics.totalOutstanding || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Outstanding Balance</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Collection Rate */}
            <Card className="border-black bg-white">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    <Badge variant="outline" className="text-xs border-blue-600 text-blue-600">RATE</Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {(salesMetrics.collectionRate || 0).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">Collection Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fully Paid Orders */}
            <Card className="border-black bg-white">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <Receipt className="h-5 w-5 text-green-600" />
                    <Badge variant="outline" className="text-xs border-green-600 text-green-600">FULL</Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {salesMetrics.fullyPaidOrders || 0}
                    </p>
                    <p className="text-xs text-gray-600">Fully Paid Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Payments */}
            <Card className="border-black bg-white">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <RefreshCw className="h-5 w-5 text-orange-600" />
                    <Badge variant="outline" className="text-xs border-orange-600 text-orange-600">PENDING</Badge>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      {salesMetrics.pendingPaymentOrders || 0}
                    </p>
                    <p className="text-xs text-gray-600">Pending Payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

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
              <TabsTrigger value="bank-accounts" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Bank Accounts
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Chart of Accounts
              </TabsTrigger>
              <TabsTrigger value="journals" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ledgers
              </TabsTrigger>
              <TabsTrigger value="ledger" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Journal Entries
              </TabsTrigger>
              <TabsTrigger value="general-ledger" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                General Ledger
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Reports & Aging
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

            {/* Bank Accounts Management Tab */}
            <TabsContent value="bank-accounts">
              <BankAccountManager />
            </TabsContent>

            {/* Chart of Accounts Tab */}
            <TabsContent value="accounts">
              <ChartOfAccounts />
            </TabsContent>

            {/* Ledgers Tab */}
            <TabsContent value="journals">
              <LedgerManager />
            </TabsContent>

            {/* Journal Entries Tab */}
            <TabsContent value="ledger">
              <JournalEntryManager />
            </TabsContent>

            {/* General Ledger Tab */}
            <TabsContent value="general-ledger">
              <GeneralLedger />
            </TabsContent>

            {/* Financial Reports Tab */}
            <TabsContent value="reports">
              <FinancialReportsManager />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
