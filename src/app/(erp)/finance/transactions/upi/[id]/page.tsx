'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Smartphone, ArrowUpCircle, ArrowDownCircle, Download, Filter, Link } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

interface UpiTransaction {
  id: string;
  payment_date?: string;
  date?: string;
  description?: string;
  amount: number;
  method: string;
  reference?: string;
  invoice_id?: string;
  customer_name?: string;
  transaction_type?: 'payment' | 'refund' | 'transfer';
}

interface UpiAccount {
  id: string;
  name: string;
  upi_id: string;
  current_balance: number;
  linked_bank_account_id?: string;
  linked_bank_name?: string;
  is_active: boolean;
}

export default function UpiAccountTransactions() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<UpiAccount | null>(null);
  const [transactions, setTransactions] = useState<UpiTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<UpiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAccountDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/finance/bank-accounts?type=UPI&id=${accountId}`);
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
      // Fetch UPI payment transactions
      const response = await fetch(`/api/finance/payment-transactions?upi_account_id=${accountId}&limit=500`);
      if (response.ok) {
        const result = await response.json();
        setTransactions(result.data || []);
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
        (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.invoice_id || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === filterType);
    }

    // Date filter
    const getTransactionDate = (transaction: UpiTransaction) => {
      return transaction.payment_date || transaction.date || '';
    };

    if (dateFrom) {
      filtered = filtered.filter(t => {
        const transactionDate = getTransactionDate(t);
        return transactionDate && new Date(transactionDate) >= new Date(dateFrom);
      });
    }
    if (dateTo) {
      filtered = filtered.filter(t => {
        const transactionDate = getTransactionDate(t);
        return transactionDate && new Date(transactionDate) <= new Date(dateTo);
      });
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, filterType, dateFrom, dateTo]);

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

  const getTransactionIcon = (transactionType?: string) => {
    if (transactionType === 'refund') {
      return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
    }
    return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
  };

  const getTransactionTypeBadge = (transactionType?: string) => {
    const typeMap = {
      'payment': { label: 'Payment', color: 'bg-green-100 text-green-800' },
      'refund': { label: 'Refund', color: 'bg-red-100 text-red-800' },
      'transfer': { label: 'Transfer', color: 'bg-blue-100 text-blue-800' }
    };
    
    const typeInfo = typeMap[(transactionType || 'payment') as keyof typeof typeMap] || 
      { label: transactionType || 'Payment', color: 'bg-gray-100 text-gray-800' };
    
    return (
      <Badge className={`text-xs ${typeInfo.color}`}>
        {typeInfo.label}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Description', 'Customer', 'Type', 'Amount', 'Reference', 'Invoice ID'].join(','),
      ...filteredTransactions.map(t => [
        new Date(t.payment_date || t.date || '').toLocaleDateString('en-IN'),
        `"${t.description || 'UPI Payment'}"`,
        `"${t.customer_name || 'N/A'}"`,
        t.transaction_type || 'payment',
        t.transaction_type === 'refund' ? -Math.abs(t.amount) : t.amount,
        `"${t.reference || 'N/A'}"`,
        `"${t.invoice_id || 'N/A'}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${account?.name || 'upi-account'}-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">Loading account details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Smartphone className="h-6 w-6 text-teal-600" />
              </div>
              {account.name} Transactions
            </h1>
            <p className="text-gray-600 mt-1 flex items-center gap-2">
              UPI ID: {account.upi_id}
              {account.linked_bank_name && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="flex items-center gap-1">
                    <Link className="h-3 w-3" />
                    Linked to {account.linked_bank_name}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Current Balance</p>
          <p className="text-2xl font-bold text-teal-600">
            {formatCurrency(account.current_balance)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
                <SelectItem value="transfer">Transfers</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="From Date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <Input
              type="date"
              placeholder="To Date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                      .filter(t => t.transaction_type !== 'refund')
                      .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500">Payments In</p>
                </div>
                <div className="text-center">
                  <p className="text-red-600 font-semibold">
                    -{formatCurrency(filteredTransactions
                      .filter(t => t.transaction_type === 'refund')
                      .reduce((sum, t) => sum + t.amount, 0)
                    )}
                  </p>
                  <p className="text-xs text-gray-500">Refunds Out</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-600 font-semibold">
                    {formatCurrency(filteredTransactions
                      .reduce((sum, t) => sum + (t.transaction_type === 'refund' ? -t.amount : t.amount), 0)
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No transactions found</p>
              <p className="text-sm">
                {transactions.length === 0 ? 
                  'This UPI account has no transaction history yet' : 
                  'Try adjusting your filters to see more transactions'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-full divide-y divide-gray-200">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-700">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-2">Customer</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-1 text-right">Invoice</div>
                </div>
                
                {/* Transactions */}
                {filteredTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors border-b"
                  >
                    <div className="col-span-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.transaction_type)}
                        <span>
                          {new Date(transaction.payment_date || transaction.date || '').toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="col-span-3">
                      <p className="font-medium text-gray-900">
                        {transaction.description || 'UPI Payment'}
                      </p>
                      {transaction.reference && (
                        <p className="text-xs text-gray-500 mt-1">
                          Ref: {transaction.reference}
                        </p>
                      )}
                    </div>
                    
                    <div className="col-span-2">
                      <p className="text-sm text-gray-900">
                        {transaction.customer_name || 'N/A'}
                      </p>
                    </div>
                    
                    <div className="col-span-2">
                      {getTransactionTypeBadge(transaction.transaction_type)}
                    </div>
                    
                    <div className="col-span-2 text-right">
                      <span className={`font-semibold ${
                        transaction.transaction_type === 'refund' 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {transaction.transaction_type === 'refund' ? '-' : '+'}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </span>
                    </div>
                    
                    <div className="col-span-1 text-right">
                      {transaction.invoice_id && (
                        <span className="text-xs text-gray-500">
                          {transaction.invoice_id}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}