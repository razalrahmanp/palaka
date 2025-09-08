'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  DollarSign, 
  Calendar,
  User,
  FileText,
  History,
  Plus,
  CheckCircle,
  AlertCircle,
  Building2,
  Smartphone
} from 'lucide-react';
import { Invoice, Payment } from '@/types';
import { toast } from 'sonner';

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  current_balance: number;
  currency: string;
  account_type?: 'BANK' | 'UPI';
  upi_id?: string;
  linked_bank_account_id?: string;
  is_active?: boolean;
}

interface UpiAccount {
  id: string;
  name: string;
  upi_id: string;
  current_balance: number;
  linked_bank_account_id: string | null;
  is_active: boolean;
}

interface CashAccount {
  id: string;
  name: string;
  current_balance: number;
  currency: string;
  is_active: boolean;
}

interface PaymentTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export function PaymentTrackingDialog({ 
  open, 
  onOpenChange, 
  invoice, 
  onSuccess 
}: PaymentTrackingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [upiAccounts, setUpiAccounts] = useState<UpiAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    method: 'cash' as 'cash' | 'card' | 'bank_transfer' | 'check' | 'upi',
    bank_account_id: '',
    upi_account_id: '',
    cash_account_id: '',
    reference: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchPaymentHistory = useCallback(async () => {
    if (!invoice) return;
    
    try {
      const response = await fetch(`/api/finance/payments?invoice_id=${invoice.id}`);
      if (response.ok) {
        const payments = await response.json();
        setPaymentHistory(payments);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  }, [invoice]);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts?type=BANK');
      if (response.ok) {
        const result = await response.json();
        setBankAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  }, []);

  const fetchUpiAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts?type=UPI');
      if (response.ok) {
        const result = await response.json();
        setUpiAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching UPI accounts:', error);
    }
  }, []);

  const fetchCashAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts?type=CASH');
      if (response.ok) {
        const result = await response.json();
        setCashAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching cash accounts:', error);
    }
  }, []);

  useEffect(() => {
    if (open && (bankAccounts.length === 0 || upiAccounts.length === 0 || cashAccounts.length === 0)) {
      fetchBankAccounts();
      fetchUpiAccounts();
      fetchCashAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (invoice && open) {
      fetchPaymentHistory();
      const remainingAmount = invoice.total - invoice.paid_amount;
      setPaymentData(prev => ({
        ...prev,
        amount: remainingAmount,
        notes: `Payment for Invoice ${invoice.id.slice(0, 8)}`
      }));
    }
  }, [invoice, open, fetchPaymentHistory]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    setLoading(true);
    try {
      // First, record the payment
      const response = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          customer_id: invoice.customer_id,
          customer_name: invoice.customer_name,
          amount: paymentData.amount,
          method: paymentData.method,
          reference: paymentData.reference,
          notes: paymentData.notes,
          date: paymentData.date,
          bank_account_id: paymentData.bank_account_id || null,
          upi_account_id: paymentData.upi_account_id || null
        }),
      });

      if (response.ok) {
        // If payment method involves a bank account, create bank transaction
        if (paymentData.bank_account_id && ['bank_transfer', 'check'].includes(paymentData.method)) {
          try {
            await fetch('/api/finance/bank_accounts/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bank_account_id: paymentData.bank_account_id,
                type: 'credit', // Payment received
                amount: paymentData.amount,
                description: `Payment received for Invoice ${invoice.id.slice(0, 8)} - ${paymentData.method}`,
                reference: paymentData.reference || `INV-${invoice.id.slice(0, 8)}`,
                transaction_date: paymentData.date
              })
            });
          } catch (bankError) {
            console.warn('Bank transaction creation failed:', bankError);
            // Don't fail the payment if bank transaction fails
          }
        }

        // If payment method is UPI, create UPI transaction and linked bank transaction
        if (paymentData.upi_account_id && paymentData.method === 'upi') {
          try {
            // Create UPI account transaction
            await fetch('/api/finance/bank_accounts/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bank_account_id: paymentData.upi_account_id,
                type: 'credit', // Payment received
                amount: paymentData.amount,
                description: `UPI Payment received for Invoice ${invoice.id.slice(0, 8)}`,
                reference: paymentData.reference || `INV-${invoice.id.slice(0, 8)}`,
                transaction_date: paymentData.date
              })
            });

            // Find the UPI account and check if it has a linked bank account
            const upiAccount = upiAccounts.find(acc => acc.id === paymentData.upi_account_id);
            if (upiAccount?.linked_bank_account_id) {
              // Create corresponding bank account transaction
              await fetch('/api/finance/bank_accounts/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  bank_account_id: upiAccount.linked_bank_account_id,
                  type: 'credit', // Deposit from UPI
                  amount: paymentData.amount,
                  description: `UPI Transfer from ${upiAccount.name} for Invoice ${invoice.id.slice(0, 8)}`,
                  reference: `UPI-${paymentData.reference || invoice.id.slice(0, 8)}`,
                  transaction_date: paymentData.date
                })
              });
            }
          } catch (upiError) {
            console.warn('UPI transaction creation failed:', upiError);
            // Don't fail the payment if UPI transaction fails
          }
        }

        toast.success('Payment recorded successfully');
        fetchPaymentHistory();
        onSuccess();
        setShowAddPayment(false);
        
        // Reset form
        setPaymentData({
          amount: 0,
          method: 'cash',
          bank_account_id: '',
          upi_account_id: '',
          cash_account_id: '',
          reference: '',
          notes: '',
          date: new Date().toISOString().split('T')[0]
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      cash: 'bg-green-100 text-green-800',
      card: 'bg-blue-100 text-blue-800',
      bank_transfer: 'bg-purple-100 text-purple-800',
      check: 'bg-orange-100 text-orange-800',
      upi: 'bg-indigo-100 text-indigo-800'
    };
    
    return (
      <Badge className={colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {method.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (!invoice) return null;

  const remainingAmount = invoice.total - invoice.paid_amount;
  const paymentProgress = (invoice.paid_amount / invoice.total) * 100;
  const requiresBankAccount = ['bank_transfer', 'check', 'card'].includes(paymentData.method);
  const requiresUpiAccount = paymentData.method === 'upi';
  const requiresCashAccount = paymentData.method === 'cash';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Tracking - Invoice {invoice.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Invoice Details</span>
                  </div>
                  <p className="text-sm text-gray-600">Invoice ID: {invoice.id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-600">Date: {formatDate(invoice.created_at)}</p>
                  <p className="text-sm text-gray-600">
                    Status: <Badge className={
                      invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                      invoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>{invoice.status.replace('_', ' ')}</Badge>
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Customer</span>
                  </div>
                  <p className="text-sm text-gray-600">{invoice.customer_name}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Payment Progress</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{paymentProgress.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(paymentProgress, 100)} className="w-full" />
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">Total Amount</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(invoice.total)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-sm">Paid Amount</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(invoice.paid_amount)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-sm">Remaining</span>
                  </div>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(remainingAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Payment History
                </div>
                {remainingAmount > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setShowAddPayment(!showAddPayment)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Payment
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showAddPayment && remainingAmount > 0 && (
                <Card className="mb-4 border-dashed">
                  <CardContent className="p-4">
                    <form onSubmit={handleAddPayment} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="amount">Payment Amount</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            max={remainingAmount}
                            value={paymentData.amount}
                            onChange={(e) => setPaymentData(prev => ({ 
                              ...prev, 
                              amount: parseFloat(e.target.value) || 0 
                            }))}
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Maximum: {formatCurrency(remainingAmount)}
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="method">Payment Method</Label>
                          <Select
                            value={paymentData.method}
                            onValueChange={(value: "cash" | "card" | "bank_transfer" | "check" | "upi") => setPaymentData(prev => ({ 
                              ...prev, 
                              method: value,
                              // Reset bank account when method changes
                              bank_account_id: ['bank_transfer', 'check', 'card'].includes(value) ? prev.bank_account_id : '',
                              // Reset UPI account when method changes
                              upi_account_id: value === 'upi' ? prev.upi_account_id : '',
                              // Reset cash account when method changes
                              cash_account_id: value === 'cash' ? prev.cash_account_id : ''
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="check">Check</SelectItem>
                              <SelectItem value="upi">UPI</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Bank Account Selection - only show for bank transfer and check */}
                      {requiresBankAccount && (
                        <div>
                          <Label htmlFor="bank_account_id">Bank Account *</Label>
                          <Select
                            value={paymentData.bank_account_id}
                            onValueChange={(value: string) => setPaymentData(prev => ({ 
                              ...prev, 
                              bank_account_id: value 
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select bank account" />
                            </SelectTrigger>
                            <SelectContent>
                              {bankAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    <span>{account.name}</span>
                                    {account.account_number && (
                                      <span className="text-gray-500 text-xs">
                                        (****{account.account_number.slice(-4)})
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* UPI Account Selection - only show for UPI */}
                      {requiresUpiAccount && (
                        <div>
                          <Label htmlFor="upi_account_id">UPI Account *</Label>
                          <Select
                            value={paymentData.upi_account_id}
                            onValueChange={(value: string) => setPaymentData(prev => ({ 
                              ...prev, 
                              upi_account_id: value 
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select UPI account" />
                            </SelectTrigger>
                            <SelectContent>
                              {upiAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex items-center gap-2">
                                    <Smartphone className="h-4 w-4" />
                                    <span>{account.name}</span>
                                    <span className="text-gray-500 text-xs">
                                      ({account.upi_id})
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {upiAccounts.length === 0 && (
                            <p className="text-xs text-orange-600 mt-1">
                              No UPI accounts found. Please add a UPI account first.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Cash Account Selection - only show for cash */}
                      {requiresCashAccount && (
                        <div>
                          <Label htmlFor="cash_account_id">Cash Account *</Label>
                          <Select
                            value={paymentData.cash_account_id}
                            onValueChange={(value: string) => setPaymentData(prev => ({ 
                              ...prev, 
                              cash_account_id: value 
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select cash account" />
                            </SelectTrigger>
                            <SelectContent>
                              {cashAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    <span>{account.name}</span>
                                    <span className="text-gray-500 text-xs">
                                      (Balance: {account.currency} {account.current_balance.toFixed(2)})
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {cashAccounts.length === 0 && (
                            <p className="text-xs text-orange-600 mt-1">
                              No cash accounts found. Please add a cash account first.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="date">Payment Date</Label>
                          <Input
                            id="date"
                            type="date"
                            value={paymentData.date}
                            onChange={(e) => setPaymentData(prev => ({ 
                              ...prev, 
                              date: e.target.value 
                            }))}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="reference">Reference Number</Label>
                          <Input
                            id="reference"
                            value={paymentData.reference}
                            onChange={(e) => setPaymentData(prev => ({ 
                              ...prev, 
                              reference: e.target.value 
                            }))}
                            placeholder="Transaction ID, Check number, etc."
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={paymentData.notes}
                          onChange={(e) => setPaymentData(prev => ({ 
                            ...prev, 
                            notes: e.target.value 
                          }))}
                          placeholder="Additional notes about this payment..."
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" disabled={loading}>
                          {loading ? 'Recording...' : 'Record Payment'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddPayment(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Payment History Table */}
              {paymentHistory.length > 0 ? (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              {formatDate(payment.date)}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {getPaymentMethodBadge(payment.method)}
                          </TableCell>
                          <TableCell>{payment.reference || 'N/A'}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {payment.notes || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payments recorded yet</p>
                  {remainingAmount > 0 && (
                    <p className="text-sm">Click &quot;Add Payment&quot; to record the first payment</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
