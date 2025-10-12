'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  FileText,
  Filter,
  Download,
  RefreshCw,
  PlusCircle,
  Search,
  Banknote,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// ================================================================================================
// TYPES AND INTERFACES
// ================================================================================================

interface CashTransaction {
  id: string;
  transaction_date: string;
  amount: number;
  transaction_type: 'DEBIT' | 'CREDIT';
  description: string;
  reference_number?: string;
  source_type: string;
  source_id?: string;
  running_balance: number;
  notes?: string;
  created_at: string;
  cash_account_name: string;
  cash_account_number?: string;
  created_by_name?: string;
  source_description: string;
}

interface CashBalance {
  cash_account_id: string;
  current_balance: number;
  cash_account_name: string;
  last_updated: string;
}

interface CashAccount {
  id: string;
  name: string;
  account_number?: string;
  current_balance: number;
  is_active: boolean;
}

interface ManualTransactionForm {
  amount: string;
  transaction_type: 'DEBIT' | 'CREDIT';
  description: string;
  reference_number: string;
  cash_account_id: string;
  notes: string;
  transaction_date: string;
}

// ================================================================================================
// MAIN COMPONENT
// ================================================================================================

export function CashLedgerManager() {
  // ========== STATE MANAGEMENT ==========
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [cashBalances, setCashBalances] = useState<CashBalance[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCashBalance, setTotalCashBalance] = useState(0);
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedSourceType, setSelectedSourceType] = useState<string>('all');
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Manual transaction form
  const [showManualTransaction, setShowManualTransaction] = useState(false);
  const [manualTransactionLoading, setManualTransactionLoading] = useState(false);
  const [manualForm, setManualForm] = useState<ManualTransactionForm>({
    amount: '',
    transaction_type: 'DEBIT',
    description: '',
    reference_number: '',
    cash_account_id: '',
    notes: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });

  // ========== DATA FETCHING ==========
  
  const fetchCashAccounts = async () => {
    try {
      const response = await fetch('/api/finance/cash-accounts');
      if (response.ok) {
        const data = await response.json();
        setCashAccounts(data.accounts || []);
        setTotalCashBalance(data.total_balance || 0);
      }
    } catch (error) {
      console.error('Error fetching cash accounts:', error);
      toast.error('Failed to load cash accounts');
    }
  };

  const fetchCashBalances = async () => {
    try {
      const response = await fetch('/api/finance/cash-balances');
      if (response.ok) {
        const data = await response.json();
        setCashBalances(data.balances || []);
      }
    } catch (error) {
      console.error('Error fetching cash balances:', error);
      toast.error('Failed to load cash balances');
    }
  };

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      
      if (selectedAccount !== 'all') params.append('cash_account_id', selectedAccount);
      if (selectedSourceType !== 'all') params.append('source_type', selectedSourceType);
      if (selectedTransactionType !== 'all') params.append('transaction_type', selectedTransactionType);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/finance/cash-transactions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setTotalPages(data.total_pages || 1);
      } else {
        toast.error('Failed to load transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, selectedAccount, selectedSourceType, selectedTransactionType, dateFrom, dateTo, searchTerm]);

  // ========== EFFECTS ==========
  
  useEffect(() => {
    fetchCashAccounts();
    fetchCashBalances();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ========== EVENT HANDLERS ==========

  const handleSearch = () => {
    setCurrentPage(1);
    fetchTransactions();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedAccount('all');
    setSelectedSourceType('all');
    setSelectedTransactionType('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const handleManualTransaction = async () => {
    if (!manualForm.amount || !manualForm.description || !manualForm.cash_account_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (parseFloat(manualForm.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setManualTransactionLoading(true);
    try {
      const response = await fetch('/api/finance/cash-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          amount: parseFloat(manualForm.amount),
          source_type: 'manual_adjustment'
        })
      });

      if (response.ok) {
        toast.success('Manual transaction created successfully');
        setShowManualTransaction(false);
        setManualForm({
          amount: '',
          transaction_type: 'DEBIT',
          description: '',
          reference_number: '',
          cash_account_id: '',
          notes: '',
          transaction_date: new Date().toISOString().split('T')[0]
        });
        fetchTransactions();
        fetchCashBalances();
        fetchCashAccounts();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create transaction');
      }
    } catch (error) {
      console.error('Error creating manual transaction:', error);
      toast.error('Failed to create transaction');
    } finally {
      setManualTransactionLoading(false);
    }
  };

  const exportTransactions = async () => {
    try {
      const params = new URLSearchParams({
        export: 'true',
        ...(selectedAccount !== 'all' && { cash_account_id: selectedAccount }),
        ...(selectedSourceType !== 'all' && { source_type: selectedSourceType }),
        ...(selectedTransactionType !== 'all' && { transaction_type: selectedTransactionType }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
        ...(searchTerm && { search: searchTerm })
      });

      window.open(`/api/finance/cash-transactions/export?${params}`, '_blank');
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast.error('Failed to export transactions');
    }
  };

  // ========== UTILITY FUNCTIONS ==========

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTransactionTypeColor = (type: string): string => {
    return type === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getTransactionTypeIcon = (type: string) => {
    return type === 'CREDIT' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  const getSourceTypeColor = (sourceType: string): string => {
    const colors: Record<string, string> = {
      'expense': 'bg-red-100 text-red-700',
      'sales_payment': 'bg-green-100 text-green-700',
      'investment': 'bg-blue-100 text-blue-700',
      'withdrawal': 'bg-orange-100 text-orange-700',
      'liability_payment': 'bg-purple-100 text-purple-700',
      'fund_transfer': 'bg-indigo-100 text-indigo-700',
      'refund': 'bg-yellow-100 text-yellow-700',
      'purchase_return': 'bg-teal-100 text-teal-700',
      'manual_adjustment': 'bg-gray-100 text-gray-700',
      'opening_balance': 'bg-slate-100 text-slate-700'
    };
    return colors[sourceType] || 'bg-gray-100 text-gray-700';
  };

  // ========== RENDER ==========

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Cash Ledger Management
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor and manage all cash transactions across your ERP system
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportTransactions}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Dialog open={showManualTransaction} onOpenChange={setShowManualTransaction}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                <PlusCircle className="h-4 w-4" />
                Manual Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Manual Cash Transaction</DialogTitle>
                <DialogDescription>
                  Add a manual cash transaction for adjustments or corrections
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Cash Account Selection */}
                <div className="space-y-2">
                  <Label>Cash Account *</Label>
                  <Select 
                    value={manualForm.cash_account_id} 
                    onValueChange={(value) => setManualForm(prev => ({ ...prev, cash_account_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select cash account" />
                    </SelectTrigger>
                    <SelectContent>
                      {cashAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            <span>{account.name}</span>
                            <span className="text-gray-500">
                              ({formatCurrency(account.current_balance)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Transaction Type */}
                <div className="space-y-2">
                  <Label>Transaction Type *</Label>
                  <Select 
                    value={manualForm.transaction_type} 
                    onValueChange={(value: 'DEBIT' | 'CREDIT') => setManualForm(prev => ({ ...prev, transaction_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDIT">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          <span>Credit (Money In)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="DEBIT">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                          <span>Debit (Money Out)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={manualForm.amount}
                    onChange={(e) => setManualForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Input
                    placeholder="Enter transaction description"
                    value={manualForm.description}
                    onChange={(e) => setManualForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* Reference Number */}
                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input
                    placeholder="Optional reference number"
                    value={manualForm.reference_number}
                    onChange={(e) => setManualForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label>Transaction Date</Label>
                  <Input
                    type="date"
                    value={manualForm.transaction_date}
                    onChange={(e) => setManualForm(prev => ({ ...prev, transaction_date: e.target.value }))}
                  />
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    placeholder="Optional notes or comments"
                    value={manualForm.notes}
                    onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowManualTransaction(false)}
                    disabled={manualTransactionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleManualTransaction}
                    disabled={manualTransactionLoading || !manualForm.amount || !manualForm.description || !manualForm.cash_account_id}
                  >
                    {manualTransactionLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Transaction'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Cash Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalCashBalance)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Across {cashAccounts.length} accounts
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Credits (MTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                transactions
                  .filter(t => t.transaction_type === 'CREDIT')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Money received this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Debits (MTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                transactions
                  .filter(t => t.transaction_type === 'DEBIT')
                  .reduce((sum, t) => sum + t.amount, 0)
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Money spent this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {transactions.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current page results
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">All Transactions</TabsTrigger>
          <TabsTrigger value="balances">Account Balances</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search transactions..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </div>

                {/* Cash Account Filter */}
                <div className="space-y-2">
                  <Label>Cash Account</Label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {cashAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source Type Filter */}
                <div className="space-y-2">
                  <Label>Source Type</Label>
                  <Select value={selectedSourceType} onValueChange={setSelectedSourceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                      <SelectItem value="sales_payment">Sales Payments</SelectItem>
                      <SelectItem value="investment">Investments</SelectItem>
                      <SelectItem value="withdrawal">Withdrawals</SelectItem>
                      <SelectItem value="liability_payment">Liability Payments</SelectItem>
                      <SelectItem value="fund_transfer">Fund Transfers</SelectItem>
                      <SelectItem value="refund">Refunds</SelectItem>
                      <SelectItem value="purchase_return">Purchase Returns</SelectItem>
                      <SelectItem value="manual_adjustment">Manual Adjustments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Transaction Type Filter */}
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={selectedTransactionType} onValueChange={setSelectedTransactionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="CREDIT">Credits</SelectItem>
                      <SelectItem value="DEBIT">Debits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      placeholder="To"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <Button onClick={handleClearFilters} variant="outline" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Clear Filters
                </Button>
                <Button onClick={handleSearch} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Transactions</CardTitle>
              <CardDescription>
                Showing {transactions.length} transactions (Page {currentPage} of {totalPages})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No transactions found</p>
                  <p className="text-sm">Try adjusting your filters or search terms</p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Balance</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                {formatDate(transaction.transaction_date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                                <div className="flex items-center gap-1">
                                  {getTransactionTypeIcon(transaction.transaction_type)}
                                  {transaction.transaction_type}
                                </div>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={`font-semibold ${
                                transaction.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.transaction_type === 'CREDIT' ? '+' : '-'}
                                {formatCurrency(transaction.amount)}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate" title={transaction.description}>
                                {transaction.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getSourceTypeColor(transaction.source_type)}>
                                {transaction.source_description}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-gray-400" />
                                {transaction.cash_account_name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm">
                                {formatCurrency(transaction.running_balance)}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {transaction.reference_number || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage <= 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage >= totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balances Tab */}
        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Account Balances</CardTitle>
              <CardDescription>
                Current balance for each cash account in your system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cashBalances.map((balance) => (
                  <Card key={balance.cash_account_id} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-green-600" />
                        {balance.cash_account_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600 mb-2">
                        {formatCurrency(balance.current_balance)}
                      </div>
                      <p className="text-xs text-gray-500">
                        Last updated: {formatDate(balance.last_updated)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {cashBalances.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No cash accounts found</p>
                  <p className="text-sm">Create a cash account to start tracking cash transactions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}