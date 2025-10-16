import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DollarSign, 
  Plus, 
  Calendar,
  Building2
} from 'lucide-react';

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  current_balance: number;
  currency: string;
}

interface EnhancedSalesOrderPaymentTrackerProps {
  orderId: string;
  orderTotal: number;
  onPaymentAdded: () => void;
}

export function EnhancedSalesOrderPaymentTracker({ 
  orderId, 
  orderTotal, 
  onPaymentAdded 
}: EnhancedSalesOrderPaymentTrackerProps) {
  const [open, setOpen] = useState(false);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    method: '',
    bank_account_id: '',
    reference: '',
    description: ''
  });

  useEffect(() => {
    if (open && bankAccounts.length === 0) {
      fetchBankAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/finance/bank-accounts');
      if (response.ok) {
        const result = await response.json();
        setBankAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const handleAddPayment = async () => {
    try {
      setIsAddingPayment(true);
      
      // First, add the payment
      const paymentResponse = await fetch(`/api/sales/orders/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          created_by: "00000000-0000-0000-0000-000000000000" // This would normally come from auth context
        })
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Failed to add payment');
      }

      // If payment method involves a bank account, create bank transaction
      if (formData.bank_account_id && ['bank_transfer', 'cheque'].includes(formData.method)) {
        await fetch('/api/finance/bank_accounts/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bank_account_id: formData.bank_account_id,
            date: formData.payment_date,
            type: 'deposit',
            amount: parseFloat(formData.amount),
            description: `Payment received for Order ${orderId}`,
            reference: formData.reference || `Order-${orderId}`
          })
        });
      }

      // Reset form
      setFormData({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        method: '',
        bank_account_id: '',
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
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      // Reset bank account when method changes
      ...(name === 'method' && !['bank_transfer', 'cheque'].includes(value) ? { bank_account_id: '' } : {})
    }));
  };

  const requiresBankAccount = ['bank_transfer', 'cheque'].includes(formData.method);

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

          {/* Bank Account Selection - only show for bank transfer and cheque */}
          {requiresBankAccount && (
            <div>
              <Label htmlFor="bank_account_id">Bank Account *</Label>
              <Select 
                value={formData.bank_account_id} 
                onValueChange={(value) => handleSelectChange('bank_account_id', value)}
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

          <div>
            <Label htmlFor="reference">Reference</Label>
            <Input 
              id="reference" 
              name="reference" 
              placeholder={
                formData.method === 'cheque' ? 'Cheque No.' :
                formData.method === 'bank_transfer' ? 'Transaction ID' :
                formData.method === 'upi' ? 'UPI Ref ID' :
                'Reference'
              }
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
            disabled={
              isAddingPayment || 
              !formData.amount || 
              !formData.method ||
              (requiresBankAccount && !formData.bank_account_id)
            }
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isAddingPayment ? 'Processing...' : 'Add Payment & Record Bank Transaction'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
