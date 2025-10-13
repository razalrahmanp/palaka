'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  ArrowLeft,
  FileText,
  Loader2,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react';

interface LedgerDetail {
  id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  total_transactions: number;
  total_amount: number;
  debit: number;
  credit: number;
  balance_due: number;
  status?: string;
  opening_balance?: number;
  last_transaction_date?: string;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  reference_number?: string;
  transaction_type: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  source_document?: string;
  status?: string;
}

interface VendorBill {
  id: string;
  bill_number: string;
  bill_date: string;
  total_amount: number;
  remaining_amount: number;
  status: string;
  created_at: string;
}

interface VendorPayment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  status?: string;
  created_at: string;
}

interface DetailedLedgerViewProps {
  ledgerId: string;
  ledgerType: string;
}

export function DetailedLedgerView({ ledgerId, ledgerType }: DetailedLedgerViewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [ledgerDetail, setLedgerDetail] = useState<LedgerDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchLedgerDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerId, ledgerType]);

  const fetchLedgerDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch ledger summary
      const summaryResponse = await fetch(
        `/api/finance/ledgers-summary?type=${ledgerType}&search=&page=1&limit=1000&hideZeroBalances=false`
      );
      
      if (!summaryResponse.ok) throw new Error('Failed to fetch ledger');
      
      const summaryData = await summaryResponse.json();
      const ledger = summaryData.data?.find((l: LedgerDetail) => l.id.toString() === ledgerId);
      
      if (ledger) {
        setLedgerDetail(ledger);
      }

      // Fetch real transactions based on ledger type
      let fetchedTransactions: Transaction[] = [];
      
      if (ledgerType === 'supplier') {
        fetchedTransactions = await fetchSupplierTransactions(ledgerId);
      } else {
        // For other types, use mock data for now
        fetchedTransactions = generateMockTransactions(ledger);
      }
      
      setTransactions(fetchedTransactions);
      
    } catch (error) {
      console.error('Error fetching ledger details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierTransactions = async (supplierId: string): Promise<Transaction[]> => {
    try {
      // Fetch vendor bills for this supplier
      const billsResponse = await fetch(`/api/finance/vendor-bills?supplier_id=${supplierId}`);
      const billsData = await billsResponse.json();
      
      // Fetch vendor payment history for this supplier
      const paymentsResponse = await fetch(`/api/finance/vendor-payments?supplier_id=${supplierId}`);
      const paymentsData = await paymentsResponse.json();
      
      const transactions: Transaction[] = [];
      
      // Add vendor bills as debit transactions
      if (billsData.success && billsData.data) {
        billsData.data.forEach((bill: VendorBill) => {
          transactions.push({
            id: `bill-${bill.id}`,
            date: bill.bill_date || bill.created_at,
            description: `Vendor Bill - ${bill.bill_number || 'N/A'}`,
            reference_number: bill.bill_number,
            transaction_type: 'Vendor Bill',
            debit_amount: bill.total_amount || 0,
            credit_amount: 0,
            running_balance: 0, // Will be calculated
            source_document: `Bill #${bill.bill_number}`,
            status: bill.status || 'pending'
          });
        });
      }
      
      // Add vendor payments as credit transactions
      if (paymentsData.success && paymentsData.data) {
        paymentsData.data.forEach((payment: VendorPayment) => {
          transactions.push({
            id: `payment-${payment.id}`,
            date: payment.payment_date || payment.created_at,
            description: `Payment Made - ${payment.payment_method || 'N/A'}`,
            reference_number: payment.reference_number || '',
            transaction_type: 'Payment',
            debit_amount: 0,
            credit_amount: payment.amount || 0,
            running_balance: 0, // Will be calculated
            source_document: payment.notes || 'Payment',
            status: payment.status || 'completed'
          });
        });
      }
      
      // Sort chronologically
      transactions.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Calculate running balances
      let runningBalance = 0;
      const transactionsWithBalance = transactions.map(txn => {
        runningBalance += txn.debit_amount - txn.credit_amount;
        return {
          ...txn,
          running_balance: runningBalance
        };
      });
      
      // Return in reverse chronological order (newest first)
      return transactionsWithBalance.reverse();
      
    } catch (error) {
      console.error('Error fetching supplier transactions:', error);
      return [];
    }
  };

  const generateMockTransactions = (ledger: LedgerDetail | undefined): Transaction[] => {
    if (!ledger) return [];
    
    // Generate transaction entries in chronological order first
    const sampleCount = Math.min(ledger.total_transactions, 10);
    const chronologicalTransactions: Omit<Transaction, 'running_balance'>[] = [];
    
    // Add opening balance entry
    if (ledger.opening_balance && ledger.opening_balance !== 0) {
      chronologicalTransactions.push({
        id: 'opening',
        date: '2025-01-01',
        description: 'Opening Balance',
        transaction_type: 'Opening',
        debit_amount: ledger.opening_balance > 0 ? ledger.opening_balance : 0,
        credit_amount: ledger.opening_balance < 0 ? Math.abs(ledger.opening_balance) : 0,
        status: 'completed'
      });
    }
    
    // Generate transactions
    for (let i = 0; i < sampleCount; i++) {
      const isDebit = i % 2 === 0;
      const amount = Math.random() * 50000 + 10000;
      
      chronologicalTransactions.push({
        id: `txn-${i}`,
        date: new Date(2025, 0, 5 + i * 3).toISOString().split('T')[0],
        description: getDescriptionByType(ledgerType, isDebit),
        reference_number: `REF-${1000 + i}`,
        transaction_type: isDebit ? 'Invoice' : 'Payment',
        debit_amount: isDebit ? amount : 0,
        credit_amount: isDebit ? 0 : amount,
        status: 'completed'
      });
    }

    // Calculate running balance in chronological order
    let runningBalance = ledger.opening_balance || 0;
    const transactionsWithBalance = chronologicalTransactions.map(txn => {
      if (txn.id === 'opening') {
        return {
          ...txn,
          running_balance: runningBalance
        };
      }
      
      // Calculate running balance
      runningBalance = runningBalance + txn.debit_amount - txn.credit_amount;
      
      return {
        ...txn,
        running_balance: runningBalance
      };
    });

    // Return in reverse chronological order (most recent first)
    return transactionsWithBalance.reverse();
  };

  const getDescriptionByType = (type: string, isDebit: boolean): string => {
    const descriptions: Record<string, { debit: string; credit: string }> = {
      customer: { debit: 'Sales Invoice', credit: 'Payment Received' },
      supplier: { debit: 'Vendor Bill', credit: 'Payment Made' },
      employee: { debit: 'Salary/Expense', credit: 'Adjustment' },
      bank: { debit: 'Deposit', credit: 'Withdrawal' },
      investors: { debit: 'Investment', credit: 'Withdrawal' },
      loans: { debit: 'Loan Disbursement', credit: 'Loan Repayment' },
      sales_returns: { debit: 'Return Adjustment', credit: 'Sales Return' },
      purchase_returns: { debit: 'Purchase Return', credit: 'Return Adjustment' }
    };

    return isDebit 
      ? descriptions[type]?.debit || 'Debit Entry'
      : descriptions[type]?.credit || 'Credit Entry';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status?: string) => {
    const statusColors: Record<string, string> = {
      completed: 'bg-green-100 text-green-800 border-green-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    };
    
    const color = statusColors[status || 'completed'] || statusColors.completed;
    return <Badge className={color}>{status || 'Completed'}</Badge>;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Export to CSV
    const csv = [
      ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance', 'Status'],
      ...transactions.map(txn => [
        txn.date,
        txn.description,
        txn.reference_number || '',
        txn.debit_amount.toString(),
        txn.credit_amount.toString(),
        txn.running_balance.toString(),
        txn.status || 'completed'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${ledgerId}_${new Date().toISOString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600 text-lg">Loading ledger details...</span>
      </div>
    );
  }

  if (!ledgerDetail) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <FileText className="h-24 w-24 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-700 mb-2">Ledger Not Found</h2>
        <p className="text-gray-500 mb-6">The requested ledger could not be found.</p>
        <Button onClick={() => router.push('/ledgers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ledgers
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.push('/ledgers')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ledgers
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              {ledgerDetail.name}
            </h1>
            <p className="text-gray-600 mt-1">
              {ledgerType.charAt(0).toUpperCase() + ledgerType.slice(1)} Ledger - Detailed View
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">
                  {ledgerType === 'supplier' ? 'Total Bills' : 'Total Debit'}
                </p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(ledgerDetail.debit || ledgerDetail.total_amount)}
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">
                  {ledgerType === 'supplier' ? 'Total Payments' : 'Total Credit'}
                </p>
                <p className="text-2xl font-bold text-red-900">
                  {formatCurrency(ledgerDetail.credit || 0)}
                </p>
              </div>
              <TrendingDown className="h-10 w-10 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  {ledgerType === 'supplier' ? 'Amount Due' : 'Current Balance'}
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(ledgerDetail.balance_due)}
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Transactions</p>
                <p className="text-2xl font-bold text-purple-900">
                  {ledgerDetail.total_transactions}
                </p>
              </div>
              <FileText className="h-10 w-10 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Account ID</p>
              <p className="font-semibold">{ledgerDetail.id}</p>
            </div>
            {ledgerDetail.email && (
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold">{ledgerDetail.email}</p>
              </div>
            )}
            {ledgerDetail.phone && (
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold">{ledgerDetail.phone}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="mt-1">{getStatusBadge(ledgerDetail.status)}</div>
            </div>
            {ledgerDetail.last_transaction_date && (
              <div>
                <p className="text-sm text-gray-600">Last Transaction</p>
                <p className="font-semibold">{formatDate(ledgerDetail.last_transaction_date)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Transaction History
            </CardTitle>
            <p className="text-sm text-gray-500">Showing most recent transactions first</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Debit (₹)</TableHead>
                  <TableHead className="text-right">Credit (₹)</TableHead>
                  <TableHead className="text-right">Balance (₹)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((txn) => (
                    <TableRow key={txn.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {formatDate(txn.date)}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{txn.description}</p>
                        {txn.source_document && (
                          <p className="text-xs text-gray-500">{txn.source_document}</p>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {txn.reference_number || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-700 font-semibold">
                        {txn.debit_amount > 0 ? formatCurrency(txn.debit_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-700 font-semibold">
                        {txn.credit_amount > 0 ? formatCurrency(txn.credit_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-blue-900">
                        {formatCurrency(txn.running_balance)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(txn.status)}
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
