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
  Eye, 
  Search,
  Filter,
  UserPlus,
  AlertCircle,
  Building2,
  Loader2,
  CreditCard
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
  bank_accounts?: {
    id: string;
    name: string;
    account_number: string;
  };
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
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

      setPartners(partnersData.partners || []);
      setInvestments(investmentsData.investments || []);
      setWithdrawals(withdrawalsData.withdrawals || []);
      setLoans(loansData.loanBalances || []);
      setLiabilityPayments(liabilityPaymentsData.payments || []);
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

  // Show partner details
  const showPartnerDetails = (partner: PartnerSummary) => {
    setSelectedPartner(partner);
    setDetailsDialogOpen(true);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Partner Management</h2>
          <p className="text-gray-600">Manage partners, investments, withdrawals and loans</p>
        </div>
        <Button 
          onClick={() => {/* Add new partner logic */}}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add New Partner
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Partners</p>
                <p className="text-2xl font-bold">{partners.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Investments</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(partners.reduce((sum, p) => sum + p.total_investments, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Withdrawals</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(partners.reduce((sum, p) => sum + p.total_withdrawals, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Net Balance</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(partners.reduce((sum, p) => sum + p.current_balance, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Loans</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(loans.reduce((sum, loan) => sum + loan.current_balance, 0))}
                </p>
                <p className="text-xs text-gray-500">{loans.length} active loans</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Liability Payments</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(liabilityPayments.reduce((sum, payment) => sum + payment.total_amount, 0))}
                </p>
                <p className="text-xs text-gray-500">{liabilityPayments.length} payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search partners by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="sm:w-48">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partners</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                  <SelectItem value="investor">Investors</SelectItem>
                  <SelectItem value="partner">Partners</SelectItem>
                  <SelectItem value="owner">Owners</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Partners Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Equity %</TableHead>
                  <TableHead>Investments</TableHead>
                  <TableHead>Withdrawals</TableHead>
                  <TableHead>Current Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{partner.name}</div>
                        <div className="text-sm text-gray-500">
                          ID: {partner.id}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {partner.partner_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {partner.email && <div>{partner.email}</div>}
                        {partner.phone && <div>{partner.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{partner.equity_percentage}%</span>
                    </TableCell>
                    <TableCell>
                      <div className="text-green-600 font-medium">
                        {formatCurrency(partner.total_investments)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-red-600 font-medium">
                        {formatCurrency(partner.total_withdrawals)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`font-medium ${partner.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(partner.current_balance)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.is_active ? "default" : "secondary"}>
                        {partner.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => showPartnerDetails(partner)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditPartner(partner)}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPartner(partner);
                            setDeleteDialogOpen(true);
                          }}
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
          </div>
          
          {filteredPartners.length === 0 && (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No partners found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loans Overview */}
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
                {loans.length > 0 ? loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.loan_name}</TableCell>
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
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
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

      {/* Liability Payments Overview */}
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
                  <TableHead>Type</TableHead>
                  <TableHead>Principal Amount</TableHead>
                  <TableHead>Interest Amount</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Bank Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liabilityPayments.length > 0 ? liabilityPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
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
                      {payment.bank_accounts?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={payment.description}>
                      {payment.description}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
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

      {/* Partner Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partner Details</DialogTitle>
          </DialogHeader>
          
          {selectedPartner && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="loans">Loans</TabsTrigger>
                <TabsTrigger value="liability-payments">Liability Payments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Partner Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div><strong>Name:</strong> {selectedPartner.name}</div>
                      <div><strong>Type:</strong> {selectedPartner.partner_type}</div>
                      <div><strong>Email:</strong> {selectedPartner.email || 'N/A'}</div>
                      <div><strong>Phone:</strong> {selectedPartner.phone || 'N/A'}</div>
                      <div><strong>Equity:</strong> {selectedPartner.equity_percentage}%</div>
                      <div><strong>Status:</strong> 
                        <Badge className="ml-2" variant={selectedPartner.is_active ? "default" : "secondary"}>
                          {selectedPartner.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div><strong>Member Since:</strong> {formatDate(selectedPartner.created_at)}</div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Investments:</span>
                        <span className="text-green-600 font-medium">
                          {formatCurrency(selectedPartner.total_investments)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Withdrawals:</span>
                        <span className="text-red-600 font-medium">
                          {formatCurrency(selectedPartner.total_withdrawals)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Current Balance:</span>
                        <span className={`font-bold ${selectedPartner.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(selectedPartner.current_balance)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Transactions:</span>
                        <span className="font-medium">{selectedPartner.transaction_count}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {selectedPartner.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700">{selectedPartner.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="transactions">
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
                          {getPartnerTransactions(selectedPartner.id).map((transaction, index) => (
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
              </TabsContent>
              
              <TabsContent value="loans">
                <Card>
                  <CardHeader>
                    <CardTitle>Loan Information</CardTitle>
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
                            <TableHead>EMI</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loans.length > 0 ? loans.map((loan) => (
                            <TableRow key={loan.id}>
                              <TableCell className="font-medium">{loan.loan_name}</TableCell>
                              <TableCell>{loan.bank_name || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{loan.loan_type.replace('_', ' ')}</Badge>
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
                                >
                                  {loan.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8">
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
              
              <TabsContent value="liability-payments">
                <Card>
                  <CardHeader>
                    <CardTitle>Liability Payments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Principal</TableHead>
                            <TableHead>Interest</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Bank Account</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {liabilityPayments.length > 0 ? liabilityPayments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{formatDate(payment.date)}</TableCell>
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
                                {payment.bank_accounts?.name || 'N/A'}
                              </TableCell>
                              <TableCell className="max-w-xs truncate" title={payment.description}>
                                {payment.description}
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8">
                                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}