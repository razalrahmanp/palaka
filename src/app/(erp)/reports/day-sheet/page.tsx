'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface DaySheetTransaction {
  id: string;
  time: string;
  type: string;
  description: string;
  category: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function DaySheetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transactions, setTransactions] = useState<DaySheetTransaction[]>([]);

  useEffect(() => {
    fetchDaySheet();
  }, [selectedDate]);

  const fetchDaySheet = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint for day sheet
      // This is a placeholder - you'll need to create the actual API
      const response = await fetch(`/api/finance/day-sheet?date=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching day sheet:', error);
      // For now, use empty data
      setTransactions([]);
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

  const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0);
  const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0);
  const netCashFlow = totalDebits - totalCredits;

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
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl font-bold text-gray-900">Day Sheet Report</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Daily transaction summary and cash flow
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
              <Button variant="outline" size="sm" onClick={fetchDaySheet} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Receipts</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(totalDebits)}</p>
                  <p className="text-xs text-green-600 mt-1">Cash In</p>
                </div>
                <TrendingUp className="h-10 w-10 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600">Total Payments</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{formatCurrency(totalCredits)}</p>
                  <p className="text-xs text-red-600 mt-1">Cash Out</p>
                </div>
                <TrendingDown className="h-10 w-10 text-red-600 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${netCashFlow >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    Net Cash Flow
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${netCashFlow >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                    {formatCurrency(netCashFlow)}
                  </p>
                  <p className={`text-xs mt-1 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
                  </p>
                </div>
                <DollarSign className={`h-10 w-10 opacity-50 ${netCashFlow >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Daily Transactions - {format(new Date(selectedDate), 'MMMM dd, yyyy')}</CardTitle>
              <Badge variant="outline">{transactions.length} Transactions</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-24">Time</TableHead>
                    <TableHead className="w-32">Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-40">Category</TableHead>
                    <TableHead className="text-right w-32">Debit (₹)</TableHead>
                    <TableHead className="text-right w-32">Credit (₹)</TableHead>
                    <TableHead className="text-right w-32">Balance (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="font-medium">No transactions for this date</p>
                        <p className="text-sm mt-1">Select a different date to view transactions</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-sm">{transaction.time}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{transaction.description}</TableCell>
                          <TableCell className="text-sm text-gray-600">{transaction.category}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {transaction.debit > 0 ? formatCurrency(transaction.debit) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-red-600">
                            {transaction.credit > 0 ? formatCurrency(transaction.credit) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(transaction.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-blue-50 font-bold border-t-2">
                        <TableCell colSpan={4} className="text-right font-bold">
                          DAILY TOTALS
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-600 font-bold">
                          {formatCurrency(totalDebits)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-red-600 font-bold">
                          {formatCurrency(totalCredits)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-lg">
                          {formatCurrency(netCashFlow)}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Note about API */}
        {transactions.length === 0 && !loading && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The Day Sheet API endpoint needs to be implemented. 
                Create <code className="bg-yellow-100 px-1 py-0.5 rounded">/api/finance/day-sheet</code> to fetch daily transactions.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
