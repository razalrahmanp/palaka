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
  Building2, 
  Plus, 
 
  ArrowUpCircle, 
  ArrowDownCircle,
  Receipt,
  Wallet,
  Smartphone,
  Link,
  ArrowRightLeft,
  Banknote,
  IndianRupee,
  Loader2,
  ChevronDown,
  ChevronUp
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
  account_type?: 'BANK' | 'UPI' | 'CASH';
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

interface CashAccount {
  id: string;
  name: string;
  current_balance: number;
  calculated_balance?: number;
  transaction_balance?: number;
  payments_balance?: number;
  payment_count?: number;
  transaction_count?: number;
  payment_methods?: string[];
  currency: string;
  is_active: boolean;
  created_at: string;
}

interface BankTransaction {
  id: string;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  description: string;
  reference: string;
  transaction_type: 'bank_transaction' | 'vendor_payment' | 'withdrawal' | 'liability_payment';
}

export function BankAccountManager() {
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [upiAccounts, setUpiAccounts] = useState<UpiAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [cashTransactions, setCashTransactions] = useState<{
    id: string;
    transaction_date: string;
    description: string;
    amount: number;
    transaction_type: string;
    reference_number: string;
    account_name: string;
    source: string;
    balance_after: number;
  }[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddUpi, setShowAddUpi] = useState(false);
  const [showFundTransfer, setShowFundTransfer] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [transferLoading, setTransferLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'bank' | 'upi' | 'cash'>('bank');
  
  const [newAccount, setNewAccount] = useState({
    name: '',
    account_number: '',
    currency: 'INR',
    current_balance: 0
  });

  const [newUpiAccount, setNewUpiAccount] = useState({
    name: '',
    upi_id: '',
    linked_bank_account_id: '',
    current_balance: 0
  });

  const [fundTransfer, setFundTransfer] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    reference: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchBankAccounts();
    fetchUpiAccounts();
    fetchCashAccounts();
    fetchCashTransactions();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts?type=BANK');
      if (response.ok) {
        const result = await response.json();
        const accounts = result.data || [];
        setBankAccounts(accounts);

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

  const fetchCashAccounts = async () => {
    try {
      const response = await fetch('/api/finance/bank_accounts?type=CASH');
      if (response.ok) {
        const result = await response.json();
        setCashAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching cash accounts:', error);
    }
  };

  const fetchCashTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/finance/cash-transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch cash transactions');
      }
      const data = await response.json();
      setCashTransactions(data);
    } catch (error) {
      console.error('Error fetching cash transactions:', error);
      alert('Failed to fetch cash transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (bankAccountId: string) => {
    try {
      // Use the comprehensive bank-transactions API that includes all transaction types
      const response = await fetch(`/api/finance/bank-transactions?bank_account_id=${bankAccountId}&limit=100`);
      if (response.ok) {
        const result = await response.json();
        // The API returns comprehensive transactions including vendor payments, withdrawals, liability payments
        setTransactions(result.data?.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching comprehensive bank transactions:', error);
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
          linked_bank_account_id: '',
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



  const toggleAccountExpanded = (accountId: string) => {
    const newExpandedAccounts = new Set(expandedAccounts);
    if (newExpandedAccounts.has(accountId)) {
      newExpandedAccounts.delete(accountId);
    } else {
      newExpandedAccounts.add(accountId);
      // Fetch all transactions for this account when expanding
      fetchTransactions(accountId);
    }
    setExpandedAccounts(newExpandedAccounts);
  };

  // Combine all accounts for fund transfer dropdowns
  const allAccounts = [
    ...bankAccounts.map(account => ({
      id: account.id,
      name: account.name,
      type: 'bank' as const,
      balance: account.current_balance
    })),
    ...upiAccounts.map(account => ({
      id: account.id,
      name: account.name,
      type: 'upi' as const,
      balance: account.current_balance
    })),
    ...cashAccounts.map(account => ({
      id: account.id,
      name: account.name,
      type: 'cash' as const,
      balance: account.current_balance
    }))
  ];

  const handleFundTransfer = async () => {
    const amountValue = parseFloat(fundTransfer.amount);
    if (!fundTransfer.fromAccountId || !fundTransfer.toAccountId || !fundTransfer.amount || amountValue <= 0) {
      alert('Please fill in all required fields with valid values.');
      return;
    }

    if (fundTransfer.fromAccountId === fundTransfer.toAccountId) {
      alert('Source and destination accounts must be different.');
      return;
    }

    setTransferLoading(true);
    try {
      const response = await fetch('/api/finance/fund-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fundTransfer)
      });

      const result = await response.json();

      if (result.success) {
        alert(`Fund transfer successful! ₹${fundTransfer.amount.toLocaleString()} transferred successfully.`);
        
        // Reset form
        setFundTransfer({
          fromAccountId: '',
          toAccountId: '',
          amount: '',
          description: '',
          reference: '',
          date: new Date().toISOString().split('T')[0]
        });
        setShowFundTransfer(false);
        
        // Refresh accounts to show updated balances
        fetchBankAccounts();
        fetchUpiAccounts();
        fetchCashAccounts();
      } else {
        alert(`Transfer failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing fund transfer:', error);
      alert('An error occurred while processing the transfer.');
    } finally {
      setTransferLoading(false);
    }
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

  const getDisplayBalance = (account: BankAccount | UpiAccount | CashAccount) => {
    // Use calculated_balance if available, otherwise fall back to current_balance
    const balance = account.calculated_balance ?? account.current_balance;
    return formatCurrency(balance);
  };

  const getTotalBalance = () => {
    const bankTotal = bankAccounts.reduce((total, account) => {
      const balance = account.calculated_balance ?? account.current_balance;
      return total + balance;
    }, 0);
    
    const cashTotal = cashAccounts.reduce((total, account) => {
      const balance = account.calculated_balance ?? account.current_balance;
      return total + balance;
    }, 0);
    
    return bankTotal + cashTotal;
  };

  const getTotalPaymentMethods = () => {
    const allMethods = new Set<string>();
    
    bankAccounts.forEach(account => {
      if (account.payment_methods) {
        account.payment_methods.forEach(method => allMethods.add(method));
      }
    });
    
    upiAccounts.forEach(account => {
      if (account.payment_methods) {
        account.payment_methods.forEach(method => allMethods.add(method));
      }
    });
    
    cashAccounts.forEach(account => {
      if (account.payment_methods) {
        account.payment_methods.forEach(method => allMethods.add(method));
      }
    });
    
    return allMethods.size;
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Balance</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatCurrency(getTotalBalance())}
                </p>
              </div>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active Accounts</p>
                <p className="text-xl font-bold text-green-900">{bankAccounts.length}</p>
              </div>
              <div className="p-2 bg-green-500 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Payment Methods</p>
                <p className="text-xl font-bold text-orange-900">{getTotalPaymentMethods()}</p>
              </div>
              <div className="p-2 bg-orange-500 rounded-lg">
                <Receipt className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface for Bank, UPI and Cash Transactions */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'bank' | 'upi' | 'cash')}>
        <div className="flex justify-between items-center mb-4">
          <TabsList className="grid w-[600px] grid-cols-3">
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank Accounts
            </TabsTrigger>
            <TabsTrigger value="upi" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              UPI Accounts
            </TabsTrigger>
            <TabsTrigger value="cash" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Cash Transactions
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            {/* Fund Transfer Button */}
            <Dialog open={showFundTransfer} onOpenChange={setShowFundTransfer}>
              <DialogTrigger asChild>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Fund Transfer
                </Button>
              </DialogTrigger>
            </Dialog>

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
                              onClick={() => toggleAccountExpanded(account.id)}
                              className="mt-2"
                            >
                              {expandedAccounts.has(account.id) ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  Hide All Transactions
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  View All Transactions
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded All Transactions */}
                      <div className="p-4">
                        {expandedAccounts.has(account.id) && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">All Transactions</h4>
                            {transactions && transactions.length > 0 ? (
                              <div className="space-y-2 max-h-96 overflow-y-auto">
                                {transactions.map((transaction, index) => (
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
                                        <div className="flex items-center gap-2 mb-1">
                                          <p className="text-sm font-medium text-gray-900">
                                            {transaction.description}
                                          </p>
                                          {transaction.transaction_type && (
                                            <Badge 
                                              variant="secondary" 
                                              className={`text-xs px-1.5 py-0.5 ${
                                                transaction.transaction_type === 'vendor_payment' ? 'bg-blue-100 text-blue-700' :
                                                transaction.transaction_type === 'withdrawal' ? 'bg-orange-100 text-orange-700' :
                                                transaction.transaction_type === 'liability_payment' ? 'bg-purple-100 text-purple-700' :
                                                'bg-gray-100 text-gray-700'
                                              }`}
                                            >
                                              {transaction.transaction_type === 'vendor_payment' ? 'Vendor' :
                                               transaction.transaction_type === 'withdrawal' ? 'Withdrawal' :
                                               transaction.transaction_type === 'liability_payment' ? 'Loan Payment' :
                                               'Bank Transfer'}
                                            </Badge>
                                          )}
                                        </div>
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
                                <p className="text-sm">No transactions found</p>
                              </div>
                            )}
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

        {/* Cash Transactions Tab */}
        <TabsContent value="cash">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Cash Transactions
                </CardTitle>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Current Cash Balance</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{(cashTransactions.length > 0 ? cashTransactions[0]?.balance_after || 0 : 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-8 px-6">
                  <p>Loading cash transactions...</p>
                </div>
              ) : (
                <>
                  {cashTransactions.length === 0 ? (
                    <div className="text-center py-8 px-6 text-gray-500">
                      <Wallet className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No cash transactions found</p>
                      <p className="text-sm">Cash transactions from sales, investments, and other operations will appear here</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden">
                      {/* Header Row */}
                      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b text-sm font-medium text-gray-700">
                        <div className="col-span-2">Date</div>
                        <div className="col-span-4">Description</div>
                        <div className="col-span-2">Source</div>
                        <div className="col-span-2 text-right">Amount</div>
                        <div className="col-span-2 text-right">Balance</div>
                      </div>
                      
                      {/* Transaction Rows */}
                      <div className="divide-y divide-gray-100">
                        {cashTransactions.map((transaction) => (
                          <div key={transaction.id} className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
                            {/* Date */}
                            <div className="col-span-2 text-sm text-gray-600">
                              {new Date(transaction.transaction_date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                            
                            {/* Description */}
                            <div className="col-span-4">
                              <p className="text-sm font-medium text-gray-900">{transaction.description}</p>
                              <p className="text-xs text-gray-500">
                                Ref: {transaction.reference_number || 'N/A'}
                              </p>
                            </div>
                            
                            {/* Source */}
                            <div className="col-span-2">
                              <Badge variant="outline" className="text-xs">
                                {transaction.source}
                              </Badge>
                            </div>
                            
                            {/* Amount */}
                            <div className="col-span-2 text-right">
                              <span className={`text-sm font-semibold ${
                                transaction.transaction_type === 'CREDIT' 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {transaction.transaction_type === 'CREDIT' ? '+' : '-'}₹{Math.abs(transaction.amount).toLocaleString()}
                              </span>
                            </div>
                            
                            {/* Running Balance */}
                            <div className="col-span-2 text-right">
                              <span className="text-sm font-medium text-gray-900">
                                ₹{transaction.balance_after.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
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
                value={newUpiAccount.linked_bank_account_id || "none"}
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





      {/* Fund Transfer Dialog */}
      <Dialog open={showFundTransfer} onOpenChange={setShowFundTransfer}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center gap-3 p-6 border-b">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <ArrowRightLeft className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Fund Transfer</h3>
              <p className="text-sm text-gray-600">Transfer funds between accounts</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* From Account */}
            <div className="space-y-2">
              <Label htmlFor="fromAccount">From Account</Label>
              <Select
                value={fundTransfer.fromAccountId}
                onValueChange={(value) => setFundTransfer({
                  ...fundTransfer, 
                  fromAccountId: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        {account.type === 'bank' && <Building2 className="h-4 w-4" />}
                        {account.type === 'upi' && <Smartphone className="h-4 w-4" />}
                        {account.type === 'cash' && <Banknote className="h-4 w-4" />}
                        <span>{account.name}</span>
                        <span className="text-sm text-gray-500">
                          (₹{account.balance?.toFixed(2)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To Account */}
            <div className="space-y-2">
              <Label htmlFor="toAccount">To Account</Label>
              <Select
                value={fundTransfer.toAccountId}
                onValueChange={(value) => setFundTransfer({
                  ...fundTransfer, 
                  toAccountId: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts
                    .filter(account => account.id !== fundTransfer.fromAccountId)
                    .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-2">
                        {account.type === 'bank' && <Building2 className="h-4 w-4" />}
                        {account.type === 'upi' && <Smartphone className="h-4 w-4" />}
                        {account.type === 'cash' && <Banknote className="h-4 w-4" />}
                        <span>{account.name}</span>
                        <span className="text-sm text-gray-500">
                          (₹{account.balance?.toFixed(2)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={fundTransfer.amount}
                  onChange={(e) => setFundTransfer({...fundTransfer, amount: e.target.value})}
                  className="pl-9"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Transfer description (optional)"
                value={fundTransfer.description}
                onChange={(e) => setFundTransfer({...fundTransfer, description: e.target.value})}
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                placeholder="Reference number (optional)"
                value={fundTransfer.reference}
                onChange={(e) => setFundTransfer({...fundTransfer, reference: e.target.value})}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={fundTransfer.date}
                onChange={(e) => setFundTransfer({...fundTransfer, date: e.target.value})}
              />
            </div>

            {/* Transfer Summary */}
            {fundTransfer.fromAccountId && fundTransfer.toAccountId && fundTransfer.amount && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-sm text-gray-700">Transfer Summary</h4>
                <div className="text-sm text-gray-600">
                  <div>From: {allAccounts.find(a => a.id === fundTransfer.fromAccountId)?.name}</div>
                  <div>To: {allAccounts.find(a => a.id === fundTransfer.toAccountId)?.name}</div>
                  <div className="font-medium text-gray-900">Amount: ₹{parseFloat(fundTransfer.amount || '0').toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 p-6 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowFundTransfer(false)}
              className="flex-1"
              disabled={transferLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFundTransfer}
              disabled={
                !fundTransfer.fromAccountId || 
                !fundTransfer.toAccountId || 
                !fundTransfer.amount || 
                parseFloat(fundTransfer.amount || '0') <= 0 ||
                transferLoading
              }
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {transferLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer Funds
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

