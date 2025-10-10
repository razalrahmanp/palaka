'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Users, 
  Building2, 
  UserCheck,
  Search,
  FileText,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  ArrowLeft,
  DollarSign,
  Save,
  CreditCard,
  HandCoins,
  Banknote,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface LedgerSummary {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'employee' | 'bank' | 'product' | 'investors' | 'loans';
  email?: string;
  phone?: string;
  total_transactions: number;
  total_amount: number;
  balance_due: number;
  last_transaction_date?: string;
  status?: string;
  // Payment details for customers
  paid_amount?: number;
  payment_methods?: string;
  bank_accounts?: string;
  last_payment_date?: string;
  // Additional supplier-specific fields
  opening_balance?: number;
  current_stock_value?: number;
  total_bills?: number;
  total_paid?: number;
  total_outstanding?: number;
  total_po_value?: number;
  pending_po_value?: number;
  paid_po_value?: number;
}

interface LedgerTransaction {
  id: string;
  date: string;
  description: string;
  reference_number?: string;
  transaction_type: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  source_document?: string;
  status?: string;
}

interface PartnerTransaction {
  id: string;
  date: string;
  type: 'investment' | 'withdrawal';
  amount: number;
  description: string;
  payment_method: string;
  reference_number?: string;
  upi_reference?: string;
  category?: string;
  subcategory?: string;
}

interface BankTransaction {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  reference: string;
  transaction_type?: 'bank_transaction' | 'vendor_payment' | 'withdrawal' | 'liability_payment';
}

interface LoanPayment {
  id: string;
  date: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  description: string;
  payment_method: string;
  reference_number?: string;
  upi_reference?: string;
}

interface TransactionRowProps {
  transaction: LedgerTransaction;
  formatDate: (date: string) => string;
  formatCurrency: (amount: number) => string;
  getTransactionTypeBadge: (type: string) => React.ReactNode;
}

// Memoized transaction row component for better performance
const TransactionRow = ({ 
  transaction, 
  formatDate, 
  formatCurrency,
  getTransactionTypeBadge 
}: TransactionRowProps) => (
  <TableRow>
    <TableCell>{formatDate(transaction.date)}</TableCell>
    <TableCell>{transaction.description}</TableCell>
    <TableCell className="font-mono text-xs">{transaction.reference_number}</TableCell>
    <TableCell>{getTransactionTypeBadge(transaction.transaction_type)}</TableCell>
    <TableCell className="text-right font-mono">
      {transaction.debit_amount > 0 ? formatCurrency(transaction.debit_amount) : '-'}
    </TableCell>
    <TableCell className="text-right font-mono">
      {transaction.credit_amount > 0 ? formatCurrency(transaction.credit_amount) : '-'}
    </TableCell>
    <TableCell className="text-right font-mono">
      {formatCurrency(transaction.balance)}
    </TableCell>
    <TableCell>
      <Badge variant="outline" className="text-xs capitalize">
        {transaction.status}
      </Badge>
    </TableCell>
  </TableRow>
);

const MemoizedTransactionRow = memo(TransactionRow);
MemoizedTransactionRow.displayName = 'MemoizedTransactionRow';

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function OptimizedLedgerManager() {
  const [ledgers, setLedgers] = useState<LedgerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('customer');
  const [hideZeroBalances, setHideZeroBalances] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasMore: false
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Transaction view state
  const [selectedLedger, setSelectedLedger] = useState<LedgerSummary | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionSort, setTransactionSort] = useState<'newest' | 'oldest'>('newest');
  const [transactionItemsPerPage, setTransactionItemsPerPage] = useState(25);
  const [transactionPagination, setTransactionPagination] = useState({ 
    page: 1, 
    totalPages: 1, 
    totalTransactions: 0 
  });
  
  // Add a ref for the latest abort controller to prevent overlapping requests
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // New ledger form state
  const [showNewLedgerDialog, setShowNewLedgerDialog] = useState(false);
  const [newLedgerForm, setNewLedgerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    type: activeTab as 'customer' | 'supplier' | 'employee' | 'investors' | 'loans' | 'banks'
  });

  // Adjustment form state
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'discount' as 'discount' | 'additional',
    amount: '',
    description: '',
    reference: ''
  });

  // Supplier-specific state
  const [showOpeningBalanceDialog, setShowOpeningBalanceDialog] = useState(false);
  const [showCurrentDebtDialog, setShowCurrentDebtDialog] = useState(false);
  const [openingBalanceForm, setOpeningBalanceForm] = useState({
    debit_amount: '',
    credit_amount: '',
    description: '',
    reference: ''
  });
  const [currentDebtForm, setCurrentDebtForm] = useState({
    amount: '',
    description: '',
    reference: '',
    due_date: ''
  });

  // Debounced search function
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Track if component is mounted to prevent state updates after unmount
  const isMounted = React.useRef(true);

  // Debug selectedLedger
  useEffect(() => {
    console.log('Selected ledger changed:', selectedLedger);
    console.log('Selected ledger type:', selectedLedger?.type);
  }, [selectedLedger]);
  
  // Cleanup effect to abort any pending requests when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear any pending timeouts
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const fetchLedgers = useCallback(async (
    page: number = 1,
    type: string = 'customer',
    search: string = '',
    resetData: boolean = true
  ) => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        type: type === 'all' ? 'all' : type,
        search: search,
        hide_zero_balances: hideZeroBalances.toString(),
        _t: Date.now().toString() // Cache busting
      });

      // Create a timeout to abort fetch if it takes too long
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      console.log('Fetching ledgers with params:', params.toString());

      const response = await fetch(`/api/finance/ledgers-summary?${params}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();

      // Only update state if component is still mounted
      if (isMounted.current) {
        if (data.success) {
          if (resetData || page === 1) {
            setLedgers(data.data);
          } else {
            // Append data for "load more" functionality
            setLedgers(prev => [...prev, ...data.data]);
          }
          setPagination(data.pagination);
        } else {
          console.error('Failed to fetch ledgers:', data.error);
          setLedgers([]);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching ledgers:', error);
        if (isMounted.current) {
          setLedgers([]);
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [itemsPerPage, hideZeroBalances]);

  const fetchTransactions = async (ledger: LedgerSummary, page: number = 1) => {
    try {
      // Cancel previous fetch if it's still in progress
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      setTransactionsLoading(true);
      
      let apiEndpoint = '';
      let paramKey = '';
      
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) abortControllerRef.current.abort();
      }, 15000); // 15 second timeout
      
      // Determine which API endpoint to use based on ledger type
      if (ledger.type === 'investors') {
        apiEndpoint = '/api/finance/partner-transactions';
        paramKey = 'partner_id';
      } else if (ledger.type === 'bank') {
        apiEndpoint = '/api/finance/bank-transactions';
        paramKey = 'bank_account_id';
      } else if (ledger.type === 'loans') {
        apiEndpoint = '/api/finance/loan-payments';
        paramKey = 'loan_id';
      } else {
        // Fall back to existing API for other types - OPTIMIZATION: Added cache control headers and timeout        
        const params = new URLSearchParams({
          type: ledger.type,
          page: page.toString(),
          limit: transactionItemsPerPage.toString(),
          sort_order: transactionSort === 'newest' ? 'desc' : 'asc',
          _t: Date.now().toString()
        });

        const response = await fetch(`/api/finance/ledgers/${ledger.id}?${params}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          signal: abortControllerRef.current.signal
        });
        
        clearTimeout(timeoutId);
        const data = await response.json();

        if (!isMounted.current) return;

        if (data.success) {
          setTransactions(data.data);
          // Update transaction pagination
          setTransactionPagination({
            page: page,
            totalPages: data.pagination?.totalPages || 1,
            totalTransactions: data.pagination?.total || data.data.length
          });
        } else {
          console.error('Failed to fetch transactions:', data.error);
          setTransactions([]);
          setTransactionPagination({
            page: 1,
            totalPages: 1,
            totalTransactions: 0
          });
        }
        return;
      }
      
      // Use the new detailed APIs for investors, banks, and loans
      const params = new URLSearchParams({
        [paramKey]: ledger.id,
        page: page.toString(),
        limit: transactionItemsPerPage.toString(),
        sort_order: transactionSort === 'newest' ? 'desc' : 'asc',
        _t: Date.now().toString()
      });

      const response = await fetch(`${apiEndpoint}?${params}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: abortControllerRef.current.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();

      if (data.success) {
        // Transform the detailed transaction data to match our interface
        let transformedTransactions: LedgerTransaction[] = [];
        
        if (ledger.type === 'investors') {
          transformedTransactions = data.data.transactions.map((tx: PartnerTransaction) => ({
            id: tx.id,
            date: tx.date,
            description: `${tx.type === 'investment' ? 'Investment' : 'Withdrawal'}: ${tx.description}`,
            reference_number: tx.reference_number || tx.upi_reference,
            transaction_type: tx.type,
            debit_amount: tx.type === 'withdrawal' ? tx.amount : 0,
            credit_amount: tx.type === 'investment' ? tx.amount : 0,
            balance: 0, // We'll calculate running balance if needed
            source_document: tx.category,
            status: 'completed'
          }));
        } else if (ledger.type === 'bank') {
          // Calculate running balance for bank transactions
          const currentBalance = data.data.bank_account.current_balance || 0;
          
          transformedTransactions = data.data.transactions.map((tx: BankTransaction, index: number) => {
            // Calculate balance by working backwards from current balance
            // First transaction is most recent, so we subtract all transactions after it
            let transactionBalance = currentBalance;
            for (let i = 0; i < index; i++) {
              const prevTx = data.data.transactions[i];
              if (prevTx.type === 'deposit') {
                transactionBalance -= prevTx.amount;
              } else {
                transactionBalance += prevTx.amount;
              }
            }

            return {
              id: tx.id,
              date: tx.date,
              description: tx.description,
              reference_number: tx.reference,
              transaction_type: tx.transaction_type || tx.type,
              debit_amount: tx.type === 'withdrawal' ? tx.amount : 0,
              credit_amount: tx.type === 'deposit' ? tx.amount : 0,
              balance: transactionBalance,
              source_document: tx.transaction_type === 'vendor_payment' ? 'Vendor Payment' :
                              tx.transaction_type === 'withdrawal' ? 'Owner Withdrawal' :
                              tx.transaction_type === 'liability_payment' ? 'Loan Payment' : 'Bank Transaction',
              status: 'completed'
            };
          });
        } else if (ledger.type === 'loans') {
          transformedTransactions = data.data.payments.map((tx: LoanPayment) => ({
            id: tx.id,
            date: tx.date,
            description: `Loan Payment: ${tx.description}`,
            reference_number: tx.reference_number || tx.upi_reference,
            transaction_type: 'payment',
            debit_amount: tx.total_amount,
            credit_amount: 0,
            balance: 0,
            source_document: `Principal: ₹${tx.principal_amount} | Interest: ₹${tx.interest_amount}`,
            status: 'completed'
          }));
        }
        
        if (page === 1) {
          setTransactions(transformedTransactions);
        } else {
          setTransactions(prev => [...prev, ...transformedTransactions]);
        }
      } else {
        console.error('Failed to fetch transactions:', data.error);
        setTransactions([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error fetching transactions:', error);
        if (isMounted.current) {
          setTransactions([]);
        }
      }
    } finally {
      if (isMounted.current) {
        setTransactionsLoading(false);
      }
    }
  };

  const handleLedgerClick = (ledger: LedgerSummary) => {
    setSelectedLedger(ledger);
    // Reset transaction pagination when selecting a new ledger
    setTransactionPagination({
      page: 1,
      totalPages: 1,
      totalTransactions: 0
    });
    // Reset to default values when switching ledgers
    setTransactionSort('newest');
    setTransactionItemsPerPage(25);
    fetchTransactions(ledger);
  };

  const handleCreateNewLedger = async () => {
    try {
      const tableName = newLedgerForm.type === 'customer' ? 'customers' : 
                       newLedgerForm.type === 'supplier' ? 'vendors' : 'employees';
      
      const response = await fetch(`/api/${tableName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLedgerForm)
      });

      if (response.ok) {
        setShowNewLedgerDialog(false);
        setNewLedgerForm({ name: '', email: '', phone: '', address: '', type: activeTab as 'customer' | 'supplier' | 'employee' });
        fetchLedgers(1, activeTab, searchTerm, true);
      }
    } catch (error) {
      console.error('Error creating new ledger:', error);
    }
  };

  const handleCreateAdjustment = async () => {
    if (!selectedLedger) return;

    try {
      const adjustmentData = {
        ledger_id: selectedLedger.id,
        ledger_type: selectedLedger.type,
        type: adjustmentForm.type,
        amount: parseFloat(adjustmentForm.amount),
        description: adjustmentForm.description,
        reference_number: adjustmentForm.reference,
        date: new Date().toISOString()
      };

      const response = await fetch('/api/finance/adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adjustmentData)
      });

      if (response.ok) {
        setShowAdjustmentDialog(false);
        setAdjustmentForm({ type: 'discount', amount: '', description: '', reference: '' });
        fetchTransactions(selectedLedger);
        fetchLedgers(pagination.page, activeTab, searchTerm, false);
      }
    } catch (error) {
      console.error('Error creating adjustment:', error);
    }
  };

  const handleCreateOpeningBalance = async () => {
    if (!selectedLedger) return;

    try {
      const openingBalanceData = {
        entity_id: selectedLedger.id,
        entity_type: selectedLedger.type,
        debit_amount: parseFloat(openingBalanceForm.debit_amount) || 0,
        credit_amount: parseFloat(openingBalanceForm.credit_amount) || 0,
        description: openingBalanceForm.description,
        reference_number: openingBalanceForm.reference
      };

      const response = await fetch('/api/finance/supplier-opening-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(openingBalanceData)
      });

      if (response.ok) {
        setShowOpeningBalanceDialog(false);
        setOpeningBalanceForm({ debit_amount: '', credit_amount: '', description: '', reference: '' });
        fetchTransactions(selectedLedger);
        fetchLedgers(pagination.page, activeTab, searchTerm, false);
      }
    } catch (error) {
      console.error('Error creating opening balance:', error);
    }
  };

  const handleCreateCurrentDebt = async () => {
    if (!selectedLedger || selectedLedger.type !== 'supplier') return;

    try {
      const vendorBillData = {
        supplier_id: selectedLedger.id,
        total_amount: parseFloat(currentDebtForm.amount),
        description: currentDebtForm.description,
        reference_number: currentDebtForm.reference,
        due_date: currentDebtForm.due_date,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const response = await fetch('/api/finance/vendor-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vendorBillData)
      });

      if (response.ok) {
        setShowCurrentDebtDialog(false);
        setCurrentDebtForm({ amount: '', description: '', reference: '', due_date: '' });
        fetchTransactions(selectedLedger);
        fetchLedgers(pagination.page, activeTab, searchTerm, false);
      }
    } catch (error) {
      console.error('Error creating vendor bill:', error);
    }
  };

  // Effect for tab and filter changes
  useEffect(() => {
    // Don't trigger on initial render
    if (ledgers.length === 0) {
      fetchLedgers(1, activeTab, searchTerm, true);
      return;
    }
    
    // Use debouncing for filter changes
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      if (isMounted.current) {
        fetchLedgers(1, activeTab, searchTerm, true);
      }
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hideZeroBalances]);

  // Initial load on mount only
  useEffect(() => {
    fetchLedgers(1, 'customer', '', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setNewLedgerForm(prev => ({ ...prev, type: newTab as 'customer' | 'supplier' | 'employee' | 'investors' | 'loans' | 'banks' }));
    setSelectedLedger(null); // Close transaction view
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleNextPage = () => {
    if (pagination.hasMore) {
      const nextPage = pagination.page + 1;
      fetchLedgers(nextPage, activeTab, searchTerm, false);
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      const prevPage = pagination.page - 1;
      fetchLedgers(prevPage, activeTab, searchTerm, true);
    }
  };

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  }, []);

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer': return <Users className="h-4 w-4 text-blue-600" />;
      case 'supplier': return <Building2 className="h-4 w-4 text-green-600" />;
      case 'employee': return <UserCheck className="h-4 w-4 text-purple-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (ledger: LedgerSummary) => {
    const status = ledger.status?.toLowerCase() || 'unknown';
    const balanceDue = ledger.balance_due || 0;
    
    if (status === 'paid' || balanceDue <= 0) {
      return (
        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
          Paid
        </Badge>
      );
    } else if (status === 'partial' && (ledger.paid_amount || 0) > 0) {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
          Partial
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="text-xs">
          Pending
        </Badge>
      );
    }
  };

  const getTransactionTypeBadge = (type: string) => {
    const variants = {
      'SALE': 'default',
      'PAYMENT': 'secondary',
      'DISCOUNT': 'outline',
      'WAIVER': 'outline',
      'VENDOR_PAYMENT': 'secondary',
      'SALARY': 'default'
    } as const;
    
    return (
      <Badge variant={variants[type as keyof typeof variants] || 'outline'} className="text-xs">
        {type}
      </Badge>
    );
  };

  // If a ledger is selected, show transaction view
  if (selectedLedger) {
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSelectedLedger(null)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Ledgers
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedLedger.name}</h2>
            <p className="text-gray-600 capitalize">{selectedLedger.type} Ledger Transactions</p>
          </div>
          <div className="ml-auto flex gap-2">
            {/* Customer and Supplier buttons */}
            {(selectedLedger.type === 'supplier' || selectedLedger.type === 'customer') && (
              <>
                <Dialog open={showOpeningBalanceDialog} onOpenChange={setShowOpeningBalanceDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Opening Balance
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Opening Balance</DialogTitle>
                      <DialogDescription>
                        Set the opening balance for {selectedLedger.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="debitAmount">
                            {selectedLedger.type === 'customer' ? 'Debit Amount (What customer owes us)' : 'Debit Amount (What they owe us)'}
                          </Label>
                          <Input
                            id="debitAmount"
                            type="number"
                            step="0.01"
                            value={openingBalanceForm.debit_amount}
                            onChange={(e) => setOpeningBalanceForm(prev => ({ ...prev, debit_amount: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="creditAmount">
                            {selectedLedger.type === 'customer' ? 'Credit Amount (What we owe customer)' : 'Credit Amount (What we owe them)'}
                          </Label>
                          <Input
                            id="creditAmount"
                            type="number"
                            step="0.01"
                            value={openingBalanceForm.credit_amount}
                            onChange={(e) => setOpeningBalanceForm(prev => ({ ...prev, credit_amount: e.target.value }))}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="obDescription">Description</Label>
                        <Textarea
                          id="obDescription"
                          value={openingBalanceForm.description}
                          onChange={(e) => setOpeningBalanceForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Opening balance as of..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="obReference">Reference</Label>
                        <Input
                          id="obReference"
                          value={openingBalanceForm.reference}
                          onChange={(e) => setOpeningBalanceForm(prev => ({ ...prev, reference: e.target.value }))}
                          placeholder="Reference number (optional)"
                        />
                      </div>
                      <Button onClick={handleCreateOpeningBalance} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        Set Opening Balance
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showCurrentDebtDialog} onOpenChange={setShowCurrentDebtDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {selectedLedger.type === 'customer' ? 'Add Outstanding Amount' : 'Add What We Owe'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {selectedLedger.type === 'customer' ? 'Add Outstanding Amount' : 'Add Current Debt'}
                      </DialogTitle>
                      <DialogDescription>
                        {selectedLedger.type === 'customer' 
                          ? `Record outstanding amount from ${selectedLedger.name}`
                          : `Record what we currently owe to ${selectedLedger.name}`
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="debtAmount">
                          {selectedLedger.type === 'customer' ? 'Outstanding Amount' : 'Amount We Owe'}
                        </Label>
                        <Input
                          id="debtAmount"
                          type="number"
                          step="0.01"
                          value={currentDebtForm.amount}
                          onChange={(e) => setCurrentDebtForm(prev => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="dueDate">
                          {selectedLedger.type === 'customer' ? 'Expected Payment Date' : 'Due Date'}
                        </Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={currentDebtForm.due_date}
                          onChange={(e) => setCurrentDebtForm(prev => ({ ...prev, due_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="debtDescription">Description</Label>
                        <Textarea
                          id="debtDescription"
                          value={currentDebtForm.description}
                          onChange={(e) => setCurrentDebtForm(prev => ({ ...prev, description: e.target.value }))}
                          placeholder={selectedLedger.type === 'customer' 
                            ? 'Sales details, invoice information...'
                            : 'Reason for debt, purchase details...'
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="debtReference">Reference/Invoice Number</Label>
                        <Input
                          id="debtReference"
                          value={currentDebtForm.reference}
                          onChange={(e) => setCurrentDebtForm(prev => ({ ...prev, reference: e.target.value }))}
                          placeholder="Invoice or reference number"
                        />
                      </div>
                      <Button onClick={handleCreateCurrentDebt} className="w-full">
                        <Save className="h-4 w-4 mr-2" />
                        {selectedLedger.type === 'customer' ? 'Add Outstanding Record' : 'Add Debt Record'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}

            <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Add Adjustment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Adjustment</DialogTitle>
                  <DialogDescription>
                    Add a discount or additional charge to this ledger
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="adjustmentType">Type</Label>
                    <Select value={adjustmentForm.type} onValueChange={(value: 'discount' | 'additional') => 
                      setAdjustmentForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="additional">Additional Charge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={adjustmentForm.amount}
                      onChange={(e) => setAdjustmentForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={adjustmentForm.description}
                      onChange={(e) => setAdjustmentForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Reason for adjustment..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      value={adjustmentForm.reference}
                      onChange={(e) => setAdjustmentForm(prev => ({ ...prev, reference: e.target.value }))}
                      placeholder="Reference number (optional)"
                    />
                  </div>
                  <Button onClick={handleCreateAdjustment} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Create Adjustment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Ledger summary */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-blue-50 to-white h-16">
            <CardContent className="p-2 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Amount</p>
                  <div className="text-sm font-bold text-blue-700">{formatCurrency(selectedLedger.total_amount)}</div>
                </div>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-blue-600 text-sm">💰</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-red-50 to-white h-16">
            <CardContent className="p-2 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Balance Due</p>
                  <div className="text-sm font-bold text-red-700">{formatCurrency(selectedLedger.balance_due)}</div>
                </div>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-red-600 text-sm">⚠️</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {selectedLedger.type === 'supplier' && (
            <>
              <Card className="border-l-4 border-l-indigo-500 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-indigo-50 to-white h-16">
                <CardContent className="p-2 h-full">
                  <div className="flex items-center justify-between h-full">
                    <div>
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Opening</p>
                      <div className="text-sm font-bold text-indigo-700">
                        {formatCurrency(selectedLedger.opening_balance || 0)}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-indigo-600 text-sm">🏦</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-green-50 to-white h-16">
                <CardContent className="p-2 h-full">
                  <div className="flex items-center justify-between h-full">
                    <div>
                      <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Stock Value</p>
                      <div className="text-sm font-bold text-green-700">
                        {formatCurrency(selectedLedger.current_stock_value || 0)}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-green-600 text-sm">📦</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          <Card className="border-l-4 border-l-gray-500 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-gray-50 to-white h-16">
            <CardContent className="p-2 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Transactions</p>
                  <div className="text-sm font-bold text-gray-700">{selectedLedger.total_transactions}</div>
                </div>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-gray-600 text-sm">📊</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional supplier information */}
        {selectedLedger.type === 'supplier' && (
          <>
            <div className="flex items-center gap-2 mt-3 mb-2">
              <div className="h-px bg-gradient-to-r from-gray-300 to-transparent flex-1"></div>
              <span className="text-xs font-semibold text-gray-600 px-2 bg-gray-50 rounded-full py-1">
                📊 Supplier Financial Breakdown
              </span>
              <div className="h-px bg-gradient-to-l from-gray-300 to-transparent flex-1"></div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-orange-50 to-white h-16">
                <CardContent className="p-2 h-full">
                  <div className="flex items-center justify-between h-full">
                    <div>
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Outstanding</p>
                      <div className="text-sm font-bold text-orange-700">
                        {formatCurrency(selectedLedger.total_outstanding || 0)}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-orange-600 text-sm">📄</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-purple-50 to-white h-16">
                <CardContent className="p-2 h-full">
                  <div className="flex items-center justify-between h-full">
                    <div>
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Total PO</p>
                      <div className="text-sm font-bold text-purple-700">
                        {formatCurrency(selectedLedger.total_po_value || 0)}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-purple-600 text-sm">🛒</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-amber-50 to-white h-16">
                <CardContent className="p-2 h-full">
                  <div className="flex items-center justify-between h-full">
                    <div>
                      <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Pending PO</p>
                      <div className="text-sm font-bold text-amber-700">
                        {formatCurrency(selectedLedger.pending_po_value || 0)}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-amber-600 text-sm">⏳</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-emerald-50 to-white h-16">
                <CardContent className="p-2 h-full">
                  <div className="flex items-center justify-between h-full">
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Total Paid</p>
                      <div className="text-sm font-bold text-emerald-700">
                        {formatCurrency(selectedLedger.total_paid || 0)}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-emerald-600 text-sm">✅</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-slate-500 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-slate-50 to-white h-16">
                <CardContent className="p-2 h-full">
                  <div className="flex items-center justify-between h-full">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Paid PO</p>
                      <div className="text-sm font-bold text-slate-700">
                        {formatCurrency(selectedLedger.paid_po_value || 0)}
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-slate-600 text-sm">💳</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Transactions table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <span>Transaction History</span>
                {transactionsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-1 text-xs"
                  onClick={() => {
                    const newSortOrder = transactionSort === 'newest' ? 'oldest' : 'newest';
                    setTransactionSort(newSortOrder);
                    fetchTransactions(selectedLedger!, 1);
                  }}
                >
                  {transactionSort === 'newest' ? (
                    <>Newest First <ArrowUp className="h-3 w-3" /></>
                  ) : (
                    <>Oldest First <ArrowDown className="h-3 w-3" /></>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {transactionsLoading && transactions.length === 0 ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.length > 0 ? (
                      transactions.map((transaction) => (
                        <MemoizedTransactionRow 
                          key={transaction.id} 
                          transaction={transaction} 
                          formatDate={formatDate} 
                          formatCurrency={formatCurrency}
                          getTransactionTypeBadge={getTransactionTypeBadge}
                        />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            
            {/* Transaction Pagination Controls */}
            <div className="flex justify-between items-center p-4 border-t bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Items per page:</span>
                <Select
                  value={transactionItemsPerPage.toString()}
                  onValueChange={(value) => {
                    const newLimit = parseInt(value);
                    setTransactionItemsPerPage(newLimit);
                    if (selectedLedger) {
                      fetchTransactions(selectedLedger, 1);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-1 text-sm font-medium">
                <span>Page {transactionPagination.page} of {transactionPagination.totalPages}</span>
                <Badge variant="outline" className="ml-2">
                  {transactionPagination.totalTransactions} total transactions
                </Badge>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    if (selectedLedger && transactionPagination.page > 1) {
                      fetchTransactions(selectedLedger, transactionPagination.page - 1);
                    }
                  }}
                  disabled={transactionPagination.page <= 1 || transactionsLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (selectedLedger && transactionPagination.page < transactionPagination.totalPages) {
                      fetchTransactions(selectedLedger, transactionPagination.page + 1);
                    }
                  }}
                  disabled={transactionPagination.page >= transactionPagination.totalPages || transactionsLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-screen overflow-hidden flex flex-col">
      {/* Header and Controls */}
      <div className="flex-none">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ledger Management</h2>
            <p className="text-gray-600">Fast overview of all ledger accounts</p>
          </div>
        
          <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search ledgers..."
              value={searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setSearchTerm(value);
                
                // Clear existing timeout
                if (searchTimeout) {
                  clearTimeout(searchTimeout);
                }
                
                // Skip API call if search term is cleared and we already have ledgers
                if (!value && ledgers.length > 0) {
                  return;
                }
                
                // Debounce search with 500ms delay
                const timeout = setTimeout(() => {
                  if (isMounted.current) {
                    fetchLedgers(1, activeTab, value, true);
                  }
                }, 500);
                
                setSearchTimeout(timeout);
              }}
              className="pl-10 w-64"
            />
          </div>
          
          <Button
            variant={hideZeroBalances ? "default" : "outline"}
            size="sm"
            onClick={() => setHideZeroBalances(!hideZeroBalances)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Hide Zero
          </Button>

          <Dialog open={showNewLedgerDialog} onOpenChange={setShowNewLedgerDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Ledger
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Ledger</DialogTitle>
                <DialogDescription>
                  Add a new {activeTab} to your ledger system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newLedgerForm.name}
                    onChange={(e) => setNewLedgerForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={`${activeTab} name`}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newLedgerForm.email}
                    onChange={(e) => setNewLedgerForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newLedgerForm.phone}
                    onChange={(e) => setNewLedgerForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={newLedgerForm.address}
                    onChange={(e) => setNewLedgerForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Full address..."
                  />
                </div>
                <Button onClick={handleCreateNewLedger} className="w-full" disabled={!newLedgerForm.name}>
                  <Save className="h-4 w-4 mr-2" />
                  Create Ledger
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </div>

      {/* Performance Stats */}
      <Card className="bg-blue-50 border-blue-200 h-20">
        <CardContent className="p-3 h-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center h-full items-center">
            <div>
              <p className="text-lg font-bold text-blue-900">{pagination.total}</p>
              <p className="text-xs text-blue-700">Total Ledgers</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-900">{ledgers.length}</p>
              <p className="text-xs text-blue-700">Loaded</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-900">{pagination.page}</p>
              <p className="text-xs text-blue-700">Current Page</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-900">{pagination.totalPages}</p>
              <p className="text-xs text-blue-700">Total Pages</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different ledger types */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="customer" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="supplier" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="employee" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="investors" className="flex items-center gap-2">
            <HandCoins className="h-4 w-4" />
            Investors/Partners
          </TabsTrigger>
          <TabsTrigger value="loans" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Loans
          </TabsTrigger>
          <TabsTrigger value="banks" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Banks
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Ledgers Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {activeTab === 'all' ? 'All Ledgers' : 
                   activeTab === 'customer' ? 'Customer Ledgers' :
                   activeTab === 'supplier' ? 'Supplier Ledgers' : 
                   activeTab === 'employee' ? 'Employee Ledgers' :
                   activeTab === 'investors' ? 'Investors/Partners Ledgers' :
                   activeTab === 'loans' ? 'Loans Ledgers' :
                   activeTab === 'banks' ? 'Banks Ledgers' : 'Ledgers'}
                </span>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                Showing {ledgers.length} of {pagination.total} ledgers
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      {(activeTab === 'customer' || activeTab === 'employee' || activeTab === 'all') && (
                        <>
                          <TableHead className="text-right">Transactions</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-right">Paid Amount</TableHead>
                          <TableHead className="text-right">Balance Due</TableHead>
                          {activeTab === 'customer' && (
                            <>
                              <TableHead>Payment Methods</TableHead>
                              <TableHead>Bank Accounts</TableHead>
                              <TableHead>Last Payment</TableHead>
                            </>
                          )}
                        </>
                      )}
                      {activeTab === 'supplier' && (
                        <>
                          <TableHead className="text-right">Transactions</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-right">Balance Due</TableHead>
                          <TableHead className="text-right">Opening Balance</TableHead>
                          <TableHead className="text-right">Stock Value</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead className="text-right">Total POs</TableHead>
                          <TableHead className="text-right">Pending POs</TableHead>
                        </>
                      )}
                      <TableHead>Last Transaction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgers.map((ledger) => (
                      <TableRow key={ledger.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(ledger.type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{ledger.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{ledger.type}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {ledger.email && <p className="truncate max-w-32">{ledger.email}</p>}
                            {ledger.phone && <p>{ledger.phone}</p>}
                          </div>
                        </TableCell>
                        {(activeTab === 'customer' || activeTab === 'employee' || activeTab === 'all') && (
                          <>
                            <TableCell className="text-right font-mono">
                              {ledger.total_transactions || 0}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(ledger.total_amount || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className="text-green-600">
                                {formatCurrency(ledger.paid_amount || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={(ledger.balance_due || 0) > 0 ? 'text-red-600' : 'text-green-600'}>
                                {formatCurrency(ledger.balance_due || 0)}
                              </span>
                            </TableCell>
                            {activeTab === 'customer' && (
                              <>
                                <TableCell className="text-sm max-w-32">
                                  <span className="truncate block" title={ledger.payment_methods}>
                                    {ledger.payment_methods || 'No payments'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm max-w-40">
                                  <span className="truncate block" title={ledger.bank_accounts}>
                                    {ledger.bank_accounts || 'No bank records'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {ledger.last_payment_date ? formatDate(ledger.last_payment_date) : 'No payments'}
                                </TableCell>
                              </>
                            )}
                          </>
                        )}
                        {activeTab === 'supplier' && (
                          <>
                            <TableCell className="text-right font-mono">
                              {ledger.total_transactions || 0}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(ledger.total_amount || 0)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={(ledger.balance_due || 0) > 0 ? 'text-red-600' : 'text-green-600'}>
                                {formatCurrency(ledger.balance_due || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className="text-blue-600">
                                {formatCurrency(ledger.opening_balance || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className="text-green-600">
                                {formatCurrency(ledger.current_stock_value || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className="text-orange-600">
                                {formatCurrency(ledger.total_outstanding || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className="text-purple-600">
                                {formatCurrency(ledger.total_po_value || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className="text-amber-600">
                                {formatCurrency(ledger.pending_po_value || 0)}
                              </span>
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-sm">
                          {formatDate(ledger.last_transaction_date)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(ledger)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="View transactions"
                            onClick={() => handleLedgerClick(ledger)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {ledgers.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No ledgers found</p>
                  <p className="text-sm">Try adjusting your search or filters</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span>Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    setItemsPerPage(newLimit);
                    fetchLedgers(1, activeTab, searchTerm, true);
                  }}
                  className="border rounded px-2 py-1 text-sm"
                  title="Items per page"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div>
                Page {pagination.page} of {pagination.totalPages} 
                ({pagination.total} total ledgers)
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={pagination.page <= 1 || loading}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={!pagination.hasMore || loading}
                className="flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>
        </Tabs>
        </div>
      </div>
    </div>
  );
}
