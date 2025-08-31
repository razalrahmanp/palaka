'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CreditCard, 
  DollarSign, 
  Plus,
  CheckCircle,
  AlertCircle,
  Building2,
  Smartphone,
  Receipt
} from 'lucide-react';
import { Payment } from '@/types';
import { toast } from 'sonner';

interface PaymentTrackingSidebarProps {
  invoice?: { id: string } | null;
  totalAmount: number;
  customerName?: string;
  invoiceNumber?: string;
  onPaymentAdd?: (payment: Payment) => void;
}

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  current_balance: number;
  currency: string;
  account_type?: 'BANK' | 'UPI';
  upi_id?: string;
  is_active?: boolean;
}

export function PaymentTrackingSidebar({
  invoice,
  totalAmount,
  customerName = '',
  invoiceNumber = '',
  onPaymentAdd
}: PaymentTrackingSidebarProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: '',
    reference: '',
    bank_account_id: '',
    notes: ''
  });

  // Fetch bank accounts
  useEffect(() => {
    const fetchBankAccounts = async () => {
      try {
        const response = await fetch('/api/finance/bank_accounts');
        if (response.ok) {
          const data = await response.json();
          setBankAccounts(data.accounts || []);
        }
      } catch (error) {
        console.error('Error fetching bank accounts:', error);
      }
    };

    fetchBankAccounts();
  }, []);

  // Fetch payments when invoice changes
  useEffect(() => {
    const fetchPayments = async () => {
      if (!invoice?.id) return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/finance/payments?invoice_id=${invoice.id}`);
        if (response.ok) {
          const data = await response.json();
          setPayments(data.payments || []);
        }
      } catch (error) {
        console.error('Error fetching payments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (invoice?.id) {
      fetchPayments();
    } else {
      setPayments([]);
    }
  }, [invoice?.id]);

  const handleAddPayment = async () => {
    if (!paymentForm.amount || !paymentForm.method) {
      toast.error('Please fill in amount and payment method');
      return;
    }

    if (!invoice?.id) {
      toast.error('No invoice selected');
      return;
    }

    try {
      setIsLoading(true);
      
      const paymentData = {
        invoice_id: invoice.id,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || null,
        bank_account_id: paymentForm.bank_account_id || null,
        notes: paymentForm.notes || null,
        date: new Date().toISOString(),
        description: `Payment for ${invoiceNumber}`,
        customer_name: customerName
      };

      const response = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        const newPayment = await response.json();
        setPayments(prev => [newPayment.payment, ...prev]);
        setPaymentForm({
          amount: '',
          method: '',
          reference: '',
          bank_account_id: '',
          notes: ''
        });
        toast.success('Payment recorded successfully');
        
        if (onPaymentAdd) {
          onPaymentAdd(newPayment.payment);
        }
      } else {
        toast.error('Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Error recording payment');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate payment summary
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const remainingBalance = Math.max(0, totalAmount - totalPaid);
  const paymentProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <DollarSign className="h-4 w-4" />;
      case 'card':
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer':
      case 'bank':
        return <Building2 className="h-4 w-4" />;
      case 'upi':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Payment Tracking
        </CardTitle>
        {invoiceNumber && (
          <div className="text-sm text-gray-600">
            Invoice: {invoiceNumber}
            {customerName && ` • ${customerName}`}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-medium">₹{totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Paid Amount:</span>
            <span className="font-medium text-green-600">₹{totalPaid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Balance Due:</span>
            <span className={`font-medium ${remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{remainingBalance.toLocaleString()}
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Payment Progress</span>
              <span>{Math.round(paymentProgress)}%</span>
            </div>
            <Progress value={paymentProgress} className="h-2" />
          </div>

          <Badge 
            variant={remainingBalance <= 0 ? "default" : "secondary"}
            className="w-full justify-center"
          >
            {remainingBalance <= 0 ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Fully Paid
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                Pending: ₹{remainingBalance.toLocaleString()}
              </>
            )}
          </Badge>
        </div>

        {/* Add Payment Form */}
        {invoice && remainingBalance > 0 && (
          <div className="space-y-3 border-t pt-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Record Payment
            </h4>
            
            <div className="space-y-2">
              <div>
                <Label htmlFor="payment-amount" className="text-xs">Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder="Enter amount"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <div>
                <Label htmlFor="payment-method" className="text-xs">Payment Method</Label>
                <Select 
                  value={paymentForm.method} 
                  onValueChange={(value) => setPaymentForm(prev => ({ ...prev, method: value }))}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(paymentForm.method === 'bank_transfer' || paymentForm.method === 'upi') && (
                <div>
                  <Label htmlFor="bank-account" className="text-xs">Bank Account</Label>
                  <Select 
                    value={paymentForm.bank_account_id} 
                    onValueChange={(value) => setPaymentForm(prev => ({ ...prev, bank_account_id: value }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - {account.account_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="payment-reference" className="text-xs">Reference</Label>
                <Input
                  id="payment-reference"
                  placeholder="Transaction ID, Check No., etc."
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                  className="text-sm"
                />
              </div>

              <Button 
                onClick={handleAddPayment} 
                disabled={isLoading || !paymentForm.amount || !paymentForm.method}
                size="sm"
                className="w-full"
              >
                {isLoading ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <h4 className="text-sm font-medium">Payment History</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {payments.map((payment, index) => (
                <div key={payment.id || index} className="text-xs bg-gray-50 p-2 rounded">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      {getPaymentMethodIcon(payment.method || '')}
                      <span className="font-medium">₹{payment.amount?.toLocaleString()}</span>
                    </div>
                    <span className="text-gray-500">
                      {payment.date ? new Date(payment.date).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <div className="text-gray-600 capitalize">
                    {payment.method?.replace('_', ' ')}
                    {payment.reference && ` • ${payment.reference}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Invoice State */}
        {!invoice && (
          <div className="text-center py-8 text-gray-500">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No invoice generated yet</p>
            <p className="text-xs">Create an invoice to track payments</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
