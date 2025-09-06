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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  BookOpen,
  ChevronDown,
  ChevronRight,
  Building,
  CreditCard,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  parent_account_id?: string;
  current_balance: number;
  calculated_balance?: number;
  total_debits?: number;
  total_credits?: number;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface AccountFormData {
  account_code: string;
  account_name: string;
  account_type: string;
  parent_account_id?: string;
  description?: string;
}

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Asset', icon: Building, color: 'blue' },
  { value: 'LIABILITY', label: 'Liability', icon: CreditCard, color: 'red' },
  { value: 'EQUITY', label: 'Equity', icon: TrendingUp, color: 'green' },
  { value: 'REVENUE', label: 'Revenue', icon: TrendingUp, color: 'emerald' },
  { value: 'EXPENSE', label: 'Expense', icon: TrendingDown, color: 'orange' },
];

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<AccountFormData>({
    account_code: '',
    account_name: '',
    account_type: '',
    parent_account_id: '',
    description: '',
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance/chart-of-accounts');
      
      if (!response.ok) {
        throw new Error('Failed to fetch chart of accounts');
      }
      
      const { data } = await response.json();
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    } finally {
      setLoading(false);
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

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         account.account_code.includes(searchTerm);
    const matchesType = selectedType === 'all' || account.account_type === selectedType;
    return matchesSearch && matchesType;
  });

  const groupedAccounts = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type.value] = filteredAccounts.filter(account => account.account_type === type.value);
    return acc;
  }, {} as Record<string, Account[]>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingAccount 
        ? `/api/finance/chart-of-accounts` 
        : `/api/finance/chart-of-accounts`;
      
      const method = editingAccount ? 'PUT' : 'POST';
      const body = editingAccount 
        ? { ...formData, id: editingAccount.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setEditingAccount(null);
        setFormData({
          account_code: '',
          account_name: '',
          account_type: '',
          parent_account_id: '',
          description: '',
        });
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      parent_account_id: account.parent_account_id || '',
      description: account.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (account: Account) => {
    if (confirm(`Are you sure you want to delete account "${account.account_name}"?`)) {
      try {
        const response = await fetch('/api/finance/chart-of-accounts', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: account.id }),
        });

        if (response.ok) {
          fetchAccounts();
        }
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  const toggleAccountExpansion = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading chart of accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chart of Accounts</h2>
          <p className="text-gray-600">Manage your accounts and view balances</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingAccount(null);
              setFormData({
                account_code: '',
                account_name: '',
                account_type: '',
                parent_account_id: '',
                description: '',
              });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </DialogTitle>
              <DialogDescription>
                {editingAccount 
                  ? 'Update the account information below.'
                  : 'Enter the details for the new account.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_code">Account Code</Label>
                  <Input
                    id="account_code"
                    value={formData.account_code}
                    onChange={(e) => setFormData({...formData, account_code: e.target.value})}
                    placeholder="e.g., 1000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="account_type">Account Type</Label>
                  <Select 
                    value={formData.account_type} 
                    onValueChange={(value) => setFormData({...formData, account_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="account_name">Account Name</Label>
                <Input
                  id="account_name"
                  value={formData.account_name}
                  onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                  placeholder="e.g., Cash in Bank"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional description"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAccount ? 'Update' : 'Create'} Account
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts by Type */}
      <div className="space-y-6">
        {ACCOUNT_TYPES.map((accountType) => {
          const typeAccounts = groupedAccounts[accountType.value];
          if (!typeAccounts.length) return null;

          const TypeIcon = accountType.icon;
          const totalBalance = typeAccounts.reduce((sum, acc) => sum + Math.abs(acc.calculated_balance ?? acc.current_balance), 0);

          return (
            <Card key={accountType.value}>
              <CardHeader 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => toggleAccountExpansion(accountType.value)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {expandedAccounts.has(accountType.value) ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                    <div className={`p-2 bg-${accountType.color}-100 rounded-lg`}>
                      <TypeIcon className={`h-5 w-5 text-${accountType.color}-600`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{accountType.label}</CardTitle>
                      <CardDescription>
                        {typeAccounts.length} account{typeAccounts.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatCurrency(totalBalance)}</p>
                    <Badge variant="outline" className={`text-${accountType.color}-700 border-${accountType.color}-300`}>
                      Total {accountType.label}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              {expandedAccounts.has(accountType.value) && (
                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-mono text-sm">
                            {account.account_code}
                          </TableCell>
                          <TableCell className="font-medium">
                            {account.account_name}
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {account.description || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(account.calculated_balance ?? account.current_balance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.is_active ? 'default' : 'secondary'}>
                              {account.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(account)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(account)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredAccounts.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedType !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first account.'}
              </p>
              {!searchTerm && selectedType === 'all' && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Account
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
