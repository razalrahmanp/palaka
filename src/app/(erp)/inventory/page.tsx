'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { List, Tags, Package, Users } from 'lucide-react'
import InventoryItemForm from '@/components/inventory/InventoryItemForm'
import { SupplierForm } from '@/components/inventory/SupplierForm'
import { StockAdjustmentForm } from '@/components/inventory/StockAdjustmentForm'
import { ProductWithInventory, Supplier } from '@/types'
import { PaginatedInventoryTable } from '@/components/inventory/PaginatedInventoryTable'
import { ProductLabels } from '@/components/inventory/ProductLabels'
import { ProfitMarginManager } from '@/components/inventory/ProfitMarginManager'
import { ProductSummary } from '@/components/inventory/ProductSummary'

export default function InventoryPage() {
  const [items, setItems] = useState<ProductWithInventory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [addSupplierOpen, setAddSupplierOpen] = useState(false)
  const [manageMarginsOpen, setManageMarginsOpen] = useState(false)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ProductWithInventory | null>(null)

  const fetchAll = useCallback(() => {
    const timestamp = Date.now(); // Cache buster
    console.log('Fetching products from API...')
    // Fetch without pagination to get all products
    fetch(`/api/inventory/products?_t=${timestamp}`).then(r => r.json()).then(data => {
      // Handle both old format (array) and new format (object with products array)
      const productsArray = Array.isArray(data) ? data : data.products || [];
      console.log(`Received ${productsArray.length} products from API`)
      setItems(productsArray);
    }).catch(error => {
      console.error('Error fetching products:', error)
    })
    fetch(`/api/suppliers?_t=${timestamp}`).then(r => r.json()).then(setSuppliers)
  }, [])

  useEffect(fetchAll, [fetchAll])

  const createInventory = useCallback(
    async (form: {
      useExisting: boolean
      newProduct?: {
        name: string
        sku?: string
        description?: string
        category?: string
        subcategory?: string
        material?: string
        image_url?: string
        price: number
      }
      product_id?: string
      supplier_id?: string
      category?: string
      subcategory?: string
      material?: string
      location?: string
      quantity: number
      reorder_point: number
    }) => {
      let pid = form.product_id
      if (!form.useExisting && form.newProduct) {
        const supplier = suppliers.find(s => s.id === form.supplier_id)
        const supplierCode = supplier ? supplier.name.substring(0, 3).toUpperCase() : 'GEN'
        const categoryCode = form.newProduct.category ? form.newProduct.category.substring(0, 3).toUpperCase() : 'PROD'
        const now = new Date()
        const dateCode = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`
        const randomPart = Math.floor(1000 + Math.random() * 9000)
        const generatedSku = `${supplierCode}-${categoryCode}-${dateCode}-${randomPart}`

        const { name, sku, description, category, price, image_url, subcategory, material } = form.newProduct
        const productData = {
          name,
          sku: sku || generatedSku,
          description,
          category,
          subcategory,
          material,
          image_url,
          cost: price,
          price
        }

        const resp = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        })
        const prod = await resp.json()
        pid = prod.id
      }
      if (!form.supplier_id) return

      await fetch('/api/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: pid,
          supplier_id: form.supplier_id,
          category: form.category,
          subcategory: form.subcategory,
          material: form.material,
          location: form.location,
          quantity: form.quantity,
          reorder_point: form.reorder_point
        })
      })
    },
    [suppliers]
  )

  const handleAdjustClick = (item: ProductWithInventory) => {
    setSelectedItem(item)
    setAdjustmentOpen(true)
  }

  const handleStockAdjustment = async (adjustment: { quantity: number; type: 'increase' | 'decrease'; reason: string }) => {
    if (!selectedItem) return

    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedItem.product_id,
          type: adjustment.type,
          quantity: adjustment.quantity,
          reason: adjustment.reason
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to adjust stock')
      }

      // Refresh data
      fetchAll()
      setAdjustmentOpen(false)
      setSelectedItem(null)
    } catch (error) {
      console.error('Error adjusting stock:', error)
      alert('Failed to adjust stock: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const uniqueProducts = Array.from(new Map(items.map(item => [item.product_id, item])).values())
  
  // For labels, we want all items (not deduplicated) so users can print labels for specific locations
  const allProductsForLabels = items

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 relative">
      {/* Floating Add Supplier Button */}
      <Button
        onClick={() => setAddSupplierOpen(true)}
        className="fixed right-8 bottom-8 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-6 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110"
      >
        <Users className="mr-2 h-5 w-5" />
        Add Supplier
      </Button>

      {/* Main Content */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-xl overflow-hidden">
        <Tabs defaultValue="list" className="w-full">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b border-indigo-100/50">
            <TabsList className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl p-1">
              <TabsTrigger 
                value="list" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                <List className="mr-2 h-4 w-4" /> Inventory List
              </TabsTrigger>
              <TabsTrigger 
                value="labels"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                <Tags className="mr-2 h-4 w-4" /> Product Labels
              </TabsTrigger>
              <TabsTrigger 
                value="summary"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                <Package className="mr-2 h-4 w-4" /> Product Summary
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list" className="p-4 pt-2">
            <PaginatedInventoryTable
              onAdjustClick={handleAdjustClick}
              onAddItem={() => setAddItemOpen(true)}
              onManageMargins={() => setManageMarginsOpen(true)}
              onAddSupplier={() => setAddSupplierOpen(true)}
            />
          </TabsContent>

          <TabsContent value="labels" className="p-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Product Labels</h2>
              <p className="text-gray-600">Generate and print product labels</p>
            </div>
            <ProductLabels products={allProductsForLabels} />
          </TabsContent>

          <TabsContent value="summary" className="p-4">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Product Summary</h2>
              <p className="text-gray-600">Detailed product analytics and sales tracking</p>
            </div>
            <ProductSummary />
          </TabsContent>
        </Tabs>
      </div>

      {/* Manage Profit Margins Dialog */}
      <Dialog open={manageMarginsOpen} onOpenChange={setManageMarginsOpen}>
        <DialogContent className="max-w-4xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Manage Profit Margin Rules
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Set specific profit margins for products, categories, or subcategories.
            </DialogDescription>
          </DialogHeader>
          <ProfitMarginManager products={uniqueProducts} />
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Add Inventory Item
            </DialogTitle>
          </DialogHeader>
          <InventoryItemForm
            existingProducts={uniqueProducts.map(i => ({ id: i.product_id, name: i.product_name }))} 
            suppliers={suppliers}
            onSubmit={createInventory}
            onCancel={() => setAddItemOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Supplier Dialog */}
      <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              New Supplier
            </DialogTitle>
          </DialogHeader>
          <SupplierForm
            onSubmit={async (sup) => {
              await fetch('/api/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sup)
              })
              fetchAll()
              setAddSupplierOpen(false)
            }}
            onCancel={() => setAddSupplierOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Adjust Stock
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Adjust inventory levels for this product
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <StockAdjustmentForm
              item={{
                name: selectedItem.product_name,
                stock: selectedItem.quantity,
                id: selectedItem.inventory_id,
                quantity: selectedItem.quantity,
                reorder_point: selectedItem.reorder_point,
                updated_at: selectedItem.updated_at
              }}
              onSubmit={handleStockAdjustment}
              onCancel={() => {
                setAdjustmentOpen(false)
                setSelectedItem(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )

  
}
