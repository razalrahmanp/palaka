import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Building2, 
  Plus, 
  Eye, 
  CreditCard, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Receipt,
  Wallet,
  Smartphone,
  Link
} from 'lucide-react';

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  current_balance: number;
  calculated_balance?: number;
  transaction_balance?: number;
  payments_balance?: number;
  linked_bank_balance?: number;
  payment_count?: number;
  transaction_count?: number;
  payment_methods?: string[];
  currency: string;
  account_type?: 'BANK' | 'UPI';
  upi_id?: string;
  linked_bank_account_id?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface UpiAccount {
  id: string;
  name: string;
  upi_id: string;
  current_balance: number;
  calculated_balance?: number;
  transaction_balance?: number;
  payments_balance?: number;
  linked_bank_balance?: number;
  payment_count?: number;
  transaction_count?: number;
  payment_methods?: string[];
  linked_bank_account_id: string | null;
  linked_bank_name?: string;
  linked_account_number?: string;
  is_active: boolean;
  created_at: string;
}

interface BankTransaction {
  id: string;
  bank_account_id: string;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  reference: string;
}

export function BankAccountManager() {
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [upiAccounts, setUpiAccounts] = useState<UpiAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [bankTransactions, setBankTransactions] = useState<Record<string, BankTransaction[]>>({});
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddUpi, setShowAddUpi] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bank' | 'upi'>('bank');
  
  const [newAccount, setNewAccount] = useState({
    name: '',
    account_number: '',
    currency: 'INR',
    current_balance: 0
  });

  const [newUpiAccount, setNewUpiAccount] = useState({
    name: '',
    upi_id: '',
    linked_bank_account_id: 'none',
    current_balance: 0
  });

  useEffect(() => {
    fetchBankAccounts();
    fetchUpiAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts?type=BANK');
      if (response.ok) {
        const result = await response.json();
        const accounts = result.data || [];
        setBankAccounts(accounts);
        
        // Fetch transactions for each bank account
        const transactionsPromises = accounts.map(async (account: BankAccount) => {
          const txResponse = await fetch(`/api/finance/bank_accounts/transactions?bank_account_id=${account.id}`);
          if (txResponse.ok) {
            const txResult = await txResponse.json();
            return { accountId: account.id, transactions: txResult.data || [] };
          }
          return { accountId: account.id, transactions: [] };
        });
        
        const allTransactions = await Promise.all(transactionsPromises);
        const transactionsMap = allTransactions.reduce((acc, { accountId, transactions }) => {
          acc[accountId] = transactions.slice(0, 5); // Only show last 5 transactions
          return acc;
        }, {} as Record<string, BankTransaction[]>);
        
        setBankTransactions(transactionsMap);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpiAccounts = async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts?type=UPI');
      if (response.ok) {
        const result = await response.json();
        setUpiAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching UPI accounts:', error);
    }
  };

  const fetchTransactions = async (bankAccountId: string) => {
    try {
      const response = await fetch(`/api/finance/bank_accounts/transactions?bank_account_id=${bankAccountId}`);
      if (response.ok) {
        const result = await response.json();
        setTransactions(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching bank transactions:', error);
    }
  };

  const addBankAccount = async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newAccount,
          account_type: 'BANK'
        })
      });

      if (response.ok) {
        setNewAccount({
          name: '',
          account_number: '',
          currency: 'INR',
          current_balance: 0
        });
        setShowAddAccount(false);
        fetchBankAccounts();
      }
    } catch (error) {
      console.error('Error adding bank account:', error);
    }
  };

  const addUpiAccount = async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUpiAccount.name,
          upi_id: newUpiAccount.upi_id,
          linked_bank_account_id: newUpiAccount.linked_bank_account_id || null,
          current_balance: newUpiAccount.current_balance,
          account_type: 'UPI',
          currency: 'INR'
        })
      });

      if (response.ok) {
        setNewUpiAccount({
          name: '',
          upi_id: '',
          linked_bank_account_id: 'none',
          current_balance: 0
        });
        setShowAddUpi(false);
        fetchUpiAccounts();
        fetchBankAccounts(); // Refresh bank accounts in case balance changed
      }
    } catch (error) {
      console.error('Error adding UPI account:', error);
    }
  };

  const handleViewTransactions = (account: BankAccount) => {
    setSelectedAccount(account);
    fetchTransactions(account.id);
    setShowTransactions(true);
  };

  const handleViewAllTransactions = () => {
    router.push('/finance/transactions');
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getDisplayBalance = (account: BankAccount | UpiAccount) => {
    // Use calculated_balance if available, otherwise fall back to current_balance
    const balance = account.calculated_balance ?? account.current_balance;
    return formatCurrency(balance);
  };

  const getTotalBalance = () => {
    return bankAccounts.reduce((total, account) => {
      const balance = account.calculated_balance ?? account.current_balance;
      return total + balance;
    }, 0);
  };

  const getBankIcon = (bankName: string) => {
    const name = bankName.toUpperCase();
    
    if (name.includes('HDFC')) {
      return (
        <Image 
          src="/assets/bank-logos/hdfc.svg" 
          alt="HDFC Bank" 
          width={32}
          height={32}
          className="w-8 h-8 rounded"
        />
      );
    } else if (name.includes('SBI') || name.includes('STATE BANK')) {
      return (
        <Image 
          src="/assets/bank-logos/sbi.svg" 
          alt="SBI Bank" 
          width={32}
          height={32}
          className="w-8 h-8 rounded"
        />
      );
    } else {
      return (
        <Image 
          src="/assets/bank-logos/default.svg" 
          alt="Bank" 
          width={32}
          height={32}
          className="w-8 h-8 rounded"
        />
      );
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading bank accounts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Bank Account Management</h2>
          <p className="text-gray-600 mt-1">Manage bank accounts, UPI accounts and view all payment transactions</p>
        </div>
        <Button 
          onClick={handleViewAllTransactions}
          variant="outline"
          className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:bg-green-100"
        >
          <Receipt className="h-4 w-4 mr-2" />
          All Transactions
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Balance</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(getTotalBalance())}
                </p>
              </div>
              <div className="p-3 bg-blue-500 rounded-lg">
                <Wallet className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Accounts</p>
                <p className="text-2xl font-bold text-green-900">{bankAccounts.length}</p>
              </div>
              <div className="p-3 bg-green-500 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Payments</p>
                <p className="text-2xl font-bold text-purple-900">-</p>
              </div>
              <div className="p-3 bg-purple-500 rounded-lg">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Payment Methods</p>
                <p className="text-2xl font-bold text-orange-900">-</p>
              </div>
              <div className="p-3 bg-orange-500 rounded-lg">
                <Receipt className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface for Bank and UPI Accounts */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'bank' | 'upi')}>
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank Accounts
            </TabsTrigger>
            <TabsTrigger value="upi" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              UPI Accounts
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700" disabled={activeTab !== 'bank'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Bank Account
                </Button>
              </DialogTrigger>
            </Dialog>
            
            <Dialog open={showAddUpi} onOpenChange={setShowAddUpi}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700" disabled={activeTab !== 'upi'}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add UPI Account
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        {/* Bank Accounts Tab */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bank Accounts ({bankAccounts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                {bankAccounts.map((account) => (
                  <Card key={account.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      {/* Account Header */}
                      <div className="p-4 border-b bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {getBankIcon(account.name)}
                            <div>
                              <h3 className="font-semibold text-gray-900">{account.name}</h3>
                              <p className="text-sm text-gray-600">
                                Account: ****{account.account_number?.slice(-4) || '0000'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {getDisplayBalance(account)}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewTransactions(account)}
                              className="mt-2"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View All Transactions
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Recent Transactions */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">Recent Transactions</h4>
                          <Badge variant="secondary" className="text-xs">
                            Last 5 transactions
                          </Badge>
                        </div>
                        
                        {bankTransactions[account.id] && bankTransactions[account.id].length > 0 ? (
                          <div className="space-y-2">
                            {bankTransactions[account.id].map((transaction, index) => (
                              <div 
                                key={transaction.id || index} 
                                className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-1 rounded-full ${
                                    transaction.type === 'deposit' 
                                      ? 'bg-green-100 text-green-600' 
                                      : 'bg-red-100 text-red-600'
                                  }`}>
                                    {transaction.type === 'deposit' ? (
                                      <ArrowUpCircle className="h-3 w-3" />
                                    ) : (
                                      <ArrowDownCircle className="h-3 w-3" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {transaction.description}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(transaction.date).toLocaleDateString()} • {transaction.reference}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-semibold ${
                                    transaction.type === 'deposit' 
                                      ? 'text-green-600' 
                                      : 'text-red-600'
                                  }`}>
                                    {transaction.type === 'deposit' ? '+' : '-'}
                                    {formatCurrency(transaction.amount, account.currency)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-gray-500">
                            <Receipt className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No recent transactions</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {bankAccounts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No bank accounts found</p>
                    <p className="text-sm">Add your first bank account to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* UPI Accounts Tab */}
        <TabsContent value="upi">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                UPI Accounts ({upiAccounts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {upiAccounts.map((account) => (
                  <Card key={account.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Smartphone className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{account.name}</h3>
                            <p className="text-sm text-gray-600">UPI ID: {account.upi_id}</p>
                            {account.linked_bank_name && (
                              <div className="flex items-center gap-1 mt-1">
                                <Link className="h-3 w-3 text-blue-500" />
                                <p className="text-xs text-blue-600">
                                  Linked to: {account.linked_bank_name}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            {getDisplayBalance(account)}
                          </p>
                          <Badge className={account.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {account.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {upiAccounts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Smartphone className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No UPI accounts found</p>
                    <p className="text-sm">Add your first UPI account to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Bank Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Bank Name</Label>
              <Input
                id="name"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="Enter bank name"
              />
            </div>
            <div>
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                value={newAccount.account_number}
                onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
                placeholder="Enter account number"
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={newAccount.currency}
                onChange={(e) => setNewAccount({ ...newAccount, currency: e.target.value })}
                placeholder="INR"
              />
            </div>
            <div>
              <Label htmlFor="balance">Initial Balance</Label>
              <Input
                id="balance"
                type="number"
                value={newAccount.current_balance}
                onChange={(e) => setNewAccount({ ...newAccount, current_balance: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccount(false)}>
              Cancel
            </Button>
            <Button onClick={addBankAccount}>Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add UPI Account Dialog */}
      <Dialog open={showAddUpi} onOpenChange={setShowAddUpi}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Add UPI Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="upi_name">UPI Account Name</Label>
              <Input
                id="upi_name"
                value={newUpiAccount.name}
                onChange={(e) => setNewUpiAccount({ ...newUpiAccount, name: e.target.value })}
                placeholder="e.g., Personal PayTM, Business GPay"
              />
            </div>
            <div>
              <Label htmlFor="upi_id">UPI ID</Label>
              <Input
                id="upi_id"
                value={newUpiAccount.upi_id}
                onChange={(e) => setNewUpiAccount({ ...newUpiAccount, upi_id: e.target.value })}
                placeholder="e.g., yourname@paytm, yourname@okaxis"
              />
            </div>
            <div>
              <Label htmlFor="linked_bank">Linked Bank Account (Optional)</Label>
              <Select
                value={newUpiAccount.linked_bank_account_id}
                onValueChange={(value) => setNewUpiAccount({ ...newUpiAccount, linked_bank_account_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No linked bank account</SelectItem>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span>{account.name}</span>
                        {account.account_number && (
                          <span className="text-gray-500 text-xs">
                            (****{account.account_number.slice(-4)})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                UPI payments will automatically deposit to this bank account
              </p>
            </div>
            <div>
              <Label htmlFor="upi_balance">Initial Balance</Label>
              <Input
                id="upi_balance"
                type="number"
                value={newUpiAccount.current_balance}
                onChange={(e) => setNewUpiAccount({ ...newUpiAccount, current_balance: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUpi(false)}>
              Cancel
            </Button>
            <Button onClick={addUpiAccount} className="bg-green-600 hover:bg-green-700">
              <Smartphone className="h-4 w-4 mr-2" />
              Add UPI Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bank Account Transactions Dialog */}
      <Dialog open={showTransactions} onOpenChange={setShowTransactions}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] p-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                {selectedAccount && getBankIcon(selectedAccount.name)}
                {selectedAccount?.name} - Bank Transactions
              </DialogTitle>
              <p className="text-sm text-gray-600">
                Current Balance: {selectedAccount && getDisplayBalance(selectedAccount)}
              </p>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="space-y-4">
                {transactions.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Date</TableHead>
                            <TableHead className="w-[150px]">Type</TableHead>
                            <TableHead className="min-w-[200px]">Description</TableHead>
                            <TableHead className="w-[150px]">Reference</TableHead>
                            <TableHead className="text-right w-[120px]">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {(() => {
                                const date = new Date(transaction.date);
                                return isNaN(date.getTime()) ? 'No Date' : date.toLocaleDateString();
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {transaction.type === 'deposit' ? (
                                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ArrowDownCircle className="h-4 w-4 text-red-600" />
                                )}
                                <Badge variant={transaction.type === 'deposit' ? 'default' : 'destructive'}>
                                  {transaction.type === 'deposit' ? 'Credit' : 'Debit'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>{transaction.description}</TableCell>
                            <TableCell>{transaction.reference || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                              <span className={transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                                {transaction.type === 'deposit' ? '+' : '-'}
                                {formatCurrency(transaction.amount, selectedAccount?.currency)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bank transactions found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

