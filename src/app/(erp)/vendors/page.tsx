'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Eye, Edit, Trash2, Package, DollarSign, ShoppingCart, CreditCard, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { VendorDashboard } from '@/components/vendors/VendorDashboard';

interface VendorStats {
  id: string;
  name: string;
  contact?: string;
  total_purchase_orders: number;
  total_spent: number;
  pending_orders: number;
  current_stock_value: number;
  total_cost_inr: number;
  total_mrp_inr: number;
  profit_margin_inr: number;
  profit_percentage: number;
  products_count: number;
  last_order_date?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  // Enhanced finance tracking
  total_purchase_value: number; // Total PO value
  total_paid: number; // Amount paid to vendor
  total_pending: number; // Amount owed to vendor
  unpaid_orders: number; // Number of unpaid orders
  payment_status: 'pending' | 'paid';
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('current_stock_value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Inactive'>('all');

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendors/stats');
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSyncSuppliers = async () => {
    if (!confirm('This will create vendors from existing product supplier names and link them. Continue?')) {
      return;
    }

    try {
      const response = await fetch('/api/vendors/sync-suppliers', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to sync suppliers');
      }

      const result = await response.json();
      alert(`Sync completed! Created ${result.created_suppliers} new vendors, updated ${result.updated_products} products.`);
      
      // Refresh the vendor list
      await fetchVendors();
    } catch (error) {
      console.error('Error syncing suppliers:', error);
      alert('Failed to sync suppliers');
    }
  };

  const handleDeleteVendor = async (vendorId: string, vendorName: string) => {
    if (!confirm(`Are you sure you want to delete vendor "${vendorName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete vendor');
      }

      // Refresh the vendor list
      await fetchVendors();
      alert('Vendor deleted successfully');
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete vendor');
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, filterStatus]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Filter and sort vendors
  const filteredAndSortedVendors = useMemo(() => {
    const filtered = vendors.filter(vendor => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (vendor.contact && vendor.contact.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    // Sort vendors
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof VendorStats];
      let bValue = b[sortBy as keyof VendorStats];

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return filtered;
  }, [vendors, searchTerm, sortBy, sortOrder, filterStatus]);

  // Update pagination based on filtered results
  const totalPages = Math.ceil(filteredAndSortedVendors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentVendors = filteredAndSortedVendors.slice(startIndex, endIndex);

  const getStatusBadge = (status: string) => {
    const variants = {
      Active: 'bg-green-100 text-green-800',
      Inactive: 'bg-gray-100 text-gray-800',
      Suspended: 'bg-red-100 text-red-800'
    };
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  // Pagination logic (removed - using filtered pagination above)
  const paginatedVendors = currentVendors;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(parseInt(value));
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-600 mt-2">Manage suppliers, track purchases, and monitor vendor performance</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleSyncSuppliers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Suppliers
          </Button>
          <Button asChild>
            <Link href="/vendors/new">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add New Vendor
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Vendors</p>
                <p className="text-lg font-bold text-gray-900">{vendors.length}</p>
                <p className="text-xs text-gray-500">
                  Active: {vendors.filter(v => v.status === 'Active').length}
                </p>
              </div>
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Stock Cost</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_cost_inr || 0), 0))}
                </p>
                <p className="text-xs text-gray-500">Current stock cost</p>
              </div>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Stock MRP</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_mrp_inr || 0), 0))}
                </p>
                <p className="text-xs text-gray-500">Current stock value</p>
              </div>
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Stock Profit</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(vendors.reduce((sum, v) => sum + (v.profit_margin_inr || 0), 0))}
                </p>
                <p className="text-xs text-gray-500">Profit potential</p>
              </div>
              <CreditCard className="h-5 w-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Paid</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_paid || 0), 0))}
                </p>
                <p className="text-xs text-gray-500">Paid to vendors</p>
              </div>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Pending</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_pending || 0), 0))}
                </p>
                <p className="text-xs text-gray-500">Owed to vendors</p>
              </div>
              <Package className="h-5 w-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Analytics - Moved up for better visibility */}
      <VendorDashboard />

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Vendors
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by vendor name or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Sort By */}
            <div className="min-w-48">
              <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="current_stock_value">Stock Value</option>
                <option value="name">Vendor Name</option>
                <option value="total_cost_inr">Stock Cost</option>
                <option value="total_mrp_inr">Stock MRP</option>
                <option value="total_paid">Total Paid</option>
                <option value="total_pending">Total Pending</option>
                <option value="total_purchase_orders">Purchase Orders</option>
                <option value="current_stock_quantity">Stock Quantity</option>
                <option value="profit_margin_inr">Profit Margin</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="min-w-32">
              <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <select
                id="sortOrder"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div className="min-w-32">
              <label htmlFor="filterStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'Active' | 'Inactive')}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSortBy('current_stock_value');
                  setSortOrder('desc');
                  setFilterStatus('all');
                  setCurrentPage(1);
                }}
                className="h-10"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing {filteredAndSortedVendors.length} of {vendors.length} vendors
              {searchTerm && ` matching "${searchTerm}"`}
              {filterStatus !== 'all' && ` with status "${filterStatus}"`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Vendors</CardTitle>
              <CardDescription>
                Complete list of all vendors with their performance metrics
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Show:</span>
              <select 
                title="Items per page"
                value={itemsPerPage} 
                onChange={(e) => handleItemsPerPageChange(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span className="text-sm text-gray-500">per page</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-gray-500">Loading vendors...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead className="text-right">Stock Cost</TableHead>
                  <TableHead className="text-right">Stock MRP</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Last Order</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">
                      <Link 
                        href={`/vendors/${vendor.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {vendor.name}
                      </Link>
                    </TableCell>
                    <TableCell>{vendor.contact || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(vendor.status)}>
                        {vendor.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{vendor.products_count || 0}</TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      {formatCurrency(vendor.total_cost_inr || 0)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-orange-600">
                      {formatCurrency(vendor.total_mrp_inr || 0)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(vendor.total_paid || 0)}</TableCell>
                    <TableCell className="text-right">
                      <span className={(vendor.total_pending || 0) > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                        {formatCurrency(vendor.total_pending || 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={(vendor.profit_margin_inr || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(vendor.profit_margin_inr || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        vendor.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800'
                          : vendor.total_pending > 0 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                      }>
                        {vendor.payment_status === 'paid' ? 'Paid' : `${vendor.unpaid_orders || 0} Unpaid`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vendor.last_order_date 
                        ? new Date(vendor.last_order_date).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/vendors/${vendor.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/vendors/${vendor.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination Controls */}
          {!loading && vendors.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1} to {Math.min(endIndex, vendors.length)} of {vendors.length} vendors
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
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
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
    </div>
  );
}
