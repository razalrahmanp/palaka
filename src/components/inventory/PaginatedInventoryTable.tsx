'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card'
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SlidersHorizontal, AlertCircle, Settings, Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { ProductWithInventory, Supplier } from '@/types'

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface InventoryResponse {
  products: ProductWithInventory[];
  pagination: PaginationData;
}

type Props = {
  onAdjustClick: (item: ProductWithInventory) => void,
  onAddItem: () => void,
  onManageMargins: () => void,
  onAddSupplier: () => void,
  suppliers: Supplier[]
}

export const PaginatedInventoryTable: React.FC<Props> = ({ 
  onAdjustClick, 
  onAddItem, 
  onManageMargins, 
  onAddSupplier,
  suppliers 
}) => {
  const [items, setItems] = useState<ProductWithInventory[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [supplier, setSupplier] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  // Fetch unique categories for filter
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/products?limit=1000') // Get all products to extract categories
      const data = await response.json()
      const uniqueCategories = [...new Set(data.products?.map((item: ProductWithInventory) => item.category).filter(Boolean))] as string[]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(category && { category }),
        ...(supplier && { supplier })
      })

      const response = await fetch(`/api/products?${params}`)
      const data: InventoryResponse = await response.json()
      
      setItems(data.products)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching inventory data:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search, category, supplier])

  // Real-time update interval
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleSearch = (value: string) => {
    setSearch(value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleCategoryFilter = (value: string) => {
    setCategory(value === 'all' ? '' : value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSupplierFilter = (value: string) => {
    setSupplier(value === 'all' ? '' : value)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleRefresh = () => {
    fetchData()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Inventory ({pagination.total} items)</CardTitle>
          <CardDescription>
            Manage stock levels and costs for all products. Prices (MRP) are calculated automatically.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={onManageMargins}>
            <Settings className="mr-2 h-4 w-4" /> Manage Margins
          </Button>
          <Button onClick={onAddItem}>Add New Item</Button>
          <Button onClick={onAddSupplier}>
            Add Supplier
          </Button>
        </div>
      </CardHeader>
      
      {/* Filters */}
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search products, SKU, or description..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={category || 'all'} onValueChange={handleCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={supplier || 'all'} onValueChange={handleSupplierFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              {suppliers.map(sup => (
                <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          )}
          
          <Table>
            <TableHeader>
              <TableRow>
                {['Product', 'SKU', 'Supplier', 'Category', 'Subcat', 'Material', 'Location', 'Cost', 'MRP', 'Margin', 'Stock', 'Reorder', 'Actions'].map(h => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="text-center py-8 text-gray-500">
                    {loading ? 'Loading...' : 'No inventory items found'}
                  </TableCell>
                </TableRow>
              ) : (
                items.map(i => (
                  <TableRow key={i.inventory_id}>
                    <TableCell className="font-medium">{i.product_name}</TableCell>
                    <TableCell className="font-mono text-sm">{i.sku}</TableCell>
                    <TableCell>{i.supplier_name}</TableCell>
                    <TableCell>{i.category}</TableCell>
                    <TableCell>{i.subcategory}</TableCell>
                    <TableCell>{i.material}</TableCell>
                    <TableCell>{i.location}</TableCell>
                    <TableCell>${Number(i.cost).toFixed(2)}</TableCell>
                    <TableCell className="font-bold">${Number(i.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{i.applied_margin}%</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.quantity > i.reorder_point ? 'default' : 'destructive'}>
                        {i.quantity <= i.reorder_point && <AlertCircle className="mr-1 h-3 w-3" />}
                        {i.quantity}
                      </Badge>
                    </TableCell>
                    <TableCell>{i.reorder_point}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAdjustClick(i)}
                      >
                        <SlidersHorizontal className="mr-1 h-4 w-4" />
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-gray-500">
            Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1;
                const isCurrentPage = page === pagination.page;
                return (
                  <Button
                    key={page}
                    variant={isCurrentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                  >
                    {page}
                  </Button>
                );
              })}
              
              {pagination.totalPages > 5 && (
                <>
                  {pagination.page < pagination.totalPages - 2 && <span className="px-2">...</span>}
                  {pagination.page !== pagination.totalPages && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={loading}
                    >
                      {pagination.totalPages}
                    </Button>
                  )}
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
