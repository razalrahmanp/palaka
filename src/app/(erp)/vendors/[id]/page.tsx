'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Package, 
  DollarSign, 
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertTriangle,
  Search,
  Copy,
  ShoppingCart,
  TrendingUp,
  FileText,
  BarChart3,
  Receipt,
  Edit
} from 'lucide-react';
import { VendorPerformanceMetrics } from '@/components/vendors/VendorPerformanceMetrics';
import { VendorBillsTab } from '@/components/vendors/VendorBillsTab';
import { VendorForm } from '@/components/vendors/VendorForm';

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
  sku?: string;
  current_quantity: number;
  reorder_point: number;
  unit_price: number;
  unit_cost: number;
  total_value: number;
  total_cost: number;
  profit_per_unit: number;
  total_profit_potential: number;
  margin_percentage: number;
  last_restocked?: string;
}

interface SalesRecord {
  product_id: string;
  product_name: string;
  total_quantity_sold: number;
  total_revenue: number;
  last_sale_date?: string;
}

interface VendorBillLineItem {
  id: string;
  product_id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  actual_cost_per_unit?: number;
  purchase_order_id?: string;
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
  subtotal?: number;
  freight_total?: number;
  additional_charges?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total_gst?: number;
  gst_rate?: number;
  is_interstate?: boolean;
  vendor_bill_line_items?: VendorBillLineItem[];
}

interface VendorFinancialSummary {
  totalBillAmount: number;
  totalPaidAmount: number;
  totalOutstanding: number;
  pendingBillsCount: number;
  totalPOAmount: number;
  pendingPOsCount: number;
}

interface VendorFormData {
  name: string;
  contact: string;
  email: string;
  address: string;
}

export default function VendorDetailsPage() {
  const params = useParams();
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
  const [stockFilter, setStockFilter] = useState('');
  const [activeTab, setActiveTab] = useState('bills');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

  const handleEditVendor = () => {
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (data: VendorFormData) => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update vendor');
      }

      // Refresh vendor data
      await fetchVendorData();
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor. Please try again.');
    }
  };

  const handleEditCancel = () => {
    setIsEditDialogOpen(false);
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
    <div className="space-y-4">
      {/* Enhanced Vendor Information Card with Header */}
      <Card className="bg-gradient-to-r from-slate-50 to-gray-50 border-gray-200 shadow-md">
        <CardHeader className="pb-3 bg-gradient-to-r from-gray-100 to-slate-100 rounded-t-lg">
          <div>
            <CardTitle className="text-2xl text-gray-900 font-bold">{vendor.name}</CardTitle>
            <p className="text-gray-600 text-sm mt-1">Vendor Details & Performance</p>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            {/* Contact Info */}
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <Phone className="h-3 w-3 text-blue-500" />
                <p className="text-xs font-medium text-gray-600">Contact</p>
              </div>
              <p className="font-semibold text-gray-800 text-sm">{vendor.contact || 'N/A'}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <Mail className="h-3 w-3 text-blue-500" />
                <p className="text-xs font-medium text-gray-600">Email</p>
              </div>
              <p className="font-semibold text-gray-800 text-sm">{vendor.email || 'N/A'}</p>
            </div>

            {/* Dates & Status */}
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                <p className="text-xs font-medium text-gray-600">Member Since</p>
              </div>
              <p className="font-semibold text-gray-800 text-sm">{new Date(vendor.created_at).toLocaleDateString()}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Status</p>
              <Badge className={`${getStatusBadge(vendor.status)} text-xs py-0.5 px-2`}>
                {vendor.status}
              </Badge>
            </div>

            {/* Stock Information */}
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <Package className="h-3 w-3 text-green-500" />
                <p className="text-xs font-medium text-gray-600">Available Stock</p>
              </div>
              <p className="font-semibold text-green-700 text-sm">
                {stockItems.filter(item => (item.current_quantity || 0) > 0).length} items
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <p className="text-xs font-medium text-gray-600">Stock Out</p>
              </div>
              <p className="font-semibold text-red-700 text-sm">
                {stockItems.filter(item => (item.current_quantity || 0) === 0).length} items
              </p>
            </div>
          </div>
          
          {/* Second Row - Additional Info */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm mt-3 pt-3 border-t border-gray-200">
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3 text-blue-500" />
                <p className="text-xs font-medium text-gray-600">Address</p>
              </div>
              <p className="font-semibold text-gray-800 text-sm">{vendor.address || 'N/A'}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Last Order</p>
              <p className="font-semibold text-gray-800 text-sm">
                {vendor.last_order_date 
                  ? new Date(vendor.last_order_date).toLocaleDateString()
                  : 'Never'
                }
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-600">Last Updated</p>
              <p className="font-semibold text-gray-800 text-sm">{new Date(vendor.updated_at).toLocaleDateString()}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <Package className="h-3 w-3 text-indigo-500" />
                <p className="text-xs font-medium text-gray-600">Total Qty</p>
              </div>
              <p className="font-semibold text-indigo-700 text-sm">
                {stockItems.reduce((sum, item) => sum + (item.current_quantity || 0), 0)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <DollarSign className="h-3 w-3 text-green-500" />
                <p className="text-xs font-medium text-gray-600">Stock Cost</p>
              </div>
              <p className="font-semibold text-green-700 text-sm">
                {formatCurrency(stockItems.reduce((sum, item) => sum + (item.total_cost || 0), 0))}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <ShoppingCart className="h-3 w-3 text-orange-500" />
                <p className="text-xs font-medium text-gray-600">Stock Value</p>
              </div>
              <p className="font-semibold text-orange-700 text-sm">
                {formatCurrency(stockItems.reduce((sum, item) => sum + (item.total_value || 0), 0))}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-blue-700 truncate">Total Bills Amount</p>
                <p className="text-base font-bold text-blue-900 truncate">{formatCurrency(financialSummary.totalBillAmount)}</p>
                <p className="text-xs text-blue-600">From vendor bills</p>
              </div>
              <DollarSign className="h-5 w-5 text-blue-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-green-700 truncate">Amount Paid</p>
                <p className="text-base font-bold text-green-900 truncate">{formatCurrency(financialSummary.totalPaidAmount)}</p>
                <p className="text-xs text-green-600">Total payments made</p>
              </div>
              <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-orange-700 truncate">Outstanding Amount</p>
                <p className="text-base font-bold text-orange-900 truncate">{formatCurrency(financialSummary.totalOutstanding)}</p>
                <p className="text-xs text-orange-600">Pending to pay</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-purple-700 truncate">Pending Bills</p>
                <p className="text-base font-bold text-purple-900">{financialSummary.pendingBillsCount}</p>
                <p className="text-xs text-purple-600">Awaiting payment</p>
              </div>
              <Package className="h-5 w-5 text-purple-600 flex-shrink-0 ml-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Tab Buttons - Right Middle */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-20 flex flex-col gap-2">
        <Button
          variant={activeTab === 'performance' ? 'default' : 'outline'}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setActiveTab('performance')}
          title="Performance"
        >
          <TrendingUp className="h-5 w-5" />
        </Button>
        
        <Button
          variant={activeTab === 'orders' ? 'default' : 'outline'}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setActiveTab('orders')}
          title="Purchase Orders"
        >
          <FileText className="h-5 w-5" />
        </Button>
        
        <Button
          variant={activeTab === 'bills' ? 'default' : 'outline'}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setActiveTab('bills')}
          title="Vendor Bills"
        >
          <Receipt className="h-5 w-5" />
        </Button>
        
        <Button
          variant={activeTab === 'stock' ? 'default' : 'outline'}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setActiveTab('stock')}
          title="Current Stock"
        >
          <Package className="h-5 w-5" />
        </Button>
        
        <Button
          variant={activeTab === 'sales' ? 'default' : 'outline'}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setActiveTab('sales')}
          title="Sales Records"
        >
          <BarChart3 className="h-5 w-5" />
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'performance' && (
        <VendorPerformanceMetrics vendorId={vendorId} />
      )}

      {activeTab === 'orders' && (
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
        )}

        {activeTab === 'bills' && (
          <VendorBillsTab 
            vendorId={vendorId} 
            vendorName={vendor.name} 
            bills={vendorBills}
            financialSummary={financialSummary}
            onBillUpdate={fetchVendorData}
          />
        )}

        {activeTab === 'stock' && (
          <Card>
            <CardHeader>
              <CardTitle>Current Stock</CardTitle>
              <CardDescription>Inventory levels for products from this vendor</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Stock Summary */}
              {stockItems.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-700">Total Products</div>
                    <div className="text-2xl font-bold text-blue-900">{stockItems.length}</div>
                    <div className="text-xs text-blue-600">
                      {stockItems.filter(item => item.current_quantity > 0).length} in stock
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm font-medium text-green-700">Total Stock Cost</div>
                    <div className="text-2xl font-bold text-green-900">
                      {formatCurrency(stockItems.reduce((sum, item) => sum + (item.total_cost || 0), 0))}
                    </div>
                    <div className="text-xs text-green-600">Amount invested</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-sm font-medium text-purple-700">Total Stock Value</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {formatCurrency(stockItems.reduce((sum, item) => sum + (item.total_value || 0), 0))}
                    </div>
                    <div className="text-xs text-purple-600">Current market value</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-sm font-medium text-orange-700">Potential Profit</div>
                    <div className="text-2xl font-bold text-orange-900">
                      {formatCurrency(stockItems.reduce((sum, item) => sum + (item.total_profit_potential || 0), 0))}
                    </div>
                    <div className="text-xs text-orange-600">
                      {stockItems.length > 0 ? 
                        `${((stockItems.reduce((sum, item) => sum + (item.total_profit_potential || 0), 0) / 
                             stockItems.reduce((sum, item) => sum + (item.total_cost || 1), 0)) * 100).toFixed(1)}% margin`
                        : '0% margin'}
                    </div>
                  </div>
                </div>
              )}

              {/* Search/Filter Input */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by product name or SKU..."
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                {stockItems.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {stockFilter ? (
                      <>
                        {stockItems.filter(item => 
                          item.product_name.toLowerCase().includes(stockFilter.toLowerCase()) ||
                          (item.sku && item.sku.toLowerCase().includes(stockFilter.toLowerCase()))
                        ).length} of {stockItems.length} items
                      </>
                    ) : (
                      `${stockItems.length} items`
                    )}
                  </div>
                )}
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-32">SKU</TableHead>
                    <TableHead className="text-right">Current Quantity</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Last Restocked</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Filter stock items based on search term
                    const filteredStockItems = stockItems.filter(item => 
                      item.product_name.toLowerCase().includes(stockFilter.toLowerCase()) ||
                      (item.sku && item.sku.toLowerCase().includes(stockFilter.toLowerCase()))
                    );
                    
                    return filteredStockItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                        {stockFilter ? 
                          `No stock items match "${stockFilter}"` : 
                          'No stock items found for this vendor'
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStockItems.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell className="font-mono text-sm text-gray-700 bg-gray-50">
                          {item.sku ? (
                            <div 
                              className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors"
                              onClick={() => {
                                navigator.clipboard.writeText(item.sku || '');
                                // Could add a toast notification here
                              }}
                              title="Click to copy SKU"
                            >
                              <span>{item.sku}</span>
                              <Copy className="h-3 w-3 text-gray-400" />
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">{item.current_quantity}</TableCell>
                        <TableCell className="text-right">{item.reorder_point}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">{formatCurrency(item.unit_cost)}</TableCell>
                        <TableCell className="text-right text-gray-600">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-800">{formatCurrency(item.total_cost)}</TableCell>
                        <TableCell className="text-right text-gray-600">{formatCurrency(item.total_value)}</TableCell>
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
                  );
                  })()}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'sales' && (
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
        )}

        {/* Floating Edit Vendor Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-full w-14 h-14 p-0 flex items-center justify-center"
            onClick={handleEditVendor}
            title="Edit Vendor"
          >
            <Edit className="h-6 w-6" />
          </Button>
        </div>

        {/* Edit Vendor Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Edit Vendor
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Update vendor information and details
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-6">
              {vendor && (
                <VendorForm
                  initialData={{
                    name: vendor.name,
                    contact: vendor.contact || '',
                    email: vendor.email || '',
                    address: vendor.address || ''
                  }}
                  onSubmit={handleEditSubmit}
                  onCancel={handleEditCancel}
                  isEditing={true}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
