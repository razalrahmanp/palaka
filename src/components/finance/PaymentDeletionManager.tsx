'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Trash2, 
  AlertTriangle, 
  Calendar, 
  User, 
  FileText,
  RefreshCw,
  Search,
  AlertCircle
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
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletionDialog, setDeletionDialog] = useState<{
    open: boolean;
    confirmation?: DeletionConfirmation;
  }>({ open: false });
  const [deleting, setDeleting] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

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
        fetchPayments();
        
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter payments based on search term
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

  // Paginate filtered payments
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Payment Deletion Manager
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search payments by customer, reference, method, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Button onClick={fetchPayments} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="ml-4 text-gray-600">Loading payments...</p>
            </div>
          ) : (
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
                  {paginatedPayments.length === 0 ? (
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
          )}
        </CardContent>
      </Card>

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
