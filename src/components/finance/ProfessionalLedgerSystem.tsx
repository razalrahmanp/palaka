'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Building2, 
  UserCheck,
  Search,
  FileText,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign,
  CreditCard,
  HandCoins,
  Banknote,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Package
} from 'lucide-react';

// Interfaces
interface LedgerSummary {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'employee' | 'bank' | 'investors' | 'loans' | 'sales_returns' | 'purchase_returns';
  email?: string;
  phone?: string;
  total_transactions: number;
  total_amount: number;
  balance_due: number;
  paid_amount?: number;
  status?: string;
  // Additional fields
  opening_balance?: number;
  current_balance?: number;
  debit?: number;
  credit?: number;
  debit_total?: number;
  credit_total?: number;
  // Returns specific
  return_value?: number;
  return_count?: number;
  approved_returns?: number;
  pending_returns?: number;
  last_transaction_date?: string;
  // Employee payment type breakdowns
  salary_amount?: number;
  incentive_amount?: number;
  bonus_amount?: number;
  overtime_amount?: number;
  allowance_amount?: number;
  reimbursement_amount?: number;
  // Investor/Partner specific fields
  total_investments?: number;
  total_withdrawals?: number;
  capital_withdrawals?: number;
  profit_distributions?: number;
  interest_payments?: number;
  net_equity?: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export function ProfessionalLedgerSystem() {
  const router = useRouter();
  
  // State management
  const [activeTab, setActiveTab] = useState('customer');
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [hideZeroBalances, setHideZeroBalances] = useState(false);
  
  // Pagination
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasMore: false
  });

  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalLedgers: 0,
    totalDebit: 0,
    totalCredit: 0,
    netBalance: 0
  });

  // Fetch ledgers - now properly passing parameters
  const fetchLedgers = async (page: number, type: string, search: string, hideZero: boolean, limit: number) => {
    try {
      setLoading(true);
      
      // For "all" tab, we fetch without type filter to get all ledgers
      let url = `/api/finance/ledgers-summary?page=${page}&limit=${limit}`;
      if (type !== 'all') {
        url += `&type=${type}`;
      }
      url += `&search=${search}&hideZeroBalances=${hideZero}`;
      
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Failed to fetch ledgers');
      
      const result = await response.json();
      
      console.log('API Response:', result);
      
      setLedgers(result.data || []);
      setPagination({
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        hasMore: result.pagination.hasMore
      });

      // Calculate summary stats
      const totalDebit = (result.data || []).reduce((sum: number, l: LedgerSummary) => sum + (l.total_amount || 0), 0);
      const totalCredit = (result.data || []).reduce((sum: number, l: LedgerSummary) => sum + (l.paid_amount || 0), 0);
      setSummaryStats({
        totalLedgers: result.pagination.total,
        totalDebit,
        totalCredit,
        netBalance: totalDebit - totalCredit
      });
      
    } catch (error) {
      console.error('Error fetching ledgers:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and tab change
  useEffect(() => {
    fetchLedgers(1, activeTab, '', false, pagination.limit);
    // Only trigger on activeTab change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Handle search and filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLedgers(1, activeTab, searchTerm, hideZeroBalances, pagination.limit);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, hideZeroBalances]);

  // Handle tab change
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setPagination(prev => ({ ...prev, page: 1 }));
    setSearchTerm('');
    setHideZeroBalances(false);
  };

  // Handle ledger selection - navigate to detail page
  const handleViewLedger = (ledger: LedgerSummary) => {
    router.push(`/ledgers/${ledger.type}/${ledger.id}`);
  };

  // Pagination handlers
  const handleNextPage = () => {
    if (pagination.hasMore) {
      fetchLedgers(pagination.page + 1, activeTab, searchTerm, hideZeroBalances, pagination.limit);
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchLedgers(pagination.page - 1, activeTab, searchTerm, hideZeroBalances, pagination.limit);
    }
  };

  // Formatting functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  // Get status badge
  const getStatusBadge = (status?: string, balance?: number) => {
    if (status === 'paid' || balance === 0) {
      return <Badge className="bg-green-100 text-green-800 border-green-300">Settled</Badge>;
    } else if ((balance || 0) > 0) {
      return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Pending</Badge>;
    } else {
      return <Badge className="bg-gray-100 text-gray-800 border-gray-300">No Balance</Badge>;
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <Users className="h-4 w-4 text-blue-600" />;
      case 'supplier':
        return <Building2 className="h-4 w-4 text-purple-600" />;
      case 'employee':
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'investors':
        return <HandCoins className="h-4 w-4 text-yellow-600" />;
      case 'loans':
        return <Banknote className="h-4 w-4 text-red-600" />;
      case 'bank':
        return <CreditCard className="h-4 w-4 text-indigo-600" />;
      case 'sales_returns':
        return <RotateCcw className="h-4 w-4 text-orange-600" />;
      case 'purchase_returns':
        return <Package className="h-4 w-4 text-teal-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-blue-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              General Ledger
            </h1>
            <p className="text-gray-600 mt-1">Complete accounting records and financial transactions</p>
          </div>
          <Button onClick={() => fetchLedgers(pagination.page, activeTab, searchTerm, hideZeroBalances, pagination.limit)} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Ledgers</p>
                  <p className="text-2xl font-bold text-blue-900">{summaryStats.totalLedgers}</p>
                </div>
                <FileText className="h-10 w-10 text-blue-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Total Debit</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(summaryStats.totalDebit)}</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Total Credit</p>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(summaryStats.totalCredit)}</p>
                </div>
                <TrendingDown className="h-10 w-10 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${summaryStats.netBalance >= 0 ? 'from-purple-50 to-purple-100 border-purple-200' : 'from-orange-50 to-orange-100 border-orange-200'} shadow-md`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${summaryStats.netBalance >= 0 ? 'text-purple-600' : 'text-orange-600'}`}>Net Balance</p>
                  <p className={`text-2xl font-bold ${summaryStats.netBalance >= 0 ? 'text-purple-900' : 'text-orange-900'}`}>
                    {formatCurrency(summaryStats.netBalance)}
                  </p>
                </div>
                <DollarSign className={`h-10 w-10 opacity-50 ${summaryStats.netBalance >= 0 ? 'text-purple-600' : 'text-orange-600'}`} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <Card className="shadow-lg">
        <CardHeader className="border-b bg-white">
          <div className="flex items-center justify-between">
            <CardTitle>Ledger Accounts</CardTitle>
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search ledgers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filter */}
              <Button
                variant={hideZeroBalances ? "default" : "outline"}
                size="sm"
                onClick={() => setHideZeroBalances(!hideZeroBalances)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Hide Zero Balance
              </Button>

              {/* Export */}
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="border-b bg-gray-50 px-6 pt-4">
              <TabsList className="grid w-full grid-cols-8 h-12 bg-white shadow-sm">
                <TabsTrigger value="customer" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <Users className="h-4 w-4" />
                  Customers
                </TabsTrigger>
                <TabsTrigger value="supplier" className="flex items-center gap-2 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
                  <Building2 className="h-4 w-4" />
                  Suppliers
                </TabsTrigger>
                <TabsTrigger value="employee" className="flex items-center gap-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
                  <UserCheck className="h-4 w-4" />
                  Employees
                </TabsTrigger>
                <TabsTrigger value="investors" className="flex items-center gap-2 data-[state=active]:bg-yellow-50 data-[state=active]:text-yellow-700">
                  <HandCoins className="h-4 w-4" />
                  Investors
                </TabsTrigger>
                <TabsTrigger value="loans" className="flex items-center gap-2 data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                  <Banknote className="h-4 w-4" />
                  Loans
                </TabsTrigger>
                <TabsTrigger value="bank" className="flex items-center gap-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">
                  <CreditCard className="h-4 w-4" />
                  Banks
                </TabsTrigger>
                <TabsTrigger value="sales_returns" className="flex items-center gap-2 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
                  <RotateCcw className="h-4 w-4" />
                  Sales Returns
                </TabsTrigger>
                <TabsTrigger value="purchase_returns" className="flex items-center gap-2 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">
                  <Package className="h-4 w-4" />
                  Purchase Returns
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Table Content */}
            <TabsContent value={activeTab} className="m-0 p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Loading ledgers...</span>
                </div>
              ) : ledgers.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No ledgers found</p>
                  <p className="text-sm text-gray-400 mt-2">Try adjusting your search or filters</p>
                </div>
              ) : (
                /* Regular Table View for Individual Tabs */
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>Type</TableHead>
                          <TableHead>Account Name</TableHead>
                          {activeTab !== 'loans' && <TableHead>Contact</TableHead>}
                          {activeTab === 'employee' && (
                            <>
                              <TableHead className="text-right">Salary (₹)</TableHead>
                              <TableHead className="text-right">Incentive (₹)</TableHead>
                              <TableHead className="text-right">Bonus (₹)</TableHead>
                              <TableHead className="text-right">Overtime (₹)</TableHead>
                            </>
                          )}
                          {activeTab === 'investors' && (
                            <>
                              <TableHead className="text-right">Investments (₹)</TableHead>
                              <TableHead className="text-right">Capital Withdrawals (₹)</TableHead>
                              <TableHead className="text-right">Profit Distribution (₹)</TableHead>
                              <TableHead className="text-right">Interest Payment (₹)</TableHead>
                            </>
                          )}
                          {activeTab !== 'investors' && (
                            <>
                              <TableHead className="text-right">Debit (₹)</TableHead>
                              <TableHead className="text-right">Credit (₹)</TableHead>
                            </>
                          )}
                          <TableHead className="text-right">Balance (₹)</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledgers.map((ledger) => (
                          <TableRow 
                            key={ledger.id} 
                            className="hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => handleViewLedger(ledger)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTypeIcon(ledger.type)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">{ledger.name}</p>
                                <p className="text-xs text-gray-500">ID: {ledger.id.toString().slice(0, 8)}</p>
                              </div>
                            </TableCell>
                            {activeTab !== 'loans' && (
                              <TableCell>
                                <div className="text-sm">
                                  {ledger.email && <p className="text-gray-600">{ledger.email}</p>}
                                  {ledger.phone && <p className="text-gray-500">{ledger.phone}</p>}
                                </div>
                              </TableCell>
                            )}
                            {activeTab === 'employee' && (
                              <>
                                <TableCell className="text-right font-mono text-sm">
                                  {formatCurrency(ledger.salary_amount || 0)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-purple-700 font-medium">
                                  {formatCurrency(ledger.incentive_amount || 0)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-blue-700 font-medium">
                                  {formatCurrency(ledger.bonus_amount || 0)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-sm text-amber-700 font-medium">
                                  {formatCurrency(ledger.overtime_amount || 0)}
                                </TableCell>
                              </>
                            )}
                            {activeTab === 'investors' && (
                              <>
                                <TableCell className="text-right font-mono text-green-700 font-semibold">
                                  {formatCurrency(ledger.total_investments || 0)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-orange-700 font-semibold">
                                  {formatCurrency(ledger.capital_withdrawals || 0)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-blue-600 font-medium">
                                  {formatCurrency(ledger.profit_distributions || 0)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-purple-600 font-medium">
                                  {formatCurrency(ledger.interest_payments || 0)}
                                </TableCell>
                              </>
                            )}
                            {activeTab !== 'investors' && (
                              <>
                                <TableCell className="text-right font-mono text-green-700 font-semibold">
                                  {formatCurrency(ledger.debit || ledger.total_amount || 0)}
                                </TableCell>
                                <TableCell className="text-right font-mono text-red-700 font-semibold">
                                  {formatCurrency(ledger.credit || ledger.paid_amount || 0)}
                                </TableCell>
                              </>
                            )}
                            <TableCell className="text-right font-mono font-bold text-lg">
                              <span className={ledger.balance_due > 0 ? 'text-orange-600' : ledger.balance_due < 0 ? 'text-blue-600' : 'text-gray-600'}>
                                {formatCurrency(ledger.balance_due || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(ledger.status, ledger.balance_due)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} ledgers
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={pagination.page <= 1 || loading}
                        className="gap-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1 px-4">
                        <span className="text-sm font-medium">Page {pagination.page}</span>
                        <span className="text-sm text-gray-500">of {pagination.totalPages}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={!pagination.hasMore || loading}
                        className="gap-2"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
