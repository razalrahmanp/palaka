'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  Search
} from 'lucide-react';
import { SalesOrder, Invoice, subcategoryMap } from '@/types';
import { PaymentTrackingDialog } from './PaymentTrackingDialog';
import { SalesOrderPaymentTracker } from './SalesOrderPaymentTracker';
import { WhatsAppService, WhatsAppBillData } from '@/lib/whatsappService';
import { WaiveOffDialog } from './WaiveOffDialog';
import { PaymentDeletionManager } from './PaymentDeletionManager';

// Component interfaces and types

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

export function SalesOrderInvoiceManager() {
  const [salesOrders, setSalesOrders] = useState<SalesOrderWithInvoice[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{id: string; account_name: string; account_number: string; account_type?: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentTrackingOpen, setPaymentTrackingOpen] = useState(false);
  const [createExpenseOpen, setCreateExpenseOpen] = useState(false);
  
  // Waive-off states
  const [waiveOffOpen, setWaiveOffOpen] = useState(false);
  const [selectedOrderForWaiveOff, setSelectedOrderForWaiveOff] = useState<SalesOrderWithInvoice | null>(null);
  const [selectedInvoiceForWaiveOff, setSelectedInvoiceForWaiveOff] = useState<Invoice | null>(null);
  const [waiveOffType, setWaiveOffType] = useState<'order' | 'invoice'>('order');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState('orders');
  
  // Search states for each tab
  const [ordersSearchQuery, setOrdersSearchQuery] = useState('');
  const [invoicesSearchQuery, setInvoicesSearchQuery] = useState('');
  const [paymentsSearchQuery, setPaymentsSearchQuery] = useState('');
  const [expensesSearchQuery, setExpensesSearchQuery] = useState('');
  
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    category: 'Office Supplies',
    payment_method: 'cash',
    bank_account_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

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
      const [invoicesRes, paymentsRes, expensesRes, bankAccountsRes] = await Promise.all([
        fetch('/api/finance/invoices'),
        fetch('/api/finance/payments'),
        fetch('/api/finance/expenses'),
        fetch('/api/finance/bank-accounts')
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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
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
      case 'pending':
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
  const filterInvoices = (invoices: Invoice[], searchQuery: string): Invoice[] => {
    if (!searchQuery.trim()) return invoices;
    
    const query = searchQuery.toLowerCase();
    return invoices.filter((invoice) => {
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

  const filterSalesOrders = (orders: SalesOrderWithInvoice[], searchQuery: string): SalesOrderWithInvoice[] => {
    if (!searchQuery.trim()) return orders;
    
    const query = searchQuery.toLowerCase();
    return orders.filter((order) => {
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

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  const getCurrentDataLength = () => {
    switch (activeTab) {
      case 'orders':
        return filterSalesOrders(salesOrders, ordersSearchQuery).length;
      case 'invoices':
        return filterInvoices(invoices, invoicesSearchQuery).length;
      case 'payments':
        return filterPayments(payments, paymentsSearchQuery).length;
      case 'expenses':
        return filterExpenses(expenses, expensesSearchQuery).length;
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
        companyName: 'Al Rams Furniture',
        companyPhone: '+91 9876543210',
        companyAddress: 'Furniture Store Address, City, State'
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
        companyName: 'Al Rams Furniture',
        companyPhone: '+91 9876543210',
        companyAddress: 'Furniture Store Address, City, State',
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

    try {
      const response = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: expenseForm.date,
          subcategory: expenseForm.category,
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount),
          payment_method: expenseForm.payment_method,
          bank_account_id: expenseForm.bank_account_id || (bankAccounts.length > 0 ? bankAccounts[0].id : 1), // Use selected bank account or first available
          created_by: 'system' // You may want to get this from auth context
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
          bank_account_id: ''
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
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Receipt className="h-6 w-6 text-blue-600" />
                Sales Orders & Invoice Management
              </h1>
              <p className="text-gray-600 mt-1">Manage sales orders, create invoices, and track payments</p>
            </div>
          </div>
        </div>
        
        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-12 bg-gray-50 rounded-none border-b">
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
              Payments ({payments.length})
            </TabsTrigger>
            <TabsTrigger 
              value="payment-manager"
              className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-red-500"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Payment Manager
            </TabsTrigger>
            <TabsTrigger 
              value="expenses"
              className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-500"
            >
              <Minus className="h-4 w-4 mr-2" />
              Expenses ({expenses.length})
            </TabsTrigger>
          </TabsList>

          {/* Summary Cards - Contextual based on active tab */}
          <div className="p-6 bg-gray-50">
            {activeTab === 'orders' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Orders Value</p>
                        <p className="text-xl font-bold text-blue-900">{formatCurrency(totalOrderValue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-500 rounded-lg">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-yellow-600 font-medium">Pending Invoicing</p>
                        <p className="text-xl font-bold text-yellow-900">{formatCurrency(pendingInvoicing)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-green-600 font-medium">Already Invoiced</p>
                        <p className="text-xl font-bold text-green-900">{formatCurrency(totalInvoiced)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500 rounded-lg">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-emerald-600 font-medium">Total Collected</p>
                        <p className="text-xl font-bold text-emerald-900">{formatCurrency(totalPaid)}</p>
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
                        <p className="text-sm text-purple-600 font-medium">Payment Rate</p>
                        <p className="text-xl font-bold text-purple-900">
                          {totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-md">
                  <CardContent className="p-4">
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
            <TabsContent value="orders" className="space-y-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Sales Orders Management</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchData()}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
              
              {/* Nested tab for Sales Orders and Payments */}
              <Tabs defaultValue="invoice-orders">
                <TabsList className="w-full">
                  <TabsTrigger value="invoice-orders" className="w-full">All Sales Orders</TabsTrigger>
                </TabsList>
                
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

                  {/* Search Bar for Sales Orders */}
                  <div className="flex items-center gap-4 mb-4">
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
                          const filteredOrders = filterSalesOrders(salesOrders, ordersSearchQuery);
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
                                {/* Use the new invoice_status field from our API */}
                                {order.invoice_status === 'fully_paid' && (
                                  <Badge className="bg-green-100 text-green-800">Fully Paid</Badge>
                                )}
                                {order.invoice_status === 'partially_paid' && (
                                  <Badge className="bg-yellow-100 text-yellow-800">Partially Paid</Badge>
                                )}
                                {order.invoice_status === 'not_invoiced' && (
                                  <Badge className="bg-gray-100 text-gray-800">Not Invoiced</Badge>
                                )}
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
                                {getPaymentStatusBadge(order.payment_status || 'pending')}
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
            <TabsContent value="invoices" className="space-y-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Invoice Management</h3>
                <div className="flex gap-2">
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

              {/* Search Bar */}
              <div className="flex items-center gap-4 mb-4">
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
                      const filteredInvoices = filterInvoices(invoices, invoicesSearchQuery);
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
                          {getPaymentStatusBadge(invoice.status)}
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
            <TabsContent value="payments" className="space-y-4 p-6">
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
            <TabsContent value="payment-manager" className="space-y-4 p-6">
              <PaymentDeletionManager />
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-4 p-6">
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
      <Dialog open={createExpenseOpen} onOpenChange={setCreateExpenseOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Enter expense description..."
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Expense Category
              </Label>
              <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select expense category" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {/* Dynamic categories from subcategoryMap */}
                  {Object.entries(subcategoryMap).map(([category, details]) => (
                    <SelectItem key={category} value={category}>
                      {category} ({details.accountCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payment_method" className="text-right">
                Payment Method
              </Label>
              <Select value={expenseForm.payment_method} onValueChange={(value) => setExpenseForm({ ...expenseForm, payment_method: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(expenseForm.payment_method === 'bank_transfer' || expenseForm.payment_method === 'card' || expenseForm.payment_method === 'cheque' || expenseForm.payment_method === 'online') && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bank_account" className="text-right">
                  Bank Account
                </Label>
                <div className="col-span-3 flex gap-2">
                  <Select value={expenseForm.bank_account_id} onValueChange={(value) => setExpenseForm({ ...expenseForm, bank_account_id: value })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts && bankAccounts.length > 0 ? (
                        bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_name}{account.account_number ? ` - ${account.account_number}` : ''} {account.account_type ? `(${account.account_type})` : ''}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
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
                  >
                    🔄
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateExpenseOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateExpense}
              disabled={!expenseForm.description || !expenseForm.amount}
              className="bg-red-600 hover:bg-red-700"
            >
              Create Expense
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
    </div>
  );
}
