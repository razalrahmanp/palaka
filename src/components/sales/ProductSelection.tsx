'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Filter, 
  Grid3X3, 
  List, 
  Package
} from 'lucide-react';
import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import EnhancedSearchFilter, { FilterOption } from '@/components/ui/enhanced-search-filter';

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
    const cats = products.map(p => p.category).filter((cat): cat is string => Boolean(cat));
    return [...new Set(cats)].sort();
  }, [products]);

  const suppliers = useMemo(() => {
    const sups = products.map(p => p.supplier_name).filter((sup): sup is string => Boolean(sup));
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
          </div>

          {/* Enhanced Search and Filters */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <EnhancedSearchFilter
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="Search products by name, SKU, or description..."
                  filters={[
                    {
                      key: 'category',
                      label: 'Category',
                      value: categoryFilter,
                      options: categories.map((cat): FilterOption => ({
                        label: cat,
                        value: cat,
                        count: products.filter(p => p.category === cat).length
                      })),
                      placeholder: 'All Categories'
                    },
                    {
                      key: 'supplier',
                      label: 'Supplier',
                      value: supplierFilter,
                      options: suppliers.map((sup): FilterOption => ({
                        label: sup,
                        value: sup,
                        count: products.filter(p => p.supplier_name === sup).length
                      })),
                      placeholder: 'All Suppliers'
                    },
                    {
                      key: 'stock',
                      label: 'Stock Level',
                      value: stockFilter === 'all' ? '' : stockFilter,
                      options: [
                        {
                          label: 'In Stock (10+)',
                          value: 'in-stock',
                          count: products.filter(p => p.stock > 10).length
                        },
                        {
                          label: 'Low Stock (1-10)',
                          value: 'low-stock',
                          count: products.filter(p => p.stock > 0 && p.stock <= 10).length
                        },
                        {
                          label: 'Out of Stock',
                          value: 'out-of-stock',
                          count: products.filter(p => p.stock === 0).length
                        }
                      ],
                      placeholder: 'All Stock Levels'
                    },
                    {
                      key: 'sort',
                      label: 'Sort By',
                      value: `${sortBy}-${sortOrder}`,
                      options: [
                        { label: 'Name (A-Z)', value: 'name-asc', count: 0 },
                        { label: 'Name (Z-A)', value: 'name-desc', count: 0 },
                        { label: 'Price (Low-High)', value: 'price-asc', count: 0 },
                        { label: 'Price (High-Low)', value: 'price-desc', count: 0 },
                        { label: 'Stock (Low-High)', value: 'stock-asc', count: 0 },
                        { label: 'Stock (High-Low)', value: 'stock-desc', count: 0 }
                      ],
                      placeholder: 'Sort by Name (A-Z)'
                    }
                  ]}
                  onFilterChange={(key, value) => {
                    if (key === 'category') {
                      setCategoryFilter(value);
                    } else if (key === 'supplier') {
                      setSupplierFilter(value);
                    } else if (key === 'stock') {
                      setStockFilter(value || 'all');
                    } else if (key === 'sort') {
                      const [sortField, sortDirection] = value.split('-');
                      setSortBy(sortField);
                      setSortOrder(sortDirection as 'asc' | 'desc');
                    }
                  }}
                  onClearFilters={clearFilters}
                  theme="glass"
                  className="w-full"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="h-9 px-3 shrink-0"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4 mr-2" /> : <Grid3X3 className="h-4 w-4 mr-2" />}
                {viewMode === 'grid' ? 'List' : 'Grid'}
              </Button>
            </div>
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
