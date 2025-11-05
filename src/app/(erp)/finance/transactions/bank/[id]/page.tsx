'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building2, ArrowDownCircle, Download, CreditCard, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  reference?: string;
  transaction_type: 'bank_transaction' | 'vendor_payment' | 'withdrawal' | 'liability_payment';
  balance_after?: number;
  running_balance?: number;
}

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  current_balance: number;
  currency: string;
  is_active: boolean;
}

type TransactionCategory = 'all' | 'transfer' | 'payment' | 'withdrawal' | 'liability';

export default function BankAccountTransactions() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [transactionType, setTransactionType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const [activeCategory, setActiveCategory] = useState<TransactionCategory>('all');
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

  // Calendar generation function
  const generateMonthsData = () => {
    const months = [];
    const today = new Date();
    
    for (let i = -3; i < 4; i++) {
      const monthOffset = i + currentMonthOffset;
      const date = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      
      const days = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateString = currentDate.toISOString().split('T')[0];
        days.push({
          day,
          date: dateString,
          isToday: dateString === today.toISOString().split('T')[0],
          isSelected: dateString === selectedDate
        });
      }
      
      months.push({
        name: firstDay.toLocaleString('default', { month: 'short' }),
        year,
        month,
        days
      });
    }
    
    return months;
  };

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr === selectedDate ? '' : dateStr);
  };

  const handleMonthClick = (year: number, month: number) => {
    const clickedDate = new Date(year, month, 1);
    const today = new Date();
    const monthsDiff = (clickedDate.getFullYear() - today.getFullYear()) * 12 + 
                      (clickedDate.getMonth() - today.getMonth());
    setCurrentMonthOffset(monthsDiff);
  };

  const scrollMonths = (direction: 'prev' | 'next') => {
    setCurrentMonthOffset(prev => direction === 'next' ? prev + 1 : prev - 1);
  };

  const monthsData = generateMonthsData();

  const fetchAccountDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/finance/bank-accounts?id=${accountId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          const accountData = result.data[0];
          console.log('📋 Bank account details loaded:', {
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
      
      console.log('🔍 Fetching bank transactions for account:', accountId);
      
      // Fetch all transactions using pagination (100 rows at a time)
      const allTransactions: BankTransaction[] = [];
      let page = 1;
      const pageSize = 100;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetch(
          `/api/finance/bank-transactions?bank_account_id=${accountId}&page=${page}&limit=${pageSize}`
        );
        
        if (response.ok) {
          const result = await response.json();
          const transactions = result.data?.transactions || [];
          
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
      console.log('✅ Fetched all bank transactions:', allTransactions.length, 'total');
      
      // Debug: Check if transactions have running_balance
      if (allTransactions.length > 0) {
        console.log('📊 Sample bank transaction data:', {
          first: {
            id: allTransactions[0].id,
            date: allTransactions[0].date,
            amount: allTransactions[0].amount,
            running_balance: allTransactions[0].running_balance,
            balance_after: allTransactions[0].balance_after
          },
          last: {
            id: allTransactions[allTransactions.length - 1].id,
            date: allTransactions[allTransactions.length - 1].date,
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
  }, [accountId]);

  const filterTransactions = useCallback(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.transaction_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (activeCategory !== 'all') {
      if (activeCategory === 'transfer') {
        filtered = filtered.filter(t => 
          t.transaction_type === 'bank_transaction'
        );
      } else if (activeCategory === 'payment') {
        filtered = filtered.filter(t => 
          t.transaction_type === 'vendor_payment'
        );
      } else if (activeCategory === 'withdrawal') {
        filtered = filtered.filter(t => 
          t.type === 'withdrawal' &&
          t.transaction_type === 'withdrawal'
        );
      } else if (activeCategory === 'liability') {
        filtered = filtered.filter(t => t.transaction_type === 'liability_payment');
      }
    }

    // Type filter (deposit/withdrawal)
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // Transaction type filter
    if (transactionType !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === transactionType);
    }

    // Selected date filter
    if (selectedDate) {
      filtered = filtered.filter(t => t.date === selectedDate);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(dateTo));
    }

    // Sort oldest first (ascending by date)
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance for filtered transactions
    let runningBalance = 0;
    const transactionsWithBalance = filtered.map(transaction => {
      if (transaction.type === 'deposit') {
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
  }, [transactions, searchTerm, filterType, transactionType, dateFrom, dateTo, activeCategory, selectedDate]);

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

  const getTransactionTypeIcon = (transactionType: string) => {
    switch (transactionType) {
      case 'vendor_payment':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'withdrawal':
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      case 'liability_payment':
        return <Receipt className="h-4 w-4 text-purple-600" />;
      default:
        return <Building2 className="h-4 w-4 text-gray-600" />;
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Description', 'Type', 'Transaction Type', 'Amount', 'Balance', 'Reference'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString('en-IN'),
        `"${t.description}"`,
        t.type,
        t.transaction_type,
        t.type === 'deposit' ? t.amount : -Math.abs(t.amount),
        t.balance_after || 0,
        `"${t.reference || 'N/A'}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account?.name || 'bank-account'}-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading account details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-2">
      {/* Header */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 h-8"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </Button>
          <Button variant="outline" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-8">
            <Download className="h-3 w-3 mr-2" />
            Export
          </Button>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {account.name} - Bank Statement
            </h1>
            <p className="text-white/70 mt-0.5 text-xs">
              Account: ****{account.account_number.slice(-4)} • Debit & Credit History
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70 mb-1">Current Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(account.current_balance)}</p>
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
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
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
                  setTransactionType('all');
                  setDateFrom('');
                  setDateTo('');
                  setSelectedDate('');
                  setActiveCategory('all');
                }}
                className="h-8 text-xs"
              >
                Clear
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
                        onClick={() => handleMonthClick(month.year, month.month)}
                        className="w-full text-center font-bold text-[10px] mb-1 text-indigo-700 hover:text-indigo-900 transition-colors px-1 py-0.5 rounded hover:bg-indigo-50"
                      >
                        {month.name} {month.year}
                      </button>
                      <div className="grid grid-cols-7 gap-0.5">
                        {month.days.map((day) => (
                          <button
                            key={day.date}
                            onClick={() => handleDateClick(day.date)}
                            className={`
                              w-6 h-6 flex items-center justify-center text-[10px] rounded font-medium
                              ${day.isToday ? 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold shadow-md' : ''}
                              ${day.isSelected ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold ring-2 ring-purple-300 shadow-lg scale-110' : !day.isToday ? 'hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 text-gray-700' : ''}
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
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Transaction History</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="h-8 px-3 text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-indigo-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                      Particulars
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                      Debit (₹)
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                      Credit (₹)
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                      Balance (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((transaction) => (
                    <tr 
                      key={transaction.id} 
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-[11px] text-gray-600">
                          {new Date(transaction.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-1.5">
                          <div className="mt-0.5">
                            {getTransactionTypeIcon(transaction.transaction_type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-gray-900 truncate">
                              {transaction.description}
                            </p>
                            {transaction.reference && (
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                                Ref: {transaction.reference}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-3 py-2 text-right">
                        {transaction.type === 'withdrawal' && (
                          <span className="text-[11px] font-semibold text-red-600">
                            {formatCurrency(transaction.amount)}
                          </span>
                        )}
                      </td>
                      
                      <td className="px-3 py-2 text-right">
                        {transaction.type === 'deposit' && (
                          <span className="text-[11px] font-semibold text-blue-600">
                            {formatCurrency(transaction.amount)}
                          </span>
                        )}
                      </td>
                      
                      <td className="px-3 py-2 text-right">
                        <span className={`text-[11px] font-bold ${
                          (transaction.running_balance || transaction.balance_after || 0) >= 0
                            ? 'text-blue-700'
                            : 'text-red-700'
                        }`}>
                          {formatCurrency(transaction.running_balance || transaction.balance_after || 0)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-300">
                  <tr className="font-bold">
                    <td colSpan={2} className="px-3 py-2 text-[11px] text-indigo-900">
                      TOTALS
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-red-700">
                      {formatCurrency(filteredTransactions
                        .filter(t => t.type === 'withdrawal')
                        .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-blue-700">
                      {formatCurrency(filteredTransactions
                        .filter(t => t.type === 'deposit')
                        .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-[11px] text-indigo-900">
                      {formatCurrency(filteredTransactions.length > 0 
                        ? filteredTransactions[filteredTransactions.length - 1].running_balance || filteredTransactions[filteredTransactions.length - 1].balance_after || 0
                        : account?.current_balance || 0
                      )}
                    </td>
                  </tr>
                  <tr className="font-semibold bg-blue-50">
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-700">
                      Closing Balance
                    </td>
                    <td colSpan={3} className="px-4 py-3 text-right text-base text-blue-700">
                      {formatCurrency(account?.current_balance || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}