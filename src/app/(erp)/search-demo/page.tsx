'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EnhancedSearchFilter, { FilterOption } from '@/components/ui/enhanced-search-filter';

// Mock data for demonstration
const mockProducts = [
  { id: 1, name: 'Modern Sofa', category: 'Furniture', supplier: 'Comfort Co', stock: 15, price: 25000 },
  { id: 2, name: 'Dining Table', category: 'Furniture', supplier: 'Wood Works', stock: 8, price: 18000 },
  { id: 3, name: 'Office Chair', category: 'Furniture', supplier: 'Comfort Co', stock: 0, price: 12000 },
  { id: 4, name: 'LED TV', category: 'Electronics', supplier: 'Tech Store', stock: 5, price: 45000 },
  { id: 5, name: 'Refrigerator', category: 'Electronics', supplier: 'Cool Tech', stock: 3, price: 35000 },
  { id: 6, name: 'Coffee Maker', category: 'Appliances', supplier: 'Kitchen Pro', stock: 20, price: 8000 },
];

const mockSuppliers = ['Comfort Co', 'Wood Works', 'Tech Store', 'Cool Tech', 'Kitchen Pro'];
const mockCategories = ['Furniture', 'Electronics', 'Appliances'];

export default function SearchFilterDemo() {
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [stockFilter, setStockFilter] = useState('');

  // Filter products based on current filters
  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = !searchValue || 
      product.name.toLowerCase().includes(searchValue.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesSupplier = !selectedSupplier || product.supplier === selectedSupplier;
    const matchesStock = !stockFilter || 
      (stockFilter === 'in-stock' && product.stock >= 10) ||
      (stockFilter === 'low-stock' && product.stock > 0 && product.stock < 10) ||
      (stockFilter === 'out-of-stock' && product.stock === 0);
    
    return matchesSearch && matchesCategory && matchesSupplier && matchesStock;
  });

  const clearFilters = () => {
    setSearchValue('');
    setSelectedCategory('');
    setSelectedSupplier('');
    setStockFilter('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Enhanced Search & Filter Demo
          </h1>
          <p className="text-gray-600">
            Showcase of smooth, fast, and aesthetic search and filter components
          </p>
        </div>

        {/* Default Theme */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Default Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedSearchFilter
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Search products by name..."
              filters={[
                {
                  key: 'category',
                  label: 'Categories',
                  value: selectedCategory,
                  options: mockCategories.map((cat): FilterOption => ({
                    label: cat,
                    value: cat,
                    count: mockProducts.filter(p => p.category === cat).length
                  })),
                  placeholder: 'All Categories'
                },
                {
                  key: 'supplier',
                  label: 'Suppliers',
                  value: selectedSupplier,
                  options: mockSuppliers.map((sup): FilterOption => ({
                    label: sup,
                    value: sup,
                    count: mockProducts.filter(p => p.supplier === sup).length
                  })),
                  placeholder: 'All Suppliers'
                },
                {
                  key: 'stock',
                  label: 'Stock Level',
                  value: stockFilter,
                  options: [
                    { 
                      label: 'In Stock (10+)', 
                      value: 'in-stock',
                      count: mockProducts.filter(p => p.stock >= 10).length
                    },
                    { 
                      label: 'Low Stock (1-9)', 
                      value: 'low-stock',
                      count: mockProducts.filter(p => p.stock > 0 && p.stock < 10).length
                    },
                    { 
                      label: 'Out of Stock', 
                      value: 'out-of-stock',
                      count: mockProducts.filter(p => p.stock === 0).length
                    }
                  ],
                  placeholder: 'All Stock Levels'
                }
              ]}
              onFilterChange={(key, value) => {
                if (key === 'category') setSelectedCategory(value);
                else if (key === 'supplier') setSelectedSupplier(value);
                else if (key === 'stock') setStockFilter(value);
              }}
              onClearFilters={clearFilters}
              theme="default"
            />
          </CardContent>
        </Card>

        {/* Glass Theme */}
        <Card className="shadow-xl bg-gradient-to-r from-purple-100 to-pink-100">
          <CardHeader>
            <CardTitle>Glass Theme (Glassmorphism)</CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedSearchFilter
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Search with glass effect..."
              filters={[
                {
                  key: 'category',
                  label: 'Categories',
                  value: selectedCategory,
                  options: mockCategories.map((cat): FilterOption => ({
                    label: cat,
                    value: cat,
                    count: mockProducts.filter(p => p.category === cat).length
                  })),
                  placeholder: 'All Categories'
                },
                {
                  key: 'supplier',
                  label: 'Suppliers',
                  value: selectedSupplier,
                  options: mockSuppliers.map((sup): FilterOption => ({
                    label: sup,
                    value: sup,
                    count: mockProducts.filter(p => p.supplier === sup).length
                  })),
                  placeholder: 'All Suppliers'
                }
              ]}
              onFilterChange={(key, value) => {
                if (key === 'category') setSelectedCategory(value);
                else if (key === 'supplier') setSelectedSupplier(value);
              }}
              onClearFilters={clearFilters}
              theme="glass"
            />
          </CardContent>
        </Card>

        {/* Minimal Theme */}
        <Card className="shadow-xl bg-gray-50">
          <CardHeader>
            <CardTitle>Minimal Theme</CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedSearchFilter
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              searchPlaceholder="Minimal design search..."
              filters={[
                {
                  key: 'category',
                  label: 'Categories',
                  value: selectedCategory,
                  options: mockCategories.map((cat): FilterOption => ({
                    label: cat,
                    value: cat,
                    count: mockProducts.filter(p => p.category === cat).length
                  })),
                  placeholder: 'All Categories'
                }
              ]}
              onFilterChange={(key, value) => {
                if (key === 'category') setSelectedCategory(value);
              }}
              onClearFilters={clearFilters}
              theme="minimal"
              compact={true}
              showActiveFilters={false}
            />
          </CardContent>
        </Card>

        {/* Results Display */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filtered Results</span>
              <Badge variant="secondary">
                {filteredProducts.length} of {mockProducts.length} products
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <div key={product.id} className="p-4 border rounded-lg bg-white hover:shadow-md transition-shadow">
                  <h3 className="font-semibold">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.category} • {product.supplier}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-green-600">₹{product.price.toLocaleString()}</span>
                    <Badge variant={product.stock === 0 ? "destructive" : product.stock < 10 ? "outline" : "default"}>
                      {product.stock === 0 ? "Out of Stock" : `${product.stock} in stock`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No products match your current filters.</p>
                <button 
                  onClick={clearFilters}
                  className="mt-2 text-blue-600 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Stats */}
        <Card className="shadow-xl bg-green-50">
          <CardHeader>
            <CardTitle>Performance Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">300ms</div>
                <div className="text-sm text-gray-600">Debounced Search</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">Real-time</div>
                <div className="text-sm text-gray-600">Filter Updates</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">Smooth</div>
                <div className="text-sm text-gray-600">Animations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
