import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
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
  Banknote,
  Wallet,
  Receipt,
  Calendar
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

interface AllPaymentTransaction {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  method: string;
  reference: string;
  description: string;
  customer_name: string;
  invoice_id: string;
  sales_order_id: string;
}

export function BankAccountManager() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [allPaymentTransactions, setAllPaymentTransactions] = useState<AllPaymentTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [newAccount, setNewAccount] = useState({
    name: '',
    account_number: '',
    currency: 'INR',
    current_balance: 0
  });

  useEffect(() => {
    fetchBankAccounts();
    fetchAllPaymentTransactions();
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

  const fetchAllPaymentTransactions = async () => {
    try {
      const response = await fetch('/api/finance/payments');
      if (response.ok) {
        const result = await response.json();
        // Transform the data to include customer information
        const transformedData = result.map((payment: { 
          id: string; 
          payment_number?: string; 
          payment_date?: string; 
          created_at?: string; 
          amount: number; 
          method: string; 
          reference?: string; 
          description?: string; 
          notes?: string; 
          customer_name?: string; 
          invoice_id?: string; 
          sales_order_id?: string; 
        }) => ({
          id: payment.id,
          payment_number: payment.payment_number || `PAY-${payment.id.slice(0, 8)}`,
          payment_date: payment.payment_date || payment.created_at,
          amount: payment.amount,
          method: payment.method,
          reference: payment.reference || 'N/A',
          description: payment.description || payment.notes || `Payment via ${payment.method}`,
          customer_name: payment.customer_name || 'Unknown Customer',
          invoice_id: payment.invoice_id || '',
          sales_order_id: payment.sales_order_id || ''
        }));
        setAllPaymentTransactions(transformedData);
      }
    } catch (error) {
      console.error('Error fetching all payment transactions:', error);
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
    setShowAllTransactions(true);
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <Banknote className="h-4 w-4 text-green-600" />;
      case 'card':
      case 'credit_card':
      case 'debit_card':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'bank_transfer':
        return <Building2 className="h-4 w-4 text-purple-600" />;
      case 'upi':
        return <Wallet className="h-4 w-4 text-orange-600" />;
      case 'cheque':
      case 'check':
        return <Receipt className="h-4 w-4 text-indigo-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      cash: 'bg-green-100 text-green-800',
      card: 'bg-blue-100 text-blue-800',
      bank_transfer: 'bg-purple-100 text-purple-800',
      upi: 'bg-orange-100 text-orange-800',
      cheque: 'bg-indigo-100 text-indigo-800',
      check: 'bg-indigo-100 text-indigo-800'
    };
    
    return (
      <Badge className={colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {method.replace('_', ' ').toUpperCase()}
      </Badge>
    );
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
                <p className="text-2xl font-bold text-purple-900">{allPaymentTransactions.length}</p>
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
                <p className="text-2xl font-bold text-orange-900">
                  {[...new Set(allPaymentTransactions.map(t => t.method))].length}
                </p>
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAccount && getBankIcon(selectedAccount.name)}
              {selectedAccount?.name} - Bank Transactions
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Current Balance: {selectedAccount && formatCurrency(selectedAccount.current_balance, selectedAccount.currency)}
            </p>
          </DialogHeader>
          <div className="space-y-4">
            {transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bank transactions found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* All Payment Transactions Dialog */}
      <Dialog open={showAllTransactions} onOpenChange={setShowAllTransactions}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              All Payment Transactions
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Complete view of all payments by method: Cash, UPI, Card, Cheque, Bank Transfer
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Payment Method Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[...new Set(allPaymentTransactions.map(t => t.method))].map((method) => {
                const methodTransactions = allPaymentTransactions.filter(t => t.method === method);
                const methodTotal = methodTransactions.reduce((sum, t) => sum + t.amount, 0);
                
                return (
                  <Card key={method} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {getPaymentMethodIcon(method)}
                        <span className="text-sm font-medium">{method.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(methodTotal)}</p>
                      <p className="text-xs text-gray-600">{methodTransactions.length} transactions</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* All Transactions Table */}
            {allPaymentTransactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPaymentTransactions.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.payment_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.customer_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(payment.method)}
                          {getPaymentMethodBadge(payment.method)}
                        </div>
                      </TableCell>
                      <TableCell>{payment.reference}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {payment.description}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payment transactions found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

