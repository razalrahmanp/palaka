'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Banknote,
  Wallet,
  Receipt,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';

interface DaySheetTransaction {
  id: string;
  time: string;
  date: string;
  source: string;
  type: string;
  description: string;
  category: string;
  paymentMethod: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
  sourceId: string;
}

interface DaySheetSummary {
  date: string;
  totalReceipts: number;
  totalPayments: number;
  netCashFlow: number;
  transactionCount: number;
  byCategory: {
    operating: { receipts: number; payments: number; net: number };
    investing: { receipts: number; payments: number; net: number };
    financing: { receipts: number; payments: number; net: number };
  };
  byPaymentMethod: Record<string, number>;
}

export default function DaySheetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    try {
      return format(new Date(), 'yyyy-MM-dd');
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });
  const [transactions, setTransactions] = useState<DaySheetTransaction[]>([]);
  const [summary, setSummary] = useState<DaySheetSummary | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  useEffect(() => {
    // Only fetch if selectedDate is a valid complete date (YYYY-MM-DD format)
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      fetchDaySheet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const fetchDaySheet = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/finance/day-sheet?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setSummary(data.summary || null);
      } else {
        console.error('Failed to fetch day sheet');
        setTransactions([]);
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching day sheet:', error);
      setTransactions([]);
      setSummary(null);
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

  // Filter transactions
  const filteredTransactions = transactions.filter(tx => {
    if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
    if (paymentMethodFilter !== 'all' && tx.paymentMethod !== paymentMethodFilter) return false;
    return true;
  });

  const totalDebits = summary?.totalReceipts || 0;
  const totalCredits = summary?.totalPayments || 0;
  const netCashFlow = summary?.netCashFlow || 0;

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <Banknote className="h-4 w-4 text-green-600" />;
      case 'bank':
      case 'bank_transfer':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'card':
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="h-4 w-4 text-purple-600" />;
      case 'upi':
        return <Wallet className="h-4 w-4 text-orange-600" />;
      default:
        return <Receipt className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading day sheet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-6 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/reports')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Day Sheet Report</h1>
              <p className="text-xs text-gray-600">Daily transaction summary and cash flow</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600">Total Receipts</p>
                  <p className="text-xl font-bold text-green-900">{formatCurrency(totalDebits)}</p>
                  <p className="text-[10px] text-green-600">Cash In • {summary?.transactionCount || 0} transactions</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600">Total Payments</p>
                  <p className="text-xl font-bold text-red-900">{formatCurrency(totalCredits)}</p>
                  <p className="text-[10px] text-red-600">Cash Out</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${netCashFlow >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    Net Cash Flow
                  </p>
                  <p className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                    {formatCurrency(netCashFlow)}
                  </p>
                  <p className={`text-[10px] ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
                  </p>
                </div>
                <DollarSign className={`h-8 w-8 opacity-50 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-medium">Operating Activities</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Receipts:</span>
                    <span className="font-mono text-green-600">{formatCurrency(summary.byCategory.operating.receipts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payments:</span>
                    <span className="font-mono text-red-600">{formatCurrency(summary.byCategory.operating.payments)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <span>Net:</span>
                    <span className={`font-mono ${summary.byCategory.operating.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.byCategory.operating.net)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-medium">Investing Activities</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Receipts:</span>
                    <span className="font-mono text-green-600">{formatCurrency(summary.byCategory.investing.receipts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payments:</span>
                    <span className="font-mono text-red-600">{formatCurrency(summary.byCategory.investing.payments)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <span>Net:</span>
                    <span className={`font-mono ${summary.byCategory.investing.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.byCategory.investing.net)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-medium">Financing Activities</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Receipts:</span>
                    <span className="font-mono text-green-600">{formatCurrency(summary.byCategory.financing.receipts)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payments:</span>
                    <span className="font-mono text-red-600">{formatCurrency(summary.byCategory.financing.payments)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <span>Net:</span>
                    <span className={`font-mono ${summary.byCategory.financing.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(summary.byCategory.financing.net)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CardTitle>Daily Transactions - {selectedDate ? format(parseISO(selectedDate), 'MMMM dd, yyyy') : 'Loading...'}</CardTitle>
                <Badge variant="outline">{filteredTransactions.length} Transactions</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
                      fetchDaySheet();
                    }
                  }}
                  className="w-40 h-8"
                />
                <Button variant="outline" size="sm" onClick={fetchDaySheet} className="gap-1 h-8">
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" className="gap-1 h-8">
                  <Download className="h-3 w-3" />
                  Export
                </Button>
                <Button variant="outline" size="sm" className="gap-1 h-8">
                  <Printer className="h-3 w-3" />
                  Print
                </Button>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36 h-8">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Operating">Operating</SelectItem>
                    <SelectItem value="Investing">Investing</SelectItem>
                    <SelectItem value="Financing">Financing</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead className="w-36">Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-28">Category</TableHead>
                    <TableHead className="w-28">Method</TableHead>
                    <TableHead className="text-right w-32">Debit (₹)</TableHead>
                    <TableHead className="text-right w-32">Credit (₹)</TableHead>
                    <TableHead className="text-right w-32">Balance (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-medium">No transactions for this date</p>
                        <p className="text-sm mt-1">Select a different date to view transactions</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm">{transaction.date || transaction.time}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="truncate" title={transaction.description}>
                              {transaction.description}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{transaction.reference}</div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                transaction.category === 'Operating' ? 'bg-blue-50 text-blue-700' :
                                transaction.category === 'Investing' ? 'bg-purple-50 text-purple-700' :
                                'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {transaction.category}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {getPaymentMethodIcon(transaction.paymentMethod)}
                              <span className="text-xs capitalize">{transaction.paymentMethod.replace('_', ' ')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            <span className={transaction.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(transaction.balance)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-blue-50 font-bold border-t-2">
                        <TableCell colSpan={5} className="text-right font-bold">
                          DAILY TOTALS
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600 font-bold">
                          {formatCurrency(totalDebits)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600 font-bold">
                          {formatCurrency(totalCredits)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-lg">
                          <span className={netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(netCashFlow)}
                          </span>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>



    </div>
  );
}
