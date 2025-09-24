'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  User, 
  FileText,
  RefreshCw,
  Search,
  AlertCircle,
  Edit3,
  CreditCard,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  date: string;
  method: string;
  reference?: string;
  description?: string;
  bank_account_id?: string;
  created_at: string;
  // Enhanced fields from API
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  invoice_total?: number;
  sales_order_id?: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
  reference?: string;
  bank_account_id?: string;
  created_at: string;
  // Enhanced fields
  bank_account_name?: string;
  category_name?: string;
}

interface Investment {
  id: string;
  amount: number;
  date: string;
  category?: string;
  description?: string;
  reference_number?: string;
  payment_method: string;
  created_at: string;
  // Enhanced fields
  bank_account_name?: string;
  expected_return?: number;
  maturity_date?: string;
}

interface Liability {
  id: string;
  date: string;
  liability_type: string;
  loan_id?: number;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  description?: string;
  payment_method: string;
  bank_account_id?: string;
  upi_reference?: string;
  reference_number?: string;
  created_at: string;
  // Enhanced fields
  bank_account_name?: string;
  loan_name?: string;
  loan_bank_name?: string;
  loan_type?: string;
  loan_number?: string;
  loan_account_code?: string;
  loan_current_balance?: number;
  loan_emi_amount?: number;
}

interface TransactionWithType {
  id: string;
  amount: number;
  date: string;
  description?: string;
  reference?: string;
  bank_account_id?: string;
  created_at: string;
  transaction_type: 'payment' | 'withdrawal' | 'investment' | 'liability';
  // Additional fields depending on type
  [key: string]: unknown;
}

interface JournalEntry {
  id: string;
  journal_number: string;
  description: string;
  entry_date: string;
  source_document_type: string;
  source_document_id: string;
  status: string;
  total_debit: number;
  total_credit: number;
}

interface BankTransaction {
  id: string;
  bank_account_id: string;
  amount: number;
  date: string;
  reference: string;
  description: string;
  type?: string;
  bank_accounts?: {
    id: string;
    name: string;
    current_balance: number;
  };
}

interface DeletionConfirmation {
  payment: Payment;
  relatedEntries: {
    journalEntries: JournalEntry[];
    bankTransactions: BankTransaction[];
  };
}

export function PaymentDeletionManager() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'payments' | 'withdrawals' | 'investments' | 'liabilities'>('payments');
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());
  const [deletionDialog, setDeletionDialog] = useState<{
    open: boolean;
    confirmation?: DeletionConfirmation;
  }>({ open: false });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    transaction?: TransactionWithType;
  }>({ open: false });
  const [deleting, setDeleting] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    amount: '',
    date: '',
    description: '',
    reference_number: '',
    payment_method: '',
    category: '',
    category_id: '',
    method: '', // For payments
    bank_account_id: '',
    invoice_id: '', // For payments
    // Liability-specific fields
    liability_type: '',
    principal_amount: '',
    interest_amount: '',
    upi_reference: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/finance/payments');
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      } else {
        toast.error('Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Error fetching payments');
    }
  };

  const fetchWithdrawals = async () => {
    try {
      const response = await fetch('/api/finance/withdrawals?pageSize=1000');
      if (response.ok) {
        const result = await response.json();
        setWithdrawals(result.data || []);
      } else {
        toast.error('Failed to fetch withdrawals');
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
      toast.error('Error fetching withdrawals');
    }
  };

  const fetchInvestments = async () => {
    try {
      const response = await fetch('/api/finance/investments?pageSize=1000');
      if (response.ok) {
        const result = await response.json();
        setInvestments(result.data || []);
      } else {
        toast.error('Failed to fetch investments');
      }
    } catch (error) {
      console.error('Error fetching investments:', error);
      toast.error('Error fetching investments');
    }
  };

  const fetchLiabilities = async () => {
    try {
      const response = await fetch('/api/finance/liability-payments?pageSize=1000');
      if (response.ok) {
        const result = await response.json();
        setLiabilities(result.data || []);
      } else {
        toast.error('Failed to fetch liability payments');
      }
    } catch (error) {
      console.error('Error fetching liability payments:', error);
      toast.error('Error fetching liability payments');
    }
  };

  const fetchTabData = useCallback(async (tab: 'payments' | 'withdrawals' | 'investments' | 'liabilities', forceReload = false) => {
    // Skip if already loaded and not forcing reload
    if (loadedTabs.has(tab) && !forceReload) {
      return;
    }

    setLoading(true);
    try {
      switch (tab) {
        case 'payments':
          await fetchPayments();
          break;
        case 'withdrawals':
          await fetchWithdrawals();
          break;
        case 'investments':
          await fetchInvestments();
          break;
        case 'liabilities':
          await fetchLiabilities();
          break;
      }
      // Mark tab as loaded
      setLoadedTabs(prev => new Set(prev).add(tab));
    } finally {
      setLoading(false);
    }
  }, [loadedTabs]);



  useEffect(() => {
    // Load data when tab changes
    fetchTabData(activeTab);
  }, [activeTab, fetchTabData]);

  // Keep original payment deletion logic intact
  const handleDeletePayment = async (payment: Payment) => {
    try {
      // First, fetch related entries to show user what will be deleted
      const response = await fetch(`/api/finance/payments/${payment.id}/deletion-impact`);
      if (response.ok) {
        const confirmation: DeletionConfirmation = await response.json();
        setDeletionDialog({ open: true, confirmation });
      } else {
        toast.error('Failed to analyze payment deletion impact');
      }
    } catch (error) {
      console.error('Error analyzing deletion impact:', error);
      toast.error('Error analyzing deletion impact');
    }
  };

  // Edit functions for all transaction types
  const handleEditPayment = async (payment: Payment) => {
    const transactionWithType: TransactionWithType = {
      ...payment,
      transaction_type: 'payment'
    };
    // Populate edit form
    setEditForm({
      amount: payment.amount.toString(),
      date: payment.payment_date || payment.date || '',
      description: payment.description || '',
      reference_number: payment.reference || '',
      payment_method: '',
      category: '',
      category_id: '',
      method: payment.method || '',
      bank_account_id: payment.bank_account_id || '',
      invoice_id: payment.invoice_id || '',
      liability_type: '',
      principal_amount: '',
      interest_amount: '',
      upi_reference: ''
    });
    setEditDialog({ open: true, transaction: transactionWithType });
  };

  // New separate functions for withdrawal operations
  const handleEditWithdrawal = async (withdrawal: Withdrawal) => {
    const transactionWithType: TransactionWithType = {
      ...withdrawal,
      transaction_type: 'withdrawal'
    };
    // Populate edit form
    setEditForm({
      amount: withdrawal.amount.toString(),
      date: withdrawal.date || '',
      description: withdrawal.description || '',
      reference_number: withdrawal.reference || '',
      payment_method: '', // Not available in current interface
      category: withdrawal.category || '',
      category_id: '', // Not available in current interface
      method: '',
      bank_account_id: withdrawal.bank_account_id || '',
      invoice_id: '',
      liability_type: '',
      principal_amount: '',
      interest_amount: '',
      upi_reference: ''
    });
    setEditDialog({ open: true, transaction: transactionWithType });
  };

  const handleDeleteWithdrawal = async (withdrawal: Withdrawal) => {
    try {
      const response = await fetch(`/api/finance/withdrawals/${withdrawal.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast.success('Withdrawal deleted successfully');
        await fetchWithdrawals();
        setLoadedTabs(prev => new Set(prev).add('withdrawals'));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete withdrawal');
      }
    } catch (error) {
      console.error('Error deleting withdrawal:', error);
      toast.error('Error deleting withdrawal');
    }
  };

  // New separate functions for investment operations
  const handleEditInvestment = async (investment: Investment) => {
    const transactionWithType: TransactionWithType = {
      ...investment,
      transaction_type: 'investment'
    };
    // Populate edit form
    setEditForm({
      amount: investment.amount.toString(),
      date: investment.date || '',
      description: investment.description || '',
      reference_number: investment.reference_number || '',
      payment_method: investment.payment_method || '',
      category: investment.category || '',
      category_id: '', // Not available in current interface
      method: '',
      bank_account_id: '', // Not available in current interface
      invoice_id: '',
      liability_type: '',
      principal_amount: '',
      interest_amount: '',
      upi_reference: ''
    });
    setEditDialog({ open: true, transaction: transactionWithType });
  };

  const handleDeleteInvestment = async (investment: Investment) => {
    try {
      const response = await fetch(`/api/finance/investments/${investment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast.success('Investment deleted successfully');
        await fetchInvestments();
        setLoadedTabs(prev => new Set(prev).add('investments'));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete investment');
      }
    } catch (error) {
      console.error('Error deleting investment:', error);
      toast.error('Error deleting investment');
    }
  };

  // Liability operations
  const handleEditLiability = async (liability: Liability) => {
    const transactionWithType: TransactionWithType = {
      ...liability,
      amount: liability.total_amount, // Map total_amount to amount
      transaction_type: 'liability'
    };
    // Populate edit form with liability fields
    setEditForm({
      amount: liability.total_amount.toString(),
      date: liability.date || '',
      description: liability.description || '',
      reference_number: liability.reference_number || '',
      payment_method: liability.payment_method || '',
      category: liability.liability_type || '',
      category_id: liability.loan_id?.toString() || '',
      method: '',
      bank_account_id: liability.bank_account_id || '',
      invoice_id: '',
      liability_type: liability.liability_type || '',
      principal_amount: liability.principal_amount.toString() || '',
      interest_amount: liability.interest_amount.toString() || '',
      upi_reference: liability.upi_reference || ''
    });
    setEditDialog({ open: true, transaction: transactionWithType });
  };

  const handleDeleteLiability = async (liability: Liability) => {
    try {
      const response = await fetch(`/api/finance/liability-payments?id=${liability.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast.success('Liability payment deleted successfully');
        await fetchLiabilities();
        setLoadedTabs(prev => new Set(prev).add('liabilities'));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete liability payment');
      }
    } catch (error) {
      console.error('Error deleting liability payment:', error);
      toast.error('Error deleting liability payment');
    }
  };

  // Update functions for edit functionality
  const handleUpdateWithdrawal = async () => {
    if (!editDialog.transaction) return;
    
    setEditLoading(true);
    try {
      const response = await fetch('/api/finance/withdrawals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editDialog.transaction.id,
          amount: parseFloat(editForm.amount),
          withdrawal_date: editForm.date,
          description: editForm.description,
          payment_method: editForm.payment_method,
          reference_number: editForm.reference_number,
          category_id: editForm.category_id ? parseInt(editForm.category_id) : null
        })
      });

      if (response.ok) {
        toast.success('Withdrawal updated successfully');
        toast.info('Note: Journal entries may need manual reconciliation', { duration: 5000 });
        setEditDialog({ open: false });
        await fetchWithdrawals();
        setLoadedTabs(prev => new Set(prev).add('withdrawals'));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update withdrawal');
      }
    } catch (error) {
      console.error('Error updating withdrawal:', error);
      toast.error('Error updating withdrawal');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdateInvestment = async () => {
    if (!editDialog.transaction) return;
    
    setEditLoading(true);
    try {
      const response = await fetch('/api/finance/investments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editDialog.transaction.id,
          amount: parseFloat(editForm.amount),
          investment_date: editForm.date,
          description: editForm.description,
          payment_method: editForm.payment_method,
          reference_number: editForm.reference_number,
          category_id: editForm.category_id ? parseInt(editForm.category_id) : null
        })
      });

      if (response.ok) {
        toast.success('Investment updated successfully');
        toast.info('Note: Journal entries may need manual reconciliation', { duration: 5000 });
        setEditDialog({ open: false });
        await fetchInvestments();
        setLoadedTabs(prev => new Set(prev).add('investments'));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update investment');
      }
    } catch (error) {
      console.error('Error updating investment:', error);
      toast.error('Error updating investment');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdateLiability = async () => {
    if (!editDialog.transaction) return;
    
    setEditLoading(true);
    try {
      // Parse amounts
      const totalAmount = parseFloat(editForm.amount);
      const loanId = editForm.category_id ? parseInt(editForm.category_id) : null;

      const response = await fetch('/api/finance/liability-payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editDialog.transaction.id,
          date: editForm.date,
          liability_type: editForm.category,
          loan_id: loanId,
          total_amount: totalAmount,
          principal_amount: totalAmount * 0.8, // Rough split, could be improved
          interest_amount: totalAmount * 0.2,
          description: editForm.description,
          payment_method: editForm.payment_method,
          bank_account_id: editForm.bank_account_id,
          reference_number: editForm.reference_number
        })
      });

      if (response.ok) {
        toast.success('Liability payment updated successfully');
        toast.info('Note: Journal entries may need manual reconciliation', { duration: 5000 });
        setEditDialog({ open: false });
        await fetchLiabilities();
        setLoadedTabs(prev => new Set(prev).add('liabilities'));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update liability payment');
      }
    } catch (error) {
      console.error('Error updating liability payment:', error);
      toast.error('Error updating liability payment');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!editDialog.transaction) return;
    
    setEditLoading(true);
    try {
      const response = await fetch(`/api/finance/payments/${editDialog.transaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(editForm.amount),
          payment_date: editForm.date,
          description: editForm.description,
          method: editForm.method,
          reference: editForm.reference_number,
          bank_account_id: editForm.bank_account_id
        })
      });

      if (response.ok) {
        toast.success('Payment updated successfully');
        toast.info('Note: Journal entries may need manual reconciliation', { duration: 5000 });
        setEditDialog({ open: false });
        await fetchPayments();
        setLoadedTabs(prev => new Set(prev).add('payments'));
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update payment');
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Error updating payment');
    } finally {
      setEditLoading(false);
    }
  };

  const confirmDeletion = async () => {
    if (!deletionDialog.confirmation) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/finance/payments/${deletionDialog.confirmation.payment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Payment deleted successfully');
        
        // Refresh payments list
        await fetchPayments();
        setLoadedTabs(prev => new Set(prev).add('payments'));
        
        // Close dialog
        setDeletionDialog({ open: false });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('Error deleting payment');
    } finally {
      setDeleting(false);
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

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Render functions for each table type
  const renderPaymentsTable = () => {
    const filteredPayments = payments.filter(payment => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        payment.reference?.toLowerCase().includes(searchLower) ||
        payment.method.toLowerCase().includes(searchLower) ||
        payment.description?.toLowerCase().includes(searchLower) ||
        payment.customer_name?.toLowerCase().includes(searchLower) ||
        payment.customer_phone?.toLowerCase().includes(searchLower) ||
        payment.customer_email?.toLowerCase().includes(searchLower) ||
        payment.invoice_id.toLowerCase().includes(searchLower) ||
        payment.amount.toString().includes(searchTerm) ||
        payment.id.toLowerCase().includes(searchLower)
      );
    });

    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Invoice ID</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-4 text-gray-600">Loading payments...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginatedPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              paginatedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {formatDate(payment.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      {payment.customer_name || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    {getPaymentMethodBadge(payment.method)}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {payment.reference || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="font-mono text-xs">
                        {payment.invoice_id?.slice(0, 8)}...
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPayment(payment)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeletePayment(payment)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {filteredPayments.length > itemsPerPage && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPayments.length)} of {filteredPayments.length} payments
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWithdrawalsTable = () => {
    const filteredWithdrawals = withdrawals.filter(withdrawal => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        withdrawal.reference?.toLowerCase().includes(searchLower) ||
        withdrawal.category.toLowerCase().includes(searchLower) ||
        withdrawal.description?.toLowerCase().includes(searchLower) ||
        withdrawal.bank_account_name?.toLowerCase().includes(searchLower) ||
        withdrawal.amount.toString().includes(searchTerm) ||
        withdrawal.id.toLowerCase().includes(searchLower)
      );
    });

    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Bank Account</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-4 text-gray-600">Loading withdrawals...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredWithdrawals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No withdrawals found
                </TableCell>
              </TableRow>
            ) : (
              filteredWithdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {formatDate(withdrawal.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-red-100 text-red-800">
                      {withdrawal.category_name || withdrawal.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-red-600">
                    {formatCurrency(withdrawal.amount)}
                  </TableCell>
                  <TableCell>
                    {withdrawal.bank_account_name || 'N/A'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {withdrawal.reference || 'N/A'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {withdrawal.description || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditWithdrawal(withdrawal)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteWithdrawal(withdrawal)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderInvestmentsTable = () => {
    const filteredInvestments = investments.filter(investment => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        investment.reference_number?.toLowerCase().includes(searchLower) ||
        investment.category?.toLowerCase().includes(searchLower) ||
        investment.payment_method?.toLowerCase().includes(searchLower) ||
        investment.description?.toLowerCase().includes(searchLower) ||
        investment.bank_account_name?.toLowerCase().includes(searchLower) ||
        investment.amount.toString().includes(searchTerm) ||
        investment.id.toLowerCase().includes(searchLower)
      );
    });

    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Investment Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Bank Account</TableHead>
              <TableHead>Expected Return</TableHead>
              <TableHead>Maturity Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-4 text-gray-600">Loading investments...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredInvestments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No investments found
                </TableCell>
              </TableRow>
            ) : (
              filteredInvestments.map((investment) => (
                <TableRow key={investment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {formatDate(investment.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800">
                      {investment.category || 'Uncategorized'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-blue-600">
                    {formatCurrency(investment.amount)}
                  </TableCell>
                  <TableCell>
                    {investment.bank_account_name || 'N/A'}
                  </TableCell>
                  <TableCell className="text-green-600">
                    {investment.expected_return ? formatCurrency(investment.expected_return) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {investment.maturity_date ? formatDate(investment.maturity_date) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditInvestment(investment)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteInvestment(investment)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderLiabilitiesTable = () => {
    const filteredLiabilities = liabilities.filter(liability => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        liability.reference_number?.toLowerCase().includes(searchLower) ||
        liability.liability_type?.toLowerCase().includes(searchLower) ||
        liability.payment_method?.toLowerCase().includes(searchLower) ||
        liability.description?.toLowerCase().includes(searchLower) ||
        liability.bank_account_name?.toLowerCase().includes(searchLower) ||
        liability.loan_name?.toLowerCase().includes(searchLower) ||
        liability.loan_bank_name?.toLowerCase().includes(searchLower) ||
        liability.loan_number?.toLowerCase().includes(searchLower) ||
        liability.loan_account_code?.toLowerCase().includes(searchLower) ||
        liability.total_amount.toString().includes(searchTerm) ||
        liability.id.toLowerCase().includes(searchLower)
      );
    });

    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Loan Account</TableHead>
              <TableHead>Liability Type</TableHead>
              <TableHead>Principal</TableHead>
              <TableHead>Interest</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Bank Account</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-4 text-gray-600">Loading liability payments...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredLiabilities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No liability payments found
                </TableCell>
              </TableRow>
            ) : (
              filteredLiabilities.map((liability) => (
                <TableRow key={liability.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {formatDate(liability.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {liability.loan_name || 'Direct Payment'}
                      </div>
                      {liability.loan_bank_name && (
                        <div className="text-xs text-gray-500">
                          {liability.loan_bank_name}
                        </div>
                      )}
                      {liability.loan_number && (
                        <div className="text-xs text-gray-500">
                          Loan #: {liability.loan_number}
                        </div>
                      )}
                      {liability.loan_account_code && (
                        <Badge variant="secondary" className="text-xs">
                          {liability.loan_account_code}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-orange-100 text-orange-800">
                      {liability.liability_type || 'General'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-gray-700">
                    {formatCurrency(liability.principal_amount)}
                  </TableCell>
                  <TableCell className="font-medium text-red-600">
                    {formatCurrency(liability.interest_amount)}
                  </TableCell>
                  <TableCell className="font-semibold text-red-600">
                    {formatCurrency(liability.total_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {liability.payment_method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {liability.bank_account_name || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditLiability(liability)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteLiability(liability)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Transaction Manager
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search transactions by customer, reference, method, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Button 
              onClick={() => fetchTabData(activeTab, true)} 
              disabled={loading} 
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'payments' | 'withdrawals' | 'investments' | 'liabilities')} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payments {loading && activeTab === 'payments' ? '(...)' : `(${payments.length})`}
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Withdrawals {loading && activeTab === 'withdrawals' ? '(...)' : `(${withdrawals.length})`}
              </TabsTrigger>
              <TabsTrigger value="investments" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Investments {loading && activeTab === 'investments' ? '(...)' : `(${investments.length})`}
              </TabsTrigger>
              <TabsTrigger value="liabilities" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Liabilities {loading && activeTab === 'liabilities' ? '(...)' : `(${liabilities.length})`}
              </TabsTrigger>
            </TabsList>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-4">
              {renderPaymentsTable()}
            </TabsContent>

            {/* Withdrawals Tab */}
            <TabsContent value="withdrawals" className="space-y-4">
              {renderWithdrawalsTable()}
            </TabsContent>

            {/* Investments Tab */}
            <TabsContent value="investments" className="space-y-4">
              {renderInvestmentsTable()}
            </TabsContent>

            {/* Liabilities Tab */}
            <TabsContent value="liabilities" className="space-y-4">
              {renderLiabilitiesTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-blue-500" />
              Edit {editDialog.transaction?.transaction_type?.charAt(0).toUpperCase() + (editDialog.transaction?.transaction_type?.slice(1) || '')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Amount Field */}
            <div>
              <Label htmlFor="edit-amount">Amount *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={editForm.amount}
                onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>

            {/* Date Field */}
            <div>
              <Label htmlFor="edit-date">Date *</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            {/* Description Field */}
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                type="text"
                placeholder="Enter description"
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Reference Number Field */}
            <div>
              <Label htmlFor="edit-reference">Reference Number</Label>
              <Input
                id="edit-reference"
                type="text"
                placeholder="Enter reference number"
                value={editForm.reference_number}
                onChange={(e) => setEditForm(prev => ({ ...prev, reference_number: e.target.value }))}
              />
            </div>

            {/* Payment Method Field - for withdrawals and investments */}
            {editDialog.transaction?.transaction_type !== 'payment' && (
              <div>
                <Label htmlFor="edit-payment-method">Payment Method</Label>
                <Input
                  id="edit-payment-method"
                  type="text"
                  placeholder="Enter payment method"
                  value={editForm.payment_method}
                  onChange={(e) => setEditForm(prev => ({ ...prev, payment_method: e.target.value }))}
                />
              </div>
            )}

            {/* Method Field - for payments only */}
            {editDialog.transaction?.transaction_type === 'payment' && (
              <div>
                <Label htmlFor="edit-method">Method</Label>
                <Input
                  id="edit-method"
                  type="text"
                  placeholder="Enter method"
                  value={editForm.method}
                  onChange={(e) => setEditForm(prev => ({ ...prev, method: e.target.value }))}
                />
              </div>
            )}

            {/* Category Field - for withdrawals and investments */}
            {editDialog.transaction?.transaction_type !== 'payment' && (
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  type="text"
                  placeholder="Enter category"
                  value={editForm.category}
                  onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
            )}

            {/* Bank Account ID Field - for payments */}
            {editDialog.transaction?.transaction_type === 'payment' && (
              <div>
                <Label htmlFor="edit-bank-account">Bank Account ID</Label>
                <Input
                  id="edit-bank-account"
                  type="text"
                  placeholder="Enter bank account ID"
                  value={editForm.bank_account_id}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bank_account_id: e.target.value }))}
                />
              </div>
            )}

            {/* Liability-specific fields */}
            {editDialog.transaction?.transaction_type === 'liability' && (
              <>
                <div>
                  <Label htmlFor="edit-liability-type">Liability Type *</Label>
                  <Input
                    id="edit-liability-type"
                    type="text"
                    placeholder="Enter liability type"
                    value={editForm.liability_type}
                    onChange={(e) => setEditForm(prev => ({ ...prev, liability_type: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-principal-amount">Principal Amount</Label>
                  <Input
                    id="edit-principal-amount"
                    type="number"
                    step="0.01"
                    placeholder="Enter principal amount"
                    value={editForm.principal_amount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, principal_amount: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-interest-amount">Interest Amount</Label>
                  <Input
                    id="edit-interest-amount"
                    type="number"
                    step="0.01"
                    placeholder="Enter interest amount"
                    value={editForm.interest_amount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, interest_amount: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-loan-id">Loan ID</Label>
                  <Input
                    id="edit-loan-id"
                    type="number"
                    placeholder="Enter loan ID"
                    value={editForm.category_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category_id: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-upi-reference">UPI Reference</Label>
                  <Input
                    id="edit-upi-reference"
                    type="text"
                    placeholder="Enter UPI reference"
                    value={editForm.upi_reference}
                    onChange={(e) => setEditForm(prev => ({ ...prev, upi_reference: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-liability-bank-account">Bank Account ID</Label>
                  <Input
                    id="edit-liability-bank-account"
                    type="text"
                    placeholder="Enter bank account ID"
                    value={editForm.bank_account_id}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bank_account_id: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditDialog({ open: false })}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editDialog.transaction?.transaction_type === 'withdrawal') {
                  handleUpdateWithdrawal();
                } else if (editDialog.transaction?.transaction_type === 'investment') {
                  handleUpdateInvestment();
                } else if (editDialog.transaction?.transaction_type === 'payment') {
                  handleUpdatePayment();
                } else if (editDialog.transaction?.transaction_type === 'liability') {
                  handleUpdateLiability();
                }
              }}
              disabled={editLoading || !editForm.amount || !editForm.date}
            >
              {editLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion Confirmation Dialog */}
      <Dialog open={deletionDialog.open} onOpenChange={(open) => setDeletionDialog({ open })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Payment Deletion
            </DialogTitle>
          </DialogHeader>

          {deletionDialog.confirmation && (
            <div className="space-y-6">
              {/* Payment Details */}
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-lg">Payment to be Deleted</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Customer</Label>
                      <p className="text-sm">{deletionDialog.confirmation.payment.customer_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Amount</Label>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(deletionDialog.confirmation.payment.amount)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Method</Label>
                      <p className="text-sm">{deletionDialog.confirmation.payment.method}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Date</Label>
                      <p className="text-sm">{formatDate(deletionDialog.confirmation.payment.date)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Reference</Label>
                      <p className="text-sm">{deletionDialog.confirmation.payment.reference || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Invoice ID</Label>
                      <p className="text-sm font-mono">{deletionDialog.confirmation.payment.invoice_id?.slice(0, 8)}...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Related Entries that will be affected */}
              <Card className="border-orange-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Related Entries (will be deleted/updated)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Journal Entries */}
                  {deletionDialog.confirmation.relatedEntries.journalEntries.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-orange-600">Journal Entries to be Deleted:</Label>
                      <div className="mt-2 space-y-2">
                        {deletionDialog.confirmation.relatedEntries.journalEntries.map((entry) => (
                          <div key={entry.id} className="p-3 bg-orange-50 rounded border border-orange-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{entry.journal_number}</p>
                                <p className="text-sm text-gray-600">{entry.description}</p>
                                <p className="text-xs text-gray-500">Date: {formatDate(entry.entry_date)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm">Dr: {formatCurrency(entry.total_debit)}</p>
                                <p className="text-sm">Cr: {formatCurrency(entry.total_credit)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bank Transactions */}
                  {deletionDialog.confirmation.relatedEntries.bankTransactions.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-orange-600">Bank Transactions to be Deleted:</Label>
                      <div className="mt-2 space-y-2">
                        {deletionDialog.confirmation.relatedEntries.bankTransactions.map((transaction) => (
                          <div key={transaction.id} className="p-3 bg-orange-50 rounded border border-orange-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{transaction.reference}</p>
                                <p className="text-sm text-gray-600">{transaction.description}</p>
                                <p className="text-xs text-gray-500">Date: {formatDate(transaction.date)}</p>
                                {transaction.bank_accounts && (
                                  <p className="text-xs text-blue-600 font-medium">
                                    Bank: {transaction.bank_accounts.name} 
                                    (Current Balance: {formatCurrency(transaction.bank_accounts.current_balance)})
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">{formatCurrency(transaction.amount)}</p>
                                <p className="text-xs text-orange-600">
                                  {transaction.type === 'deposit' ? 'Will decrease' : 'Will increase'} bank balance
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {deletionDialog.confirmation.relatedEntries.journalEntries.length === 0 && 
                   deletionDialog.confirmation.relatedEntries.bankTransactions.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No related journal entries or bank transactions found.</p>
                      <p className="text-sm">Only the payment record will be deleted.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Warning: This action cannot be undone</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Deleting this payment will:
                    </p>
                    <ul className="text-sm text-red-700 mt-2 list-disc list-inside space-y-1">
                      <li>Remove the payment record permanently</li>
                      <li>Delete associated journal entries and reverse chart of accounts balances</li>
                      <li>Delete associated bank transactions and update bank account balances</li>
                      <li>Update invoice status (may change from paid to partial/unpaid)</li>
                      <li>Affect financial reports and audit trails</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletionDialog({ open: false })}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeletion}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}