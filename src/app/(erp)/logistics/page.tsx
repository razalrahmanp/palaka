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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Plus, Truck, MapPin, CheckCircle, Clock, Package, Calendar, CreditCard, Search, Filter, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
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
    time_slot: string;
  };
  sales_order_id?: string;
  customer_name?: string;
  delivery_address?: string;
  driver_name?: string;
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
  const [orderDetails, setOrderDetails] = useState<Record<string, SelectedOrder>>({});
  const [deliveryDetails, setDeliveryDetails] = useState<Record<string, { items: OrderItem[], proofs: DeliveryProof[] }>>({});
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [salesRepFilter, setSalesRepFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<string>('all');
  
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
            proofs: proofsData || [] 
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
            <div>
              <CardTitle className="text-base font-bold text-gray-900">Logistics Operations</CardTitle>
              <CardDescription className="text-xs text-gray-600">
                Manage orders ready for delivery and active deliveries
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <Tabs defaultValue="ready" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-3 h-9">
              <TabsTrigger value="ready" className="flex items-center gap-2 text-xs">
                <Package className="h-3 w-3" />
                Ready for Delivery ({filteredReadyOrders.length})
              </TabsTrigger>
              <TabsTrigger value="deliveries" className="flex items-center gap-2 text-xs">
                <Truck className="h-3 w-3" />
                Active Deliveries ({deliveries.length})
              </TabsTrigger>
              <TabsTrigger value="delivered" className="flex items-center gap-2 text-xs">
                <CheckCircle className="h-3 w-3" />
                Delivered ({deliveries.filter(d => d.status === 'delivered').length})
              </TabsTrigger>
            </TabsList>

            {/* Ready for Delivery Tab */}
            <TabsContent value="ready" className="space-y-3">
              {/* Filters Section */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-3 rounded-lg border border-gray-200 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-3 w-3 text-gray-600" />
                  <h3 className="text-xs font-semibold text-gray-900">Filters</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search customer, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>

                  {/* Sales Rep Filter */}
                  <Select value={salesRepFilter} onValueChange={setSalesRepFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Sales Representative" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sales Reps</SelectItem>
                      {Array.from(new Set(readyOrders.map(o => 
                        o.sales_representative?.employees?.[0]?.name || 'Not assigned'
                      ))).sort().map(rep => (
                        <SelectItem key={rep} value={rep}>{rep}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Date Filter */}
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Expected Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="tomorrow">Tomorrow</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Amount Filter */}
                  <Select value={amountFilter} onValueChange={setAmountFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Amount Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Amounts</SelectItem>
                      <SelectItem value="0-5000">Under ₹5,000</SelectItem>
                      <SelectItem value="5000-20000">₹5,000 - ₹20,000</SelectItem>
                      <SelectItem value="20000-50000">₹20,000 - ₹50,000</SelectItem>
                      <SelectItem value="50000+">Above ₹50,000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

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
                      <TableHead className="font-semibold text-gray-700 py-4">Delivery ID</TableHead>
                      <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                      <TableHead className="font-semibold text-gray-700">Address</TableHead>
                      <TableHead className="font-semibold text-gray-700">Delivery Date</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map(d => (
                      <TableRow key={d.id} className="hover:bg-teal-50/50 transition-colors border-gray-100">
                        <TableCell className="py-4">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {d.id}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {(d.sales_order?.customer?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-900">
                              {d.sales_order?.customer?.name ?? '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-sm text-gray-600">
                            {d.sales_order?.address ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-sm text-gray-600">
                            {d.time_slot ?? '—'}
                          </span>
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
                        <TableCell className="py-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setSelected(d); setOpen(true); }}
                            className="h-8 w-8 p-0 hover:bg-teal-100 hover:text-teal-600 transition-colors rounded-lg"
                          >
                            <Eye className="h-4 w-4"/>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
                    {deliveries.filter(d => d.status === 'delivered').map(d => {
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
                                          
                                          // Calculate price per unit and line total
                                          // API returns final_price as LINE TOTAL (already multiplied by quantity)
                                          let pricePerUnit = 0;
                                          let itemTotal = 0;
                                          
                                          if (item.final_price) {
                                            // final_price from API is the line total, divide by quantity to get unit price
                                            itemTotal = item.final_price;
                                            pricePerUnit = item.quantity > 0 ? item.final_price / item.quantity : 0;
                                          } else if (item.unit_price) {
                                            // Fallback: calculate from unit_price and discount
                                            const discount = item.discount_percentage ?? 0;
                                            pricePerUnit = item.unit_price * (1 - discount / 100);
                                            itemTotal = item.quantity * pricePerUnit;
                                          }
                                          
                                          return (
                                            <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                                              <div className="flex justify-between items-start">
                                                <div>
                                                  <div className="font-medium text-gray-900">
                                                    {itemName}
                                                  </div>
                                                  {itemSku && (
                                                    <div className="text-xs text-gray-500">SKU: {itemSku}</div>
                                                  )}
                                                  <div className="text-sm text-gray-600 mt-1">
                                                    Qty: {item.quantity} × ₹{Number(pricePerUnit).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <div className="font-semibold text-gray-900">
                                                    ₹{Number(itemTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

              {deliveries.filter(d => d.status === 'delivered').length === 0 && (
                <div className="text-center py-12">
                  <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No delivered orders yet</h3>
                  <p className="text-gray-500">Completed deliveries will appear here</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              {selected ? 'Delivery Details' : 'New Delivery'}
            </DialogTitle>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
