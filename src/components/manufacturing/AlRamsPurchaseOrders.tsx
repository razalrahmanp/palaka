'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Eye, DollarSign, Calendar, Truck, CheckCircle } from 'lucide-react';

interface PurchaseOrder {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  payment_status: string;
  description: string;
  created_at: string;
  supplier_id: string;
}

interface AlRamsPurchaseOrdersProps {
  alRamsId: string;
}

export function AlRamsPurchaseOrders({ alRamsId }: AlRamsPurchaseOrdersProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalValue: 0,
    pendingValue: 0,
    completedOrders: 0
  });

  const fetchAlRamsPurchaseOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/procurement/purchase_orders?supplier_id=${alRamsId}`);
      const data = await response.json();
      
      if (data.success && data.purchase_orders) {
        setPurchaseOrders(data.purchase_orders);
        
        // Calculate stats
        const totalOrders = data.purchase_orders.length;
        const totalValue = data.purchase_orders.reduce((sum: number, po: PurchaseOrder) => sum + (po.total || 0), 0);
        const pendingValue = data.purchase_orders
          .filter((po: PurchaseOrder) => po.status !== 'completed')
          .reduce((sum: number, po: PurchaseOrder) => sum + (po.remaining_amount || 0), 0);
        const completedOrders = data.purchase_orders.filter((po: PurchaseOrder) => po.status === 'completed').length;
        
        setStats({
          totalOrders,
          totalValue,
          pendingValue,
          completedOrders
        });
      }
    } catch (error) {
      console.error('Error fetching Al Rams purchase orders:', error);
    } finally {
      setLoading(false);
    }
  }, [alRamsId]);

  useEffect(() => {
    if (alRamsId) {
      fetchAlRamsPurchaseOrders();
    }
  }, [alRamsId, fetchAlRamsPurchaseOrders]);



  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'pending':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading Al Rams purchase orders...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pendingValue)}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl border-b border-blue-100/50">
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Al Rams Purchase Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {purchaseOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-700">Order ID</TableHead>
                    <TableHead className="font-semibold text-gray-700">Bill Number</TableHead>
                    <TableHead className="font-semibold text-gray-700">Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Due Date</TableHead>
                    <TableHead className="font-semibold text-gray-700">Total Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Paid Amount</TableHead>
                    <TableHead className="font-semibold text-gray-700">Remaining</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Payment Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow key={po.id} className="hover:bg-blue-50/50 transition-colors border-gray-100">
                      <TableCell className="py-3">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {po.id.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-medium text-gray-900">{po.bill_number || '—'}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-gray-600">
                          {po.bill_date ? new Date(po.bill_date).toLocaleDateString() : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-gray-600">
                          {po.due_date ? new Date(po.due_date).toLocaleDateString() : '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-semibold text-gray-900">{formatCurrency(po.total || 0)}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-medium text-green-600">{formatCurrency(po.paid_amount || 0)}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-medium text-orange-600">{formatCurrency(po.remaining_amount || 0)}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge className={`${getStatusColor(po.status)} px-2 py-1 rounded-full font-medium`}>
                          {po.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge className={`${getPaymentStatusColor(po.payment_status)} px-2 py-1 rounded-full font-medium`}>
                          {po.payment_status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 transition-colors rounded-lg"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Purchase Orders Found</h3>
              <p className="text-gray-500">No purchase orders found for Al Rams supplier</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}