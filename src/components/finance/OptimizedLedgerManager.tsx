'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Save
} from 'lucide-react';

interface LedgerSummary {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'employee' | 'bank' | 'product';
  email?: string;
  phone?: string;
  total_transactions: number;
  total_amount: number;
  balance_due: number;
  last_transaction_date?: string;
  status?: string;
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
    limit: 50,
    total: 0,
    totalPages: 0,
    hasMore: false
  });

  // Transaction view state
  const [selectedLedger, setSelectedLedger] = useState<LedgerSummary | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // New ledger form state
  const [showNewLedgerDialog, setShowNewLedgerDialog] = useState(false);
  const [newLedgerForm, setNewLedgerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    type: activeTab as 'customer' | 'supplier' | 'employee'
  });

  // Adjustment form state
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'discount' as 'discount' | 'additional',
    amount: '',
    description: '',
    reference: ''
  });

  // Debounced search function
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

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
        limit: pagination.limit.toString(),
        type: type === 'all' ? 'all' : type,
        search: search,
        hide_zero_balances: hideZeroBalances.toString(),
        _t: Date.now().toString() // Cache busting
      });

      console.log('Fetching ledgers with params:', params.toString());

      const response = await fetch(`/api/finance/ledgers-summary?${params}`);
      const data = await response.json();

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
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      setLedgers([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, hideZeroBalances]);

  const fetchTransactions = async (ledger: LedgerSummary, page: number = 1) => {
    try {
      setTransactionsLoading(true);
      
      const params = new URLSearchParams({
        type: ledger.type,
        page: page.toString(),
        limit: '50',
        _t: Date.now().toString()
      });

      const response = await fetch(`/api/finance/ledgers/${ledger.id}?${params}`);
      const data = await response.json();

      if (data.success) {
        if (page === 1) {
          setTransactions(data.data);
        } else {
          setTransactions(prev => [...prev, ...data.data]);
        }
        // Note: Transaction pagination not needed for current implementation
      } else {
        console.error('Failed to fetch transactions:', data.error);
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleLedgerClick = (ledger: LedgerSummary) => {
    setSelectedLedger(ledger);
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

  // Debounced search effect
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchLedgers(1, activeTab, searchTerm, true);
    }, 300); // 300ms delay

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, activeTab, hideZeroBalances]);

  // Initial load on mount only
  useEffect(() => {
    fetchLedgers(1, 'customer', '', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setNewLedgerForm(prev => ({ ...prev, type: newTab as 'customer' | 'supplier' | 'employee' }));
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer': return <Users className="h-4 w-4 text-blue-600" />;
      case 'supplier': return <Building2 className="h-4 w-4 text-green-600" />;
      case 'employee': return <UserCheck className="h-4 w-4 text-purple-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (ledger: LedgerSummary) => {
    const isSettled = Math.abs(ledger.balance_due) < 0.10;
    return (
      <Badge 
        variant={isSettled ? 'outline' : 'destructive'}
        className="text-xs"
      >
        {isSettled ? 'Settled' : 'Outstanding'}
      </Badge>
    );
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{formatCurrency(selectedLedger.total_amount)}</div>
              <p className="text-xs text-muted-foreground">Total Amount</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(selectedLedger.balance_due)}</div>
              <p className="text-xs text-muted-foreground">Balance Due</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{selectedLedger.total_transactions}</div>
              <p className="text-xs text-muted-foreground">Total Transactions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{getStatusBadge(selectedLedger)}</div>
              <p className="text-xs text-muted-foreground">Status</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Transaction History</span>
              {transactionsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
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
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
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
              onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Performance Stats */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-900">{pagination.total}</p>
              <p className="text-sm text-blue-700">Total Ledgers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{ledgers.length}</p>
              <p className="text-sm text-blue-700">Loaded</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{pagination.page}</p>
              <p className="text-sm text-blue-700">Current Page</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{pagination.totalPages}</p>
              <p className="text-sm text-blue-700">Total Pages</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different ledger types */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
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
                   activeTab === 'supplier' ? 'Supplier Ledgers' : 'Employee Ledgers'}
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
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
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
                        <TableCell className="text-right font-mono">
                          {ledger.total_transactions}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(ledger.total_amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={ledger.balance_due > 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(ledger.balance_due)}
                          </span>
                        </TableCell>
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
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages} 
              ({pagination.total} total ledgers)
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
  );
}
