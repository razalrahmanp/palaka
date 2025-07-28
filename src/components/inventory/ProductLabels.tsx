// components/inventory/ProductLabels.tsx
'use client'
import React, { useState, useMemo } from 'react'
import { ProductWithInventory } from '@/types'
import { LABEL_SIZES, DEFAULT_LABEL_SIZE } from './labels/LabelSizes'
import { LabelControls } from './labels/LabelControls'
import { LabelPreview } from './labels/LabelPreview'
import { EmptyLabelsState } from './labels/EmptyLabelsState'
import { printSingleLabel, printBatchLabels } from './labels/PrintService'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Search, Filter, X } from 'lucide-react'
import { format } from 'date-fns'

type Props = {
  products: ProductWithInventory[]
}

interface ProductFilters {
  search: string
  selectedProduct: string
  dateFrom: Date | undefined
  dateTo: Date | undefined
}

export const ProductLabels: React.FC<Props> = ({ products }) => {
  const [selectedSize, setSelectedSize] = useState<string>(DEFAULT_LABEL_SIZE)
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    selectedProduct: '',
    dateFrom: undefined,
    dateTo: undefined
  })

  const currentSize = LABEL_SIZES[selectedSize]

  // Get unique product names for dropdown
  const uniqueProductNames = useMemo(() => {
    const names = [...new Set(products.map(p => p.product_name))].sort()
    return names
  }, [products])

  // Filter products based on search, product selection, and date range
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter (product name, SKU, category)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch = 
          product.product_name.toLowerCase().includes(searchLower) ||
          (product.sku && product.sku.toLowerCase().includes(searchLower)) ||
          (product.category && product.category.toLowerCase().includes(searchLower)) ||
          (product.subcategory && product.subcategory.toLowerCase().includes(searchLower))
        
        if (!matchesSearch) return false
      }

      // Product selection filter
      if (filters.selectedProduct && product.product_name !== filters.selectedProduct) {
        return false
      }

      // Date range filter (based on updated_at - inventory added date)
      if (filters.dateFrom || filters.dateTo) {
        const productDate = new Date(product.updated_at)
        
        if (filters.dateFrom && productDate < filters.dateFrom) {
          return false
        }
        
        if (filters.dateTo) {
          // Set time to end of day for dateTo
          const endOfDay = new Date(filters.dateTo)
          endOfDay.setHours(23, 59, 59, 999)
          if (productDate > endOfDay) {
            return false
          }
        }
      }

      return true
    })
  }, [products, filters])

  const handlePrint = (product: ProductWithInventory) => {
    printSingleLabel(product, currentSize)
  }

  const handlePrintAll = () => {
    printBatchLabels(filteredProducts, currentSize)
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      selectedProduct: '',
      dateFrom: undefined,
      dateTo: undefined
    })
  }

  const hasActiveFilters = filters.search || filters.selectedProduct || filters.dateFrom || filters.dateTo

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Filter Products</h3>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="ml-auto"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, SKU, category..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Select Product</label>
            <Select
              value={filters.selectedProduct}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                selectedProduct: value === 'all' ? '' : value 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {uniqueProductNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Added From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date To */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Added To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? format(filters.dateTo, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date()
              setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today }))
            }}
            className="text-xs"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date()
              const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              setFilters(prev => ({ ...prev, dateFrom: lastWeek, dateTo: today }))
            }}
            className="text-xs"
          >
            Last 7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date()
              const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
              setFilters(prev => ({ ...prev, dateFrom: lastMonth, dateTo: today }))
            }}
            className="text-xs"
          >
            Last 30 Days
          </Button>
        </div>

        {/* Filter Results Summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredProducts.length} of {products.length} products
          {hasActiveFilters && (
            <span className="ml-2 text-blue-600">
              (filtered)
            </span>
          )}
        </div>
      </div>

      {/* Label Controls */}
      <LabelControls
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
        onPrintAll={handlePrintAll}
        productCount={filteredProducts.length}
      />

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-8">
          {hasActiveFilters ? (
            <div className="space-y-2">
              <p className="text-gray-500">No products match your current filters</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <EmptyLabelsState />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <LabelPreview
              key={product.product_id}
              product={product}
              size={currentSize}
              onPrint={() => handlePrint(product)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
