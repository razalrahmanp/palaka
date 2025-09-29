'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface CustomerData {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  name?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  address?: string;
}
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  DollarSign, 
  Calendar, 
  User, 
  Package, 
  AlertCircle,
  Clock,
  Receipt,
  CreditCard,
  Eye,
  Plus,
  Printer,
  MessageCircle,
  Minus,
  Search,
  Trash2,
  TrendingUp,
  TrendingDown,
  Building2,
  Loader2,
  BookOpen
} from 'lucide-react';
import { SalesOrder, Invoice, subcategoryMap } from '@/types';
import { PaymentTrackingDialog } from './PaymentTrackingDialog';
import { SalesOrderPaymentTracker } from './SalesOrderPaymentTracker';
import { WhatsAppService, WhatsAppBillData } from '@/lib/whatsappService';
import { WaiveOffDialog } from './WaiveOffDialog';
import { PaymentDeletionManager } from './PaymentDeletionManager';
import { getCurrentUser } from '@/lib/auth';
import OptimizedLedgerManager from './OptimizedLedgerManager';

// Component interfaces and types

interface Truck {
  id: string;
  plate_number: string;
  model: string;
  year?: number;
  fuel_type: string;
  status: string;
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  position: string;
  salary: number;
  department: string;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
}

interface SalesOrderWithInvoice extends Omit<SalesOrder, 'customer' | 'invoices'> {
  // New API structure fields from /api/finance/sales-orders
  customer?: { name?: string; phone?: string; email?: string; address?: string; formatted_address?: string };
  total_paid?: number;
  balance_due?: number;
  payment_status?: 'paid' | 'partial' | 'pending';
  payment_count?: number;
  is_invoiced?: boolean;
  invoice_status?: 'fully_paid' | 'partially_paid' | 'not_invoiced';
  invoice_count?: number;
  waived_amount?: number; // Added waived amount support
  invoices?: Array<{
    id: string;
    total: number;
    status: string;
    created_at: string;
    paid_amount: number;
    actual_paid_amount: number;
    payment_count: number;
    waived_amount?: number; // Added waived amount support
  }>;
  payments?: Array<{
    id: string;
    invoice_id: string;
    amount: number;
    payment_date?: string;
    date: string;
    method: string;
    reference?: string;
    description?: string;
  }>;
  sales_representative?: {
    id: string;
    name: string;
    email: string;
  };
  
  // Legacy fields for backward compatibility
  total_invoiced?: number;
  remaining_to_invoice?: number;
  paid_amount?: number; // Amount already paid
  payment_balance?: number; // Outstanding amount on invoices
}

interface PaymentDetails {
  id: string;
  sales_order_id: string;
  invoice_id?: string;
  amount: number;
  payment_method: string;
  date: string;
  customer_name?: string;
  reference?: string;
  method?: string;
  status: string;
}

interface SalesOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  products?: {
    id: string;
    name: string;
    sku: string;
    category: string;
    unit_price: number;
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
}

interface VendorBill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  description?: string;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  pay_period_start: string;
  pay_period_end: string;
  basic_salary: number;
  gross_salary: number;
  net_salary: number;
  status: string;
}

interface CashflowTransaction {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense';
  category: 'payment' | 'investment' | 'withdrawal' | 'expense' | 'vendor_payment' | 'liability_payment' | 'loan_setup';
  subcategory?: string;
  amount: number;
  payment_method: string;
  reference?: string;
  customer_name?: string;
  partner_name?: string;
  related_id?: string; // ID of the original record (payment, expense, etc.)
  bank_account?: string;
  created_at: string;
}

export function SalesOrderInvoiceManager() {
  const [salesOrders, setSalesOrders] = useState<SalesOrderWithInvoice[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{id: string; account_name: string; account_number: string; account_type?: string}[]>([]);
  const [loans, setLoans] = useState<{id: string; loan_name: string; bank_name: string; loan_account_code: string; current_balance: number; loan_type: string}[]>([]);
  const [investors, setInvestors] = useState<{id: string; name: string; email?: string; phone?: string; notes?: string}[]>([]);
  const [investmentCategories, setInvestmentCategories] = useState<{id: string; category_name: string; description?: string; chart_account_code?: string}[]>([]);
  const [withdrawalCategories, setWithdrawalCategories] = useState<{id: string; category_name: string; description?: string; chart_account_code?: string}[]>([]);
  const [withdrawalSubcategories, setWithdrawalSubcategories] = useState<{id: string; category_id: string; subcategory_name: string; description?: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentTrackingOpen, setPaymentTrackingOpen] = useState(false);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [createInvestmentOpen, setCreateInvestmentOpen] = useState(false);
  const [createWithdrawalOpen, setCreateWithdrawalOpen] = useState(false);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [createLiabilityOpen, setCreateLiabilityOpen] = useState(false);
  const [liabilityLoading, setLiabilityLoading] = useState(false);
  const [loanSetupOpen, setLoanSetupOpen] = useState(false);
  const [showAddInvestorModal, setShowAddInvestorModal] = useState(false);
  
  // Waive-off states
  const [waiveOffOpen, setWaiveOffOpen] = useState(false);
  const [selectedOrderForWaiveOff, setSelectedOrderForWaiveOff] = useState<SalesOrderWithInvoice | null>(null);
  const [selectedInvoiceForWaiveOff, setSelectedInvoiceForWaiveOff] = useState<Invoice | null>(null);
  const [waiveOffType, setWaiveOffType] = useState<'order' | 'invoice'>('order');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState('orders');
  const [showPagination, setShowPagination] = useState(true); // Toggle between pagination and full list
  const [cashflowSortOrder, setCashflowSortOrder] = useState<'desc' | 'asc'>('desc'); // desc = newest first, asc = oldest first
  
  // Search states for each tab
  const [ordersSearchQuery, setOrdersSearchQuery] = useState('');
  const [invoicesSearchQuery, setInvoicesSearchQuery] = useState('');
  const [paymentsSearchQuery, setPaymentsSearchQuery] = useState('');
  const [expensesSearchQuery, setExpensesSearchQuery] = useState('');
  const [cashflowSearchQuery, setCashflowSearchQuery] = useState('');
  
  // Cashflow states
  const [cashflowTransactions, setCashflowTransactions] = useState<CashflowTransaction[]>([]);
  const [cashflowTypeFilter, setCashflowTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [cashflowCategoryFilter, setCashflowCategoryFilter] = useState<'all' | 'payment' | 'investment' | 'withdrawal' | 'expense' | 'vendor_payment' | 'liability_payment'>('all');
  const [cashflowDateRange, setCashflowDateRange] = useState<{from: string; to: string}>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Start of current month
    to: new Date().toISOString().split('T')[0] // Today
  });
  
  // Payment status filter for sales orders
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  
  // Invoice status filter for invoices tab
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  
  // Delete expense states
  const [deleteExpenseOpen, setDeleteExpenseOpen] = useState(false);
  const [selectedExpenseForDelete, setSelectedExpenseForDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'Office Supplies',
    payment_method: 'cash',
    bank_account_id: '',
    entity_id: '', // For truck, employee, or supplier selection
    entity_type: '', // 'truck', 'employee', 'supplier'
    vendor_bill_id: '', // New field for vendor bill selection
    payroll_record_id: '', // New field for payroll record selection
  });

  const [invoiceForm, setInvoiceForm] = useState({
    date: new Date().toISOString().split('T')[0],
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    amount: '',
    description: '',
    notes: '',
  });
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [customers, setCustomers] = useState<Array<{name: string; phone?: string; email?: string; address?: string}>>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [liabilityForm, setLiabilityForm] = useState({
    date: new Date().toISOString().split('T')[0],
    liability_type: 'bank_loan', // 'bank_loan', 'equipment_loan', 'accrued_expense'
    description: '',
    principal_amount: '',
    interest_amount: '',
    total_amount: '',
    payment_method: 'bank_transfer',
    bank_account_id: '',
    loan_account: '', // Which loan account to debit (2210, 2510, 2530)
    upi_reference: '',
    reference_number: '',
  });

  const [loanSetupForm, setLoanSetupForm] = useState({
    loan_account_code: '2510',
    loan_name: '',
    bank_name: '',
    loan_type: 'business_loan',
    loan_number: '',
    original_loan_amount: '',
    opening_balance: '',
    interest_rate: '',
    loan_tenure_months: '',
    emi_amount: '',
    loan_start_date: '',
    loan_end_date: '',
    description: '',
  });

  const [investmentForm, setInvestmentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    investor_id: '',
    amount: '',
    category: '', // Will be set to first available category ID after fetch
    description: '',
    payment_method: 'cash',
    bank_account_id: '',
    upi_reference: '',
    reference_number: '',
  });

  const [withdrawalForm, setWithdrawalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    partner_id: '',
    amount: '',
    category_id: '',
    subcategory_id: '',
    description: '',
    payment_method: 'cash',
    bank_account_id: '',
    upi_reference: '',
    reference_number: '',
    withdrawal_type: 'capital_withdrawal', // New field for withdrawal type
  });

  // Entity data states
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Additional entity-specific data
  const [vendorBills, setVendorBills] = useState<VendorBill[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);

  const fetchCustomers = useCallback(async () => {
    console.log('🚀 Starting fetchCustomers from customers table...');
    try {
      const response = await fetch('/api/crm/customers');
      console.log('📊 Customers API response:', { 
        ok: response.ok, 
        status: response.status,
        statusText: response.statusText
      });

      if (response.ok) {
        const customersData = await response.json();
        console.log('📦 Customers data structure:', customersData);
        
        // Handle different possible response structures
        const customersList = Array.isArray(customersData) 
          ? customersData 
          : (customersData.customers || customersData.data || []);
        
        console.log('📋 Processing customers:', customersList.length);
        
        const processedCustomers = customersList
          .filter((customer: CustomerData) => customer.name && customer.name.trim())
          .map((customer: CustomerData) => ({
            name: customer.name || '',
            phone: customer.phone || customer.mobile || '',
            email: customer.email || '',
            address: customer.address || ''
          }))
          .sort((a: {name: string}, b: {name: string}) => a.name.localeCompare(b.name));

        console.log('🎯 Final customer list:', processedCustomers.length, processedCustomers);
        setCustomers(processedCustomers);
      } else {
        console.error('❌ Customers API failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('💥 Error fetching customers:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchCustomers();
  }, [fetchCustomers]);

  const buildCashflowFromExistingData = useCallback(async () => {
    console.log('🔧 Building comprehensive cashflow from all data sources...');
    console.log('📊 Available base data:', { 
      paymentsCount: payments.length, 
      expensesCount: expenses.length,
      dateRange: cashflowDateRange 
    });
    
    const transactions: CashflowTransaction[] = [];
    
    try {
      // Fetch all financial transaction data
      console.log('� Fetching additional financial data...');
      const [
        investmentsRes,
        withdrawalsRes,
        liabilityPaymentsRes,
        vendorPaymentsRes
      ] = await Promise.all([
        fetch('/api/equity/investments'),
        fetch('/api/equity/withdrawals'),
        fetch('/api/finance/liability-payments'),
        fetch('/api/reports/vendor-payments')
      ]);
      
      // Process investments (income)
      if (investmentsRes.ok) {
        const investmentsData = await investmentsRes.json();
        const investments = investmentsData.success ? (investmentsData.data || []) : [];
        console.log('💰 Found investments:', investments.length);
        
        investments.forEach((investment: {id: string, investment_date?: string, date?: string, description?: string, category_name?: string, amount: number, payment_method?: string, reference_number?: string, upi_reference?: string, partner_name?: string, created_at?: string}) => {
          transactions.push({
            id: `investment-${investment.id}`,
            date: investment.investment_date || investment.date || new Date().toISOString().split('T')[0],
            description: `Investment: ${investment.description || 'Partner investment'}`,
            type: 'income',
            category: 'investment',
            subcategory: investment.category_name || 'Investment',
            amount: investment.amount,
            payment_method: investment.payment_method || 'cash',
            reference: investment.reference_number || investment.upi_reference,
            partner_name: investment.partner_name,
            related_id: investment.id,
            created_at: investment.created_at || new Date().toISOString()
          });
        });
      }
      
      // Process withdrawals (expense)
      if (withdrawalsRes.ok) {
        const withdrawalsData = await withdrawalsRes.json();
        const withdrawals = withdrawalsData.success ? (withdrawalsData.data || []) : [];
        console.log('� Found withdrawals:', withdrawals.length);
        
        withdrawals.forEach((withdrawal: {id: string, withdrawal_date?: string, date?: string, description?: string, category_name?: string, amount: number, payment_method?: string, reference_number?: string, upi_reference?: string, partner_name?: string, created_at?: string}) => {
          console.log('🔍 Processing withdrawal:', { 
            id: withdrawal.id, 
            description: withdrawal.description, 
            amount: withdrawal.amount,
            date: withdrawal.withdrawal_date || withdrawal.date 
          });
          transactions.push({
            id: `withdrawal-${withdrawal.id}`,
            date: withdrawal.withdrawal_date || withdrawal.date || new Date().toISOString().split('T')[0],
            description: `Withdrawal: ${withdrawal.description || 'Partner withdrawal'}`,
            type: 'expense',
            category: 'withdrawal',
            subcategory: withdrawal.category_name || 'Withdrawal',
            amount: withdrawal.amount,
            payment_method: withdrawal.payment_method || 'cash',
            reference: withdrawal.reference_number || withdrawal.upi_reference,
            partner_name: withdrawal.partner_name,
            related_id: withdrawal.id,
            created_at: withdrawal.created_at || new Date().toISOString()
          });
        });
      }
      
      // Process liability payments (expense)
      if (liabilityPaymentsRes.ok) {
        const liabilityData = await liabilityPaymentsRes.json();
        const liabilityPayments = Array.isArray(liabilityData) ? liabilityData : (liabilityData.data || []);
        console.log('🏦 Found liability payments:', liabilityPayments.length);
        
        liabilityPayments.forEach((payment: {id: string, payment_date?: string, date?: string, description?: string, liability_type?: string, total_amount?: number, amount?: number, payment_method?: string, reference_number?: string, upi_reference?: string, account_name?: string, created_at?: string}) => {
          transactions.push({
            id: `liability-${payment.id}`,
            date: payment.payment_date || payment.date || new Date().toISOString().split('T')[0],
            description: `Loan Payment: ${payment.description || payment.liability_type || 'Liability payment'}`,
            type: 'expense',
            category: 'liability_payment',
            subcategory: payment.liability_type || 'Loan Payment',
            amount: payment.total_amount || payment.amount || 0,
            payment_method: payment.payment_method || 'cash',
            reference: payment.reference_number || payment.upi_reference,
            related_id: payment.id,
            created_at: payment.created_at || new Date().toISOString()
          });
        });
      }
      
      // Process vendor payments (expense)
      if (vendorPaymentsRes.ok) {
        const vendorData = await vendorPaymentsRes.json();
        const vendorPayments = Array.isArray(vendorData) ? vendorData : (vendorData.data || []);
        console.log('🏪 Found vendor payments:', vendorPayments.length);
        
        vendorPayments.forEach((payment: {id: string, payment_date?: string, date?: string, description?: string, supplier_name?: string, vendor_name?: string, total_amount?: number, amount?: number, payment_method?: string, reference_number?: string, upi_reference?: string, created_at?: string}) => {
          transactions.push({
            id: `vendor-${payment.id}`,
            date: payment.payment_date || payment.date || new Date().toISOString().split('T')[0],
            description: `Vendor Payment: ${payment.supplier_name || payment.vendor_name || 'Vendor payment'}`,
            type: 'expense',
            category: 'vendor_payment',
            subcategory: 'Vendor Payment',
            amount: payment.total_amount || payment.amount || 0,
            payment_method: payment.payment_method || 'cash',
            reference: payment.reference_number,
            customer_name: payment.supplier_name || payment.vendor_name,
            related_id: payment.id,
            created_at: payment.created_at || new Date().toISOString()
          });
        });
      }
      
    } catch (error) {
      console.error('❌ Error fetching additional financial data:', error);
    }
    
    // Add payments as income
    payments.forEach(payment => {
      transactions.push({
        id: `payment-${payment.id}`,
        date: payment.date,
        description: `Payment from ${payment.customer_name || 'Customer'}`,
        type: 'income',
        category: 'payment',
        subcategory: payment.payment_method || payment.method,
        amount: payment.amount,
        payment_method: payment.payment_method || payment.method || 'cash',
        reference: payment.reference,
        customer_name: payment.customer_name,
        related_id: payment.id,
        created_at: payment.date
      });
    });
    
    console.log('➕ Added payments to transactions:', transactions.filter(t => t.type === 'income').length);
    
    // Add expenses as outflow
    expenses.forEach(expense => {
      transactions.push({
        id: `expense-${expense.id}`,
        date: expense.date,
        description: expense.description,
        type: 'expense',
        category: 'expense',
        subcategory: expense.category,
        amount: expense.amount,
        payment_method: expense.payment_method,
        related_id: expense.id,
        created_at: expense.created_at
      });
    });
    
    console.log('➕ Added expenses to transactions:', transactions.filter(t => t.type === 'expense').length);
    console.log('📋 Total transactions before filtering:', transactions.length);
    
    // Remove duplicates based on multiple criteria to handle potential database duplicates
    const uniqueTransactions = transactions.filter((transaction, index, self) => {
      return index === self.findIndex(t => 
        t.date === transaction.date &&
        t.description === transaction.description &&
        t.amount === transaction.amount &&
        t.type === transaction.type &&
        t.category === transaction.category
      );
    });
    
    console.log('🔄 Removed duplicates:', transactions.length - uniqueTransactions.length);

    // Helper function to parse dates properly
    const parseDate = (dateStr: string): Date => {
      if (!dateStr) return new Date(0);
      
      // Check if it's in DD/MM/YYYY format (common in displays)
      if (dateStr.includes('/') && !dateStr.includes('T')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          // Convert DD/MM/YYYY to YYYY-MM-DD for proper parsing
          const day = parts[0].padStart(2, '0');
          const month = parts[1].padStart(2, '0');
          const year = parts[2];
          return new Date(`${year}-${month}-${day}`);
        }
      }
      
      // Handle ISO format or other standard formats
      return new Date(dateStr);
    };

    // Sort by date: Pure chronological sorting
    uniqueTransactions.sort((a, b) => {
      const aDateStr = a.date?.split('T')[0] || a.date;
      const bDateStr = b.date?.split('T')[0] || b.date;
      
      // Parse dates properly
      const aDateOnly = parseDate(aDateStr);
      const bDateOnly = parseDate(bDateStr);
      const aDate = parseDate(a.date);
      const bDate = parseDate(b.date);
      
      // If different dates, sort by date based on sort order
      if (aDateStr !== bDateStr) {
        if (cashflowSortOrder === 'desc') {
          // Newest to oldest (pure date sort)
          return bDateOnly.getTime() - aDateOnly.getTime();
        } else {
          // Oldest to newest (pure date sort)
          return aDateOnly.getTime() - bDateOnly.getTime();
        }
      }
      
      // If same date, sort by time based on sort order
      if (cashflowSortOrder === 'desc') {
        return bDate.getTime() - aDate.getTime(); // newest first within same day
      } else {
        return aDate.getTime() - bDate.getTime(); // oldest first within same day
      }
    });    // Filter by date range
    let filteredTransactions = uniqueTransactions;
    
    // Only apply date filtering if we have valid dates and not showing all
    if (cashflowDateRange.from && cashflowDateRange.to && cashflowDateRange.from !== 'all' && cashflowDateRange.to !== 'all') {
      filteredTransactions = uniqueTransactions.filter(transaction => {
        if (!transaction.date) {
          console.log('⚠️ Transaction missing date:', transaction);
          return false;
        }
        
        const transactionDate = new Date(transaction.date);
        const fromDate = new Date(cashflowDateRange.from);
        const toDate = new Date(cashflowDateRange.to);
        
        // Check if dates are valid
        if (isNaN(transactionDate.getTime()) || isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
          console.log('⚠️ Invalid date found:', {
            transactionDate: transaction.date,
            fromDate: cashflowDateRange.from,
            toDate: cashflowDateRange.to
          });
          return false;
        }
        
        // Set end of day for toDate to include transactions on the to date
        toDate.setHours(23, 59, 59, 999);
        
        const isInRange = transactionDate >= fromDate && transactionDate <= toDate;
        
        console.log('🔍 Filtering transaction:', {
          id: transaction.id,
          transactionDate: transaction.date,
          transactionDateObj: transactionDate.toISOString(),
          fromDate: cashflowDateRange.from,
          fromDateObj: fromDate.toISOString(),
          toDate: cashflowDateRange.to,
          toDateObj: toDate.toISOString(),
          isInRange: isInRange,
          description: transaction.description.substring(0, 30)
        });
        
        return isInRange;
      });
    }
    
    setCashflowTransactions(filteredTransactions);
    console.log('✅ Built cashflow transactions after date filtering:', filteredTransactions.length);
    console.log('📊 Sample filtered transaction:', filteredTransactions[0]);
  }, [payments, expenses, cashflowDateRange, cashflowSortOrder]);

  const fetchCashflowData = useCallback(async () => {
    try {
      console.log('🔄 Fetching cashflow data...');
      
      // For debugging: Force fallback to see if the issue is with API or data processing
      console.log('🔧 Temporarily bypassing API to debug - using fallback data processing...');
      buildCashflowFromExistingData();
      return;
      
      // Fetch cashflow data from dedicated API endpoint
      const response = await fetch(`/api/finance/cashflow?from=${cashflowDateRange.from}&to=${cashflowDateRange.to}`);
      
      if (!response.ok) {
        console.error('Failed to fetch cashflow data:', response.statusText);
        // If dedicated API doesn't exist, build cashflow from existing data
        buildCashflowFromExistingData();
        return;
      }
      
      const cashflowData = await response.json();
      console.log('💰 Cashflow API Response:', cashflowData);
      
      setCashflowTransactions(cashflowData.transactions || []);
      
    } catch (error) {
      console.error('Error fetching cashflow data:', error);
      // Fallback to building from existing data
      buildCashflowFromExistingData();
    }
  }, [cashflowDateRange, buildCashflowFromExistingData]);

  useEffect(() => {
    // Fetch cashflow data when date range changes or when we have base data
    console.log('🎯 Cashflow useEffect triggered:', {
      paymentsLength: payments.length,
      expensesLength: expenses.length,
      dateRange: cashflowDateRange,
      shouldFetch: payments.length > 0 || expenses.length > 0
    });
    
    if (payments.length > 0 || expenses.length > 0) {
      console.log('✅ Triggering fetchCashflowData...');
      fetchCashflowData();
    } else {
      console.log('⏳ Waiting for data to load...');
    }
  }, [cashflowDateRange, payments, expenses, fetchCashflowData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Use the dedicated finance sales orders API for comprehensive data
      const ordersRes = await fetch('/api/finance/sales-orders');
      if (!ordersRes.ok) {
        console.error('Failed to fetch finance sales orders:', ordersRes.statusText);
        throw new Error('Failed to fetch finance sales orders');
      }
      
      const ordersData = await ordersRes.json();
      console.log('🔍 Finance Sales Orders API Response:', ordersData);
      
      // Extract orders from the new API structure
      const orders = ordersData.orders || [];
      console.log('📦 Processed Orders Array:', orders);
      console.log('📊 Orders count:', orders?.length || 0);
      console.log('📋 First order sample:', orders[0]);
      console.log('📈 Summary:', ordersData.summary);
      
      // Fetch the rest separately for other components that might need them
      console.log('🔍 Making API calls including withdrawal endpoints and loans...');
      const [invoicesRes, paymentsRes, expensesRes, bankAccountsRes, loansRes, trucksRes, employeesRes, suppliersRes, investorsRes, investmentCategoriesRes, withdrawalCategoriesRes, withdrawalSubcategoriesRes] = await Promise.all([
        fetch('/api/finance/invoices'),
        fetch('/api/finance/payments'),
        fetch('/api/finance/expenses'),
        fetch('/api/finance/bank-accounts'),
        fetch('/api/finance/loan-opening-balances'),
        fetch('/api/trucks'),
        fetch('/api/employees?select=id,name,employee_id,position,salary,department'),
        fetch('/api/vendors'),
        fetch('/api/equity/investors'),
        fetch('/api/equity/investment-categories'),
        fetch('/api/equity/withdrawal-categories').then(res => {
          console.log('📞 Withdrawal Categories Response Status:', res.status);
          return res;
        }),
        fetch('/api/equity/withdrawal-subcategories').then(res => {
          console.log('📞 Withdrawal Subcategories Response Status:', res.status);
          return res;
        })
      ]);
      
      const invoicesData = await invoicesRes.json();
      const paymentsData = await paymentsRes.json();
      const expensesData = await expensesRes.json();
      
      // Handle bank accounts with error checking
      let bankAccountsData = [];
      if (bankAccountsRes.ok) {
        bankAccountsData = await bankAccountsRes.json();
      } else {
        console.error('Failed to fetch bank accounts:', bankAccountsRes.statusText);
        // Continue without bank accounts - user will see "No bank accounts available"
      }

      // Handle loans with error checking
      let loansData = [];
      if (loansRes.ok) {
        const loansResponse = await loansRes.json();
        loansData = loansResponse.loanBalances || [];
        console.log('🏦 Loans fetched for liability payments:', loansData.length);
      } else {
        console.error('Failed to fetch loans:', loansRes.statusText);
      }

      // Handle entity data
      let trucksData = [];
      if (trucksRes.ok) {
        trucksData = await trucksRes.json();
      } else {
        console.error('Failed to fetch trucks:', trucksRes.statusText);
      }

      let employeesData = [];
      if (employeesRes.ok) {
        employeesData = await employeesRes.json();
      } else {
        console.error('Failed to fetch employees:', employeesRes.statusText);
      }

      let suppliersData = [];
      if (suppliersRes.ok) {
        const suppliersResponse = await suppliersRes.json();
        suppliersData = suppliersResponse.success ? (suppliersResponse.vendors || suppliersResponse.data || []) : [];
      } else {
        console.error('Failed to fetch suppliers:', suppliersRes.statusText);
      }

      let investorsData = [];
      if (investorsRes.ok) {
        const investorsResponse = await investorsRes.json();
        investorsData = investorsResponse.success ? (investorsResponse.investors || investorsResponse.data || []) : [];
      } else {
        console.error('Failed to fetch investors:', investorsRes.statusText);
      }

      let investmentCategoriesData = [];
      if (investmentCategoriesRes.ok) {
        const categoriesResponse = await investmentCategoriesRes.json();
        investmentCategoriesData = categoriesResponse.success ? (categoriesResponse.data || []) : [];
      } else {
        console.error('Failed to fetch investment categories:', investmentCategoriesRes.statusText);
      }

      let withdrawalCategoriesData = [];
      if (withdrawalCategoriesRes.ok) {
        const categoriesResponse = await withdrawalCategoriesRes.json();
        withdrawalCategoriesData = categoriesResponse.success ? (categoriesResponse.data || []) : [];
        console.log('✅ Withdrawal Categories Data:', withdrawalCategoriesData);
      } else {
        console.error('❌ Failed to fetch withdrawal categories:', withdrawalCategoriesRes.statusText);
      }

      let withdrawalSubcategoriesData = [];
      if (withdrawalSubcategoriesRes.ok) {
        const subcategoriesResponse = await withdrawalSubcategoriesRes.json();
        withdrawalSubcategoriesData = subcategoriesResponse.success ? (subcategoriesResponse.data || []) : [];
        console.log('✅ Withdrawal Subcategories Data:', withdrawalSubcategoriesData);
      } else {
        console.error('❌ Failed to fetch withdrawal subcategories:', withdrawalSubcategoriesRes.statusText);
      }
      
      console.log('Raw Invoices Data:', invoicesData); // Enhanced debugging
      console.log('Raw Payments Data:', paymentsData); // Enhanced debugging
      console.log('Raw Expenses Data:', expensesData); // Enhanced debugging
      console.log('Raw Bank Accounts Data:', bankAccountsData); // Enhanced debugging

      // Handle different API response structures
      const invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData.data || []);
      const payments = Array.isArray(paymentsData) ? paymentsData : (paymentsData.data || []);
      const expenses = Array.isArray(expensesData) ? expensesData : (expensesData.data || []);
      const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : (bankAccountsData.data || []);

      console.log('Processed Invoices:', invoices); // Enhanced debugging
      console.log('Processed Payments:', payments); // Enhanced debugging
      console.log('Processed Expenses:', expenses); // Enhanced debugging
      console.log('Processed Bank Accounts:', bankAccounts); // Enhanced debugging
      console.log('Processed Payments:', payments); // Enhanced debugging
      console.log('Payments structure check:', payments.length > 0 ? payments[0] : 'No payments found'); // Check structure

      // Use the orders data directly since payment calculations are already done in the backend
      const processedOrders = orders.map((order: SalesOrder) => {
        // Ensure we have consistent field names and the payment data from backend is used
        const orderTotal = order.final_price || order.total || 0;
        
        return {
          ...order,
          // Ensure we have consistent field names
          total_price: orderTotal,
          created_at: order.created_at || (order.date ? `${order.date}T00:00:00.000Z` : new Date().toISOString()),
          // Keep the payment data that was calculated correctly in the backend
          // paid_amount, payment_balance, invoice_status, etc. are already included from the API
        };
      });

      console.log('Processed Orders with Backend Payment Data:', processedOrders); // Debugging line
      console.log('Final processed orders count:', processedOrders.length); // Debugging line
      setSalesOrders(processedOrders);
      setInvoices(invoices);
      setPayments(payments);
      setExpenses(expenses);
      setBankAccounts(bankAccounts);
      setLoans(loansData);
      setInvestors(investorsData);
      setInvestmentCategories(investmentCategoriesData);
      setWithdrawalCategories(withdrawalCategoriesData);
      setWithdrawalSubcategories(withdrawalSubcategoriesData);
      
      console.log('🎯 Final State Data:');
      console.log('- Investors:', investorsData.length);
      console.log('- Investment Categories:', investmentCategoriesData.length);
      console.log('- Withdrawal Categories:', withdrawalCategoriesData.length);
      console.log('- Withdrawal Subcategories:', withdrawalSubcategoriesData.length);
      setTrucks(trucksData);
      setEmployees(employeesData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };



  const getPaymentStatusBadge = (status: string, totalPaid: number = 0, orderTotal: number = 0, waivedAmount: number = 0) => {
    // Determine actual status based on payment amounts and waived amounts
    const effectivePaid = totalPaid + waivedAmount; // Consider waived as paid
    let actualStatus = status;
    
    if (effectivePaid >= orderTotal && orderTotal > 0) {
      actualStatus = 'paid';
    } else if (totalPaid > 0 || waivedAmount > 0) {
      actualStatus = 'partial';
    } else {
      actualStatus = 'unpaid';
    }

    switch (actualStatus) {
      case 'paid':
      case 'PAID':
      case 'Paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case 'unpaid':
      case 'UNPAID':
      case 'Unpaid':
        return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
      case 'partially_paid':
      case 'partial':
      case 'PARTIAL':
      case 'Partially Paid':
        return <Badge className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{actualStatus}</Badge>;
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

  // Entity selection logic
  const getEntityTypeForCategory = (category: string): string => {
    if (category.toLowerCase().includes('vehicle fuel') || category.toLowerCase().includes('vehicle maintenance') || category.toLowerCase().includes('vehicle') && category.toLowerCase().includes('fleet')) {
      return 'truck';
    }
    if (category.toLowerCase().includes('salary') || category.toLowerCase().includes('salaries') || 
        category.toLowerCase().includes('wages') || category.toLowerCase().includes('incentive') || 
        category.toLowerCase().includes('bonus') || category.toLowerCase().includes('overtime')) {
      return 'employee';
    }
    if (category.toLowerCase().includes('vendor') || category.toLowerCase().includes('supplier')) {
      return 'supplier';
    }
    return '';
  };

  const handleCategoryChange = (category: string) => {
    const entityType = getEntityTypeForCategory(category);
    setExpenseForm({ 
      ...expenseForm, 
      category, 
      entity_type: entityType,
      entity_id: '' // Reset entity selection when category changes
    });
  };

  const getEntityOptions = () => {
    switch (expenseForm.entity_type) {
      case 'truck':
        return trucks
          .filter(truck => truck.id && truck.id.trim() !== '')
          .map(truck => ({
            value: truck.id,
            label: `${truck.plate_number} - ${truck.model} (${truck.fuel_type})`
          }));
      case 'employee':
        return employees
          .filter(employee => employee.id && employee.id.trim() !== '')
          .map(employee => ({
            value: employee.id,
            label: `${employee.name} - ${employee.position} (₹${employee.salary?.toLocaleString('en-IN')})`
          }));
      case 'supplier':
        return suppliers
          .filter(supplier => supplier.id && supplier.id.trim() !== '')
          .map(supplier => ({
            value: supplier.id,
            label: `${supplier.name} - ${supplier.contact}`
          }));
      default:
        return [];
    }
  };

  const getSelectedEntityDetails = () => {
    if (!expenseForm.entity_id || !expenseForm.entity_type) return null;

    switch (expenseForm.entity_type) {
      case 'truck': {
        const truck = trucks.find(t => t.id === expenseForm.entity_id);
        return truck ? {
          name: `${truck.plate_number} - ${truck.model}`,
          details: `Year: ${truck.year || 'N/A'}, Fuel: ${truck.fuel_type}, Status: ${truck.status}`
        } : null;
      }
      case 'employee': {
        const employee = employees.find(e => e.id === expenseForm.entity_id);
        return employee ? {
          name: `${employee.name} (${employee.employee_id})`,
          details: `Position: ${employee.position}, Department: ${employee.department || 'N/A'}, Salary: ₹${employee.salary?.toLocaleString('en-IN') || 'N/A'}`
        } : null;
      }
      case 'supplier': {
        const supplier = suppliers.find(s => s.id === expenseForm.entity_id);
        return supplier ? {
          name: supplier.name,
          details: `Contact: ${supplier.contact}, Email: ${supplier.email || 'N/A'}`
        } : null;
      }
      default:
        return null;
    }
  };

  // Fetch entity-specific data when entity is selected
  const fetchVendorBills = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/vendors/${supplierId}/bills`);
      if (response.ok) {
        const data = await response.json();
        setVendorBills(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching vendor bills:', error);
      setVendorBills([]);
    }
  };

  const fetchPayrollRecords = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/payroll/records?employee_id=${employeeId}&status=pending`);
      if (response.ok) {
        const data = await response.json();
        setPayrollRecords(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching payroll records:', error);
      setPayrollRecords([]);
    }
  };

  // Handle entity selection change
  const handleEntityChange = (entityId: string) => {
    // Reset entity-specific selections when entity changes
    setExpenseForm({ 
      ...expenseForm, 
      entity_id: entityId,
      vendor_bill_id: '', // Reset vendor bill selection
      payroll_record_id: '', // Reset payroll record selection
    });
    
    // Reset entity-specific data arrays
    setVendorBills([]);
    setPayrollRecords([]);
    
    // Fetch entity-specific data
    if (expenseForm.entity_type === 'supplier' && entityId) {
      fetchVendorBills(entityId);
    } else if (expenseForm.entity_type === 'employee' && entityId) {
      fetchPayrollRecords(entityId);
    }
  };

  // Waive-off handlers
  const handleWaiveOffOrder = (order: SalesOrderWithInvoice) => {
    setSelectedOrderForWaiveOff(order);
    setSelectedInvoiceForWaiveOff(null);
    setWaiveOffType('order');
    setWaiveOffOpen(true);
  };

  const handleWaiveOffInvoice = (invoice: Invoice) => {
    setSelectedInvoiceForWaiveOff(invoice);
    setSelectedOrderForWaiveOff(null);
    setWaiveOffType('invoice');
    setWaiveOffOpen(true);
  };

  const handleWaiveOffSuccess = () => {
    // Refresh data after successful waive-off
    fetchData();
  };

  // Pagination logic
  const getPaginatedData = <T,>(data: T[], page: number, perPage: number): T[] => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (dataLength: number, perPage: number) => {
    return Math.ceil(dataLength / perPage);
  };

  // Filter functions for search
  const filterInvoices = (invoices: Invoice[], searchQuery: string, statusFilter: 'all' | 'paid' | 'unpaid' | 'partial' = 'all'): Invoice[] => {
    let filteredInvoices = invoices;

    // Filter by payment status
    if (statusFilter !== 'all') {
      filteredInvoices = filteredInvoices.filter((invoice) => {
        const totalPaid = invoice.paid_amount || 0;
        const invoiceTotal = invoice.total || 0;
        const waivedAmount = invoice.waived_amount || 0;
        const effectivePaid = totalPaid + waivedAmount; // Consider waived as paid
        
        if (statusFilter === 'paid') {
          return effectivePaid >= invoiceTotal && invoiceTotal > 0;
        } else if (statusFilter === 'unpaid') {
          return totalPaid === 0 && waivedAmount === 0;
        } else if (statusFilter === 'partial') {
          return (totalPaid > 0 || waivedAmount > 0) && effectivePaid < invoiceTotal;
        }
        return true;
      });
    }

    // Filter by search query
    if (!searchQuery.trim()) return filteredInvoices;
    
    const query = searchQuery.toLowerCase();
    return filteredInvoices.filter((invoice) => {
      return (
        invoice.id.toLowerCase().includes(query) ||
        invoice.customer_name?.toLowerCase().includes(query) ||
        invoice.sales_order_id?.toLowerCase().includes(query) ||
        invoice.status?.toLowerCase().includes(query) ||
        invoice.total?.toString().includes(query) ||
        formatDate(invoice.created_at).toLowerCase().includes(query)
      );
    });
  };

  const filterSalesOrders = (orders: SalesOrderWithInvoice[], searchQuery: string, statusFilter: 'all' | 'paid' | 'unpaid' | 'partial' = 'all'): SalesOrderWithInvoice[] => {
    let filteredOrders = orders;

    // Filter by payment status
    if (statusFilter !== 'all') {
      filteredOrders = filteredOrders.filter((order) => {
        const totalPaid = order.total_paid || 0;
        const orderTotal = order.final_price || order.total || 0;
        const waivedAmount = order.waived_amount || 0;
        const effectivePaid = totalPaid + waivedAmount; // Consider waived as paid
        
        if (statusFilter === 'paid') {
          return effectivePaid >= orderTotal && orderTotal > 0;
        } else if (statusFilter === 'unpaid') {
          return totalPaid === 0 && waivedAmount === 0;
        } else if (statusFilter === 'partial') {
          return (totalPaid > 0 || waivedAmount > 0) && effectivePaid < orderTotal;
        }
        return true;
      });
    }

    // Filter by search query
    if (!searchQuery.trim()) return filteredOrders;
    
    const query = searchQuery.toLowerCase();
    return filteredOrders.filter((order) => {
      return (
        order.id.toLowerCase().includes(query) ||
        order.customer?.name?.toLowerCase().includes(query) ||
        order.customer?.phone?.toLowerCase().includes(query) ||
        order.status?.toLowerCase().includes(query) ||
        order.total?.toString().includes(query) ||
        formatDate(order.created_at).toLowerCase().includes(query)
      );
    });
  };

  const filterPayments = (payments: PaymentDetails[], searchQuery: string): PaymentDetails[] => {
    if (!searchQuery.trim()) return payments;
    
    const query = searchQuery.toLowerCase();
    return payments.filter((payment) => {
      return (
        payment.id.toLowerCase().includes(query) ||
        payment.customer_name?.toLowerCase().includes(query) ||
        payment.payment_method?.toLowerCase().includes(query) ||
        payment.method?.toLowerCase().includes(query) ||
        payment.reference?.toLowerCase().includes(query) ||
        payment.amount?.toString().includes(query) ||
        formatDate(payment.date).toLowerCase().includes(query)
      );
    });
  };

  const filterExpenses = (expenses: Expense[], searchQuery: string): Expense[] => {
    if (!searchQuery.trim()) return expenses;
    
    const query = searchQuery.toLowerCase();
    return expenses.filter((expense) => {
      return (
        expense.id.toLowerCase().includes(query) ||
        expense.description?.toLowerCase().includes(query) ||
        expense.category?.toLowerCase().includes(query) ||
        expense.type?.toLowerCase().includes(query) ||
        expense.payment_method?.toLowerCase().includes(query) ||
        expense.amount?.toString().includes(query) ||
        formatDate(expense.date).toLowerCase().includes(query)
      );
    });
  };

  const filterCashflowTransactions = (
    transactions: CashflowTransaction[], 
    searchQuery: string, 
    typeFilter: 'all' | 'income' | 'expense' = 'all',
    categoryFilter: 'all' | 'payment' | 'investment' | 'withdrawal' | 'expense' | 'vendor_payment' | 'liability_payment' = 'all'
  ): CashflowTransaction[] => {
    let filteredTransactions = transactions;

    // Filter by type
    if (typeFilter !== 'all') {
      filteredTransactions = filteredTransactions.filter(transaction => transaction.type === typeFilter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filteredTransactions = filteredTransactions.filter(transaction => transaction.category === categoryFilter);
    }

    // Filter by search query
    if (!searchQuery.trim()) return filteredTransactions;
    
    const query = searchQuery.toLowerCase();
    return filteredTransactions.filter((transaction) => {
      return (
        transaction.id.toLowerCase().includes(query) ||
        transaction.description?.toLowerCase().includes(query) ||
        transaction.category?.toLowerCase().includes(query) ||
        transaction.subcategory?.toLowerCase().includes(query) ||
        transaction.payment_method?.toLowerCase().includes(query) ||
        transaction.customer_name?.toLowerCase().includes(query) ||
        transaction.partner_name?.toLowerCase().includes(query) ||
        transaction.reference?.toLowerCase().includes(query) ||
        transaction.amount?.toString().includes(query) ||
        formatDate(transaction.date).toLowerCase().includes(query)
      );
    });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  const getCurrentDataLength = () => {
    switch (activeTab) {
      case 'orders':
        return filterSalesOrders(salesOrders, ordersSearchQuery, paymentStatusFilter).length;
      case 'invoices':
        return filterInvoices(invoices, invoicesSearchQuery, invoiceStatusFilter).length;
      case 'payments':
        return filterPayments(payments, paymentsSearchQuery).length;
      case 'expenses':
        return filterExpenses(expenses, expensesSearchQuery).length;
      case 'cashflow':
        return filterCashflowTransactions(cashflowTransactions, cashflowSearchQuery, cashflowTypeFilter, cashflowCategoryFilter).length;
      default:
        return 0;
    }
  };

  const PaginationComponent = () => {
    const totalPages = getTotalPages(getCurrentDataLength(), itemsPerPage);
    
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <div className="text-sm text-gray-700">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, getCurrentDataLength())} of {getCurrentDataLength()} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          {/* Page numbers */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNumber)}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  const handlePrintBill = async (order: SalesOrderWithInvoice) => {
    try {
      // Fetch order details with items and customer info
      const response = await fetch(`/api/sales/orders/${order.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      const orderDetails = await response.json();
      
      const billData: WhatsAppBillData = {
        customerName: orderDetails.customers?.name || 'N/A',
        customerPhone: orderDetails.customers?.phone || 'N/A',
        orderNumber: orderDetails.order_number || order.id,
        items: orderDetails.items?.map((item: SalesOrderItem) => ({
          name: item.products?.name || `Product ${item.product_id}`,
          quantity: item.quantity || 1,
          price: item.unit_price || 0,
          total: (item.quantity || 1) * (item.unit_price || 0)
        })) || [],
        subtotal: orderDetails.total_amount || 0,
        tax: 0,
        discount: 0,
        total: orderDetails.total_amount || 0,
        companyName: 'PalakaERP',
        companyPhone: 'Sales: 9645075858, Delivery: 9747141858, Service: 9074513057',
        companyAddress: '',
        customerAddress: orderDetails.customers?.address || orderDetails.address || ''
      };

      WhatsAppService.printInvoice(billData);
    } catch (error) {
      console.error('Error printing bill:', error);
      alert('Error printing bill. Please try again.');
    }
  };

  const handleSendWhatsApp = async (order: SalesOrderWithInvoice) => {
    try {
      // Fetch order details with items and customer info
      const response = await fetch(`/api/sales/orders/${order.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }
      
      const orderDetails = await response.json();
      
      if (!orderDetails.customers?.phone) {
        alert('Customer phone number not found. Please update customer details.');
        return;
      }

      // Fetch payment information
      const paymentResponse = await fetch(`/api/sales/orders/${order.id}/payments`);
      let paymentData = { payments: [], summary: { total_paid: 0, payment_count: 0 } };
      
      if (paymentResponse.ok) {
        paymentData = await paymentResponse.json();
      }

      const totalPaid = paymentData.summary?.total_paid || 0;
      const orderTotal = orderDetails.total_amount || 0;
      const balanceDue = orderTotal - totalPaid;
      const paymentStatus = totalPaid >= orderTotal ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Pending';
      
      // Get last payment date
      let lastPaymentDate = '';
      if (paymentData.payments && paymentData.payments.length > 0) {
        const sortedPayments = (paymentData.payments as { date: string }[]).sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        lastPaymentDate = new Date(sortedPayments[0].date).toLocaleDateString();
      }

      const billData: WhatsAppBillData = {
        customerName: orderDetails.customers?.name || 'N/A',
        customerPhone: orderDetails.customers.phone,
        orderNumber: orderDetails.order_number || order.id,
        items: orderDetails.items?.map((item: SalesOrderItem) => ({
          name: item.products?.name || `Product ${item.product_id}`,
          quantity: item.quantity || 1,
          price: item.unit_price || 0,
          total: (item.quantity || 1) * (item.unit_price || 0)
        })) || [],
        subtotal: orderDetails.total_amount || 0,
        tax: 0,
        discount: 0,
        total: orderDetails.total_amount || 0,
        companyName: 'PalakaERP',
        companyPhone: 'Sales: 9645075858, Delivery: 9747141858, Service: 9074513057',
        companyAddress: '',
        customerAddress: orderDetails.customers?.address || orderDetails.address || '',
        paymentInfo: {
          totalPaid: totalPaid,
          balanceDue: balanceDue,
          paymentStatus: paymentStatus,
          lastPaymentDate: lastPaymentDate,
          paymentCount: paymentData.summary?.payment_count || 0
        }
      };

      const result = await WhatsAppService.sendBill(orderDetails.customers.phone, billData);
      
      if (result.success) {
        alert(result.message);
      } else {
        alert(`Failed to send WhatsApp: ${result.message}`);
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      alert('Error sending WhatsApp. Please try again.');
    }
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
    if (requiresBankAccount && !expenseForm.bank_account_id) {
      alert('Please select a bank account for this payment method');
      return;
    }

    setIsCreatingExpense(true);
    try {
      const response = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: expenseForm.date,
          subcategory: expenseForm.category,
          description: expenseForm.description + (getSelectedEntityDetails() ? ` [${getSelectedEntityDetails()?.name}]` : ''),
          amount: parseFloat(expenseForm.amount),
          payment_method: expenseForm.payment_method,
          bank_account_id: expenseForm.bank_account_id || (bankAccounts.length > 0 ? bankAccounts[0].id : 1), // Use selected bank account or first available
          entity_id: expenseForm.entity_id || null,
          entity_type: expenseForm.entity_type || null,
          created_by: getCurrentUser()?.id, // Get current user from auth context
          // Additional fields for entity integrations
          vendor_bill_id: expenseForm.vendor_bill_id || null,
          payroll_record_id: expenseForm.payroll_record_id || null,
          odometer: null, // Could be added to form for vehicle expenses
          quantity: null, // Could be added to form for fuel/parts
          location: null, // Could be added to form for fuel stations, etc.
          vendor_name: null, // Could be extracted from supplier name
          receipt_number: null // Could be added to form
        }),
      });

      if (response.ok) {
        setCreateExpenseOpen(false);
        setExpenseForm({
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: '',
          category: 'Office Supplies',
          payment_method: 'cash',
          bank_account_id: '',
          entity_id: '',
          entity_type: '',
          vendor_bill_id: '',
          payroll_record_id: '',
        });
        fetchData(); // Refresh data
        alert('Expense created successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to create expense: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Error creating expense. Please try again.');
    } finally {
      setIsCreatingExpense(false);
    }
  };

  const handleCustomerSelect = (customer: {name: string; phone?: string; email?: string; address?: string}) => {
    setInvoiceForm(prev => ({
      ...prev,
      customer_name: customer.name,
      customer_phone: customer.phone || '',
      customer_email: customer.email || ''
    }));
    
    // Hide the dropdown after selection
    setShowCustomerDropdown(false);
  };

  const handleCreateInvoice = async () => {
    // Validation
    if (!invoiceForm.customer_name.trim()) {
      alert('Please enter a customer name');
      return;
    }

    if (!invoiceForm.amount || parseFloat(invoiceForm.amount) <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    if (!invoiceForm.description.trim()) {
      alert('Please enter a description for the invoice');
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const response = await fetch('/api/finance/standalone-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: invoiceForm.customer_name,
          customer_phone: invoiceForm.customer_phone || null,
          customer_email: invoiceForm.customer_email || null,
          amount: parseFloat(invoiceForm.amount),
          description: invoiceForm.description,
          notes: invoiceForm.notes || null,
          date: invoiceForm.date
        }),
      });

      if (response.ok) {
        setCreateInvoiceOpen(false);
        setInvoiceForm({
          date: new Date().toISOString().split('T')[0],
          customer_name: '',
          customer_phone: '',
          customer_email: '',
          amount: '',
          description: '',
          notes: '',
        });
        fetchData(); // Refresh data
        alert('Invoice created successfully with automatic journal entry!');
      } else {
        const error = await response.json();
        alert(`Failed to create invoice: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please try again.');
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleDeleteExpense = (expense: Expense) => {
    setSelectedExpenseForDelete(expense);
    setDeleteExpenseOpen(true);
  };

  const confirmDeleteExpense = async () => {
    if (!selectedExpenseForDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/finance/expenses/cleanup?expense_id=${selectedExpenseForDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setDeleteExpenseOpen(false);
        setSelectedExpenseForDelete(null);
        fetchData(); // Refresh data
        alert('Expense deleted successfully with comprehensive cleanup!');
        console.log('Cleanup details:', result);
      } else {
        const error = await response.json();
        alert(`Failed to delete expense: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error deleting expense. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

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

    // Validate equity percentage
    if (investorData.equity_percentage < 0 || investorData.equity_percentage > 100) {
      alert('Equity percentage must be between 0 and 100');
      return;
    }

    try {
      // Get current user for created_by field
      const currentUser = getCurrentUser();
      
      const response = await fetch('/api/equity/investors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...investorData,
          created_by: currentUser?.id // Add current user ID from auth
        }),
      });

      if (response.ok) {
        const newInvestor = await response.json();
        setInvestors(prev => [...prev, newInvestor]);
        
        // Reset form safely
        if (form && typeof form.reset === 'function') {
          form.reset();
        }
        setShowAddInvestorModal(false);
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

    // Validate bank account selection for non-cash payments
    const requiresBankAccount = ['bank_transfer', 'card', 'cheque', 'online'].includes(investmentForm.payment_method);
    if (requiresBankAccount && !investmentForm.bank_account_id) {
      alert('Please select a bank account for this payment method');
      return;
    }

    try {
      // Get current user for created_by field
      const currentUser = getCurrentUser();
      
      const response = await fetch('/api/equity/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: investmentForm.investor_id,
          category_id: investmentForm.category,
          amount: parseFloat(investmentForm.amount),
          description: investmentForm.description,
          payment_method: investmentForm.payment_method,
          bank_account_id: investmentForm.bank_account_id || null,
          upi_reference: investmentForm.upi_reference || null,
          reference_number: investmentForm.reference_number || null,
          investment_date: investmentForm.date,
          notes: null,
          created_by: currentUser?.id // Add current user ID from auth
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCreateInvestmentOpen(false);
        
        // Reset form
        setInvestmentForm({
          date: new Date().toISOString().split('T')[0],
          investor_id: '',
          amount: '',
          category: '',
          description: '',
          payment_method: 'cash',
          bank_account_id: '',
          upi_reference: '',
          reference_number: '',
        });
        
        fetchData(); // Refresh data
        alert('Investment recorded successfully!');
        console.log('Investment result:', result);
      } else {
        const error = await response.json();
        alert(`Failed to record investment: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error recording investment:', error);
      alert('Error recording investment. Please try again.');
    }
  };

  const handleCreateWithdrawal = async () => {
    // Prevent double-clicks by checking if already loading
    if (withdrawalLoading) {
      return;
    }

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

    // Validate bank account selection for non-cash payments
    const requiresBankAccount = ['bank_transfer', 'card', 'cheque', 'online'].includes(withdrawalForm.payment_method);
    if (requiresBankAccount && !withdrawalForm.bank_account_id) {
      alert('Please select a bank account for this payment method');
      return;
    }

    setWithdrawalLoading(true);

    try {
      const response = await fetch('/api/equity/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: withdrawalForm.partner_id,
          category_id: withdrawalForm.category_id,
          subcategory_id: withdrawalForm.subcategory_id || null,
          amount: parseFloat(withdrawalForm.amount),
          description: withdrawalForm.description,
          payment_method: withdrawalForm.payment_method,
          bank_account_id: withdrawalForm.bank_account_id || null,
          upi_reference: withdrawalForm.upi_reference || null,
          reference_number: withdrawalForm.reference_number || null,
          withdrawal_date: withdrawalForm.date,
          withdrawal_type: withdrawalForm.withdrawal_type, // Add withdrawal type
          notes: null,
          created_by: getCurrentUser()?.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCreateWithdrawalOpen(false);
        
        // Reset form
        setWithdrawalForm({
          date: new Date().toISOString().split('T')[0],
          partner_id: '',
          amount: '',
          category_id: '',
          subcategory_id: '',
          description: '',
          payment_method: 'cash',
          bank_account_id: '',
          upi_reference: '',
          reference_number: '',
          withdrawal_type: 'capital_withdrawal', // Reset to default
        });
        
        fetchData(); // Refresh data
        alert('Withdrawal recorded successfully!');
        console.log('Withdrawal result:', result);
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

  const handleCreateLiabilityPayment = async () => {
    // Validation
    if (!liabilityForm.date) {
      alert('Please select a payment date');
      return;
    }

    if (!liabilityForm.liability_type) {
      alert('Please select a liability type');
      return;
    }

    const principalAmount = parseFloat(liabilityForm.principal_amount) || 0;
    const interestAmount = parseFloat(liabilityForm.interest_amount) || 0;
    const totalAmount = principalAmount + interestAmount;

    if (totalAmount <= 0) {
      alert('Please enter valid amounts for principal and/or interest');
      return;
    }

    if (!liabilityForm.description.trim()) {
      alert('Please enter a description for the liability payment');
      return;
    }

    // Validate bank account selection for non-cash payments
    const requiresBankAccount = ['bank_transfer', 'card', 'cheque', 'online'].includes(liabilityForm.payment_method);
    if (requiresBankAccount && !liabilityForm.bank_account_id) {
      alert('Please select a bank account for this payment method');
      return;
    }

    setLiabilityLoading(true);

    try {
      // The loan_account is the direct loan ID (UUID), no need to split
      const loan_id = liabilityForm.loan_account || null;
      
      console.log('💳 Creating liability payment:', {
        date: liabilityForm.date,
        liability_type: liabilityForm.liability_type,
        loan_id: loan_id,
        principal_amount: principalAmount,
        interest_amount: interestAmount,
        total_amount: totalAmount,
        description: liabilityForm.description,
        payment_method: liabilityForm.payment_method
      });
      
      const response = await fetch('/api/finance/liability-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: liabilityForm.date,
          liability_type: liabilityForm.liability_type,
          loan_id: loan_id,
          principal_amount: principalAmount,
          interest_amount: interestAmount,
          total_amount: totalAmount,
          description: liabilityForm.description,
          payment_method: liabilityForm.payment_method,
          bank_account_id: liabilityForm.bank_account_id || null,
          upi_reference: liabilityForm.upi_reference || null,
          reference_number: liabilityForm.reference_number || null,
          created_by: getCurrentUser()?.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setCreateLiabilityOpen(false);
        
        // Reset form
        setLiabilityForm({
          date: new Date().toISOString().split('T')[0],
          liability_type: 'bank_loan',
          description: '',
          principal_amount: '',
          interest_amount: '',
          total_amount: '',
          payment_method: 'bank_transfer',
          bank_account_id: '',
          loan_account: '',
          upi_reference: '',
          reference_number: '',
        });
        
        fetchData(); // Refresh data
        alert('✅ Liability payment recorded successfully! Journal entries have been created automatically.');
        console.log('Liability payment result:', result);
      } else {
        const error = await response.json();
        alert(`Failed to record liability payment: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error recording liability payment:', error);
      alert('Error recording liability payment. Please try again.');
    } finally {
      setLiabilityLoading(false);
    }
  };

  const handleCreateLoanSetup = async () => {
    // Validation
    if (!loanSetupForm.loan_name.trim()) {
      alert('Please enter a loan name');
      return;
    }

    if (!loanSetupForm.original_loan_amount || parseFloat(loanSetupForm.original_loan_amount) <= 0) {
      alert('Please enter a valid original loan amount');
      return;
    }

    if (!loanSetupForm.opening_balance || parseFloat(loanSetupForm.opening_balance) <= 0) {
      alert('Please enter a valid opening balance');
      return;
    }

    if (parseFloat(loanSetupForm.opening_balance) > parseFloat(loanSetupForm.original_loan_amount)) {
      alert('Opening balance cannot be greater than original loan amount');
      return;
    }

    try {
      const response = await fetch('/api/finance/loan-opening-balances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...loanSetupForm,
          original_loan_amount: parseFloat(loanSetupForm.original_loan_amount),
          opening_balance: parseFloat(loanSetupForm.opening_balance),
          interest_rate: loanSetupForm.interest_rate ? parseFloat(loanSetupForm.interest_rate) : null,
          loan_tenure_months: loanSetupForm.loan_tenure_months ? parseInt(loanSetupForm.loan_tenure_months) : null,
          emi_amount: loanSetupForm.emi_amount ? parseFloat(loanSetupForm.emi_amount) : null,
          created_by: getCurrentUser()?.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setLoanSetupOpen(false);
        
        // Reset form
        setLoanSetupForm({
          loan_account_code: '2510',
          loan_name: '',
          bank_name: '',
          loan_type: 'business_loan',
          loan_number: '',
          original_loan_amount: '',
          opening_balance: '',
          interest_rate: '',
          loan_tenure_months: '',
          emi_amount: '',
          loan_start_date: '',
          loan_end_date: '',
          description: '',
        });
        
        fetchData(); // Refresh data
        alert('Loan opening balance setup successfully!');
        console.log('Loan setup result:', result);
      } else {
        const error = await response.json();
        alert(`Failed to setup loan: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error setting up loan:', error);
      alert('Error setting up loan. Please try again.');
    }
  };

  // Summary calculations using new API structure
  const totalOrderValue = salesOrders.reduce((sum, order) => sum + (order.final_price || order.total || 0), 0);
  
  // Calculate total invoiced from orders with invoices
  const totalInvoiced = salesOrders
    .filter(order => order.is_invoiced)
    .reduce((sum, order) => {
      return sum + (order.invoices?.reduce((invSum, inv) => invSum + inv.total, 0) || 0);
    }, 0);
  
  // Calculate total paid from actual payments data (consistent with This Month calculation)
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  
  // Calculate pending amounts
  const pendingInvoicing = salesOrders
    .filter(order => !order.is_invoiced)
    .reduce((sum, order) => sum + (order.final_price || order.total || 0), 0);
    
  // Calculate pending payments based on actual data: invoiced - paid (consistent with payment calculations)
  const pendingPayments = Math.max(0, totalInvoiced - totalPaid);

  // Debug stat calculations
  const totalPaidFromOrders = salesOrders.reduce((sum, order) => sum + (order.total_paid || 0), 0);
  const pendingPaymentsFromOrders = salesOrders.reduce((sum, order) => sum + (order.balance_due || 0), 0);
  console.log('STAT CALCULATIONS:', {
    totalOrderValue,
    totalInvoiced,
    totalPaid, // Now from actual payments
    totalPaidFromOrders, // For comparison
    pendingInvoicing,
    pendingPayments, // Now calculated: invoiced - paid
    pendingPaymentsFromOrders, // For comparison
    paymentsCount: payments.length,
    ordersWithPayments: salesOrders.filter(order => (order.total_paid || 0) > 0).length,
    invoicedOrders: salesOrders.filter(order => order.is_invoiced).length,
    notInvoicedOrders: salesOrders.filter(order => !order.is_invoiced).length
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section with Navigation Tabs */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Sales Orders & Invoices
              </h1>
              <p className="text-gray-600 text-sm">Manage orders, invoices, and payments</p>
            </div>
          </div>
        </div>
        
        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-7 h-12 bg-gray-50 rounded-none border-b">
            <TabsTrigger 
              value="orders" 
              className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              <Package className="h-4 w-4 mr-2" />
              Sales Orders ({salesOrders.length})
            </TabsTrigger>
            <TabsTrigger 
              value="invoices"
              className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              <FileText className="h-4 w-4 mr-2" />
              Invoices ({invoices.length})
            </TabsTrigger>
            <TabsTrigger 
              value="payments"
              className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Receipt ({payments.length})
            </TabsTrigger>
            <TabsTrigger 
              value="expenses"
              className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              <Minus className="h-4 w-4 mr-2" />
              Expenses ({expenses.length})
            </TabsTrigger>
            <TabsTrigger 
              value="cashflow"
              className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-green-500"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Cashflow
            </TabsTrigger>
            <TabsTrigger 
              value="payment-manager"
              className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-red-500"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Cashflow Manager
            </TabsTrigger>
            
            <TabsTrigger 
              value="ledgers"
              className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-purple-500"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Ledgers
            </TabsTrigger>
          </TabsList>

          {/* Summary Cards - Contextual based on active tab */}
          <div className="bg-gray-50">
            {activeTab === 'orders' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-4 p-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500 rounded-lg">
                        <Package className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Total Orders Value</p>
                        <p className="text-lg font-bold text-blue-900">{formatCurrency(totalOrderValue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-yellow-500 rounded-lg">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-yellow-600 font-medium">Pending Invoicing</p>
                        <p className="text-lg font-bold text-yellow-900">{formatCurrency(pendingInvoicing)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-500 rounded-lg">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-green-600 font-medium">Already Invoiced</p>
                        <p className="text-lg font-bold text-green-900">{formatCurrency(totalInvoiced)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-500 rounded-lg">
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600 font-medium">Total Collected</p>
                        <p className="text-lg font-bold text-emerald-900">{formatCurrency(totalPaid)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-red-500 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-red-600 font-medium">Outstanding</p>
                        <p className="text-lg font-bold text-red-900">{formatCurrency(pendingPayments)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-500 rounded-lg">
                        <Receipt className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-purple-600 font-medium">Payment Rate</p>
                        <p className="text-lg font-bold text-purple-900">
                          {totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4 p-4">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-green-600 font-medium">Total Invoiced</p>
                        <p className="text-xl font-bold text-green-900">{formatCurrency(totalInvoiced)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Collected</p>
                        <p className="text-xl font-bold text-blue-900">{formatCurrency(totalPaid)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-red-600 font-medium">Outstanding</p>
                        <p className="text-xl font-bold text-red-900">{formatCurrency(pendingPayments)}</p>
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
                        <p className="text-sm text-purple-600 font-medium">Collection Rate</p>
                        <p className="text-xl font-bold text-purple-900">
                          {totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <CreditCard className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Payments</p>
                        <p className="text-xl font-bold text-blue-900">{formatCurrency(totalPaid)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-green-600 font-medium">This Month</p>
                        <p className="text-xl font-bold text-green-900">
                          {formatCurrency(payments
                            .filter(p => {
                              const paymentDate = new Date(p.date);
                              const currentDate = new Date();
                              return paymentDate.getMonth() === currentDate.getMonth() && 
                                     paymentDate.getFullYear() === currentDate.getFullYear();
                            })
                            .reduce((sum, p) => sum + p.amount, 0)
                          )}
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
                        <p className="text-sm text-purple-600 font-medium">Payment Count</p>
                        <p className="text-xl font-bold text-purple-900">{payments.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-yellow-600 font-medium">Avg Payment</p>
                        <p className="text-xl font-bold text-yellow-900">
                          {formatCurrency(payments.length > 0 ? totalPaid / payments.length : 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          {/* Tab Content with improved styling */}
          <div className="bg-white">
            {/* Sales Orders Tab */}
            <TabsContent value="orders" className="space-y-4 p-4">
              
              {/* Nested tab for Sales Orders and Payments */}
              <Tabs defaultValue="invoice-orders">
                
                <TabsContent value="invoice-orders" className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Sales Orders List</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Manage and create invoices for all sales orders
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchData()}
                        className="flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        Refresh List
                      </Button>
                    </div>
                  </div>

                  {/* Search Bar and Filters for Sales Orders */}
                  <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="text"
                          placeholder="Search orders by ID, customer, status, amount..."
                          value={ordersSearchQuery}
                          onChange={(e) => {
                            setOrdersSearchQuery(e.target.value);
                            setCurrentPage(1); // Reset to first page when searching
                          }}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      {ordersSearchQuery && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOrdersSearchQuery('');
                            setCurrentPage(1);
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    
                    {/* Payment Status Filters */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Payment Status:</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant={paymentStatusFilter === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setPaymentStatusFilter('all');
                            setCurrentPage(1);
                          }}
                          className="text-xs"
                        >
                          All
                        </Button>
                        <Button
                          variant={paymentStatusFilter === 'paid' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setPaymentStatusFilter('paid');
                            setCurrentPage(1);
                          }}
                          className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        >
                          Paid
                        </Button>
                        <Button
                          variant={paymentStatusFilter === 'unpaid' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setPaymentStatusFilter('unpaid');
                            setCurrentPage(1);
                          }}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                        >
                          Unpaid
                        </Button>
                        <Button
                          variant={paymentStatusFilter === 'partial' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setPaymentStatusFilter('partial');
                            setCurrentPage(1);
                          }}
                          className="text-xs bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                        >
                          Partially Paid
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-gray-50/75">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold w-[120px]">Order ID</TableHead>
                          <TableHead className="font-semibold w-[200px]">Customer Details</TableHead>
                          <TableHead className="font-semibold w-[120px]">Date</TableHead>
                          <TableHead className="font-semibold w-[150px]">Order Value</TableHead>
                          <TableHead className="font-semibold w-[140px]">Status</TableHead>
                          <TableHead className="font-semibold w-[130px]">Paid Amt</TableHead>
                          <TableHead className="font-semibold w-[120px]">Waived</TableHead>
                          <TableHead className="font-semibold w-[130px]">Balance</TableHead>
                          <TableHead className="font-semibold w-[120px]">Payment</TableHead>
                          <TableHead className="font-semibold text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const filteredOrders = filterSalesOrders(salesOrders, ordersSearchQuery, paymentStatusFilter);
                          const paginatedOrders = getPaginatedData(filteredOrders, currentPage, itemsPerPage);
                          
                          if (paginatedOrders.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={10} className="text-center py-8">
                                  <div className="flex flex-col items-center gap-2">
                                    <Package className="h-8 w-8 text-gray-400" />
                                    <p className="text-gray-500">
                                      {ordersSearchQuery ? 'No sales orders found matching your search.' : 'No sales orders found'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {ordersSearchQuery ? 'Try adjusting your search terms.' : 'Create a sales order to get started'}
                                    </p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          }
                          
                          return paginatedOrders.map((order) => (
                            <TableRow key={order.id} className="hover:bg-gray-50/75 transition-colors border-b">
                            <TableCell className="font-medium">
                              <div className="flex flex-col">
                                <span className="text-blue-600 font-semibold">#{order.id.slice(0, 8)}</span>
                                <span className="text-xs text-gray-500">{order.order_number || `SO-${order.id.slice(0, 8)}`}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium text-gray-900">{order.customer?.name || 'Unknown Customer'}</span>
                                </div>
                                <span className="text-xs text-gray-500 mt-1">
                                  {order.customer?.phone ? 
                                    `📞 ${order.customer.phone}` : 
                                    order.customer?.email ? 
                                      `📧 ${order.customer.email}` : 
                                      '⚠️ No contact info'
                                  }
                                </span>
                                {(order.customer?.formatted_address || order.customer?.address) && (
                                  <span className="text-xs text-gray-600 mt-1 flex items-start gap-1">
                                    <span className="text-gray-400">📍</span>
                                    <span className="line-clamp-2">
                                      {order.customer?.formatted_address || order.customer?.address}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-500" />
                                  <span className="font-medium">{formatDate(order.created_at)}</span>
                                </div>
                                <span className="text-xs text-gray-500 mt-1">{
                                  new Date(order.created_at).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit'
                                  })
                                }</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">{formatCurrency(order.final_price || order.total_price || order.total || 0)}</span>
                                {order.original_price && order.final_price !== order.original_price && (
                                  <span className="text-xs text-gray-500 mt-1">Original: {formatCurrency(order.original_price)}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {/* Calculate invoice status based on actual payment amounts and waived amounts */}
                                {(() => {
                                  const totalPaid = order.total_paid || 0;
                                  const orderTotal = order.final_price || order.total || 0;
                                  const waivedAmount = order.waived_amount || 0;
                                  const balanceDue = order.balance_due || 0;
                                  const effectivePaid = totalPaid + waivedAmount; // Consider waived as paid
                                  
                                  if (!order.is_invoiced) {
                                    return <Badge className="bg-gray-100 text-gray-800">Not Invoiced</Badge>;
                                  } else if (balanceDue <= 0 || effectivePaid >= orderTotal && orderTotal > 0) {
                                    return <Badge className="bg-green-100 text-green-800">Fully Paid</Badge>;
                                  } else if (totalPaid > 0 || waivedAmount > 0) {
                                    return <Badge className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>;
                                  } else {
                                    return <Badge className="bg-red-100 text-red-800">Invoiced - Unpaid</Badge>;
                                  }
                                })()}
                                <span className="text-xs text-gray-500">
                                  {order.invoice_count || 0} invoice(s)
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-green-600">{formatCurrency(order.total_paid || 0)}</span>
                                <span className="text-xs text-gray-500 mt-1">
                                  {order.is_invoiced ? `${order.invoice_count} invoice(s)` : '0 invoices'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-purple-600">
                                  {formatCurrency(order.waived_amount || 0)}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                  {(order.waived_amount || 0) > 0 ? 'Waived off' : 'No waiver'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-orange-600">
                                  {formatCurrency(order.balance_due || 0)}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                  {(order.balance_due || 0) > 0 ? 'Outstanding' : 'Settled'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getPaymentStatusBadge(order.payment_status || 'pending', order.total_paid || 0, order.final_price || order.total || 0, order.waived_amount || 0)}
                                <span className="text-xs text-gray-500">
                                  {formatCurrency(order.total_paid || 0)} received
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                {/* Print Bill Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200 text-xs px-2 py-1"
                                  onClick={() => handlePrintBill(order)}
                                  title="Print Bill"
                                >
                                  <Printer className="h-3 w-3" />
                                </Button>

                                {/* WhatsApp Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-1"
                                  onClick={() => handleSendWhatsApp(order)}
                                  title="Send via WhatsApp"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </Button>

                                {/* Waive Off Button - Only show if there's an outstanding balance */}
                                {(order.balance_due || 0) > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200 text-xs px-2 py-1"
                                    onClick={() => handleWaiveOffOrder(order)}
                                    title="Waive Off Amount"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                )}
                                
                                {/* Payment Tracker - Always show */}
                                <SalesOrderPaymentTracker
                                  orderId={order.id}
                                  orderTotal={order.final_price || order.total || 0}
                                  onPaymentAdded={() => {
                                    fetchData();
                                    console.log('Payment added successfully - Invoice auto-created/updated');
                                  }}
                                />
                              </div>
                            </TableCell>
                      </TableRow>
                      )); // Close the map function and IIFE
                    })()}
                  </TableBody>
                </Table>
                </div>
                
                {/* Pagination */}
                <PaginationComponent />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Invoices Tab */}
            <TabsContent value="invoices" className="space-y-4 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-gray-900">Invoices</h3>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setCreateInvoiceOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Invoice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData()}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Search Bar and Filters */}
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search invoices by ID, customer, status, amount..."
                      value={invoicesSearchQuery}
                      onChange={(e) => {
                        setInvoicesSearchQuery(e.target.value);
                        setCurrentPage(1); // Reset to first page when searching
                      }}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {invoicesSearchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInvoicesSearchQuery('');
                        setCurrentPage(1);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Payment Status Filters */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Filter by status:</span>
                  <div className="flex gap-2">
                    <Button
                      variant={invoiceStatusFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setInvoiceStatusFilter('all');
                        setCurrentPage(1);
                      }}
                    >
                      All
                    </Button>
                    <Button
                      variant={invoiceStatusFilter === 'paid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setInvoiceStatusFilter('paid');
                        setCurrentPage(1);
                      }}
                      className={invoiceStatusFilter === 'paid' ? 'bg-green-600 hover:bg-green-700' : 'border-green-600 text-green-600 hover:bg-green-50'}
                    >
                      Paid
                    </Button>
                    <Button
                      variant={invoiceStatusFilter === 'unpaid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setInvoiceStatusFilter('unpaid');
                        setCurrentPage(1);
                      }}
                      className={invoiceStatusFilter === 'unpaid' ? 'bg-red-600 hover:bg-red-700' : 'border-red-600 text-red-600 hover:bg-red-50'}
                    >
                      Unpaid
                    </Button>
                    <Button
                      variant={invoiceStatusFilter === 'partial' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setInvoiceStatusFilter('partial');
                        setCurrentPage(1);
                      }}
                      className={invoiceStatusFilter === 'partial' ? 'bg-yellow-600 hover:bg-yellow-700' : 'border-yellow-600 text-yellow-600 hover:bg-yellow-50'}
                    >
                      Partially Paid
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold">Invoice ID</TableHead>
                      <TableHead className="font-semibold">Sales Order</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Paid</TableHead>
                      <TableHead className="font-semibold">Waived</TableHead>
                      <TableHead className="font-semibold">Balance</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filteredInvoices = filterInvoices(invoices, invoicesSearchQuery, invoiceStatusFilter);
                      const paginatedInvoices = getPaginatedData(filteredInvoices, currentPage, itemsPerPage);
                      
                      if (paginatedInvoices.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                              {invoicesSearchQuery ? 'No invoices found matching your search.' : 'No invoices available.'}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      return paginatedInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-blue-600">{invoice.id.slice(0, 8)}</TableCell>
                        <TableCell>{invoice.sales_order_id?.slice(0, 8) || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{invoice.customer_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            {formatDate(invoice.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {formatCurrency(invoice.paid_amount)}
                        </TableCell>
                        <TableCell className="text-orange-600 font-medium">
                          {formatCurrency(invoice.waived_amount || 0)}
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {formatCurrency(invoice.balance_due || 0)}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const totalPaid = invoice.paid_amount || 0;
                            const invoiceTotal = invoice.total || 0;
                            const waivedAmount = invoice.waived_amount || 0;
                            const effectivePaid = totalPaid + waivedAmount;
                            
                            if (effectivePaid >= invoiceTotal && invoiceTotal > 0) {
                              return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
                            } else if (totalPaid > 0 || waivedAmount > 0) {
                              return <Badge className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>;
                            } else {
                              return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>;
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-center">
                            {invoice.status !== 'paid' && (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setPaymentTrackingOpen(true);
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Payment
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // TODO: Implement invoice view/download 
                                console.log('View invoice:', invoice.id);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            
                            {/* Waive Off Button - Only show if there's a balance due */}
                            {(invoice.balance_due || 0) > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                                onClick={() => handleWaiveOffInvoice(invoice)}
                                title="Waive Off Amount"
                              >
                                <Minus className="h-4 w-4 mr-1" />
                                Waive
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      )); // Close the map function and IIFE
                    })()}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <PaginationComponent />
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-4 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData()}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Search Bar for Payments */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search payments by ID, customer, method, reference..."
                    value={paymentsSearchQuery}
                    onChange={(e) => {
                      setPaymentsSearchQuery(e.target.value);
                      setCurrentPage(1); // Reset to first page when searching
                    }}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {paymentsSearchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPaymentsSearchQuery('');
                      setCurrentPage(1);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold">Payment ID</TableHead>
                      <TableHead className="font-semibold">Invoice</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Method</TableHead>
                      <TableHead className="font-semibold">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filteredPayments = filterPayments(payments, paymentsSearchQuery);
                      const paginatedPayments = getPaginatedData(filteredPayments, currentPage, itemsPerPage);
                      
                      if (paginatedPayments.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              {paymentsSearchQuery ? 'No payments found matching your search.' : 'No payments available.'}
                            </TableCell>
                          </TableRow>
                        );
                      }
                      
                      return paginatedPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium text-blue-600">{payment.id.slice(0, 8)}</TableCell>
                        <TableCell>{payment.invoice_id?.slice(0, 8) || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{payment.customer_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            {formatDate(payment.date)}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">{payment.method}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{payment.reference || 'N/A'}</TableCell>
                      </TableRow>
                      )); // Close the map function and IIFE
                    })()}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <PaginationComponent />
            </TabsContent>

            {/* Payment Manager Tab */}
            <TabsContent value="payment-manager" className="space-y-4 p-4">
              <PaymentDeletionManager />
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-4 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Expense Management</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Track and manage business expenses
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData()}
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                    onClick={() => setCreateExpenseOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setCreateInvestmentOpen(true)}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Investment
                  </Button>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => setCreateWithdrawalOpen(true)}
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Withdrawal
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => setCreateLiabilityOpen(true)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Liabilities
                  </Button>
                  <Button
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => setLoanSetupOpen(true)}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Loan Setup
                  </Button>
                </div>
              </div>

              {/* Expenses Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-yellow-600 font-medium">Avg Expense</p>
                        <p className="text-xl font-bold text-yellow-900">
                          {formatCurrency(expenses.length > 0 ? expenses.reduce((sum, exp) => sum + exp.amount, 0) / expenses.length : 0)}
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
                    placeholder="Search expenses by description, category, type, amount..."
                    value={expensesSearchQuery}
                    onChange={(e) => {
                      setExpensesSearchQuery(e.target.value);
                      setCurrentPage(1); // Reset to first page when searching
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
                      <TableHead className="font-semibold">Type</TableHead>
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
                            <TableCell colSpan={7} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <Minus className="h-8 w-8 text-gray-400" />
                                <p className="text-gray-500">
                                  {expensesSearchQuery ? 'No expenses found matching your search.' : 'No expenses found'}
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
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-medium">{expense.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={expense.type === 'Direct' ? 'default' : 'secondary'}
                              className="font-medium"
                            >
                              {expense.type}
                            </Badge>
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
                                className="text-xs px-2 py-1"
                                title="View Details"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete Expense"
                                onClick={() => handleDeleteExpense(expense)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )); // Close the map function and IIFE
                    })()}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <PaginationComponent />
            </TabsContent>

            {/* Cashflow Tab */}
            <TabsContent value="cashflow" className="space-y-4 p-4">
              {/* Cashflow Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {(() => {
                  const filteredTransactions = filterCashflowTransactions(cashflowTransactions, cashflowSearchQuery, cashflowTypeFilter, cashflowCategoryFilter);
                  const totalInflow = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
                  const totalOutflow = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
                  const netCashflow = totalInflow - totalOutflow;
                  
                  return (
                    <>
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total Inflow</p>
                              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalInflow)}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total Outflow</p>
                              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutflow)}</p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-red-600" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Net Cashflow</p>
                              <p className={`text-2xl font-bold ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(netCashflow)}
                              </p>
                            </div>
                            <DollarSign className={`h-8 w-8 ${netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Transactions</p>
                              <p className="text-2xl font-bold text-blue-600">{filteredTransactions.length}</p>
                            </div>
                            <Receipt className="h-8 w-8 text-blue-600" />
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search cashflow transactions..."
                      value={cashflowSearchQuery}
                      onChange={(e) => setCashflowSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Sorted: {cashflowSortOrder === 'desc' ? 'Newest to oldest by date' : 'Oldest to newest by date'}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {/* Date Sort Toggle */}
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setCashflowSortOrder(cashflowSortOrder === 'desc' ? 'asc' : 'desc')}
                    className="whitespace-nowrap"
                    title={`Sort ${cashflowSortOrder === 'desc' ? 'oldest first' : 'newest first'}`}
                  >
                    {cashflowSortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
                  </Button>
                  {/* Pagination Toggle */}
                  <Button 
                    variant={showPagination ? "default" : "outline"}
                    onClick={() => {
                      setShowPagination(!showPagination);
                      setCurrentPage(1); // Reset to first page when toggling
                    }}
                    className="whitespace-nowrap"
                    title={showPagination ? "Switch to full list view" : "Switch to paginated view"}
                  >
                    {showPagination ? "Show All" : "Paginate"}
                  </Button>
                  
                  {/* Show All Button */}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      console.log('🔄 Show All clicked - rebuilding with no date filter...');
                      setCashflowDateRange({
                        from: '2020-01-01', // Far past date
                        to: '2030-12-31'    // Far future date
                      });
                    }}
                    className="whitespace-nowrap"
                  >
                    All Dates
                  </Button>
                  
                  {/* Date Range Filters */}
                  <Input
                    type="date"
                    value={cashflowDateRange.from}
                    onChange={(e) => setCashflowDateRange({...cashflowDateRange, from: e.target.value})}
                    className="w-40"
                  />
                  <Input
                    type="date"
                    value={cashflowDateRange.to}
                    onChange={(e) => setCashflowDateRange({...cashflowDateRange, to: e.target.value})}
                    className="w-40"
                  />
                  
                  {/* Type Filter */}
                  <Select value={cashflowTypeFilter} onValueChange={(value: 'all' | 'income' | 'expense') => setCashflowTypeFilter(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Category Filter */}
                  <Select value={cashflowCategoryFilter} onValueChange={(value: 'all' | 'payment' | 'investment' | 'withdrawal' | 'expense' | 'vendor_payment' | 'liability_payment') => setCashflowCategoryFilter(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="payment">Payments</SelectItem>
                      <SelectItem value="investment">Investments</SelectItem>
                      <SelectItem value="withdrawal">Withdrawals</SelectItem>
                      <SelectItem value="expense">Expenses</SelectItem>
                      <SelectItem value="vendor_payment">Vendor Payments</SelectItem>
                      <SelectItem value="liability_payment">Liability Payments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cashflow Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="flex items-center gap-1">
                        Date 
                        <span className="text-xs text-gray-500">
                          {cashflowSortOrder === 'desc' ? '↓' : '↑'}
                        </span>
                      </TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const filteredTransactions = filterCashflowTransactions(cashflowTransactions, cashflowSearchQuery, cashflowTypeFilter, cashflowCategoryFilter);
                      const displayTransactions = showPagination 
                        ? getPaginatedData(filteredTransactions, currentPage, itemsPerPage)
                        : filteredTransactions;
                      
                      if (displayTransactions.length === 0) {
                        return (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                              No cashflow transactions found for the selected criteria.
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return displayTransactions.map((transaction) => (
                        <TableRow key={transaction.id} className="hover:bg-gray-50">
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={transaction.description}>
                              {transaction.description}
                            </div>
                            {transaction.customer_name && (
                              <div className="text-xs text-gray-500">{transaction.customer_name}</div>
                            )}
                            {transaction.partner_name && (
                              <div className="text-xs text-gray-500">{transaction.partner_name}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                              {transaction.type === 'income' ? (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  Income
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <TrendingDown className="h-3 w-3" />
                                  Expense
                                </span>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {transaction.category.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {transaction.subcategory && (
                              <div className="text-xs text-gray-500 mt-1">{transaction.subcategory}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {transaction.payment_method.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {transaction.reference || '-'}
                          </TableCell>
                        </TableRow>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
              
              {/* Conditional Pagination */}
              {showPagination && <PaginationComponent />}
              
              {/* Full List Info */}
              {!showPagination && (
                <div className="flex justify-center py-4">
                  <div className="text-sm text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                    Showing all {(() => {
                      const filteredTransactions = filterCashflowTransactions(cashflowTransactions, cashflowSearchQuery, cashflowTypeFilter, cashflowCategoryFilter);
                      return filteredTransactions.length;
                    })()} transactions
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Ledgers Tab */}
            <TabsContent value="ledgers" className="space-y-4 p-4">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    Ledger Management
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    View and manage all account ledger entries and balances
                  </p>
                </div>
                <div className="p-6">
                  <OptimizedLedgerManager />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Dialogs */}
      <PaymentTrackingDialog
        open={paymentTrackingOpen}
        onOpenChange={setPaymentTrackingOpen}
        invoice={selectedInvoice}
        onSuccess={fetchData}
      />

      {/* Create Expense Dialog */}
      <Dialog open={createExpenseOpen} onOpenChange={isCreatingExpense ? undefined : setCreateExpenseOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-auto relative">
          {/* Loading Overlay */}
          {isCreatingExpense && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-red-600 border-t-transparent"></div>
                <p className="text-sm font-medium text-gray-700">Recording Expense...</p>
                <p className="text-xs text-gray-500">Please wait while we process your expense</p>
              </div>
            </div>
          )}
          
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-600" />
              Create New Expense
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Add a new expense entry with automatic accounting integration
            </p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-4">
            {/* Left Column - Basic Information */}
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium">
                      Expense Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      disabled={isCreatingExpense}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-sm font-medium">
                      Amount (₹) *
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      disabled={isCreatingExpense}
                      className="w-full text-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium">
                      Expense Category *
                    </Label>
                    <Select value={expenseForm.category} onValueChange={handleCategoryChange} disabled={isCreatingExpense}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select expense category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {/* Owner's Drawings categories first */}
                        <div className="border-b pb-2 mb-2">
                          <div className="px-2 py-1 text-xs font-semibold text-purple-600 bg-purple-50">
                            OWNER&apos;S DRAWINGS
                          </div>
                          {Object.entries(subcategoryMap)
                            .filter(([category, details]) => category && details.category === "Owner's Drawings")
                            .map(([category, details]) => (
                              <SelectItem key={category} value={category}>
                                <div className="flex flex-col">
                                  <span className="text-purple-700 font-medium">{category}</span>
                                  <span className="text-xs text-purple-500">Equity Account: {details.accountCode}</span>
                                </div>
                              </SelectItem>
                            ))}
                        </div>
                        
                        {/* Business expense categories */}
                        <div className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-50 mb-2">
                          BUSINESS EXPENSES
                        </div>
                        {Object.entries(subcategoryMap)
                          .filter(([category, details]) => category && details.category !== "Owner's Drawings")
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
                      <div className={`text-xs p-2 rounded ${
                        subcategoryMap[expenseForm.category as keyof typeof subcategoryMap].category === "Owner's Drawings" 
                          ? "text-purple-700 bg-purple-50 border border-purple-200" 
                          : "text-gray-600 bg-blue-50"
                      }`}>
                        <span className="font-medium">Category Info:</span> {subcategoryMap[expenseForm.category as keyof typeof subcategoryMap].category} 
                        {subcategoryMap[expenseForm.category as keyof typeof subcategoryMap].category === "Owner's Drawings" ? " (Personal/Equity)" : " expense"} | 
                        Account: {subcategoryMap[expenseForm.category as keyof typeof subcategoryMap].accountCode} | 
                        Type: {subcategoryMap[expenseForm.category as keyof typeof subcategoryMap].type}
                        {subcategoryMap[expenseForm.category as keyof typeof subcategoryMap].category === "Owner's Drawings" && (
                          <div className="mt-1 text-xs text-purple-600">
                            💡 This will be recorded as Owner&apos;s Drawing (reduces equity, not business expense)
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Entity Selection - Show when category requires it */}
                  {expenseForm.entity_type && (
                    <div className="space-y-2">
                      <Label htmlFor="entity" className="text-sm font-medium">
                        Select {expenseForm.entity_type === 'truck' ? 'Truck' : 
                               expenseForm.entity_type === 'employee' ? 'Employee' : 'Supplier'} *
                      </Label>
                      <Select value={expenseForm.entity_id} onValueChange={handleEntityChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={`Select ${expenseForm.entity_type === 'truck' ? 'truck' : 
                                                            expenseForm.entity_type === 'employee' ? 'employee' : 'supplier'}`} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {getEntityOptions().map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {expenseForm.entity_id && getSelectedEntityDetails() && (
                        <div className="text-xs text-gray-600 bg-green-50 p-2 rounded">
                          <div className="font-medium">{getSelectedEntityDetails()?.name}</div>
                          <div className="text-gray-500">{getSelectedEntityDetails()?.details}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Vendor Bill Selection - Show for supplier expenses */}
                  {expenseForm.entity_type === 'supplier' && expenseForm.entity_id && vendorBills.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="vendor_bill" className="text-sm font-medium">
                        Related Vendor Bill (Optional)
                      </Label>
                      <Select value={expenseForm.vendor_bill_id || 'none'} onValueChange={(value) => setExpenseForm({ ...expenseForm, vendor_bill_id: value === 'none' ? '' : value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select vendor bill (optional)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="none">No specific bill</SelectItem>
                          {vendorBills.map(bill => (
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

                  {/* Payroll Record Selection - Show for employee salary expenses */}
                  {expenseForm.entity_type === 'employee' && expenseForm.entity_id && expenseForm.category.includes('Salary') && payrollRecords.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="payroll_record" className="text-sm font-medium">
                        Related Payroll Record (Optional)
                      </Label>
                      <Select value={expenseForm.payroll_record_id || 'none'} onValueChange={(value) => setExpenseForm({ ...expenseForm, payroll_record_id: value === 'none' ? '' : value })}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select payroll record (optional)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          <SelectItem value="none">No specific payroll</SelectItem>
                          {payrollRecords.map(record => (
                            <SelectItem key={record.id} value={record.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">Pay Period: {new Date(record.pay_period_start).toLocaleDateString('en-IN')} - {new Date(record.pay_period_end).toLocaleDateString('en-IN')}</span>
                                <span className="text-xs text-gray-500">
                                  Gross: ₹{record.gross_salary.toLocaleString('en-IN')} | Net: ₹{record.net_salary.toLocaleString('en-IN')} | Status: {record.status}
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
                    <Label htmlFor="payment_method" className="text-sm font-medium">
                      Payment Method *
                    </Label>
                    <Select value={expenseForm.payment_method} onValueChange={(value) => setExpenseForm({ ...expenseForm, payment_method: value })} disabled={isCreatingExpense}>
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
                      <Label htmlFor="bank_account" className="text-sm font-medium">
                        Bank Account *
                      </Label>
                      <div className="flex gap-2">
                        <Select value={expenseForm.bank_account_id} onValueChange={(value) => setExpenseForm({ ...expenseForm, bank_account_id: value })} disabled={isCreatingExpense}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select bank account" />
                          </SelectTrigger>
                          <SelectContent>
                            {bankAccounts && bankAccounts.length > 0 ? (
                              bankAccounts.map((account) => (
                                <SelectItem key={account.id} value={account.id}>
                                  <div className="flex flex-col">
                                    <span>{account.account_name}</span>
                                    <span className="text-xs text-gray-500">
                                      {account.account_number ? `${account.account_number}` : ''} 
                                      {account.account_type ? ` (${account.account_type})` : ''}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="none" disabled>
                                No bank accounts available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fetchData()}
                          title="Refresh bank accounts"
                          className="px-3"
                        >
                          🔄
                        </Button>
                      </div>
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
                  <Label htmlFor="description" className="text-sm font-medium">
                    Expense Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Enter detailed expense description, vendor name, purpose, etc..."
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    disabled={isCreatingExpense}
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
            <h4 className="font-medium text-blue-900 mb-2">Accounting Impact Preview</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Debit:</strong> {expenseForm.category} (Account: {subcategoryMap[expenseForm.category as keyof typeof subcategoryMap]?.accountCode || 'TBD'}) - ₹{expenseForm.amount || '0.00'}</p>
              <p>• <strong>Credit:</strong> {expenseForm.payment_method === 'cash' ? 'Cash Account (1010)' : 'Bank Account (1020)'} - ₹{expenseForm.amount || '0.00'}</p>
              <p className="text-xs mt-2 text-blue-600">Journal entry will be automatically created upon expense submission</p>
            </div>
          </div>
          <DialogFooter className="pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateExpenseOpen(false)}
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
                    Recording...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Create Expense
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Create New Invoice
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Create a standalone invoice for tracking old sales orders and receivables
            </p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Customer Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="customer_name" className="text-sm font-medium">
                    Customer Name *
                  </Label>
                  <Input
                    id="customer_name"
                    placeholder="Start typing customer name..."
                    value={invoiceForm.customer_name}
                    onChange={(e) => {
                      setInvoiceForm({ ...invoiceForm, customer_name: e.target.value });
                      // Always show dropdown when typing, even if it was hidden
                      if (!showCustomerDropdown) {
                        setShowCustomerDropdown(true);
                      }
                    }}
                    onFocus={() => {
                      setShowCustomerDropdown(true);
                      // Refresh customers when focusing
                      if (customers.length === 0) {
                        fetchCustomers();
                      }
                    }}
                    onBlur={() => {
                      // Hide dropdown after a longer delay to allow for selection
                      setTimeout(() => setShowCustomerDropdown(false), 300);
                    }}
                    className="w-full"
                  />
                  {/* Enhanced dropdown with customer suggestions */}
                  {showCustomerDropdown && (
                  <div 
                    className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md shadow-xl max-h-60 min-h-[60px] overflow-y-auto z-[9999] mt-1"
                    onMouseDown={(e) => e.preventDefault()} // Prevent input blur when clicking dropdown
                  >
                    {(() => {
                      const searchTerm = invoiceForm.customer_name.toLowerCase().trim();
                      console.log('🔍 Search term:', searchTerm, 'Available customers:', customers.length);
                      
                      const filteredCustomers = customers.filter(customer => {
                        if (!searchTerm) return true; // Show all customers if no search term
                        const nameMatch = customer.name.toLowerCase().includes(searchTerm);
                        const phoneMatch = customer.phone && customer.phone.includes(searchTerm);
                        const emailMatch = customer.email && customer.email.toLowerCase().includes(searchTerm);
                        return nameMatch || phoneMatch || emailMatch;
                      });

                      console.log('🎯 Filtered customers:', filteredCustomers.length);

                      if (filteredCustomers.length === 0) {
                        return (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            {customers.length === 0 
                              ? "Loading customers..." 
                              : searchTerm 
                                ? `No customers match "${invoiceForm.customer_name}". You can create a new customer.`
                                : "Start typing to search customers..."
                            }
                          </div>
                        );
                      }

                      return filteredCustomers.slice(0, 10).map((customer, index) => (
                        <div
                          key={index}
                          className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleCustomerSelect(customer)}
                        >
                          <div className="font-medium text-sm text-gray-900">{customer.name}</div>
                          {(customer.phone || customer.email) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {customer.phone && <span>📞 {customer.phone}</span>}
                              {customer.phone && customer.email && <span> • </span>}
                              {customer.email && <span>✉️ {customer.email}</span>}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Start typing to see existing customers or enter a new customer name
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="customer_phone" className="text-sm font-medium">
                    Phone Number
                  </Label>
                  <Input
                    id="customer_phone"
                    placeholder="Enter phone number"
                    value={invoiceForm.customer_phone}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_phone: e.target.value })}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="customer_email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <Input
                    id="customer_email"
                    type="email"
                    placeholder="Enter email address"
                    value={invoiceForm.customer_email}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customer_email: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Invoice Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoice_date" className="text-sm font-medium">
                    Invoice Date *
                  </Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    value={invoiceForm.date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoice_amount" className="text-sm font-medium">
                    Amount (₹) *
                  </Label>
                  <Input
                    id="invoice_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    className="w-full text-lg"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="invoice_description" className="text-sm font-medium">
                    Description *
                  </Label>
                  <Input
                    id="invoice_description"
                    placeholder="Enter invoice description"
                    value={invoiceForm.description}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="invoice_notes" className="text-sm font-medium">
                    Notes
                  </Label>
                  <Textarea
                    id="invoice_notes"
                    placeholder="Additional notes (optional)"
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                    className="w-full min-h-20"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                variant="outline"
                type="button"
                onClick={() => setCreateInvoiceOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                type="button" 
                onClick={handleCreateInvoice}
                disabled={!invoiceForm.customer_name || !invoiceForm.amount || !invoiceForm.description || isCreatingInvoice}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 w-full sm:w-auto order-1 sm:order-2"
              >
                {isCreatingInvoice ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Create Invoice
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Investment Dialog */}
      <Dialog open={createInvestmentOpen} onOpenChange={setCreateInvestmentOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-green-700 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Record Partner Investment
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Partner Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="partner" className="text-sm font-medium">
                  Partner/Investor *
                </Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddInvestorModal(true)}
                  className="text-xs h-7 px-2"
                >
                  + Add New
                </Button>
              </div>
              <Select 
                value={investmentForm.investor_id} 
                onValueChange={(value) => {
                  if (value === "add_new") {
                    setShowAddInvestorModal(true);
                  } else {
                    setInvestmentForm(prev => ({ ...prev, investor_id: value }));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select partner/investor" />
                </SelectTrigger>
                <SelectContent>
                  {investors.map((investor) => (
                    <SelectItem key={investor.id} value={investor.id}>
                      {investor.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="add_new" className="text-blue-600 font-medium">
                    + Add New Investor
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Investment Category */}
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

            {/* Amount */}
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
                className="w-full"
              />
            </div>

            {/* Payment Method */}
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

            {/* Bank Account Selection (show when payment method requires it) */}
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

            {/* UPI Reference (show when payment method is UPI) */}
            {investmentForm.payment_method === 'upi' && (
              <div className="space-y-2">
                <Label htmlFor="upi_reference" className="text-sm font-medium">
                  UPI Reference/Transaction ID
                </Label>
                <Input
                  id="upi_reference"
                  type="text"
                  placeholder="Enter UPI transaction ID"
                  value={investmentForm.upi_reference}
                  onChange={(e) => setInvestmentForm(prev => ({ ...prev, upi_reference: e.target.value }))}
                  className="w-full"
                />
              </div>
            )}

            {/* Reference Number */}
            <div className="space-y-2">
              <Label htmlFor="reference" className="text-sm font-medium">
                Reference Number
              </Label>
              <Input
                id="reference"
                type="text"
                placeholder="Transaction ID, Cheque Number, etc."
                value={investmentForm.reference_number}
                onChange={(e) => setInvestmentForm(prev => ({ ...prev, reference_number: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the investment purpose..."
                value={investmentForm.description}
                onChange={(e) => setInvestmentForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full resize-none"
                rows={3}
              />
            </div>

            {/* Investment Date */}
            <div className="space-y-2">
              <Label htmlFor="investment_date" className="text-sm font-medium">
                Investment Date *
              </Label>
              <Input
                id="investment_date"
                type="date"
                value={investmentForm.date}
                onChange={(e) => setInvestmentForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Info Box */}
            <div className="text-xs p-3 rounded bg-green-50 border border-green-200 text-green-700">
              <span className="font-medium">💡 Investment Info:</span> This will increase the partner&apos;s equity stake and be recorded in Capital Account (3100). It represents money invested into the business.
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-2 sm:order-1">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCreateInvestmentOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleCreateInvestment}
                disabled={false}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Record Investment
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={createWithdrawalOpen} onOpenChange={setCreateWithdrawalOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-purple-700 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Record Partner Withdrawal
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Partner Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="partner" className="text-sm font-medium">
                  Partner/Owner *
                </Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddInvestorModal(true)}
                  className="text-xs h-7 px-2"
                >
                  + Add New
                </Button>
              </div>
              <Select 
                value={withdrawalForm.partner_id} 
                onValueChange={(value) => {
                  if (value === "add_new") {
                    setShowAddInvestorModal(true);
                  } else {
                    setWithdrawalForm(prev => ({ ...prev, partner_id: value }));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select partner/owner" />
                </SelectTrigger>
                <SelectContent>
                  {investors.map((investor) => (
                    <SelectItem key={investor.id} value={investor.id}>
                      {investor.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="add_new" className="text-blue-600 font-medium">
                    + Add New Partner
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Withdrawal Category */}
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
              {/* Show info message when category is selected but has no subcategories */}
              {withdrawalForm.category_id && 
               withdrawalSubcategories.filter(subcat => subcat.category_id === withdrawalForm.category_id).length === 0 && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                  ℹ️ This category doesn&apos;t have subcategories - you can proceed directly.
                </div>
              )}
            </div>

            {/* Withdrawal Subcategory - Only show if category has subcategories */}
            {(() => {
              const availableSubcategories = withdrawalSubcategories.filter(subcat => subcat.category_id === withdrawalForm.category_id);
              if (!withdrawalForm.category_id || availableSubcategories.length === 0) {
                return null; // Don't show subcategory field if no category selected or no subcategories available
              }
              
              return (
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
                      {availableSubcategories.map((subcategory) => (
                        <SelectItem key={subcategory.id} value={subcategory.id}>
                          {subcategory.subcategory_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}

            {/* Amount */}
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
                className="w-full"
                value={withdrawalForm.amount}
                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            {/* Withdrawal Type */}
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
                    <div className="flex flex-col">
                      <span className="font-medium">💰 Capital Withdrawal</span>
                      <span className="text-xs text-gray-500">Reduces partner&apos;s investment amount</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="interest_payment">
                    <div className="flex flex-col">
                      <span className="font-medium">📈 Interest Payment</span>
                      <span className="text-xs text-gray-500">Interest on investment - no investment reduction</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="profit_distribution">
                    <div className="flex flex-col">
                      <span className="font-medium">🎯 Profit Distribution</span>
                      <span className="text-xs text-gray-500">Business profit share - no investment reduction</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {/* Info about selected withdrawal type */}
              {withdrawalForm.withdrawal_type && (
                <div className={`text-xs p-2 rounded border ${
                  withdrawalForm.withdrawal_type === 'capital_withdrawal' 
                    ? 'bg-orange-50 border-orange-200 text-orange-700'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  {withdrawalForm.withdrawal_type === 'capital_withdrawal' 
                    ? '⚠️ This will reduce the partner&apos;s investment balance'
                    : '✅ This will NOT affect the partner&apos;s investment balance'
                  }
                </div>
              )}
            </div>

            {/* Payment Method */}
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

            {/* Bank Account Selection - Show different accounts based on payment method */}
            {withdrawalForm.payment_method && withdrawalForm.payment_method !== 'cash' && (
              <div className="space-y-2">
                <Label htmlFor="bank_account" className="text-sm font-medium">
                  {withdrawalForm.payment_method === 'bank_transfer' && 'Bank Account *'}
                  {withdrawalForm.payment_method === 'upi' && 'UPI Account *'}
                  {withdrawalForm.payment_method === 'online' && 'Online Payment Account *'}
                  {withdrawalForm.payment_method === 'cheque' && 'Bank Account (for Cheque) *'}
                </Label>
                <Select 
                  value={withdrawalForm.bank_account_id} 
                  onValueChange={(value) => setWithdrawalForm(prev => ({ ...prev, bank_account_id: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue 
                      placeholder={
                        withdrawalForm.payment_method === 'bank_transfer' ? 'Select bank account' :
                        withdrawalForm.payment_method === 'upi' ? 'Select UPI account' :
                        withdrawalForm.payment_method === 'online' ? 'Select online payment account' :
                        withdrawalForm.payment_method === 'cheque' ? 'Select bank account for cheque' :
                        'Select account'
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      // Filter bank accounts based on payment method
                      const filteredAccounts = bankAccounts.filter(account => {
                        if (withdrawalForm.payment_method === 'bank_transfer') {
                          return account.account_type === 'BANK';
                        } else if (withdrawalForm.payment_method === 'upi') {
                          return account.account_type === 'UPI';
                        } else if (withdrawalForm.payment_method === 'online') {
                          return account.account_type === 'UPI' || account.account_type === 'BANK';
                        } else if (withdrawalForm.payment_method === 'cheque') {
                          return account.account_type === 'BANK';
                        }
                        return true;
                      });

                      if (filteredAccounts.length === 0) {
                        return (
                          <SelectItem value="" disabled>
                            No {withdrawalForm.payment_method === 'upi' ? 'UPI' : 'bank'} accounts found
                          </SelectItem>
                        );
                      }

                      return filteredAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            {account.account_type === 'UPI' && <span>📱</span>}
                            {account.account_type === 'BANK' && <span>🏦</span>}
                            <div className="flex flex-col">
                              <span className="font-medium">{account.account_name}</span>
                              <span className="text-xs text-gray-500">
                                {account.account_type === 'UPI' 
                                  ? 'UPI Account' 
                                  : (account.account_number ? `****${account.account_number.slice(-4)}` : 'No A/C')
                                }
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
                {bankAccounts.filter(account => {
                  if (withdrawalForm.payment_method === 'bank_transfer') {
                    return account.account_type === 'BANK';
                  } else if (withdrawalForm.payment_method === 'upi') {
                    return account.account_type === 'UPI';
                  } else if (withdrawalForm.payment_method === 'online') {
                    return account.account_type === 'UPI' || account.account_type === 'BANK';
                  } else if (withdrawalForm.payment_method === 'cheque') {
                    return account.account_type === 'BANK';
                  }
                  return true;
                }).length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    No {withdrawalForm.payment_method === 'upi' ? 'UPI' : 'bank'} accounts found. 
                    Please add a {withdrawalForm.payment_method === 'upi' ? 'UPI' : 'bank'} account first.
                  </p>
                )}
              </div>
            )}

            {/* UPI Reference for UPI payments */}
            {withdrawalForm.payment_method === 'upi' && (
              <div className="space-y-2">
                <Label htmlFor="upi_reference" className="text-sm font-medium">
                  UPI Transaction ID
                </Label>
                <Input
                  id="upi_reference"
                  type="text"
                  placeholder="UPI Reference Number"
                  className="w-full"
                  value={withdrawalForm.upi_reference}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, upi_reference: e.target.value }))}
                />
              </div>
            )}

            {/* Reference Number - Show different labels based on payment method */}
            {withdrawalForm.payment_method && withdrawalForm.payment_method !== 'cash' && (
              <div className="space-y-2">
                <Label htmlFor="reference" className="text-sm font-medium">
                  {withdrawalForm.payment_method === 'bank_transfer' && 'Bank Transaction ID'}
                  {withdrawalForm.payment_method === 'cheque' && 'Cheque Number'}
                  {withdrawalForm.payment_method === 'online' && 'Transaction Reference'}
                  {withdrawalForm.payment_method === 'upi' && 'Additional Reference (Optional)'}
                </Label>
                <Input
                  id="reference"
                  type="text"
                  placeholder={
                    withdrawalForm.payment_method === 'bank_transfer' ? 'Bank Transfer Reference' :
                    withdrawalForm.payment_method === 'cheque' ? 'Cheque Number' :
                    withdrawalForm.payment_method === 'online' ? 'Online Transaction ID' :
                    withdrawalForm.payment_method === 'upi' ? 'Additional Reference (optional)' :
                    'Transaction ID, Cheque Number, etc.'
                  }
                  className="w-full"
                  value={withdrawalForm.reference_number}
                  onChange={(e) => setWithdrawalForm(prev => ({ ...prev, reference_number: e.target.value }))}
                />
                {withdrawalForm.payment_method === 'upi' && (
                  <p className="text-xs text-gray-500">
                    UPI transaction ID is captured above. This is for any additional reference.
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the withdrawal purpose..."
                className="w-full resize-none"
                rows={3}
                value={withdrawalForm.description}
                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            {/* Withdrawal Date */}
            <div className="space-y-2">
              <Label htmlFor="withdrawal_date" className="text-sm font-medium">
                Withdrawal Date *
              </Label>
              <Input
                id="withdrawal_date"
                type="date"
                value={withdrawalForm.date}
                onChange={(e) => setWithdrawalForm(prev => ({ ...prev, date: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Info Box - Dynamic based on withdrawal type */}
            <div className={`text-xs p-3 rounded border ${
              withdrawalForm.withdrawal_type === 'capital_withdrawal'
                ? 'bg-purple-50 border-purple-200 text-purple-700'
                : withdrawalForm.withdrawal_type === 'interest_payment'
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <span className="font-medium">💡 {
                withdrawalForm.withdrawal_type === 'capital_withdrawal' ? 'Capital Withdrawal Info:' :
                withdrawalForm.withdrawal_type === 'interest_payment' ? 'Interest Payment Info:' :
                'Profit Distribution Info:'
              }</span> {
                withdrawalForm.withdrawal_type === 'capital_withdrawal' 
                  ? 'This will reduce the partner&apos;s equity and be recorded in Drawings Account (3200). This is NOT a business expense but personal equity withdrawal.'
                  : withdrawalForm.withdrawal_type === 'interest_payment'
                  ? 'This will be recorded as an Interest Expense (5200) and will NOT reduce the partner&apos;s investment balance. This is a business expense.'
                  : 'This will be recorded as a Profit Distribution (3300) and will NOT reduce the partner&apos;s investment balance. This represents a share of business profits.'
              }
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-2 sm:order-1">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCreateWithdrawalOpen(false)}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleCreateWithdrawal}
                disabled={withdrawalLoading || !withdrawalForm.partner_id || !withdrawalForm.category_id || !withdrawalForm.amount || !withdrawalForm.description}
                className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto order-1 sm:order-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {withdrawalLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Record Withdrawal
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Liability Payment Dialog */}
      <Dialog open={createLiabilityOpen} onOpenChange={setCreateLiabilityOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-blue-700 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Liability Payment
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Record payments for bank loans, equipment loans, or other liabilities
            </p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 py-4 overflow-y-auto">
            {/* Left Column - Payment Details */}
            <div className="space-y-3 md:space-y-4">
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2 md:mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Information
                </h3>
                
                {/* Liability Type */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="liability_type" className="text-sm font-medium">
                    Liability Type *
                  </Label>
                  <Select 
                    value={liabilityForm.liability_type} 
                    onValueChange={(value) => setLiabilityForm(prev => ({ ...prev, liability_type: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select liability type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_loan">Bank Loan Payment</SelectItem>
                      <SelectItem value="equipment_loan">Equipment Loan Payment</SelectItem>
                      <SelectItem value="accrued_expense">Accrued Expense Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Loan Selection */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="loan_account" className="text-sm font-medium">
                    Select Loan *
                  </Label>
                  <Select 
                    value={liabilityForm.loan_account} 
                    onValueChange={(value) => setLiabilityForm(prev => ({ ...prev, loan_account: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a loan to pay" />
                    </SelectTrigger>
                    <SelectContent>
                      {loans.length > 0 ? (
                        loans.map((loan) => (
                          <SelectItem key={loan.id} value={loan.id}>
                            <div className="flex flex-col py-1">
                              <div className="font-medium">{loan.loan_name}</div>
                              <div className="text-sm text-gray-500">
                                {loan.bank_name} • {loan.loan_account_code} • Balance: ₹{loan.current_balance?.toLocaleString()}
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          No loans available. Create loan opening balances first.
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {loans.length === 0 && (
                    <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                      💡 Tip: First create loan opening balances using the orange &ldquo;Loan Setup&rdquo; button above
                    </p>
                  )}
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label htmlFor="liability_date" className="text-sm font-medium">
                    Payment Date *
                  </Label>
                  <Input
                    id="liability_date"
                    type="date"
                    value={liabilityForm.date}
                    onChange={(e) => setLiabilityForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Amount Details */}
            <div className="space-y-3 md:space-y-4">
              <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2 md:mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Amount Breakdown
                </h3>
                
                {/* Principal Amount */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="principal_amount" className="text-sm font-medium">
                    Principal Amount (₹) *
                  </Label>
                  <Input
                    id="principal_amount"
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={liabilityForm.principal_amount}
                    onChange={(e) => {
                      const principal = parseFloat(e.target.value) || 0;
                      const interest = parseFloat(liabilityForm.interest_amount) || 0;
                      setLiabilityForm(prev => ({ 
                        ...prev, 
                        principal_amount: e.target.value,
                        total_amount: (principal + interest).toString()
                      }));
                    }}
                    className="w-full"
                  />
                </div>

                {/* Interest Amount */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="interest_amount" className="text-sm font-medium">
                    Interest Amount (₹) *
                  </Label>
                  <Input
                    id="interest_amount"
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    value={liabilityForm.interest_amount}
                    onChange={(e) => {
                      const interest = parseFloat(e.target.value) || 0;
                      const principal = parseFloat(liabilityForm.principal_amount) || 0;
                      setLiabilityForm(prev => ({ 
                        ...prev, 
                        interest_amount: e.target.value,
                        total_amount: (principal + interest).toString()
                      }));
                    }}
                    className="w-full"
                  />
                </div>

                {/* Total Amount (calculated) */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="total_amount" className="text-sm font-medium">
                    Total Payment Amount (₹)
                  </Label>
                  <div className="p-2 bg-gray-100 rounded border text-base md:text-lg font-semibold text-gray-700">
                    ₹{(parseFloat(liabilityForm.principal_amount) || 0) + (parseFloat(liabilityForm.interest_amount) || 0)}
                  </div>
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2 md:mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Payment Method
                </h3>
                
                {/* Payment Method */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="payment_method" className="text-sm font-medium">
                    Payment Method *
                  </Label>
                  <Select 
                    value={liabilityForm.payment_method} 
                    onValueChange={(value) => setLiabilityForm(prev => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="online">Online Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bank Account Selection */}
                {['bank_transfer', 'cheque', 'online'].includes(liabilityForm.payment_method) && (
                  <div className="space-y-2 mb-3 md:mb-4">
                    <Label htmlFor="bank_account" className="text-sm font-medium">
                      Bank Account *
                    </Label>
                    <Select 
                      value={liabilityForm.bank_account_id} 
                      onValueChange={(value) => setLiabilityForm(prev => ({ ...prev, bank_account_id: value }))}
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
              </div>
            </div>

            {/* Full Width Description */}
            <div className="col-span-full space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description *
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the liability payment (e.g., Monthly loan payment for Bank XYZ loan)"
                value={liabilityForm.description}
                onChange={(e) => setLiabilityForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full resize-none"
                rows={2}
              />
            </div>

            {/* Info Box */}
            <div className="col-span-full text-xs p-2 md:p-3 rounded bg-blue-50 border border-blue-200 text-blue-700">
              <span className="font-medium">💡 Accounting Info:</span> This will create proper journal entries:
              <br />• Debit: Selected Loan Account (reduces liability)
              <br />• Debit: Interest Expense (7010)
              <br />• Credit: Selected Payment Account (reduces cash/bank)
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4 md:pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCreateLiabilityOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateLiabilityPayment}
              disabled={!liabilityForm.description || !liabilityForm.principal_amount || !liabilityForm.loan_account || liabilityLoading}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto order-1 sm:order-2"
            >
              {liabilityLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Setup Dialog */}
      <Dialog open={loanSetupOpen} onOpenChange={setLoanSetupOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-orange-700 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Setup Loan Opening Balance
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Set up initial loan balances for proper accounting and tracking
            </p>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 py-4">
            {/* Left Column - Loan Details */}
            <div className="space-y-3 md:space-y-4">
              <div className="bg-orange-50 p-3 md:p-4 rounded-lg">
                <h3 className="font-medium text-orange-900 mb-2 md:mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Loan Information
                </h3>
                
                {/* Loan Account Code */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="loan_account_code" className="text-sm font-medium">
                    Loan Account *
                  </Label>
                  <Select 
                    value={loanSetupForm.loan_account_code} 
                    onValueChange={(value) => setLoanSetupForm(prev => ({ ...prev, loan_account_code: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select loan account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2210">2210 - Bank Loan (Current Portion)</SelectItem>
                      <SelectItem value="2510">2510 - Bank Loans (Long-term)</SelectItem>
                      <SelectItem value="2530">2530 - Equipment Loans</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Loan Name */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="loan_name" className="text-sm font-medium">
                    Loan Name *
                  </Label>
                  <Input
                    id="loan_name"
                    type="text"
                    placeholder="e.g., HDFC Business Loan"
                    value={loanSetupForm.loan_name}
                    onChange={(e) => setLoanSetupForm(prev => ({ ...prev, loan_name: e.target.value }))}
                    className="w-full"
                  />
                </div>

                {/* Bank Name */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="bank_name" className="text-sm font-medium">
                    Bank/Institution Name
                  </Label>
                  <Input
                    id="bank_name"
                    type="text"
                    placeholder="e.g., HDFC Bank"
                    value={loanSetupForm.bank_name}
                    onChange={(e) => setLoanSetupForm(prev => ({ ...prev, bank_name: e.target.value }))}
                    className="w-full"
                  />
                </div>

                {/* Loan Type */}
                <div className="space-y-2">
                  <Label htmlFor="loan_type" className="text-sm font-medium">
                    Loan Type
                  </Label>
                  <Select 
                    value={loanSetupForm.loan_type} 
                    onValueChange={(value) => setLoanSetupForm(prev => ({ ...prev, loan_type: value }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select loan type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business_loan">Business Loan</SelectItem>
                      <SelectItem value="equipment_loan">Equipment Loan</SelectItem>
                      <SelectItem value="vehicle_loan">Vehicle Loan</SelectItem>
                      <SelectItem value="term_loan">Term Loan</SelectItem>
                      <SelectItem value="bank_loan">Bank Loan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Right Column - Amount & Terms */}
            <div className="space-y-3 md:space-y-4">
              <div className="bg-green-50 p-3 md:p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2 md:mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Loan Amounts
                </h3>
                
                {/* Original Loan Amount */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="original_loan_amount" className="text-sm font-medium">
                    Original Loan Amount (₹) *
                  </Label>
                  <Input
                    id="original_loan_amount"
                    type="number"
                    placeholder="500000"
                    min="0"
                    step="0.01"
                    value={loanSetupForm.original_loan_amount}
                    onChange={(e) => setLoanSetupForm(prev => ({ ...prev, original_loan_amount: e.target.value }))}
                    className="w-full"
                  />
                </div>

                {/* Opening Balance */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="opening_balance" className="text-sm font-medium">
                    Current Outstanding Balance (₹) *
                  </Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    placeholder="350000"
                    min="0"
                    step="0.01"
                    value={loanSetupForm.opening_balance}
                    onChange={(e) => setLoanSetupForm(prev => ({ ...prev, opening_balance: e.target.value }))}
                    className="w-full"
                  />
                </div>

                {/* Interest Rate */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="interest_rate" className="text-sm font-medium">
                    Interest Rate (% per annum)
                  </Label>
                  <Input
                    id="interest_rate"
                    type="number"
                    placeholder="12.5"
                    min="0"
                    max="50"
                    step="0.1"
                    value={loanSetupForm.interest_rate}
                    onChange={(e) => setLoanSetupForm(prev => ({ ...prev, interest_rate: e.target.value }))}
                    className="w-full"
                  />
                </div>

                {/* EMI Amount */}
                <div className="space-y-2">
                  <Label htmlFor="emi_amount" className="text-sm font-medium">
                    Monthly EMI Amount (₹)
                  </Label>
                  <Input
                    id="emi_amount"
                    type="number"
                    placeholder="11236"
                    min="0"
                    step="0.01"
                    value={loanSetupForm.emi_amount}
                    onChange={(e) => setLoanSetupForm(prev => ({ ...prev, emi_amount: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-gray-50 p-3 md:p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2 md:mb-3">Additional Details</h3>
                
                {/* Loan Number */}
                <div className="space-y-2 mb-3 md:mb-4">
                  <Label htmlFor="loan_number" className="text-sm font-medium">
                    Loan Number
                  </Label>
                  <Input
                    id="loan_number"
                    type="text"
                    placeholder="BL2024001"
                    value={loanSetupForm.loan_number}
                    onChange={(e) => setLoanSetupForm(prev => ({ ...prev, loan_number: e.target.value }))}
                    className="w-full"
                  />
                </div>

                {/* Loan Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="loan_start_date" className="text-sm font-medium">
                    Loan Start Date
                  </Label>
                  <Input
                    id="loan_start_date"
                    type="date"
                    value={loanSetupForm.loan_start_date}
                    onChange={(e) => setLoanSetupForm(prev => ({ ...prev, loan_start_date: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Full Width Description */}
            <div className="col-span-full space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Additional details about the loan (e.g., purpose, terms, etc.)"
                value={loanSetupForm.description}
                onChange={(e) => setLoanSetupForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full resize-none"
                rows={2}
              />
            </div>

            {/* Info Box */}
            <div className="col-span-full text-xs p-2 md:p-3 rounded bg-orange-50 border border-orange-200 text-orange-700">
              <span className="font-medium">💡 Accounting Info:</span> This will create opening balance journal entries:
              <br />• Debit: Cash Account (1110) - Cash received when loan was taken
              <br />• Credit: Selected Loan Account - Liability recorded
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4 md:pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setLoanSetupOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateLoanSetup}
              disabled={!loanSetupForm.loan_name || !loanSetupForm.original_loan_amount || !loanSetupForm.opening_balance}
              className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto order-1 sm:order-2"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Setup Loan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waive Off Dialog */}
      <WaiveOffDialog
        isOpen={waiveOffOpen}
        onClose={() => setWaiveOffOpen(false)}
        onSuccess={handleWaiveOffSuccess}
        orderId={selectedOrderForWaiveOff?.id}
        invoiceId={selectedInvoiceForWaiveOff?.id}
        availableBalance={
          waiveOffType === 'order' 
            ? (selectedOrderForWaiveOff?.balance_due || 0)
            : (selectedInvoiceForWaiveOff?.balance_due || 0)
        }
        customerName={
          waiveOffType === 'order'
            ? (selectedOrderForWaiveOff?.customer?.name || 'Unknown Customer')
            : (selectedInvoiceForWaiveOff?.customer_name || 'Unknown Customer')
        }
        type={waiveOffType}
      />

      {/* Delete Expense Confirmation Dialog */}
      <Dialog open={deleteExpenseOpen} onOpenChange={setDeleteExpenseOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Expense
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete this expense?
            </p>
            
            {selectedExpenseForDelete && (
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div><strong>Description:</strong> {selectedExpenseForDelete.description}</div>
                <div><strong>Amount:</strong> <span className="text-red-600 font-semibold">
                  ₹{parseFloat(selectedExpenseForDelete.amount.toString()).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span></div>
                <div><strong>Date:</strong> {new Date(selectedExpenseForDelete.date).toLocaleDateString('en-IN')}</div>
                <div><strong>Category:</strong> {selectedExpenseForDelete.category}</div>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Complete Cleanup:</strong> This will delete the expense record, reverse journal entries, 
                update bank account balances, and remove all related financial records.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteExpenseOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteExpense}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Expense
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add New Investor Modal */}
      <Dialog open={showAddInvestorModal} onOpenChange={setShowAddInvestorModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto">
          <DialogHeader>
            <DialogTitle>Add New Partner/Investor</DialogTitle>
            <DialogDescription>
              Add a new partner or investor to the system. They will be available for investments and withdrawals.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddNewInvestor} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Name - Required */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Partner/Investor Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="+91 9876543210"
                />
              </div>

              {/* Partner Type */}
              <div>
                <label className="block text-sm font-medium mb-2">Partner Type</label>
                <select
                  name="partner_type"
                  aria-label="Partner Type"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  defaultValue="partner"
                >
                  <option value="partner">Business Partner</option>
                  <option value="investor">Investor</option>
                  <option value="owner">Owner</option>
                  <option value="stakeholder">Stakeholder</option>
                </select>
              </div>

              {/* Initial Investment */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Initial Investment (₹)
                </label>
                <input
                  type="number"
                  name="initial_investment"
                  min="0"
                  step="0.01"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  defaultValue="0"
                />
              </div>

              {/* Equity Percentage */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Equity Percentage (%)
                </label>
                <input
                  type="number"
                  name="equity_percentage"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  defaultValue="0"
                />
                <small className="text-gray-500">Enter percentage between 0-100</small>
              </div>

              {/* Status Toggle */}
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
                <small className="text-gray-500">Uncheck to mark as inactive</small>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">Notes & Comments</label>
              <textarea
                name="notes"
                rows={3}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes about the partner/investor, agreements, special conditions, etc."
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
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
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
