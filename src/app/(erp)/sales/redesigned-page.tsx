'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
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
  Package
} from 'lucide-react';
import { useSalesData } from '@/components/sales/SalesDataLoader';
import { createSalesHandlers } from '@/components/sales/SalesHandlers';
import { SalesModals } from '@/components/sales/SalesModals';
import { Order, Quote } from '@/types';

export default function RedesignedSalesPage() {
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
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isOrderEditModalOpen, setIsOrderEditModalOpen] = useState(false);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { handleSaveQuote, handleDeleteOrder } = createSalesHandlers(
    currentUser,
    selectedQuote,
    refresh,
    setIsQuoteModalOpen
  );

  // Filter data based on search and status
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = !searchTerm || 
      quote.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Enhanced statistics with partial payment tracking
  const stats = {
    totalQuotes: quotes.length,
    totalOrders: orders.length,
    // Total Revenue: Only count sales orders (not quotes) to avoid double counting
    totalRevenue: orders.map(o => {
      // Check if order has final_price property (SalesOrder) or use total (regular Order)
      const orderWithFinalPrice = o as Order & { final_price?: number };
      return orderWithFinalPrice.final_price || o.total || 0;
    }).reduce((sum, amount) => sum + amount, 0),
    conversionRate: quotes.length > 0 ? Math.round((quotes.filter(q => q.status === 'Converted').length / quotes.length) * 100) : 0,
    pendingQuotes: quotes.filter(q => q.status === 'Draft' || q.status === 'Pending').length,
    confirmedOrders: orders.filter(o => o.status === 'confirmed').length,
    // Monthly Revenue: Only count orders this month (not quotes) to avoid double counting
    monthlyRevenue: orders.filter(o => 
      new Date(o.date || '').getMonth() === new Date().getMonth()
    ).map(o => {
      const orderWithFinalPrice = o as Order & { final_price?: number };
      return orderWithFinalPrice.final_price || o.total || 0;
    }).reduce((sum, amount) => sum + amount, 0),
    monthlyOrders: orders.filter(o => new Date(o.date || '').getMonth() === new Date().getMonth()).length,
    // New partial payment stats
    totalPendingPayments: quotes.reduce((sum, q) => sum + (q.remaining_balance || 0), 0),
    partialPaidQuotes: quotes.filter(q => q.payment_status === 'partial').length,
    fullyPaidQuotes: quotes.filter(q => q.payment_status === 'paid').length
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Enhanced Header */}
      <div className="mb-8">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-2">
                Sales Management Hub
              </h1>
              <p className="text-gray-600 text-lg">Comprehensive sales operations & performance analytics</p>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <Download className="mr-2 h-5 w-5" />
                Export Report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid with Partial Payments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Active Quotes</p>
                <p className="text-3xl font-bold mb-1">{stats.totalQuotes}</p>
                <p className="text-blue-100 text-sm">{stats.pendingQuotes} pending</p>
              </div>
              <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold mb-1">{stats.totalOrders}</p>
                <p className="text-green-100 text-sm">{stats.confirmedOrders} confirmed</p>
              </div>
              <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <ShoppingCart className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold mb-1">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-purple-100 text-sm">+{formatCurrency(stats.monthlyRevenue)} this month</p>
              </div>
              <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <DollarSign className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Conversion Rate</p>
                <p className="text-3xl font-bold mb-1">{stats.conversionRate}%</p>
                <p className="text-orange-100 text-sm">Quote to order</p>
              </div>
              <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <TrendingUp className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Pending Payments</p>
                <p className="text-3xl font-bold mb-1">{formatCurrency(stats.totalPendingPayments)}</p>
                <p className="text-red-100 text-sm">{stats.partialPaidQuotes} partial payments</p>
              </div>
              <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Tabs Section */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Enhanced Tab List */}
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-6 border-b border-gray-200/50">
            <TabsList className="grid w-full grid-cols-3 bg-white rounded-2xl p-1 shadow-lg border border-gray-200/50">
              <TabsTrigger 
                value="quotes" 
                className="relative rounded-xl py-3 px-4 text-sm font-semibold transition-all duration-300 
                          text-gray-600 hover:text-gray-800 hover:bg-gray-50
                          data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 
                          data-[state=active]:text-white data-[state=active]:shadow-lg 
                          data-[state=active]:transform data-[state=active]:scale-105"
              >
                <FileText className="mr-2 h-4 w-4" />
                Sales Quotes
                <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs
                               data-[state=active]:bg-white/20 data-[state=active]:text-white
                               group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                  {stats.totalQuotes}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="orders" 
                className="relative rounded-xl py-3 px-4 text-sm font-semibold transition-all duration-300
                          text-gray-600 hover:text-gray-800 hover:bg-gray-50
                          data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 
                          data-[state=active]:text-white data-[state=active]:shadow-lg
                          data-[state=active]:transform data-[state=active]:scale-105"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Sales Orders
                <Badge className="ml-2 bg-green-100 text-green-800 text-xs
                               data-[state=active]:bg-white/20 data-[state=active]:text-white
                               group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                  {stats.totalOrders}
                </Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="custom" 
                className="relative rounded-xl py-3 px-4 text-sm font-semibold transition-all duration-300
                          text-gray-600 hover:text-gray-800 hover:bg-gray-50
                          data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 
                          data-[state=active]:text-white data-[state=active]:shadow-lg
                          data-[state=active]:transform data-[state=active]:scale-105"
              >
                <Package className="mr-2 h-4 w-4" />
                Custom Orders
                <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs
                               data-[state=active]:bg-white/20 data-[state=active]:text-white
                               group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white">
                  New
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search and Filter Bar */}
          <div className="p-6 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search by customer name, ID, or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white/80 backdrop-blur-sm"
                  aria-label="Filter by status"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="delivered">Delivered</option>
                  <option value="rejected">Rejected</option>
                </select>
                <Button variant="outline" className="rounded-xl border-gray-200 hover:bg-gray-50">
                  <Filter className="h-5 w-5" />
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => {
                    if (activeTab === 'quotes') {
                      setSelectedQuote(null);
                      setIsQuoteModalOpen(true);
                    } else if (activeTab === 'orders') {
                      setSelectedOrder(null);
                      setIsOrderModalOpen(true);
                    }
                  }}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  {activeTab === 'quotes' ? 'New Quote' : activeTab === 'orders' ? 'New Order' : 'Create Custom Order'}
                </Button>
              </div>
            </div>
          </div>

          {/* Tab Contents */}
          <div className="p-6">
            <TabsContent value="quotes" className="mt-0">
              <QuotesTabContent 
                quotes={filteredQuotes}
                onView={(quote) => {
                  setSelectedQuote(quote);
                  setIsQuoteModalOpen(true);
                }}
                onEdit={(quote) => {
                  setSelectedQuote(quote);
                  setIsQuoteModalOpen(true);
                }}
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
                  setIsOrderEditModalOpen(true);
                }}
                onDelete={handleDeleteOrder}
                formatCurrency={formatCurrency}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="custom" className="mt-0">
              <CustomOrdersTabContent />
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
        isOrderEditModalOpen={isOrderEditModalOpen}
        setIsOrderEditModalOpen={setIsOrderEditModalOpen}
        selectedQuote={selectedQuote}
        selectedOrder={selectedOrder}
        customers={customers}
        products={products}
        currentUser={currentUser}
        handleSaveQuote={handleSaveQuote}
        refresh={refresh}
      />
    </div>
  );
}

// Quotes Tab Component
function QuotesTabContent({ 
  quotes, 
  onView,
  onEdit, 
  formatCurrency, 
  getStatusColor 
}: {
  quotes: Quote[];
  onView: (quote: Quote) => void;
  onEdit: (quote: Quote) => void;
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {quotes.map((quote) => (
        <Card key={quote.id} className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">
                Quote #{quote.id?.slice(-8)}
              </CardTitle>
              <Badge className={getStatusColor(quote.status || '')}>
                {quote.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 flex items-center">
              <User className="mr-1 h-4 w-4" />
              {quote.customer}
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Price Information */}
              <div className="bg-gray-50 rounded-xl p-4">
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
                    <div className="p-2 bg-red-50 rounded-lg">
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
                      <div className="text-xs text-green-600 mt-1 font-medium">
                        You Save: {formatCurrency(quote.discount_amount || 0)}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Standard display for quotes without discounts
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Original Price</p>
                      <p className="font-semibold text-gray-800">{formatCurrency(quote.original_price || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Final Price</p>
                      <p className="font-bold text-green-600">{formatCurrency(quote.final_price || quote.total_price || 0)}</p>
                    </div>
                  </div>
                )}
                
                {/* Keep the old discount display for fallback */}
                {(quote.discount_amount || 0) > 0 && !(quote.original_price && quote.final_price) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 flex items-center">
                        <Percent className="mr-1 h-4 w-4" />
                        Discount Applied
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        -{formatCurrency(quote.discount_amount || 0)}
                      </span>
                    </div>
                  </div>
                )}

                {quote.emi_enabled && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 flex items-center">
                        <CreditCard className="mr-1 h-4 w-4" />
                        EMI Available
                      </span>
                      <span className="text-sm font-semibold text-blue-600">
                        {formatCurrency(quote.emi_monthly || 0)}/month
                      </span>
                    </div>
                  </div>
                )}

                {(quote.freight_charges || 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 flex items-center">
                        <Truck className="mr-1 h-4 w-4" />
                        Freight
                      </span>
                      <span className="text-sm font-semibold text-gray-600">
                        {formatCurrency(quote.freight_charges || 0)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Payment Status Section */}
                {quote.payment_status && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center">
                        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        Payment Status
                      </span>
                      <Badge className={
                        quote.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        quote.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        quote.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {quote.payment_status?.toUpperCase()}
                      </Badge>
                    </div>
                    
                    {quote.payment_status === 'partial' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Paid: {formatCurrency(quote.total_paid || 0)}</span>
                          <span className="text-red-600">Remaining: {formatCurrency(quote.remaining_balance || 0)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300 payment-progress-bar`}
                            data-width={Math.min(100, Math.max(0, ((quote.total_paid || 0) / ((quote.final_price || quote.total_price) || 1)) * 100))}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Payment History Summary */}
                    {quote.payment_history && quote.payment_history.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">
                          Last payment: {formatCurrency(quote.payment_history[quote.payment_history.length - 1]?.amount || 0)} 
                          {quote.payment_history[quote.payment_history.length - 1]?.date && 
                            ` on ${new Date(quote.payment_history[quote.payment_history.length - 1].date).toLocaleDateString()}`
                          }
                        </div>
                        <div className="text-xs text-blue-600 cursor-pointer hover:underline">
                          View {quote.payment_history.length} payment{quote.payment_history.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    onClick={() => onView(quote)}
                  >
                    <Eye className="mr-1 h-4 w-4" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-lg hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                    onClick={() => onEdit(quote)}
                  >
                    <Edit className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                </div>

                {/* Payment Actions */}
                {quote.status === 'Approved' && quote.payment_status !== 'paid' && (
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg shadow-md"
                    onClick={() => {
                      // TODO: Open payment collection modal
                      console.log('Collect payment for quote:', quote.id);
                    }}
                  >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    {quote.payment_status === 'partial' ? 'Collect Remaining' : 'Collect Payment'}
                  </Button>
                )}
              </div>

              {quote.notes && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600 bg-yellow-50 p-2 rounded-lg">
                    📝 {quote.notes}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Orders Tab Component
function OrdersTabContent({ 
  orders, 
  onView,
  onEdit, 
  onDelete, 
  formatCurrency, 
  getStatusColor 
}: {
  orders: Order[];
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {orders.map((order) => (
        <Card key={order.id} className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-800">
                Order #{order.id?.slice(-8)}
              </CardTitle>
              <Badge className={getStatusColor(order.status || '')}>
                {order.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 flex items-center">
              <User className="mr-1 h-4 w-4" />
              {order.customer}
            </p>
            {order.date && (
              <p className="text-xs text-gray-500 flex items-center">
                <Calendar className="mr-1 h-3 w-3" />
                {new Date(order.date).toLocaleDateString()}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
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

                {/* Payment Status and Tracking */}
                {(() => {
                  const orderWithPayment = order as Order & { 
                    payment_status?: 'paid' | 'partial' | 'pending' | 'overdue',
                    total_paid?: number,
                    remaining_balance?: number,
                    final_price?: number,
                    payment_history?: Array<{method: string, amount: number, date: string, reference?: string}>
                  };
                  
                  return orderWithPayment.payment_status && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Payment Status</span>
                        <Badge className={
                          orderWithPayment.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          orderWithPayment.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          orderWithPayment.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }>
                          {orderWithPayment.payment_status?.toUpperCase()}
                        </Badge>
                      </div>
                      
                      {orderWithPayment.payment_status === 'partial' && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Paid: {formatCurrency(orderWithPayment.total_paid || 0)}</span>
                            <span className="text-red-600">Remaining: {formatCurrency(orderWithPayment.remaining_balance || 0)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, Math.max(0, ((orderWithPayment.total_paid || 0) / ((orderWithPayment.final_price || order.total) || 1)) * 100))}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {orderWithPayment.payment_history && orderWithPayment.payment_history.length > 0 && (
                        <div className="mt-2 text-xs text-blue-600">
                          📋 View {orderWithPayment.payment_history.length} payment{orderWithPayment.payment_history.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Collect Payment Button for Unpaid Orders */}
                {(() => {
                  const orderWithPayment = order as Order & { payment_status?: string };
                  return order.status === 'confirmed' && orderWithPayment.payment_status !== 'paid' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Button 
                        size="sm" 
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg"
                      >
                        <CreditCard className="mr-2 h-4 w-4" />
                        {orderWithPayment.payment_status === 'partial' ? 'Collect Remaining' : 'Collect Payment'}
                      </Button>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Custom Orders Tab Component
function CustomOrdersTabContent() {
  return (
    <div className="space-y-6">
      {/* Custom Order Creation Form */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
            <Package className="mr-2 h-6 w-6 text-purple-600" />
            Create Custom Purchase Order
          </CardTitle>
          <p className="text-gray-600">Design custom furniture orders and generate purchase orders automatically</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="h-24 w-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Custom Order Builder</h3>
            <p className="text-gray-600 mb-6">Create specialized furniture orders with custom specifications</p>
            <Button 
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="mr-2 h-5 w-5" />
              Start Custom Order
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for Custom Orders List */}
      <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">Recent Custom Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">No custom orders yet. Create your first custom order above.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
