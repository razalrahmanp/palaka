'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  ShoppingCart, 
  DollarSign, 
  Search, 
  Filter,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Download,
  CreditCard,
  Percent,
  Truck,
  User,
  BarChart3,
  TrendingUp,
  Grid3X3,
  List,
  CalendarDays,
  ArrowUp,
  ArrowDown,
  MapPin,
  Clock
} from 'lucide-react';
import { useSalesDataFixed as useSalesData } from '@/components/sales/SalesDataLoaderFixed';
import { createSalesHandlers } from '@/components/sales/SalesHandlers';
import { SalesModals } from '@/components/sales/SalesModals';
import QuoteDetails from '@/components/sales/QuoteDetails';
import { Order, Quote, Customer } from '@/types';
import { AssignSalesRepModal } from '@/components/sales/AssignSalesRepModal';
import { hasPermission } from '@/lib/auth';

export default function RedesignedSalesPage() {
  const router = useRouter();
  const {
    quotes,
    orders,
    products,
    customers,
    currentUser,
    refresh,
  } = useSalesData();

  // State for actual payments data (for "collected" stat card only)
  const [actualPayments, setActualPayments] = useState<Array<{ 
    amount: number; 
    payment_date?: string; 
    date?: string;
    order_id?: string;
    sales_order_id?: string;
    reference_id?: string;
  }>>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('quotes');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Modal states
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isQuoteDetailsOpen, setIsQuoteDetailsOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isBasicOrderEditModalOpen, setIsBasicOrderEditModalOpen] = useState(false);
  const [isAssignRepModalOpen, setIsAssignRepModalOpen] = useState(false);
  const [selectedOrderForRepAssignment, setSelectedOrderForRepAssignment] = useState<Order | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all'); // New time filter state
  
  // View and date range states for orders tab
  const [ordersViewMode, setOrdersViewMode] = useState<'cards' | 'list'>('cards');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch actual payments data for accurate "collected" calculations
  const fetchActualPayments = async () => {
    try {
      setPaymentsLoading(true);
      
      // Fetch payments with order references
      const response = await fetch('/api/finance/payments?include_order_refs=true');
      if (response.ok) {
        const payments = await response.json();
        setActualPayments(Array.isArray(payments) ? payments : []);
        console.log('📄 Fetched actual payments for Sales tab:', payments.length);
        console.log('📄 Sample payment data:', payments.slice(0, 2));
      } else {
        console.error('Failed to fetch payments:', response.statusText);
        setActualPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setActualPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  // Fetch payments on component mount
  useEffect(() => {
    fetchActualPayments();
  }, []); // Only fetch once, then filter client-side

  const { handleSaveQuote, handleDeleteOrder, handleDeleteQuote } = createSalesHandlers(
    currentUser,
    selectedQuote,
    refresh,
    setIsQuoteModalOpen
  );

  // Check if current user is admin
  const isAdmin = hasPermission('user:manage') || hasPermission('sales_order:approve');

  // Handler for opening assign rep modal
  const handleAssignRep = (order: Order | string) => {
    // If it's a string (order ID), find the order from the list
    if (typeof order === 'string') {
      const foundOrder = orders.find(o => o.id === order);
      if (foundOrder) {
        setSelectedOrderForRepAssignment(foundOrder);
        setIsAssignRepModalOpen(true);
      }
    } else {
      // If it's an order object, use directly
      setSelectedOrderForRepAssignment(order);
      setIsAssignRepModalOpen(true);
    }
  };

  // Handler for successful rep assignment
  const handleRepAssignmentSuccess = () => {
    setIsAssignRepModalOpen(false);
    setSelectedOrderForRepAssignment(null);
    refresh(); // Refresh the sales data to show updated rep
  };

  // Helper function to filter by time period
  const filterByTimePeriod = (item: { created_at?: string; date?: string }, filter: string) => {
    if (filter === 'all') return true;
    
    // Handle both created_at and date field names
    const dateString = item.created_at || item.date;
    if (!dateString) {
      console.log('⚠️ Item without date:', item);
      return false;
    }
    
    const itemDate = new Date(dateString);
    const now = new Date(); 
    
    // Debug logging for daily filter
    if (filter === 'daily') {
      console.log('🔍 Daily filter check:', {
        dateString,
        itemDate: itemDate.toDateString(),
        now: now.toDateString(),
        matches: itemDate.toDateString() === now.toDateString()
      });
    }
    
    switch (filter) {
      case 'daily':
        return itemDate.toDateString() === now.toDateString();
      case 'weekly':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= weekAgo;
      case 'monthly':
        return itemDate.getMonth() === now.getMonth() && 
               itemDate.getFullYear() === now.getFullYear();
      default:
        return true;
    }
  };

  // Filter data based on search, status, and time
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = !searchTerm || 
      quote.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    const matchesTime = filterByTimePeriod(quote, timeFilter);
    return matchesSearch && matchesStatus && matchesTime;
  }).sort((a, b) => {
    // Sort by date/created_at
    const dateA = new Date(a.created_at || '').getTime();
    const dateB = new Date(b.created_at || '').getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  console.log(`🔍 Filtering results: timeFilter=${timeFilter}`);
  console.log(`📊 Original quotes: ${quotes.length}, filtered quotes: ${filteredQuotes.length}`);
  if (quotes.length > 0) console.log('📊 Sample quote dates:', quotes.slice(0,2).map(q => ({id: q.id, created_at: q.created_at})));

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesTime = filterByTimePeriod(order, timeFilter);
    
    // Date range filtering (only when in orders tab and date range is specified)
    let matchesDateRange = true;
    if (activeTab === 'orders' && (dateFrom || dateTo)) {
      const orderDate = new Date(order.date || '');
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        matchesDateRange = matchesDateRange && orderDate >= fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        matchesDateRange = matchesDateRange && orderDate <= toDate;
      }
    }
    
    return matchesSearch && matchesStatus && matchesTime && matchesDateRange;
  }).sort((a, b) => {
    // Sort by date/created_at
    const dateA = new Date(a.date || '').getTime();
    const dateB = new Date(b.date || '').getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  console.log(`📦 Original orders: ${orders.length}, filtered orders: ${filteredOrders.length}`);
  if (orders.length > 0) console.log('📦 Sample order dates:', orders.slice(0,2).map(o => ({id: o.id, date: o.date})));

  // Enhanced statistics with real payment and invoice data - based on filtered data
  const stats = (() => {
    // Type extension for orders with payment data
    type OrderWithPayment = Order & {
      total_paid?: number;
      balance_due?: number;
      payment_status?: string;
      payment_count?: number;
      items?: Array<{
        cost?: number;
        unit_price?: number;
        quantity?: number;
        final_price?: number;
      }>;
    };
    
    // Use filtered data for calculations - this gives consistent filtering
    const ordersWithPayment = filteredOrders as OrderWithPayment[];
    const quotesFiltered = filteredQuotes;
    
    // Debug logging
    console.log(`📈 Sales stats: timeFilter=${timeFilter}, totalOrders=${orders.length}, filteredOrders=${ordersWithPayment.length}, totalQuotes=${quotes.length}, filteredQuotes=${quotesFiltered.length}`);
    console.log(`💰 Filtered payments count: ${actualPayments.length}, paymentsLoading: ${paymentsLoading}`);
    
    // Apply consistent time filtering to payments (same logic as orders/quotes)
    const filteredPayments = actualPayments.filter(payment => filterByTimePeriod(payment, timeFilter));
    console.log(`💰 Client-side filtered payments: ${filteredPayments.length} out of ${actualPayments.length}`);
    
    // Basic counts
    const totalQuotes = quotesFiltered.length;
    const totalOrders = ordersWithPayment.length;
    
    // Revenue calculations using actual payment data
    const totalRevenue = ordersWithPayment.reduce((sum, order) => {
      return sum + (order.final_price || order.total || 0);
    }, 0);
    
    // Total amount actually collected (real payments) - using consistently filtered payments
    const totalCollected = !paymentsLoading && filteredPayments.length > 0 
      ? filteredPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
      : ordersWithPayment.reduce((sum, order) => sum + (order.total_paid || 0), 0);

    // Debug: Compare old vs new calculation methods
    const totalCollectedFromOrders = ordersWithPayment.reduce((sum, order) => sum + (order.total_paid || 0), 0);
    const totalCollectedFromPayments = filteredPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    console.log('💰 COLLECTED AMOUNT COMPARISON:', {
      fromOrders: totalCollectedFromOrders,
      fromActualPayments: totalCollectedFromPayments,
      usingActualPayments: !paymentsLoading && filteredPayments.length > 0,
      paymentsCount: filteredPayments.length,
      timeFilter: timeFilter
    });
    
    // Outstanding balance across all orders
    const totalOutstanding = ordersWithPayment.reduce((sum, order) => {
      return sum + (order.balance_due || 0);
    }, 0);
    
    // Payment status breakdown
    const fullyPaidOrders = ordersWithPayment.filter(order => order.payment_status === 'paid').length;
    const partialPaidOrders = ordersWithPayment.filter(order => order.payment_status === 'partial').length;
    const pendingPaymentOrders = ordersWithPayment.filter(order => order.payment_status === 'pending').length;
    
    // Quote conversion metrics
    const conversionRate = totalQuotes > 0 ? Math.round((quotesFiltered.filter(q => q.status === 'Converted').length / totalQuotes) * 100) : 0;
    const pendingQuotes = quotesFiltered.filter(q => q.status === 'Draft' || q.status === 'Pending').length;
    const confirmedOrders = ordersWithPayment.filter(o => o.status === 'confirmed').length;
    
    // Monthly metrics (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyOrders = ordersWithPayment.filter(o => 
      new Date(o.date || '').getMonth() === currentMonth &&
      new Date(o.date || '').getFullYear() === currentYear
    );
    
    const monthlyRevenue = monthlyOrders.reduce((sum, order) => {
      return sum + (order.final_price || order.total || 0);
    }, 0);
    
    // Calculate collected amount based on time filter (consistently filtered)
    let periodCollected = 0;
    if (!paymentsLoading && filteredPayments.length > 0) {
      // Use consistently filtered payments for the selected time period
      periodCollected = filteredPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    } else {
      // Fallback to filtered orders data
      periodCollected = ordersWithPayment.reduce((sum, order) => {
        return sum + (order.total_paid || 0);
      }, 0);
    }
    
    // Collection rate
    const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;
    
    // Average order value for paid orders
    const paidOrders = ordersWithPayment.filter(order => order.payment_status === 'paid');
    const averageOrderValue = paidOrders.length > 0
      ? paidOrders.reduce((sum, order) => sum + (order.final_price || order.total || 0), 0) / paidOrders.length
      : 0;
    
    // Legacy fields for compatibility (using filtered quote data)
    const totalPendingPayments = quotesFiltered.reduce((sum, q) => sum + (q.remaining_balance || 0), 0);
    const partialPaidQuotes = quotesFiltered.filter(q => q.payment_status === 'partial').length;
    const fullyPaidQuotes = quotesFiltered.filter(q => q.payment_status === 'paid').length;
    
    // Additional required fields
    const pendingOrders = ordersWithPayment.filter(o => o.status === 'draft').length; // using 'draft' as pending equivalent
    const convertedQuotes = quotesFiltered.filter(q => q.status === 'Converted').length;
    
    // Delivery-based payment tracking - Simplified for clarity
    const deliveredOrders = ordersWithPayment.filter(o => o.status === 'delivered');
    
    console.log(`📦 Found ${deliveredOrders.length} delivered orders`);
    
    // Calculate PENDING amount from delivered orders only
    let deliveredOrdersPending = 0;
    let deliveredOrdersWithPendingPayment = 0;
    
    deliveredOrders.forEach(order => {
      const orderTotal = order.final_price || order.total || 0;
      const orderPaid = order.total_paid || 0;
      const remainingAmount = orderTotal - orderPaid;
      
      if (remainingAmount > 0) {
        deliveredOrdersPending += remainingAmount;
        deliveredOrdersWithPendingPayment++;
      }
    });
    
    // Also calculate revenue and collected for other stats
    const deliveredOrdersRevenue = deliveredOrders.reduce((sum, order) => {
      return sum + (order.final_price || order.total || 0);
    }, 0);
    
    const deliveredOrdersCollected = deliveredOrders.reduce((sum, order) => {
      return sum + (order.total_paid || 0);
    }, 0);
    
    console.log(`📦 Delivered Orders Summary:
    - Total Orders: ${deliveredOrders.length}
    - Total Revenue: ₹${deliveredOrdersRevenue.toLocaleString()}
    - Total Collected: ₹${deliveredOrdersCollected.toLocaleString()}
    - PENDING AMOUNT: ₹${deliveredOrdersPending.toLocaleString()}
    - Orders with Pending: ${deliveredOrdersWithPendingPayment}`);
    
    console.log('📦 Sample delivered orders:', deliveredOrders.slice(0, 3).map(o => ({
      id: o.id,
      total: o.final_price || o.total,
      paid: o.total_paid,
      pending: (o.final_price || o.total || 0) - (o.total_paid || 0)
    })));
    
    // Profit calculations - using final_price (actual amount received) minus cost
    const totalProfit = ordersWithPayment.reduce((sum, order) => {
      if (!order.items || !Array.isArray(order.items)) return sum;
      
      const orderProfit = order.items.reduce((itemSum, item) => {
        // Actual Profit = Final Price (amount received) - Cost
        const finalPrice = item.final_price || 0; // Actual selling price after discounts
        const cost = item.cost || 0; // Cost of the product
        const quantity = item.quantity || 1;
        
        // Total profit for this item = (final_price - cost) * quantity
        const itemProfit = (finalPrice - cost) * quantity;
        return itemSum + itemProfit;
      }, 0);
      
      return sum + orderProfit;
    }, 0);
    
    const totalCost = ordersWithPayment.reduce((sum, order) => {
      if (!order.items || !Array.isArray(order.items)) return sum;
      
      const orderCost = order.items.reduce((itemSum, item) => {
        const cost = (item.cost || 0) * (item.quantity || 1);
        return itemSum + cost;
      }, 0);
      
      return sum + orderCost;
    }, 0);
    
    // Calculate profit margin based on total revenue (final prices)
    const totalFinalPrice = ordersWithPayment.reduce((sum, order) => {
      if (!order.items || !Array.isArray(order.items)) return sum;
      
      const orderFinalPrice = order.items.reduce((itemSum, item) => {
        const finalPrice = (item.final_price || 0) * (item.quantity || 1);
        return itemSum + finalPrice;
      }, 0);
      
      return sum + orderFinalPrice;
    }, 0);
    
    const profitMargin = totalFinalPrice > 0 ? Math.round((totalProfit / totalFinalPrice) * 100) : 0;
    
    const result = {
      totalQuotes,
      totalOrders,
      totalRevenue,
      totalCollected,
      totalOutstanding,
      fullyPaidOrders,
      partialPaidOrders,
      pendingPaymentOrders,
      conversionRate,
      pendingQuotes,
      confirmedOrders,
      monthlyRevenue,
      periodCollected,
      monthlyOrders: monthlyOrders.length,
      collectionRate,
      averageOrderValue,
      totalPendingPayments,
      partialPaidQuotes,
      fullyPaidQuotes,
      pendingOrders,
      convertedQuotes,
      totalProfit,
      totalCost,
      profitMargin,
      deliveredOrdersCollected,
      deliveredOrdersPending,
      deliveredOrdersWithPendingPayment,
      deliveredOrdersCount: deliveredOrders.length
    };
    
    console.log(`📈 Sales stats:`, result);
    
    return result;
  })();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'converted': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      {/* Compact Header */}
      <div className="mb-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-1">
                Sales Management Hub
              </h1>
              <p className="text-gray-600 text-sm">Comprehensive sales operations & analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-300"
                onClick={() => router.push('/sales/representative')}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Sales Dashboard
              </Button>
              <Button 
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Time Period Filter */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white/95 backdrop-blur-xl rounded-full border border-blue-200 shadow-2xl hover:shadow-blue-200/50 transition-all duration-300">
          <div className="flex items-center gap-2 px-4 py-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">Time Period:</span>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-28 h-8 border-0 bg-transparent text-xs focus:ring-2 focus:ring-blue-500">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="daily">Today</SelectItem>
                <SelectItem value="weekly">This Week</SelectItem>
                <SelectItem value="monthly">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Compact Stats Grid - Organized by Flow */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 mb-4">
        {/* Orders & Conversion */}
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <ShoppingCart className="h-3.5 w-3.5 flex-shrink-0" />
              <p className="text-[11px] font-semibold leading-tight">Total Orders</p>
            </div>
            <p className="text-lg font-bold leading-none mb-0.5">{stats.totalOrders}</p>
            <p className="text-[10px] leading-tight truncate">{stats.confirmedOrders} confirmed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
              <p className="text-[11px] font-semibold leading-tight">Conversion Rate</p>
            </div>
            <p className="text-lg font-bold leading-none mb-0.5">{stats.conversionRate}%</p>
            <p className="text-[10px] leading-tight truncate">Quote to order</p>
          </CardContent>
        </Card>

        {/* Revenue Metrics */}
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
              <p className="text-[11px] font-semibold leading-tight">Total Revenue</p>
            </div>
            <p className="text-lg font-bold leading-none mb-0.5 truncate">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-[10px] leading-tight truncate">{stats.collectionRate}% collected</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />
              <p className="text-[11px] font-semibold leading-tight">Collected</p>
            </div>
            <p className="text-lg font-bold leading-none mb-0.5 truncate">{formatCurrency(stats.totalCollected)}</p>
            <p className="text-[10px] leading-tight truncate">{stats.fullyPaidOrders} paid orders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <p className="text-[11px] font-semibold leading-tight">Outstanding</p>
            </div>
            <p className="text-lg font-bold leading-none mb-0.5 truncate">{formatCurrency(stats.totalOutstanding)}</p>
            <p className="text-[10px] leading-tight truncate">{stats.pendingPaymentOrders} pending</p>
          </CardContent>
        </Card>

        {/* Profitability & Delivery */}
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
              <p className="text-[11px] font-semibold leading-tight">Net Profit</p>
            </div>
            <p className="text-lg font-bold leading-none mb-0.5 truncate">{formatCurrency(stats.totalProfit)}</p>
            <p className="text-[10px] leading-tight truncate">{stats.profitMargin}% of sales</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-sm hover:shadow-md transition-all duration-300">
          <CardContent className="p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Truck className="h-3.5 w-3.5 flex-shrink-0" />
              <p className="text-[11px] font-semibold leading-tight">Delivered Paid</p>
            </div>
            <p className="text-lg font-bold leading-none mb-0.5 truncate">{formatCurrency(stats.deliveredOrdersCollected)}</p>
            <p className="text-[10px] leading-tight truncate">{stats.deliveredOrdersCount} delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Enterprise Style Tabs Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Enterprise Tab Navigation */}
          <div className="bg-gray-50 border-b border-gray-200">
            <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 h-auto">
              <TabsTrigger 
                value="quotes" 
                className="relative flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium 
                          text-gray-600 hover:text-gray-900 hover:bg-white/50
                          data-[state=active]:bg-white data-[state=active]:text-blue-600 
                          data-[state=active]:border-b-2 data-[state=active]:border-blue-600
                          data-[state=active]:shadow-sm transition-all duration-200
                          border-b-2 border-transparent"
              >
                <FileText className="h-4 w-4" />
                <span>Sales Quotes</span>
                <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5
                               data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800">
                  {stats.totalQuotes}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="relative flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium 
                          text-gray-600 hover:text-gray-900 hover:bg-white/50
                          data-[state=active]:bg-white data-[state=active]:text-green-600 
                          data-[state=active]:border-b-2 data-[state=active]:border-green-600
                          data-[state=active]:shadow-sm transition-all duration-200
                          border-b-2 border-transparent"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Sales Orders</span>
                <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs px-2 py-0.5
                               data-[state=active]:bg-green-100 data-[state=active]:text-green-800">
                  {stats.totalOrders}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="performance" 
                className="relative flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium 
                          text-gray-600 hover:text-gray-900 hover:bg-white/50
                          data-[state=active]:bg-white data-[state=active]:text-purple-600 
                          data-[state=active]:border-b-2 data-[state=active]:border-purple-600
                          data-[state=active]:shadow-sm transition-all duration-200
                          border-b-2 border-transparent"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Analytics</span>
                <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2 py-0.5
                               data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800">
                  {stats.conversionRate}%
                </Badge>
              </TabsTrigger>


            </TabsList>
          </div>

          {/* Enterprise Search and Filter Bar */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex flex-col gap-4">
              {/* First Row - Main Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by customer name, ID, or reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-md"
                    />
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-sm"
                    aria-label="Filter by status"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="delivered">Delivered</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  
                  {/* View Mode Toggle - Only for Orders Tab */}
                  {activeTab === 'orders' && (
                    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                      <Button
                        variant={ordersViewMode === 'cards' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setOrdersViewMode('cards')}
                        className="rounded-none border-0 px-3 py-2"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={ordersViewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setOrdersViewMode('list')}
                        className="rounded-none border-0 px-3 py-2"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {/* Sort Order Toggle */}
                  <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                    <Button
                      variant={sortOrder === 'asc' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSortOrder('asc')}
                      className="rounded-none border-0 px-3 py-2 text-xs"
                      title="Ascending Order (Oldest First)"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={sortOrder === 'desc' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setSortOrder('desc')}
                      className="rounded-none border-0 px-3 py-2 text-xs"
                      title="Descending Order (Newest First)"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50">
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">More filters</span>
                  </Button>
                </div>
              </div>
              
              {/* Second Row - Date Range Filter (Only for Orders Tab) */}
              {activeTab === 'orders' && (
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarDays className="h-4 w-4" />
                    <span>Date Range:</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-40 text-sm"
                      placeholder="From date"
                    />
                    <span className="text-gray-400">to</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-40 text-sm"
                      placeholder="To date"
                    />
                    {(dateFrom || dateTo) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDateFrom('');
                          setDateTo('');
                        }}
                        className="text-xs px-2"
                      >
                        Clear Dates
                      </Button>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 ml-auto">
                    Showing {filteredOrders.length} orders
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enterprise Tab Contents */}
          <div className="p-6 bg-white min-h-[500px]">
            <TabsContent value="quotes" className="mt-0">
              <QuotesTabContent 
                quotes={filteredQuotes}
                onView={(quote) => {
                  setSelectedQuote(quote);
                  setIsQuoteDetailsOpen(true);
                }}
                onDelete={(quoteId) => handleDeleteQuote(quoteId)}
                formatCurrency={formatCurrency}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="orders" className="mt-0">
              <OrdersTabContent 
                orders={filteredOrders}
                customers={customers}
                viewMode={ordersViewMode}
                onView={(order) => {
                  setSelectedOrder(order);
                  setIsOrderModalOpen(true);
                }}
                onEdit={(order) => {
                  setSelectedOrder(order);
                  setIsBasicOrderEditModalOpen(true);
                }}
                onDelete={handleDeleteOrder}
                onAssignRep={isAdmin ? handleAssignRep : undefined}
                formatCurrency={formatCurrency}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="performance" className="mt-0">
              <PerformanceTabContent 
                stats={stats}
                formatCurrency={formatCurrency}
              />
            </TabsContent>

          </div>
        </Tabs>
      </div>

      {/* Sales Modals */}
      <SalesModals
        isQuoteModalOpen={isQuoteModalOpen}
        setIsQuoteModalOpen={setIsQuoteModalOpen}
        isOrderModalOpen={isOrderModalOpen}
        setIsOrderModalOpen={setIsOrderModalOpen}
        isBasicOrderEditModalOpen={isBasicOrderEditModalOpen}
        setIsBasicOrderEditModalOpen={setIsBasicOrderEditModalOpen}
        selectedQuote={selectedQuote}
        selectedOrder={selectedOrder}
        customers={customers}
        products={products}
        currentUser={currentUser}
        handleSaveQuote={handleSaveQuote}
        refresh={refresh}
        showSalesRepChangeButton={isAdmin}
        onSalesRepChange={handleAssignRep}
      />

      {/* Quote Details Modal */}
      <QuoteDetails
        quote={selectedQuote}
        isOpen={isQuoteDetailsOpen}
        onClose={() => setIsQuoteDetailsOpen(false)}
        onEdit={(quote) => {
          setIsQuoteDetailsOpen(false);
          setSelectedQuote(quote);
          setIsQuoteModalOpen(true);
        }}
        formatCurrency={formatCurrency}
        getStatusColor={getStatusColor}
      />

      {/* Assign Sales Rep Modal */}
      <AssignSalesRepModal
        open={isAssignRepModalOpen}
        onOpenChange={setIsAssignRepModalOpen}
        order={selectedOrderForRepAssignment}
        onSuccess={handleRepAssignmentSuccess}
      />
    </div>
  );
}

// Quotes Tab Component
function QuotesTabContent({ 
  quotes, 
  onView, 
  onDelete,
  formatCurrency, 
  getStatusColor 
}: {
  quotes: Quote[];
  onView: (quote: Quote) => void;
  onDelete: (quoteId: string) => void;
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {quotes.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes found</h3>
          <p className="text-gray-500">Create your first quote to get started.</p>
        </div>
      ) : (
        quotes.map((quote) => (
          <Card key={quote.id} className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-200 pb-4 pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                    Quote #{quote.id?.slice(-8)}
                  </CardTitle>
                  <p className="text-sm text-gray-600 flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    {quote.customer}
                  </p>
                </div>
                <Badge className={`${getStatusColor(quote.status || '')} ml-3`}>
                  {quote.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {/* Price Information */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  {(quote.discount_amount || 0) > 0 && quote.original_price && quote.final_price ? (
                    // Enhanced discount display
                    <div className="text-center">
                      {/* Final Price - Main Display */}
                      <div className="mb-3">
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(quote.final_price)}
                        </p>
                        <p className="text-sm text-green-600 font-medium">Final Price</p>
                      </div>
                      
                      {/* Discount Information */}
                      <div className="p-3 bg-red-50 rounded-md border border-red-100">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">Original:</span>
                          <span className="text-gray-800 line-through">
                            {formatCurrency(quote.original_price)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm mt-1">
                          <span className="text-red-600 font-medium flex items-center">
                            <Percent className="mr-1 h-3 w-3" />
                            Discount:
                          </span>
                          <span className="text-red-600 font-bold">
                            -{formatCurrency(quote.discount_amount || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Simple price display without discount
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(quote.final_price || quote.total_price || 0)}</p>
                      <p className="text-sm text-gray-600">Quote Value</p>
                    </div>
                  )}
                  
                  {/* Additional charges in compact format */}
                  <div className="space-y-2 mt-4">
                    {(quote.discount_amount || 0) > 0 && !(quote.original_price && quote.final_price) && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center">
                          <Percent className="mr-1 h-3 w-3" />
                          Discount
                        </span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(quote.discount_amount || 0)}
                        </span>
                      </div>
                    )}

                    {quote.emi_enabled && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center">
                          <CreditCard className="mr-1 h-3 w-3" />
                          EMI
                        </span>
                        <span className="font-medium text-blue-600">
                          {formatCurrency(quote.emi_monthly || 0)}/mo
                        </span>
                      </div>
                    )}

                    {(quote.freight_charges || 0) > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center">
                          <Truck className="mr-1 h-3 w-3" />
                          Freight
                        </span>
                        <span className="font-medium text-gray-600">
                          {formatCurrency(quote.freight_charges || 0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Status Section */}
                {quote.payment_status && (
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center">
                        <DollarSign className="mr-1 h-4 w-4" />
                        Payment Status
                      </span>
                      <Badge className={
                        quote.payment_status === 'paid' ? 'bg-green-100 text-green-800 border-green-200' :
                        quote.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        quote.payment_status === 'overdue' ? 'bg-red-100 text-red-800 border-red-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }>
                        {quote.payment_status?.toUpperCase()}
                      </Badge>
                    </div>
                    
                    {quote.payment_status === 'partial' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Paid: {formatCurrency(quote.total_paid || 0)}</span>
                          <span className="text-red-600">Balance: {formatCurrency(quote.remaining_balance || 0)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300 ${
                              (() => {
                                const percent = Math.min(100, Math.max(0, ((quote.total_paid || 0) / ((quote.final_price || quote.total_price) || 1)) * 100));
                                if (percent >= 100) return 'w-full';
                                if (percent >= 75) return 'w-3/4';
                                if (percent >= 50) return 'w-1/2';
                                if (percent >= 25) return 'w-1/4';
                                if (percent > 0) return 'w-1/12';
                                return 'w-0';
                              })()
                            }`}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="border-t border-gray-200 pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
                      onClick={() => onView(quote)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                      onClick={() => onDelete(quote.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>

                  {/* Payment Actions */}
                  {quote.status === 'Approved' && quote.payment_status !== 'paid' && (
                    <Button
                      size="sm"
                      className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        // TODO: Open payment collection modal
                        console.log('Collect payment for quote:', quote.id);
                      }}
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {quote.payment_status === 'partial' ? 'Collect Balance' : 'Collect Payment'}
                    </Button>
                  )}
                </div>

                {quote.notes && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs text-gray-600 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                      <strong>Note:</strong> {quote.notes}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// Orders Tab Component
function OrdersTabContent({ 
  orders, 
  customers,
  viewMode,
  onView,
  onEdit, 
  onDelete, 
  onAssignRep,
  formatCurrency, 
  getStatusColor 
}: {
  orders: Order[];
  customers: Customer[];
  viewMode: 'cards' | 'list';
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
  onAssignRep?: (order: Order) => void;
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
}) {
  
  // Helper function to get customer details by customer_id or customer name
  const getCustomerDetails = (order: Order) => {
    if (order.customer_id) {
      // Try to find by customer_id first
      const customer = customers.find(c => c.id === order.customer_id);
      if (customer) return customer;
    }
    
    // Fallback: try to find by customer name
    if (order.customer?.name) {
      const customer = customers.find(c => c.name.toLowerCase() === order.customer?.name.toLowerCase());
      if (customer) return customer;
    }
    
    return null;
  };

  // Helper function to format customer address
  const formatCustomerAddress = (customer: Customer | null) => {
    if (!customer) return 'No address provided';
    
    const addressParts = [];
    if (customer.address) addressParts.push(customer.address);
    if (customer.floor) addressParts.push(`Floor: ${customer.floor}`);
    if (customer.city) addressParts.push(customer.city);
    if (customer.state) addressParts.push(customer.state);
    if (customer.pincode) addressParts.push(customer.pincode);
    
    return addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';
  };
  
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
            <div className="col-span-1">Order ID</div>
            <div className="col-span-2">Customer</div>
            <div className="col-span-2">Address</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Amount</div>
            <div className="col-span-1">Date</div>
            <div className="col-span-2">Sales Rep</div>
            <div className="col-span-2">Actions</div>
          </div>
        </div>
        
        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {orders.map((order) => {
            const orderWithFinalPrice = order as Order & { 
              final_price?: number, 
              original_price?: number, 
              discount_amount?: number,
              discount_percentage?: number 
            };
            const displayPrice = orderWithFinalPrice.final_price || order.total || 0;
            const customerDetails = getCustomerDetails(order);
            const customerAddress = formatCustomerAddress(customerDetails);
            
            return (
              <div key={order.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="grid grid-cols-12 gap-4 items-center text-sm">
                  <div className="col-span-1">
                    <div className="font-medium text-gray-900">#{order.id?.slice(-8)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-900">{order.customer?.name || 'Unknown Customer'}</div>
                    {order.items && order.items.length > 0 && (
                      <div className="text-xs text-gray-500">{order.items.length} items</div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-900 flex items-start">
                      <MapPin className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs leading-tight">{customerAddress}</span>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Badge className={getStatusColor(order.status || '')}>
                      {order.status}
                    </Badge>
                  </div>
                  <div className="col-span-1">
                    <div className="font-medium text-gray-900">{formatCurrency(displayPrice)}</div>
                    {orderWithFinalPrice.final_price && orderWithFinalPrice.original_price && 
                     orderWithFinalPrice.final_price !== orderWithFinalPrice.original_price && (
                      <div className="text-xs text-red-600">
                        Original: <span className="line-through">{formatCurrency(orderWithFinalPrice.original_price)}</span>
                      </div>
                    )}
                  </div>
                  <div className="col-span-1">
                    <div className="text-gray-900">
                      {order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-900">
                      {order.sales_representative?.name || 'Unassigned'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(order)}
                        className="h-8 w-8 p-0"
                        title="View Order"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(order)}
                        className="h-8 w-8 p-0"
                        title="Edit Order"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {onAssignRep && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onAssignRep(order)}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                          title="Assign Sales Rep"
                        >
                          <User className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(order.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        title="Delete Order"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {orders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">No orders found</div>
          </div>
        )}
      </div>
    );
  }
  
  // Cards view (default)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {orders.map((order) => {
        const customerDetails = getCustomerDetails(order);
        const customerAddress = formatCustomerAddress(customerDetails);
        
        return (
          <Card key={order.id} className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] rounded-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-3 pt-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium text-gray-800">
                  Order #{order.id?.slice(-8)}
                </CardTitle>
                <Badge className={getStatusColor(order.status || '')}>
                  {order.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 flex items-center">
                <User className="mr-1 h-3 w-3" />
                {order.customer?.name || 'Unknown Customer'}
              </p>
              <p className="text-xs text-gray-500 flex items-start">
                <MapPin className="mr-1 h-3 w-3 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{customerAddress}</span>
              </p>
              {order.sales_representative && (
                <p className="text-xs text-blue-600 flex items-center">
                  <User className="mr-1 h-3 w-3" />
                  Sales Rep: {order.sales_representative.name}
                </p>
              )}
              {order.date && (
                <p className="text-xs text-gray-500 flex items-center">
                  <Calendar className="mr-1 h-2.5 w-2.5" />
                  {new Date(order.date).toLocaleDateString()}
                </p>
              )}
            </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-center">
                  {(() => {
                    const orderWithFinalPrice = order as Order & { 
                      final_price?: number, 
                      original_price?: number, 
                      discount_amount?: number,
                      discount_percentage?: number 
                    };
                    
                    // Always prioritize final_price when available
                    const displayPrice = orderWithFinalPrice.final_price || order.total || 0;
                    const isDiscounted = orderWithFinalPrice.final_price && orderWithFinalPrice.original_price && 
                                       orderWithFinalPrice.final_price !== orderWithFinalPrice.original_price;
                    
                    if (isDiscounted) {
                      // Enhanced display for discounted orders
                      return (
                        <div>
                          {/* Final Price - Main Display */}
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(orderWithFinalPrice.final_price || 0)}
                          </p>
                          <p className="text-sm text-green-600 font-medium">Final Amount (After Discount)</p>
                          
                          {/* Discount Information */}
                          <div className="mt-2 p-2 bg-red-50 rounded-lg">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Original:</span>
                              <span className="text-gray-800 line-through">
                                {formatCurrency(orderWithFinalPrice.original_price || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-1">
                              <span className="text-red-600 font-medium">Discount:</span>
                              <span className="text-red-600 font-bold">
                                -{formatCurrency(orderWithFinalPrice.discount_amount || ((orderWithFinalPrice.original_price || 0) - (orderWithFinalPrice.final_price || 0)))}
                              </span>
                            </div>
                            <div className="text-xs text-green-600 mt-1 font-medium">
                              You Save: {formatCurrency((orderWithFinalPrice.original_price || 0) - (orderWithFinalPrice.final_price || 0))}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // Standard display - always use final_price when available
                      return (
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(displayPrice)}
                          </p>
                          <p className="text-sm text-green-600 font-medium">
                            {orderWithFinalPrice.final_price ? 'Final Amount' : 'Total Amount'}
                          </p>
                          {/* Show note if using final_price but no discount info */}
                          {orderWithFinalPrice.final_price && !orderWithFinalPrice.original_price && (
                            <p className="text-xs text-gray-500 mt-1">
                              (Post-discount price)
                            </p>
                          )}
                        </div>
                      );
                    }
                  })()}
                </div>
                
                {order.items && order.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">Items ({order.items.length})</p>
                    <div className="space-y-1">
                      {order.items.slice(0, 2).map((item, index) => (
                        <div key={index} className="flex justify-between text-xs">
                          <span className="text-gray-600 truncate">{item.name}</span>
                          <span className="text-gray-800 ml-2">×{item.quantity}</span>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-gray-500">+{order.items.length - 2} more items</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Enhanced Payment Status and Balance Information */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  {(() => {
                    // Use actual payment data from the API
                    const orderTotal = order.final_price || order.total || 0;
                    const paidAmount = order.total_paid || 0;
                    const balance = order.balance_due !== undefined ? order.balance_due : (orderTotal - paidAmount);
                    const paymentPercentage = orderTotal > 0 ? (paidAmount / orderTotal) * 100 : 0;
                    const paymentStatus = order.payment_status || 'pending';
                    const paymentCount = order.payment_count || 0;
                    
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Payment Details</span>
                          <Badge className={
                            paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            paymentStatus === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {paymentStatus?.toUpperCase()}
                          </Badge>
                        </div>
                        
                        {/* Payment Summary */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Order Total:</span>
                            <span className="font-medium">{formatCurrency(orderTotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Paid Amount:</span>
                            <span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Balance Due:</span>
                            <span className={`font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(balance)}
                            </span>
                          </div>
                          
                          {/* Payment Progress Bar */}
                          {orderTotal > 0 && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-500">Payment Progress</span>
                                <span className="text-gray-600">{paymentPercentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    paymentStatus === 'paid' ? 'bg-green-500' :
                                    paymentStatus === 'partial' ? 'bg-yellow-500' :
                                    'bg-gray-400'
                                  } ${
                                    paymentPercentage >= 100 ? 'w-full' :
                                    paymentPercentage >= 75 ? 'w-3/4' :
                                    paymentPercentage >= 50 ? 'w-1/2' :
                                    paymentPercentage >= 25 ? 'w-1/4' :
                                    paymentPercentage > 0 ? 'w-1/12' :
                                    'w-0'
                                  }`}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {/* Payment Count */}
                          {paymentCount > 0 && (
                            <div className="flex justify-between text-sm mt-1">
                              <span className="text-gray-600">Payments Made:</span>
                              <span className="text-blue-600 font-medium">
                                {paymentCount} payment{paymentCount > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Enhanced Payment Action Button */}
                {(() => {
                  const orderTotal = order.final_price || order.total || 0;
                  const paidAmount = order.total_paid || 0;
                  const balance = order.balance_due !== undefined ? order.balance_due : (orderTotal - paidAmount);
                  
                  return order.status === 'confirmed' && balance > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Button 
                        size="sm" 
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg"
                        onClick={() => {
                          // You can add payment collection functionality here
                          console.log('Collect payment for order:', order.id, 'Balance:', balance);
                        }}
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        {paidAmount > 0 ? `Collect Remaining ${formatCurrency(balance)}` : `Collect Payment ${formatCurrency(balance)}`}
                      </Button>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-lg hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                    onClick={() => onView(order)}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    onClick={() => onEdit(order)}
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                    onClick={() => order.id && onDelete(order.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Admin Only: Assign Sales Rep Button */}
                {onAssignRep && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    onClick={() => onAssignRep(order)}
                  >
                    <User className="mr-1 h-4 w-4" />
                    Assign Sales Rep
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        );
      })}
      
      {orders.length === 0 && (
        <div className="col-span-full text-center py-12">
          <div className="text-gray-500">No orders found</div>
        </div>
      )}
    </div>
  );
}

// Performance Tab Component
function PerformanceTabContent({ 
  stats, 
  formatCurrency 
}: {
  stats: {
    totalQuotes: number;
    totalOrders: number;
    totalRevenue: number;
    pendingQuotes: number;
    confirmedOrders: number;
    pendingOrders: number;
    convertedQuotes: number;
    conversionRate: number;
    totalOutstanding: number;
    pendingPaymentOrders: number;
    totalCollected: number;
    fullyPaidOrders: number;
    collectionRate: number;
  };
  formatCurrency: (amount: number) => string;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Conversion Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.conversionRate}%</p>
              <p className="text-gray-600 text-sm">Quotes to Orders</p>
              <div className="mt-2 text-xs text-gray-500">
                {stats.convertedQuotes} / {stats.totalQuotes} converted
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.collectionRate}%</p>
              <p className="text-gray-600 text-sm">Payment Collection</p>
              <div className="mt-2 text-xs text-gray-500">
                {stats.fullyPaidOrders} / {stats.totalOrders} paid
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Amount */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
              <p className="text-gray-600 text-sm">Pending Collections</p>
              <div className="mt-2 text-xs text-gray-500">
                {stats.pendingPaymentOrders} orders pending
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-gray-600 text-sm">Total Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCollected)}</p>
              <p className="text-gray-600 text-sm">Collected</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOutstanding)}</p>
              <p className="text-gray-600 text-sm">Outstanding</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{stats.totalOrders}</p>
              <p className="text-blue-700 text-sm">Total Orders</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-600">{stats.confirmedOrders}</p>
              <p className="text-green-700 text-sm">Confirmed</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-xl font-bold text-yellow-600">{stats.pendingOrders}</p>
              <p className="text-yellow-700 text-sm">Pending</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-xl font-bold text-purple-600">{stats.fullyPaidOrders}</p>
              <p className="text-purple-700 text-sm">Fully Paid</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}