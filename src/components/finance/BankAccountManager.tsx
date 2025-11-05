import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';

import { 
  Building2, 
  Plus, 
  Receipt,
  Wallet,
  Smartphone,
  Link,
  ArrowRightLeft,
  Banknote,
  IndianRupee,
  Loader2,
  RefreshCw
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



export function BankAccountManager() {
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [upiAccounts, setUpiAccounts] = useState<UpiAccount[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showFundTransfer, setShowFundTransfer] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [transferLoading, setTransferLoading] = useState(false);

  
  const [newAccount, setNewAccount] = useState({
    name: '',
    account_number: '',
    currency: 'INR',
    current_balance: 0
  });



  const [fundTransfer, setFundTransfer] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    isContraEntry: false
  });





  useEffect(() => {
    fetchBankAccounts();
    fetchUpiAccounts();
    fetchCashAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const response = await fetch('/api/finance/bank-accounts?type=BANK');
      if (response.ok) {
        const result = await response.json();
        const accounts = result.data || [];
        
        // Debug logging for HDFC
        const hdfc = accounts.find((acc: BankAccount) => acc.name.includes('HDFC'));
        if (hdfc) {
          console.log('HDFC Account Data from API:', {
            name: hdfc.name,
            current_balance: hdfc.current_balance,
            calculated_balance: hdfc.calculated_balance,
            transaction_balance: hdfc.transaction_balance,
            payments_balance: hdfc.payments_balance
          });
        }
        
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
      const response = await fetch('/api/finance/bank-accounts?type=UPI');
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
      const response = await fetch('/api/finance/bank-accounts?type=CASH');
      if (response.ok) {
        const result = await response.json();
        setCashAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching cash accounts:', error);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchBankAccounts(),
        fetchUpiAccounts(),
        fetchCashAccounts()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBankAccount = async () => {
    try {
      const response = await fetch('/api/finance/bank-accounts', {
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







  // Combine all accounts for fund transfer dropdowns
  const allAccounts = [
    ...bankAccounts.map(account => ({
      id: account.id,
      name: account.name,
      type: 'bank' as const,
      balance: account.calculated_balance ?? account.current_balance
    })),
    ...upiAccounts.map(account => ({
      id: account.id,
      name: account.name,
      type: 'upi' as const,
      balance: account.calculated_balance ?? account.current_balance
    })),
    ...cashAccounts.map(account => ({
      id: account.id,
      name: account.name,
      type: 'cash' as const,
      balance: account.calculated_balance ?? account.current_balance
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
    
    // For contra entries, validate that we're moving from cash to bank
    if (fundTransfer.isContraEntry) {
      const fromAccount = allAccounts.find(a => a.id === fundTransfer.fromAccountId);
      const toAccount = allAccounts.find(a => a.id === fundTransfer.toAccountId);
      
      if (fromAccount?.type !== 'cash') {
        alert('For cash deposits, the source account must be a cash account.');
        return;
      }
      
      if (toAccount?.type !== 'bank') {
        alert('For cash deposits, the destination account must be a bank account.');
        return;
      }
    }

    setTransferLoading(true);
    try {
      // Regular fund transfer - same API as before
      const response = await fetch('/api/finance/fund-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fundTransfer,
          description: fundTransfer.isContraEntry 
            ? `Cash deposit to bank: ${fundTransfer.description || 'No description'}`
            : fundTransfer.description
        })
      });

      const result = await response.json();

      if (result.success) {
        // For contra entries, also create a journal entry
        if (fundTransfer.isContraEntry) {
          try {
            // Get account details
            const fromAccount = allAccounts.find(a => a.id === fundTransfer.fromAccountId);
            const toAccount = allAccounts.find(a => a.id === fundTransfer.toAccountId);
            
            // Create journal entry for the contra entry
            const journalResponse = await fetch('/api/finance/journal-entries', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                journal_number: `CONTRA-${Date.now().toString().slice(-8)}`,
                entry_date: fundTransfer.date,
                description: `Cash Deposit: ${fromAccount?.name} to ${toAccount?.name}`,
                reference_number: result.data.transferId || `CD-${Date.now()}`,
                lines: [
                  {
                    // Credit Cash account (reducing cash on hand)
                    account_id: fundTransfer.fromAccountId, // Cash account ID
                    description: `Cash deposit to ${toAccount?.name}`,
                    debit_amount: 0,
                    credit_amount: amountValue
                  },
                  {
                    // Debit Bank account (increasing bank balance)
                    account_id: fundTransfer.toAccountId, // Bank account ID
                    description: `Cash deposit from ${fromAccount?.name}`,
                    debit_amount: amountValue,
                    credit_amount: 0
                  }
                ]
              })
            });
            
            const journalResult = await journalResponse.json();
            
            if (!journalResponse.ok) {
              console.error('Journal entry creation failed:', journalResult);
              // Still consider the operation successful since the fund transfer worked
            }
          } catch (journalError) {
            console.error('Error creating contra entry journal:', journalError);
            // Still consider the operation successful since the fund transfer worked
          }
        }
        
        const message = fundTransfer.isContraEntry 
          ? `Cash deposit successful! ₹${amountValue.toLocaleString()} deposited to bank.`
          : `Fund transfer successful! ₹${amountValue.toLocaleString()} transferred successfully.`;
          
        alert(message);
        
        // Reset form
        setFundTransfer({
          fromAccountId: '',
          toAccountId: '',
          amount: '',
          description: '',
          reference: '',
          date: new Date().toISOString().split('T')[0],
          isContraEntry: false
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

  const handleAccountClick = (account: BankAccount | UpiAccount | CashAccount, accountType: 'BANK' | 'UPI' | 'CASH') => {
    // Navigate to account-specific transactions page
    router.push(`/finance/transactions/${accountType.toLowerCase()}/${account.id}`);
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getDisplayBalance = (account: BankAccount | UpiAccount | CashAccount) => {
  // Always use current_balance from the database
  return formatCurrency(account.current_balance);
  };

  const getTotalBalance = () => {
    // Sum current_balance from all account types
    const bankTotal = bankAccounts.reduce((total, account) => total + (account.current_balance ?? 0), 0);
    const upiTotal = upiAccounts.reduce((total, account) => total + (account.current_balance ?? 0), 0);
    const cashTotal = cashAccounts.reduce((total, account) => total + (account.current_balance ?? 0), 0);
    return bankTotal + upiTotal + cashTotal;
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

  // Get color class for account balance
  const getBalanceColorClass = (balance: number) => {
    if (balance < -100000) return 'from-red-500 to-red-700 border-red-300'; // Deep red for large negative
    if (balance < 0) return 'from-red-400 to-red-600 border-red-200'; // Red for negative
    if (balance < 100000) return 'from-amber-400 to-amber-600 border-amber-200'; // Amber for low balance
    if (balance < 500000) return 'from-blue-400 to-blue-600 border-blue-200'; // Blue for medium balance
    return 'from-green-400 to-green-600 border-green-200'; // Green for good balance
  };

  // Get text color for balance
  const getBalanceTextColor = (balance: number) => {
    if (balance < 0) return 'text-red-100';
    return 'text-white';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:bg-green-100"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Finance Management</h2>
            <p className="text-gray-600 mt-1">Comprehensive financial management and reporting</p>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Overview</h3>
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
                  <p className="text-xl font-bold text-green-900">{bankAccounts.length + upiAccounts.length}</p>
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
      </div>

      {/* Bank Account Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Bank Accounts</h3>
            <p className="text-gray-600 text-sm">Manage bank accounts, UPI accounts and view all payment transactions</p>
          </div>
        </div>

        {/* Bank Account Cards - Small Horizontal Layout */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-700">All Accounts ({bankAccounts.length + upiAccounts.length + cashAccounts.length})</span>
            </div>
          </div>
          
          {/* All Account Cards in Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Bank Accounts */}
            {bankAccounts.map((account) => (
              <Card 
                key={account.id} 
                className={`bg-gradient-to-r ${getBalanceColorClass(account.current_balance)} border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105`}
                onClick={() => handleAccountClick(account, 'BANK')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 rounded-lg p-2 flex items-center justify-center backdrop-blur-sm">
                      <div className="w-5 h-5 flex items-center justify-center">
                        {getBankIcon(account.name)}
                      </div>
                    </div>
                    <div className="text-white min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{account.name}</h3>
                      <p className="text-white/70 text-xs">****{account.account_number?.slice(-4) || '0000'}</p>
                    </div>
                  </div>
                  
                  <div className="text-white">
                    <p className={`text-lg font-bold ${getBalanceTextColor(account.current_balance)} mb-2`}>
                      {getDisplayBalance(account)}
                    </p>
                    <div className="text-center text-white/80 text-xs">
                      Click to view transactions →
                    </div>
                  </div>


                </CardContent>
              </Card>
            ))}
            
            {/* UPI Accounts */}
            {upiAccounts.map((account) => (
              <Card 
                key={account.id} 
                className="bg-gradient-to-r from-teal-400 to-teal-600 border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
                onClick={() => handleAccountClick(account, 'UPI')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 rounded-lg p-2 flex items-center justify-center backdrop-blur-sm">
                      <Smartphone className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-white min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{account.name}</h3>
                      <p className="text-white/70 text-xs truncate">{account.upi_id}</p>
                    </div>
                  </div>
                  
                  <div className="text-white">
                    <p className="text-lg font-bold mb-2">
                      {getDisplayBalance(account)}
                    </p>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={`${account.is_active ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-800"} text-xs px-2 py-0.5`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {account.linked_bank_name && (
                        <div className="flex items-center gap-1 text-white/60">
                          <Link className="h-3 w-3" />
                          <span className="text-xs truncate max-w-16">{account.linked_bank_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-center text-white/80 text-xs">
                      Click to view transactions →
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Cash Accounts */}
            {cashAccounts.map((account) => (
              <Card 
                key={account.id} 
                className="bg-gradient-to-r from-emerald-400 to-emerald-600 border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
                onClick={() => handleAccountClick(account, 'CASH')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/20 rounded-lg p-2 flex items-center justify-center backdrop-blur-sm">
                      <Wallet className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-white min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">{account.name}</h3>
                      <p className="text-white/70 text-xs">Cash Account</p>
                    </div>
                  </div>
                  
                  <div className="text-white">
                    <p className="text-lg font-bold mb-2">
                      {getDisplayBalance(account)}
                    </p>
                    <div className="mb-2">
                      <Badge className={`${account.is_active ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-800"} text-xs px-2 py-0.5`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-center text-white/80 text-xs">
                      Click to view transactions →
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Cash Flow / All Bank Transactions Card */}
            <Card 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 border shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
              onClick={() => router.push('/finance/transactions/all-bank')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/20 rounded-lg p-2 flex items-center justify-center backdrop-blur-sm">
                    <ArrowRightLeft className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-white min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">Cash Flow</h3>
                    <p className="text-white/70 text-xs">All Bank Transactions</p>
                  </div>
                </div>
                
                <div className="text-white">
                  <p className="text-lg font-bold mb-2">
                    View All Accounts
                  </p>
                  <div className="mb-2">
                    <Badge className="bg-blue-200 text-blue-800 text-xs px-2 py-0.5">
                      {bankAccounts.length + cashAccounts.length} Accounts
                    </Badge>
                  </div>
                  <div className="text-center text-white/80 text-xs">
                    Click to view all transactions →
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Empty State */}
            {bankAccounts.length === 0 && upiAccounts.length === 0 && cashAccounts.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No accounts found</p>
                <p className="text-sm">Add your first account to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>



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







      {/* Fund Transfer Dialog */}
      <Dialog open={showFundTransfer} onOpenChange={setShowFundTransfer}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto w-full">
          <div className="flex items-center gap-2 p-3 border-b">
            <div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center">
              <ArrowRightLeft className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold">{fundTransfer.isContraEntry ? 'Cash Deposit to Bank' : 'Fund Transfer'}</h3>
              <p className="text-xs text-gray-600">
                {fundTransfer.isContraEntry 
                  ? 'Record cash deposit to bank account (contra entry)'
                  : 'Transfer funds between accounts'}
              </p>
            </div>
          </div>

          {/* Transfer Type Selection */}
          <div className="px-3 pt-2">
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant={!fundTransfer.isContraEntry ? "default" : "outline"}
                onClick={() => setFundTransfer(prev => ({ ...prev, isContraEntry: false }))}
                className={`${!fundTransfer.isContraEntry ? "bg-purple-600 hover:bg-purple-700" : ""} text-xs`}
                size="sm"
              >
                <ArrowRightLeft className="h-3 w-3 mr-1" />
                Regular Transfer
              </Button>
              <Button
                type="button"
                variant={fundTransfer.isContraEntry ? "default" : "outline"}
                onClick={() => {
                  // When switching to contra entry, auto-select cash accounts if available
                  const cashAccount = cashAccounts[0]?.id || '';
                  const bankAccount = bankAccounts[0]?.id || '';
                  setFundTransfer(prev => ({ 
                    ...prev, 
                    isContraEntry: true,
                    fromAccountId: cashAccount,
                    toAccountId: bankAccount
                  }));
                }}
                className={`${fundTransfer.isContraEntry ? "bg-green-600 hover:bg-green-700" : ""} text-xs`}
                size="sm"
              >
                <Banknote className="h-3 w-3 mr-1" />
                Cash Deposit
              </Button>
            </div>
          </div>

          <div className="p-3 space-y-2">
            {/* From Account */}
            <div className="space-y-1">
              <Label htmlFor="fromAccount" className="text-xs">From Account</Label>
              <Select
                value={fundTransfer.fromAccountId}
                onValueChange={(value) => setFundTransfer({
                  ...fundTransfer, 
                  fromAccountId: value
                })}
              >
                <SelectTrigger className="h-7 text-xs py-1">
                  <SelectValue placeholder="Select source account" />
                </SelectTrigger>
                <SelectContent>
                  {/* Filter accounts based on transfer type */}
                  {allAccounts
                    .filter(account => !fundTransfer.isContraEntry || account.type === 'cash')
                    .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-1.5">
                        {account.type === 'bank' && <Building2 className="h-3 w-3" />}
                        {account.type === 'upi' && <Smartphone className="h-3 w-3" />}
                        {account.type === 'cash' && <Banknote className="h-3 w-3" />}
                        <span className="text-xs">{account.name}</span>
                        <span className="text-xs text-gray-500">
                          (₹{account.balance?.toFixed(2)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* To Account */}
            <div className="space-y-1">
              <Label htmlFor="toAccount" className="text-xs">To Account</Label>
              <Select
                value={fundTransfer.toAccountId}
                onValueChange={(value) => setFundTransfer({
                  ...fundTransfer, 
                  toAccountId: value
                })}
              >
                <SelectTrigger className="h-7 text-xs py-1">
                  <SelectValue placeholder="Select destination account" />
                </SelectTrigger>
                <SelectContent>
                  {allAccounts
                    .filter(account => {
                      // Different filtering based on transfer type
                      if (fundTransfer.isContraEntry) {
                        return account.type === 'bank';  // Only bank accounts for cash deposits
                      } else {
                        return account.id !== fundTransfer.fromAccountId;  // Any account except source for regular transfers
                      }
                    })
                    .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center gap-1.5">
                        {account.type === 'bank' && <Building2 className="h-3 w-3" />}
                        {account.type === 'upi' && <Smartphone className="h-3 w-3" />}
                        {account.type === 'cash' && <Banknote className="h-3 w-3" />}
                        <span className="text-xs">{account.name}</span>
                        <span className="text-xs text-gray-500">
                          (₹{account.balance?.toFixed(2)})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1">
              <Label htmlFor="amount" className="text-xs">Amount</Label>
              <div className="relative">
                <IndianRupee className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={fundTransfer.amount}
                  onChange={(e) => setFundTransfer({...fundTransfer, amount: e.target.value})}
                  className="pl-7 h-7 text-xs"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Input
                id="description"
                placeholder={fundTransfer.isContraEntry ? "Reason for cash deposit" : "Transfer description (optional)"}
                value={fundTransfer.description}
                onChange={(e) => setFundTransfer({...fundTransfer, description: e.target.value})}
                className="h-7 text-xs"
              />
            </div>

            {/* Reference */}
            <div className="space-y-1">
              <Label htmlFor="reference" className="text-xs">Reference</Label>
              <Input
                id="reference"
                placeholder="Reference number (optional)"
                value={fundTransfer.reference}
                onChange={(e) => setFundTransfer({...fundTransfer, reference: e.target.value})}
                className="h-7 text-xs"
              />
            </div>

            {/* Date */}
            <div className="space-y-1">
              <Label htmlFor="date" className="text-xs">Date</Label>
              <Input
                id="date"
                type="date"
                value={fundTransfer.date}
                onChange={(e) => setFundTransfer({...fundTransfer, date: e.target.value})}
                className="h-7 text-xs"
              />
            </div>

            {/* Transfer Summary */}
            {fundTransfer.fromAccountId && fundTransfer.toAccountId && fundTransfer.amount && (
              <div className={`${fundTransfer.isContraEntry ? 'bg-green-50 border border-green-100' : 'bg-gray-50'} rounded-lg p-2 space-y-0.5`}>
                <h4 className="font-medium text-xs text-gray-700">
                  {fundTransfer.isContraEntry ? 'Cash Deposit Summary' : 'Transfer Summary'}
                </h4>
                <div className="text-xs text-gray-600">
                  <div>From: {allAccounts.find(a => a.id === fundTransfer.fromAccountId)?.name}</div>
                  <div>To: {allAccounts.find(a => a.id === fundTransfer.toAccountId)?.name}</div>
                  <div className="font-medium text-gray-900">Amount: ₹{parseFloat(fundTransfer.amount || '0').toFixed(2)}</div>
                  {fundTransfer.isContraEntry && (
                    <div className="mt-1 text-green-700 bg-green-50 p-1.5 rounded text-xs">
                      <span className="font-semibold">Contra Entry:</span> Will be recorded as cash deposit with proper accounting.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1.5 p-2 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowFundTransfer(false)}
              className="flex-1 text-xs h-7 py-1"
              disabled={transferLoading}
              size="sm"
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
              className={`flex-1 text-xs h-7 py-1 ${fundTransfer.isContraEntry ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}
              size="sm"
            >
              {transferLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {fundTransfer.isContraEntry ? 'Deposit Cash' : 'Transfer Funds'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div 
          className="relative"
          onMouseEnter={() => setFabExpanded(true)}
          onMouseLeave={() => setFabExpanded(false)}
        >
          {/* Expanded Action Buttons */}
          <div className={`absolute bottom-16 right-0 flex flex-col gap-3 transition-all duration-300 ${
            fabExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}>
            {/* All Transactions */}
            <button
              onClick={handleViewAllTransactions}
              className="group flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            >
              <span className="text-sm font-medium whitespace-nowrap">All Transactions</span>
              <div className="bg-white/20 p-2 rounded-full">
                <Receipt className="h-4 w-4" />
              </div>
            </button>

            {/* Fund Transfer */}
            <button
              onClick={() => setShowFundTransfer(true)}
              className="group flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            >
              <span className="text-sm font-medium whitespace-nowrap">Fund Transfer</span>
              <div className="bg-white/20 p-2 rounded-full">
                <ArrowRightLeft className="h-4 w-4" />
              </div>
            </button>

            {/* Cash Deposit */}
            <button
              onClick={() => {
                const cashAccount = cashAccounts[0]?.id || '';
                const bankAccount = bankAccounts[0]?.id || '';
                
                if (!cashAccount || !bankAccount) {
                  alert('You need both a cash account and a bank account to make a cash deposit.');
                  return;
                }
                
                setFundTransfer({
                  fromAccountId: cashAccount,
                  toAccountId: bankAccount,
                  amount: '',
                  description: 'Cash deposit to bank',
                  reference: '',
                  date: new Date().toISOString().split('T')[0],
                  isContraEntry: true
                });
                setShowFundTransfer(true);
              }}
              className="group flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            >
              <span className="text-sm font-medium whitespace-nowrap">Cash Deposit</span>
              <div className="bg-white/20 p-2 rounded-full">
                <Banknote className="h-4 w-4" />
              </div>
            </button>

            {/* Add Bank Account */}
            <button
              onClick={() => setShowAddAccount(true)}
              className="group flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            >
              <span className="text-sm font-medium whitespace-nowrap">Add Bank Account</span>
              <div className="bg-white/20 p-2 rounded-full">
                <Plus className="h-4 w-4" />
              </div>
            </button>
          </div>

          {/* Main FAB Button */}
          <button
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:rotate-90"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Add Account Dialog */}
      <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Bank Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                placeholder="e.g., Main Business Account"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="account-number">Account Number</Label>
              <Input
                id="account-number"
                placeholder="e.g., 1234567890"
                value={newAccount.account_number}
                onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="initial-balance">Initial Balance</Label>
              <Input
                id="initial-balance"
                type="number"
                placeholder="0.00"
                value={newAccount.current_balance || ''}
                onChange={(e) => setNewAccount({ ...newAccount, current_balance: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAccount(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addBankAccount}
              disabled={!newAccount.name || !newAccount.account_number}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

