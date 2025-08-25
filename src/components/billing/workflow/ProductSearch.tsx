"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Package, Plus, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { ProductWithInventory } from '@/types';
import { formatCurrency } from '@/lib/utils';

interface ProductSearchProps {
  searchType: 'sku' | 'name' | 'supplier' | 'category';
  searchQuery: string;
  searchResults: ProductWithInventory[];
  isSearching: boolean;
  onSearchTypeChange: (type: 'sku' | 'name' | 'supplier' | 'category') => void;
  onSearchQueryChange: (query: string) => void;
  onProductSelect: (product: ProductWithInventory) => void;
  onNext: () => void;
  onBack: () => void;
  cartItemCount: number;
  isLoading?: boolean;
}

export function ProductSearch({ 
  searchType,
  searchQuery,
  searchResults,
  isSearching,
  onSearchTypeChange,
  onSearchQueryChange,
  onProductSelect,
  onNext,
  onBack,
  cartItemCount,
  isLoading = false 
}: ProductSearchProps) {
  const getStockStatus = (quantity: number) => {
    if (quantity > 10) return { status: 'In Stock', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (quantity > 0) return { status: 'Low Stock', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { status: 'Out of Stock', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Search className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">
                Product Search
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Search and add products to your cart
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Search Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Select 
              value={searchType} 
              onValueChange={onSearchTypeChange}
            >
              <SelectTrigger className="w-full sm:w-48 h-12 border-2 border-gray-200 focus:border-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sku">SKU Code</SelectItem>
                <SelectItem value="name">Product Name</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search by ${searchType.toUpperCase()}...`}
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="pl-10 h-12 border-2 border-gray-200 focus:border-blue-500"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Search Results</h3>
                {searchResults.length > 0 && (
                  <span className="text-sm text-gray-600">{searchResults.length} products found</span>
                )}
              </div>
              
              <div className="max-h-80 overflow-y-auto space-y-3 border rounded-lg bg-gray-50/50 p-4">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Searching...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((product) => {
                    const stockInfo = getStockStatus(product.quantity);
                    
                    return (
                      <Card
                        key={product.product_id}
                        className="cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border-2 border-gray-200 hover:border-blue-300"
                        onClick={() => onProductSelect(product)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Package className="h-6 w-6 text-blue-600" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">
                                  {product.product_name}
                                </h4>
                                <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                  <span>SKU: {product.sku}</span>
                                  <span>Category: {product.category}</span>
                                  {product.supplier_name && (
                                    <span>Supplier: {product.supplier_name}</span>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-2 mt-2">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${stockInfo.bgColor} ${stockInfo.color}`}>
                                    {stockInfo.status}: {product.quantity}
                                  </span>
                                  {product.quantity === 0 && (
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right ml-4">
                              <div className="text-xl font-bold text-blue-600">
                                {formatCurrency(Number(product.price))}
                              </div>
                              <Button 
                                size="sm" 
                                className="mt-2"
                                disabled={product.quantity === 0}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-600">
                      Try adjusting your search criteria or search type.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {!searchQuery && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start searching for products</h3>
              <p className="text-gray-600">
                Enter a search term to find products to add to your cart
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center px-6 py-3 text-base"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in cart
          </p>
        </div>
        
        <Button
          onClick={onNext}
          disabled={cartItemCount === 0 || isLoading}
          className="flex items-center px-8 py-3 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Loading...
            </div>
          ) : (
            <>
              Continue to Payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
