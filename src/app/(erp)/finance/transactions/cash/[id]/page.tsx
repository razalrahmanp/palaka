'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Wallet, ArrowUpCircle, ArrowDownCircle, Download, Calendar, TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard, RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface CashTransaction {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  transaction_type: 'CREDIT' | 'DEBIT';
  reference_number?: string;
  source_description?: string;
  running_balance?: number;
  balance_after?: number;
}

interface CashAccount {
  id: string;
  name: string;
  current_balance: number;
  currency: string;
  is_active: boolean;
}

type TransactionCategory = 'all' | 'payment' | 'sales' | 'expense' | 'withdrawal' | 'investment' | 'liability' | 'refund';

export default function CashAccountTransactions() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<CashAccount | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0); // 0 = current month, -1 = last month, etc.
  const [activeCategory, setActiveCategory] = useState<TransactionCategory>('all');
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Generate 7 months of calendar data
  const generateMonthsData = () => {
    const today = new Date();
    const months = [];
    
    for (let offset = -3; offset <= 3; offset++) {
      const targetDate = new Date(today.getFullYear(), today.getMonth() + offset + currentMonthOffset, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      
      const monthName = firstDay.toLocaleDateString('en-US', { month: 'short' });
      const yearNum = year;
      const monthNum = month;
      
      const days = [];
      for (let i = 1; i <= daysInMonth; i++) {
        // Fix timezone issue - format date as YYYY-MM-DD without timezone conversion
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        days.push({
          day: i,
          date: dateStr,
          isToday: dateStr === todayStr
        });
      }
      
      months.push({ monthName, yearNum, monthNum, days, offset: offset + currentMonthOffset });
    }
    
    return months;
  };

  const monthsData = generateMonthsData();

  const handleDateClick = (dateStr: string) => {
    if (!dateStr) return;
    setSelectedDate(dateStr);
    setDateFrom(dateStr);
    setDateTo(dateStr);
  };

  const handleMonthClick = (year: number, month: number) => {
    // Get first and last day of the month
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0);
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
    
    setSelectedDate(''); // Clear single date selection
    setDateFrom(firstDay);
    setDateTo(lastDayStr);
  };

  const scrollMonths = (direction: 'prev' | 'next') => {
    setCurrentMonthOffset(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  const fetchAccountDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/finance/bank-accounts?type=CASH&id=${accountId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          setAccount(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching account details:', error);
    }
  }, [accountId]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all transactions using pagination (100 rows at a time)
      const allTransactions: CashTransaction[] = [];
      let page = 1;
      const pageSize = 100;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetch(
          `/api/finance/cash-transactions?cash_account_id=${accountId}&page=${page}&limit=${pageSize}`
        );
        
        if (response.ok) {
          const result = await response.json();
          const transactions = result.transactions || [];
          
          if (transactions.length > 0) {
            allTransactions.push(...transactions);
            console.log(`Page ${page}: Fetched ${transactions.length} transactions, Total: ${allTransactions.length}`);
            
            // If we got less than pageSize, we've reached the end
            if (transactions.length < pageSize) {
              hasMore = false;
            } else {
              page++;
            }
          } else {
            hasMore = false;
          }
        } else {
          console.error('Failed to fetch transactions');
          hasMore = false;
        }
      }
      
      setTransactions(allTransactions);
      console.log('✅ Fetched all transactions:', allTransactions.length, 'total');
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  const filterTransactions = useCallback(() => {
    let filtered = transactions;

    // Category filter (new - section-wise filtering)
    if (activeCategory !== 'all') {
      filtered = filtered.filter(t => {
        const desc = t.description.toLowerCase();
        switch (activeCategory) {
          case 'payment':
            // Exclude sales-related payments to avoid duplication
            return (desc.includes('payment received') || (desc.includes('payment') && t.transaction_type === 'CREDIT')) 
              && !desc.includes('sales') && !desc.includes('order-');
          case 'sales':
            return desc.includes('sales') || desc.includes('order-');
          case 'expense':
            return desc.includes('expense') && t.transaction_type === 'DEBIT';
          case 'withdrawal':
            return desc.includes('withdrawal') && t.transaction_type === 'DEBIT';
          case 'investment':
            return desc.includes('investment') && t.transaction_type === 'CREDIT';
          case 'liability':
            return desc.includes('liability') && t.transaction_type === 'DEBIT';
          case 'refund':
            return desc.includes('refund') && t.transaction_type === 'DEBIT';
          default:
            return true;
        }
      });
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.source_description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => 
        filterType === 'credit' ? t.transaction_type === 'CREDIT' : t.transaction_type === 'DEBIT'
      );
    }

    // Date filter
    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.transaction_date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.transaction_date) <= new Date(dateTo));
    }

    // Sort by date ascending (oldest first, newest last)
    filtered.sort((a, b) => 
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, filterType, dateFrom, dateTo, activeCategory]);

  useEffect(() => {
    if (accountId) {
      fetchAccountDetails();
      fetchTransactions();
    }
  }, [accountId, fetchAccountDetails, fetchTransactions]);

  useEffect(() => {
    filterTransactions();
  }, [filterTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    return type === 'CREDIT' ? 
      <ArrowUpCircle className="h-4 w-4 text-green-600" /> : 
      <ArrowDownCircle className="h-4 w-4 text-red-600" />;
  };

  const getSourceBadgeColor = (source?: string) => {
    if (!source) return 'bg-gray-100 text-gray-800';
    
    const lower = source.toLowerCase();
    if (lower.includes('sales')) return 'bg-green-100 text-green-800';
    if (lower.includes('expense')) return 'bg-red-100 text-red-800';
    if (lower.includes('investment')) return 'bg-blue-100 text-blue-800';
    if (lower.includes('transfer')) return 'bg-purple-100 text-purple-800';
    
    return 'bg-gray-100 text-gray-800';
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Description', 'Type', 'Amount', 'Balance', 'Reference', 'Source'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.transaction_date).toLocaleDateString('en-IN'),
        `"${t.description}"`,
        t.transaction_type,
        t.transaction_type === 'CREDIT' ? t.amount : -Math.abs(t.amount),
        t.running_balance || t.balance_after || 0,
        `"${t.reference_number || 'N/A'}"`,
        `"${t.source_description || 'Unknown'}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account?.name || 'cash-account'}-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading account details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-full">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-3 sticky top-0 z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                  className="flex items-center gap-2 h-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 rounded-lg">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <h1 className="text-base sm:text-lg font-bold text-gray-900">
                      {account.name} - Cash Ledger
                    </h1>
                    <p className="text-[10px] sm:text-xs text-gray-600">Debit & Credit Transaction History</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">Current Balance</p>
                <p className={`text-base sm:text-lg font-bold ${account.current_balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(account.current_balance)}
                </p>
              </div>
            </div>
          </div>
          
          {/* Collapsible Filter Toggle */}
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 border-t bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-700">
                Filters & Calendar {isFilterExpanded ? '(Expanded)' : '(Collapsed)'}
              </span>
            </div>
            {isFilterExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          
          {isFilterExpanded && (
            <div className="transition-all duration-300 ease-in-out">
              {/* Calendar Section - 7 Months Horizontal View */}
              <div className="mb-2 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-gray-600" />
                <h3 className="text-xs font-semibold text-gray-700">Quick Date Selection</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scrollMonths('prev')}
                  className="h-6 w-6 p-0"
                  title="Previous months"
                >
                  <ArrowLeft className="h-3 w-3" />
                </Button>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedDate('');
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="text-xs text-gray-600 hover:text-gray-900 h-6 px-2"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scrollMonths('next')}
                  className="h-6 w-6 p-0"
                  title="Next months"
                >
                  <ArrowLeft className="h-3 w-3 rotate-180" />
                </Button>
              </div>
            </div>
            
            {/* 7 Months Grid */}
            <div className="w-full bg-white rounded border border-gray-200 p-1.5">
              <div className="grid grid-cols-7 gap-0.5">
                {monthsData.map((month, monthIndex) => (
                  <div key={monthIndex} className="flex flex-col">
                    {/* Month Header - Clickable */}
                    <button
                      onClick={() => handleMonthClick(month.yearNum, month.monthNum)}
                      className="text-center mb-1 py-1 bg-gray-50 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                      title={`Show all transactions for ${month.monthName} ${month.yearNum}`}
                    >
                      <div className="text-[9px] sm:text-[10px] font-bold text-gray-700">{month.monthName}</div>
                      <div className="text-[8px] text-gray-500">{month.yearNum}</div>
                    </button>
                    
                    {/* Days */}
                    <div className="grid grid-cols-7 gap-[1px]">
                      {month.days.map((day, dayIndex) => (
                        <button
                          key={dayIndex}
                          onClick={() => handleDateClick(day.date)}
                          className={`aspect-square rounded-sm flex items-center justify-center text-[8px] sm:text-[9px] font-medium transition-all ${
                            selectedDate === day.date
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : day.isToday
                              ? 'bg-blue-500 text-white font-bold'
                              : 'bg-gray-50 text-gray-700 hover:bg-emerald-100 hover:text-emerald-700'
                          }`}
                        >
                          {day.day}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Inline Filters */}
          <div className="flex flex-wrap items-center gap-1.5 py-2 border-t w-full">
            <div className="flex-1 min-w-[100px] max-w-xs">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 text-xs w-full"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-28 h-7 text-xs"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-28 h-7 text-xs"
              placeholder="To"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setFilterType('all');
                setDateFrom('');
                setDateTo('');
                setSelectedDate('');
              }}
              className="h-7 px-2 text-xs"
            >
              Clear
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="h-7 px-2 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">CSV</span>
            </Button>
            <div className="text-[10px] text-gray-600 ml-auto">
              {filteredTransactions.length} of {transactions.length} entries
            </div>
          </div>

          {/* Category Toggle Buttons - Horizontal Scrollable */}
          <div className="py-3 border-t bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-2 mb-2 px-3">
              <Filter className="h-4 w-4 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-700">Filter by Category</h3>
            </div>
            <div className="overflow-x-auto">
              <div className="flex gap-2 px-3 pb-1">
                <button
                  onClick={() => setActiveCategory('all')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    activeCategory === 'all'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                  <span>All Transactions</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {transactions.length}
                  </Badge>
                </button>

                <button
                  onClick={() => setActiveCategory('payment')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    activeCategory === 'payment'
                      ? 'bg-green-600 text-white border-green-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-400'
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Payments Received</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {transactions.filter(t => {
                      const desc = t.description.toLowerCase();
                      return (desc.includes('payment received') || (desc.includes('payment') && t.transaction_type === 'CREDIT'))
                        && !desc.includes('sales') && !desc.includes('order-');
                    }).length}
                  </Badge>
                </button>

                <button
                  onClick={() => setActiveCategory('sales')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    activeCategory === 'sales'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-emerald-50 hover:border-emerald-400'
                  }`}
                >
                  <Receipt className="h-4 w-4" />
                  <span>Sales Orders</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {transactions.filter(t => {
                      const desc = t.description.toLowerCase();
                      return desc.includes('sales') || desc.includes('order-');
                    }).length}
                  </Badge>
                </button>

                <button
                  onClick={() => setActiveCategory('expense')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    activeCategory === 'expense'
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:border-red-400'
                  }`}
                >
                  <TrendingDown className="h-4 w-4" />
                  <span>Expenses</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {transactions.filter(t => {
                      const desc = t.description.toLowerCase();
                      return desc.includes('expense') && t.transaction_type === 'DEBIT';
                    }).length}
                  </Badge>
                </button>

                <button
                  onClick={() => setActiveCategory('withdrawal')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    activeCategory === 'withdrawal'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-orange-50 hover:border-orange-400'
                  }`}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  <span>Withdrawals</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {transactions.filter(t => {
                      const desc = t.description.toLowerCase();
                      return desc.includes('withdrawal') && t.transaction_type === 'DEBIT';
                    }).length}
                  </Badge>
                </button>

                <button
                  onClick={() => setActiveCategory('investment')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    activeCategory === 'investment'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 hover:border-purple-400'
                  }`}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  <span>Investments</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {transactions.filter(t => {
                      const desc = t.description.toLowerCase();
                      return desc.includes('investment') && t.transaction_type === 'CREDIT';
                    }).length}
                  </Badge>
                </button>

                <button
                  onClick={() => setActiveCategory('liability')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    activeCategory === 'liability'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-50 hover:border-indigo-400'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Liability Payments</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {transactions.filter(t => {
                      const desc = t.description.toLowerCase();
                      return desc.includes('liability') && t.transaction_type === 'DEBIT';
                    }).length}
                  </Badge>
                </button>

                <button
                  onClick={() => setActiveCategory('refund')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                    activeCategory === 'refund'
                      ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-pink-50 hover:border-pink-400'
                  }`}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refunds</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {transactions.filter(t => {
                      const desc = t.description.toLowerCase();
                      return desc.includes('refund') && t.transaction_type === 'DEBIT';
                    }).length}
                  </Badge>
                </button>
              </div>
            </div>
          </div>
            </div>
          )}

        </div>

        {/* Transactions Table */}
        <Card className="w-full border-t-0 rounded-t-none shadow-none">
          <CardContent className="p-0 w-full">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No transactions found</p>
                <p className="text-sm">
                  {transactions.length === 0 ? 
                    'This account has no transaction history yet' : 
                    'Try adjusting your filters to see more transactions'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full table-auto">
                  {/* Header */}
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider">Particulars</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Debit (₹)</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Credit (₹)</th>
                      <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right text-[10px] sm:text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Balance (₹)</th>
                    </tr>
                  </thead>
                  
                  {/* Transactions */}
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.map((transaction, index) => (
                      <tr key={transaction.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                          <div className="font-medium">
                            {new Date(transaction.transaction_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short'
                            })}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500">
                            {new Date(transaction.transaction_date).getFullYear()}
                          </div>
                        </td>
                      
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3">
                        <div className="flex items-start gap-1 sm:gap-2">
                          {getTransactionIcon(transaction.transaction_type)}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium text-gray-900 leading-tight break-words">
                              {transaction.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                              {transaction.reference_number && (
                                <span className="text-[10px] sm:text-xs text-gray-500">
                                  Ref: {transaction.reference_number}
                                </span>
                              )}
                              {transaction.source_description && (
                                <Badge className={`text-[10px] sm:text-xs ${getSourceBadgeColor(transaction.source_description)}`}>
                                  {transaction.source_description}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center whitespace-nowrap">
                        {transaction.transaction_type === 'DEBIT' ? (
                          <span className="text-red-600 font-semibold text-xs sm:text-sm">
                            {transaction.amount.toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-center whitespace-nowrap">
                        {transaction.transaction_type === 'CREDIT' ? (
                          <span className="text-green-600 font-semibold text-xs sm:text-sm">
                            {transaction.amount.toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      
                      <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 text-right whitespace-nowrap">
                        <span className={`font-semibold text-xs sm:text-sm ${
                          (transaction.running_balance || transaction.balance_after || 0) >= 0 
                            ? 'text-gray-900' 
                            : 'text-red-600'
                        }`}>
                          {(transaction.running_balance || transaction.balance_after || 0).toLocaleString('en-IN', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                
                {/* Footer Totals */}
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm font-semibold text-gray-700 whitespace-nowrap" colSpan={2}>
                      TOTALS ({filteredTransactions.length} entries)
                    </td>
                    <td className="px-2 md:px-4 py-3 text-center text-xs md:text-sm font-bold text-red-600 whitespace-nowrap">
                      {(() => {
                        const totalDebit = filteredTransactions
                          .filter(t => t.transaction_type === 'DEBIT')
                          .reduce((sum, t) => sum + t.amount, 0);
                        return totalDebit.toLocaleString('en-IN', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        });
                      })()}
                    </td>
                    <td className="px-2 md:px-4 py-3 text-center text-xs md:text-sm font-bold text-green-600 whitespace-nowrap">
                      {(() => {
                        const totalCredit = filteredTransactions
                          .filter(t => t.transaction_type === 'CREDIT')
                          .reduce((sum, t) => sum + t.amount, 0);
                        return totalCredit.toLocaleString('en-IN', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        });
                      })()}
                    </td>
                    <td className="px-2 md:px-4 py-3 text-right text-xs md:text-sm font-bold text-gray-900 whitespace-nowrap">
                      {(() => {
                        // Get the closing balance from the last transaction's running balance
                        if (filteredTransactions.length > 0) {
                          const lastTransaction = filteredTransactions[filteredTransactions.length - 1];
                          const closingBalance = lastTransaction.running_balance || lastTransaction.balance_after || 0;
                          return `Closing: ${formatCurrency(closingBalance)}`;
                        }
                        return `Closing: ${formatCurrency(0)}`;
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}