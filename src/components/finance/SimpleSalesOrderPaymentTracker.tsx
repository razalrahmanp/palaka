'use client';

import React, { useState } from 'react';
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

interface SimpleSalesOrderPaymentTrackerProps {
  orderId: string;
  orderTotal: number;
  onPaymentAdded: () => void;
}

export function SimpleSalesOrderPaymentTracker({ orderId, orderTotal, onPaymentAdded }: SimpleSalesOrderPaymentTrackerProps) {
  const [open, setOpen] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    method: '',
    reference: '',
    description: ''
  });

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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add payment');
      }

      // Reset form
      setFormData({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        method: '',
        reference: '',
        description: ''
      });
      
      // Notify parent component
      onPaymentAdded();
      
      // Close dialog
      setOpen(false);
    } catch (error) {
      console.error('Error adding payment:', error);
      alert(`Failed to add payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          className="bg-green-600 hover:bg-green-700 text-xs px-2 py-1"
          title="Add Payment"
        >
          <Plus className="h-3 w-3 mr-1" />
          Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Add Payment
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Order Total: ₹{orderTotal.toFixed(2)}
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="amount">Amount *</Label>
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
                  step="0.01"
                  min="0"
                  max={orderTotal}
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="method">Payment Method *</Label>
            <Select 
              value={formData.method} 
              onValueChange={(value) => handleSelectChange('method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="reference">Reference</Label>
            <Input 
              id="reference" 
              name="reference" 
              placeholder="Transaction ID, Cheque No, etc." 
              value={formData.reference} 
              onChange={handleInputChange} 
            />
          </div>

          <div>
            <Label htmlFor="description">Notes</Label>
            <Textarea 
              id="description" 
              name="description" 
              placeholder="Payment notes..." 
              value={formData.description} 
              onChange={handleInputChange} 
              rows={2}
            />
          </div>

          <Button 
            type="button" 
            onClick={handleAddPayment} 
            disabled={isAddingPayment || !formData.amount || !formData.method}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isAddingPayment ? 'Processing...' : 'Add Payment & Auto-Create Invoice'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
