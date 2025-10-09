'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  Package, 
  DollarSign, 
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { VendorPerformanceMetrics } from '@/components/vendors/VendorPerformanceMetrics';
import { VendorBillsTab } from '@/components/vendors/VendorBillsTab';

interface VendorDetails {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  address?: string;
  created_at: string;
  updated_at: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  total_purchase_orders: number;
  total_spent: number;
  pending_orders: number;
  current_stock_value: number;
  last_order_date?: string;
}

interface PurchaseOrderItem {
  id: string;
  quantity: number;
  status: string;
  created_at: string;
  total?: number;
  product?: {
    id: string;
    name: string;
  };
}

interface StockItem {
  product_id: string;
  product_name: string;
  current_quantity: number;
  reorder_point: number;
  unit_price: number;
  total_value: number;
  last_restocked?: string;
}

interface SalesRecord {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
  last_sale_date?: string;
}

interface VendorBill {
  id: string;
  supplier_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  description?: string;
  tax_amount: number;
  discount_amount: number;
  purchase_order_id?: string;
  attachment_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  reference_number?: string;
  updated_by?: string;
}

interface VendorFinancialSummary {
  totalBillAmount: number;
  totalPaidAmount: number;
  totalOutstanding: number;
  pendingBillsCount: number;
  totalPOAmount: number;
  pendingPOsCount: number;
}

export default function VendorDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderItem[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [vendorBills, setVendorBills] = useState<VendorBill[]>([]);
  const [financialSummary, setFinancialSummary] = useState<VendorFinancialSummary>({
    totalBillAmount: 0,
    totalPaidAmount: 0,
    totalOutstanding: 0,
    pendingBillsCount: 0,
    totalPOAmount: 0,
    pendingPOsCount: 0
  });
  const [loading, setLoading] = useState(true);

  // Calculate financial summary from vendor bills
  const calculateFinancialSummary = (bills: VendorBill[]): VendorFinancialSummary => {
    const totalBillAmount = bills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
    const totalPaidAmount = bills.reduce((sum, bill) => sum + (bill.paid_amount || 0), 0);
    const totalOutstanding = bills.reduce((sum, bill) => sum + (bill.remaining_amount || 0), 0);
    const pendingBillsCount = bills.filter(bill => bill.status === 'pending' || bill.status === 'partial').length;
    
    return {
      totalBillAmount,
      totalPaidAmount,
      totalOutstanding,
      pendingBillsCount,
      totalPOAmount: 0, // Will be calculated from PO data
      pendingPOsCount: 0 // Will be calculated from PO data
    };
  };

  const fetchVendorData = useCallback(async () => {
    try {
      setLoading(true);
      const [vendorRes, ordersRes, stockRes, salesRes, billsRes] = await Promise.all([
        fetch(`/api/vendors/${vendorId}`),
        fetch(`/api/vendors/${vendorId}/purchase-orders`),
        fetch(`/api/vendors/${vendorId}/stock`),
        fetch(`/api/vendors/${vendorId}/sales`),
        fetch(`/api/vendors/${vendorId}/bills`)
      ]);

      if (!vendorRes.ok) throw new Error('Vendor not found');

      const [vendorData, ordersData, stockData, salesData, billsData] = await Promise.all([
        vendorRes.json(),
        ordersRes.json(),
        stockRes.json(),
        salesRes.json(),
        billsRes.json()
      ]);

      setVendor(vendorData);
      setPurchaseOrders(Array.isArray(ordersData) ? ordersData : []);
      setStockItems(Array.isArray(stockData) ? stockData : []);
      setSalesRecords(Array.isArray(salesData) ? salesData : []);
      
      const bills = Array.isArray(billsData) ? billsData : [];
      setVendorBills(bills);
      
      // Calculate financial summary from actual vendor bills
      const summary = calculateFinancialSummary(bills);
      setFinancialSummary(summary);
    } catch (error) {
      console.error('Error fetching vendor data:', error);
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchVendorData();
  }, [fetchVendorData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      Active: 'bg-green-100 text-green-800',
      Inactive: 'bg-gray-100 text-gray-800',
      Suspended: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      received: 'bg-green-100 text-green-800',
      Paid: 'bg-green-100 text-green-800',
      Unpaid: 'bg-red-100 text-red-800'
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading vendor details...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Vendor not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{vendor.name}</h1>
            <p className="text-gray-600 mt-1">Vendor Details & Performance</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/vendors/${vendor.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Vendor
            </Link>
          </Button>
        </div>
      </div>

      {/* Vendor Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Contact</p>
                  <p className="font-medium">{vendor.contact || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{vendor.email || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="font-medium">{vendor.address || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">Member Since</p>
                  <p className="font-medium">{new Date(vendor.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge className={getStatusBadge(vendor.status)}>
                  {vendor.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Order</p>
                <p className="font-medium">
                  {vendor.last_order_date 
                    ? new Date(vendor.last_order_date).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">{new Date(vendor.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bills Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(financialSummary.totalBillAmount)}</p>
                <p className="text-xs text-gray-500 mt-1">From vendor bills</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Amount Paid</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(financialSummary.totalPaidAmount)}</p>
                <p className="text-xs text-gray-500 mt-1">Total payments made</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(financialSummary.totalOutstanding)}</p>
                <p className="text-xs text-gray-500 mt-1">Pending to pay</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Bills</p>
                <p className="text-2xl font-bold text-gray-900">{financialSummary.pendingBillsCount}</p>
                <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="bills">Vendor Bills</TabsTrigger>
          <TabsTrigger value="stock">Current Stock</TabsTrigger>
          <TabsTrigger value="sales">Sales Records</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <VendorPerformanceMetrics vendorId={vendorId} />
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>All purchase orders from this vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No purchase orders found for this vendor
                      </TableCell>
                    </TableRow>
                  ) : (
                    purchaseOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                        <TableCell>{order.product?.name || 'Custom Order'}</TableCell>
                        <TableCell>{order.quantity}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {order.total ? formatCurrency(order.total) : 'N/A'}
                        </TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bills">
          <VendorBillsTab 
            vendorId={vendorId} 
            vendorName={vendor.name} 
            bills={vendorBills}
            financialSummary={financialSummary}
            onBillUpdate={fetchVendorData}
          />
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader>
              <CardTitle>Current Stock</CardTitle>
              <CardDescription>Inventory levels for products from this vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Current Quantity</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Last Restocked</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No stock items found for this vendor
                      </TableCell>
                    </TableRow>
                  ) : (
                    stockItems.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="text-right">{item.current_quantity}</TableCell>
                        <TableCell className="text-right">{item.reorder_point}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.total_value)}</TableCell>
                        <TableCell>
                          {item.last_restocked 
                            ? new Date(item.last_restocked).toLocaleDateString()
                            : 'N/A'
                          }
                        </TableCell>
                        <TableCell>
                          {item.current_quantity <= item.reorder_point ? (
                            <Badge className="bg-red-100 text-red-800">Low Stock</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800">In Stock</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales Records</CardTitle>
              <CardDescription>Products sold that were sourced from this vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Total Quantity Sold</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                    <TableHead>Last Sale Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No sales records found for this vendor
                      </TableCell>
                    </TableRow>
                  ) : (
                    salesRecords.map((record) => (
                      <TableRow key={record.product_id}>
                        <TableCell className="font-medium">{record.product_name}</TableCell>
                        <TableCell className="text-right">{record.total_quantity_sold}</TableCell>
                        <TableCell className="text-right">{formatCurrency(record.total_revenue)}</TableCell>
                        <TableCell>
                          {record.last_sale_date 
                            ? new Date(record.last_sale_date).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
