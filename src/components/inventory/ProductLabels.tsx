// components/inventory/ProductLabels.tsx
'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { ProductWithInventory } from '@/types'
import { LABEL_SIZES, DEFAULT_LABEL_SIZE } from './labels/LabelSizes'
import { LabelControls } from './labels/LabelControls'
import { LabelPreview } from './labels/LabelPreview'
import { EmptyLabelsState } from './labels/EmptyLabelsState'
import { printBatchLabels, printQuantityLabels } from './labels/PrintService'
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
import { CalendarIcon, Search, Filter, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

type Props = {
  products: ProductWithInventory[]
}

interface ProductFilters {
  search: string
  selectedProduct: string
  dateFrom: Date | undefined
  dateTo: Date | undefined
  supplier: string
  location: string
  createdBy: string
  updatedBy: string
  dateType: 'created' | 'updated'
}

export const ProductLabels: React.FC<Props> = ({ products }) => {
  const [selectedSize, setSelectedSize] = useState<string>(DEFAULT_LABEL_SIZE)
  const [searchResults, setSearchResults] = useState<ProductWithInventory[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(100) // Show 100 items per page for better performance
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    selectedProduct: '',
    dateFrom: undefined,
    dateTo: undefined,
    supplier: '',
    location: '',
    createdBy: '',
    updatedBy: '',
    dateType: 'updated'
  })
  const [suppliers, setSuppliers] = useState<Array<{id: string, name: string}>>([])
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(false)
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters.search, filters.selectedProduct, filters.supplier, filters.location])

  // Function to search using the server-side search API
  const performServerSearch = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    
    setIsSearching(true)
    try {
      const response = await fetch(`/api/products/search?name=${encodeURIComponent(searchTerm)}&limit=100`)
      const data = await response.json()
      if (data.products) {
        setSearchResults(data.products)
      }
    } catch (error) {
      console.error('Error searching products:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (filters.search && filters.search.length >= 2) {
        performServerSearch(filters.search)
      } else {
        setSearchResults([])
        setIsSearching(false)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [filters.search])
  
  // Fetch suppliers and users for filtering
  React.useEffect(() => {
    // Fetch suppliers
    fetch('/api/suppliers')
      .then(r => r.json())
      .then(data => setSuppliers(data || []))
      .catch(console.error)

    // Fetch all users (for created_by/updated_by filtering)
    fetch('/api/employees') // This should fetch all employees/users
      .then(r => r.json())
      .then(data => {
        // Users data available for future use
        console.log('Users loaded:', data?.length || 0)
      })
      .catch(console.error)
  }, [])

  const currentSize = LABEL_SIZES[selectedSize]

  // Optimize unique values computation with better caching
  const uniqueProductNames = useMemo(() => {
    // Only compute if we have products and not using search results
    if (!products?.length) return []
    if (filters.search && searchResults.length > 0) return []
    
    const nameSet = new Set<string>()
    for (const product of products) {
      if (product.product_name) {
        nameSet.add(product.product_name)
      }
    }
    return Array.from(nameSet).sort()
  }, [products, filters.search, searchResults])

  const uniqueLocations = useMemo(() => {
    if (!products?.length) return []
    
    const locationSet = new Set<string>()
    for (const product of products) {
      if (product.location) {
        locationSet.add(product.location)
      }
    }
    return Array.from(locationSet).sort()
  }, [products])

  // Optimized filtering with ALL filter types including dates
  const filteredProducts = useMemo(() => {
    // Early return for empty datasets
    if (!products || products.length === 0) return []
    
    // Debug: Log filtering state
    console.log('Filtering state:', {
      productsCount: products.length,
      searchTerm: filters.search,
      searchResultsCount: searchResults.length,
      hasSearchResults: searchResults.length > 0,
      filters: filters
    })
    
    // Use search results if we have a search term and got results from server
    let baseProducts = products
    if (filters.search && filters.search.length >= 2 && searchResults.length > 0) {
      console.log('Using search results as base:', searchResults.length, searchResults[0])
      baseProducts = searchResults
    } else if (filters.search && filters.search.length >= 2 && searchResults.length === 0) {
      console.log('Search performed but no results found')
    }
    
    // Apply all filters to the base product list
    const result = baseProducts.filter(product => {
      // Product name filter
      if (filters.selectedProduct && product.product_name !== filters.selectedProduct) {
        return false
      }
      
      // Supplier filter
      if (filters.supplier && product.supplier_id !== filters.supplier) {
        return false
      }
      
      // Location filter
      if (filters.location && product.location !== filters.location) {
        return false
      }
      
      // Date filtering based on dateType
      if (filters.dateFrom || filters.dateTo) {
        const productDate = filters.dateType === 'created' 
          ? new Date(product.product_created_at || product.updated_at || '')
          : new Date(product.updated_at || '')
        
        if (isNaN(productDate.getTime())) {
          // If date is invalid, skip date filtering for this product
        } else {
          if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom)
            fromDate.setHours(0, 0, 0, 0)
            productDate.setHours(0, 0, 0, 0)
            if (productDate < fromDate) return false
          }
          
          if (filters.dateTo) {
            const toDate = new Date(filters.dateTo)
            toDate.setHours(23, 59, 59, 999)
            productDate.setHours(23, 59, 59, 999)
            if (productDate > toDate) return false
          }
        }
      }
      
      // Search filter - only apply if we're NOT using server search results
      if (filters.search && filters.search.length > 0 && baseProducts === products) {
        const searchLower = filters.search.toLowerCase().trim()
        const productName = (product.product_name ?? '').toLowerCase()
        const productSku = (product.sku ?? '').toLowerCase()
        const productCategory = (product.category ?? '').toLowerCase()
        const productDescription = (product.product_description ?? '').toLowerCase()
        
        if (!(productName.includes(searchLower) || 
              productSku.includes(searchLower) || 
              productCategory.includes(searchLower) ||
              productDescription.includes(searchLower))) {
          return false
        }
      }
      
      return true
    })
    
    console.log('Final filtered result:', {
      baseProductsCount: baseProducts.length,
      filteredCount: result.length,
      usingSearchResults: baseProducts === searchResults
    })
    
    return result
  }, [products, filters, searchResults])

  // Paginated products for better performance
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)

  const handlePrint = (product: ProductWithInventory) => {
    // Print labels based on product quantity for stock labeling
    printQuantityLabels(product, currentSize)
  }

  const handlePrintAll = () => {
    printBatchLabels(filteredProducts, currentSize)
  }

  const clearFilters = () => {
    setCurrentPage(1)
    setFilters({
      search: '',
      selectedProduct: '',
      dateFrom: undefined,
      dateTo: undefined,
      supplier: '',
      location: '',
      createdBy: '',
      updatedBy: '',
      dateType: 'updated'
    })
  }

  const hasActiveFilters = filters.search || filters.selectedProduct || filters.dateFrom || filters.dateTo || 
    filters.supplier || filters.location || filters.createdBy || filters.updatedBy

  return (
    <div className="space-y-6">
      {/* Enhanced Filter Section */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Product Filters</h3>
                <p className="text-sm text-gray-600">Refine your product search</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {Object.values(filters).filter(Boolean).length} active
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
                className="text-gray-600 hover:text-gray-900"
              >
                {isFiltersCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {!isFiltersCollapsed && (
          <CardContent className="pt-0">
            {/* Primary Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Enhanced Search Input */}
              <div className="lg:col-span-2 space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Quick Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, SKU, category..."
                    value={filters.search}
                    onChange={(e) => {
                      // Instant update - no delays!
                      setFilters(prev => ({ ...prev, search: e.target.value }))
                    }}
                    className="pl-10 pr-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500 transition-colors duration-200"
                  />
                  {isSearching ? (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                  ) : filters.search && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {filters.search && filters.search.length >= 2 && (
                  <div className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                    {searchResults.length > 0 ? (
                      <span className="text-green-600">✓ Found {searchResults.length} products via search</span>
                    ) : isSearching ? (
                      <span className="text-blue-600">🔍 Searching...</span>
                    ) : (
                      <span className="text-gray-600">📱 Using local filter</span>
                    )}
                  </div>
                )}
              </div>

              {/* Product Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Product Name</label>
                <Select
                  value={filters.selectedProduct}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    selectedProduct: value === 'all' ? '' : value 
                  }))}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="All products" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="all">
                      <span className="font-medium">All products</span>
                    </SelectItem>
                    {uniqueProductNames.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Supplier</label>
                <Select
                  value={filters.supplier}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    supplier: value === 'all' ? '' : value 
                  }))}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="All suppliers" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="all">
                      <span className="font-medium">All suppliers</span>
                    </SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Secondary Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Location</label>
                <Select
                  value={filters.location}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    location: value === 'all' ? '' : value 
                  }))}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    <SelectItem value="all">
                      <span className="font-medium">All locations</span>
                    </SelectItem>
                    {uniqueLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Type Toggle */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Date Filter Type</label>
                <Select
                  value={filters.dateType}
                  onValueChange={(value: 'created' | 'updated') => setFilters(prev => ({ 
                    ...prev, 
                    dateType: value 
                  }))}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">📅 Updated Date</SelectItem>
                    <SelectItem value="created">🆕 Created Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {filters.dateType === 'created' ? 'Created From' : 'Updated From'}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal border-gray-200 hover:border-blue-500"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                      {filters.dateFrom ? (
                        <span className="text-gray-900">{format(filters.dateFrom, "MMM dd, yyyy")}</span>
                      ) : (
                        <span className="text-gray-500">Select start date</span>
                      )}
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
                <label className="text-sm font-medium text-gray-700">
                  {filters.dateType === 'created' ? 'Created To' : 'Updated To'}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal border-gray-200 hover:border-blue-500"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                      {filters.dateTo ? (
                        <span className="text-gray-900">{format(filters.dateTo, "MMM dd, yyyy")}</span>
                      ) : (
                        <span className="text-gray-500">Select end date</span>
                      )}
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
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today }))
                  setCurrentPage(1) // Reset to first page
                }}
                className="text-xs bg-white hover:bg-blue-50 border-blue-200 text-blue-700"
              >
                📅 Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                  setFilters(prev => ({ ...prev, dateFrom: lastWeek, dateTo: today }))
                  setCurrentPage(1) // Reset to first page
                }}
                className="text-xs bg-white hover:bg-green-50 border-green-200 text-green-700"
              >
                📊 Last 7 Days
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const today = new Date()
                  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                  setFilters(prev => ({ ...prev, dateFrom: lastMonth, dateTo: today }))
                  setCurrentPage(1) // Reset to first page
                }}
                className="text-xs bg-white hover:bg-purple-50 border-purple-200 text-purple-700"
              >
                📈 Last 30 Days
              </Button>
            </div>

            {/* Enhanced Filter Results Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-gray-900">
                    Showing {paginatedProducts.length} of {filteredProducts.length} products
                  </div>
                  {filteredProducts.length > itemsPerPage && (
                    <Badge variant="outline" className="text-xs">
                      Page {currentPage} of {totalPages}
                    </Badge>
                  )}
                  {hasActiveFilters && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      Filtered
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {filteredProducts.length === products.length ? 
                    "All products shown" : 
                    `${products.length - filteredProducts.length} products hidden by filters`
                  }
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Label Controls */}
      <LabelControls
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
        onPrintAll={handlePrintAll}
        productCount={filteredProducts.length}
        products={filteredProducts}
      />

      {/* Enhanced Pagination Controls */}
      {totalPages > 1 && (
        <Card className="border-none shadow-md bg-white">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{filteredProducts.length}</span> total products
                </div>
                <div className="text-sm text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="text-xs px-3 py-1 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="text-xs px-3 py-1 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1 mx-2">
                  {/* Page numbers with smart display */}
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
                        onClick={() => setCurrentPage(pageNum)}
                        className={`text-xs w-8 h-8 p-0 ${
                          currentPage === pageNum 
                            ? "bg-blue-600 text-white border-blue-600" 
                            : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="text-gray-400 px-1">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="text-xs w-8 h-8 p-0 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="text-xs px-3 py-1 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="text-xs px-3 py-1 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                >
                  Last
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          {paginatedProducts.map(product => (
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
