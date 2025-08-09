'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { List, Tags, Package, CheckCircle, AlertTriangle, Users } from 'lucide-react'
import { LiveInventoryAlerts } from '@/components/inventory/LiveInventoryAlerts'
import InventoryItemForm from '@/components/inventory/InventoryItemForm'
import { SupplierForm } from '@/components/inventory/SupplierForm'
import { ProductWithInventory, Supplier } from '@/types'
import { PaginatedInventoryTable } from '@/components/inventory/PaginatedInventoryTable'
import { ProductLabels } from '@/components/inventory/ProductLabels'
import { ProfitMarginManager } from '@/components/inventory/ProfitMarginManager'


export default function InventoryPage() {
  const [items, setItems] = useState<ProductWithInventory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [addSupplierOpen, setAddSupplierOpen] = useState(false)
  const [manageMarginsOpen, setManageMarginsOpen] = useState(false)

  const fetchAll = useCallback(() => {
    fetch('/api/products?limit=1000').then(r => r.json()).then(data => {
      // Handle both old format (array) and new format (object with products array)
      const productsArray = Array.isArray(data) ? data : data.products || [];
      setItems(productsArray);
    })
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

  const uniqueProducts = Array.from(new Map(items.map(item => [item.product_id, item])).values())

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Inventory Management
            </h1>
            <p className="text-gray-600 mt-2">Track stock levels, manage products, and monitor alerts</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setAddSupplierOpen(true)}
              variant="outline"
              className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all duration-300"
            >
              Add Supplier
            </Button>
            <Button
              onClick={() => setAddItemOpen(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Add Item
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">{uniqueProducts.length}</span>
              <span className="text-gray-600 ml-1">unique products</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {items.filter(item => (item.quantity || 0) > 0).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">
                {Math.round((items.filter(item => (item.quantity || 0) > 0).length / items.length) * 100)}%
              </span>
              <span className="text-gray-600 ml-1">availability</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {items.filter(item => (item.quantity || 0) <= (item.reorder_point || 5)).length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-red-600 font-medium">Need reorder</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-purple-600 font-medium">Active vendors</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        <Tabs defaultValue="list" className="w-full">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-indigo-100/50">
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
            </TabsList>
          </div>

          <TabsContent value="list" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Inventory Overview</h2>
                <p className="text-gray-600">Complete inventory tracking and management</p>
              </div>
              <Button
                onClick={() => setManageMarginsOpen(true)}
                variant="outline"
                className="border-purple-200 text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-xl transition-all duration-300"
              >
                Manage Margins
              </Button>
            </div>
            
            <PaginatedInventoryTable
              onAdjustClick={() => {}}
              onAddItem={() => setAddItemOpen(true)}
              onManageMargins={() => setManageMarginsOpen(true)}
              onAddSupplier={() => setAddSupplierOpen(true)}
              suppliers={suppliers}
            />
            
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100/50 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                Live Inventory Alerts
              </h3>
              <LiveInventoryAlerts />
            </div>
          </TabsContent>

          <TabsContent value="labels" className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Product Labels</h2>
              <p className="text-gray-600">Generate and print product labels</p>
            </div>
            <ProductLabels products={uniqueProducts} />
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
    </div>
  )

  
}
