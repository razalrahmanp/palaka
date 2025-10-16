'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  // FileText, 
  // Calculator,
  CreditCard,
  PieChart,
  // BarChart3,
  RefreshCw
} from 'lucide-react';

// Import subcomponents
import { BankAccountManager } from '@/components/finance/BankAccountManager';
import { DetailedFinanceOverview } from '@/components/finance/DetailedFinanceOverview';

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
      
      console.log('✅ Finance page updated with KPI data for consistency');
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
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

      {/* Main Navigation Tabs */}
      <Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="bank-accounts" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Bank Accounts
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <TabsContent value="overview">
            <DetailedFinanceOverview />
          </TabsContent>

          <TabsContent value="bank-accounts">
            <BankAccountManager />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
