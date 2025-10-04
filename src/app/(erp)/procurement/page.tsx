// app/(erp)/procurement/page.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { PurchaseOrder, Supplier, Product } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlusCircle, Package, Users, BarChart3, TrendingUp } from 'lucide-react';
import { PurchaseOrderForm } from '@/components/procurement/PurchaseRequestForm';
import { PurchaseOrderList } from '@/components/procurement/PurchaseOrderList';
import { PurchaseOrderFilters } from '@/components/procurement/PurchaseOrderFilters';
import { PurchaseOrderDetailModal } from '@/components/procurement/PurchaseOrderDetailModal';
import { getCurrentUser } from '@/lib/auth';
import { normalizeProduct } from '@/lib/helper';

export default function ProcurementPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [paginatedOrders, setPaginatedOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    supplier: 'all',
    dueDateFrom: null as Date | null,
    dueDateTo: null as Date | null,
    createdDateFrom: null as Date | null,
    createdDateTo: null as Date | null,
    salesRep: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [ord, sup, prodRaw] = await Promise.all([
        fetch('/api/procurement/purchase_orders').then(r => r.json()),
        fetch('/api/suppliers').then(r => r.json()),
        fetch('/api/products?limit=1000').then(r => r.json()),
      ]);

      // Handle both old format (array) and new format (object with products array)
      const productsArray = Array.isArray(prodRaw) ? prodRaw : prodRaw.products || [];
      const prod = productsArray.map(normalizeProduct);

      const ordersArray = Array.isArray(ord) ? ord : [];
      const suppliersArray = Array.isArray(sup) ? sup : [];

      setOrders(ordersArray);
      setFilteredOrders(ordersArray);
      setSuppliers(suppliersArray);
      setProducts(prod);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchAll(); 
  }, [fetchAll]);

  const currentUser = getCurrentUser();

  const save = async (
    data: Omit<PurchaseOrder,'id'|'created_at'|'created_by'> & { images?: string[] }
  ) => {
    try {
      // 1) Create/update PO, including created_by
      const payload = selectedOrder
        ? { id: selectedOrder.id, ...data }
        : { ...data, created_by: currentUser?.id };

      const res = await fetch('/api/procurement/purchase_orders', {
        method: selectedOrder ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save PO');
      const po: PurchaseOrder = await res.json();

      // 2) Persist any uploaded images
      if (data.images && data.images.length > 0) {
        await fetch('/api/procurement/purchase_order_images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchase_order_id: po.id,
            urls: data.images,
          }),
        });
      }

      // 3) Refresh
      setFormOpen(false);
      setSelectedOrder(null);
      fetchAll();
    } catch (error) {
      console.error('Failed to save purchase order:', error);
    }
  };

  const saveModal = async (orderData: Partial<PurchaseOrder>) => {
    try {
      const res = await fetch('/api/procurement/purchase_orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!res.ok) throw new Error('Failed to save PO');

      fetchAll();
    } catch (error) {
      console.error('Failed to save purchase order:', error);
    }
  };

  const handleUploadImages = async (orderId: string, images: File[]) => {
    // Implementation for image upload
    const imageUrls: string[] = [];
    
    for (const image of images) {
      const formData = new FormData();
      formData.append('file', image);
      formData.append('orderId', orderId);
      
      const res = await fetch('/api/procurement/upload-image', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const { url } = await res.json();
        imageUrls.push(url);
      }
    }
    
    // Update order with new images
    await fetch('/api/procurement/purchase_orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: orderId, 
        images: [...(orders.find(o => o.id === orderId)?.images || []), ...imageUrls] 
      }),
    });
    
    fetchAll();
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    
    // Apply filters to orders
    let filtered = [...orders];

    if (newFilters.search) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(newFilters.search.toLowerCase()) ||
        order.supplier?.name?.toLowerCase().includes(newFilters.search.toLowerCase()) ||
        order.product?.name?.toLowerCase().includes(newFilters.search.toLowerCase()) ||
        order.description?.toLowerCase().includes(newFilters.search.toLowerCase())
      );
    }

    if (newFilters.status && newFilters.status !== 'all') {
      filtered = filtered.filter(order => order.status === newFilters.status);
    }

    if (newFilters.supplier && newFilters.supplier !== 'all') {
      filtered = filtered.filter(order => order.supplier_id === newFilters.supplier);
    }

    if (newFilters.salesRep && newFilters.salesRep !== 'all') {
      filtered = filtered.filter(order => 
        (order.sales_order?.sales_rep?.[0]?.name || order.creator?.name) === newFilters.salesRep
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (newFilters.sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
        case 'total':
          aValue = a.total || 0;
          bValue = b.total || 0;
          break;
        case 'quantity':
          aValue = a.quantity || 0;
          bValue = b.quantity || 0;
          break;
        case 'supplier':
          aValue = a.supplier?.name || '';
          bValue = b.supplier?.name || '';
          break;
        case 'product':
          aValue = a.product?.name || a.product_name || '';
          bValue = b.product?.name || b.product_name || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'customer':
          aValue = a.sales_order?.customer?.[0]?.name || a.sales_order?.customer_name || '';
          bValue = b.sales_order?.customer?.[0]?.name || b.sales_order?.customer_name || '';
          break;
        case 'expected_delivery':
          aValue = new Date(a.sales_order?.expected_delivery_date || 0);
          bValue = new Date(b.sales_order?.expected_delivery_date || 0);
          break;
        default:
          aValue = a.created_at || '';
          bValue = b.created_at || '';
      }

      if (aValue < bValue) {
        return newFilters.sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return newFilters.sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    setFilteredOrders(filtered);
  };

  // Handle pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    setPaginatedOrders(filteredOrders.slice(startIndex, endIndex));
  }, [filteredOrders, currentPage, ordersPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (order: PurchaseOrder) => {
    try {
      const res = await fetch(`/api/procurement/purchase_orders?id=${order.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete purchase order');
      
      // Refresh the data
      fetchAll();
    } catch (error) {
      console.error('Failed to delete purchase order:', error);
      alert('Failed to delete purchase order. Please try again.');
    }
  };

  const handleFilterReset = () => {
    const resetFilters = {
      search: '',
      status: 'all',
      supplier: 'all',
      dueDateFrom: null as Date | null,
      dueDateTo: null as Date | null,
      createdDateFrom: null as Date | null,
      createdDateTo: null as Date | null,
      salesRep: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc' as 'asc' | 'desc',
    };
    setFilters(resetFilters);
    setFilteredOrders(orders);
  };

  const handleViewDetails = (order: PurchaseOrder) => {
    setSelectedOrder(order);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/procurement/purchase_orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });

      if (response.ok) {
        // Refresh the data to reflect the changes
        await fetchAll();
      } else {
        console.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCreateNew = () => {
    setSelectedOrder(null);
    setFormOpen(true);
  };

  // Calculate stats
  const totalValue = Array.isArray(orders) ? orders.reduce((sum, order) => sum + (order.total || 0), 0) : 0;
  const pendingOrders = Array.isArray(orders) ? orders.filter(order => order.status === 'pending').length : 0;
  const receivedOrders = Array.isArray(orders) ? orders.filter(order => order.status === 'received').length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Procurement Management
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Professional purchase order management with advanced tracking and analytics
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-800">
                {orders.length}
              </div>
              <p className="text-sm text-blue-600 mt-1">Active purchase orders</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-green-700 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Suppliers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-800">
                {suppliers.length}
              </div>
              <p className="text-sm text-green-600 mt-1">Registered suppliers</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-800">
                ₹{totalValue.toLocaleString('en-IN')}
              </div>
              <p className="text-sm text-orange-600 mt-1">Total procurement value</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-100 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Status Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Pending:</span>
                  <span className="font-semibold">{pendingOrders}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Received:</span>
                  <span className="font-semibold">{receivedOrders}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleCreateNew}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Purchase Order
            </Button>
          </div>
        </div>

        {/* Filters */}
        <PurchaseOrderFilters 
          filters={filters}
          onFiltersChange={handleFilterChange}
          onReset={handleFilterReset}
          suppliers={suppliers.map(s => ({ id: s.id, name: s.name }))}
          salesReps={Array.from(new Set((Array.isArray(orders) ? orders : []).map(o => o.sales_order?.sales_rep?.[0]?.name || o.creator?.name).filter(Boolean))).map(rep => ({ id: rep!, name: rep! }))}
        />

        {/* Purchase Orders List */}
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <PurchaseOrderList 
              orders={Array.isArray(paginatedOrders) ? paginatedOrders : []}
              onViewDetails={handleViewDetails}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              loading={loading}
            />
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-700">
                  <span>
                    Showing {((currentPage - 1) * ordersPerPage) + 1} to{' '}
                    {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of{' '}
                    {filteredOrders.length} results
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Modal */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-800">
                {selectedOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
              </DialogTitle>
            </DialogHeader>
            <PurchaseOrderForm
              suppliers={suppliers}
              products={products}
              onSubmit={save}
              onCancel={() => setFormOpen(false)}
              initialData={selectedOrder || null}
            />
          </DialogContent>
        </Dialog>

        {/* Detail Modal */}
        <PurchaseOrderDetailModal
          order={selectedOrder}
          suppliers={suppliers}
          onClose={() => {
            setSelectedOrder(null);
          }}
          onSave={saveModal}
          onUploadImages={handleUploadImages}
        />
      </div>
    </div>
  );
}
