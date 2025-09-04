'use client';
import React, { useState } from 'react';
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
  Plus, 
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
  Settings,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { useSalesDataFixed as useSalesData } from '@/components/sales/SalesDataLoaderFixed';
import { createSalesHandlers } from '@/components/sales/SalesHandlers';
import { SalesModals } from '@/components/sales/SalesModals';
import QuoteDetails from '@/components/sales/QuoteDetails';
import { Order, Quote } from '@/types';
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
    if (!dateString) return false;
    
    const itemDate = new Date(dateString);
    const now = new Date();
    
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
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesTime = filterByTimePeriod(order, timeFilter);
    return matchesSearch && matchesStatus && matchesTime;
  });

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
    
    // Use filtered data for calculations
    const ordersWithPayment = filteredOrders as OrderWithPayment[];
    const quotesFiltered = filteredQuotes;
    
    // Debug logging
    console.log(`📈 Sales stats: timeFilter=${timeFilter}, totalOrders=${orders.length}, filteredOrders=${ordersWithPayment.length}, totalQuotes=${quotes.length}, filteredQuotes=${quotesFiltered.length}`);
    console.log(`💰 Profit calculation: Using final_price (actual amount received) - cost`);
    
    // Basic counts
    const totalQuotes = quotesFiltered.length;
    const totalOrders = ordersWithPayment.length;
    
    // Revenue calculations using actual payment data
    const totalRevenue = ordersWithPayment.reduce((sum, order) => {
      return sum + (order.final_price || order.total || 0);
    }, 0);
    
    // Total amount actually collected (real payments)
    const totalCollected = ordersWithPayment.reduce((sum, order) => {
      return sum + (order.total_paid || 0);
    }, 0);
    
    // Outstanding balance across all orders
    const totalOutstanding = ordersWithPayment.reduce((sum, order) => {
      return sum + (order.balance_due || 0);
    }, 0);
    
    // Payment status breakdown
    const fullyPaidOrders = ordersWithPayment.filter(order => order.payment_status === 'paid').length;
    const partialPaidOrders = ordersWithPayment.filter(order => order.payment_status === 'partial').length;
    const pendingPaymentOrders = ordersWithPayment.filter(order => order.payment_status === 'pending').length;
    
    // Quote conversion metrics
    const conversionRate = totalQuotes > 0 ? Math.round((quotes.filter(q => q.status === 'Converted').length / totalQuotes) * 100) : 0;
    const pendingQuotes = quotes.filter(q => q.status === 'Draft' || q.status === 'Pending').length;
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
    
    const monthlyCollected = monthlyOrders.reduce((sum, order) => {
      return sum + (order.total_paid || 0);
    }, 0);
    
    // Collection rate
    const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0;
    
    // Average order value for paid orders
    const paidOrders = ordersWithPayment.filter(order => order.payment_status === 'paid');
    const averageOrderValue = paidOrders.length > 0
      ? paidOrders.reduce((sum, order) => sum + (order.final_price || order.total || 0), 0) / paidOrders.length
      : 0;
    
    // Legacy fields for compatibility (using quote data)
    const totalPendingPayments = quotes.reduce((sum, q) => sum + (q.remaining_balance || 0), 0);
    const partialPaidQuotes = quotes.filter(q => q.payment_status === 'partial').length;
    const fullyPaidQuotes = quotes.filter(q => q.payment_status === 'paid').length;
    
    // Additional required fields
    const pendingOrders = ordersWithPayment.filter(o => o.status === 'draft').length; // using 'draft' as pending equivalent
    const convertedQuotes = quotesFiltered.filter(q => q.status === 'Converted').length;
    
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
      monthlyCollected,
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
      profitMargin
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

      {/* Filter Controls */}
      <div className="mb-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Time Period:</span>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-32">
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
            
            <div className="text-sm text-gray-500">
              Showing {timeFilter === 'all' ? 'all' : timeFilter} sales data
            </div>
          </div>
        </div>
      </div>

      {/* Compact Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs font-medium">Active Quotes</p>
                <p className="text-xl font-bold mb-1">{stats.totalQuotes}</p>
                <p className="text-blue-100 text-xs">{stats.pendingQuotes} pending</p>
              </div>
              <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs font-medium">Total Orders</p>
                <p className="text-xl font-bold mb-1">{stats.totalOrders}</p>
                <p className="text-green-100 text-xs">{stats.confirmedOrders} confirmed</p>
              </div>
              <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs font-medium">Revenue</p>
                <p className="text-xl font-bold mb-1">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-purple-100 text-xs">{stats.collectionRate}% collected</p>
              </div>
              <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs font-medium">Conversion Rate</p>
                <p className="text-xl font-bold mb-1">{stats.conversionRate}%</p>
                <p className="text-orange-100 text-xs">Quote to order</p>
              </div>
              <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs font-medium">Outstanding</p>
                <p className="text-xl font-bold mb-1">{formatCurrency(stats.totalOutstanding)}</p>
                <p className="text-red-100 text-xs">{stats.pendingPaymentOrders} pending</p>
              </div>
              <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-medium">Collected</p>
                <p className="text-xl font-bold mb-1">{formatCurrency(stats.totalCollected)}</p>
                <p className="text-emerald-100 text-xs">{stats.fullyPaidOrders} paid orders</p>
              </div>
              <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                <CreditCard className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs font-medium">Net Profit</p>
                <p className="text-xl font-bold mb-1">{formatCurrency(stats.totalProfit)}</p>
                <p className="text-indigo-100 text-xs">{stats.profitMargin}% of sales</p>
              </div>
              <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
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
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
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
                <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">More filters</span>
                </Button>
                <Button 
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                  onClick={() => {
                    if (activeTab === 'quotes') {
                      setSelectedQuote(null);
                      setIsQuoteModalOpen(true);
                    } else if (activeTab === 'orders') {
                      setSelectedOrder(null);
                      setIsOrderModalOpen(true);
                    }
                    // No action for performance tab
                  }}
                  disabled={activeTab === 'performance'}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {activeTab === 'quotes' ? 'New Quote' : activeTab === 'orders' ? 'New Order' : 'View Analytics'}
                </Button>
              </div>
            </div>
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
  onView,
  onEdit, 
  onDelete, 
  onAssignRep,
  formatCurrency, 
  getStatusColor 
}: {
  orders: Order[];
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
  onAssignRep?: (order: Order) => void;
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
}) {
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {orders.map((order) => (
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
                    className="w-full rounded-lg hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700"
                    onClick={() => onAssignRep(order)}
                  >
                    <Settings className="mr-1 h-4 w-4" />
                    Change Sales Rep
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
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