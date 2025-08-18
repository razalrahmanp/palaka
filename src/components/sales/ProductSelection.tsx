'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Package, 
  SortAsc, 
  SortDesc,
  X
} from 'lucide-react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';

interface ProductSelectionProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  selectedProducts?: Product[];
  className?: string;
}

export const ProductSelection: React.FC<ProductSelectionProps> = ({
  products,
  onProductSelect,
  selectedProducts = [],
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, in-stock, low-stock, out-of-stock
  const [sortBy, setSortBy] = useState('name'); // name, price, stock
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get unique categories and suppliers for filters
  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [products]);

  const suppliers = useMemo(() => {
    const sups = products.map(p => p.supplier_name).filter(Boolean);
    return [...new Set(sups)].sort();
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !categoryFilter || product.category === categoryFilter;
      const matchesSupplier = !supplierFilter || product.supplier_name === supplierFilter;
      
      const matchesStock = stockFilter === 'all' ||
                          (stockFilter === 'in-stock' && product.stock > 10) ||
                          (stockFilter === 'low-stock' && product.stock > 0 && product.stock <= 10) ||
                          (stockFilter === 'out-of-stock' && product.stock === 0);

      return matchesSearch && matchesCategory && matchesSupplier && matchesStock;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'stock':
          aValue = a.stock;
          bValue = b.stock;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchTerm, categoryFilter, supplierFilter, stockFilter, sortBy, sortOrder]);

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setSupplierFilter('');
    setStockFilter('all');
    setSortBy('name');
    setSortOrder('asc');
  };

  const hasActiveFilters = searchTerm || categoryFilter || supplierFilter || stockFilter !== 'all';

  return (
    <Card className={`bg-white/90 backdrop-blur-sm border border-white/20 shadow-xl ${className}`}>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100/50">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Product Selection
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="h-8 w-8 p-0"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products by name, SKU, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/60 backdrop-blur-sm border border-white/30"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-white/60 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Filter by category"
                aria-label="Filter by category"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              {/* Supplier Filter */}
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-white/60 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Filter by supplier"
                aria-label="Filter by supplier"
              >
                <option value="">All Suppliers</option>
                {suppliers.map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>

              {/* Stock Filter */}
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-white/60 border border-white/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Filter by stock level"
                aria-label="Filter by stock level"
              >
                <option value="all">All Stock Levels</option>
                <option value="in-stock">In Stock (10+)</option>
                <option value="low-stock">Low Stock (1-10)</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>

              {/* Sort */}
              <div className="flex items-center gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-sm bg-white/60 border border-white/30 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Sort products by"
                  aria-label="Sort products by"
                >
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
                  <option value="stock">Sort by Stock</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="h-10 w-10 p-0 rounded-l-none border-l-0"
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="px-3 text-sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <Badge variant="secondary" className="text-xs">
                    Search: &ldquo;{searchTerm}&rdquo;
                  </Badge>
                )}
                {categoryFilter && (
                  <Badge variant="secondary" className="text-xs">
                    Category: {categoryFilter}
                  </Badge>
                )}
                {supplierFilter && (
                  <Badge variant="secondary" className="text-xs">
                    Supplier: {supplierFilter}
                  </Badge>
                )}
                {stockFilter !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    Stock: {stockFilter.replace('-', ' ')}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span>
              {filteredProducts.length} of {products.length} products
              {hasActiveFilters && ' (filtered)'}
            </span>
          </div>
          {selectedProducts.length > 0 && (
            <Badge className="bg-blue-100 text-blue-800">
              {selectedProducts.length} selected
            </Badge>
          )}
        </div>

        {/* Products Grid/List */}
        {filteredProducts.length > 0 ? (
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "space-y-4"
          }>
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onProductSelect}
                className={viewMode === 'list' ? "flex-row" : ""}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="h-16 w-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters 
                ? "Try adjusting your filters to see more products" 
                : "No products available"
              }
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductSelection;
