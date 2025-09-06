'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  Users, 
  Building2, 
  UserCheck,
  Search,
  Calendar as CalendarIcon,
  ArrowLeft,
  FileText,
  CreditCard,
  Receipt,
  Banknote,
  Eye,
  Filter
} from 'lucide-react';

interface LedgerData {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'employee' | 'expense' | 'bank' | 'product';
  email?: string;
  phone?: string;
  employee_id?: string;
  position?: string;
  department?: string;
  designation?: string;
  address?: string;
  status?: string;
  created_at: string;
  total_transactions: number;
  total_amount: number;
  balance_due: number;
  last_transaction_date?: string;
  // Additional fields for different ledger types
  account_number?: string;
  account_type?: string;
  sku?: string;
  cost?: number;
  selling_price?: number;
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

interface LedgerTableProps {
  ledgers: LedgerData[];
  onLedgerClick: (ledger: LedgerData) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getTypeIcon: (type: string) => React.ReactElement;
}

function LedgerTable({ ledgers, onLedgerClick, formatCurrency, formatDate, getTypeIcon }: LedgerTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledgers.map((ledger) => (
              <TableRow key={ledger.id} className="hover:bg-gray-50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(ledger.type)}
                    <div>
                      <Badge 
                        variant={ledger.type === 'customer' ? 'default' : 
                               ledger.type === 'supplier' ? 'secondary' : 
                               ledger.type === 'employee' ? 'outline' : 'destructive'}
                        className="text-xs"
                      >
                        {ledger.type}
                      </Badge>
                      {ledger.status && (
                        <p className="text-xs text-gray-500 mt-1 capitalize">{ledger.status}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{ledger.name}</p>
                    {ledger.department && (
                      <p className="text-sm text-gray-600">{ledger.department}</p>
                    )}
                    {ledger.designation && (
                      <p className="text-sm text-gray-600">{ledger.designation}</p>
                    )}
                    {ledger.account_number && (
                      <p className="text-sm text-gray-600">A/C: {ledger.account_number}</p>
                    )}
                    {ledger.sku && (
                      <p className="text-sm text-gray-600">SKU: {ledger.sku}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {ledger.email && <p>{ledger.email}</p>}
                    {ledger.phone && <p>{ledger.phone}</p>}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {ledger.total_transactions}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(ledger.total_amount)}
                </TableCell>
                <TableCell className={`text-right font-mono ${ledger.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(ledger.balance_due)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {ledger.last_transaction_date ? formatDate(ledger.last_transaction_date) : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLedgerClick(ledger)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {ledgers.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No ledgers found</h3>
            <p className="text-gray-600">
              No entities with transactions found in this category.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function LedgerManager() {
  const [allLedgers, setAllLedgers] = useState<LedgerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLedger, setSelectedLedger] = useState<LedgerData | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [hideZeroBalances, setHideZeroBalances] = useState(false);

  const fetchAllLedgers = React.useCallback(async () => {
    try {
      setLoading(true);
      // Use the corrected customer ledger API for customers and fallback to general for others
      const customerResponse = await fetch(`/api/finance/customer-ledgers?search=${encodeURIComponent(searchTerm)}&hide_zero_balances=${hideZeroBalances}`);
      const customerData = await customerResponse.json();
      
      // Get other types from the general ledgers API  
      const otherResponse = await fetch(`/api/finance/ledgers?search=${encodeURIComponent(searchTerm)}`);
      const otherData = await otherResponse.json();
      
      // Combine customer data with other types (suppliers, employees, etc.)
      const customers = customerData.success ? customerData.data : [];
      const others = (otherData.data || []).filter((ledger: LedgerData) => ledger.type !== 'customer');
      
      setAllLedgers([...customers, ...others]);
    } catch (error) {
      console.error('Error fetching ledgers:', error);
      setAllLedgers([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, hideZeroBalances]);

  useEffect(() => {
    fetchAllLedgers();
  }, [fetchAllLedgers]);

  const fetchTransactions = async (ledger: LedgerData) => {
    try {
      setTransactionsLoading(true);
      const params = new URLSearchParams({
        type: ledger.type
      });
      
      if (dateFrom) {
        params.append('date_from', format(dateFrom, 'yyyy-MM-dd'));
      }
      if (dateTo) {
        params.append('date_to', format(dateTo, 'yyyy-MM-dd'));
      }

      const response = await fetch(`/api/finance/ledgers/${ledger.id}?${params}`);
      const { data } = await response.json();
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleLedgerClick = (ledger: LedgerData) => {
    setSelectedLedger(ledger);
    fetchTransactions(ledger);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'customer': return <Users className="h-4 w-4" />;
      case 'supplier': return <Building2 className="h-4 w-4" />;
      case 'employee': return <UserCheck className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'payment': return <CreditCard className="h-4 w-4 text-green-500" />;
      case 'bill': return <Receipt className="h-4 w-4 text-orange-500" />;
      case 'salary': return <Banknote className="h-4 w-4 text-purple-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTabLedgers = (type: string) => {
    const typeLedgers = allLedgers.filter(ledger => ledger.type === type);
    return typeLedgers.filter(ledger =>
      ledger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ledger.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ledger.phone?.includes(searchTerm)
    );
  };

  const tabStats = {
    customers: allLedgers.filter(l => l.type === 'customer').length,
    suppliers: allLedgers.filter(l => l.type === 'supplier').length,
    employees: allLedgers.filter(l => l.type === 'employee').length,
    expenses: allLedgers.filter(l => l.type === 'expense').length,
    banks: allLedgers.filter(l => l.type === 'bank').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading ledgers...</p>
      </div>
    );
  }

  if (selectedLedger) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setSelectedLedger(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ledgers
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {getTypeIcon(selectedLedger.type)}
                {selectedLedger.name}
              </h2>
              <p className="text-gray-600 capitalize">
                {selectedLedger.type} Ledger • {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Ledger Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getTypeIcon(selectedLedger.type)}
              Ledger Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold">{selectedLedger.total_transactions}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedLedger.total_amount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Balance Due</p>
                <p className={`text-2xl font-bold ${selectedLedger.balance_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(selectedLedger.balance_due)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Last Transaction</p>
                <p className="text-lg font-medium">
                  {selectedLedger.last_transaction_date ? formatDate(selectedLedger.last_transaction_date) : 'N/A'}
                </p>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {selectedLedger.email && (
                  <div>
                    <span className="font-medium text-gray-600">Email:</span>
                    <p>{selectedLedger.email}</p>
                  </div>
                )}
                {selectedLedger.phone && (
                  <div>
                    <span className="font-medium text-gray-600">Phone:</span>
                    <p>{selectedLedger.phone}</p>
                  </div>
                )}
                {selectedLedger.employee_id && (
                  <div>
                    <span className="font-medium text-gray-600">Employee ID:</span>
                    <p>{selectedLedger.employee_id}</p>
                  </div>
                )}
                {selectedLedger.position && (
                  <div>
                    <span className="font-medium text-gray-600">Position:</span>
                    <p>{selectedLedger.position}</p>
                  </div>
                )}
                {selectedLedger.department && (
                  <div>
                    <span className="font-medium text-gray-600">Department:</span>
                    <p>{selectedLedger.department}</p>
                  </div>
                )}
                {selectedLedger.address && (
                  <div>
                    <span className="font-medium text-gray-600">Address:</span>
                    <p>{selectedLedger.address}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filter by Date:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">From:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">To:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <Button onClick={() => fetchTransactions(selectedLedger)} size="sm">
                Apply Filter
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setDateFrom(undefined);
                  setDateTo(undefined);
                  fetchTransactions(selectedLedger);
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              All transactions for this {selectedLedger.type}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {transactionsLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="ml-4 text-gray-600">Loading transactions...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.transaction_type)}
                          <span className="capitalize text-sm">{transaction.transaction_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {transaction.reference_number || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {transaction.debit_amount > 0 ? formatCurrency(transaction.debit_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {transaction.credit_amount > 0 ? formatCurrency(transaction.credit_amount) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(transaction.balance)}
                      </TableCell>
                      <TableCell>
                        {transaction.status && (
                          <Badge variant={transaction.status === 'POSTED' || transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {transactions.length === 0 && !transactionsLoading && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-600">
                  This {selectedLedger.type} doesn&apos;t have any transactions yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ledgers</h2>
          <p className="text-gray-600">View ledgers for entities with transactions only</p>
        </div>
        <div className="flex items-center gap-4">
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
            {hideZeroBalances ? "Show All" : "Hide Settled"}
          </Button>
        </div>
      </div>

      {/* Tabs for different ledger types */}
      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Customers ({tabStats.customers})
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Suppliers ({tabStats.suppliers})
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Employees ({tabStats.employees})
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expenses ({tabStats.expenses})
          </TabsTrigger>
          <TabsTrigger value="banks" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Banks ({tabStats.banks})
          </TabsTrigger>
        </TabsList>

        {/* Customer Tab */}
        <TabsContent value="customers">
          <LedgerTable 
            ledgers={getTabLedgers('customer')} 
            onLedgerClick={handleLedgerClick}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getTypeIcon={getTypeIcon}
          />
        </TabsContent>

        {/* Supplier Tab */}
        <TabsContent value="suppliers">
          <LedgerTable 
            ledgers={getTabLedgers('supplier')} 
            onLedgerClick={handleLedgerClick}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getTypeIcon={getTypeIcon}
          />
        </TabsContent>

        {/* Employee Tab */}
        <TabsContent value="employees">
          <LedgerTable 
            ledgers={getTabLedgers('employee')} 
            onLedgerClick={handleLedgerClick}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getTypeIcon={getTypeIcon}
          />
        </TabsContent>

        {/* Expense Tab */}
        <TabsContent value="expenses">
          <LedgerTable 
            ledgers={getTabLedgers('expense')} 
            onLedgerClick={handleLedgerClick}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getTypeIcon={getTypeIcon}
          />
        </TabsContent>

        {/* Bank Tab */}
        <TabsContent value="banks">
          <LedgerTable 
            ledgers={getTabLedgers('bank')} 
            onLedgerClick={handleLedgerClick}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getTypeIcon={getTypeIcon}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
