'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  account_type?: 'BANK' | 'UPI';
  upi_id?: string;
  linked_bank_account_id?: string;
  is_active?: boolean;
}

interface PaymentData {
  payment_date: string;
  amount: number;
  method: string;
  bank_account_id: string;
  upi_account_id: string;
  reference: string;
  description: string;
}

interface BillingPaymentProcessorProps {
  isOpen: boolean;
  orderId?: string;
  orderAmount: number;
  amountDue: number;
  paymentType: 'full' | 'partial' | 'advance';
  onClose: () => void;
  onPaymentSuccess: (paymentData: PaymentData) => void;
}

export function BillingPaymentProcessor({
  isOpen,
  orderId,
  orderAmount,
  amountDue,
  paymentType,
  onClose,
  onPaymentSuccess
}: BillingPaymentProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [upiAccounts, setUpiAccounts] = useState<BankAccount[]>([]);
  const [paymentStep, setPaymentStep] = useState<'method' | 'details' | 'processing' | 'success'>('method');
  
  const [formData, setFormData] = useState<PaymentData>({
    payment_date: new Date().toISOString().split('T')[0],
    amount: amountDue,
    method: '',
    bank_account_id: '',
    upi_account_id: '',
    reference: '',
    description: `Payment for Order ${orderId || 'New Order'}`
  });

  // Payment method options
  const paymentMethods = [
    { id: 'cash', label: 'Cash', icon: Banknote, description: 'Immediate cash payment' },
    { id: 'bank_transfer', label: 'Bank Transfer', icon: Building, description: 'NEFT/RTGS/IMPS transfer' },
    { id: 'upi', label: 'UPI Payment', icon: Smartphone, description: 'UPI/Digital wallet' },
    { id: 'cheque', label: 'Cheque', icon: CreditCard, description: 'Bank cheque payment' },
    { id: 'card', label: 'Card Payment', icon: CreditCard, description: 'Credit/Debit card' }
  ];

  // Fetch payment accounts
  useEffect(() => {
    if (isOpen) {
      fetchPaymentAccounts();
    }
  }, [isOpen]);

  const fetchPaymentAccounts = async () => {
    try {
      // Fetch bank accounts
      const bankResponse = await fetch('/api/finance/bank_accounts?type=BANK');
      if (bankResponse.ok) {
        const bankData = await bankResponse.json();
        setBankAccounts(bankData.data || []);
      }

      // Fetch UPI accounts
      const upiResponse = await fetch('/api/finance/bank_accounts?type=UPI');
      if (upiResponse.ok) {
        const upiData = await upiResponse.json();
        setUpiAccounts(upiData.data || []);
      }
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
    }
  };

  const handleMethodSelect = (methodId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      method: methodId,
      bank_account_id: '',
      upi_account_id: ''
    }));
    setPaymentStep('details');
  };

  const handleInputChange = (field: keyof PaymentData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const processPayment = async () => {
    setIsProcessing(true);
    setPaymentStep('processing');

    try {
      // Validate form data
      if (!formData.method || formData.amount <= 0) {
        throw new Error('Please fill all required fields');
      }

      if ((formData.method === 'bank_transfer' || formData.method === 'cheque') && !formData.bank_account_id) {
        throw new Error('Please select a bank account');
      }

      if (formData.method === 'upi' && !formData.upi_account_id) {
        throw new Error('Please select a UPI account');
      }

      // Create payment record if order exists
      if (orderId) {
        const response = await fetch(`/api/sales/orders/${orderId}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process payment');
        }

        // Create bank transaction if applicable
        if (formData.bank_account_id && (formData.method === 'bank_transfer' || formData.method === 'cheque')) {
          await fetch('/api/finance/bank_accounts/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bank_account_id: formData.bank_account_id,
              type: 'deposit',
              amount: formData.amount,
              description: formData.description,
              reference: formData.reference,
              transaction_date: formData.payment_date
            })
          });
        }

        // Create UPI transaction if applicable
        if (formData.upi_account_id && formData.method === 'upi') {
          await fetch('/api/finance/bank_accounts/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bank_account_id: formData.upi_account_id,
              type: 'deposit',
              amount: formData.amount,
              description: formData.description,
              reference: formData.reference,
              transaction_date: formData.payment_date
            })
          });
        }
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      setPaymentStep('success');
      
      // Call success handler after a brief delay
      setTimeout(() => {
        onPaymentSuccess(formData);
      }, 1500);

    } catch (error) {
      console.error('Payment processing error:', error);
      alert(error instanceof Error ? error.message : 'Payment processing failed');
      setPaymentStep('details');
    } finally {
      setIsProcessing(false);
    }
  };

  // Payment Method Selection Step
  if (paymentStep === 'method') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Select Payment Method
              <Badge variant="outline">{paymentType.charAt(0).toUpperCase() + paymentType.slice(1)} Payment</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Amount to Pay:</span>
                <span className="font-bold text-lg">₹{amountDue.toLocaleString()}</span>
              </div>
              {orderAmount !== amountDue && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">Order Total:</span>
                  <span className="text-sm text-gray-700">₹{orderAmount.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <Card 
                    key={method.id} 
                    className="cursor-pointer border-2 hover:border-blue-300 transition-colors"
                    onClick={() => handleMethodSelect(method.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Icon className="h-8 w-8 text-blue-600" />
                        <div>
                          <h3 className="font-medium">{method.label}</h3>
                          <p className="text-xs text-gray-600">{method.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Payment Details Step
  if (paymentStep === 'details') {
    const selectedMethod = paymentMethods.find(m => m.id === formData.method);
    
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedMethod && <selectedMethod.icon className="h-5 w-5" />}
              {selectedMethod?.label} Payment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount */}
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                min="1"
                max={orderAmount}
                step="1"
              />
            </div>

            {/* Date */}
            <div>
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => handleInputChange('payment_date', e.target.value)}
              />
            </div>

            {/* Bank Account Selection */}
            {(formData.method === 'bank_transfer' || formData.method === 'cheque') && (
              <div>
                <Label>Bank Account</Label>
                <Select value={formData.bank_account_id} onValueChange={(value) => handleInputChange('bank_account_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} (...{account.account_number.slice(-4)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* UPI Account Selection */}
            {formData.method === 'upi' && (
              <div>
                <Label>UPI Account</Label>
                <Select value={formData.upi_account_id} onValueChange={(value) => handleInputChange('upi_account_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select UPI account" />
                  </SelectTrigger>
                  <SelectContent>
                    {upiAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.upi_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reference */}
            <div>
              <Label>Reference Number</Label>
              <Input
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                placeholder="Transaction ID, Cheque number, etc."
              />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => setPaymentStep('method')}>
              Back
            </Button>
            <Button onClick={processPayment} disabled={isProcessing}>
              Process Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Processing Step
  if (paymentStep === 'processing') {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Processing Payment...
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-8">
            <div className="animate-pulse">
              <div className="text-lg font-medium">Processing ₹{formData.amount.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Please wait while we process your payment</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Success Step
  if (paymentStep === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Payment Successful
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-8">
            <div className="text-green-600 mb-4">
              <CheckCircle className="h-16 w-16 mx-auto" />
            </div>
            <div className="text-lg font-medium">₹{formData.amount.toLocaleString()} Paid Successfully</div>
            <div className="text-sm text-gray-600">Payment has been recorded and processed</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
