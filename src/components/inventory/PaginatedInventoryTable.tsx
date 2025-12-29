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
import { SlidersHorizontal, AlertCircle, Settings, ChevronLeft, ChevronRight, RefreshCw, Download } from 'lucide-react'
import { ProductWithInventory } from '@/types'
import XLSX from 'xlsx-js-style'

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
  onAddSupplier: () => void
}

export const PaginatedInventoryTable: React.FC<Props> = ({ 
  onAdjustClick, 
  onAddItem, 
  onManageMargins, 
  onAddSupplier
}) => {
  const [items, setItems] = useState<ProductWithInventory[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50, // Increased from 20 to 50 to show more recent products
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        _t: Date.now().toString() // Cache buster to ensure fresh data
      })

      const response = await fetch(`/api/inventory/products?${params}`)
      const data: InventoryResponse = await response.json()
      
      setItems(data.products)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching inventory data:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit])

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

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleRefresh = () => {
    fetchData()
  }

  // Export inventory to Excel with two sheets
  const exportToExcel = async () => {
    try {
      // Fetch ALL inventory items (without pagination)
      const response = await fetch('/api/inventory/products?limit=10000&_t=' + Date.now())
      const data = await response.json()
      const allProducts: ProductWithInventory[] = data.products || data || []

      // Fetch sold data for stock out products
      const stockOutProductIds = allProducts
        .filter(item => item.quantity === 0)
        .map(item => item.product_id)

      // Fetch sales data for stock out products
      let salesData: Record<string, { soldQty: number; soldValue: number }> = {}
      if (stockOutProductIds.length > 0) {
        try {
          const salesResponse = await fetch('/api/inventory/sold-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds: stockOutProductIds })
          })
          if (salesResponse.ok) {
            salesData = await salesResponse.json()
          }
        } catch (err) {
          console.error('Error fetching sales data:', err)
        }
      }

      // Sheet 1: In-Stock Products (quantity > 0)
      const inStockProducts = allProducts
        .filter(item => item.quantity > 0)
        .map(item => ({
          'Product Name': item.product_name || '',
          'SKU': item.sku || '',
          'Category': item.category || '',
          'Subcategory': item.subcategory || '',
          'Material': item.material || '',
          'Supplier': item.supplier_name || '',
          'Location': item.location || '',
          'Quantity': item.quantity,
          'Cost (₹)': Number(item.cost || 0).toFixed(2),
          'MRP (₹)': Number(item.price || 0).toFixed(2),
          'Total Cost (₹)': (item.quantity * Number(item.cost || 0)).toFixed(2),
          'Total MRP (₹)': (item.quantity * Number(item.price || 0)).toFixed(2),
          'Margin %': item.cost && item.price && Number(item.cost) > 0 
            ? (((Number(item.price) - Number(item.cost)) / Number(item.cost)) * 100).toFixed(1)
            : '0',
          'Reorder Point': item.reorder_point
        }))

      // Calculate totals for in-stock
      const inStockTotalCost = allProducts
        .filter(item => item.quantity > 0)
        .reduce((sum, item) => sum + (item.quantity * Number(item.cost || 0)), 0)
      const inStockTotalMRP = allProducts
        .filter(item => item.quantity > 0)
        .reduce((sum, item) => sum + (item.quantity * Number(item.price || 0)), 0)
      const inStockTotalQty = allProducts
        .filter(item => item.quantity > 0)
        .reduce((sum, item) => sum + item.quantity, 0)

      // Add totals row to in-stock
      inStockProducts.push({
        'Product Name': 'TOTAL',
        'SKU': '',
        'Category': '',
        'Subcategory': '',
        'Material': '',
        'Supplier': '',
        'Location': '',
        'Quantity': inStockTotalQty,
        'Cost (₹)': '',
        'MRP (₹)': '',
        'Total Cost (₹)': inStockTotalCost.toFixed(2),
        'Total MRP (₹)': inStockTotalMRP.toFixed(2),
        'Margin %': '',
        'Reorder Point': 0
      } as typeof inStockProducts[0])

      // Sheet 2: Stock Out Products (quantity = 0) with sold data
      const stockOutProducts = allProducts
        .filter(item => item.quantity === 0)
        .map(item => {
          const sold = salesData[item.product_id] || { soldQty: 0, soldValue: 0 }
          return {
            'Product Name': item.product_name || '',
            'SKU': item.sku || '',
            'Category': item.category || '',
            'Subcategory': item.subcategory || '',
            'Material': item.material || '',
            'Supplier': item.supplier_name || '',
            'Cost (₹)': Number(item.cost || 0).toFixed(2),
            'MRP (₹)': Number(item.price || 0).toFixed(2),
            'Sold Qty': sold.soldQty,
            'Sold Value (₹)': sold.soldValue.toFixed(2),
            'Reorder Point': item.reorder_point
          }
        })

      // Calculate totals for stock out
      const stockOutTotalSoldQty = stockOutProducts.reduce((sum, item) => sum + (Number(item['Sold Qty']) || 0), 0)
      const stockOutTotalSoldValue = stockOutProducts.reduce((sum, item) => sum + (Number(item['Sold Value (₹)']) || 0), 0)

      // Add totals row to stock out
      stockOutProducts.push({
        'Product Name': 'TOTAL',
        'SKU': '',
        'Category': '',
        'Subcategory': '',
        'Material': '',
        'Supplier': '',
        'Cost (₹)': '',
        'MRP (₹)': '',
        'Sold Qty': stockOutTotalSoldQty,
        'Sold Value (₹)': stockOutTotalSoldValue.toFixed(2),
        'Reorder Point': 0
      } as typeof stockOutProducts[0])

      // Create workbook with two sheets
      const wb = XLSX.utils.book_new()

      // Header style - Blue background with white text
      const headerStyle = {
        fill: { fgColor: { rgb: "4472C4" } },
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      }

      // Total row style - Green background with white text
      const totalStyle = {
        fill: { fgColor: { rgb: "70AD47" } },
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      }

      // Data cell style
      const dataStyle = {
        border: {
          top: { style: "thin", color: { rgb: "D3D3D3" } },
          bottom: { style: "thin", color: { rgb: "D3D3D3" } },
          left: { style: "thin", color: { rgb: "D3D3D3" } },
          right: { style: "thin", color: { rgb: "D3D3D3" } }
        },
        alignment: { vertical: "center" }
      }

      // Sheet 1: In-Stock Products
      const ws1 = XLSX.utils.json_to_sheet(inStockProducts)
      
      // Apply header styles (row 1)
      const headerCols1 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']
      headerCols1.forEach(col => {
        const cellRef = col + '1'
        if (ws1[cellRef]) {
          ws1[cellRef].s = headerStyle
        }
      })

      // Apply total row styles (last row)
      const totalRowNum1 = inStockProducts.length + 1
      headerCols1.forEach(col => {
        const cellRef = col + totalRowNum1
        if (ws1[cellRef]) {
          ws1[cellRef].s = totalStyle
        }
      })

      // Apply data styles to all other rows
      for (let row = 2; row < totalRowNum1; row++) {
        headerCols1.forEach(col => {
          const cellRef = col + row
          if (ws1[cellRef]) {
            ws1[cellRef].s = dataStyle
          }
        })
      }

      // Set column widths
      ws1['!cols'] = [
        { wch: 35 }, // Product Name
        { wch: 20 }, // SKU
        { wch: 15 }, // Category
        { wch: 15 }, // Subcategory
        { wch: 12 }, // Material
        { wch: 20 }, // Supplier
        { wch: 12 }, // Location
        { wch: 10 }, // Quantity
        { wch: 12 }, // Cost
        { wch: 12 }, // MRP
        { wch: 15 }, // Total Cost
        { wch: 15 }, // Total MRP
        { wch: 10 }, // Margin
        { wch: 12 }, // Reorder Point
      ]
      
      // Set row heights
      ws1['!rows'] = [{ hpt: 25 }] // Header row height
      
      XLSX.utils.book_append_sheet(wb, ws1, 'In-Stock Products')

      // Sheet 2: Stock Out Products
      const ws2 = XLSX.utils.json_to_sheet(stockOutProducts)
      
      // Apply header styles (row 1) - 11 columns now (A-K)
      const headerCols2 = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']
      headerCols2.forEach(col => {
        const cellRef = col + '1'
        if (ws2[cellRef]) {
          ws2[cellRef].s = headerStyle
        }
      })

      // Apply total row styles (last row)
      const totalRowNum2 = stockOutProducts.length + 1
      headerCols2.forEach(col => {
        const cellRef = col + totalRowNum2
        if (ws2[cellRef]) {
          ws2[cellRef].s = totalStyle
        }
      })

      // Apply data styles to all other rows
      for (let row = 2; row < totalRowNum2; row++) {
        headerCols2.forEach(col => {
          const cellRef = col + row
          if (ws2[cellRef]) {
            ws2[cellRef].s = dataStyle
          }
        })
      }

      ws2['!cols'] = [
        { wch: 35 }, // Product Name
        { wch: 20 }, // SKU
        { wch: 15 }, // Category
        { wch: 15 }, // Subcategory
        { wch: 12 }, // Material
        { wch: 20 }, // Supplier
        { wch: 12 }, // Cost
        { wch: 12 }, // MRP
        { wch: 12 }, // Sold Qty
        { wch: 15 }, // Sold Value
        { wch: 12 }, // Reorder Point
      ]
      
      ws2['!rows'] = [{ hpt: 25 }] // Header row height
      
      XLSX.utils.book_append_sheet(wb, ws2, 'Stock Out Products')

      // Generate filename with date
      const today = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `Inventory_Report_${today}.xlsx`)

    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export inventory. Please try again.')
    }
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportToExcel} className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700">
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
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
      
      <CardContent className="space-y-4">
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
                    <TableCell>₹{Number(i.cost).toFixed(2)}</TableCell>
                    <TableCell className="font-bold">₹{Number(i.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {i.cost && i.price && Number(i.cost) > 0 
                          ? (((Number(i.price) - Number(i.cost)) / Number(i.cost)) * 100).toFixed(1)
                          : i.applied_margin || 0
                        }%
                      </Badge>
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
