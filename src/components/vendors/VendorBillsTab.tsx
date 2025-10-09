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
import { FileText, Plus, Calendar, DollarSign, CreditCard, Receipt, Search, Minus, Clock, Trash2, Edit, Calculator, ChevronDown, ChevronRight } from 'lucide-react';
// import { VendorBillForm } from './VendorBillForm';
import { EnhancedVendorBillForm } from './EnhancedVendorBillForm';
import { subcategoryMap } from '@/types';

interface VendorBillLineItem {
  id: string;
  product_id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  actual_cost_per_unit?: number;
  purchase_order_id?: string;
}

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
  subtotal?: number;
  freight_total?: number;
  additional_charges?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total_gst?: number;
  gst_rate?: number;
  is_interstate?: boolean;
  vendor_bill_line_items?: VendorBillLineItem[];
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
  
  // Edit bill state
  const [editBillOpen, setEditBillOpen] = useState(false);
  const [selectedBillForEdit, setSelectedBillForEdit] = useState<VendorBill | null>(null);
  const [isUpdatingBill, setIsUpdatingBill] = useState(false);
  const [isDeletingBill, setIsDeletingBill] = useState(false);
  const [editBillForm, setEditBillForm] = useState({
    bill_number: '',
    bill_date: '',
    due_date: '',
    total_amount: '',
    description: '',
    tax_amount: '',
    discount_amount: '',
    reference_number: ''
  });
  
  // Smart payment states
  const [smartPaymentOpen, setSmartPaymentOpen] = useState(false);
  const [isProcessingSmartPayment, setIsProcessingSmartPayment] = useState(false);
  const [smartPaymentForm, setSmartPaymentForm] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    bank_account_id: '',
    reference_number: '',
    notes: ''
  });
  const [paymentPreview, setPaymentPreview] = useState<Array<{
    billId: string;
    billNumber: string;
    currentOutstanding: number;
    paymentAmount: number;
    remainingAfterPayment: number;
    willBeFullyPaid: boolean;
  }>>([]);
  
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
  const [isSyncingExpenses, setIsSyncingExpenses] = useState(false);
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
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

  const toggleBillExpansion = (billId: string) => {
    setExpandedBills(prev => {
      const newSet = new Set(prev);
      if (newSet.has(billId)) {
        newSet.delete(billId);
      } else {
        newSet.add(billId);
      }
      return newSet;
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

    setIsCreatingExpense(true);
    try {
      // Check if this is a bill payment
      const isBillPayment = expenseForm.vendor_bill_id && selectedBillForPayment;
      
      if (isBillPayment) {
        // For bill payments, use the vendor payments API (which creates its own expense record)
        const paymentResponse = await fetch(`/api/vendors/${vendorId}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(expenseForm.amount),
            payment_date: expenseForm.date,
            payment_method: expenseForm.payment_method,
            bank_account_id: expenseForm.bank_account_id || '',
            upi_account_id: '',
            reference_number: `Bill Payment - ${new Date().getTime()}`,
            notes: `${expenseForm.description}`,
            vendor_bill_id: expenseForm.vendor_bill_id
          })
        });

        if (!paymentResponse.ok) {
          const error = await paymentResponse.json();
          throw new Error(error.error || 'Failed to create bill payment');
        }
      } else {
        // For regular expenses, use the expenses API
        const expenseData: {
          date: string;
          subcategory: string;
          description: string;
          amount: number;
          payment_method: string;
          entity_id: string;
          entity_type: string;
          vendor_bill_id: null;
          bank_account_id?: string;
        } = {
          date: expenseForm.date,
          subcategory: expenseForm.category,
          description: `${expenseForm.description} [Vendor: ${vendorName}]`,
          amount: parseFloat(expenseForm.amount),
          payment_method: expenseForm.payment_method,
          entity_id: expenseForm.entity_id || vendorId,
          entity_type: expenseForm.entity_type || 'supplier',
          vendor_bill_id: null, // No vendor bill for regular expenses
        };

        // Only include bank_account_id for non-cash payments
        if (expenseForm.payment_method !== 'cash' && expenseForm.bank_account_id && expenseForm.bank_account_id !== 'no-accounts') {
          expenseData.bank_account_id = expenseForm.bank_account_id;
        }

        console.log('Creating vendor expense with data:', expenseData);

        const expenseResponse = await fetch('/api/finance/expenses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expenseData),
        });

        if (!expenseResponse.ok) {
          const error = await expenseResponse.json();
          throw new Error(error.error || 'Failed to create expense');
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
      if (isBillPayment) {
        onBillUpdate();
      }
      
      alert(isBillPayment ? 'Bill payment recorded successfully!' : 'Expense created successfully!');
    } catch (error) {
      console.error('Error creating expense:', error);
      alert(`Error creating expense: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsCreatingExpense(false);
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

  // Edit bill functionality
  const handleEditBill = (bill: VendorBill) => {
    setSelectedBillForEdit(bill);
    setEditBillForm({
      bill_number: bill.bill_number,
      bill_date: bill.bill_date,
      due_date: bill.due_date,
      total_amount: bill.total_amount.toString(),
      description: bill.description || '',
      tax_amount: bill.tax_amount?.toString() || '0',
      discount_amount: bill.discount_amount?.toString() || '0',
      reference_number: bill.reference_number || ''
    });
    setEditBillOpen(true);
  };

  const handleUpdateBill = async () => {
    if (!selectedBillForEdit) return;

    // Validation
    if (!editBillForm.total_amount || parseFloat(editBillForm.total_amount) <= 0) {
      alert('Please enter a valid total amount greater than 0');
      return;
    }

    if (!editBillForm.bill_number.trim()) {
      alert('Please enter a bill number');
      return;
    }

    setIsUpdatingBill(true);
    try {
      const response = await fetch('/api/finance/vendor-bills', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bill_id: selectedBillForEdit.id,
          supplier_id: vendorId,
          bill_number: editBillForm.bill_number.trim(),
          bill_date: editBillForm.bill_date,
          due_date: editBillForm.due_date,
          total_amount: parseFloat(editBillForm.total_amount),
          description: editBillForm.description.trim(),
          tax_amount: parseFloat(editBillForm.tax_amount) || 0,
          discount_amount: parseFloat(editBillForm.discount_amount) || 0,
          reference_number: editBillForm.reference_number.trim()
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update bill');
      }

      setEditBillOpen(false);
      setSelectedBillForEdit(null);
      setEditBillForm({
        bill_number: '',
        bill_date: '',
        due_date: '',
        total_amount: '',
        description: '',
        tax_amount: '',
        discount_amount: '',
        reference_number: ''
      });
      
      // Refresh bill data
      onBillUpdate();
      alert('Bill updated successfully!');
    } catch (error) {
      console.error('Error updating bill:', error);
      alert(`Error updating bill: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsUpdatingBill(false);
    }
  };

  const closeEditDialog = () => {
    setEditBillOpen(false);
    setSelectedBillForEdit(null);
    setIsUpdatingBill(false);
    setIsDeletingBill(false);
    setEditBillForm({
      bill_number: '',
      bill_date: '',
      due_date: '',
      total_amount: '',
      description: '',
      tax_amount: '',
      discount_amount: '',
      reference_number: ''
    });
  };

  const handleDeleteBill = async () => {
    if (!selectedBillForEdit) return;

    // Confirm deletion
    const confirmDelete = window.confirm(
      `Are you sure you want to delete bill "${selectedBillForEdit.bill_number}"?\n\n` +
      `This action cannot be undone and will permanently remove the bill and all associated data.`
    );

    if (!confirmDelete) return;

    // Additional confirmation for bills with payments
    if (selectedBillForEdit.paid_amount > 0) {
      const confirmWithPayments = window.confirm(
        `⚠️ WARNING: This bill has payments totaling ${formatCurrency(selectedBillForEdit.paid_amount)}.\n\n` +
        `Deleting this bill may affect your accounting records. Are you absolutely sure you want to proceed?`
      );

      if (!confirmWithPayments) return;
    }

    setIsDeletingBill(true);
    try {
      const response = await fetch('/api/finance/vendor-bills', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bill_id: selectedBillForEdit.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete bill');
      }

      closeEditDialog();
      
      // Refresh bill data
      onBillUpdate();
      alert('Bill deleted successfully!');
    } catch (error) {
      console.error('Error deleting bill:', error);
      alert(`Error deleting bill: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsDeletingBill(false);
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    // Confirm deletion with enhanced information
    const billInfo = expense.vendor_bill_id ? 
      `\n⚠️  This expense is linked to a vendor bill and will:\n` +
      `   • Update the bill's paid amount\n` +
      `   • Remove payment history record\n` +
      `   • Restore bank account balance\n\n` 
      : '\n';
      
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this expense?\n\n` +
      `Description: ${expense.description}\n` +
      `Amount: ${formatCurrency(expense.amount)}\n` +
      `Date: ${formatDate(expense.date)}` +
      billInfo +
      `This action cannot be undone and will permanently remove the expense record.`
    );

    if (!confirmDelete) return;

    try {
      console.log(`🗑️ Deleting vendor expense: ${expense.id}`, {
        description: expense.description,
        amount: expense.amount,
        vendor_bill_id: expense.vendor_bill_id,
        hasVendorBill: !!expense.vendor_bill_id
      });

      const response = await fetch('/api/finance/expenses', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expense_id: expense.id
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete expense');
      }

      const result = await response.json();
      console.log('✅ Expense deletion result:', result);

      // Remove expense from local state
      setExpenses(prevExpenses => 
        prevExpenses.filter(exp => exp.id !== expense.id)
      );
      
      // If this expense was linked to a vendor bill, refresh the bill data
      if (expense.vendor_bill_id) {
        onBillUpdate(); // Refresh bills to show updated paid amounts and status
      }
      
      alert('Expense deleted successfully with complete cleanup!');
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert(`Error deleting expense: ${error instanceof Error ? error.message : 'Please try again.'}`);
    }
  };

  // Smart payment calculation logic
  const calculateSmartPayment = (amount: number) => {
    if (!amount || amount <= 0) {
      setPaymentPreview([]);
      return;
    }

    // Get outstanding bills sorted by due date (oldest first)
    const outstandingBills = bills
      .filter(bill => bill.remaining_amount > 0)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

    let remainingAmount = amount;
    const preview = [];

    for (const bill of outstandingBills) {
      if (remainingAmount <= 0) break;

      const paymentForThisBill = Math.min(remainingAmount, bill.remaining_amount);
      const willBeFullyPaid = paymentForThisBill >= bill.remaining_amount;
      
      preview.push({
        billId: bill.id,
        billNumber: bill.bill_number,
        currentOutstanding: bill.remaining_amount,
        paymentAmount: paymentForThisBill,
        remainingAfterPayment: bill.remaining_amount - paymentForThisBill,
        willBeFullyPaid
      });

      remainingAmount -= paymentForThisBill;
    }

    setPaymentPreview(preview);
  };

  const handleSmartPayment = async () => {
    if (!smartPaymentForm.amount || parseFloat(smartPaymentForm.amount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    if (!smartPaymentForm.bank_account_id && smartPaymentForm.payment_method !== 'cash') {
      alert('Please select a bank account for this payment method');
      return;
    }

    setIsProcessingSmartPayment(true);
    try {
      // Create individual payments for each bill that receives payment
      const payments = paymentPreview.filter(p => p.paymentAmount > 0);
      
      for (const payment of payments) {
        const response = await fetch(`/api/vendors/${vendorId}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: payment.paymentAmount,
            payment_date: smartPaymentForm.payment_date,
            payment_method: smartPaymentForm.payment_method,
            bank_account_id: smartPaymentForm.bank_account_id || '',
            reference_number: `${smartPaymentForm.reference_number} - Smart Settlement`,
            notes: `Smart payment settlement: ${smartPaymentForm.notes}`,
            vendor_bill_id: payment.billId
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to record payment for bill ${payment.billNumber}`);
        }
      }

      setSmartPaymentOpen(false);
      setSmartPaymentForm({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        bank_account_id: '',
        reference_number: '',
        notes: ''
      });
      setPaymentPreview([]);
      
      // Refresh bill data
      onBillUpdate();
      alert(`Smart payment completed! Amount distributed across ${payments.length} bills.`);
    } catch (error) {
      console.error('Error processing smart payment:', error);
      alert(`Error processing payment: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsProcessingSmartPayment(false);
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
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {bills.some(bill => bill.remaining_amount > 0) && (
                    <Button 
                      onClick={() => setSmartPaymentOpen(true)}
                      className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Pay Amount
                    </Button>
                  )}
                  <Button 
                    onClick={() => setCreateBillOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Bill
                  </Button>
                </div>
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
                        <TableHead className="w-8"></TableHead>
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
                        const isExpanded = expandedBills.has(bill.id);
                        
                        return (
                          <React.Fragment key={bill.id}>
                            <TableRow 
                              className="hover:bg-gray-50 cursor-pointer" 
                              onClick={() => toggleBillExpansion(bill.id)}
                            >
                              <TableCell className="text-center">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                              </TableCell>
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
                                  onClick={() => handleEditBill(bill)}
                                  title="Edit bill"
                                >
                                  <Edit className="h-3 w-3" />
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
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={7} className="p-6 bg-gray-50">
                                  <div className="space-y-6">
                                    {/* Bill Summary Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-white rounded-lg border">
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Reference Number</label>
                                        <p className="text-sm text-gray-900 font-medium">{bill.reference_number || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">
                                          {(bill.total_gst ?? 0) > 0 ? 'GST Amount' : 'Tax Amount'}
                                        </label>
                                        <p className="text-sm text-gray-900 font-medium">
                                          ₹{(bill.total_gst ?? bill.tax_amount ?? 0).toFixed(2)}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Discount Amount</label>
                                        <p className="text-sm text-gray-900 font-medium">₹{bill.discount_amount || '0.00'}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-500">Created Date</label>
                                        <p className="text-sm text-gray-900 font-medium">{new Date(bill.created_at).toLocaleDateString()}</p>
                                      </div>
                                    </div>

                                    {/* Line Items */}
                                    <div>
                                      <h5 className="font-semibold text-gray-900 mb-3">Line Items & Pricing Details</h5>
                                      {bill.vendor_bill_line_items && bill.vendor_bill_line_items.length > 0 ? (
                                        <div className="overflow-x-auto">
                                          <table className="w-full border border-gray-200 rounded-lg">
                                            <thead className="bg-gray-100">
                                              <tr>
                                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Product</th>
                                                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 border-b">Description</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">Quantity</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">Unit Price</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">Actual Cost/Unit</th>
                                                <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 border-b">Line Total</th>
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white">
                                              {bill.vendor_bill_line_items.map((item, index) => (
                                                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                  <td className="px-4 py-3 text-sm text-gray-900 border-b">
                                                    <div>
                                                      <p className="font-medium">{item.product_name}</p>
                                                      {item.product_id && (
                                                        <p className="text-xs text-gray-500">ID: {item.product_id.slice(0, 8)}</p>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="px-4 py-3 text-sm text-gray-900 border-b">
                                                    {item.description || '-'}
                                                  </td>
                                                  <td className="px-4 py-3 text-sm text-gray-900 text-right border-b font-medium">
                                                    {item.quantity}
                                                  </td>
                                                  <td className="px-4 py-3 text-sm text-gray-900 text-right border-b">
                                                    ₹{item.unit_price.toFixed(2)}
                                                  </td>
                                                  <td className="px-4 py-3 text-sm text-gray-900 text-right border-b">
                                                    {item.actual_cost_per_unit ? (
                                                      <span className="font-medium text-green-600">₹{item.actual_cost_per_unit.toFixed(2)}</span>
                                                    ) : (
                                                      <span className="text-gray-400">-</span>
                                                    )}
                                                  </td>
                                                  <td className="px-4 py-3 text-sm text-gray-900 text-right border-b font-semibold">
                                                    ₹{(item.quantity * item.unit_price).toFixed(2)}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                                              <tr>
                                                <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                                  Subtotal:
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                                  ₹{bill.vendor_bill_line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
                                                </td>
                                              </tr>
                                              {(bill.freight_total ?? 0) > 0 && (
                                                <tr>
                                                  <td colSpan={5} className="px-4 py-2 text-sm text-gray-700 text-right">Freight Charges:</td>
                                                  <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{bill.freight_total?.toFixed(2) || '0.00'}</td>
                                                </tr>
                                              )}
                                              {(bill.additional_charges ?? 0) > 0 && (
                                                <tr>
                                                  <td colSpan={5} className="px-4 py-2 text-sm text-gray-700 text-right">Additional Charges:</td>
                                                  <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{bill.additional_charges?.toFixed(2) || '0.00'}</td>
                                                </tr>
                                              )}
                                              {(bill.total_gst ?? 0) > 0 && (
                                                <tr>
                                                  <td colSpan={5} className="px-4 py-2 text-sm text-gray-700 text-right">
                                                    GST ({bill.gst_rate ?? 0}%):
                                                  </td>
                                                  <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{bill.total_gst?.toFixed(2) || '0.00'}</td>
                                                </tr>
                                              )}
                                              {bill.tax_amount > 0 && !bill.total_gst && (
                                                <tr>
                                                  <td colSpan={5} className="px-4 py-2 text-sm text-gray-700 text-right">Tax:</td>
                                                  <td className="px-4 py-2 text-sm text-gray-900 text-right">₹{bill.tax_amount.toFixed(2)}</td>
                                                </tr>
                                              )}
                                              {bill.discount_amount > 0 && (
                                                <tr>
                                                  <td colSpan={5} className="px-4 py-2 text-sm text-gray-700 text-right">Discount:</td>
                                                  <td className="px-4 py-2 text-sm text-red-600 text-right">-₹{bill.discount_amount.toFixed(2)}</td>
                                                </tr>
                                              )}
                                              <tr className="border-t-2 border-gray-300">
                                                <td colSpan={5} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                                  Total Amount:
                                                </td>
                                                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                                  ₹{bill.total_amount.toFixed(2)}
                                                </td>
                                              </tr>
                                            </tfoot>
                                          </table>
                                        </div>
                                      ) : (
                                        <div className="text-center py-8 text-gray-500 bg-white border border-gray-200 rounded-lg">
                                          <p>No line items found for this bill</p>
                                          <p className="text-sm mt-1">This might be a legacy bill or created without item details</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* GST Breakdown */}
                                    {(bill.total_gst ?? 0) > 0 && (
                                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h5 className="font-semibold text-gray-900 mb-3">GST Breakdown</h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">Transaction Type</label>
                                            <p className="text-sm text-gray-900 font-medium">
                                              {bill.is_interstate ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST)'}
                                            </p>
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-gray-600">GST Rate</label>
                                            <p className="text-sm text-gray-900 font-medium">{bill.gst_rate ?? 0}%</p>
                                          </div>
                                          {bill.is_interstate ? (
                                            <div>
                                              <label className="text-sm font-medium text-gray-600">IGST ({bill.gst_rate ?? 0}%)</label>
                                              <p className="text-sm text-gray-900 font-medium">₹{bill.igst?.toFixed(2) || '0.00'}</p>
                                            </div>
                                          ) : (
                                            <>
                                              <div>
                                                <label className="text-sm font-medium text-gray-600">CGST ({((bill.gst_rate ?? 0) / 2)}%)</label>
                                                <p className="text-sm text-gray-900 font-medium">₹{bill.cgst?.toFixed(2) || '0.00'}</p>
                                              </div>
                                              <div>
                                                <label className="text-sm font-medium text-gray-600">SGST ({((bill.gst_rate ?? 0) / 2)}%)</label>
                                                <p className="text-sm text-gray-900 font-medium">₹{bill.sgst?.toFixed(2) || '0.00'}</p>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Bill Description */}
                                    {bill.description && (
                                      <div className="p-4 bg-white rounded-lg border">
                                        <label className="text-sm font-medium text-gray-500">Bill Description</label>
                                        <p className="text-sm text-gray-900 mt-1">{bill.description}</p>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
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
                disabled={isSyncingExpenses}
                onClick={async () => {
                  console.log('Refreshing expenses for vendor:', vendorId);
                  setIsSyncingExpenses(true);
                  
                  try {
                    // First, sync vendor payments to expenses if any are missing
                    console.log('Syncing vendor payments to expenses...');
                    const syncResponse = await fetch(`/api/vendors/${vendorId}/sync-expenses`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    
                    if (syncResponse.ok) {
                      const syncResult = await syncResponse.json();
                      console.log('Sync result:', syncResult);
                      if (syncResult.synced > 0) {
                        alert(`Successfully synced ${syncResult.synced} vendor payments to expenses!`);
                      }
                    }
                    
                    // Then refresh expenses data
                    const expensesResponse = await fetch(`/api/finance/expenses?entity_id=${vendorId}&entity_type=supplier`);
                    const data = await expensesResponse.json();
                    console.log('Refresh expenses API response:', data);
                    
                    const allExpenses = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
                    const expenses = allExpenses.filter((expense: Expense) => 
                      expense.entity_type === 'supplier' && expense.entity_id === vendorId
                    );
                    console.log('Parsed expenses after refresh:', expenses);
                    setExpenses(expenses);
                    
                  } catch (error) {
                    console.error('Error refreshing expenses:', error);
                    alert('Error refreshing expenses. Please try again.');
                  } finally {
                    setIsSyncingExpenses(false);
                  }
                }}
                className="flex items-center gap-2"
              >
                {isSyncingExpenses ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Syncing...
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    Refresh & Sync
                  </>
                )}
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
                            className="h-7 w-7 p-0 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                            title="Delete expense"
                            onClick={() => handleDeleteExpense(expense)}
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

          {/* Pagination Controls */}
          {(() => {
            const filteredExpenses = filterExpenses(expenses, expensesSearchQuery);
            const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);
            const startIndex = (currentPage - 1) * itemsPerPage + 1;
            const endIndex = Math.min(currentPage * itemsPerPage, filteredExpenses.length);
            
            if (filteredExpenses.length === 0) return null;
            
            return (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 border-t border-gray-200">
                {/* Results Info */}
                <div className="text-sm text-gray-600">
                  Showing {startIndex}-{endIndex} of {filteredExpenses.length} expenses
                </div>

                {/* Items per page selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select 
                    title="Items per page"
                    value={itemsPerPage} 
                    onChange={(e) => {
                      const newItemsPerPage = parseInt(e.target.value);
                      setItemsPerPage(newItemsPerPage);
                      setCurrentPage(1); // Reset to first page
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value={filteredExpenses.length}>All ({filteredExpenses.length})</option>
                  </select>
                  <span className="text-sm text-gray-600">per page</span>
                </div>

                {/* Pagination buttons */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1"
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1"
                    >
                      Previous
                    </Button>
                    
                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="px-3 py-1"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1"
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1"
                    >
                      Last
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Edit Bill Dialog */}
      <Dialog open={editBillOpen} onOpenChange={(open) => {
        if (!open && !isUpdatingBill && !isDeletingBill) {
          closeEditDialog();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Vendor Bill
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit_bill_number">Bill Number *</Label>
                  <Input
                    id="edit_bill_number"
                    value={editBillForm.bill_number}
                    onChange={(e) => setEditBillForm({...editBillForm, bill_number: e.target.value})}
                    placeholder="Enter bill number"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_bill_date">Bill Date *</Label>
                  <Input
                    id="edit_bill_date"
                    type="date"
                    value={editBillForm.bill_date}
                    onChange={(e) => setEditBillForm({...editBillForm, bill_date: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_due_date">Due Date *</Label>
                  <Input
                    id="edit_due_date"
                    type="date"
                    value={editBillForm.due_date}
                    onChange={(e) => setEditBillForm({...editBillForm, due_date: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_reference_number">Reference Number</Label>
                  <Input
                    id="edit_reference_number"
                    value={editBillForm.reference_number}
                    onChange={(e) => setEditBillForm({...editBillForm, reference_number: e.target.value})}
                    placeholder="Enter reference number (optional)"
                  />
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit_total_amount">Total Amount *</Label>
                  <Input
                    id="edit_total_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editBillForm.total_amount}
                    onChange={(e) => setEditBillForm({...editBillForm, total_amount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_tax_amount">Tax Amount</Label>
                  <Input
                    id="edit_tax_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editBillForm.tax_amount}
                    onChange={(e) => setEditBillForm({...editBillForm, tax_amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit_discount_amount">Discount Amount</Label>
                  <Input
                    id="edit_discount_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editBillForm.discount_amount}
                    onChange={(e) => setEditBillForm({...editBillForm, discount_amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={editBillForm.description}
                onChange={(e) => setEditBillForm({...editBillForm, description: e.target.value})}
                placeholder="Enter bill description"
                rows={3}
              />
            </div>
            
            {/* Summary */}
            {selectedBillForEdit && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Bill Summary</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Current Paid Amount:</strong> {formatCurrency(selectedBillForEdit.paid_amount)}</p>
                  <p><strong>Current Outstanding:</strong> {formatCurrency(selectedBillForEdit.remaining_amount)}</p>
                  <p className="text-xs text-orange-600 mt-2">
                    Note: Changing the total amount will automatically recalculate the outstanding balance.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center w-full">
              {/* Delete button on the left */}
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteBill}
                disabled={isUpdatingBill || isDeletingBill}
                className="flex items-center gap-2"
              >
                {isDeletingBill ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Bill
                  </>
                )}
              </Button>

              {/* Cancel and Update buttons on the right */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditDialog}
                  disabled={isUpdatingBill || isDeletingBill}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleUpdateBill}
                  disabled={!editBillForm.bill_number.trim() || !editBillForm.total_amount || parseFloat(editBillForm.total_amount) <= 0 || isUpdatingBill || isDeletingBill}
                  className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                >
                  {isUpdatingBill ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Bill
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Vendor Bill Form Dialog */}
      <EnhancedVendorBillForm
        vendorId={vendorId}
        vendorName={vendorName}
        open={createBillOpen}
        onOpenChange={setCreateBillOpen}
        onSuccess={onBillUpdate}
      />

      {/* Legacy Vendor Bill Form Dialog (keeping for compatibility) */}
      {/* <VendorBillForm
        vendorId={vendorId}
        vendorName={vendorName}
        open={createBillOpen}
        onOpenChange={setCreateBillOpen}
        onSuccess={onBillUpdate}
      /> */}

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
      <Dialog open={createExpenseOpen} onOpenChange={isCreatingExpense ? undefined : (open) => {
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
                disabled={isCreatingExpense}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleCreateExpense}
                disabled={!expenseForm.description || !expenseForm.amount || isCreatingExpense}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto order-1 sm:order-2"
              >
                {isCreatingExpense ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    {selectedBillForPayment ? 'Recording...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    {selectedBillForPayment ? 'Record Payment' : 'Create Expense'}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart Payment Dialog */}
      <Dialog open={smartPaymentOpen} onOpenChange={(open) => !isProcessingSmartPayment && setSmartPaymentOpen(open)}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              Smart Bill Payment - {vendorName}
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Enter the amount you have available. Our smart system will automatically settle your oldest bills first.
            </p>
          </DialogHeader>

          <div className="space-y-6">
            {/* Payment Amount Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="smart_amount">Available Amount *</Label>
                  <Input
                    id="smart_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={smartPaymentForm.amount}
                    onChange={(e) => {
                      setSmartPaymentForm({...smartPaymentForm, amount: e.target.value});
                      calculateSmartPayment(parseFloat(e.target.value) || 0);
                    }}
                    placeholder="Enter amount to pay"
                    className="text-lg font-semibold"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Total Outstanding: {formatCurrency(bills.reduce((sum, bill) => sum + bill.remaining_amount, 0))}
                  </p>
                </div>

                <div>
                  <Label htmlFor="smart_payment_date">Payment Date *</Label>
                  <Input
                    id="smart_payment_date"
                    type="date"
                    value={smartPaymentForm.payment_date}
                    onChange={(e) => setSmartPaymentForm({...smartPaymentForm, payment_date: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="smart_payment_method">Payment Method *</Label>
                  <Select
                    value={smartPaymentForm.payment_method}
                    onValueChange={(value) => setSmartPaymentForm({...smartPaymentForm, payment_method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Cash</SelectItem>
                      <SelectItem value="bank_transfer">🏦 Bank Transfer</SelectItem>
                      <SelectItem value="cheque">📝 Cheque</SelectItem>
                      <SelectItem value="card">💳 Card</SelectItem>
                      <SelectItem value="upi">📱 UPI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {smartPaymentForm.payment_method !== 'cash' && (
                  <div>
                    <Label htmlFor="smart_bank_account">Bank Account *</Label>
                    <Select
                      value={smartPaymentForm.bank_account_id}
                      onValueChange={(value) => setSmartPaymentForm({...smartPaymentForm, bank_account_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.filter(account => account.account_type === 'BANK').map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex flex-col">
                              <span>{account.name}</span>
                              <span className="text-xs text-gray-500">
                                {account.account_number || 'N/A'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="smart_reference">Reference Number</Label>
                  <Input
                    id="smart_reference"
                    value={smartPaymentForm.reference_number}
                    onChange={(e) => setSmartPaymentForm({...smartPaymentForm, reference_number: e.target.value})}
                    placeholder="Payment reference (optional)"
                  />
                </div>

                <div>
                  <Label htmlFor="smart_notes">Notes</Label>
                  <Textarea
                    id="smart_notes"
                    value={smartPaymentForm.notes}
                    onChange={(e) => setSmartPaymentForm({...smartPaymentForm, notes: e.target.value})}
                    placeholder="Additional notes (optional)"
                    rows={3}
                  />
                </div>
              </div>

              {/* Payment Preview */}
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Smart Settlement Preview
                  </h3>
                  
                  {paymentPreview.length === 0 ? (
                    <div className="text-center py-8">
                      <Calculator className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Enter an amount above to see payment distribution</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-green-800 mb-3">
                        <strong>Settlement Order:</strong> Oldest bills first (by due date)
                      </div>
                      
                      {paymentPreview.map((preview, index) => (
                        <div key={preview.billId} className="bg-white rounded-lg p-3 border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                #{index + 1}
                              </span>
                              <span className="font-medium text-sm">{preview.billNumber}</span>
                              {preview.willBeFullyPaid && (
                                <Badge className="bg-green-100 text-green-700 text-xs">FULLY PAID</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">Outstanding:</span>
                              <span className="font-semibold ml-1">{formatCurrency(preview.currentOutstanding)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Payment:</span>
                              <span className="font-semibold ml-1 text-green-600">{formatCurrency(preview.paymentAmount)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Remaining:</span>
                              <span className={`font-semibold ml-1 ${preview.remainingAfterPayment === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                {formatCurrency(preview.remainingAfterPayment)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                        <div className="text-sm">
                          <div className="flex justify-between">
                            <span>Total Payment Amount:</span>
                            <span className="font-semibold">{formatCurrency(parseFloat(smartPaymentForm.amount) || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bills Being Settled:</span>
                            <span className="font-semibold">{paymentPreview.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bills Fully Paid:</span>
                            <span className="font-semibold text-green-600">{paymentPreview.filter(p => p.willBeFullyPaid).length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-6 border-t border-gray-200">
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSmartPaymentOpen(false);
                  setSmartPaymentForm({
                    amount: '',
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'bank_transfer',
                    bank_account_id: '',
                    reference_number: '',
                    notes: ''
                  });
                  setPaymentPreview([]);
                }}
                disabled={isProcessingSmartPayment}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleSmartPayment}
                disabled={
                  isProcessingSmartPayment ||
                  !smartPaymentForm.amount || 
                  parseFloat(smartPaymentForm.amount) <= 0 || 
                  paymentPreview.length === 0 ||
                  (smartPaymentForm.payment_method !== 'cash' && !smartPaymentForm.bank_account_id)
                }
                className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none cursor-pointer disabled:cursor-not-allowed"
              >
                {isProcessingSmartPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4 mr-2" />
                    Process Smart Payment
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}