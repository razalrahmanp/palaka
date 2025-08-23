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
  Plus
} from 'lucide-react';

// Aligned with actual database structure
interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
}

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
}

interface SalesOrderPaymentTrackerProps {
  orderId: string;
  orderTotal: number;
  onPaymentAdded: () => void;
}

export function SalesOrderPaymentTracker({ orderId, orderTotal, onPaymentAdded }: SalesOrderPaymentTrackerProps) {
  const [open, setOpen] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  
  // Simplified form data that matches database schema
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    method: '',
    bank_account_id: '',
    reference: '',
    description: ''
  });

  // Fetch payments for this order
  const fetchPayments = useCallback(async () => {
    try {
      const response = await fetch(`/api/sales/orders/${orderId}/payments`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
        setTotalPaid(data.summary?.total_paid || 0);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  }, [orderId]);

  // Fetch bank accounts for the form
  const fetchBankAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts');
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Fetch bank accounts only once when dialog opens
  useEffect(() => {
    if (open && bankAccounts.length === 0) {
      fetchBankAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddPayment = async () => {
    try {
      setIsAddingPayment(true);
      const response = await fetch(`/api/sales/orders/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add payment');
      }

      // Reset form and close dialog
      setFormData({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        method: '',
        bank_account_id: '',
        reference: '',
        description: ''
      });
      setOpen(false);
      
      // Refresh payments and notify parent
      await fetchPayments();
      onPaymentAdded();
      
    } catch (error) {
      console.error('Error adding payment:', error);
      alert('Failed to add payment. Please try again.');
    } finally {
      setIsAddingPayment(false);
    }
  };

  const remainingBalance = orderTotal - totalPaid;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
          <Plus className="w-4 h-4 mr-1" />
          Track Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Track Payment for Order
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Order Summary */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Order Total:</span>
                <div className="font-semibold">₹{orderTotal.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-600">Paid:</span>
                <div className="font-semibold text-green-600">₹{totalPaid.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-gray-600">Balance:</span>
                <div className="font-semibold text-orange-600">₹{remainingBalance.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => handleInputChange('payment_date', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={remainingBalance}
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="method">Payment Method</Label>
              <Select 
                value={formData.method} 
                onValueChange={(value) => handleInputChange('method', value)}
              >
                <SelectTrigger id="method">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.method === 'bank_transfer' || formData.method === 'cheque') && (
              <div>
                <Label htmlFor="bank_account">Bank Account</Label>
                <Select 
                  value={formData.bank_account_id} 
                  onValueChange={(value) => handleInputChange('bank_account_id', value)}
                >
                  <SelectTrigger id="bank_account">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} {account.account_number && `(${account.account_number})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                type="text"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                placeholder="Transaction ID, cheque number, etc."
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddPayment}
              disabled={isAddingPayment || !formData.amount || !formData.method}
              className="bg-green-600 hover:bg-green-700"
            >
              {isAddingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Adding Payment...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Payment
                </>
              )}
            </Button>
          </div>
          
          {/* Payment History */}
          {payments.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Recent Payments</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {payments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                    <div>
                      <span className="font-medium">₹{payment.amount.toLocaleString()}</span>
                      <span className="text-gray-600 ml-2">via {payment.method}</span>
                    </div>
                    <span className="text-gray-500">{new Date(payment.date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
