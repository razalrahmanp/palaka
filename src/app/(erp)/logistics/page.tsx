'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Truck, MapPin, CheckCircle, Clock, Package, Calendar, CreditCard, Search, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { Delivery as DeliveryBase, DeliveryProof } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { DeliveryDetails } from '@/components/logistics/DeliveryDetails';
import { DeliveryForm } from '@/components/logistics/DeliveryForm';

type Delivery = DeliveryBase & {
  driver?: { id: string; name: string; email?: string };
  sales_order?: {
    id: string;
    status: string;
    customer?: { id: string; name: string };
    address: string;
    expected_delivery_date?: string;
    time_slot?: string;
  };
  sales_order_id?: string;
  customer_name?: string;
  delivery_address?: string;
  driver_name?: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  collected_amount?: number;
  collected_by?: string;
  collection_date?: string;
  collection_notes?: string;
  delivered_to?: string;
};

type ReadyOrder = {
  id: string;
  status: string;
  address: string;
  expected_delivery_date: string;
  final_price: number;
  notes: string;
  created_at: string;
  sales_representative_id?: string;
  customers: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  sales_representative?: {
    id: string;
    email?: string;
    employees?: Array<{
      id: string;
      name: string;
      phone?: string;
    }>;
  };
};

type OrderItem = {
  id: string;
  name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  final_price?: number;
  discount_percentage?: number;
  supplier_name?: string;
  is_custom_product?: boolean;
  needs_manufacturing?: boolean;
  product_type?: 'custom' | 'manufacturing' | 'standard';
  custom_config?: Record<string, unknown>;
  bom_info?: { id: string; component: string; quantity: number }[];
  description?: string;
  products?: {
    name: string;
    sku?: string;
    price: number;
  };
};

type PaymentSummary = {
  total_amount: number;
  total_paid: number;
  balance: number;
  payment_status: string;
  payments: {
    id: string;
    amount: number;
    method: string;
    payment_date: string;
    reference?: string;
  }[];
};

type FinanceDetails = {
  is_financed: boolean;
  emi_enabled?: boolean;
  emi_plan?: Record<string, unknown>;
  emi_monthly?: number;
  bajaj_finance_amount?: number;
  finance_type?: 'bajaj' | 'other';
};

type SelectedOrder = ReadyOrder & {
  items?: OrderItem[];
  payment_summary?: PaymentSummary;
  finance_details?: FinanceDetails;
  has_custom_products?: boolean;
  has_manufacturing_items?: boolean;
  requires_special_handling?: boolean;
};

export default function LogisticsPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [readyOrders, setReadyOrders] = useState<ReadyOrder[]>([]);
  const [selected, setSelected] = useState<Delivery|null>(null);
  const [open, setOpen] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  const [expandedActiveDeliveryId, setExpandedActiveDeliveryId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<string, SelectedOrder>>({});
  const [deliveryDetails, setDeliveryDetails] = useState<Record<string, { 
    items: OrderItem[], 
    proofs: DeliveryProof[],
    payment_summary?: PaymentSummary,
    finance_details?: FinanceDetails 
  }>>({});
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<string>('all');
  
  // Delivered tab filters
  const [deliveredSearchQuery, setDeliveredSearchQuery] = useState('');
  const [deliveredDateFilter, setDeliveredDateFilter] = useState<string>('all');
  
  // Active tab tracking
  const [activeTab, setActiveTab] = useState('ready');
  
  // memoize once so `user` reference never changes
  const [user] = useState(getCurrentUser);

  const fetchDeliveries = useCallback(async () => {
    const url = user?.role === 'Delivery Driver'
      ? `/api/logistics/deliveries?driver_id=${user.id}`
      : '/api/logistics/deliveries';
    const data: Delivery[] = await fetch(url).then(r => r.json());
    setDeliveries(data);
  }, [user]);

  const fetchReadyOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/logistics/ready-for-delivery');
      const data = await response.json();
      setReadyOrders(data.ready_for_delivery || []);
    } catch (error) {
      console.error('Error fetching ready orders:', error);
      setReadyOrders([]);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchDeliveries(), fetchReadyOrders()]);
  }, [fetchDeliveries, fetchReadyOrders]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateStatus = async (id: string, status: Delivery['status']) => {
    await fetch('/api/logistics/deliveries', {
      method: 'PUT',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ id, status })
    });
    fetchAll();
  };

  const toggleOrderRow = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderId);

    // Fetch order details if not already loaded
    if (!orderDetails[orderId]) {
      try {
        const response = await fetch(`/api/sales/orders/${orderId}`);
        const orderData = await response.json();
        setOrderDetails(prev => ({ ...prev, [orderId]: orderData }));
      } catch (error) {
        console.error('Error fetching order details:', error);
      }
    }
  };

  const toggleDeliveryRow = async (deliveryId: string, salesOrderId?: string) => {
    if (expandedDeliveryId === deliveryId) {
      setExpandedDeliveryId(null);
      return;
    }

    setExpandedDeliveryId(deliveryId);

    // Fetch delivery details if not already loaded
    if (!deliveryDetails[deliveryId] && salesOrderId) {
      try {
        const [itemsResponse, proofsResponse] = await Promise.all([
          fetch(`/api/sales/orders/${salesOrderId}`),
          fetch(`/api/logistics/proofs?delivery_id=${deliveryId}`)
        ]);
        
        const orderData = await itemsResponse.json();
        const proofsData = await proofsResponse.json();
        
        setDeliveryDetails(prev => ({ 
          ...prev, 
          [deliveryId]: { 
            items: orderData.items || [], 
            proofs: proofsData || [],
            payment_summary: orderData.payment_summary,
            finance_details: orderData.finance_details
          } 
        }));
      } catch (error) {
        console.error('Error fetching delivery details:', error);
      }
    }
  };

  // Filter ready orders based on filters
  const filteredReadyOrders = readyOrders.filter(order => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCustomer = order.customers?.name?.toLowerCase().includes(query);
      const matchesPhone = order.customers?.phone?.toLowerCase().includes(query);
      const matchesAddress = order.address?.toLowerCase().includes(query) || 
                            order.customers?.address?.toLowerCase().includes(query);
      if (!matchesCustomer && !matchesPhone && !matchesAddress) return false;
    }

    // Sales rep filter
    if (salesRepFilter !== 'all') {
      const repName = order.sales_representative?.employees?.[0]?.name || 'Not assigned';
      if (repName !== salesRepFilter) return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const expectedDate = new Date(order.expected_delivery_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (dateFilter) {
        case 'today':
          const todayEnd = new Date(today);
          todayEnd.setHours(23, 59, 59, 999);
          if (expectedDate < today || expectedDate > todayEnd) return false;
          break;
        case 'tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowEnd = new Date(tomorrow);
          tomorrowEnd.setHours(23, 59, 59, 999);
          if (expectedDate < tomorrow || expectedDate > tomorrowEnd) return false;
          break;
        case 'week':
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          if (expectedDate < today || expectedDate > weekEnd) return false;
          break;
        case 'overdue':
          if (expectedDate >= today) return false;
          break;
      }
    }

    // Amount filter
    if (amountFilter !== 'all') {
      const amount = order.final_price;
      switch (amountFilter) {
        case '0-5000':
          if (amount >= 5000) return false;
          break;
        case '5000-20000':
          if (amount < 5000 || amount >= 20000) return false;
          break;
        case '20000-50000':
          if (amount < 20000 || amount >= 50000) return false;
          break;
        case '50000+':
          if (amount < 50000) return false;
          break;
      }
    }

    return true;
  });

  // Filter delivered deliveries
  const filteredDeliveredOrders = deliveries
    .filter(d => d.status === 'delivered')
    .filter(delivery => {
      // Search filter
      if (deliveredSearchQuery) {
        const query = deliveredSearchQuery.toLowerCase();
        const matchesCustomer = delivery.customer_name?.toLowerCase().includes(query);
        const matchesAddress = delivery.delivery_address?.toLowerCase().includes(query);
        const matchesDriver = delivery.driver_name?.toLowerCase().includes(query);
        if (!matchesCustomer && !matchesAddress && !matchesDriver) return false;
      }

      // Date filter
      if (deliveredDateFilter !== 'all' && delivery.actual_delivery_time) {
        const deliveryDate = new Date(delivery.actual_delivery_time);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch (deliveredDateFilter) {
          case 'today':
            const todayEnd = new Date(today);
            todayEnd.setHours(23, 59, 59, 999);
            if (deliveryDate < today || deliveryDate > todayEnd) return false;
            break;
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayEnd = new Date(yesterday);
            yesterdayEnd.setHours(23, 59, 59, 999);
            if (deliveryDate < yesterday || deliveryDate > yesterdayEnd) return false;
            break;
          case 'week':
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - 7);
            if (deliveryDate < weekStart) return false;
            break;
          case 'month':
            const monthStart = new Date(today);
            monthStart.setDate(monthStart.getDate() - 30);
            if (deliveryDate < monthStart) return false;
            break;
        }
      }

      return true;
    });

  // Filter active deliveries (for deliveries tab)
  const filteredActiveDeliveries = deliveries.filter(delivery => {
    // Only show non-delivered for active tab
    if (activeTab === 'deliveries' && delivery.status === 'delivered') return false;
    
    // Search filter (use same searchQuery as ready tab)
    if (activeTab === 'deliveries' && searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesCustomer = delivery.customer_name?.toLowerCase().includes(query);
      const matchesAddress = delivery.delivery_address?.toLowerCase().includes(query);
      const matchesDriver = delivery.driver_name?.toLowerCase().includes(query);
      if (!matchesCustomer && !matchesAddress && !matchesDriver) return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 p-4 space-y-3">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Ready for Delivery</p>
                <p className="text-xl font-bold text-gray-900">{readyOrders.length}</p>
              </div>
              <div className="h-9 w-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <span className="text-orange-600 font-medium">Awaiting assignment</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Deliveries</p>
                <p className="text-xl font-bold text-gray-900">{deliveries.length}</p>
              </div>
              <div className="h-9 w-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Truck className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <span className="text-green-600 font-medium">Active shipments</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">In Transit</p>
                <p className="text-xl font-bold text-gray-900">
                  {deliveries.filter(d => d.status === 'in_transit').length}
                </p>
              </div>
              <div className="h-9 w-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <span className="text-blue-600 font-medium">On the way</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Delivered</p>
                <p className="text-xl font-bold text-gray-900">
                  {deliveries.filter(d => d.status === 'delivered').length}
                </p>
              </div>
              <div className="h-9 w-9 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <span className="text-green-600 font-medium">Completed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Pending</p>
                <p className="text-xl font-bold text-gray-900">
                  {deliveries.filter(d => d.status === 'pending').length}
                </p>
              </div>
              <div className="h-9 w-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="mt-1 flex items-center text-xs">
              <span className="text-orange-600 font-medium">Awaiting pickup</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders and Deliveries Tables */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-teal-100/50 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-base font-bold text-gray-900">Logistics Operations</CardTitle>
              <CardDescription className="text-xs text-gray-600">
                Manage orders ready for delivery and active deliveries
              </CardDescription>
            </div>
            
            {/* Tab-specific Filters */}
            <div className="flex items-center gap-2">
              {/* Search - All tabs */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'ready' ? 'Search orders...' :
                    activeTab === 'deliveries' ? 'Search deliveries...' :
                    'Search delivered...'
                  }
                  value={
                    activeTab === 'ready' ? searchQuery :
                    activeTab === 'deliveries' ? searchQuery :
                    deliveredSearchQuery
                  }
                  onChange={(e) => {
                    if (activeTab === 'ready') setSearchQuery(e.target.value);
                    else if (activeTab === 'deliveries') setSearchQuery(e.target.value);
                    else setDeliveredSearchQuery(e.target.value);
                  }}
                  className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent w-48"
                />
              </div>
              
              {/* Date Filter */}
              <select
                value={activeTab === 'delivered' ? deliveredDateFilter : dateFilter}
                onChange={(e) => {
                  if (activeTab === 'delivered') {
                    setDeliveredDateFilter(e.target.value);
                  } else {
                    setDateFilter(e.target.value);
                  }
                }}
                className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                aria-label="Filter by date"
              >
                {activeTab === 'delivered' ? (
                  <>
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </>
                ) : (
                  <>
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="week">This Week</option>
                    <option value="overdue">Overdue</option>
                  </>
                )}
              </select>

              {/* Additional filters for Ready tab */}
              {activeTab === 'ready' && (
                <>
                  <select
                    value={salesRepFilter}
                    onChange={(e) => setSalesRepFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    aria-label="Filter by sales rep"
                  >
                    <option value="all">All Sales Reps</option>
                    {Array.from(new Set(readyOrders.map(o => 
                      o.sales_representative?.employees?.[0]?.name || 'Not assigned'
                    ))).map(rep => (
                      <option key={rep} value={rep}>{rep}</option>
                    ))}
                  </select>

                  <select
                    value={amountFilter}
                    onChange={(e) => setAmountFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    aria-label="Filter by amount"
                  >
                    <option value="all">All Amounts</option>
                    <option value="0-5000">₹0 - ₹5,000</option>
                    <option value="5000-20000">₹5,000 - ₹20,000</option>
                    <option value="20000-50000">₹20,000 - ₹50,000</option>
                    <option value="50000+">₹50,000+</option>
                  </select>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <Tabs defaultValue="ready" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-3 h-9">
              <TabsTrigger value="ready" className="flex items-center gap-2 text-xs">
                <Package className="h-3 w-3" />
                Ready for Delivery ({filteredReadyOrders.length})
              </TabsTrigger>
              <TabsTrigger value="deliveries" className="flex items-center gap-2 text-xs">
                <Truck className="h-3 w-3" />
                Active Deliveries ({filteredActiveDeliveries.length})
              </TabsTrigger>
              <TabsTrigger value="delivered" className="flex items-center gap-2 text-xs">
                <CheckCircle className="h-3 w-3" />
                Delivered ({filteredDeliveredOrders.length})
              </TabsTrigger>
            </TabsList>

            {/* Ready for Delivery Tab */}
            <TabsContent value="ready" className="space-y-3">
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold text-gray-700 py-3 text-xs">Customer Name</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs">Address</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs">Sales Rep</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs">Expected Date</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs">Amount</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReadyOrders.map(order => {
                      const isExpanded = expandedOrderId === order.id;
                      const details = orderDetails[order.id];

                      return (
                        <React.Fragment key={order.id}>
                          <TableRow 
                            className="hover:bg-orange-50/50 transition-colors border-gray-100 cursor-pointer"
                            onClick={() => toggleOrderRow(order.id)}
                          >
                            <TableCell className="py-3">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                  {order.customers?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-900 text-sm">{order.customers?.name || '—'}</span>
                                  {order.customers?.phone && (
                                    <p className="text-xs text-gray-500">📞 {order.customers.phone}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="max-w-xs">
                                <span className="text-xs text-gray-600 line-clamp-2">
                                  {order.address || order.customers?.address || '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div>
                                {order.sales_representative?.employees?.[0] ? (
                                  <>
                                    <span className="text-sm font-medium text-gray-900">{order.sales_representative.employees[0].name}</span>
                                    {order.sales_representative.employees[0].phone && (
                                      <p className="text-xs text-gray-500">📞 {order.sales_representative.employees[0].phone}</p>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-400 italic">Not assigned</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-600">
                                  {order.expected_delivery_date 
                                    ? new Date(order.expected_delivery_date).toLocaleDateString()
                                    : '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3">
                              <span className="font-medium text-gray-900 text-sm">
                                ₹{order.final_price?.toLocaleString() || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="py-3">
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-2 py-0.5 rounded-full font-medium text-xs">
                                {order.status}
                              </Badge>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Row Details */}
                          {isExpanded && (
                            <TableRow>
                              <TableCell colSpan={6} className="bg-gray-50 p-6">
                                {details ? (
                                  <div className="space-y-6">
                                    {/* Horizontal Layout: Order Items and Payment Summary */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                                      {/* Order Items - Takes 2 columns */}
                                      <div className="lg:col-span-2 h-full">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                          <Package className="h-5 w-5 mr-2 text-blue-600" />
                                          Order Items
                                        </h3>
                                        <div className="overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-blue-50/80 to-purple-50/80 backdrop-blur-sm shadow-lg">
                                          <Table>
                                            <TableHeader className="bg-white/50 backdrop-blur-sm">
                                              <TableRow className="border-white/30">
                                                <TableHead className="text-gray-700 font-semibold py-2">Item</TableHead>
                                                <TableHead className="text-gray-700 font-semibold py-2">SKU</TableHead>
                                                <TableHead className="text-gray-700 font-semibold text-right py-2">Quantity</TableHead>
                                                <TableHead className="text-gray-700 font-semibold text-right py-2">Unit Price</TableHead>
                                                <TableHead className="text-gray-700 font-semibold text-right py-2">Total</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {details.items?.map(item => (
                                                <TableRow key={item.id} className="border-white/20 hover:bg-white/30 transition-colors">
                                                  <TableCell>
                                                    <div className="font-medium text-gray-900">{item.name || '—'}</div>
                                                    {item.supplier_name && (
                                                      <div className="text-xs text-gray-600">Supplier: {item.supplier_name}</div>
                                                    )}
                                                  </TableCell>
                                                  <TableCell>
                                                    <span className="text-sm text-gray-600 font-mono">{item.sku || '—'}</span>
                                                  </TableCell>
                                                  <TableCell className="text-right text-gray-900 font-medium">{item.quantity}</TableCell>
                                                  <TableCell className="text-right text-gray-900 font-medium">₹{item.unit_price?.toLocaleString()}</TableCell>
                                                  <TableCell className="text-right font-bold text-gray-900">
                                                    ₹{(item.quantity * item.unit_price).toLocaleString()}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        </div>
                                      </div>

                                      {/* Payment Summary - Takes 1 column */}
                                      {details.payment_summary && (
                                        <div className="lg:col-span-1">
                                          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                            <CreditCard className="h-5 w-5 mr-2 text-green-600" />
                                            Payment Summary
                                          </h3>
                                          <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
                                            {/* Total Amount */}
                                            <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-gray-200 p-4">
                                              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100/30 rounded-full -mr-10 -mt-10"></div>
                                              <div className="relative z-10 flex items-center justify-between">
                                                <div>
                                                  <div className="text-gray-600 text-xs font-medium uppercase tracking-wide mb-1">Total Amount</div>
                                                  <div className="text-gray-900 text-2xl font-bold">
                                                    ₹{details.payment_summary.total_amount?.toLocaleString()}
                                                  </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                                  <span className="text-white text-lg font-bold">₹</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Paid */}
                                            <div className="relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200 p-4">
                                              <div className="absolute top-0 right-0 w-20 h-20 bg-green-100/30 rounded-full -mr-10 -mt-10"></div>
                                              <div className="relative z-10 flex items-center justify-between">
                                                <div>
                                                  <div className="text-gray-600 text-xs font-medium uppercase tracking-wide mb-1">Paid</div>
                                                  <div className="text-green-700 text-2xl font-bold">
                                                    ₹{details.payment_summary.total_paid?.toLocaleString()}
                                                  </div>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                                                  <CheckCircle className="h-5 w-5 text-white" />
                                                </div>
                                              </div>
                                            </div>

                                            {/* Balance */}
                                            <div className={`relative overflow-hidden p-4 ${
                                              (details.payment_summary.balance || 0) > 0 
                                                ? 'bg-gradient-to-r from-red-50 to-rose-50' 
                                                : 'bg-gradient-to-r from-green-50 to-emerald-50'
                                            }`}>
                                              <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -mr-10 -mt-10 ${
                                                (details.payment_summary.balance || 0) > 0 ? 'bg-red-100/30' : 'bg-green-100/30'
                                              }`}></div>
                                              <div className="relative z-10 flex items-center justify-between">
                                                <div>
                                                  <div className="text-gray-600 text-xs font-medium uppercase tracking-wide mb-1">Balance</div>
                                                  <div className={`text-2xl font-bold ${
                                                    (details.payment_summary.balance || 0) > 0 ? 'text-red-700' : 'text-green-700'
                                                  }`}>
                                                    ₹{details.payment_summary.balance?.toLocaleString()}
                                                  </div>
                                                </div>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                  (details.payment_summary.balance || 0) > 0 ? 'bg-red-500' : 'bg-green-500'
                                                }`}>
                                                  {(details.payment_summary.balance || 0) > 0 ? (
                                                    <Clock className="h-5 w-5 text-white" />
                                                  ) : (
                                                    <CheckCircle className="h-5 w-5 text-white" />
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Order Notes */}
                                    {order.notes && (
                                      <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                                        <div className="rounded-xl bg-gradient-to-br from-amber-50/80 to-orange-50/80 backdrop-blur-sm border border-white/20 shadow-lg p-4">
                                          <p className="text-gray-700 text-sm leading-relaxed">{order.notes}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="text-gray-500">Loading order details...</div>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {readyOrders.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders ready for delivery</h3>
                  <p className="text-gray-500">Orders will appear here when they are confirmed or shipped</p>
                </div>
              )}
            </TabsContent>

            {/* Active Deliveries Tab */}
            <TabsContent value="deliveries" className="space-y-4">
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow className="border-gray-200">
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                      <TableHead className="font-semibold text-gray-700">Address</TableHead>
                      <TableHead className="font-semibold text-gray-700">Delivery Date</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredActiveDeliveries.map(d => {
                      const isExpanded = expandedActiveDeliveryId === d.id;

                      return (
                        <React.Fragment key={d.id}>
                          <TableRow 
                            className="hover:bg-teal-50/50 transition-colors border-gray-100 cursor-pointer"
                            onClick={() => setExpandedActiveDeliveryId(isExpanded ? null : d.id)}
                          >
                            <TableCell className="py-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedActiveDeliveryId(isExpanded ? null : d.id);
                                }}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                  {(d.sales_order?.customer?.name || d.customer_name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-900">
                                  {d.sales_order?.customer?.name ?? d.customer_name ?? '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="text-sm text-gray-600">
                                {d.delivery_address ?? d.sales_order?.address ?? '—'}
                              </span>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {d.estimated_delivery_time 
                                    ? new Date(d.estimated_delivery_time).toLocaleDateString('en-IN', {
                                        dateStyle: 'medium'
                                      })
                                    : d.sales_order?.expected_delivery_date 
                                    ? new Date(d.sales_order.expected_delivery_date).toLocaleDateString('en-IN', {
                                        dateStyle: 'medium'
                                      })
                                    : '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge 
                                className={`${
                                  d.status === 'delivered' 
                                    ? 'bg-green-100 text-green-800 border-green-200' 
                                    : d.status === 'in_transit'
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : d.status === 'pending'
                                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                                    : 'bg-gray-100 text-gray-800 border-gray-200'
                                } px-3 py-1 rounded-full font-medium`}
                              >
                                {d.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Row with Delivery Details */}
                          {isExpanded && (
                            <TableRow className="bg-teal-50/30">
                              <TableCell colSpan={5} className="p-6">
                                <DeliveryDetails 
                                  delivery={d} 
                                  onUpdateStatus={updateStatus} 
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {deliveries.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Truck className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No deliveries scheduled</h3>
                  <p className="text-gray-500 mb-4">Start managing your delivery operations</p>
                  {user?.permissions.includes('delivery:create') && (
                    <Button 
                      onClick={() => { setSelected(null); setOpen(true); }}
                      className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Create Delivery
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Delivered Orders Tab */}
            <TabsContent value="delivered" className="space-y-4">
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold text-gray-700 py-4 w-12"></TableHead>
                      <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                      <TableHead className="font-semibold text-gray-700">Delivered Date</TableHead>
                      <TableHead className="font-semibold text-gray-700">Driver</TableHead>
                      <TableHead className="font-semibold text-gray-700">Amount Collected</TableHead>
                      <TableHead className="font-semibold text-gray-700">Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeliveredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No delivered orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDeliveredOrders.map(d => {
                      const isExpanded = expandedDeliveryId === d.id;
                      const details = deliveryDetails[d.id];
                      
                      return (
                        <React.Fragment key={d.id}>
                          <TableRow 
                            className="hover:bg-green-50/50 transition-colors border-gray-100 cursor-pointer"
                            onClick={() => toggleDeliveryRow(d.id, d.sales_order_id)}
                          >
                            <TableCell className="py-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleDeliveryRow(d.id, d.sales_order_id);
                                }}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                  {(d.sales_order?.customer?.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {d.sales_order?.customer?.name ?? d.customer_name ?? '—'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {d.sales_order?.address ?? d.delivery_address ?? '—'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                  {d.actual_delivery_time 
                                    ? new Date(d.actual_delivery_time).toLocaleString('en-IN', {
                                        dateStyle: 'medium',
                                        timeStyle: 'short'
                                      })
                                    : new Date(d.updated_at).toLocaleDateString('en-IN', {
                                        dateStyle: 'medium'
                                      })
                                  }
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="text-sm text-gray-900">
                                {d.driver?.email ?? d.driver_name ?? '—'}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              {d.collected_amount != null ? (
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-green-600" />
                                  <span className="font-semibold text-green-700">
                                    ₹{Number(d.collected_amount).toLocaleString('en-IN')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">Not collected</span>
                              )}
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge 
                                variant="outline"
                                className="bg-blue-50 text-blue-700 border-blue-200"
                              >
                                {details?.items?.length ?? '—'} items
                              </Badge>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Row with Items and Images */}
                          {isExpanded && (
                            <TableRow className="bg-green-50/30">
                              <TableCell colSpan={6} className="py-6">
                                <div className="space-y-6">
                                  {/* Delivery Summary */}
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                      <Truck className="h-4 w-4" />
                                      Delivery Details
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Delivery ID</div>
                                        <div className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">
                                          {d.id.substring(0, 8)}...
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Delivered To</div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {d.delivered_to ?? d.sales_order?.customer?.name ?? '—'}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Collected By</div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {d.collection_notes ?? 'N/A'}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">Payment Status</div>
                                        <Badge variant="outline" className={
                                          d.collected_amount 
                                            ? 'bg-green-50 text-green-700 border-green-200'
                                            : 'bg-gray-50 text-gray-700 border-gray-200'
                                        }>
                                          {d.collected_amount ? 'Collected' : 'Not Collected'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Order Items */}
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                      <Package className="h-4 w-4" />
                                      Delivered Items
                                    </h4>
                                    {details?.items && details.items.length > 0 ? (
                                      <div className="space-y-2">
                                        {details.items.map((item, idx) => {
                                          // Get item name: prefer products.name, then fall back to item.name
                                          const itemName = item.products?.name ?? item.name ?? 'Product';
                                          // Get SKU: prefer products.sku, then fall back to item.sku
                                          const itemSku = item.products?.sku ?? item.sku;
                                          
                                          // Fetch values directly from sales_order_items table
                                          const unitPrice = item.unit_price || 0; // Original unit price from DB
                                          const quantity = item.quantity || 0; // Quantity from DB
                                          const discountPercent = item.discount_percentage || 0; // Discount % from DB
                                          const finalPrice = item.final_price || 0; // Final line total from DB (after discount)
                                          
                                          return (
                                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                                              <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                  <div className="font-medium text-gray-900">
                                                    {itemName}
                                                  </div>
                                                  {itemSku && (
                                                    <div className="text-xs text-gray-500 mt-0.5">SKU: {itemSku}</div>
                                                  )}
                                                  <div className="mt-2 space-y-1">
                                                    <div className="flex items-center gap-2 text-sm">
                                                      <span className="text-gray-600">Unit Price:</span>
                                                      <span className="font-medium text-gray-900">
                                                        ₹{Number(unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                      <span className="text-gray-600">Quantity:</span>
                                                      <span className="font-medium text-gray-900">{quantity}</span>
                                                    </div>
                                                    {discountPercent > 0 && (
                                                      <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-gray-600">Discount:</span>
                                                        <span className="font-medium text-orange-600">{discountPercent}%</span>
                                                      </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-sm">
                                                      <span className="text-gray-600">Final Price:</span>
                                                      <span className="font-semibold text-green-600">
                                                        ₹{Number(finalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 bg-white rounded-lg p-4 border border-gray-200">
                                        {details ? 'No items found' : 'Loading items...'}
                                      </div>
                                    )}
                                  </div>

                                  {/* Delivery Proof Images */}
                                  <div>
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                      <ImageIcon className="h-4 w-4" />
                                      Delivery Proofs
                                    </h4>
                                    {details?.proofs && details.proofs.length > 0 ? (
                                      <div className="grid grid-cols-2 gap-3">
                                        {details.proofs.map((proof) => (
                                          <div key={proof.id} className="relative group">
                                            <Image
                                              src={proof.url}
                                              alt={proof.type}
                                              width={200}
                                              height={128}
                                              className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-green-500 transition-all"
                                            />
                                            <div className="absolute bottom-2 left-2 right-2">
                                              <Badge 
                                                variant="secondary"
                                                className="text-xs bg-black/70 text-white border-0"
                                              >
                                                {proof.type === 'delivered_item' ? 'Item Photo' : 
                                                 proof.type === 'signature' ? 'Signature' : 'Delivery Photo'}
                                              </Badge>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500 bg-white rounded-lg p-4 border border-gray-200">
                                        {details ? 'No delivery proofs uploaded' : 'Loading proofs...'}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                  {/* Payment Details Section */}
                                  {details?.payment_summary && (
                                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        Payment Details
                                      </h4>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Order Total</div>
                                          <div className="text-sm font-semibold text-gray-900">
                                            ₹{Number(details.payment_summary.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Total Paid</div>
                                          <div className="text-sm font-semibold text-green-600">
                                            ₹{Number(details.payment_summary.total_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Balance Due</div>
                                          <div className={`text-sm font-semibold ${details.payment_summary.balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                            ₹{Number(details.payment_summary.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-gray-500 mb-1">Payment Status</div>
                                          <Badge 
                                            variant="outline"
                                            className={
                                              details.payment_summary.payment_status === 'paid'
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : details.payment_summary.payment_status === 'partial'
                                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                : 'bg-red-50 text-red-700 border-red-200'
                                            }
                                          >
                                            {details.payment_summary.payment_status === 'paid' ? 'Fully Paid' :
                                             details.payment_summary.payment_status === 'partial' ? 'Partially Paid' :
                                             'Unpaid'}
                                          </Badge>
                                        </div>
                                      </div>

                                      {/* Payment History */}
                                      {details.payment_summary.payments && details.payment_summary.payments.length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium text-gray-700 mb-2">Payment History</div>
                                          <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {details.payment_summary.payments.map((payment) => (
                                              <div key={payment.id} className="flex justify-between items-center bg-gray-50 rounded p-2 text-sm">
                                                <div className="flex-1">
                                                  <div className="font-medium text-gray-900">
                                                    ₹{Number(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    {new Date(payment.payment_date).toLocaleDateString('en-IN', { 
                                                      day: 'numeric', 
                                                      month: 'short', 
                                                      year: 'numeric' 
                                                    })}
                                                  </div>
                                                </div>
                                                <Badge variant="secondary" className="text-xs">
                                                  {payment.method || 'N/A'}
                                                </Badge>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Finance Details */}
                                      {details.finance_details?.is_financed && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                          <div className="flex items-center gap-2 mb-2">
                                            <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                            <span className="text-xs font-medium text-blue-700">EMI / Financed</span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-3 text-xs">
                                            {details.finance_details.emi_monthly && (
                                              <div>
                                                <span className="text-gray-500">Monthly EMI:</span>
                                                <span className="ml-1 font-semibold text-gray-900">
                                                  ₹{Number(details.finance_details.emi_monthly).toLocaleString('en-IN')}
                                                </span>
                                              </div>
                                            )}
                                            {details.finance_details.bajaj_finance_amount && (
                                              <div>
                                                <span className="text-gray-500">Finance Amount:</span>
                                                <span className="ml-1 font-semibold text-gray-900">
                                                  ₹{Number(details.finance_details.bajaj_finance_amount).toLocaleString('en-IN')}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    }))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              {selected ? 'Delivery Details' : 'New Delivery'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selected ? (
              <DeliveryDetails delivery={selected} onUpdateStatus={updateStatus} />
            ) : (
              <DeliveryForm
                onSubmit={async data => {
                  await fetch('/api/logistics/deliveries', {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body: JSON.stringify(data)
                  });
                  setOpen(false);
                  fetchAll();
                }}
                onCancel={() => setOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
