'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, 
  CreditCard, 
  DollarSign, 
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Banknote
} from 'lucide-react';

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_type: string;
  reference_number?: string;
  bank_name?: string;
  cheque_number?: string;
  upi_transaction_id?: string;
  card_last_four?: string;
  payment_gateway_reference?: string;
  notes?: string;
  status: string;
  created_at: string;
  users?: { name: string };
}

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

interface SalesOrderPaymentManagerProps {
  orderId: string;
  orderTotal: number;
  onPaymentAdded?: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'online', label: 'Online Payment' },
  { value: 'other', label: 'Other' }
];

const PAYMENT_TYPES = [
  { value: 'advance', label: 'Advance Payment' },
  { value: 'partial', label: 'Partial Payment' },
  { value: 'full', label: 'Full Payment' },
  { value: 'refund', label: 'Refund' }
];

export function SalesOrderPaymentManager({ 
  orderId, 
  onPaymentAdded
}: Omit<SalesOrderPaymentManagerProps, 'orderTotal'>) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: '',
    payment_type: 'advance',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    bank_name: '',
    cheque_number: '',
    upi_transaction_id: '',
    card_last_four: '',
    payment_gateway_reference: '',
    notes: ''
  });

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sales/orders/${orderId}/payments`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }

      const data = await response.json();
      setPayments(data.payments || []);
      setSummary(data.summary);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleAddPayment = async () => {
    try {
      setIsAddingPayment(true);

      const response = await fetch(`/api/sales/orders/${orderId}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: formData.amount,
          method: formData.payment_method,
          payment_date: formData.payment_date,
          reference: formData.reference_number,
          created_by: 'current-user-id', // Replace with actual user ID
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add payment');
      }

      const newPayment = await response.json();
      setPayments([newPayment, ...payments]);
      
      // Reset form
      setFormData({
        amount: '',
        payment_method: '',
        payment_type: 'advance',
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        bank_name: '',
        cheque_number: '',
        upi_transaction_id: '',
        card_last_four: '',
        payment_gateway_reference: '',
        notes: ''
      });

      setShowAddDialog(false);
      fetchPayments(); // Refresh to get updated summary
      onPaymentAdded?.();
    } catch (error) {
      console.error('Error adding payment:', error);
    } finally {
      setIsAddingPayment(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      failed: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
      refunded: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle }
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      case 'upi':
      case 'online':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading payment information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Information
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Payment</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount*</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment_date">Payment Date*</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment_method">Payment Method*</Label>
                    <Select 
                      value={formData.payment_method} 
                      onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payment_type">Payment Type</Label>
                    <Select 
                      value={formData.payment_type} 
                      onValueChange={(value) => setFormData({ ...formData, payment_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="Transaction/Reference number"
                  />
                </div>

                {formData.payment_method === 'bank_transfer' && (
                  <div>
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      placeholder="Bank name"
                    />
                  </div>
                )}

                {formData.payment_method === 'cheque' && (
                  <div>
                    <Label htmlFor="cheque_number">Cheque Number</Label>
                    <Input
                      id="cheque_number"
                      value={formData.cheque_number}
                      onChange={(e) => setFormData({ ...formData, cheque_number: e.target.value })}
                      placeholder="Cheque number"
                    />
                  </div>
                )}

                {formData.payment_method === 'upi' && (
                  <div>
                    <Label htmlFor="upi_transaction_id">UPI Transaction ID</Label>
                    <Input
                      id="upi_transaction_id"
                      value={formData.upi_transaction_id}
                      onChange={(e) => setFormData({ ...formData, upi_transaction_id: e.target.value })}
                      placeholder="UPI transaction ID"
                    />
                  </div>
                )}

                {(formData.payment_method === 'card' || formData.payment_method === 'credit_card' || formData.payment_method === 'debit_card') && (
                  <div>
                    <Label htmlFor="card_last_four">Card Last 4 Digits</Label>
                    <Input
                      id="card_last_four"
                      value={formData.card_last_four}
                      onChange={(e) => setFormData({ ...formData, card_last_four: e.target.value })}
                      placeholder="Last 4 digits"
                      maxLength={4}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    disabled={isAddingPayment}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddPayment}
                    disabled={isAddingPayment || !formData.amount || !formData.payment_method}
                  >
                    {isAddingPayment ? 'Adding...' : 'Add Payment'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Payment Summary */}
        {summary && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Order Total</div>
                <div className="text-lg font-semibold">{formatCurrency(summary.order_total || 0)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Paid</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(summary.total_paid || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Balance Due</div>
                <div className={`text-lg font-semibold ${
                  (summary.balance_due || 0) > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatCurrency(summary.balance_due || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Payment Status</div>
                <div className="mt-1">
                  <Badge variant={summary.payment_status === 'fully_paid' ? 'default' : 'secondary'}>
                    {summary.payment_status?.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>

            {summary.invoice_number && (
              <div className="mt-3 pt-3 border-t flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm text-gray-600">Invoice:</span>
                  <span className="font-medium">{summary.invoice_number}</span>
                </div>
                <Badge variant="outline">
                  {summary.invoice_status?.toUpperCase()}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Payment History */}
        <div>
          <h4 className="text-lg font-medium mb-4">Payment History</h4>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payments recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(payment.payment_method)}
                        <span className="capitalize">
                          {payment.payment_method.replace('_', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.payment_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {payment.reference_number || 
                       payment.upi_transaction_id || 
                       payment.cheque_number || 
                       (payment.card_last_four && `****${payment.card_last_four}`) ||
                       '-'}
                    </TableCell>
                    <TableCell>
                      {getPaymentStatusBadge(payment.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
