'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  // FileText, 
  DollarSign, 
  TrendingUp, 
  // Calculator,
  BookOpen,
  Receipt,
  CreditCard,
  PieChart,
  BarChart3,
  RefreshCw
} from 'lucide-react';

// Import subcomponents
import { BankAccountManager } from '@/components/finance/BankAccountManager';
import ChartOfAccounts from '@/components/finance/ChartOfAccounts';
import JournalEntryManager from '@/components/finance/JournalEntryManager';
import GeneralLedger from '@/components/finance/GeneralLedger';
import FinancialReportsManager from '@/components/finance/FinancialReportsManager';
import { DetailedFinanceOverview } from '@/components/finance/DetailedFinanceOverview';

interface SalesMetrics {
  totalSalesRevenue: number;
  totalPaymentsReceived: number;
  totalOutstanding: number;
  collectionRate: number;
  fullyPaidOrders: number;
  partialPaidOrders: number;
  pendingPaymentOrders: number;
}

interface ProfitAnalysis {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  netProfit: number;
  totalExpenses: number;
  grossProfitMargin: number;
  netProfitMargin: number;
  expenseBreakdown: {
    regularExpenses: number;
    liabilityPaymentExpenses: number;
    withdrawalExpenses: number;
    liabilityPaymentCount: number;
    withdrawalCount: number;
    note?: string;
  };
  regularProducts?: {
    count: number;
    revenue: number;
    grossMargin: number;
    avgOrderValue: number;
    profit: number;
  };
  customProducts?: {
    count: number;
    revenue: number;
    grossMargin: number;
    avgOrderValue: number;
    profit: number;
  };
}

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics>({
    totalSalesRevenue: 0,
    totalPaymentsReceived: 0,
    totalOutstanding: 0,
    collectionRate: 0,
    fullyPaidOrders: 0,
    partialPaidOrders: 0,
    pendingPaymentOrders: 0,
  });
  const [profitAnalysis, setProfitAnalysis] = useState<ProfitAnalysis>({
    totalRevenue: 0,
    totalCost: 0,
    grossProfit: 0,
    netProfit: 0,
    totalExpenses: 0,
    grossProfitMargin: 0,
    netProfitMargin: 0,
    expenseBreakdown: {
      regularExpenses: 0,
      liabilityPaymentExpenses: 0,
      withdrawalExpenses: 0,
      liabilityPaymentCount: 0,
      withdrawalCount: 0,
    },
  });



  useEffect(() => {
    fetchFinancialData();
  }, []);

  // Debug log for profitAnalysis state changes
  useEffect(() => {
    console.log('🎯 ProfitAnalysis state updated:', profitAnalysis);
  }, [profitAnalysis]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Use the SAME KPIs API as the main dashboard for consistency
      const kpiResponse = await fetch('/api/dashboard/kpis');
      if (!kpiResponse.ok) {
        throw new Error('Failed to fetch KPI data');
      }
      const kpiData = await kpiResponse.json();
      
      console.log('🔍 Finance Page KPI Data:', kpiData);
      
      // Set profit analysis using KPI data for consistency
      setProfitAnalysis({
        totalRevenue: kpiData.data?.mtdRevenue || 0,
        totalCost: 0, // Calculated internally in KPI
        grossProfit: kpiData.data?.grossProfit || 0,
        netProfit: kpiData.data?.totalProfit || 0,
        totalExpenses: kpiData.data?.totalExpenses || 0,
        grossProfitMargin: kpiData.data?.grossProfitMargin || 0,
        netProfitMargin: kpiData.data?.profitMargin || 0,
        expenseBreakdown: {
          regularExpenses: kpiData.data?.totalExpenses || 0,
          liabilityPaymentExpenses: 0,
          withdrawalExpenses: 0,
          liabilityPaymentCount: 0,
          withdrawalCount: 0,
          note: 'Using KPI API data for consistency with dashboard'
        },
      });
      
      // Set sales metrics using KPI data
      setSalesMetrics({
        totalSalesRevenue: kpiData.data?.mtdRevenue || 0,
        totalPaymentsReceived: kpiData.data?.totalCollected || 0,
        totalOutstanding: kpiData.data?.totalOutstanding || 0,
        collectionRate: kpiData.data?.collectionRate || 0,
        fullyPaidOrders: 0, // Not available in KPI
        partialPaidOrders: 0, // Not available in KPI
        pendingPaymentOrders: 0, // Not available in KPI
      });
      
      console.log('✅ Finance page updated with KPI data for consistency');
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
        </div>
      </div>

      {/* Key Performance Indicators - Aligned with Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 h-16">
          <CardContent className="p-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xs font-medium text-blue-600">Revenue (MTD)</p>
                <p className="text-sm font-bold text-blue-900">{formatCurrency(profitAnalysis.totalRevenue)}</p>
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 h-16">
          <CardContent className="p-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xs font-medium text-green-600">Net Profit (MTD)</p>
                <p className="text-sm font-bold text-green-900">{formatCurrency(profitAnalysis.netProfit)}</p>
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 h-16">
          <CardContent className="p-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xs font-medium text-purple-600">Gross Profit (MTD)</p>
                <p className="text-sm font-bold text-purple-900">{formatCurrency(profitAnalysis.grossProfit)}</p>
              </div>
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 h-16">
          <CardContent className="p-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xs font-medium text-red-600">Total Expenses (MTD)</p>
                <p className="text-sm font-bold text-red-900">{formatCurrency(profitAnalysis.totalExpenses)}</p>
              </div>
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Receipt className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Payment Analytics - Aligned with Dashboard KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 h-16">
          <CardContent className="p-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xs font-medium text-emerald-600">Sales Revenue (MTD)</p>
                <p className="text-sm font-bold text-emerald-900">₹{(salesMetrics.totalSalesRevenue || 0).toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Received */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 h-16">
          <CardContent className="p-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xs font-medium text-green-600">Payments Received</p>
                <p className="text-sm font-bold text-green-900">₹{(salesMetrics.totalPaymentsReceived || 0).toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Amount */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 h-16">
          <CardContent className="p-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xs font-medium text-orange-600">Outstanding Balance</p>
                <p className="text-sm font-bold text-orange-900">₹{(salesMetrics.totalOutstanding || 0).toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Receipt className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 h-16">
          <CardContent className="p-2 h-full">
            <div className="flex items-center justify-between h-full">
              <div>
                <p className="text-xs font-medium text-blue-600">Collection Rate</p>
                <p className="text-sm font-bold text-blue-900">{(salesMetrics.collectionRate || 0).toFixed(1)}%</p>
              </div>
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <PieChart className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Navigation Tabs */}
      <Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-6 h-12">
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
                <BookOpen className="h-4 w-4" />
                Journal Entries
              </TabsTrigger>
              <TabsTrigger value="ledger" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                General Ledger
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Reports
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <TabsContent value="overview">
            <DetailedFinanceOverview />
          </TabsContent>

          <TabsContent value="bank-accounts">
            <BankAccountManager />
          </TabsContent>

          <TabsContent value="accounts">
            <ChartOfAccounts />
          </TabsContent>

          <TabsContent value="journals">
            <JournalEntryManager />
          </TabsContent>

          <TabsContent value="ledger">
            <GeneralLedger />
          </TabsContent>

          <TabsContent value="reports">
            <FinancialReportsManager />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
