'use client';
import React, { useState, useEffect, useCallback } from 'react';
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
import { Eye, Plus, Truck, MapPin, CheckCircle, Clock, Package, Calendar, Wrench, AlertTriangle, CreditCard } from 'lucide-react';
import { Delivery as DeliveryBase } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { DeliveryDetails } from '@/components/logistics/DeliveryDetails';
import { DeliveryForm } from '@/components/logistics/DeliveryForm';

type Delivery = DeliveryBase & {
  driver?: { id: string; name: string };
  sales_order?: {
    id: string;
    status: string;
    customer: string;
    address: string;
    time_slot: string;
  };
};

type ReadyOrder = {
  id: string;
  status: string;
  address: string;
  expected_delivery_date: string;
  final_price: number;
  notes: string;
  created_at: string;
  customers: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
};

type OrderItem = {
  id: string;
  name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
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
  const [selectedOrder, setSelectedOrder] = useState<SelectedOrder | null>(null);
  const [open, setOpen] = useState(false);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      await Promise.all([fetchDeliveries(), fetchReadyOrders()]);
    } finally {
      setLoading(false);
    }
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

  const viewOrderDetails = async (orderId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/sales/orders/${orderId}`);
      const orderData = await response.json();
      setSelectedOrder(orderData);
      setOrderDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Logistics & Delivery Management
            </h1>
            <p className="text-gray-600 mt-2">Track shipments and manage delivery operations</p>
          </div>
          {user?.permissions.includes('delivery:create') && (
            <Button 
              onClick={() => { setSelected(null); setOpen(true); }}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="mr-2 h-5 w-5" /> New Delivery
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ready for Delivery</p>
                <p className="text-2xl font-bold text-gray-900">{readyOrders.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-orange-600 font-medium">Awaiting assignment</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">{deliveries.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Truck className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">Active shipments</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Transit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deliveries.filter(d => d.status === 'in_transit').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-blue-600 font-medium">On the way</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deliveries.filter(d => d.status === 'delivered').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">Completed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deliveries.filter(d => d.status === 'pending').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-orange-600 font-medium">Awaiting pickup</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders and Deliveries Tables */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-t-xl border-b border-teal-100/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Logistics Operations</CardTitle>
              <CardDescription className="text-gray-600">
                Manage orders ready for delivery and active deliveries
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="ready" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="ready" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Ready for Delivery ({readyOrders.length})
              </TabsTrigger>
              <TabsTrigger value="deliveries" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Active Deliveries ({deliveries.length})
              </TabsTrigger>
            </TabsList>

            {/* Ready for Delivery Tab */}
            <TabsContent value="ready" className="space-y-4">
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold text-gray-700 py-4">Order ID</TableHead>
                      <TableHead className="font-semibold text-gray-700">Customer Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Address</TableHead>
                      <TableHead className="font-semibold text-gray-700">Expected Date</TableHead>
                      <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                      <TableHead className="font-semibold text-gray-700">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readyOrders.map(order => (
                      <TableRow key={order.id} className="hover:bg-orange-50/50 transition-colors border-gray-100">
                        <TableCell className="py-4">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {order.id.slice(0, 8)}...
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                              {order.customers?.name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{order.customers?.name || '—'}</span>
                              {order.customers?.phone && (
                                <p className="text-xs text-gray-500">{order.customers.phone}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-sm text-gray-600 max-w-xs truncate block">
                            {order.address || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {order.expected_delivery_date 
                                ? new Date(order.expected_delivery_date).toLocaleDateString()
                                : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-medium text-gray-900">
                            ₹{order.final_price?.toLocaleString() || '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1 rounded-full font-medium">
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => viewOrderDetails(order.id)}
                            disabled={loading}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-1 text-xs rounded-lg disabled:opacity-50"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {loading ? 'Loading...' : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full overflow-y-auto bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Order Details
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Special Handling Alerts */}
              {selectedOrder.requires_special_handling && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <h3 className="text-sm font-medium text-orange-800">Special Handling Required</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedOrder.has_custom_products && (
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                        Custom Products
                      </Badge>
                    )}
                    {selectedOrder.has_manufacturing_items && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        Manufacturing Required
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Order Information */}
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Order ID</label>
                    <p className="text-lg font-mono bg-gray-100 px-3 py-2 rounded">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Customer</label>
                    <p className="text-lg font-medium">{selectedOrder.customers?.name || '—'}</p>
                    {selectedOrder.customers?.phone && (
                      <p className="text-sm text-gray-500">{selectedOrder.customers.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Delivery Address</label>
                    <p className="text-sm">{selectedOrder.address || '—'}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1 rounded-full font-medium">
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Amount</label>
                    <p className="text-lg font-bold">₹{selectedOrder.final_price?.toLocaleString() || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Expected Delivery</label>
                    <p className="text-sm">
                      {selectedOrder.expected_delivery_date 
                        ? new Date(selectedOrder.expected_delivery_date).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </div>

                {/* Payment & Finance Summary */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Payment Status</label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Paid:</span>
                        <span className="font-medium text-green-600">
                          ₹{selectedOrder.payment_summary?.total_paid?.toLocaleString() || '0'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Balance:</span>
                        <span className={`font-medium ${
                          (selectedOrder.payment_summary?.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ₹{selectedOrder.payment_summary?.balance?.toLocaleString() || '0'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedOrder.finance_details?.is_financed && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Finance Details</label>
                      <div className="space-y-1">
                        {selectedOrder.finance_details.finance_type === 'bajaj' && (
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-600">Bajaj Finance</span>
                          </div>
                        )}
                        {selectedOrder.finance_details.emi_enabled && (
                          <p className="text-sm">
                            EMI: ₹{selectedOrder.finance_details.emi_monthly?.toLocaleString() || '—'}/month
                          </p>
                        )}
                        {selectedOrder.finance_details.bajaj_finance_amount && selectedOrder.finance_details.bajaj_finance_amount > 0 && (
                          <p className="text-sm">
                            Finance Amount: ₹{selectedOrder.finance_details.bajaj_finance_amount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Order Items</h3>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items?.map((item: OrderItem, index: number) => (
                        <TableRow key={index} className={
                          item.product_type === 'custom' ? 'bg-purple-50' :
                          item.product_type === 'manufacturing' ? 'bg-blue-50' : ''
                        }>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">
                                  {item.name || item.products?.name || '—'}
                                </span>
                                {item.is_custom_product && (
                                  <Badge className="bg-purple-100 text-purple-700 text-xs">Custom</Badge>
                                )}
                                {item.needs_manufacturing && (
                                  <Badge className="bg-blue-100 text-blue-700 text-xs">
                                    <Wrench className="h-3 w-3 mr-1" />
                                    Manufacturing
                                  </Badge>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-gray-500">{item.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              {item.product_type === 'custom' && (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                                  Custom Product
                                </Badge>
                              )}
                              {item.product_type === 'manufacturing' && (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                  Manufacturing
                                </Badge>
                              )}
                              {item.product_type === 'standard' && (
                                <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">
                                  Standard
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {item.sku || item.products?.sku || '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.supplier_name || '—'}
                          </TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.unit_price?.toLocaleString() || '—'}</TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{((item.quantity || 0) * (item.unit_price || 0)).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Manufacturing/Custom Items Summary */}
                {(selectedOrder.has_custom_products || selectedOrder.has_manufacturing_items) && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">Special Handling Notes:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {selectedOrder.has_custom_products && (
                        <li>• Contains custom products that may require special configuration</li>
                      )}
                      {selectedOrder.has_manufacturing_items && (
                        <li>• Contains items requiring manufacturing - check production status before delivery</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Payment Details */}
              {selectedOrder.payment_summary?.payments && selectedOrder.payment_summary.payments.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.payment_summary.payments.map((payment, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {new Date(payment.payment_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium text-green-600">
                              ₹{payment.amount.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                {payment.method}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {payment.reference || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
