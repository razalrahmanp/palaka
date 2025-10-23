'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  DollarSign, 
  CreditCard, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  User,
  Calendar,
  RotateCcw,
  Edit,
  Trash2
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

interface Invoice {
  id: string;
  total: number;
  paid_amount: number;
  total_refunded?: number;
  customer_name: string;
  status: string;
  created_at: string;
}

interface RefundRequest {
  id: string;
  refund_amount: number;
  refund_type: string;
  reason: string;
  refund_method: string;
  bank_account_id?: string;
  status: string;
  reference_number?: string;
  created_at: string;
  processed_at?: string;
  requested_by_user?: {
    name: string;
    email: string;
  };
  approved_by_user?: {
    name: string;
    email: string;
  };
  processed_by_user?: {
    name: string;
    email: string;
  };
  notes?: string;
}

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  current_balance: number;
  account_type: string;
}

interface RefundDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onRefundCreated: () => void;
  prefilledAmount?: number;
  returnId?: string; // Optional return_id to link refund to a return
}

export function RefundDialog({ isOpen, onClose, invoice, onRefundCreated, prefilledAmount, returnId }: RefundDialogProps) {
  console.log('🎨 RefundDialog rendered with props:', {
    isOpen,
    invoiceId: invoice?.id,
    prefilledAmount,
    returnId,
    returnIdType: typeof returnId,
    returnIdPresent: returnId !== undefined
  });
  
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'create' | 'list'>('list');
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<BankAccount[]>([]); // ✅ Add cash accounts state
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | null>(null);
  const [editingRefund, setEditingRefund] = useState<RefundRequest | null>(null);
  const [formData, setFormData] = useState({
    refund_amount: '',
    refund_type: 'partial',
    reason: '',
    refund_method: 'bank_transfer',
    bank_account_id: '',
    cash_account_id: '', // ✅ Add cash account ID
    reference_number: '',
    refund_date: new Date().toISOString().split('T')[0], // Add refund date field
    notes: ''
  });

  const availableForRefund = invoice 
    ? (invoice.paid_amount || 0) - (invoice.total_refunded || 0)
    : 0;

  const fetchBankAccounts = useCallback(async () => {
    try {
      // Fetch only BANK type accounts for refunds
      const response = await fetch('/api/finance/bank-accounts?type=BANK');
      const result = await response.json();
      if (result.success) {
        // Double-check filtering on client side for safety
        const bankTypeAccounts = (result.data || []).filter(
          (account: BankAccount) => account.account_type === 'BANK'
        );
        setBankAccounts(bankTypeAccounts);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  }, []);

  // ✅ Add fetch cash accounts function
  const fetchCashAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/finance/bank-accounts?type=CASH');
      const result = await response.json();
      if (result.success) {
        const cashTypeAccounts = (result.data || []).filter(
          (account: BankAccount) => account.account_type === 'CASH'
        );
        setCashAccounts(cashTypeAccounts);
        console.log('💵 Cash accounts loaded for refunds:', cashTypeAccounts.length);
      }
    } catch (error) {
      console.error('Error fetching cash accounts:', error);
    }
  }, []);

  const fetchRefunds = useCallback(async () => {
    if (!invoice) return;

    try {
      const response = await fetch(`/api/finance/refunds/${invoice.id}`);
      const result = await response.json();

      if (result.success) {
        setRefunds(result.data.refunds);
      }
    } catch (error) {
      console.error('Error fetching refunds:', error);
    }
  }, [invoice]);

  useEffect(() => {
    if (isOpen && invoice) {
      fetchRefunds();
      fetchBankAccounts();
      fetchCashAccounts(); // ✅ Fetch cash accounts
    }
  }, [isOpen, invoice, fetchRefunds, fetchBankAccounts, fetchCashAccounts]);

  // Update selected bank account when bank_account_id changes
  useEffect(() => {
    if (formData.bank_account_id && bankAccounts.length > 0) {
      const account = bankAccounts.find(acc => acc.id === formData.bank_account_id);
      setSelectedBankAccount(account || null);
    } else {
      setSelectedBankAccount(null);
    }
  }, [formData.bank_account_id, bankAccounts]);

  // Set prefilled amount when dialog opens
  useEffect(() => {
    if (isOpen && prefilledAmount !== undefined) {
      setFormData(prev => ({
        ...prev,
        refund_amount: prefilledAmount.toString()
      }));
    }
  }, [isOpen, prefilledAmount]);

  const handleManualRefundProcessing = async (refundId: string, action: 'process_refund' | 'reverse_refund') => {
    setLoading(true);
    try {
      const response = await fetch('/api/finance/refunds/manual-bank-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refund_id: refundId,
          action,
          processed_by: 'current-user-id', // TODO: Get from auth context
          notes: `Manual ${action.replace('_', ' ')} via bank processing`
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`Refund ${action.replace('_', ' ')} successfully! ${result.data.bank_account ? `Bank balance updated: ₹${result.data.balance_change}` : ''}`);
        
        // Refresh refunds list
        fetchRefunds();
        
        // Notify parent component
        onRefundCreated();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const refundAmount = parseFloat(formData.refund_amount);
    if (refundAmount <= 0) {
      alert('Refund amount must be greater than 0');
      return;
    }

    // Skip validation for available amount when editing
    if (!editingRefund && refundAmount > availableForRefund) {
      alert(`Refund amount cannot exceed available amount (₹${availableForRefund})`);
      return;
    }

    // ✅ Validate cash account selection for cash refunds
    if (formData.refund_method === 'cash' && !formData.cash_account_id) {
      alert('Please select a cash account for cash refund');
      return;
    }

    // Validate bank account for bank transfers and cheques
    if ((formData.refund_method === 'bank_transfer' || formData.refund_method === 'cheque') && !formData.bank_account_id) {
      alert('Please select a bank account for this refund method');
      return;
    }

    setLoading(true);

    try {
      const currentUser = getCurrentUser();
      console.log('🔍 Current user from localStorage:', currentUser);
      
      if (!currentUser) {
        alert('You must be logged in to create a refund. Please set a user in localStorage first.');
        setLoading(false);
        return;
      }

      if (!currentUser.id || currentUser.id === 'current-user-id') {
        alert('Invalid user ID detected. Please visit http://localhost:3000/set-valid-user.html to set a valid user.');
        setLoading(false);
        return;
      }

      console.log('📤 Sending refund request with user ID:', currentUser.id);

      // ✅ KEY FIX: Send cash_account_id AS bank_account_id for cash refunds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const requestBody: Record<string, any> = {
        ...formData,
        refund_amount: refundAmount,
        requested_by: currentUser.id,
        processed_at: formData.refund_date, // Use the selected date as processed_at
        return_id: returnId || null // ✅ Include return_id if provided
      };

      // Send cash_account_id as bank_account_id when cash refund
      if (formData.refund_method === 'cash' && formData.cash_account_id) {
        requestBody.bank_account_id = formData.cash_account_id; // Use cash account as bank account
      }

      console.log('🔍 CRITICAL DEBUG - Request Body Construction:', {
        returnIdProp: returnId,
        returnIdType: typeof returnId,
        returnIdInBody: requestBody.return_id,
        returnIdInBodyType: typeof requestBody.return_id,
        willBeNull: requestBody.return_id === null,
        willBeUndefined: requestBody.return_id === undefined,
        fullBody: requestBody
      });
      console.log('📋 Complete request body JSON:', JSON.stringify(requestBody, null, 2));
      console.log('🔗 Return ID being sent:', returnId);

      const url = editingRefund 
        ? `/api/finance/refunds/${invoice.id}/${editingRefund.id}`
        : `/api/finance/refunds/${invoice.id}`;
      
      const method = editingRefund ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.success) {
        // Reset form
        setFormData({
          refund_amount: '',
          refund_type: 'partial',
          reason: '',
          refund_method: 'bank_transfer',
          bank_account_id: '',
          cash_account_id: '', // ✅ Add cash account ID
          reference_number: '',
          refund_date: new Date().toISOString().split('T')[0],
          notes: ''
        });
        
        setEditingRefund(null);
        
        // Refresh refunds list
        await fetchRefunds();
        
        // Switch back to list view
        setCurrentView('list');
        
        // Notify parent component
        onRefundCreated();
      } else {
        // Show detailed error message from server
        const errorMessage = result.error || 'Failed to process refund';
        if (result.code === 'INVALID_USER_ID') {
          alert(`Authentication Error: ${errorMessage}`);
        } else {
          alert(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error creating refund:', error);
      alert('Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRefund = (refund: RefundRequest) => {
    setEditingRefund(refund);
    setFormData({
      refund_amount: refund.refund_amount.toString(),
      refund_type: refund.refund_type,
      reason: refund.reason,
      refund_method: refund.refund_method,
      bank_account_id: refund.bank_account_id || '',
      cash_account_id: '', // ✅ Add cash account ID (will be populated if refund method is cash)
      reference_number: refund.reference_number || '',
      refund_date: refund.processed_at ? new Date(refund.processed_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: refund.notes || ''
    });
    setCurrentView('create');
  };

  const handleDeleteRefund = async (refund: RefundRequest) => {
    if (!confirm(`Are you sure you want to delete this refund of ${formatCurrency(refund.refund_amount)}?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/finance/refunds/${invoice?.id}/${refund.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert('Refund deleted successfully!');
        fetchRefunds();
        onRefundCreated();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting refund:', error);
      alert('Failed to delete refund');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'processed':
        return <Badge variant="outline" className="bg-green-50 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Processed</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case 'reversed':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700"><RotateCcw className="h-3 w-3 mr-1" />Reversed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!invoice) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {currentView === 'create' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCurrentView('list');
                  setEditingRefund(null);
                  setFormData({
                    refund_amount: '',
                    refund_type: 'partial',
                    reason: '',
                    refund_method: 'bank_transfer',
                    bank_account_id: '',
                    cash_account_id: '', // ✅ Add cash account ID
                    reference_number: '',
                    refund_date: new Date().toISOString().split('T')[0],
                    notes: ''
                  });
                }}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {currentView === 'create' ? (editingRefund ? 'Edit Refund' : 'Process Refund') : 'Invoice Refunds'}
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Invoice: {invoice.id.slice(0, 8)} • Customer: {invoice.customer_name}
              </p>
            </div>
          </div>
        </DialogHeader>

        {currentView === 'list' ? (
          <>
            {/* Invoice Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Invoice Total</p>
                <p className="font-semibold">{formatCurrency(invoice.total)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid Amount</p>
                <p className="font-semibold text-green-600">{formatCurrency(invoice.paid_amount || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Refunded</p>
                <p className="font-semibold text-red-600">{formatCurrency(invoice.total_refunded || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Available for Refund</p>
                <p className="font-semibold text-blue-600">{formatCurrency(availableForRefund)}</p>
              </div>
            </div>

            {/* Refunds List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Refund Requests ({refunds.length})</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchRefunds}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  {availableForRefund > 0 && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setCurrentView('create')}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      New Refund
                    </Button>
                  )}
                </div>
              </div>

              {refunds.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No refund requests found for this invoice.</p>
                    {availableForRefund > 0 && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setCurrentView('create')}
                      >
                        Create First Refund
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {refunds.map((refund) => (
                    <Card key={refund.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-lg">{formatCurrency(refund.refund_amount)}</span>
                              {getStatusBadge(refund.status)}
                              <Badge variant="outline" className="text-xs">
                                {refund.refund_type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{refund.reason}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Requested by {refund.requested_by_user?.name || 'Unknown'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(refund.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {refund.refund_method.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col gap-2 ml-4">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditRefund(refund)}
                                disabled={loading}
                                className="h-8 px-2"
                              >
                                <Edit className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50 h-8 px-2"
                                onClick={() => handleDeleteRefund(refund)}
                                disabled={loading}
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Delete
                              </Button>
                            </div>
                            
                            {refund.status === 'processed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => handleManualRefundProcessing(refund.id, 'reverse_refund')}
                                disabled={loading}
                              >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                Reverse Refund
                              </Button>
                            )}
                            
                            {refund.status === 'reversed' && (
                              <div className="text-xs text-red-600 text-center font-medium">
                                Refund Reversed
                              </div>
                            )}
                          </div>
                        </div>
                        {refund.notes && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <p className="text-sm text-gray-700">{refund.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Create Refund Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Available for Refund</span>
              </div>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(availableForRefund)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="refund_date">Refund Date *</Label>
                <Input
                  id="refund_date"
                  type="date"
                  value={formData.refund_date}
                  onChange={(e) => setFormData({...formData, refund_date: e.target.value})}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div>
                <Label htmlFor="refund_amount">Refund Amount *</Label>
                <Input
                  id="refund_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={availableForRefund}
                  value={formData.refund_amount}
                  onChange={(e) => setFormData({...formData, refund_amount: e.target.value})}
                  placeholder="Enter amount to refund"
                  required
                />
              </div>

              <div>
                <Label htmlFor="refund_type">Refund Type *</Label>
                <Select value={formData.refund_type} onValueChange={(value) => setFormData({...formData, refund_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Refund</SelectItem>
                    <SelectItem value="partial">Partial Refund</SelectItem>
                    <SelectItem value="return_based">Return-based Refund</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="reason">Reason for Refund *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                placeholder="Please explain the reason for this refund..."
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="refund_method">Refund Method *</Label>
                <Select value={formData.refund_method} onValueChange={(value) => setFormData({...formData, refund_method: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card Reversal</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="adjustment">Account Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                  placeholder="Cheque number, transaction ID, etc."
                />
              </div>
            </div>

            {/* Bank Account Selection - Show only for bank transfer and cheque */}
            {(formData.refund_method === 'bank_transfer' || formData.refund_method === 'cheque') && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="bank_account_id">Bank Account *</Label>
                  <Select 
                    value={formData.bank_account_id} 
                    onValueChange={(value) => setFormData({...formData, bank_account_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.account_number}) - ₹{account.current_balance.toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bank Balance Warning */}
                {selectedBankAccount && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Bank Account Balance</span>
                    </div>
                    <div className="mt-1 text-sm text-blue-700">
                      Current Balance: <span className="font-semibold">₹{selectedBankAccount.current_balance.toLocaleString()}</span>
                    </div>
                    {parseFloat(formData.refund_amount) > selectedBankAccount.current_balance && (
                      <div className="mt-2 flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Insufficient balance for this refund amount</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ✅ Cash Account Selection - Show only for cash refunds */}
            {formData.refund_method === 'cash' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="cash_account_id">Cash Account *</Label>
                  <Select 
                    value={formData.cash_account_id} 
                    onValueChange={(value) => setFormData({...formData, cash_account_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cash account (e.g., CASH-PETTY)" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashAccounts && cashAccounts.length > 0 ? (
                        cashAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name} - ₹{account.current_balance.toLocaleString()}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-accounts" disabled>
                          No cash accounts available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {(!cashAccounts || cashAccounts.length === 0) && (
                    <p className="text-xs text-red-600 mt-1">
                      ⚠️ Please create a cash account first (e.g., CASH-PETTY)
                    </p>
                  )}
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Cash Refund</span>
                  </div>
                  <div className="mt-1 text-sm text-green-700">
                    This refund will be deducted from the selected cash account balance
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Any additional information or notes..."
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentView('list')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Process Refund'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}