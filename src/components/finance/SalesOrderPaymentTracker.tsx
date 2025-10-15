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
  Plus,
  Smartphone
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
  const [upiAccounts, setUpiAccounts] = useState<UpiAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  
  // Simplified form data that matches database schema
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    method: '',
    bank_account_id: '',
    upi_account_id: '',
    cash_account_id: '',
    bajaj_downpayment_amount: '',
    bajaj_downpayment_method: '',
    bajaj_bank_account_id: '',
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
      const response = await fetch('/api/finance/bank_accounts?type=BANK');
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  }, []);

  // Fetch UPI accounts for the form
  const fetchUpiAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts?type=UPI');
      if (response.ok) {
        const data = await response.json();
        setUpiAccounts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching UPI accounts:', error);
    }
  }, []);

  // Fetch cash accounts for the form
  const fetchCashAccounts = useCallback(async () => {
    try {
      console.log('Fetching cash accounts...');
      const response = await fetch('/api/finance/bank_accounts?type=CASH');
      if (response.ok) {
        const data = await response.json();
        console.log('Cash accounts fetched:', data.data);
        setCashAccounts(data.data || []);
      } else {
        console.error('Failed to fetch cash accounts:', response.status);
      }
    } catch (error) {
      console.error('Error fetching cash accounts:', error);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Fetch bank accounts and UPI accounts only once when dialog opens
  useEffect(() => {
    if (open && (bankAccounts.length === 0 || upiAccounts.length === 0 || cashAccounts.length === 0)) {
      fetchBankAccounts();
      fetchUpiAccounts();
      fetchCashAccounts();
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

      // If payment method involves a bank account, create bank transaction
      if (formData.bank_account_id && (formData.method === 'bank_transfer' || formData.method === 'cheque' || formData.method === 'card')) {
        try {
          await fetch('/api/finance/bank_accounts/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bank_account_id: formData.bank_account_id,
              type: 'deposit',
              amount: parseFloat(formData.amount),
              description: `Payment received for Order ${orderId}`,
              reference: formData.reference || `Order-${orderId}`,
              transaction_date: formData.payment_date
            })
          });
        } catch (bankError) {
          console.warn('Bank transaction creation failed:', bankError);
          // Don't fail the payment if bank transaction fails
        }
      }

      // If payment method is UPI, create UPI transaction and linked bank transaction
      if (formData.upi_account_id && formData.method === 'upi') {
        try {
          // Create UPI account transaction
          await fetch('/api/finance/bank_accounts/transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bank_account_id: formData.upi_account_id,
              type: 'deposit',
              amount: parseFloat(formData.amount),
              description: `UPI Payment received for Order ${orderId}`,
              reference: formData.reference || `Order-${orderId}`,
              transaction_date: formData.payment_date
            })
          });

          // Find the UPI account and check if it has a linked bank account
          const upiAccount = upiAccounts.find(acc => acc.id === formData.upi_account_id);
          if (upiAccount?.linked_bank_account_id) {
            // Create corresponding bank account transaction
            await fetch('/api/finance/bank_accounts/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bank_account_id: upiAccount.linked_bank_account_id,
                type: 'deposit',
                amount: parseFloat(formData.amount),
                description: `UPI Transfer from ${upiAccount.name} for Order ${orderId}`,
                reference: `UPI-${formData.reference || orderId}`,
                transaction_date: formData.payment_date
              })
            });
          }
        } catch (upiError) {
          console.warn('UPI transaction creation failed:', upiError);
          // Don't fail the payment if UPI transaction fails
        }
      }

      // If payment method is cash, create cash transaction directly
      if (formData.method === 'cash') {
        try {
          // Create cash transaction record
          await fetch('/api/finance/cash-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction_type: 'receipt',
              amount: parseFloat(formData.amount),
              description: `Cash Payment received for Order ${orderId}`,
              reference: formData.reference || `Order-${orderId}`,
              transaction_date: formData.payment_date,
              source: 'sales_order_payment'
            })
          });

          // Update cash balance
          await fetch('/api/finance/cash-balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: parseFloat(formData.amount),
              transaction_type: 'deposit',
              description: `Cash received for Order ${orderId}`,
              date: formData.payment_date
            })
          });
        } catch (cashError) {
          console.warn('Cash transaction creation failed:', cashError);
          // Don't fail the payment if cash transaction fails
        }
      }

      // If payment method is Bajaj Finance, handle down payment and credit balance
      if (formData.method === 'bajaj' && formData.bajaj_downpayment_amount && formData.bajaj_bank_account_id) {
        try {
          const downPaymentAmount = parseFloat(formData.bajaj_downpayment_amount);
          const totalAmount = parseFloat(formData.amount);
          const balanceAmount = totalAmount - downPaymentAmount;

          // Create down payment transaction (customer payment)
          if (downPaymentAmount > 0) {
            if (formData.bajaj_downpayment_method === 'cash') {
              // For cash down payment, create cash transaction directly
              await fetch('/api/finance/cash-transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  transaction_type: 'receipt',
                  amount: downPaymentAmount,
                  description: `Bajaj Finance Down Payment (Cash) for Order ${orderId}`,
                  reference: `BAJAJ-DP-${formData.reference || orderId}`,
                  transaction_date: formData.payment_date,
                  source: 'bajaj_down_payment'
                })
              });

              // Update cash balance
              await fetch('/api/finance/cash-balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  amount: downPaymentAmount,
                  transaction_type: 'deposit',
                  description: `Bajaj Down Payment for Order ${orderId}`,
                  date: formData.payment_date
                })
              });
            } else {
              // For non-cash payments (UPI, Bank, etc.), use account ID
              let downPaymentAccountId = '';
              
              if (formData.bajaj_downpayment_method === 'upi') {
                downPaymentAccountId = formData.upi_account_id;
              } else {
                downPaymentAccountId = formData.bank_account_id;
              }

              if (downPaymentAccountId) {
                await fetch('/api/finance/bank_accounts/transactions', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    bank_account_id: downPaymentAccountId,
                    type: 'deposit',
                    amount: downPaymentAmount,
                    description: `Bajaj Finance Down Payment for Order ${orderId}`,
                    reference: `BAJAJ-DP-${formData.reference || orderId}`,
                    transaction_date: formData.payment_date
                  })
                });
              }
            }
          }

          // Create Bajaj credit transaction (balance amount from Bajaj to our bank)
          if (balanceAmount > 0) {
            await fetch('/api/finance/bank_accounts/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                bank_account_id: formData.bajaj_bank_account_id,
                type: 'deposit',
                amount: balanceAmount,
                description: `Bajaj Finance Credit for Order ${orderId}`,
                reference: `BAJAJ-CREDIT-${formData.reference || orderId}`,
                transaction_date: formData.payment_date
              })
            });
          }
        } catch (bajajError) {
          console.warn('Bajaj Finance transaction creation failed:', bajajError);
          // Don't fail the payment if Bajaj transaction fails
        }
      }

      // Reset form and close dialog
      setFormData({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        method: '',
        bank_account_id: '',
        upi_account_id: '',
        cash_account_id: '',
        bajaj_downpayment_amount: '',
        bajaj_downpayment_method: '',
        bajaj_bank_account_id: '',
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

  // Validation function for form submission
  const isFormValid = () => {
    if (!formData.amount || !formData.method) return false;
    
    if (formData.method === 'bajaj') {
      // Check basic Bajaj fields
      if (!formData.bajaj_downpayment_amount || !formData.bajaj_downpayment_method || !formData.bajaj_bank_account_id) {
        return false;
      }
      
      // Check down payment account based on method
      // Cash doesn't require account selection
      if (formData.bajaj_downpayment_method === 'cash') {
        return true; // Cash payments auto-update cash balance
      } else if (formData.bajaj_downpayment_method === 'upi') {
        return !!formData.upi_account_id;
      } else if (['cheque', 'bank_transfer', 'card'].includes(formData.bajaj_downpayment_method)) {
        return !!formData.bank_account_id;
      }
    }
    
    return true;
  };

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
                  <SelectItem value="bajaj">Bajaj Finance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.method === 'bank_transfer' || formData.method === 'cheque' || formData.method === 'card') && (
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

            {formData.method === 'upi' && (
              <div>
                <Label htmlFor="upi_account">UPI Account *</Label>
                <Select 
                  value={formData.upi_account_id} 
                  onValueChange={(value) => handleInputChange('upi_account_id', value)}
                >
                  <SelectTrigger id="upi_account">
                    <SelectValue placeholder="Select UPI account" />
                  </SelectTrigger>
                  <SelectContent>
                    {upiAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          <span>{account.name}</span>
                          <span className="text-gray-500 text-xs">({account.upi_id})</span>
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

            {/* Cash payment doesn't require account selection - auto-updates cash balance */}
            {formData.method === 'cash' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Cash payment will automatically update cash balance
                  </span>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  No account selection needed. Cash transactions and balance will be updated automatically.
                </p>
              </div>
            )}

            {formData.method === 'bajaj' && (
              <div className="space-y-4 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <DollarSign className="h-4 w-4" />
                  <span>Bajaj Finance Payment Details</span>
                </div>
                
                <div>
                  <Label htmlFor="bajaj_downpayment_amount">Down Payment Amount *</Label>
                  <Input
                    id="bajaj_downpayment_amount"
                    type="number"
                    step="0.01"
                    value={formData.bajaj_downpayment_amount}
                    onChange={(e) => handleInputChange('bajaj_downpayment_amount', e.target.value)}
                    placeholder="Enter down payment amount"
                  />
                </div>

                <div>
                  <Label htmlFor="bajaj_downpayment_method">Down Payment Method *</Label>
                  <Select 
                    value={formData.bajaj_downpayment_method} 
                    onValueChange={(value) => handleInputChange('bajaj_downpayment_method', value)}
                  >
                    <SelectTrigger id="bajaj_downpayment_method">
                      <SelectValue placeholder="Select down payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Show account selection based on down payment method */}
                {(formData.bajaj_downpayment_method === 'cheque' || formData.bajaj_downpayment_method === 'bank_transfer' || formData.bajaj_downpayment_method === 'card') && (
                  <div>
                    <Label htmlFor="bajaj_dp_bank_account">Down Payment Bank Account *</Label>
                    <Select 
                      value={formData.bank_account_id} 
                      onValueChange={(value) => handleInputChange('bank_account_id', value)}
                    >
                      <SelectTrigger id="bajaj_dp_bank_account">
                        <SelectValue placeholder="Select bank account for down payment" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              <span>{account.name}</span>
                              <span className="text-gray-500 text-xs">
                                ({account.account_number})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.bajaj_downpayment_method === 'upi' && (
                  <div>
                    <Label htmlFor="bajaj_dp_upi_account">Down Payment UPI Account *</Label>
                    <Select 
                      value={formData.upi_account_id} 
                      onValueChange={(value) => handleInputChange('upi_account_id', value)}
                    >
                      <SelectTrigger id="bajaj_dp_upi_account">
                        <SelectValue placeholder="Select UPI account for down payment" />
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
                  </div>
                )}

                {/* Cash down payment doesn't require account selection */}
                {formData.bajaj_downpayment_method === 'cash' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Cash down payment will automatically update cash balance
                      </span>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      No account selection needed. Cash transactions and balance will be updated automatically.
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="bajaj_bank_account">Bajaj Credit Bank Account *</Label>
                  <Select 
                    value={formData.bajaj_bank_account_id} 
                    onValueChange={(value) => handleInputChange('bajaj_bank_account_id', value)}
                  >
                    <SelectTrigger id="bajaj_bank_account">
                      <SelectValue placeholder="Select bank account for Bajaj credit" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>{account.name}</span>
                            <span className="text-gray-500 text-xs">
                              ({account.account_number})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {bankAccounts.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      No bank accounts found. Please add a bank account first.
                    </p>
                  )}
                </div>

                <div className="text-sm text-blue-600 bg-blue-100 p-2 rounded">
                  <strong>Note:</strong> Balance amount (₹{parseFloat(formData.amount || '0') - parseFloat(formData.bajaj_downpayment_amount || '0')}) will be credited from Bajaj Finance to the selected bank account.
                </div>
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
              disabled={isAddingPayment || !isFormValid()}
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
