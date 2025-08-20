'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  MessageCircle
} from 'lucide-react';
import { SalesOrder, Invoice } from '@/types';
import { CreateInvoiceDialog } from './CreateInvoiceDialog';
import { PaymentTrackingDialog } from './PaymentTrackingDialog';
import { SalesOrderPaymentTracker } from './SalesOrderPaymentTracker';
import { WhatsAppService, WhatsAppBillData } from '@/lib/whatsappService';

// Component interfaces and types

interface SalesOrderWithInvoice extends SalesOrder {
  invoices?: Invoice[];
  invoice_status?: 'not_invoiced' | 'partially_invoiced' | 'fully_invoiced';
  total_invoiced?: number;
  remaining_to_invoice?: number;
  paid_amount?: number; // Amount already paid
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

export function SalesOrderInvoiceManager() {
  const [salesOrders, setSalesOrders] = useState<SalesOrderWithInvoice[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderWithInvoice | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [paymentTrackingOpen, setPaymentTrackingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // First fetch orders separately to ensure they are loaded
      const ordersRes = await fetch('/api/sales/orders');
      if (!ordersRes.ok) {
        console.error('Failed to fetch orders:', ordersRes.statusText);
        throw new Error('Failed to fetch sales orders');
      }
      
      const ordersData = await ordersRes.json();
      console.log('Raw Sales Orders Data:', ordersData); // Enhanced debugging
      
      // Handle the orders API response structure
      const orders = Array.isArray(ordersData) ? ordersData : (ordersData.value || ordersData.data || []);
      console.log('Processed Orders Array:', orders); // Enhanced debugging
      console.log('Orders count:', orders?.length || 0); // Enhanced debugging
      
      // Then fetch the rest
      const [invoicesRes, paymentsRes] = await Promise.all([
        fetch('/api/finance/invoices'),
        fetch('/api/finance/payments')
      ]);
      
      const invoicesData = await invoicesRes.json();
      const paymentsData = await paymentsRes.json();
      
      console.log('Raw Invoices Data:', invoicesData); // Enhanced debugging
      console.log('Raw Payments Data:', paymentsData); // Enhanced debugging

      // Handle different API response structures
      const invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData.data || []);
      const payments = Array.isArray(paymentsData) ? paymentsData : (paymentsData.data || []);

      console.log('Processed Invoices:', invoices); // Enhanced debugging
      console.log('Processed Payments:', payments); // Enhanced debugging
      console.log('Payments structure check:', payments.length > 0 ? payments[0] : 'No payments found'); // Check structure

      // Process orders with invoice status
      const processedOrders = orders.map((order: SalesOrder) => {
        const orderInvoices = invoices.filter((inv: Invoice) => inv.sales_order_id === order.id);
        const totalInvoiced = orderInvoices.reduce((sum: number, inv: Invoice) => sum + inv.total, 0);
        const orderTotal = order.final_price || order.total || 0;
        const remainingToInvoice = orderTotal - totalInvoiced;
        
        // Calculate paid amount for each order by joining through invoices
        const orderInvoiceIds = orderInvoices.map((inv: Invoice) => inv.id);
        const orderPayments = payments.filter((payment: { invoice_id: string; amount: number }) => 
          orderInvoiceIds.includes(payment.invoice_id)
        );
        const paidAmount = orderPayments.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0);
        
        // Debug payment calculation for all orders to understand the issue
        if (paidAmount > 0 || order.id === 'f0dd3c5b-2384-48be-a14c-558e29154908') {
          console.log(`DEBUG - Order ${order.id.slice(0, 8)} payment calculation:`, {
            orderInvoices: orderInvoices.length,
            orderInvoiceIds,
            allPaymentsCount: payments.length,
            orderPayments: orderPayments.length,
            paidAmount,
            orderTotal: order.final_price || order.total || 0,
            samplePayment: payments.length > 0 ? payments[0] : null
          });
        }
        
        // Calculate payment status based on amounts
        const calculatedPaymentStatus = paidAmount >= orderTotal ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid';
        
        let invoiceStatus: 'not_invoiced' | 'partially_invoiced' | 'fully_invoiced' = 'not_invoiced';
        if (totalInvoiced > 0) {
          invoiceStatus = remainingToInvoice <= 0 ? 'fully_invoiced' : 'partially_invoiced';
        }

        return {
          ...order,
          // Ensure we have consistent field names
          total_price: orderTotal,
          created_at: order.created_at || (order.date ? `${order.date}T00:00:00.000Z` : new Date().toISOString()),
          invoices: orderInvoices,
          invoice_status: invoiceStatus,
          total_invoiced: totalInvoiced,
          remaining_to_invoice: remainingToInvoice,
          paid_amount: paidAmount,
          calculated_payment_status: calculatedPaymentStatus
        };
      });

      console.log('Processed Orders:', processedOrders); // Debugging line
      setSalesOrders(processedOrders);
      setInvoices(invoices);
      setPayments(payments);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'not_invoiced':
        return <Badge variant="outline" className="text-red-600 border-red-200">Not Invoiced</Badge>;
      case 'partially_invoiced':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200">Partially Invoiced</Badge>;
      case 'fully_invoiced':
        return <Badge variant="outline" className="text-green-600 border-green-200">Fully Invoiced</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
      case 'PARTIAL':
      case 'Partially Paid':
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

  // Summary calculations
  const totalOrderValue = salesOrders.reduce((sum, order) => sum + (order.final_price || order.total_price || order.total || 0), 0);
  const totalInvoiced = salesOrders.reduce((sum, order) => sum + (order.total_invoiced || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const pendingInvoicing = totalOrderValue - totalInvoiced;
  const pendingPayments = totalInvoiced - totalPaid;

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
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setCreateInvoiceOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-gray-50 rounded-none border-b">
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
          </TabsList>

          {/* Summary Cards - Contextual based on active tab */}
          <div className="p-6 bg-gray-50">
            {activeTab === 'orders' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500 rounded-lg">
                        <DollarSign className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-purple-600 font-medium">Completion Rate</p>
                        <p className="text-xl font-bold text-purple-900">
                          {totalOrderValue > 0 ? Math.round((totalInvoiced / totalOrderValue) * 100) : 0}%
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
                            .filter(p => new Date(p.date).getMonth() === new Date().getMonth())
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
                  <TabsTrigger value="invoice-orders" className="w-1/2">All Sales Orders</TabsTrigger>
                  <TabsTrigger value="payment-orders" className="w-1/2">All Sales Orders & Payments</TabsTrigger>
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
                  <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-gray-50/75">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="font-semibold w-[120px]">Order ID</TableHead>
                          <TableHead className="font-semibold w-[200px]">Customer Details</TableHead>
                          <TableHead className="font-semibold w-[120px]">Date</TableHead>
                          <TableHead className="font-semibold w-[150px]">Order Value</TableHead>
                          <TableHead className="font-semibold w-[140px]">Status</TableHead>
                          <TableHead className="font-semibold w-[130px]">Invoiced Amt</TableHead>
                          <TableHead className="font-semibold w-[130px]">Balance</TableHead>
                          <TableHead className="font-semibold w-[120px]">Payment</TableHead>
                          <TableHead className="font-semibold text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <Package className="h-8 w-8 text-gray-400" />
                                <p className="text-gray-500">No sales orders found</p>
                                <p className="text-xs text-gray-400">Create a sales order to get started</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          salesOrders.map((order) => (
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
                                <span className="text-xs text-gray-500 mt-1">{order.customer?.phone || 'No contact'}</span>
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
                                {getInvoiceStatusBadge(order.invoice_status || 'not_invoiced')}
                                <span className="text-xs text-gray-500">
                                  {order.invoices?.length || 0} invoice(s)
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-green-600">{formatCurrency(order.total_invoiced || 0)}</span>
                                <span className="text-xs text-gray-500 mt-1">
                                  {((order.total_invoiced || 0) / (order.final_price || order.total_price || order.total || 1) * 100).toFixed(0)}% invoiced
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-orange-600">{formatCurrency(order.remaining_to_invoice || 0)}</span>
                                <span className="text-xs text-gray-500 mt-1">
                                  {((order.remaining_to_invoice || 0) / (order.final_price || order.total_price || order.total || 1) * 100).toFixed(0)}% remaining
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {getPaymentStatusBadge(
                                  ((order.paid_amount || 0) >= (order.final_price || order.total_price || order.total || 0) ? 'PAID' : 
                                   (order.paid_amount || 0) > 0 ? 'PARTIAL' : 'UNPAID'))}
                                <span className="text-xs text-gray-500">
                                  {formatCurrency(order.paid_amount || 0)} received
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                {/* Create Invoice Button - Only show if not fully invoiced */}
                                {(order.remaining_to_invoice || 0) > 0 && (
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setCreateInvoiceOpen(true);
                                    }}
                                    title="Create Invoice"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Invoice
                                  </Button>
                                )}
                                
                                {/* View Invoices Button - Only show if invoices exist */}
                                {(order.invoices?.length || 0) > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs px-2 py-1"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setActiveTab('invoices');
                                    }}
                                    title="View Invoices"
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                )}

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
                                
                                {/* Payment Tracker - Always show */}
                                <SalesOrderPaymentTracker
                                  orderId={order.id}
                                  orderTotal={order.final_price || order.total_price || order.total || 0}
                                  onPaymentAdded={() => {
                                    fetchData();
                                    console.log('Payment added successfully - Invoice auto-created/updated');
                                  }}
                                />
                              </div>
                            </TableCell>
                      </TableRow>
                    )))}
                  </TableBody>
                </Table>
                </div>
                </TabsContent>
                
                {/* All Sales Orders & Payments Subtab */}
                <TabsContent value="payment-orders" className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-600">
                      Showing all sales orders. Track payments and manage payment status for any order.
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="font-semibold">Order ID</TableHead>
                          <TableHead className="font-semibold">Customer</TableHead>
                          <TableHead className="font-semibold">Order Date</TableHead>
                          <TableHead className="font-semibold">Order Total</TableHead>
                          <TableHead className="font-semibold">Paid</TableHead>
                          <TableHead className="font-semibold">Balance</TableHead>
                          <TableHead className="font-semibold">Payment Status</TableHead>
                          <TableHead className="font-semibold text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <div className="flex flex-col items-center gap-2">
                                <Package className="h-8 w-8 text-gray-400" />
                                <p className="text-gray-500">No sales orders found</p>
                                <p className="text-xs text-gray-400">Create a sales order to get started</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          salesOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-medium text-blue-600">{order.id.slice(0, 8)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">{order.customer?.name || 'Unknown Customer'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                {formatDate(order.created_at)}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-gray-900">
                              {formatCurrency(order.final_price || order.total_price || order.total || 0)}
                            </TableCell>
                            <TableCell className="text-green-600 font-medium">
                              {/* This would normally come from payment data */}
                              {formatCurrency(order.paid_amount || 0)}
                            </TableCell>
                            <TableCell className="text-orange-600 font-medium">
                              {formatCurrency((order.final_price || order.total_price || order.total || 0) - (order.paid_amount || 0))}
                            </TableCell>
                            <TableCell>
                              {getPaymentStatusBadge(
                                ((order.paid_amount || 0) >= (order.final_price || order.total_price || order.total || 0) ? 'PAID' : 
                                 (order.paid_amount || 0) > 0 ? 'PARTIAL' : 'UNPAID'))}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <SalesOrderPaymentTracker
                                  orderId={order.id}
                                  orderTotal={order.final_price || order.total_price || order.total || 0}
                                  onPaymentAdded={() => {
                                    fetchData();
                                    console.log('Payment added successfully - Invoice auto-created/updated');
                                  }}
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        )))}
                      </TableBody>
                    </Table>
                  </div>
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
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                    {payments.map((payment) => (
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
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateInvoiceDialog
        open={createInvoiceOpen}
        onOpenChange={setCreateInvoiceOpen}
        salesOrder={selectedOrder}
        onSuccess={fetchData}
      />

      <PaymentTrackingDialog
        open={paymentTrackingOpen}
        onOpenChange={setPaymentTrackingOpen}
        invoice={selectedInvoice}
        onSuccess={fetchData}
      />
    </div>
  );
}
