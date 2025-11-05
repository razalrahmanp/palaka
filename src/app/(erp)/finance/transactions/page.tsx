'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Download, ArrowLeft, Banknote, CreditCard, Building2, Wallet, Receipt } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PaymentTransaction {
  id: string;
  invoice_id?: string;
  amount: number;
  payment_date?: string;
  date?: string;
  method: string;
  reference?: string;
  description?: string;
  bank_account_id?: string;
  bank_account_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
  invoice_total?: number;
  sales_order_id?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

const getPaymentMethodIcon = (method: string) => {
  switch (method.toLowerCase()) {
    case 'cash':
      return <Banknote className="h-4 w-4 text-green-600" />;
    case 'card':
    case 'credit_card':
    case 'debit_card':
      return <CreditCard className="h-4 w-4 text-blue-600" />;
    case 'bank_transfer':
      return <Building2 className="h-4 w-4 text-purple-600" />;
    case 'upi':
      return <Wallet className="h-4 w-4 text-orange-600" />;
    case 'cheque':
    case 'check':
      return <Receipt className="h-4 w-4 text-indigo-600" />;
    default:
      return <Banknote className="h-4 w-4 text-gray-600" />;
  }
};

const getPaymentMethodBadge = (method: string) => {
  const methodColors: { [key: string]: string } = {
    cash: 'bg-green-100 text-green-800',
    upi: 'bg-orange-100 text-orange-800',
    bank_transfer: 'bg-purple-100 text-purple-800',
    card: 'bg-blue-100 text-blue-800',
    cheque: 'bg-indigo-100 text-indigo-800',
  };

  const color = methodColors[method.toLowerCase()] || 'bg-gray-100 text-gray-800';
  
  return (
    <Badge className={color}>
      {method.replace('_', ' ').toUpperCase()}
    </Badge>
  );
};

const formatCurrency = (amount: number, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  if (!dateString || dateString === 'Invalid Date') return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};

export default function AllTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');

  useEffect(() => {
    fetchAllTransactions();
  }, []);

  const fetchAllTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance/payments');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const paymentNumber = transaction.id ? `PAY-${transaction.id.slice(0, 8)}` : '';
    const matchesSearch = 
      transaction.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMethod = filterMethod === 'all' || transaction.method === filterMethod;

    return matchesSearch && matchesMethod;
  });

  const paymentMethodSummary = [...new Set(transactions.map(t => t.method))].map(method => {
    const methodTransactions = transactions.filter(t => t.method === method);
    const methodTotal = methodTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    return {
      method,
      count: methodTransactions.length,
      total: methodTotal
    };
  });

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="p-6 space-y-6">
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
            <h1 className="text-3xl font-bold">All Payment Transactions</h1>
            <p className="text-muted-foreground">
              Complete view of all payments by method: Cash, UPI, Card, Cheque, Bank Transfer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards - Inline */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-6 overflow-x-auto">
            {/* Total Transactions */}
            <div className="flex flex-col min-w-[180px]">
              <span className="text-sm font-medium text-muted-foreground mb-1">Total Transactions</span>
              <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
              <span className="text-xs text-muted-foreground">{transactions.length} transactions</span>
            </div>
            
            {/* Payment Method Stats */}
            {paymentMethodSummary.map(({ method, count, total }) => (
              <div key={method} className="flex flex-col min-w-[150px] border-l-2 border-blue-500 pl-4">
                <div className="flex items-center gap-2 mb-1">
                  {getPaymentMethodIcon(method)}
                  <span className="text-sm font-medium">{method.replace('_', ' ').toUpperCase()}</span>
                </div>
                <span className="text-lg font-bold">{formatCurrency(total)}</span>
                <span className="text-xs text-muted-foreground">{count} transactions</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, payment number, reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={filterMethod} onValueChange={setFilterMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transactions ({filteredTransactions.length})
          </CardTitle>
          <CardDescription>
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading transactions...</div>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead className="w-[140px]">Payment #</TableHead>
                    <TableHead className="min-w-[150px]">Customer</TableHead>
                    <TableHead className="w-[130px]">Method</TableHead>
                    <TableHead className="w-[150px]">Reference</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="text-right w-[120px]">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">
                            {payment.date ? formatDate(payment.date) : 
                             payment.payment_date ? formatDate(payment.payment_date) : 
                             'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.id ? `PAY-${payment.id.slice(0, 8)}` : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.customer_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.method)}
                          {getPaymentMethodBadge(payment.method)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.reference || 'N/A'}
                      </TableCell>
                      <TableCell className="break-words">
                        {payment.description || 'Payment transaction'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
