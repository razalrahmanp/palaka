'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  DollarSign, 
  Calendar, 
  Plus
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

interface SalesOrderPaymentTrackerProps {
  orderId: string;
  orderTotal: number;
  onPaymentAdded: () => void;
}

export function SalesOrderPaymentTracker({ orderId, orderTotal, onPaymentAdded }: SalesOrderPaymentTrackerProps) {
  const [open, setOpen] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  // We store payments in the state but don't use them directly in the UI
  const [, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: '',
    payment_type: 'advance',
    reference_number: '',
    bank_name: '',
    cheque_number: '',
    upi_transaction_id: '',
    card_last_four: '',
    payment_gateway_reference: '',
    notes: ''
  });

  // Define fetchPayments with useCallback
  const fetchPayments = useCallback(async () => {
    try {
      const response = await fetch(`/api/sales/orders/${orderId}/payments`);
      if (!response.ok) {
        throw new Error('Failed to fetch payments');
      }
      
      const data = await response.json();
      setPayments(data.payments || []);
      
      // Calculate total paid
      const paid = data.payments?.reduce((sum: number, payment: Payment) => sum + payment.amount, 0) || 0;
      setTotalPaid(paid);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  }, [orderId]);

  // Fetch payments whenever dialog is opened
  useEffect(() => {
    if (open) {
      fetchPayments();
    }
  }, [open, fetchPayments]);

  const handleAddPayment = async () => {
    try {
      setIsAddingPayment(true);
      const response = await fetch(`/api/sales/orders/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          created_by: "00000000-0000-0000-0000-000000000000" // This would normally come from auth context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add payment');
      }

      // Reset form
      setFormData({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: '',
        payment_type: 'advance',
        reference_number: '',
        bank_name: '',
        cheque_number: '',
        upi_transaction_id: '',
        card_last_four: '',
        payment_gateway_reference: '',
        notes: ''
      });
      
      // Refresh payment data
      fetchPayments();
      
      // Notify parent component
      onPaymentAdded();
      
      // Close dialog
      setOpen(false);
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Failed to add payment. Please try again.');
    } finally {
      setIsAddingPayment(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Helper function for currency formatting only
  // Date formatting handled directly where needed

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-1" />
          Add Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment for Order
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h4 className="font-semibold text-blue-800 mb-2">Order Information</h4>
            <div className="space-y-1">
              <p><span className="font-medium">Order ID:</span> {orderId}</p>
              <p><span className="font-medium">Order Total:</span> {formatCurrency(orderTotal)}</p>
              <p><span className="font-medium">Already Paid:</span> {formatCurrency(totalPaid)}</p>
              <p><span className="font-medium">Balance Due:</span> {formatCurrency(orderTotal - totalPaid)}</p>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <h4 className="font-semibold text-green-800 mb-2">Payment Details</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="payment_date">Payment Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input 
                      id="payment_date" 
                      name="payment_date" 
                      type="date" 
                      value={formData.payment_date} 
                      onChange={handleInputChange} 
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input 
                      id="amount" 
                      name="amount" 
                      type="number" 
                      placeholder="0.00" 
                      value={formData.amount} 
                      onChange={handleInputChange} 
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(value) => handleSelectChange('payment_method', value)}
                >
                  <SelectTrigger id="payment_method" className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CARD">Credit/Debit Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="payment_type">Payment Type</Label>
                <Select 
                  value={formData.payment_type} 
                  onValueChange={(value) => handleSelectChange('payment_type', value)}
                >
                  <SelectTrigger id="payment_type" className="w-full">
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advance">Advance</SelectItem>
                    <SelectItem value="installment">Installment</SelectItem>
                    <SelectItem value="final">Final Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Additional payment details based on payment method */}
        {formData.payment_method === 'CHEQUE' && (
          <div className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cheque_number">Cheque Number</Label>
                <Input 
                  id="cheque_number" 
                  name="cheque_number" 
                  value={formData.cheque_number} 
                  onChange={handleInputChange} 
                />
              </div>
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input 
                  id="bank_name" 
                  name="bank_name" 
                  value={formData.bank_name} 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
          </div>
        )}

        {formData.payment_method === 'BANK_TRANSFER' && (
          <div className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input 
                  id="reference_number" 
                  name="reference_number" 
                  value={formData.reference_number} 
                  onChange={handleInputChange} 
                />
              </div>
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input 
                  id="bank_name" 
                  name="bank_name" 
                  value={formData.bank_name} 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
          </div>
        )}

        {formData.payment_method === 'UPI' && (
          <div className="space-y-3 border-t pt-3">
            <div>
              <Label htmlFor="upi_transaction_id">UPI Transaction ID</Label>
              <Input 
                id="upi_transaction_id" 
                name="upi_transaction_id" 
                value={formData.upi_transaction_id} 
                onChange={handleInputChange} 
              />
            </div>
          </div>
        )}

        {formData.payment_method === 'CARD' && (
          <div className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="card_last_four">Last 4 Digits</Label>
                <Input 
                  id="card_last_four" 
                  name="card_last_four"
                  maxLength={4} 
                  value={formData.card_last_four} 
                  onChange={handleInputChange} 
                />
              </div>
              <div>
                <Label htmlFor="payment_gateway_reference">Gateway Reference</Label>
                <Input 
                  id="payment_gateway_reference" 
                  name="payment_gateway_reference" 
                  value={formData.payment_gateway_reference} 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 border-t pt-3">
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              name="notes" 
              value={formData.notes} 
              onChange={handleInputChange} 
              placeholder="Additional details about this payment"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddPayment}
            disabled={isAddingPayment || !formData.amount || !formData.payment_method}
          >
            {isAddingPayment ? 'Adding...' : 'Add Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
