'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, Receipt, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  reference?: string;
  transaction_type: string;
  balance_after?: number;
  running_balance?: number;
  bank_account_id: string;
  bank_account_name?: string;
  bank_accounts?: {
    name: string;
    account_number: string;
    account_type: string;
  };
}

type TransactionCategory = 'all' | 'deposits' | 'withdrawals' | 'bank_transaction' | 'vendor_payment' | 'liability_payment';

export default function AllBankTransactions() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance/bank-transactions/all');
      
      if (response.ok) {
        const result = await response.json();
        const allTransactions = result.data?.transactions || [];
        setTransactions(allTransactions);
      } else {
        console.error('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterTransactions = useCallback(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.transaction_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.bank_accounts?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (activeCategory !== 'all') {
      if (activeCategory === 'deposits') {
        filtered = filtered.filter(t => t.type === 'deposit');
      } else if (activeCategory === 'withdrawals') {
        filtered = filtered.filter(t => t.type === 'withdrawal');
      } else {
        filtered = filtered.filter(t => t.transaction_type === activeCategory);
      }
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
  }, [transactions, searchTerm, dateFrom, dateTo, activeCategory, selectedDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    filterTransactions();
  }, [filterTransactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTransactionTypeBadge = (transactionType: string, transaction: BankTransaction) => {
    // Check if this is a cash transaction based on account type
    const isCashTransaction = transaction.bank_accounts?.account_type === 'CASH';
    
    const typeMap: Record<string, { label: string; color: string }> = {
      'bank_transaction': { 
        label: isCashTransaction ? 'Cash' : 'Bank Transfer', 
        color: isCashTransaction ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800' 
      },
      'vendor_payment': { label: 'Payment', color: 'bg-blue-100 text-blue-800' },
      'withdrawal': { label: 'Withdrawal', color: 'bg-orange-100 text-orange-800' },
      'liability_payment': { label: 'Liability', color: 'bg-red-100 text-red-800' },
      'deposit': { label: 'Deposit', color: 'bg-green-100 text-green-800' },
    };

    const type = typeMap[transactionType] || { label: transactionType, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={type.color}>{type.label}</Badge>;
  };

  const totalDeposits = filteredTransactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = filteredTransactions
    .filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  // Group transactions by date
  const transactionsByDate = filteredTransactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, BankTransaction[]>);

  const sortedDates = Object.keys(transactionsByDate).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  // Calculate running balance for all transactions (proper accounting)
  const transactionsWithBalance = filteredTransactions.map((transaction, index, array) => {
    // Calculate running balance up to this transaction
    // Credit (deposits) increase balance, Debit (withdrawals) decrease balance
    const runningBalance = array.slice(0, index + 1).reduce((balance, tx) => {
      if (tx.type === 'deposit') {
        return balance + tx.amount; // Credit increases balance
      } else {
        return balance - tx.amount; // Debit decreases balance
      }
    }, 0);

    return {
      ...transaction,
      calculated_balance: runningBalance
    };
  });

  // Group transactions with calculated balance by date
  const transactionsByDateWithBalance = transactionsWithBalance.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, (BankTransaction & { calculated_balance: number })[]>);

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSelectedDate('');
    setActiveCategory('all');
  };

  return (
    <div className="p-2 space-y-3">
      {/* Header with Current Balance */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/finance/bank-accounts')}
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
                Cash Flow - All Bank Transactions
              </h1>
              <p className="text-white/70 mt-0.5 text-xs">
                Debit & Credit Transaction History
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/70 mb-1">Current Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(totalDeposits - totalWithdrawals)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Calendar */}
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
                  clearFilters();
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
                    onClick={() => setCurrentMonthOffset(currentMonthOffset - 1)}
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
                    onClick={() => setCurrentMonthOffset(currentMonthOffset + 1)}
                    className="h-7 px-2 text-xs bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-blue-200"
                  >
                    →
                  </Button>
                </div>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
                {generateMonthsData().map((monthData, monthIndex) => (
                  <div key={monthIndex} className="flex-shrink-0 bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                    <button
                      onClick={() => handleMonthClick(monthData.year, monthData.month)}
                      className="w-full text-center font-bold text-[10px] mb-1 text-indigo-700 hover:text-indigo-900 transition-colors px-1 py-0.5 rounded hover:bg-indigo-50"
                    >
                      {monthData.name} {monthData.year}
                    </button>
                    <div className="grid grid-cols-7 gap-0.5">
                      {monthData.days.map((day) => (
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

      {/* Transactions - Removed Header with Counts */}
      <Card>
        <CardContent className="space-y-4 px-4 pb-4 pt-4">
          {/* Transactions Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground text-sm">Loading transactions...</div>
            </div>
          ) : sortedDates.length > 0 ? (
            <div className="space-y-3">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-gray-50 rounded-t-lg font-semibold text-xs">
                <div className="col-span-2">Date</div>
                <div className="col-span-5">Particulars</div>
                <div className="col-span-2 text-right">Debit (₹)</div>
                <div className="col-span-2 text-right">Credit (₹)</div>
                <div className="col-span-1 text-right">Balance (₹)</div>
              </div>

              {/* Transactions */}
              {sortedDates.map(date => {
                const dayTransactions = transactionsByDateWithBalance[date];

                return (
                  <div key={date} className="space-y-0">
                    {dayTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="grid grid-cols-12 gap-3 px-3 py-2 border-b hover:bg-gray-50 transition-colors text-xs"
                      >
                        <div className="col-span-2">
                          <p className="font-semibold text-[10px]">{formatDate(transaction.date)}</p>
                        </div>
                        <div className="col-span-5">
                          <p className="font-medium mb-0.5 text-xs">{transaction.description}</p>
                          {transaction.reference && (
                            <p className="text-[10px] text-gray-600">Ref: {transaction.reference}</p>
                          )}
                          <div className="mt-0.5">
                            {getTransactionTypeBadge(transaction.transaction_type, transaction)}
                          </div>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className={`font-semibold text-xs ${transaction.type === 'withdrawal' ? 'text-red-600' : 'text-gray-300'}`}>
                            {transaction.type === 'withdrawal' ? formatCurrency(transaction.amount) : '—'}
                          </p>
                        </div>
                        <div className="col-span-2 text-right">
                          <p className={`font-semibold text-xs ${transaction.type === 'deposit' ? 'text-green-600' : 'text-gray-300'}`}>
                            {transaction.type === 'deposit' ? formatCurrency(transaction.amount) : '—'}
                          </p>
                        </div>
                        <div className="col-span-1 text-right">
                          <p className={`text-[10px] font-bold ${transaction.calculated_balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                            {formatCurrency(transaction.calculated_balance)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Totals Row */}
              <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-blue-50 rounded-b-lg font-bold border-t-2 border-blue-200 text-xs">
                <div className="col-span-2">TOTALS</div>
                <div className="col-span-5">({filteredTransactions.length} entries)</div>
                <div className="col-span-2 text-right text-red-600">
                  {formatCurrency(totalWithdrawals)}
                </div>
                <div className="col-span-2 text-right text-green-600">
                  {formatCurrency(totalDeposits)}
                </div>
                <div className="col-span-1 text-right">
                  {formatCurrency(totalDeposits - totalWithdrawals)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
