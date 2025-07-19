'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { List, Tags } from 'lucide-react'
import { InventoryAlerts } from '@/components/inventory/InventoryAlerts'
import InventoryItemForm from '@/components/inventory/InventoryItemForm'
import { SupplierForm } from '@/components/inventory/SupplierForm'
import { ProductWithInventory, Supplier } from '@/types'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { ProductLabels } from '@/components/inventory/ProductLabels'
import { ProfitMarginManager } from '@/components/inventory/ProfitMarginManager'
import { FilterBarDialog } from '@/components/inventory/FilterBar' // Importing the new FilterBarDialog component

export default function InventoryPage() {
  const [items, setItems] = useState<ProductWithInventory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [addSupplierOpen, setAddSupplierOpen] = useState(false)
  const [manageMarginsOpen, setManageMarginsOpen] = useState(false)

  type InventoryFilters = {
    supplier: string | null
    category: string | null
    priceRange: 'low' | 'medium' | 'high' | null
  }

  const [filters, setFilters] = useState<InventoryFilters>({ supplier: null, category: null, priceRange: null })
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false) // To handle the filter dialog's visibility

  const fetchAll = useCallback(() => {
    fetch('/api/products').then(r => r.json()).then(setItems)
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers)
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

  const handleFilterChange = (filters: InventoryFilters) => {
    setFilters(filters)
  }

  const handleClearFilters = () => {
    setFilters({ supplier: null, category: null, priceRange: null })
  }

  const filteredItems = items.filter(i => {
    return (
      (filters.supplier ? i.supplier_id === filters.supplier : true) &&
      (filters.category ? i.category === filters.category : true) &&
      (filters.priceRange
        ? filters.priceRange === 'low'
          ? (i.price ?? 0) < 1000
          : filters.priceRange === 'medium'
          ? (i.price ?? 0) >= 1000 && (i.price ?? 0) <= 5000
          : (i.price ?? 0) > 5000
        : true)
    )
  })

  const uniqueProducts = Array.from(new Map(items.map(item => [item.product_id, item])).values())

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full h-auto md:h-[calc(100vh-4rem)] p-4">
      <div className="flex-1 overflow-hidden">
        {/* Button to toggle the filter dialog */}
        <button
          onClick={() => setIsFilterDialogOpen(true)}
          className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg"
        >
          Filter
        </button>

        {/* Filter Dialog */}
        <FilterBarDialog
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierId}
          onSelectSupplier={setSelectedSupplierId}
          onFilterChange={handleFilterChange} // Pass the filter change handler
          onClearFilters={handleClearFilters} // Pass the clear filter function
          isOpen={isFilterDialogOpen}
          onClose={() => setIsFilterDialogOpen(false)} // Close the dialog
        />

        <Tabs defaultValue="list" className="w-full h-full flex flex-col mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" /> Inventory List</TabsTrigger>
            <TabsTrigger value="labels"><Tags className="mr-2 h-4 w-4" /> Product Labels</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="flex-1 overflow-y-auto mt-4">
            <InventoryTable
              items={filteredItems}
              onAdjustClick={() => {}}
              onAddItem={() => setAddItemOpen(true)}
              onManageMargins={() => setManageMarginsOpen(true)}
              onAddSupplier={() => setAddSupplierOpen(true)}
            />
            <InventoryAlerts
              alerts={filteredItems
                .filter(i => i.quantity <= i.reorder_point)
                .map(i => ({
                  id: i.inventory_id,
                  type: 'Inventory' as const,
                  message: `${i.product_name} at or below reorder point`,
                  priority: 'high' as const
                }))} />
          </TabsContent>

          <TabsContent value="labels" className="flex-1 overflow-y-auto mt-4">
            <ProductLabels products={uniqueProducts} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Manage Profit Margins Dialog */}
      <Dialog open={manageMarginsOpen} onOpenChange={setManageMarginsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Profit Margin Rules</DialogTitle>
            <DialogDescription>
              Set specific profit margins for products, categories, or subcategories.
            </DialogDescription>
          </DialogHeader>
          <ProfitMarginManager products={uniqueProducts} />
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
          <InventoryItemForm
            existingProducts={items.map(i => ({ id: i.product_id, name: i.product_name }))} 
            suppliers={suppliers}
            onSubmit={createInventory}
            onCancel={() => setAddItemOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Supplier Dialog */}
      <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
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
    </div>
  )
}
