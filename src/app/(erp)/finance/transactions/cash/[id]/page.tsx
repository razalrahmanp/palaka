'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Wallet, ArrowUpCircle, ArrowDownCircle, Download, ChevronDown, ChevronUp } from 'lucide-react';
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
  account_type?: 'CASH' | 'BANK';
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
      const response = await fetch(`/api/finance/bank-accounts?id=${accountId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          const accountData = result.data[0];
          console.log('📋 Account details loaded:', {
            id: accountData.id,
            name: accountData.name,
            account_type: accountData.account_type
          });
          setAccount(accountData);
        }
      }
    } catch (error) {
      console.error('Error fetching account details:', error);
    }
  }, [accountId]);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Determine which API to use based on account type
      const apiEndpoint = account?.account_type === 'BANK' 
        ? 'bank-transactions' 
        : 'cash-transactions';
      
      const accountParam = account?.account_type === 'BANK'
        ? `bank_account_id=${accountId}`
        : `cash_account_id=${accountId}`;
      
      console.log(`🔍 Fetching transactions from ${apiEndpoint} API for account type: ${account?.account_type}`);
      
      // Fetch all transactions using pagination (100 rows at a time)
      const allTransactions: CashTransaction[] = [];
      let page = 1;
      const pageSize = 100;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetch(
          `/api/finance/${apiEndpoint}?${accountParam}&page=${page}&limit=${pageSize}`
        );
        
        if (response.ok) {
          const result = await response.json();
          // Handle both response structures: result.data.transactions (bank) and result.transactions (cash)
          const transactions = result.data?.transactions || result.transactions || [];
          
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
      
      // Debug: Check if transactions have running_balance
      if (allTransactions.length > 0) {
        console.log('📊 Sample transaction data:', {
          first: {
            id: allTransactions[0].id,
            date: allTransactions[0].transaction_date,
            amount: allTransactions[0].amount,
            running_balance: allTransactions[0].running_balance,
            balance_after: allTransactions[0].balance_after
          },
          last: {
            id: allTransactions[allTransactions.length - 1].id,
            date: allTransactions[allTransactions.length - 1].transaction_date,
            amount: allTransactions[allTransactions.length - 1].amount,
            running_balance: allTransactions[allTransactions.length - 1].running_balance,
            balance_after: allTransactions[allTransactions.length - 1].balance_after
          }
        });
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [accountId, account?.account_type]);

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

    // Calculate running balance for filtered transactions
    let runningBalance = 0;
    const transactionsWithBalance = filtered.map(transaction => {
      if (transaction.transaction_type === 'CREDIT') {
        runningBalance += transaction.amount;
      } else {
        runningBalance -= transaction.amount;
      }
      return {
        ...transaction,
        running_balance: runningBalance
      };
    });

    setFilteredTransactions(transactionsWithBalance);
  }, [transactions, searchTerm, filterType, dateFrom, dateTo, activeCategory]);

  useEffect(() => {
    if (accountId) {
      fetchAccountDetails();
    }
  }, [accountId, fetchAccountDetails]);

  // Fetch transactions AFTER account details are loaded
  useEffect(() => {
    if (account) {
      fetchTransactions();
    }
  }, [account, fetchTransactions]);

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
        <div className="w-full max-w-full space-y-3 p-2">
          {/* Header - Gradient Style */}
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.back()}
                    className="h-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-lg font-bold flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      {account.name}
                    </h1>
                    <p className="text-xs text-white/80">Cash Ledger</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/80">Current Balance</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(account.current_balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Filters & Calendar Section */}
          <Card>
            <CardHeader className="cursor-pointer py-3 px-4" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
              <div className="flex items-center justify-between">
                {/* Search and Date Filters in Header */}
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-24 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    type="date"
                    placeholder="dd-mm-yyyy"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-36 h-8 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <Input
                    type="date"
                    placeholder="dd-mm-yyyy"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-36 h-8 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                      setFilterType('all');
                      setDateFrom('');
                      setDateTo('');
                      setSelectedDate('');
                      setActiveCategory('all');
                    }}
                    className="h-8 text-xs"
                  >
                    Clear
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToCSV();
                    }}
                    className="h-8 px-3 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Export CSV
                  </Button>
                </div>
                {isFilterExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </CardHeader>

            {isFilterExpanded && (
              <CardContent className="space-y-3 px-4 pb-4">
                {/* Stylish Calendar in Single Row */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-xs text-gray-700">Quick Date Selection</h3>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => scrollMonths('prev')}
                        className="h-7 px-2 text-xs bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200"
                      >
                        ←
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentMonthOffset(0)}
                        className="h-7 px-3 text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 border-0"
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => scrollMonths('next')}
                        className="h-7 px-2 text-xs bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200"
                      >
                        →
                      </Button>
                    </div>
                  </div>

                  {/* Calendar Grid - Single Row */}
                  <div className="flex gap-2 overflow-x-auto pb-2 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
                    {monthsData.map((month, idx) => (
                      <div key={idx} className="flex-shrink-0 bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                        <button
                          onClick={() => handleMonthClick(month.yearNum, month.monthNum)}
                          className="w-full text-center font-bold text-[10px] mb-1 text-indigo-700 hover:text-indigo-900 transition-colors px-1 py-0.5 rounded hover:bg-indigo-50"
                        >
                          {month.monthName} {month.yearNum}
                        </button>
                        <div className="grid grid-cols-7 gap-0.5">
                          {month.days.map((day) => (
                            <button
                              key={day.date}
                              onClick={() => handleDateClick(day.date)}
                              className={`
                                w-6 h-6 flex items-center justify-center text-[10px] rounded font-medium
                                ${day.isToday ? 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold shadow-md' : ''}
                                ${selectedDate === day.date ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold ring-2 ring-purple-300 shadow-lg scale-110' : !day.isToday ? 'hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 text-gray-700' : ''}
                                transition-all duration-200
                              `}
                            >
                              {day.day}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
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
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  {/* Header */}
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-indigo-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-2 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Particulars</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Debit (₹)</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Credit (₹)</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Balance (₹)</th>
                    </tr>
                  </thead>
                  
                  {/* Transactions */}
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="text-[11px] text-gray-600">
                            {new Date(transaction.transaction_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </td>
                      
                        <td className="px-3 py-2">
                          <div className="flex items-start gap-1.5">
                            {getTransactionIcon(transaction.transaction_type)}
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium text-gray-900 truncate">
                                {transaction.description}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                {transaction.reference_number && (
                                  <span className="text-[10px] text-gray-500">
                                    Ref: {transaction.reference_number}
                                  </span>
                                )}
                                {transaction.source_description && (
                                  <Badge className={`text-[10px] px-1 py-0 ${getSourceBadgeColor(transaction.source_description)}`}>
                                    {transaction.source_description}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      
                        <td className="px-3 py-2 text-right">
                          {transaction.transaction_type === 'DEBIT' && (
                            <span className="text-[11px] font-semibold text-red-600">
                              {transaction.amount.toLocaleString('en-IN', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </span>
                          )}
                        </td>
                      
                        <td className="px-3 py-2 text-right">
                          {transaction.transaction_type === 'CREDIT' && (
                            <span className="text-[11px] font-semibold text-blue-600">
                              {transaction.amount.toLocaleString('en-IN', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </span>
                          )}
                        </td>
                      
                        <td className="px-3 py-2 text-right">
                          <span className={`text-[11px] font-bold ${
                            (transaction.running_balance || transaction.balance_after || 0) >= 0 
                              ? 'text-blue-700' 
                              : 'text-red-700'
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
                  <tfoot className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-300">
                    <tr className="font-bold">
                      <td className="px-3 py-2 text-[11px] text-indigo-900" colSpan={2}>
                        TOTALS
                      </td>
                      <td className="px-3 py-2 text-right text-[11px] text-red-700">
                        {filteredTransactions
                          .filter(t => t.transaction_type === 'DEBIT')
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString('en-IN', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                      </td>
                      <td className="px-3 py-2 text-right text-[11px] text-blue-700">
                        {filteredTransactions
                          .filter(t => t.transaction_type === 'CREDIT')
                          .reduce((sum, t) => sum + t.amount, 0)
                          .toLocaleString('en-IN', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                      </td>
                      <td className="px-3 py-2 text-right text-[11px] text-indigo-900">
                        {(() => {
                          if (filteredTransactions.length > 0) {
                            const lastTransaction = filteredTransactions[filteredTransactions.length - 1];
                            const closingBalance = lastTransaction.running_balance || lastTransaction.balance_after || 0;
                            return closingBalance.toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            });
                          }
                          return '0.00';
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
    </div>
  );
}