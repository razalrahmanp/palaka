'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Eye, Edit, Package, DollarSign, ShoppingCart, CreditCard, RefreshCw, Star, Target, Filter } from 'lucide-react';
import Link from 'next/link';

interface VendorStats {
  id: string;
  name: string;
  contact?: string;
  total_purchase_orders: number;
  total_spent: number;
  pending_orders: number;
  current_stock_value: number;
  current_stock_quantity: number;
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
  // Detailed inventory information
  inventory_summary?: {
    total_products: number;
    total_quantity: number;
    total_stock_value: number;
    total_stock_cost: number;
    total_profit: number;
    low_stock_items: number;
    out_of_stock_items: number;
    categories: string[];
    overall_profit_margin: number;
  };
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
  const [performanceFilter, setPerformanceFilter] = useState<string>('all');

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vendors/stats');
      if (!response.ok) throw new Error('Failed to fetch vendors');
      const data = await response.json();
      
      // Map vendor stats data to include inventory_summary for backward compatibility
      const vendorsWithInventory = data.map((vendor: VendorStats) => ({
        ...vendor,
        inventory_summary: {
          total_products: vendor.products_count,
          total_quantity: vendor.current_stock_quantity,
          total_stock_value: vendor.current_stock_value,
          total_stock_cost: vendor.total_cost_inr,
          total_profit: vendor.profit_margin_inr,
          low_stock_items: 0, // Not available in current stats, can be added later if needed
          out_of_stock_items: 0, // Not available in current stats, can be added later if needed
          categories: [], // Not available in current stats, can be added later if needed
          overall_profit_margin: vendor.profit_percentage
        }
      }));
      
      setVendors(vendorsWithInventory);
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
      
      // Performance filters
      let matchesPerformance = true;
      if (performanceFilter === 'top_performers') {
        matchesPerformance = (vendor.profit_percentage || 0) >= 20 && (vendor.total_cost_inr || 0) > 10000;
      } else if (performanceFilter === 'high_value') {
        matchesPerformance = (vendor.inventory_summary?.total_stock_value || vendor.total_mrp_inr || 0) >= 50000;
      } else if (performanceFilter === 'high_profit') {
        matchesPerformance = (vendor.inventory_summary?.total_profit || vendor.profit_margin_inr || 0) >= 15000;
      } else if (performanceFilter === 'low_stock_issues') {
        matchesPerformance = (vendor.inventory_summary?.low_stock_items || 0) > 0 || (vendor.inventory_summary?.out_of_stock_items || 0) > 0;
      } else if (performanceFilter === 'payment_pending') {
        matchesPerformance = (vendor.total_pending || 0) > 0;
      }
      
      return matchesSearch && matchesStatus && matchesPerformance;
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
  }, [vendors, searchTerm, sortBy, sortOrder, filterStatus, performanceFilter]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
              Vendor Management
            </h1>
            <p className="text-gray-600 mt-2">Manage suppliers, track purchases, and monitor vendor performance</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <Button variant="outline" onClick={handleSyncSuppliers} className="bg-white/80 backdrop-blur-sm border-white/20">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Suppliers
            </Button>
            <Button asChild className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white shadow-lg">
              <Link href="/vendors/new">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add New Vendor
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-900">Total Vendors</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">{vendors.length}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Active: {vendors.filter(v => v.status === 'Active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-semibold text-green-900">Stock Cost</p>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(vendors.reduce((sum, v) => sum + (v.inventory_summary?.total_stock_cost || v.total_cost_inr || 0), 0))}
                </p>
                <p className="text-xs text-green-600 mt-1">Current stock cost</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <ShoppingCart className="h-5 w-5 text-orange-600" />
                  <p className="text-sm font-semibold text-orange-900">Stock MRP</p>
                </div>
                <p className="text-2xl font-bold text-orange-700">
                  {formatCurrency(vendors.reduce((sum, v) => sum + (v.inventory_summary?.total_stock_value || v.total_mrp_inr || 0), 0))}
                </p>
                <p className="text-xs text-orange-600 mt-1">Current stock value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                  <p className="text-sm font-semibold text-purple-900">Stock Profit</p>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {formatCurrency(vendors.reduce((sum, v) => sum + (v.inventory_summary?.total_profit || v.profit_margin_inr || 0), 0))}
                </p>
                <p className="text-xs text-purple-600 mt-1">Profit potential</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-cyan-50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-5 w-5 text-teal-600" />
                  <p className="text-sm font-semibold text-teal-900">Total Paid</p>
                </div>
                <p className="text-2xl font-bold text-teal-700">
                  {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_paid || 0), 0))}
                </p>
                <p className="text-xs text-teal-600 mt-1">Paid to vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-rose-50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Package className="h-5 w-5 text-red-600" />
                  <p className="text-sm font-semibold text-red-900">Total Pending</p>
                </div>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(vendors.reduce((sum, v) => sum + (v.total_pending || 0), 0))}
                </p>
                <p className="text-xs text-red-600 mt-1">Owed to vendors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filter Controls */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <label htmlFor="search" className="block text-sm font-semibold text-gray-700 mb-2">
                Search Vendors
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by vendor name or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Sort By */}
            <div className="min-w-48">
              <label htmlFor="sortBy" className="block text-sm font-semibold text-gray-700 mb-2">
                Sort By
              </label>
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
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
              <label htmlFor="sortOrder" className="block text-sm font-semibold text-gray-700 mb-2">
                Order
              </label>
              <select
                id="sortOrder"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
              >
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
              </select>
            </div>

            {/* Filter by Status */}
            <div className="min-w-32">
              <label htmlFor="filterStatus" className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'Active' | 'Inactive')}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Performance Filters */}
            <div className="min-w-48">
              <label htmlFor="performanceFilter" className="block text-sm font-semibold text-gray-700 mb-2">
                Performance
              </label>
              <select
                id="performanceFilter"
                value={performanceFilter}
                onChange={(e) => setPerformanceFilter(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
              >
                <option value="all">All Vendors</option>
                <option value="top_performers">⭐ Top Performers</option>
                <option value="high_value">💰 High Value Stock</option>
                <option value="high_profit">📈 High Profit</option>
                <option value="low_stock_issues">⚠️ Stock Issues</option>
                <option value="payment_pending">💳 Payment Pending</option>
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
                  setPerformanceFilter('all');
                  setCurrentPage(1);
                }}
                className="h-12 px-6 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 hover:border-gray-300 font-medium transition-all"
              >
                Clear Filters
              </Button>
            </div>
          </div>

          {/* Quick Performance Filter Buttons */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center mb-3">
              <Filter className="h-4 w-4 text-gray-600 mr-2" />
              <span className="text-sm font-semibold text-gray-700">Quick Performance Filters:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={performanceFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPerformanceFilter('all')}
                className="h-8 px-3 text-xs"
              >
                All Vendors
              </Button>
              <Button
                variant={performanceFilter === 'top_performers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPerformanceFilter('top_performers')}
                className="h-8 px-3 text-xs bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 text-yellow-800 hover:from-yellow-100 hover:to-amber-100"
              >
                <Star className="h-3 w-3 mr-1" />
                Top Performers
              </Button>
              <Button
                variant={performanceFilter === 'high_value' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPerformanceFilter('high_value')}
                className="h-8 px-3 text-xs bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-800 hover:from-green-100 hover:to-emerald-100"
              >
                <DollarSign className="h-3 w-3 mr-1" />
                High Value
              </Button>
              <Button
                variant={performanceFilter === 'high_profit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPerformanceFilter('high_profit')}
                className="h-8 px-3 text-xs bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800 hover:from-blue-100 hover:to-indigo-100"
              >
                <Target className="h-3 w-3 mr-1" />
                High Profit
              </Button>
              <Button
                variant={performanceFilter === 'low_stock_issues' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPerformanceFilter('low_stock_issues')}
                className="h-8 px-3 text-xs bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-800 hover:from-red-100 hover:to-rose-100"
              >
                <Package className="h-3 w-3 mr-1" />
                Stock Issues
              </Button>
              <Button
                variant={performanceFilter === 'payment_pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPerformanceFilter('payment_pending')}
                className="h-8 px-3 text-xs bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-800 hover:from-orange-100 hover:to-amber-100"
              >
                <CreditCard className="h-3 w-3 mr-1" />
                Payment Due
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 font-medium">
              Showing {filteredAndSortedVendors.length} of {vendors.length} vendors
              {searchTerm && ` matching "${searchTerm}"`}
              {filterStatus !== 'all' && ` with status "${filterStatus}"`}
              {performanceFilter !== 'all' && ` filtered by performance`}
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {paginatedVendors.map((vendor) => (
                <Card key={vendor.id} className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                          <Link href={`/vendors/${vendor.id}`} className="hover:underline">
                            {vendor.name}
                          </Link>
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          {vendor.contact || 'No contact info'}
                        </CardDescription>
                      </div>
                      <Badge className={`${getStatusBadge(vendor.status)} font-medium`}>
                        {vendor.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Enhanced Inventory Stock Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                        <Package className="w-4 h-4 mr-2" />
                        Inventory Stock Details
                      </h4>
                      {vendor.inventory_summary ? (
                        <div className="space-y-3">
                          {/* Product and Stock Count */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">
                                {vendor.inventory_summary.total_products}
                              </div>
                              <div className="text-xs text-blue-700 font-medium">Products</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">
                                {vendor.inventory_summary.total_quantity}
                              </div>
                              <div className="text-xs text-blue-700 font-medium">Total Qty</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">
                                {vendor.inventory_summary.categories.length}
                              </div>
                              <div className="text-xs text-blue-700 font-medium">Categories</div>
                            </div>
                          </div>
                          
                          {/* Stock Status Alerts */}
                          {(vendor.inventory_summary.low_stock_items > 0 || vendor.inventory_summary.out_of_stock_items > 0) && (
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200">
                              {vendor.inventory_summary.low_stock_items > 0 && (
                                <div className="flex items-center space-x-1 bg-yellow-100 rounded-lg p-2">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <span className="text-xs font-medium text-yellow-700">
                                    {vendor.inventory_summary.low_stock_items} Low Stock
                                  </span>
                                </div>
                              )}
                              {vendor.inventory_summary.out_of_stock_items > 0 && (
                                <div className="flex items-center space-x-1 bg-red-100 rounded-lg p-2">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-xs font-medium text-red-700">
                                    {vendor.inventory_summary.out_of_stock_items} Out of Stock
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {vendor.products_count || 0}
                            </div>
                            <div className="text-xs text-blue-700 font-medium">Products</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {vendor.current_stock_quantity || 0}
                            </div>
                            <div className="text-xs text-blue-700 font-medium">Units in Stock</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Enhanced Financial Summary */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-100">
                        <div className="text-xs text-green-700 font-medium mb-1">Stock Cost</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(vendor.inventory_summary?.total_stock_cost || vendor.total_cost_inr || 0)}
                        </div>
                      </div>
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-100">
                        <div className="text-xs text-orange-700 font-medium mb-1">Stock MRP</div>
                        <div className="text-lg font-bold text-orange-600">
                          {formatCurrency(vendor.inventory_summary?.total_stock_value || vendor.total_mrp_inr || 0)}
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Profit & Payment Status */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                        <div>
                          <div className="text-xs text-purple-700 font-medium">Potential Profit</div>
                          <div className={`text-lg font-bold ${
                            (vendor.inventory_summary?.total_profit || vendor.profit_margin_inr || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(vendor.inventory_summary?.total_profit || vendor.profit_margin_inr || 0)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-purple-700 font-medium">Margin %</div>
                          <div className={`text-lg font-bold ${
                            (vendor.inventory_summary?.overall_profit_margin || vendor.profit_percentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(vendor.inventory_summary?.overall_profit_margin || vendor.profit_percentage || 0).toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                          <div className="text-xs text-green-700 font-medium mb-1">Paid</div>
                          <div className="text-sm font-bold text-green-600">
                            {formatCurrency(vendor.total_paid || 0)}
                          </div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                          <div className="text-xs text-red-700 font-medium mb-1">Pending</div>
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(vendor.total_pending || 0)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Status Badge */}
                    <div className="flex items-center justify-between">
                      <Badge className={`px-3 py-1 ${
                        vendor.payment_status === 'paid' 
                          ? 'bg-green-100 text-green-800 border-green-200'
                          : vendor.total_pending > 0 
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                        {vendor.payment_status === 'paid' ? '✓ All Paid' : `${vendor.unpaid_orders || 0} Unpaid Orders`}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        Last order: {vendor.last_order_date 
                          ? new Date(vendor.last_order_date).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        className="flex-1 group-hover:border-emerald-300 group-hover:text-emerald-600 transition-colors"
                      >
                        <Link href={`/vendors/${vendor.id}`} className="flex items-center justify-center">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        className="flex-1 group-hover:border-blue-300 group-hover:text-blue-600 transition-colors"
                      >
                        <Link href={`/vendors/${vendor.id}/edit`} className="flex items-center justify-center">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      {vendor.inventory_summary && vendor.inventory_summary.total_products > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild
                          className="flex-1 group-hover:border-purple-300 group-hover:text-purple-600 transition-colors"
                        >
                          <Link href={`/vendors/${vendor.id}/inventory`} className="flex items-center justify-center">
                            <Package className="h-4 w-4 mr-1" />
                            Stock
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
