'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Banknote, CreditCard, Building2, Wallet, Receipt, Download } from 'lucide-react';
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
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);

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

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Payment #', 'Customer', 'Method', 'Reference', 'Description', 'Amount'].join(','),
      ...filteredTransactions.map(p => [
        p.date || p.payment_date || 'N/A',
        `PAY-${p.id.slice(0, 8)}`,
        `"${p.customer_name || 'N/A'}"`,
        p.method,
        `"${p.reference || 'N/A'}"`,
        `"${p.description || 'Payment transaction'}"`,
        p.amount
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

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
                      <Receipt className="h-5 w-5" />
                      All Payment Transactions
                    </h1>
                    <p className="text-xs text-white/80">Complete view of all payments by method</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/80">Total Payments</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
                  <p className="text-xs text-white/80">{transactions.length} transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {paymentMethodSummary.map(({ method, count, total }) => (
              <Card key={method} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {getPaymentMethodIcon(method)}
                    <span className="text-xs font-bold text-gray-700">{method.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(total)}</p>
                  <p className="text-[10px] text-gray-500">{count} transactions</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="cursor-pointer py-3 px-4" onClick={() => setIsFilterExpanded(!isFilterExpanded)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    placeholder="Search by customer, payment number, reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-md h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <Select value={filterMethod} onValueChange={setFilterMethod}>
                    <SelectTrigger className="w-36 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                      <SelectValue placeholder="Method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="bajaj">Bajaj</SelectItem>
                    </SelectContent>
                  </Select>

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
                  
                  <span className="text-xs text-gray-600 ml-auto">
                    {filteredTransactions.length} of {transactions.length} entries
                  </span>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading transactions...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No transactions found</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-indigo-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Date</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Payment #</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Customer</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Method</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Reference</th>
                        <th className="px-3 py-2 text-left text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Description</th>
                        <th className="px-3 py-2 text-right text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTransactions.map((payment) => (
                        <tr key={payment.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="text-[11px] text-gray-600">
                              {payment.date ? formatDate(payment.date) : 
                               payment.payment_date ? formatDate(payment.payment_date) : 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="text-[11px] font-mono text-gray-700">
                              {payment.id ? `PAY-${payment.id.slice(0, 8)}` : 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[11px] font-medium text-gray-900">
                              {payment.customer_name || 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {getPaymentMethodIcon(payment.method)}
                              {getPaymentMethodBadge(payment.method)}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[11px] font-mono text-gray-600">
                              {payment.reference || 'N/A'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[11px] text-gray-700 truncate max-w-xs block">
                              {payment.description || 'Payment transaction'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-[11px] font-bold text-green-600">
                              {payment.amount.toLocaleString('en-IN', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-300">
                      <tr className="font-bold">
                        <td colSpan={6} className="px-3 py-2 text-[11px] text-indigo-900">
                          TOTAL ({filteredTransactions.length} entries)
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] text-green-700">
                          {filteredTransactions
                            .reduce((sum, p) => sum + p.amount, 0)
                            .toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
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
