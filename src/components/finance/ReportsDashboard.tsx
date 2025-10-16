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
  ChevronDown,
  ChevronUp,
  Building2,
  UserCheck,
  Banknote,
  HandCoins,
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

interface LiabilityBreakdown {
  category: string;
  accountCode: string;
  totalLiable: number;
  totalPaid: number;
  balance: number;
  percentage: number;
  type?: string; // supplier, employee, loans, investors
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
  const [liabilityBreakdown, setLiabilityBreakdown] = useState<LiabilityBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    supplier: true,
    employee: true,
    loans: true,
    investors: true,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // FIXED: Use Ledgers Summary API instead of Trial Balance for accurate payment data
      // Trial Balance uses general_ledger which may not reflect actual payments
      // Ledgers Summary uses actual transaction tables (vendor_bills.paid_amount, etc.)
      
      const liabilitiesBreakdown: LiabilityBreakdown[] = [];
      let totalLiabilitiesAmount = 0;
      let totalPaidAmount = 0;
      
      // Fetch Supplier Ledgers (Payables)
      const suppliersResponse = await fetch('/api/finance/ledgers-summary?type=supplier&limit=1000');
      if (suppliersResponse.ok) {
        const suppliersData = await suppliersResponse.json();
        const suppliers = suppliersData.data || [];
        
        suppliers.forEach((supplier: any) => {
          const debit = supplier.total_amount || 0; // Total bills
          const credit = supplier.paid_amount || 0; // Total payments
          const balance = debit - credit; // Outstanding
          
          if (balance > 0) { // Only show accounts with outstanding balance
            liabilitiesBreakdown.push({
              category: supplier.name,
              accountCode: supplier.id.toString().substring(0, 4),
              totalLiable: debit,
              totalPaid: credit,
              balance: balance,
              percentage: 0, // Will calculate after
              type: 'supplier',
            });
          }
          
          totalLiabilitiesAmount += debit;
          totalPaidAmount += credit;
        });
      }
      
      // Fetch Employee Ledgers (Salaries Payable)
      const employeesResponse = await fetch('/api/finance/ledgers-summary?type=employee&limit=1000');
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        const employees = employeesData.data || [];
        
        employees.forEach((employee: any) => {
          const debit = employee.total_amount || 0; // Total salary owed
          const credit = employee.paid_amount || 0; // Total paid
          const balance = debit - credit;
          
          if (balance > 0) {
            liabilitiesBreakdown.push({
              category: employee.name,
              accountCode: employee.id.toString().substring(0, 4),
              totalLiable: debit,
              totalPaid: credit,
              balance: balance,
              percentage: 0,
              type: 'employee',
            });
          }
          
          totalLiabilitiesAmount += debit;
          totalPaidAmount += credit;
        });
      }
      
      // Fetch Loan Ledgers (Loan Payables)
      const loansResponse = await fetch('/api/finance/ledgers-summary?type=loans&limit=1000');
      if (loansResponse.ok) {
        const loansData = await loansResponse.json();
        const loans = loansData.data || [];
        
        loans.forEach((loan: any) => {
          // For loans, total_amount should include all loan drawings
          // paid_amount should include all liability_payments for this loan
          const debit = loan.total_amount || loan.original_amount || 0; // Total loan amount (all drawings)
          const credit = loan.paid_amount || 0; // Total repaid (from liability_payments)
          const balance = loan.current_balance || (debit - credit);
          
          if (balance > 0 || debit > 0) { // Show all loans even if balance is 0
            liabilitiesBreakdown.push({
              category: loan.name,
              accountCode: loan.id.toString().substring(0, 4),
              totalLiable: debit,
              totalPaid: credit,
              balance: balance,
              percentage: 0,
              type: 'loans',
            });
          }
          
          totalLiabilitiesAmount += debit;
          totalPaidAmount += credit;
        });
      }
      
      // Calculate total outstanding balance
      const totalOutstanding = totalLiabilitiesAmount - totalPaidAmount;
      
      // Calculate percentages based on outstanding balance
      liabilitiesBreakdown.forEach(item => {
        item.percentage = totalOutstanding > 0 ? (item.balance / totalOutstanding) * 100 : 0;
      });
      
      // Sort by balance descending (highest liability first)
      liabilitiesBreakdown.sort((a, b) => b.balance - a.balance);
      
      console.log('Liabilities Breakdown (from Ledgers API):', liabilitiesBreakdown);
      console.log('Total Liabilities:', totalLiabilitiesAmount);
      console.log('Total Paid:', totalPaidAmount);
      console.log('Total Outstanding:', totalOutstanding);
      
      setLiabilityBreakdown(liabilitiesBreakdown);
      
      // Fetch Trial Balance for Assets/Equity summary
      const trialBalanceResponse = await fetch('/api/finance/reports/trial-balance?as_of_date=' + format(new Date(), 'yyyy-MM-dd'));
      if (trialBalanceResponse.ok) {
        const trialBalanceData = await trialBalanceResponse.json();
        
        setStats(prev => ({
          ...prev,
          totalLiabilities: totalOutstanding, // Use outstanding balance, not total
          totalAssets: trialBalanceData.summary?.total_debits || 0,
          totalEquity: (trialBalanceData.summary?.total_debits || 0) - totalOutstanding,
        }));
      }
      
      // Fetch dashboard KPIs
      const kpiResponse = await fetch('/api/dashboard/kpis');
      if (kpiResponse.ok) {
        const kpiData = await kpiResponse.json();
        
        setStats(prev => ({
          ...prev,
          totalRevenue: kpiData.data?.mtdRevenue || 0,
          totalExpenses: kpiData.data?.totalExpenses || 0,
          netProfit: kpiData.data?.totalProfit || 0,
          profitMargin: kpiData.data?.profitMargin || 0,
          cashBalance: kpiData.data?.bankBalance || 0,
        }));
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
    }).format(Math.abs(amount));
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

      {/* Liabilities Breakdown - Advanced Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-600" />
              <CardTitle>Liabilities Analysis</CardTitle>
            </div>
            <Badge variant="outline" className="bg-red-50">
              Total: {formatCurrency(stats.totalLiabilities)}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive breakdown of all liabilities with payment tracking, grouped by category
          </p>
        </CardHeader>
        <CardContent>
          {liabilityBreakdown.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No liability accounts found
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group liabilities by type */}
              {['supplier', 'employee', 'loans', 'investors'].map((groupType) => {
                const groupLiabilities = liabilityBreakdown.filter((l) => l.type === groupType);
                if (groupLiabilities.length === 0) return null;

                const groupInfo = {
                  supplier: { name: 'Suppliers (Trade Payables)', icon: Building2, color: 'purple' },
                  employee: { name: 'Employees (Salary Payable)', icon: UserCheck, color: 'green' },
                  loans: { name: 'Loans & Borrowings', icon: Banknote, color: 'red' },
                  investors: { name: 'Investors & Partners', icon: HandCoins, color: 'yellow' },
                }[groupType] || { name: groupType, icon: FileText, color: 'gray' };

                const Icon = groupInfo.icon;
                const groupTotal = groupLiabilities.reduce((sum, l) => sum + l.balance, 0);
                const groupPaid = groupLiabilities.reduce((sum, l) => sum + l.totalPaid, 0);
                const groupLiable = groupLiabilities.reduce((sum, l) => sum + l.totalLiable, 0);
                const paymentProgress = groupLiable > 0 ? (groupPaid / groupLiable) * 100 : 0;

                return (
                  <Card key={groupType} className="overflow-hidden border-2">
                    <div
                      className={`bg-${groupInfo.color}-50 border-b-2 border-${groupInfo.color}-200 p-4 cursor-pointer hover:bg-${groupInfo.color}-100 transition-colors`}
                      onClick={() =>
                        setExpandedGroups((prev) => ({ ...prev, [groupType]: !prev[groupType] }))
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-6 w-6 text-${groupInfo.color}-600`} />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{groupInfo.name}</h3>
                            <p className="text-sm text-gray-600">{groupLiabilities.length} Accounts</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Outstanding Balance</p>
                            <p className="text-lg font-bold text-red-600">{formatCurrency(groupTotal)}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {paymentProgress.toFixed(1)}% paid
                            </p>
                          </div>
                          {expandedGroups[groupType] ? (
                            <ChevronUp className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {expandedGroups[groupType] && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="font-semibold">Account Code</TableHead>
                              <TableHead className="font-semibold">Account Name</TableHead>
                              <TableHead className="text-right font-semibold">Total Liable (Cr)</TableHead>
                              <TableHead className="text-right font-semibold">Total Paid (Dr)</TableHead>
                              <TableHead className="text-right font-semibold">Outstanding Balance</TableHead>
                              <TableHead className="text-right font-semibold">% of Total</TableHead>
                              <TableHead className="text-center font-semibold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {groupLiabilities
                              .sort((a, b) => b.balance - a.balance)
                              .map((liability, index) => (
                                <TableRow key={index} className="hover:bg-gray-50">
                                  <TableCell className="font-mono text-sm font-medium text-blue-600">
                                    {liability.accountCode}
                                  </TableCell>
                                  <TableCell className="text-sm font-medium">
                                    {liability.category}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm">
                                    <span className="text-red-600 font-semibold">
                                      {formatCurrency(liability.totalLiable)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm">
                                    <span className="text-green-600 font-semibold">
                                      {formatCurrency(liability.totalPaid)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm">
                                    <span className="font-bold text-gray-900">
                                      {formatCurrency(liability.balance)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right text-sm text-gray-600">
                                    {liability.percentage.toFixed(1)}%
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge
                                      variant="outline"
                                      className={
                                        liability.totalPaid === 0
                                          ? 'bg-red-50 text-red-700 border-red-300'
                                          : liability.balance === 0
                                          ? 'bg-green-50 text-green-700 border-green-300'
                                          : 'bg-orange-50 text-orange-700 border-orange-300'
                                      }
                                    >
                                      {liability.totalPaid === 0
                                        ? 'Unpaid'
                                        : liability.balance === 0
                                        ? 'Paid'
                                        : 'Partial'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Payment Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Overall Payment Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {((liabilityBreakdown.reduce((s, l) => s + l.totalPaid, 0) /
                  liabilityBreakdown.reduce((s, l) => s + l.totalLiable, 0)) *
                  100 || 0).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                style={{
                  width: `${
                    ((liabilityBreakdown.reduce((s, l) => s + l.totalPaid, 0) /
                      liabilityBreakdown.reduce((s, l) => s + l.totalLiable, 0)) *
                      100 || 0)
                  }%`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <span>Paid: {formatCurrency(liabilityBreakdown.reduce((s, l) => s + l.totalPaid, 0))}</span>
              <span>Outstanding: {formatCurrency(stats.totalLiabilities)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
