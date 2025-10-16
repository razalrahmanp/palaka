/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  FileText,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cashBalance: number;
}

interface RecentTransaction {
  id: string;
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  balance: number;
  type: 'debit' | 'credit';
}

export default function ReportsDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    cashBalance: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard KPIs
      const kpiResponse = await fetch('/api/dashboard/kpis');
      if (kpiResponse.ok) {
        const kpiData = await kpiResponse.json();
        
        setStats({
          totalRevenue: kpiData.data?.mtdRevenue || 0,
          totalExpenses: kpiData.data?.totalExpenses || 0,
          netProfit: kpiData.data?.totalProfit || 0,
          profitMargin: kpiData.data?.profitMargin || 0,
          totalAssets: 0, // Will need a separate endpoint
          totalLiabilities: 0, // Will need a separate endpoint
          totalEquity: 0, // Will need a separate endpoint
          cashBalance: kpiData.data?.bankBalance || 0,
        });
      }

      // Fetch recent transactions (from account balances endpoint)
      const transactionsResponse = await fetch('/api/finance/reports/account-balances?as_of_date=' + format(new Date(), 'yyyy-MM-dd'));
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        
        // Transform account balances into recent transactions format
        const transactions: RecentTransaction[] = (transactionsData.data || [])
          .slice(0, 10)
          .map((account: any, index: number) => ({
            id: account.account_code || index.toString(),
            date: format(new Date(), 'yyyy-MM-dd'),
            description: account.account_name || 'N/A',
            account: account.account_code || 'N/A',
            debit: account.current_balance > 0 ? account.current_balance : 0,
            credit: account.current_balance < 0 ? Math.abs(account.current_balance) : 0,
            balance: account.current_balance || 0,
            type: account.current_balance >= 0 ? 'debit' : 'credit',
          }));
        
        setRecentTransactions(transactions);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Revenue',
      value: stats.totalRevenue,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+12.5%',
      trendUp: true,
    },
    {
      title: 'Total Expenses',
      value: stats.totalExpenses,
      icon: TrendingDown,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: '+8.2%',
      trendUp: false,
    },
    {
      title: 'Net Profit',
      value: stats.netProfit,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: `${stats.profitMargin.toFixed(1)}%`,
      trendUp: stats.netProfit > 0,
    },
    {
      title: 'Cash Balance',
      value: stats.cashBalance,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      trend: 'Current',
      trendUp: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stat.value)}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {stat.trendUp ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-xs font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <IconComponent className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Assets vs Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Assets</span>
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(stats.totalAssets)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Liabilities</span>
                <span className="text-lg font-semibold text-red-600">
                  {formatCurrency(stats.totalLiabilities)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium text-gray-900">Net Equity</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatCurrency(stats.totalEquity)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Profit Margin Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Revenue</span>
                <span className="text-sm font-medium">
                  {formatCurrency(stats.totalRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Expenses</span>
                <span className="text-sm font-medium">
                  {formatCurrency(stats.totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium text-gray-900">Margin</span>
                <Badge variant={stats.profitMargin > 0 ? 'default' : 'destructive'}>
                  {stats.profitMargin.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Active Accounts</span>
                <Badge variant="outline" className="ml-auto">
                  {recentTransactions.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Transactions</span>
                <Badge variant="outline" className="ml-auto">
                  {recentTransactions.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Period</span>
                <Badge variant="outline" className="ml-auto">
                  MTD
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions - Accounting Style */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle>Recent Account Activity</CardTitle>
            </div>
            <Badge variant="outline">Last 10 Entries</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Account Code</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="text-right font-semibold">Debit (Dr)</TableHead>
                  <TableHead className="text-right font-semibold">Credit (Cr)</TableHead>
                  <TableHead className="text-right font-semibold">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No recent transactions available
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {transaction.account}
                      </TableCell>
                      <TableCell className="text-sm">{transaction.description}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {transaction.debit > 0 ? (
                          <span className="text-green-600 font-medium">
                            {formatCurrency(transaction.debit)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {transaction.credit > 0 ? (
                          <span className="text-red-600 font-medium">
                            {formatCurrency(transaction.credit)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        <Badge variant={transaction.balance >= 0 ? 'default' : 'destructive'}>
                          {formatCurrency(Math.abs(transaction.balance))}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
