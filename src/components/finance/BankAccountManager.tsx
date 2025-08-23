import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Wallet
} from 'lucide-react';

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  current_balance: number;
  currency: string;
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
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [newAccount, setNewAccount] = useState({
    name: '',
    account_number: '',
    currency: 'INR',
    current_balance: 0
  });

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts');
      if (response.ok) {
        const result = await response.json();
        setBankAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    } finally {
      setLoading(false);
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
        body: JSON.stringify(newAccount)
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

  const getTotalBalance = () => {
    return bankAccounts.reduce((total, account) => total + account.current_balance, 0);
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
          <p className="text-gray-600 mt-1">Manage bank accounts and view all payment transactions</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={handleViewAllTransactions}
            variant="outline"
            className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:bg-green-100"
          >
            <Receipt className="h-4 w-4 mr-2" />
            All Transactions
          </Button>
          <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
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

      {/* Bank Accounts List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank Accounts
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {bankAccounts.map((account) => (
              <Card key={account.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
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
                        {formatCurrency(account.current_balance, account.currency)}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewTransactions(account)}
                        className="mt-2"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Transactions
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Account Dialog */}
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
                Current Balance: {selectedAccount && formatCurrency(selectedAccount.current_balance, selectedAccount.currency)}
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

