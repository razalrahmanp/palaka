'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  BookOpen, 
  Search, 
  Calendar as CalendarIcon,
  Download,
  Filter,
  Eye,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react';

interface GeneralLedgerEntry {
  id: string;
  journal_entry_id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  transaction_date: string;
  description: string;
  reference_number: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  journal_status: string;
}

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

export default function GeneralLedger() {
  const [entries, setEntries] = useState<GeneralLedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [showFilters, setShowFilters] = useState(false);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/finance/chart-of-accounts');
      const { data } = await response.json();
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      // Mock data for demonstration
      setAccounts([
        { id: '1', account_code: '1000', account_name: 'Cash', account_type: 'ASSET' },
        { id: '2', account_code: '1100', account_name: 'Accounts Receivable', account_type: 'ASSET' },
        { id: '3', account_code: '2000', account_name: 'Accounts Payable', account_type: 'LIABILITY' },
        { id: '4', account_code: '4000', account_name: 'Sales Revenue', account_type: 'REVENUE' },
        { id: '5', account_code: '5000', account_name: 'Cost of Goods Sold', account_type: 'EXPENSE' },
      ]);
    }
  };

  const fetchLedgerEntries = React.useCallback(async () => {
    try {
      setLoading(true);
      const url = '/api/finance/general-ledger?';
      const params = new URLSearchParams();
      
      if (selectedAccount !== 'all') {
        params.append('account_id', selectedAccount);
      }
      if (dateFrom) {
        params.append('date_from', format(dateFrom, 'yyyy-MM-dd'));
      }
      if (dateTo) {
        params.append('date_to', format(dateTo, 'yyyy-MM-dd'));
      }

      const response = await fetch(url + params.toString());
      const { data } = await response.json();
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, dateFrom, dateTo]);

  useEffect(() => {
    fetchAccounts();
    fetchLedgerEntries();
  }, [fetchLedgerEntries]);

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

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.account_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const selectedAccountInfo = accounts.find(acc => acc.id === selectedAccount);
  const totalDebits = filteredEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
  const totalCredits = filteredEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
  const netBalance = totalDebits - totalCredits;

  const exportToCSV = () => {
    const csvContent = [
      ['Date', 'Reference', 'Description', 'Account', 'Debit', 'Credit', 'Balance'].join(','),
      ...filteredEntries.map(entry => [
        formatDate(entry.transaction_date),
        entry.reference_number,
        `"${entry.description}"`,
        `"${entry.account_code} - ${entry.account_name}"`,
        entry.debit_amount,
        entry.credit_amount,
        entry.running_balance,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `general-ledger-${selectedAccountInfo?.account_name || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading general ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">General Ledger</h2>
          <p className="text-gray-600">Detailed transaction history for all accounts</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Debits</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalDebits)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Credits</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalCredits)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Balance</p>
                <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netBalance)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-xl font-bold text-blue-600">{filteredEntries.length}</p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Account Filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Account</label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_code} - {account.account_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Date From */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
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

              {/* Date To */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Date To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Account Info */}
      {selectedAccountInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {selectedAccountInfo.account_code} - {selectedAccountInfo.account_name}
            </CardTitle>
            <CardDescription>
              {selectedAccountInfo.account_type} Account • 
              {filteredEntries.length} transaction{filteredEntries.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Ledger Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">
                    {formatDate(entry.transaction_date)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {entry.reference_number}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.description}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.account_code} - {entry.account_name}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(entry.running_balance)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.journal_status === 'POSTED' ? 'default' : 'secondary'}>
                      {entry.journal_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredEntries.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedAccount !== 'all' || dateFrom || dateTo
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No transactions have been recorded yet.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
