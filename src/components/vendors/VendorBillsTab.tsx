'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, Calendar, DollarSign, Eye, CreditCard, Receipt, Search, Minus, Clock, Trash2 } from 'lucide-react';
import { VendorBillForm } from './VendorBillForm';
import { subcategoryMap } from '@/types';

interface VendorBill {
  id: string;
  supplier_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  description?: string;
  tax_amount: number;
  discount_amount: number;
  purchase_order_id?: string;
  attachment_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  reference_number?: string;
  updated_by?: string;
  purchase_orders?: {
    id: string;
    total: number;
  };
}

interface Expense {
  id: string;
  date: string;
  category: string;
  type: string;
  description: string;
  amount: number;
  payment_method: string;
  created_by?: string;
  created_at: string;
  vendor_bill_id?: string;
  entity_id?: string;
  entity_type?: string;
}

interface VendorFinancialSummary {
  totalBillAmount: number;
  totalPaidAmount: number;
  totalOutstanding: number;
  pendingBillsCount: number;
  totalPOAmount: number;
  pendingPOsCount: number;
}

interface BankAccount {
  id: string;
  name: string;
  account_number?: string;
  account_type: 'BANK' | 'UPI';
  upi_id?: string;
  current_balance?: number;
  currency?: string;
  is_active?: boolean;
}

interface PaymentForm {
  amount: string;
  payment_date: string;
  payment_method: string;
  bank_account_id: string;
  upi_account_id: string;
  reference_number: string;
  notes: string;
  bill_id: string;
}

interface VendorBillsTabProps {
  vendorId: string;
  vendorName: string;
  bills: VendorBill[];
  financialSummary: VendorFinancialSummary;
  onBillUpdate: () => Promise<void>;
}

export function VendorBillsTab({ 
  vendorId, 
  vendorName, 
  bills, 
  financialSummary, 
  onBillUpdate 
}: VendorBillsTabProps) {
  const [createBillOpen, setCreateBillOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<VendorBill | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    bank_account_id: '',
    upi_account_id: '',
    reference_number: '',
    notes: '',
    bill_id: ''
  });

  // Expense-related state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  const [expensesSearchQuery, setExpensesSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'Office Supplies',
    payment_method: 'cash',
    bank_account_id: '',
    entity_id: vendorId, // Default to current vendor
    entity_type: 'supplier',
    vendor_bill_id: '',
  });

  // Fetch bank accounts and expenses for vendor
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bankResponse, upiResponse, expensesResponse] = await Promise.all([
          fetch('/api/finance/bank_accounts?type=BANK'),
          fetch('/api/finance/bank_accounts?type=UPI'),
          fetch(`/api/finance/expenses?entity_id=${vendorId}&entity_type=supplier`)
        ]);
        
        const [bankData, upiData, expensesData] = await Promise.all([
          bankResponse.json(),
          upiResponse.json(),
          expensesResponse.json()
        ]);
        
        // Handle API response format - data might be wrapped in a 'data' property
        const bankAccounts = Array.isArray(bankData) ? bankData : (Array.isArray(bankData?.data) ? bankData.data : []);
        const upiAccounts = Array.isArray(upiData) ? upiData : (Array.isArray(upiData?.data) ? upiData.data : []);
        const allExpenses = Array.isArray(expensesData) ? expensesData : (Array.isArray(expensesData?.data) ? expensesData.data : []);
        
        // Client-side filtering as fallback to ensure only vendor expenses are shown
        const expenses = allExpenses.filter((expense: Expense) => 
          expense.entity_type === 'supplier' && expense.entity_id === vendorId
        );
        
        console.log('Bank accounts loaded:', bankAccounts.length, bankAccounts);
        console.log('UPI accounts loaded:', upiAccounts.length, upiAccounts);
        console.log('Vendor ID being used for filtering:', vendorId);
        console.log('Expenses API URL:', `/api/finance/expenses?entity_id=${vendorId}&entity_type=supplier`);
        console.log('All expenses returned from API:', allExpenses.length, allExpenses);
        console.log('Filtered vendor expenses:', expenses.length, expenses);
        
        setBankAccounts([...bankAccounts, ...upiAccounts]);
        setExpenses(expenses);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Set fallback empty arrays on error
        setBankAccounts([]);
        setExpenses([]);
      }
    };
    
    fetchData();
  }, [vendorId]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-blue-100 text-blue-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Expense utility functions
  const filterExpenses = (expenses: Expense[], searchQuery: string) => {
    if (!searchQuery) return expenses;
    
    const query = searchQuery.toLowerCase();
    return expenses.filter(expense =>
      expense.description.toLowerCase().includes(query) ||
      expense.category.toLowerCase().includes(query) ||
      expense.payment_method.toLowerCase().includes(query) ||
      expense.amount.toString().includes(query)
    );
  };

  const getPaginatedData = (data: Expense[], page: number, perPage: number) => {
    const startIndex = (page - 1) * perPage;
    return data.slice(startIndex, startIndex + perPage);
  };

  const handleCategoryChange = (category: string) => {
    const categoryDetails = subcategoryMap[category as keyof typeof subcategoryMap];
    setExpenseForm({ 
      ...expenseForm, 
      category,
      entity_type: categoryDetails?.category.includes('Vehicle') ? 'truck' : 
                   categoryDetails?.category.includes('Supplier') || categoryDetails?.category.includes('Vendor') ? 'supplier' : 
                   categoryDetails?.category.includes('Employee') || categoryDetails?.category.includes('Wage') || categoryDetails?.category.includes('Salary') ? 'employee' : 
                   'supplier' // Default to supplier for vendor bills
    });
  };

  const handleCreateExpense = async () => {
    // Validation
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    if (!expenseForm.description.trim()) {
      alert('Please enter a description for the expense');
      return;
    }

    // Validate bank account selection for non-cash payments
    const requiresBankAccount = ['bank_transfer', 'card', 'cheque', 'online'].includes(expenseForm.payment_method);
    if (requiresBankAccount && (!expenseForm.bank_account_id || expenseForm.bank_account_id === 'no-accounts')) {
      alert('Please select a bank account for this payment method');
      return;
    }

    try {
      // If this is a bill payment, also record it as a vendor payment
      const iseBillPayment = expenseForm.vendor_bill_id && selectedBillForPayment;
      
      // Create the expense
      const expenseResponse = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: expenseForm.date,
          subcategory: expenseForm.category,
          description: `${expenseForm.description} [Vendor: ${vendorName}]`,
          amount: parseFloat(expenseForm.amount),
          payment_method: expenseForm.payment_method,
          bank_account_id: (expenseForm.bank_account_id && expenseForm.bank_account_id !== 'no-accounts') 
            ? expenseForm.bank_account_id 
            : (bankAccounts.length > 0 ? bankAccounts[0].id : 1),
          entity_id: expenseForm.entity_id || vendorId,
          entity_type: expenseForm.entity_type || 'supplier',
          vendor_bill_id: expenseForm.vendor_bill_id === 'none' ? null : expenseForm.vendor_bill_id || null,
        }),
      });

      if (!expenseResponse.ok) {
        const error = await expenseResponse.json();
        throw new Error(error.error || 'Failed to create expense');
      }

      // If this is a bill payment, also record it through the vendor payment API
      if (iseBillPayment) {
        const paymentResponse = await fetch(`/api/vendors/${vendorId}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(expenseForm.amount),
            payment_date: expenseForm.date,
            payment_method: expenseForm.payment_method,
            bank_account_id: expenseForm.bank_account_id || '',
            upi_account_id: '',
            reference_number: `Expense Payment - ${new Date().getTime()}`,
            notes: `Payment recorded through expense system: ${expenseForm.description}`,
            vendor_bill_id: expenseForm.vendor_bill_id
          })
        });

        if (!paymentResponse.ok) {
          console.warn('Expense created but failed to update bill payment status');
        }
      }

      setCreateExpenseOpen(false);
      setSelectedBillForPayment(null);
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: 'Office Supplies',
        payment_method: 'cash',
        bank_account_id: '',
        entity_id: vendorId,
        entity_type: 'supplier',
        vendor_bill_id: '',
      });
      
      // Refresh expenses data
      const expensesResponse = await fetch(`/api/finance/expenses?entity_id=${vendorId}&entity_type=supplier`);
      const expensesData = await expensesResponse.json();
      const allExpenses = Array.isArray(expensesData) ? expensesData : (Array.isArray(expensesData?.data) ? expensesData.data : []);
      // Client-side filtering as fallback to ensure only vendor expenses are shown
      const expenses = allExpenses.filter((expense: Expense) => 
        expense.entity_type === 'supplier' && expense.entity_id === vendorId
      );
      setExpenses(expenses);
      
      // Refresh bill data if this was a bill payment
      if (iseBillPayment) {
        onBillUpdate();
      }
      
      alert(iseBillPayment ? 'Bill payment recorded successfully!' : 'Expense created successfully!');
    } catch (error) {
      console.error('Error creating expense:', error);
      alert(`Error creating expense: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  const handlePaymentClick = (bill: VendorBill) => {
    setSelectedBillForPayment(bill);
    // Pre-fill expense form with bill payment details
    setExpenseForm({
      date: new Date().toISOString().split('T')[0],
      description: `Payment for Bill ${bill.bill_number} - ${bill.description || 'Vendor bill payment'}`,
      amount: bill.remaining_amount.toString(),
      category: 'Vendor Payment - Services', // Default to vendor payment category
      payment_method: 'bank_transfer', // Default to bank transfer for bill payments
      bank_account_id: '',
      entity_id: vendorId,
      entity_type: 'supplier',
      vendor_bill_id: bill.id, // Link to the specific bill
    });
    setCreateExpenseOpen(true); // Open expense dialog instead of payment dialog
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/vendors/${vendorId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentForm,
          amount: parseFloat(paymentForm.amount),
          vendor_bill_id: paymentForm.bill_id || null
        })
      });

      if (response.ok) {
        setPaymentDialogOpen(false);
        setPaymentForm({
          amount: '',
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: 'cash',
          bank_account_id: '',
          upi_account_id: '',
          reference_number: '',
          notes: '',
          bill_id: ''
        });
        setSelectedBillForPayment(null);
        onBillUpdate(); // Refresh the bill data
      } else {
        console.error('Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  const totals = {
    totalAmount: financialSummary.totalBillAmount,
    totalPaid: financialSummary.totalPaidAmount,
    totalRemaining: financialSummary.totalOutstanding
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Bills</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{bills.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Total Amount</span>
            </div>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totals.totalAmount)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Total Paid</span>
            </div>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totals.totalPaid)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Outstanding</span>
            </div>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(totals.totalRemaining)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Bills and Expenses */}
      <Tabs defaultValue="bills" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bills">Bills & Payments</TabsTrigger>
          <TabsTrigger value="expenses">Vendor Expenses</TabsTrigger>
        </TabsList>

        {/* Bills Tab */}
        <TabsContent value="bills" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Vendor Bills
                </CardTitle>
                <Button 
                  onClick={() => setCreateBillOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bill
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bills.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
                  <p className="text-gray-500 mb-4">This vendor doesn&apos;t have any bills yet.</p>
                  <Button 
                    onClick={() => setCreateBillOpen(true)}
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Bill
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bill Number</TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Bill Date
                          </div>
                        </TableHead>
                        <TableHead>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due Date
                          </div>
                        </TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">Paid Amount</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bills.map((bill) => {
                        const isOverdue = new Date(bill.due_date) < new Date() && bill.status !== 'paid';
                        const actualStatus = isOverdue && bill.status === 'pending' ? 'overdue' : bill.status;
                        
                        return (
                          <TableRow key={bill.id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">
                              {bill.bill_number}
                            </TableCell>
                            <TableCell>{formatDate(bill.bill_date)}</TableCell>
                            <TableCell>
                              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                {formatDate(bill.due_date)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(bill.total_amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(bill.paid_amount)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <span className={bill.remaining_amount > 0 ? 'text-orange-600' : 'text-green-600'}>
                                {formatCurrency(bill.remaining_amount)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(actualStatus)}>
                                {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {bill.description}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                {bill.remaining_amount > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 px-2 text-xs"
                                    onClick={() => handlePaymentClick(bill)}
                                  >
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Pay
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Vendor Expense Management</h3>
              <p className="text-sm text-gray-600 mt-1">
                Track and manage expenses related to {vendorName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Refresh expenses data
                  console.log('Refreshing expenses for vendor:', vendorId);
                  fetch(`/api/finance/expenses?entity_id=${vendorId}&entity_type=supplier`)
                    .then(res => res.json())
                    .then(data => {
                      console.log('Refresh expenses API response:', data);
                      const allExpenses = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
                      // Client-side filtering as fallback to ensure only vendor expenses are shown
                      const expenses = allExpenses.filter((expense: Expense) => 
                        expense.entity_type === 'supplier' && expense.entity_id === vendorId
                      );
                      console.log('Parsed expenses after refresh:', expenses);
                      setExpenses(expenses);
                    })
                    .catch(console.error);
                }}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Expenses Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500 rounded-lg">
                    <Minus className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-red-600 font-medium">Total Expenses</p>
                    <p className="text-xl font-bold text-red-900">
                      {formatCurrency(expenses.reduce((sum, exp) => sum + exp.amount, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-orange-600 font-medium">This Month</p>
                    <p className="text-xl font-bold text-orange-900">
                      {formatCurrency(expenses.filter(exp => {
                        const expenseDate = new Date(exp.date);
                        const now = new Date();
                        return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
                      }).reduce((sum, exp) => sum + exp.amount, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Expense Count</p>
                    <p className="text-xl font-bold text-purple-900">{expenses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Bar for Expenses */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search expenses by description, category, amount..."
                value={expensesSearchQuery}
                onChange={(e) => {
                  setExpensesSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {expensesSearchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setExpensesSearchQuery('');
                  setCurrentPage(1);
                }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Expenses Table */}
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Amount</TableHead>
                  <TableHead className="font-semibold">Payment Method</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filteredExpenses = filterExpenses(expenses, expensesSearchQuery);
                  const paginatedExpenses = getPaginatedData(filteredExpenses, currentPage, itemsPerPage);
                  
                  if (paginatedExpenses.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Minus className="h-8 w-8 text-gray-400" />
                            <p className="text-gray-500">
                              {expensesSearchQuery ? 'No expenses found matching your search.' : 'No expenses found for this vendor'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {expensesSearchQuery ? 'Try adjusting your search terms.' : 'Add an expense to get started'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  
                  return paginatedExpenses.map((expense) => (
                    <TableRow key={expense.id} className="hover:bg-gray-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {formatDate(expense.date)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px]">
                        <div className="truncate" title={expense.description}>
                          {expense.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">{expense.category}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-red-600">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">{expense.payment_method}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            title="Delete expense"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Vendor Bill Form Dialog */}
      <VendorBillForm
        vendorId={vendorId}
        vendorName={vendorName}
        open={createBillOpen}
        onOpenChange={setCreateBillOpen}
        onSuccess={onBillUpdate}
      />

      {/* Payment Recording Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Payment
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                required
              />
              {selectedBillForPayment && (
                <p className="text-xs text-gray-500 mt-1">
                  Outstanding: {formatCurrency(selectedBillForPayment.remaining_amount)}
                </p>
              )}
            </div>
            
            <div>
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select
                value={paymentForm.payment_method}
                onValueChange={(value) => setPaymentForm({...paymentForm, payment_method: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Bank Account Selection */}
            {(paymentForm.payment_method === 'bank_transfer' || paymentForm.payment_method === 'cheque') && (
              <div>
                <Label htmlFor="bank_account_id">Bank Account</Label>
                <Select
                  value={paymentForm.bank_account_id}
                  onValueChange={(value) => setPaymentForm({...paymentForm, bank_account_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.filter(acc => acc.account_type === 'BANK').map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {account.account_number ? `****${account.account_number.slice(-4)}` : 'No A/C'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {paymentForm.payment_method === 'upi' && (
              <div>
                <Label htmlFor="upi_account_id">UPI Account</Label>
                <Select
                  value={paymentForm.upi_account_id}
                  onValueChange={(value) => setPaymentForm({...paymentForm, upi_account_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select UPI account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.filter(acc => acc.account_type === 'UPI').map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {account.upi_id || 'No UPI ID'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label htmlFor="reference_number">Reference Number</Label>
              <Input
                id="reference_number"
                value={paymentForm.reference_number}
                onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                placeholder="Transaction ID, Cheque No., etc."
              />
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                placeholder="Additional notes about this payment"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Record Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Expense Dialog */}
      <Dialog open={createExpenseOpen} onOpenChange={(open) => {
        setCreateExpenseOpen(open);
        if (!open) {
          setSelectedBillForPayment(null);
          setExpenseForm({
            date: new Date().toISOString().split('T')[0],
            description: '',
            amount: '',
            category: 'Office Supplies',
            payment_method: 'cash',
            bank_account_id: '',
            entity_id: vendorId,
            entity_type: 'supplier',
            vendor_bill_id: '',
          });
        }
      }}>
        <DialogContent className="max-w-3xl w-[90vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-600" />
              {selectedBillForPayment ? `Record Payment for Bill ${selectedBillForPayment.bill_number}` : 'Create Vendor Expense'}
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              {selectedBillForPayment 
                ? `Record payment for ${vendorName}'s bill with automatic accounting integration`
                : `Add a new expense entry for ${vendorName} with automatic accounting integration`
              }
            </p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
            {/* Bill Payment Context Banner */}
            {selectedBillForPayment && (
              <div className="lg:col-span-2 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Bill Payment Context</h4>
                    <p className="text-sm text-blue-700">
                      Recording payment for Bill #{selectedBillForPayment.bill_number} | 
                      Outstanding: {formatCurrency(selectedBillForPayment.remaining_amount)} | 
                      Due: {formatDate(selectedBillForPayment.due_date)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Left Column - Basic Information */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense_date" className="text-sm font-medium">
                      Expense Date *
                    </Label>
                    <Input
                      id="expense_date"
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expense_amount" className="text-sm font-medium">
                      Amount (₹) *
                    </Label>
                    <Input
                      id="expense_amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full text-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expense_category" className="text-sm font-medium">
                      Expense Category *
                    </Label>
                    <Select value={expenseForm.category} onValueChange={handleCategoryChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select expense category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {/* Vendor/Supplier specific categories first */}
                        <div className="border-b pb-2 mb-2">
                          <div className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50">
                            VENDOR PAYMENTS
                          </div>
                          {Object.entries(subcategoryMap)
                            .filter(([, details]) => details.category === "Accounts Payable" || details.category === "Prepaid Expenses")
                            .map(([category, details]) => (
                              <SelectItem key={category} value={category}>
                                <div className="flex flex-col">
                                  <span className="text-blue-700 font-medium">{category}</span>
                                  <span className="text-xs text-blue-500">Account: {details.accountCode}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </div>
                        
                        {/* General business expense categories */}
                        <div className="px-2 py-1 text-xs font-semibold text-green-600 bg-green-50 mb-2">
                          BUSINESS EXPENSES
                        </div>
                        {Object.entries(subcategoryMap)
                          .filter(([, details]) => details.category !== "Accounts Payable" && details.category !== "Prepaid Expenses" && details.category !== "Owner's Drawings")
                          .slice(0, 20) // Show first 20 for performance
                          .map(([category, details]) => (
                            <SelectItem key={category} value={category}>
                              <div className="flex flex-col">
                                <span>{category}</span>
                                <span className="text-xs text-gray-500">Code: {details.accountCode} | Type: {details.type}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {expenseForm.category && subcategoryMap[expenseForm.category as keyof typeof subcategoryMap] && (
                      <div className="text-xs p-2 rounded text-gray-600 bg-blue-50">
                        <span className="font-medium">Category Info:</span> {subcategoryMap[expenseForm.category as keyof typeof subcategoryMap].category} expense | 
                        Account: {subcategoryMap[expenseForm.category as keyof typeof subcategoryMap].accountCode} | 
                        Type: {subcategoryMap[expenseForm.category as keyof typeof subcategoryMap].type}
                      </div>
                    )}
                  </div>

                  {/* Vendor Bill Selection */}
                  {bills.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="vendor_bill" className="text-sm font-medium">
                        Related Vendor Bill (Optional)
                      </Label>
                      <Select 
                        value={expenseForm.vendor_bill_id || 'none'} 
                        onValueChange={(value) => setExpenseForm({ ...expenseForm, vendor_bill_id: value === 'none' ? '' : value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select vendor bill (optional)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="none">No specific bill</SelectItem>
                          {bills.map(bill => (
                            <SelectItem key={bill.id} value={bill.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{bill.bill_number}</span>
                                <span className="text-xs text-gray-500">
                                  ₹{bill.total_amount.toLocaleString('en-IN')} | Due: {new Date(bill.due_date).toLocaleDateString('en-IN')} | Outstanding: ₹{bill.remaining_amount.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Payment & Description */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Details
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense_payment_method" className="text-sm font-medium">
                      Payment Method *
                    </Label>
                    <Select value={expenseForm.payment_method} onValueChange={(value) => setExpenseForm({ ...expenseForm, payment_method: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">💵 Cash Payment</SelectItem>
                        <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                        <SelectItem value="card">💳 Card Payment</SelectItem>
                        <SelectItem value="cheque">📝 Cheque</SelectItem>
                        <SelectItem value="online">🌐 Online Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(expenseForm.payment_method === 'bank_transfer' || expenseForm.payment_method === 'card' || expenseForm.payment_method === 'cheque' || expenseForm.payment_method === 'online') && (
                    <div className="space-y-2">
                      <Label htmlFor="expense_bank_account" className="text-sm font-medium">
                        Bank Account *
                      </Label>
                      <Select 
                        value={expenseForm.bank_account_id || 'no-accounts'} 
                        onValueChange={(value) => setExpenseForm({ ...expenseForm, bank_account_id: value === 'no-accounts' ? '' : value })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select bank account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts && bankAccounts.length > 0 ? (
                            bankAccounts.filter(account => account.account_type === 'BANK').map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <div className="flex flex-col">
                                  <span>{account.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {account.account_number ? `${account.account_number}` : ''} 
                                  </span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-accounts" disabled>
                              No bank accounts available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description & Notes
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="expense_description" className="text-sm font-medium">
                    Expense Description *
                  </Label>
                  <Textarea
                    id="expense_description"
                    placeholder={`Enter detailed expense description for ${vendorName}...`}
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    className="w-full min-h-[100px] resize-y"
                  />
                  <p className="text-xs text-gray-500">
                    Provide clear details for better expense tracking and accounting
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mt-4">
            <h4 className="font-medium text-blue-900 mb-2">
              {selectedBillForPayment ? 'Bill Payment Accounting Impact' : 'Expense Accounting Impact Preview'}
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Debit:</strong> {expenseForm.category} (Account: {subcategoryMap[expenseForm.category as keyof typeof subcategoryMap]?.accountCode || 'TBD'}) - ₹{expenseForm.amount || '0.00'}</p>
              <p>• <strong>Credit:</strong> {expenseForm.payment_method === 'cash' ? 'Cash Account (1010)' : 'Bank Account (1020)'} - ₹{expenseForm.amount || '0.00'}</p>
              {selectedBillForPayment && (
                <p className="text-xs mt-2 text-blue-600 font-medium">
                  📋 Bill Status: Will be updated to reflect payment amount and reduce outstanding balance
                </p>
              )}
              <p className="text-xs mt-2 text-blue-600">Journal entry will be automatically created upon submission</p>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateExpenseOpen(false);
                  setSelectedBillForPayment(null);
                  setExpenseForm({
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    amount: '',
                    category: 'Office Supplies',
                    payment_method: 'cash',
                    bank_account_id: '',
                    entity_id: vendorId,
                    entity_type: 'supplier',
                    vendor_bill_id: '',
                  });
                }}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleCreateExpense}
                disabled={!expenseForm.description || !expenseForm.amount}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto order-1 sm:order-2"
              >
                <Receipt className="h-4 w-4 mr-2" />
                {selectedBillForPayment ? 'Record Payment' : 'Create Expense'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}