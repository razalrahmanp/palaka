'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Package2, Search, AlertTriangle, Boxes, DollarSign } from 'lucide-react';

interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  last_updated: string;
  location: string;
  products: {
    id: string;
    name: string;
    sku: string;
    price: number;
    cost: number;
    category: string;
    supplier_id: string;
  };
}

interface AlRamsInventoryProps {
  alRamsId: string;
}

export function AlRamsInventory({ alRamsId }: AlRamsInventoryProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalQuantity: 0,
    totalValue: 0,
    lowStockItems: 0
  });

  const fetchAlRamsInventory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/inventory?supplier_id=${alRamsId}`);
      const data = await response.json();
      
      if (data.success && data.inventory) {
        setInventory(data.inventory);
        setFilteredInventory(data.inventory);
        
        // Calculate stats
        const totalProducts = data.inventory.length;
        const totalQuantity = data.inventory.reduce((sum: number, item: InventoryItem) => sum + (item.quantity || 0), 0);
        const totalValue = data.inventory.reduce((sum: number, item: InventoryItem) => {
          return sum + ((item.quantity || 0) * (item.products?.cost || 0));
        }, 0);
        const lowStockItems = data.inventory.filter((item: InventoryItem) => (item.quantity || 0) < 10).length;
        
        setStats({
          totalProducts,
          totalQuantity,
          totalValue,
          lowStockItems
        });
      }
    } catch (error) {
      console.error('Error fetching Al Rams inventory:', error);
    } finally {
      setLoading(false);
    }
  }, [alRamsId]);

  useEffect(() => {
    if (alRamsId) {
      fetchAlRamsInventory();
    }
  }, [alRamsId, fetchAlRamsInventory]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = inventory.filter(item =>
        item.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.products?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.products?.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInventory(filtered);
    } else {
      setFilteredInventory(inventory);
    }
  }, [searchTerm, inventory]);

  const getStockStatusColor = (quantity: number) => {
    if (quantity === 0) return 'bg-red-100 text-red-800 border-red-200';
    if (quantity < 10) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (quantity < 50) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStockStatusText = (quantity: number) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity < 10) return 'Low Stock';
    if (quantity < 50) return 'Moderate';
    return 'In Stock';
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
        <p className="ml-4 text-gray-600">Loading Al Rams inventory...</p>
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
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Package2 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quantity</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalQuantity}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Boxes className="h-5 w-5 text-white" />
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
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
              </div>
              <div className="h-10 w-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-xl border-b border-green-100/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package2 className="h-5 w-5 text-green-600" />
              Al Rams Inventory
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInventory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-700">Product Name</TableHead>
                    <TableHead className="font-semibold text-gray-700">SKU</TableHead>
                    <TableHead className="font-semibold text-gray-700">Category</TableHead>
                    <TableHead className="font-semibold text-gray-700">Quantity</TableHead>
                    <TableHead className="font-semibold text-gray-700">Reserved</TableHead>
                    <TableHead className="font-semibold text-gray-700">Available</TableHead>
                    <TableHead className="font-semibold text-gray-700">Cost Price</TableHead>
                    <TableHead className="font-semibold text-gray-700">Selling Price</TableHead>
                    <TableHead className="font-semibold text-gray-700">Total Value</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700">Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id} className="hover:bg-green-50/50 transition-colors border-gray-100">
                      <TableCell className="py-3">
                        <span className="font-medium text-gray-900">{item.products?.name || '—'}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {item.products?.sku || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-gray-600">{item.products?.category || '—'}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-semibold text-gray-900">{item.quantity || 0}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-medium text-orange-600">{item.reserved_quantity || 0}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-medium text-green-600">{item.available_quantity || item.quantity || 0}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-medium text-gray-900">{formatCurrency(item.products?.cost || 0)}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-medium text-gray-900">{formatCurrency(item.products?.price || 0)}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="font-semibold text-blue-600">
                          {formatCurrency((item.quantity || 0) * (item.products?.cost || 0))}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge className={`${getStockStatusColor(item.quantity || 0)} px-2 py-1 rounded-full font-medium`}>
                          {getStockStatusText(item.quantity || 0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-gray-600">{item.location || 'Main Warehouse'}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package2 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inventory Found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'No products match your search criteria' : 'No inventory items found for Al Rams supplier'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}