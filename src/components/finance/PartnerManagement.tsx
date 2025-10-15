'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Edit3, 
  Trash2, 
  Search,
  UserPlus,
  AlertCircle,
  Building2,
  Loader2,
  CreditCard,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

interface Partner {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  partner_type: string;
  initial_investment: number;
  equity_percentage: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Investment {
  id: number;
  partner_id: number;
  amount: number;
  investment_date: string;
  description: string;
  payment_method: string;
  reference_number?: string;
  created_at: string;
}

interface Withdrawal {
  id: number;
  partner_id: number;
  amount: number;
  withdrawal_date: string;
  withdrawal_type: string;
  description: string;
  payment_method: string;
  reference_number?: string;
  created_at: string;
}

interface Loan {
  id: string;
  loan_name: string;
  bank_name?: string;
  loan_account_code: string;
  loan_type: string;
  loan_number?: string;
  original_loan_amount: number;
  opening_balance: number;
  current_balance: number;
  interest_rate?: number;
  loan_tenure_months?: number;
  emi_amount?: number;
  loan_start_date?: string;
  loan_end_date?: string;
  status: string;
  description?: string;
  created_at: string;
}

interface LiabilityPayment {
  id: string;
  date: string;
  liability_type: string;
  loan_id?: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  description: string;
  payment_method: string;
  bank_account_id?: string;
  upi_reference?: string;
  reference_number?: string;
  created_at: string;
  bank_account_name?: string;
  loan_name?: string;
  loan_bank_name?: string;
  loan_type?: string;
  loan_number?: string;
  loan_account_code?: string;
  loan_current_balance?: number;
  loan_emi_amount?: number;
}
//   loan_start_date: string;
//   loan_end_date?: string;
//   created_at: string;
// }

interface PartnerSummary extends Partner {
  total_investments: number;
  total_withdrawals: number;
  current_balance: number;
  transaction_count: number;
  last_transaction_date?: string;
}

export function PartnerManagement() {
  const [partners, setPartners] = useState<PartnerSummary[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [liabilityPayments, setLiabilityPayments] = useState<LiabilityPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedPartner, setSelectedPartner] = useState<PartnerSummary | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('partners');
  const [expandedPartner, setExpandedPartner] = useState<number | null>(null);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);
  
  // Dialog states
  const [showAddInvestorModal, setShowAddInvestorModal] = useState(false);
  const [createInvestmentOpen, setCreateInvestmentOpen] = useState(false);
  const [createWithdrawalOpen, setCreateWithdrawalOpen] = useState(false);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  
  // Investment form state
  const [investmentForm, setInvestmentForm] = useState({
    investor_id: '',
    category: '',
    amount: '',
    payment_method: 'cash',
    bank_account_id: '',
    upi_reference: '',
    reference_number: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Withdrawal form state
  const [withdrawalForm, setWithdrawalForm] = useState({
    partner_id: '',
    category_id: '',
    subcategory_id: '',
    amount: '',
    withdrawal_type: 'profit_distribution',
    payment_method: 'cash',
    bank_account_id: '',
    upi_reference: '',
    reference_number: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  // Additional data states
  const [investmentCategories, setInvestmentCategories] = useState<{id: string; category_name: string; description?: string}[]>([]);
  const [withdrawalCategories, setWithdrawalCategories] = useState<{id: string; category_name: string; description?: string}[]>([]);
  const [withdrawalSubcategories, setWithdrawalSubcategories] = useState<{id: string; category_id: string; subcategory_name: string; description?: string}[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{id: string; account_name: string; account_number: string; account_type?: string}[]>([]);
  
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    partner_type: '',
    initial_investment: '',
    equity_percentage: '',
    notes: '',
    is_active: true
  });

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch partners with summary calculations
      const partnersResponse = await fetch('/api/equity/partners/summary');
      const partnersData = await partnersResponse.json();
      
      // Fetch investments
      const investmentsResponse = await fetch('/api/equity/investments');
      const investmentsData = await investmentsResponse.json();
      
      // Fetch withdrawals
      const withdrawalsResponse = await fetch('/api/equity/withdrawals');
      const withdrawalsData = await withdrawalsResponse.json();
      
      // Fetch loans
      const loansResponse = await fetch('/api/finance/loan-opening-balances');
      const loansData = await loansResponse.json();

      // Fetch liability payments
      const liabilityPaymentsResponse = await fetch('/api/finance/liability-payments');
      const liabilityPaymentsData = await liabilityPaymentsResponse.json();

      // Fetch bank accounts
      const bankAccountsResponse = await fetch('/api/finance/bank-accounts');
      const bankAccountsData = await bankAccountsResponse.json();

      // Fetch investment categories
      const investmentCategoriesResponse = await fetch('/api/equity/investment-categories');
      const investmentCategoriesData = await investmentCategoriesResponse.json();

      // Fetch withdrawal categories
      const withdrawalCategoriesResponse = await fetch('/api/equity/withdrawal-categories');
      const withdrawalCategoriesData = await withdrawalCategoriesResponse.json();

      // Fetch withdrawal subcategories
      const withdrawalSubcategoriesResponse = await fetch('/api/equity/withdrawal-subcategories');
      const withdrawalSubcategoriesData = await withdrawalSubcategoriesResponse.json();

      setPartners(partnersData.partners || []);
      setInvestments(investmentsData.investments || []);
      setWithdrawals(withdrawalsData.withdrawals || []);
      setLoans(loansData.loanBalances || []);
      setLiabilityPayments(liabilityPaymentsData.success ? (liabilityPaymentsData.data || []) : []);
      setBankAccounts(bankAccountsData.accounts || []);
      setInvestmentCategories(investmentCategoriesData.success ? (investmentCategoriesData.data || []) : []);
      setWithdrawalCategories(withdrawalCategoriesData.success ? (withdrawalCategoriesData.data || []) : []);
      setWithdrawalSubcategories(withdrawalSubcategoriesData.success ? (withdrawalSubcategoriesData.data || []) : []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter partners based on search and type
  const filteredPartners = partners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.phone?.includes(searchTerm);
    
    const matchesType = filterType === 'all' || 
                       (filterType === 'active' && partner.is_active) ||
                       (filterType === 'inactive' && !partner.is_active) ||
                       partner.partner_type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Filter loans based on search
  const filteredLoans = loans.filter(loan => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return loan.loan_name.toLowerCase().includes(searchLower) ||
           loan.bank_name?.toLowerCase().includes(searchLower) ||
           loan.loan_type.toLowerCase().includes(searchLower) ||
           loan.loan_number?.toLowerCase().includes(searchLower) ||
           loan.loan_account_code.toLowerCase().includes(searchLower);
  });

  // Filter liability payments based on search
  const filteredLiabilityPayments = liabilityPayments.filter(payment => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return payment.loan_name?.toLowerCase().includes(searchLower) ||
           payment.loan_bank_name?.toLowerCase().includes(searchLower) ||
           payment.description.toLowerCase().includes(searchLower) ||
           payment.liability_type.toLowerCase().includes(searchLower) ||
           payment.payment_method.toLowerCase().includes(searchLower);
  });

  // Get transactions for selected partner
  const getPartnerTransactions = (partnerId: number) => {
    const partnerInvestments = investments.filter(inv => inv.partner_id === partnerId);
    const partnerWithdrawals = withdrawals.filter(wd => wd.partner_id === partnerId);
    
    const allTransactions = [
      ...partnerInvestments.map(inv => ({
        ...inv,
        type: 'investment',
        date: inv.investment_date
      })),
      ...partnerWithdrawals.map(wd => ({
        ...wd,
        type: 'withdrawal',
        date: wd.withdrawal_date
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return allTransactions;
  };

  // Get liability payments for selected loan
  const getLoanLiabilityPayments = (loanId: string) => {
    return liabilityPayments.filter(payment => payment.loan_id === loanId);
  };

  // Handle showing partner details
  // Handle partner row expansion
  const togglePartnerExpansion = (partnerId: number) => {
    setExpandedPartner(expandedPartner === partnerId ? null : partnerId);
  };

  // Handle loan row expansion
  const toggleLoanExpansion = (loanId: string) => {
    setExpandedLoan(expandedLoan === loanId ? null : loanId);
  };

  // Handle edit partner
  const handleEditPartner = (partner: PartnerSummary) => {
    setSelectedPartner(partner);
    setEditForm({
      name: partner.name,
      email: partner.email || '',
      phone: partner.phone || '',
      partner_type: partner.partner_type,
      initial_investment: partner.initial_investment.toString(),
      equity_percentage: partner.equity_percentage.toString(),
      notes: partner.notes || '',
      is_active: partner.is_active
    });
    setEditDialogOpen(true);
  };

  // Save partner changes
  const handleSavePartner = async () => {
    if (!selectedPartner || saveLoading) return;
    
    setSaveLoading(true);
    try {
      const response = await fetch(`/api/equity/partners/${selectedPartner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          initial_investment: parseFloat(editForm.initial_investment),
          equity_percentage: parseFloat(editForm.equity_percentage)
        })
      });
      
      if (response.ok) {
        setEditDialogOpen(false);
        fetchData();
        alert('Partner updated successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to update partner: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating partner:', error);
      alert('Error updating partner');
    } finally {
      setSaveLoading(false);
    }
  };

  // Handle delete partner
  const handleDeletePartner = async () => {
    if (!selectedPartner || deleteLoading) return;
    
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/equity/partners/${selectedPartner.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setDeleteDialogOpen(false);
        setSelectedPartner(null);
        fetchData();
        alert('Partner deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to delete partner: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert('Error deleting partner');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle add new investor
  const handleAddNewInvestor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const investorData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string || null,
      phone: formData.get('phone') as string || null,
      partner_type: formData.get('partner_type') as string || 'partner',
      initial_investment: parseFloat(formData.get('initial_investment') as string) || 0,
      equity_percentage: parseFloat(formData.get('equity_percentage') as string) || 0,
      is_active: formData.get('is_active') === 'on',
      notes: formData.get('notes') as string || null,
    };

    if (!investorData.name.trim()) {
      alert('Please enter a valid investor name');
      return;
    }

    if (investorData.equity_percentage < 0 || investorData.equity_percentage > 100) {
      alert('Equity percentage must be between 0 and 100');
      return;
    }

    try {
      const response = await fetch('/api/equity/investors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(investorData),
      });

      if (response.ok) {
        form.reset();
        setShowAddInvestorModal(false);
        fetchData();
        alert('New partner/investor added successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to add partner/investor: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding partner/investor:', error);
      alert('Error adding partner/investor. Please try again.');
    }
  };

  // Handle create investment
  const handleCreateInvestment = async () => {
    // Validation
    if (!investmentForm.investor_id) {
      alert('Please select an investor');
      return;
    }

    if (!investmentForm.amount || parseFloat(investmentForm.amount) <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    if (!investmentForm.description.trim()) {
      alert('Please enter a description for the investment');
      return;
    }

    if (!investmentForm.category) {
      alert('Please select an investment category');
      return;
    }

    const requiresBankAccount = ['bank_transfer', 'card', 'cheque', 'online'].includes(investmentForm.payment_method);
    if (requiresBankAccount && !investmentForm.bank_account_id) {
      alert('Please select a bank account for this payment method');
      return;
    }

    try {
      const response = await fetch('/api/equity/investments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...investmentForm,
          amount: parseFloat(investmentForm.amount)
        }),
      });

      if (response.ok) {
        setCreateInvestmentOpen(false);
        setInvestmentForm({
          investor_id: '',
          category: '',
          amount: '',
          payment_method: 'cash',
          bank_account_id: '',
          upi_reference: '',
          reference_number: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        fetchData();
        alert('Investment recorded successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to record investment: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error recording investment:', error);
      alert('Error recording investment. Please try again.');
    }
  };

  // Handle create withdrawal
  const handleCreateWithdrawal = async () => {
    // Validation
    if (!withdrawalForm.partner_id) {
      alert('Please select a partner');
      return;
    }

    if (!withdrawalForm.amount || parseFloat(withdrawalForm.amount) <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    if (!withdrawalForm.description.trim()) {
      alert('Please enter a description for the withdrawal');
      return;
    }

    if (!withdrawalForm.category_id) {
      alert('Please select a withdrawal category');
      return;
    }

    const requiresBankAccount = ['bank_transfer', 'online', 'cheque'].includes(withdrawalForm.payment_method);
    if (requiresBankAccount && !withdrawalForm.bank_account_id) {
      alert('Please select a bank account for this payment method');
      return;
    }

    if (withdrawalForm.payment_method === 'upi' && !withdrawalForm.bank_account_id) {
      alert('Please select a UPI account');
      return;
    }

    setWithdrawalLoading(true);
    try {
      const response = await fetch('/api/equity/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...withdrawalForm,
          amount: parseFloat(withdrawalForm.amount)
        }),
      });

      if (response.ok) {
        setCreateWithdrawalOpen(false);
        setWithdrawalForm({
          partner_id: '',
          category_id: '',
          subcategory_id: '',
          amount: '',
          withdrawal_type: 'profit_distribution',
          payment_method: 'cash',
          bank_account_id: '',
          upi_reference: '',
          reference_number: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        fetchData();
        alert('Withdrawal recorded successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to record withdrawal: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error recording withdrawal:', error);
      alert('Error recording withdrawal. Please try again.');
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading partner data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Professional Header with Expandable Search */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-3 sm:p-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight">Loans & Investments</h1>
            <p className="text-blue-100 mt-0.5 text-[11px] sm:text-xs hidden sm:block">Comprehensive partner and loan portfolio management</p>
          </div>
          
          {/* Expandable Search & Filter */}
          <div className="flex items-center gap-2">
            {searchExpanded ? (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20 animate-in slide-in-from-right duration-200">
                <Search className="h-4 w-4 text-white/80 flex-shrink-0" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="border-0 h-7 px-0 focus-visible:ring-0 text-sm bg-transparent text-white placeholder:text-white/60 w-40 sm:w-64"
                />
                <div className="w-24 flex-shrink-0">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-7 text-xs border-white/20 focus:ring-0 bg-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="investor">Investors</SelectItem>
                      <SelectItem value="partner">Partners</SelectItem>
                      <SelectItem value="owner">Owners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchExpanded(false);
                    setSearchTerm('');
                    setFilterType('all');
                  }}
                  className="h-7 w-7 p-0 hover:bg-white/10 text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSearchExpanded(true)}
                className="h-9 w-9 p-0 hover:bg-white/10 text-white"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Ultra Compact Summary Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Total Partners */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-blue-50 rounded">
                <Users className="h-3 w-3 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-gray-500 truncate leading-tight">Partners</p>
                <p className="text-sm font-bold text-gray-900 truncate leading-tight">{partners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Total Investments */}
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-green-50 rounded">
                <TrendingUp className="h-3 w-3 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-gray-500 truncate leading-tight">Investments</p>
                <p className="text-[11px] font-bold text-green-600 truncate leading-tight">
                  {formatCurrency(partners.reduce((sum, p) => sum + p.total_investments, 0)).replace('₹', '₹')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Total Withdrawals */}
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-red-50 rounded">
                <TrendingDown className="h-3 w-3 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-gray-500 truncate leading-tight">Withdrawals</p>
                <p className="text-[11px] font-bold text-red-600 truncate leading-tight">
                  {formatCurrency(partners.reduce((sum, p) => sum + p.total_withdrawals, 0)).replace('₹', '₹')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Net Balance */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-purple-50 rounded">
                <DollarSign className="h-3 w-3 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-gray-500 truncate leading-tight">Net Balance</p>
                <p className="text-[11px] font-bold text-purple-600 truncate leading-tight">
                  {formatCurrency(partners.reduce((sum, p) => sum + p.current_balance, 0)).replace('₹', '₹')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Total Loans */}
        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-orange-50 rounded">
                <Building2 className="h-3 w-3 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-gray-500 truncate leading-tight">Loans</p>
                <p className="text-[11px] font-bold text-orange-600 truncate leading-tight">
                  {formatCurrency(loans.reduce((sum, loan) => sum + loan.current_balance, 0)).replace('₹', '₹')}
                </p>
                <p className="text-[8px] text-gray-400 truncate leading-tight">{loans.length} active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Liability Payments */}
        <Card className="border-l-4 border-l-indigo-500 shadow-sm">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 bg-indigo-50 rounded">
                <CreditCard className="h-3 w-3 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-medium text-gray-500 truncate leading-tight">Payments</p>
                <p className="text-[11px] font-bold text-indigo-600 truncate leading-tight">
                  {formatCurrency(liabilityPayments.reduce((sum, payment) => sum + payment.total_amount, 0)).replace('₹', '₹')}
                </p>
                <p className="text-[8px] text-gray-400 truncate leading-tight">{liabilityPayments.length} records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compact Tabs Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9 bg-white border border-gray-200 p-0.5 rounded-lg shadow-sm">
          <TabsTrigger 
            value="partners" 
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all text-xs py-1.5 h-8"
          >
            <Users className="h-3 w-3 mr-1.5" />
            <span>Partners</span>
          </TabsTrigger>
          <TabsTrigger 
            value="loans"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all text-xs py-1.5 h-8"
          >
            <Building2 className="h-3 w-3 mr-1.5" />
            <span>Loans</span>
          </TabsTrigger>
          <TabsTrigger 
            value="liability-payments"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-md transition-all text-xs py-1.5 h-8"
          >
            <CreditCard className="h-3 w-3 mr-1.5" />
            <span>Payments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="space-y-2 mt-3">
          {/* Partners Table - No Card Header */}
          <Card className="shadow-sm border-gray-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold py-2">Partner</TableHead>
                      <TableHead className="text-xs font-semibold py-2 hidden md:table-cell">Type</TableHead>
                      <TableHead className="text-xs font-semibold py-2 hidden lg:table-cell">Contact</TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold hidden xl:table-cell">Equity %</TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold text-right">Investments</TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold text-right">Withdrawals</TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold text-right">Balance</TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold hidden sm:table-cell">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartners.map((partner) => (
                      <React.Fragment key={partner.id}>
                        <TableRow 
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => togglePartnerExpansion(partner.id)}
                        >
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">{partner.name}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <span>ID: {partner.id}</span>
                                  <span className="md:hidden">
                                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                                      {partner.partner_type}
                                    </Badge>
                                  </span>
                                </div>
                              </div>
                              {expandedPartner === partner.id ? (
                                <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 hidden md:table-cell">
                            <Badge variant="outline" className="text-xs">
                              {partner.partner_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 hidden lg:table-cell">
                            <div className="text-xs space-y-0.5">
                              {partner.phone && <div className="truncate">{partner.phone}</div>}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 hidden xl:table-cell">
                            <span className="font-medium text-sm">{partner.equity_percentage}%</span>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <div className="text-green-600 font-semibold text-xs sm:text-sm whitespace-nowrap">
                              {formatCurrency(partner.total_investments)}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <div className="text-red-600 font-semibold text-xs sm:text-sm whitespace-nowrap">
                              {formatCurrency(partner.total_withdrawals)}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-right">
                            <div className={`font-semibold text-xs sm:text-sm whitespace-nowrap ${partner.current_balance >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                              {formatCurrency(partner.current_balance)}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 hidden sm:table-cell">
                            <Badge variant={partner.is_active ? "default" : "secondary"} className="text-xs">
                              {partner.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditPartner(partner)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPartner(partner);
                                  setDeleteDialogOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expandable Details Row */}
                        {expandedPartner === partner.id && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0">
                              <div className="bg-gray-50 border-t border-gray-200 animate-in slide-in-from-top-2 duration-300">
                                <div className="p-6 space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Partner Information */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Partner Information</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <div><strong>Name:</strong> {partner.name}</div>
                                        <div><strong>Type:</strong> {partner.partner_type}</div>
                                        <div><strong>Email:</strong> {partner.email || 'N/A'}</div>
                                        <div><strong>Phone:</strong> {partner.phone || 'N/A'}</div>
                                        <div><strong>Equity:</strong> {partner.equity_percentage}%</div>
                                        <div><strong>Status:</strong> 
                                          <Badge className="ml-2" variant={partner.is_active ? "default" : "secondary"}>
                                            {partner.is_active ? 'Active' : 'Inactive'}
                                          </Badge>
                                        </div>
                                        <div><strong>Member Since:</strong> {formatDate(partner.created_at)}</div>
                                      </CardContent>
                                    </Card>
                                    
                                    {/* Financial Summary */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Financial Summary</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <div className="flex justify-between">
                                          <span>Total Investments:</span>
                                          <span className="text-green-600 font-medium">
                                            {formatCurrency(partner.total_investments)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Total Withdrawals:</span>
                                          <span className="text-red-600 font-medium">
                                            {formatCurrency(partner.total_withdrawals)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2">
                                          <span className="font-medium">Current Balance:</span>
                                          <span className={`font-bold ${partner.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(partner.current_balance)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Total Transactions:</span>
                                          <span className="font-medium">{partner.transaction_count}</span>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                  
                                  {/* Transaction History */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Transaction History</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Date</TableHead>
                                              <TableHead>Type</TableHead>
                                              <TableHead>Amount</TableHead>
                                              <TableHead>Method</TableHead>
                                              <TableHead>Description</TableHead>
                                              <TableHead>Reference</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {getPartnerTransactions(partner.id).map((transaction, index) => (
                                              <TableRow key={`${transaction.type}-${transaction.id}-${index}`}>
                                                <TableCell>{formatDate(transaction.date)}</TableCell>
                                                <TableCell>
                                                  <Badge variant={transaction.type === 'investment' ? "default" : "destructive"}>
                                                    {transaction.type === 'investment' ? (
                                                      <TrendingUp className="h-3 w-3 mr-1" />
                                                    ) : (
                                                      <TrendingDown className="h-3 w-3 mr-1" />
                                                    )}
                                                    {transaction.type}
                                                  </Badge>
                                                </TableCell>
                                                <TableCell>
                                                  <span className={transaction.type === 'investment' ? 'text-green-600' : 'text-red-600'}>
                                                    {transaction.type === 'investment' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                                  </span>
                                                </TableCell>
                                                <TableCell>{transaction.payment_method}</TableCell>
                                                <TableCell>{transaction.description}</TableCell>
                                                <TableCell>{transaction.reference_number || 'N/A'}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Notes if available */}
                                  {partner.notes && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Notes</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <p className="text-gray-700">{partner.notes}</p>
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {filteredPartners.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No partners found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          {/* Loans Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Loans Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loan Name</TableHead>
                      <TableHead>Bank/Lender</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Original Amount</TableHead>
                      <TableHead>Current Balance</TableHead>
                      <TableHead>Interest Rate</TableHead>
                      <TableHead>EMI Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoans.length > 0 ? filteredLoans.map((loan) => (
                      <React.Fragment key={loan.id}>
                        <TableRow 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleLoanExpansion(loan.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{loan.loan_name}</span>
                              {expandedLoan === loan.id ? (
                                <ChevronUp className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-400 transition-transform duration-200" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{loan.bank_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {loan.loan_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(loan.original_loan_amount)}</TableCell>
                          <TableCell className="font-semibold text-red-600">
                            {formatCurrency(loan.current_balance)}
                          </TableCell>
                          <TableCell>
                            {loan.interest_rate ? `${loan.interest_rate}%` : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {loan.emi_amount ? formatCurrency(loan.emi_amount) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={loan.status === 'active' ? 'default' : 'secondary'}
                              className={loan.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                            >
                              {loan.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {/* Action buttons can be added here if needed */}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expandable Loan Details Row */}
                        {expandedLoan === loan.id && (
                          <TableRow>
                            <TableCell colSpan={9} className="p-0">
                              <div className="bg-gray-50 border-t border-gray-200 animate-in slide-in-from-top-2 duration-300">
                                <div className="p-6 space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Loan Information */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Loan Information</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <div><strong>Loan Name:</strong> {loan.loan_name}</div>
                                        <div><strong>Bank/Lender:</strong> {loan.bank_name || 'N/A'}</div>
                                        <div><strong>Type:</strong> {loan.loan_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                                        <div><strong>Loan Number:</strong> {loan.loan_number || 'N/A'}</div>
                                        <div><strong>Account Code:</strong> {loan.loan_account_code}</div>
                                        <div><strong>Status:</strong> 
                                          <Badge className="ml-2" variant={loan.status === 'active' ? "default" : "secondary"}>
                                            {loan.status}
                                          </Badge>
                                        </div>
                                        {loan.loan_start_date && (
                                          <div><strong>Start Date:</strong> {formatDate(loan.loan_start_date)}</div>
                                        )}
                                        {loan.loan_end_date && (
                                          <div><strong>End Date:</strong> {formatDate(loan.loan_end_date)}</div>
                                        )}
                                      </CardContent>
                                    </Card>
                                    
                                    {/* Financial Details */}
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Financial Details</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <div className="flex justify-between">
                                          <span>Original Amount:</span>
                                          <span className="font-medium">
                                            {formatCurrency(loan.original_loan_amount)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Opening Balance:</span>
                                          <span className="font-medium">
                                            {formatCurrency(loan.opening_balance)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2">
                                          <span className="font-medium">Current Balance:</span>
                                          <span className="font-bold text-red-600">
                                            {formatCurrency(loan.current_balance)}
                                          </span>
                                        </div>
                                        {loan.interest_rate && (
                                          <div className="flex justify-between">
                                            <span>Interest Rate:</span>
                                            <span className="font-medium">{loan.interest_rate}%</span>
                                          </div>
                                        )}
                                        {loan.emi_amount && (
                                          <div className="flex justify-between">
                                            <span>EMI Amount:</span>
                                            <span className="font-medium text-blue-600">
                                              {formatCurrency(loan.emi_amount)}
                                            </span>
                                          </div>
                                        )}
                                        {loan.loan_tenure_months && (
                                          <div className="flex justify-between">
                                            <span>Tenure:</span>
                                            <span className="font-medium">{loan.loan_tenure_months} months</span>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Description if available */}
                                  {loan.description && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg">Description</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <p className="text-gray-700">{loan.description}</p>
                                      </CardContent>
                                    </Card>
                                  )}

                                  {/* Liability Payments for this loan */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Liability Payments for this Loan</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Date</TableHead>
                                              <TableHead>Principal</TableHead>
                                              <TableHead>Interest</TableHead>
                                              <TableHead>Total Amount</TableHead>
                                              <TableHead>Method</TableHead>
                                              <TableHead>Bank Account</TableHead>
                                              <TableHead>Description</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {getLoanLiabilityPayments(loan.id).length > 0 ? getLoanLiabilityPayments(loan.id).map((payment) => (
                                              <TableRow key={payment.id}>
                                                <TableCell>{formatDate(payment.date)}</TableCell>
                                                <TableCell className="font-semibold text-blue-600">
                                                  {formatCurrency(payment.principal_amount)}
                                                </TableCell>
                                                <TableCell className="font-semibold text-orange-600">
                                                  {formatCurrency(payment.interest_amount)}
                                                </TableCell>
                                                <TableCell className="font-semibold text-red-600">
                                                  {formatCurrency(payment.total_amount)}
                                                </TableCell>
                                                <TableCell>
                                                  <Badge variant="secondary">{payment.payment_method}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                  {payment.bank_account_name || 'N/A'}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate" title={payment.description}>
                                                  {payment.description}
                                                </TableCell>
                                              </TableRow>
                                            )) : (
                                              <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8">
                                                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                                  <p className="text-gray-500">No liability payments found for this loan</p>
                                                </TableCell>
                                              </TableRow>
                                            )}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No loans found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="liability-payments" className="space-y-4">
          {/* Liability Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Liability Payments Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Loan Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Principal Amount</TableHead>
                      <TableHead>Interest Amount</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Bank Account</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLiabilityPayments.length > 0 ? filteredLiabilityPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.date)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{payment.loan_name || 'N/A'}</span>
                            {payment.loan_bank_name && (
                              <span className="text-xs text-muted-foreground">{payment.loan_bank_name}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {payment.liability_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-blue-600">
                          {formatCurrency(payment.principal_amount)}
                        </TableCell>
                        <TableCell className="font-semibold text-orange-600">
                          {formatCurrency(payment.interest_amount)}
                        </TableCell>
                        <TableCell className="font-semibold text-red-600">
                          {formatCurrency(payment.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{payment.payment_method}</Badge>
                        </TableCell>
                        <TableCell>
                          {payment.bank_account_name || 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={payment.description}>
                          {payment.description}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">No liability payments found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Partner Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Partner</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Partner Name *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter partner name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Partner Type</Label>
              <Select 
                value={editForm.partner_type} 
                onValueChange={(value) => setEditForm(prev => ({ ...prev, partner_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="investor">Investor</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Initial Investment (₹)</Label>
              <Input
                type="number"
                value={editForm.initial_investment}
                onChange={(e) => setEditForm(prev => ({ ...prev, initial_investment: e.target.value }))}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Equity Percentage (%)</Label>
              <Input
                type="number"
                value={editForm.equity_percentage}
                onChange={(e) => setEditForm(prev => ({ ...prev, equity_percentage: e.target.value }))}
                placeholder="0.00"
                step="0.01"
                max="100"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this partner"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saveLoading}>
              Cancel
            </Button>
            <Button onClick={handleSavePartner} disabled={saveLoading}>
              {saveLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Delete Partner
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This action cannot be undone. Deleting this partner will also remove all associated investment and withdrawal records.
              </AlertDescription>
            </Alert>
            
            {selectedPartner && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">{selectedPartner.name}</h4>
                <p className="text-sm text-gray-600">
                  Total Investments: {formatCurrency(selectedPartner.total_investments)}
                </p>
                <p className="text-sm text-gray-600">
                  Total Withdrawals: {formatCurrency(selectedPartner.total_withdrawals)}
                </p>
                <p className="text-sm text-gray-600">
                  Transaction Count: {selectedPartner.transaction_count}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeletePartner}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Partner'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        <Button
          onClick={() => setShowAddInvestorModal(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          title="Add New Partner/Investor"
        >
          <UserPlus className="h-6 w-6" />
        </Button>
        <Button
          onClick={() => setCreateInvestmentOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
          title="Record Investment"
        >
          <TrendingUp className="h-6 w-6" />
        </Button>
        <Button
          onClick={() => setCreateWithdrawalOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-purple-600 hover:bg-purple-700"
          title="Record Withdrawal"
        >
          <TrendingDown className="h-6 w-6" />
        </Button>
      </div>

      {/* Add New Investor Modal */}
      <Dialog open={showAddInvestorModal} onOpenChange={setShowAddInvestorModal}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Partner/Investor</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddNewInvestor} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Partner/Investor Name *
                </label>
                <Input
                  type="text"
                  name="name"
                  required
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <Input
                  type="email"
                  name="email"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  type="tel"
                  name="phone"
                  placeholder="+91 9876543210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Partner Type</label>
                <Select name="partner_type" defaultValue="partner">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner">Business Partner</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="stakeholder">Stakeholder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Initial Investment (₹)
                </label>
                <Input
                  type="number"
                  name="initial_investment"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Equity Percentage (%)
                </label>
                <Input
                  type="number"
                  name="equity_percentage"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue="0"
                />
              </div>

              <div className="col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked
                    className="rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">Active Partner</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes & Comments</label>
              <Textarea
                name="notes"
                rows={3}
                placeholder="Additional notes about the partner/investor..."
              />
            </div>

            <DialogFooter className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddInvestorModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Add Partner/Investor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Investment Dialog - Copy from SalesOrderInvoiceManager */}
      <Dialog open={createInvestmentOpen} onOpenChange={setCreateInvestmentOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-green-700 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Record Partner Investment
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="partner" className="text-sm font-medium">
                Partner/Investor *
              </Label>
              <Select 
                value={investmentForm.investor_id} 
                onValueChange={(value) => setInvestmentForm(prev => ({ ...prev, investor_id: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select partner/investor" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id.toString()}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Investment Category *
              </Label>
              <Select 
                value={investmentForm.category} 
                onValueChange={(value) => setInvestmentForm(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select investment category" />
                </SelectTrigger>
                <SelectContent>
                  {investmentCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Investment Amount (₹) *
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={investmentForm.amount}
                onChange={(e) => setInvestmentForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method" className="text-sm font-medium">
                Payment Method *
              </Label>
              <Select 
                value={investmentForm.payment_method} 
                onValueChange={(value) => setInvestmentForm(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card Payment</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {['bank_transfer', 'card', 'cheque', 'online'].includes(investmentForm.payment_method) && (
              <div className="space-y-2">
                <Label htmlFor="bank_account" className="text-sm font-medium">
                  Bank Account *
                </Label>
                <Select 
                  value={investmentForm.bank_account_id} 
                  onValueChange={(value) => setInvestmentForm(prev => ({ ...prev, bank_account_id: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} ({account.account_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the investment purpose..."
                value={investmentForm.description}
                onChange={(e) => setInvestmentForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="investment_date" className="text-sm font-medium">
                Investment Date *
              </Label>
              <Input
                id="investment_date"
                type="date"
                value={investmentForm.date}
                onChange={(e) => setInvestmentForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <Alert className="bg-green-50 border-green-200 text-green-700">
              <AlertDescription>
                <span className="font-medium">💡 Investment Info:</span> This will increase the partner&apos;s equity stake and be recorded in Capital Account (3100).
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCreateInvestmentOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateInvestment}
              className="bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Record Investment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={createWithdrawalOpen} onOpenChange={setCreateWithdrawalOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-purple-700 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Record Partner Withdrawal
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="partner" className="text-sm font-medium">
                Partner/Owner *
              </Label>
              <Select 
                value={withdrawalForm.partner_id} 
                onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, partner_id: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select partner/owner" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id.toString()}>
                      {partner.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Withdrawal Category *
              </Label>
              <Select 
                value={withdrawalForm.category_id} 
                onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, category_id: value, subcategory_id: '' }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select withdrawal category" />
                </SelectTrigger>
                <SelectContent>
                  {withdrawalCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {withdrawalForm.category_id && withdrawalSubcategories.filter(sc => sc.category_id === withdrawalForm.category_id).length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="subcategory" className="text-sm font-medium">
                  Subcategory (Optional)
                </Label>
                <Select 
                  value={withdrawalForm.subcategory_id || 'none'} 
                  onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, subcategory_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select subcategory (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific subcategory</SelectItem>
                    {withdrawalSubcategories
                      .filter(sc => sc.category_id === withdrawalForm.category_id)
                      .map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.subcategory_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Withdrawal Amount (₹) *
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={withdrawalForm.amount}
                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawal_type" className="text-sm font-medium">
                Withdrawal Type *
              </Label>
              <Select 
                value={withdrawalForm.withdrawal_type} 
                onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, withdrawal_type: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select withdrawal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="capital_withdrawal">
                    💰 Capital Withdrawal
                  </SelectItem>
                  <SelectItem value="interest_payment">
                    📈 Interest Payment
                  </SelectItem>
                  <SelectItem value="profit_distribution">
                    🎯 Profit Distribution
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method" className="text-sm font-medium">
                Payment Method *
              </Label>
              <Select 
                value={withdrawalForm.payment_method} 
                onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash</SelectItem>
                  <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                  <SelectItem value="upi">📱 UPI</SelectItem>
                  <SelectItem value="online">💻 Online Payment</SelectItem>
                  <SelectItem value="cheque">📄 Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {withdrawalForm.payment_method && withdrawalForm.payment_method !== 'cash' && (
              <div className="space-y-2">
                <Label htmlFor="bank_account" className="text-sm font-medium">
                  {withdrawalForm.payment_method === 'upi' ? 'UPI Account *' : 'Bank Account *'}
                </Label>
                <Select 
                  value={withdrawalForm.bank_account_id} 
                  onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, bank_account_id: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts
                      .filter(account => {
                        if (withdrawalForm.payment_method === 'upi') {
                          return account.account_type === 'UPI';
                        }
                        return account.account_type === 'BANK';
                      })
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name} ({account.account_number})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the withdrawal purpose..."
                value={withdrawalForm.description}
                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdrawal_date" className="text-sm font-medium">
                Withdrawal Date *
              </Label>
              <Input
                id="withdrawal_date"
                type="date"
                value={withdrawalForm.date}
                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <Alert className={`${
              withdrawalForm.withdrawal_type === 'capital_withdrawal'
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <AlertDescription>
                <span className="font-medium">💡 {
                  withdrawalForm.withdrawal_type === 'capital_withdrawal' ? 'Capital Withdrawal Info:' :
                  withdrawalForm.withdrawal_type === 'interest_payment' ? 'Interest Payment Info:' :
                  'Profit Distribution Info:'
                }</span> {
                  withdrawalForm.withdrawal_type === 'capital_withdrawal' 
                    ? 'This will reduce the partner\'s equity.'
                    : 'This will NOT reduce the partner\'s investment balance.'
                }
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCreateWithdrawalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateWithdrawal}
              disabled={withdrawalLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {withdrawalLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Record Withdrawal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
