'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Receipt,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  BarChart3
} from 'lucide-react';

interface PaymentSummary {
  sales_order_id: string;
  customer_name: string;
  order_status: string;
  order_total: number;
  total_paid: number;
  payment_status: string;
  balance_due: number;
  payment_count: number;
  last_payment_date?: string;
  invoice_number?: string;
  invoice_status?: string;
}

interface FinanceMetrics {
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  overdueOrders: number;
  averageOrderValue: number;
  collectionRate: number;
}

export function SalesOrderPaymentDashboard() {
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance/sales-payment-summary');
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }

      const data = await response.json();
      setPayments(data.payments || []);
      setMetrics(data.metrics || null);
    } catch (error) {
      console.error('Error fetching payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      fully_paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      partial_paid: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      pending: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      advance_paid: { color: 'bg-blue-100 text-blue-800', icon: CreditCard },
      overdue: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    if (filter === 'pending') return payment.payment_status === 'pending';
    if (filter === 'partial') return payment.payment_status === 'partial_paid' || payment.payment_status === 'advance_paid';
    if (filter === 'paid') return payment.payment_status === 'fully_paid';
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                From {metrics.totalOrders} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalPaid)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.collectionRate.toFixed(1)}% collection rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground">
                From {metrics.pendingOrders} pending orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.averageOrderValue)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.paidOrders} fully paid orders
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Status Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Order Payments</CardTitle>
          <CardDescription>
            Track payment status and outstanding amounts for all sales orders
          </CardDescription>
          <div className="flex gap-2 mt-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={filter === 'partial' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('partial')}
            >
              Partial Paid
            </Button>
            <Button
              variant={filter === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('paid')}
            >
              Fully Paid
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payment records found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Order Total</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Balance Due</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Last Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.sales_order_id}>
                    <TableCell className="font-medium">
                      {payment.customer_name}
                    </TableCell>
                    <TableCell>
                      {payment.invoice_number ? (
                        <div>
                          <div className="font-mono text-sm">{payment.invoice_number}</div>
                          <Badge variant="outline" className="text-xs">
                            {payment.invoice_status?.toUpperCase()}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-gray-400">No invoice</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.order_total)}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(payment.total_paid)}
                    </TableCell>
                    <TableCell className={payment.balance_due > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(payment.balance_due)}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(payment.payment_status)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {payment.last_payment_date 
                        ? new Date(payment.last_payment_date).toLocaleDateString()
                        : 'No payments'
                      }
                      {payment.payment_count > 0 && (
                        <div className="text-xs text-gray-400">
                          {payment.payment_count} payment(s)
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
