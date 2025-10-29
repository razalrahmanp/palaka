'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Building2, ArrowDownCircle, Download, CreditCard, Receipt, Calendar, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
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

    setFilteredTransactions(filtered);
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

  const getTransactionTypeBadge = (transactionType: string) => {
    const typeMap = {
      'bank_transaction': { label: 'Bank Transfer', color: 'bg-blue-100 text-blue-800' },
      'vendor_payment': { label: 'Vendor Payment', color: 'bg-green-100 text-green-800' },
      'withdrawal': { label: 'Withdrawal', color: 'bg-red-100 text-red-800' },
      'liability_payment': { label: 'Liability Payment', color: 'bg-purple-100 text-purple-800' }
    };
    
    const typeInfo = typeMap[transactionType as keyof typeof typeMap] || 
      { label: transactionType, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge className={`text-xs ${typeInfo.color}`}>
        {typeInfo.label}
      </Badge>
    );
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {account.name} - Bank Statement
              </h1>
              <p className="text-sm text-gray-600">
                Account: ****{account.account_number.slice(-4)} • Debit & Credit History
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Current Balance</p>
            <p className={`text-xl font-bold ${account.current_balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(account.current_balance)}
            </p>
          </div>
        </div>
        
        {/* Filters & Calendar Section */}
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            {isFilterExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="font-medium">Filters & Calendar ({isFilterExpanded ? 'Expanded' : 'Collapsed'})</span>
          </Button>

          {isFilterExpanded && (
            <div className="space-y-4">
              {/* Calendar Section */}
              <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-semibold text-gray-700">Quick Date Selection</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => scrollMonths('prev')}
                      className="h-7 px-2"
                    >
                      ←
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => scrollMonths('next')}
                      className="h-7 px-2"
                    >
                      →
                    </Button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 overflow-x-auto">
                  {monthsData.map((month, idx) => (
                    <div key={idx} className="min-w-[120px]">
                      <button
                        onClick={() => handleMonthClick(month.year, month.month)}
                        className="w-full text-xs font-semibold text-gray-700 hover:text-blue-600 py-1 text-center transition-colors"
                      >
                        {month.name}
                      </button>
                      <div className="text-xs text-gray-500 text-center mb-1">{month.year}</div>
                      <div className="grid grid-cols-7 gap-0.5">
                        {month.days.map((day) => (
                          <button
                            key={day.date}
                            onClick={() => handleDateClick(day.date)}
                            className={`
                              aspect-square text-[10px] rounded-sm transition-all duration-200
                              ${day.isToday 
                                ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-300' 
                                : day.isSelected
                                ? 'bg-blue-500 text-white font-semibold'
                                : 'bg-gray-50 text-gray-700 hover:bg-blue-100'
                              }
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

              {/* Inline Filter Controls */}
              <div className="flex items-center gap-3">
                <div className="flex-1 max-w-xs">
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36 h-8 text-sm"
                  placeholder="dd-mm-yyyy"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36 h-8 text-sm"
                  placeholder="dd-mm-yyyy"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterType('all');
                    setTransactionType('all');
                    setDateFrom('');
                    setDateTo('');
                    setSelectedDate('');
                    setActiveCategory('all');
                  }}
                  className="h-8"
                >
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="h-8 px-3"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
                <div className="text-xs text-gray-600">
                  {filteredTransactions.length} of {transactions.length} entries
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter by Category */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filter by Category</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('all')}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Wallet className="h-4 w-4" />
            All Transactions
            <Badge variant="secondary" className="ml-1">
              {transactions.length}
            </Badge>
          </Button>

          <Button
            variant={activeCategory === 'transfer' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('transfer')}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Building2 className="h-4 w-4" />
            Bank Transfers
            <Badge variant="secondary" className="ml-1">
              {transactions.filter(t => t.transaction_type === 'bank_transaction').length}
            </Badge>
          </Button>

          <Button
            variant={activeCategory === 'payment' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('payment')}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <CreditCard className="h-4 w-4" />
            Vendor Payments
            <Badge variant="secondary" className="ml-1">
              {transactions.filter(t => t.transaction_type === 'vendor_payment').length}
            </Badge>
          </Button>

          <Button
            variant={activeCategory === 'withdrawal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('withdrawal')}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <ArrowDownCircle className="h-4 w-4" />
            Withdrawals
            <Badge variant="secondary" className="ml-1">
              {transactions.filter(t => t.type === 'withdrawal' && t.transaction_type === 'withdrawal').length}
            </Badge>
          </Button>

          <Button
            variant={activeCategory === 'liability' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('liability')}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Receipt className="h-4 w-4" />
            Liability Payments
            <Badge variant="secondary" className="ml-1">
              {transactions.filter(t => t.transaction_type === 'liability_payment').length}
            </Badge>
          </Button>
        </div>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Transaction History</span>
            {filteredTransactions.length > 0 && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-green-600 font-semibold">
                    +{formatCurrency(filteredTransactions
                      .filter(t => t.type === 'deposit')
                      .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500">Money In</p>
                </div>
                <div className="text-center">
                  <p className="text-red-600 font-semibold">
                    -{formatCurrency(filteredTransactions
                      .filter(t => t.type === 'withdrawal')
                      .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500">Money Out</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-600 font-semibold">
                    {formatCurrency(filteredTransactions
                      .reduce((sum, t) => sum + (t.type === 'deposit' ? t.amount : -t.amount), 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500">Net Movement</p>
                </div>
              </div>
            )}
          </CardTitle>
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Particulars
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Withdrawal
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Deposit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTransactions.map((transaction) => (
                    <tr 
                      key={transaction.id} 
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                        {new Date(transaction.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {getTransactionTypeIcon(transaction.transaction_type)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.description}
                            </p>
                            {transaction.reference && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                Ref: {transaction.reference}
                              </p>
                            )}
                            <div className="mt-1">
                              {getTransactionTypeBadge(transaction.transaction_type)}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 text-right">
                        {transaction.type === 'withdrawal' && (
                          <span className="text-sm font-semibold text-red-600">
                            {formatCurrency(transaction.amount)}
                          </span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3 text-right">
                        {transaction.type === 'deposit' && (
                          <span className="text-sm font-semibold text-green-600">
                            {formatCurrency(transaction.amount)}
                          </span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-semibold ${
                          (transaction.running_balance || transaction.balance_after || 0) >= 0
                            ? 'text-gray-900'
                            : 'text-red-600'
                        }`}>
                          {formatCurrency(transaction.running_balance || transaction.balance_after || 0)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr className="font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-700">
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-red-600">
                      {formatCurrency(filteredTransactions
                        .filter(t => t.type === 'withdrawal')
                        .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-green-600">
                      {formatCurrency(filteredTransactions
                        .filter(t => t.type === 'deposit')
                        .reduce((sum, t) => sum + t.amount, 0)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-blue-600">
                      {formatCurrency(filteredTransactions.length > 0 
                        ? filteredTransactions[filteredTransactions.length - 1].balance_after || 0
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