// InventoryPage.tsx (Main Entry)
'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { List, Tags} from 'lucide-react'
import { InventoryAlerts } from '@/components/inventory/InventoryAlerts'
import { StockAdjustmentForm } from '@/components/inventory/StockAdjustmentForm'
import InventoryItemForm, { } from '@/components/inventory/InventoryItemForm'
import { SupplierForm } from '@/components/inventory/SupplierForm'
import { ProductWithInventory, Supplier } from '@/types'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { ProductLabels } from '@/components/inventory/ProductLabels'
import { SupplierSidebar } from '@/components/inventory/SupplierSidebar'
import { ProfitMarginManager } from '@/components/inventory/ProfitMarginManager'

export default function InventoryPage() {
  const [items, setItems] = useState<ProductWithInventory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [selected, setSelected] = useState<ProductWithInventory | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [addSupplierOpen, setAddSupplierOpen] = useState(false)
  const [manageMarginsOpen, setManageMarginsOpen] = useState(false)

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
      let pid = form.product_id;
      if (!form.useExisting && form.newProduct) {
        const supplier = suppliers.find(s => s.id === form.supplier_id);
        const supplierCode = supplier ? supplier.name.substring(0, 3).toUpperCase() : 'GEN';
        const categoryCode = form.newProduct.category ? form.newProduct.category.substring(0, 3).toUpperCase() : 'PROD';
        const now = new Date();
        const dateCode = `${now.getFullYear().toString().slice(-2)}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        const generatedSku = `${supplierCode}-${categoryCode}-${dateCode}-${randomPart}`;

        const { name, sku, description, category, price, image_url, subcategory, material } = form.newProduct;
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
        };

        const resp = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
        const prod = await resp.json();
        pid = prod.id;
      }
      if (!form.supplier_id) return;

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
      });
      fetchAll();
      setAddItemOpen(false);
    },
    [fetchAll, suppliers]
  )

  const filteredItems = selectedSupplierId
    ? items.filter(i => i.supplier_id === selectedSupplierId)
    : items

  const uniqueProducts = Array.from(new Map(items.map(item => [item.product_id, item])).values())

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full h-auto md:h-[calc(100vh-4rem)] p-4">
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="list" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" /> Inventory List</TabsTrigger>
            <TabsTrigger value="labels"><Tags className="mr-2 h-4 w-4" /> Product Labels</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="flex-1 overflow-y-auto mt-4">
            <InventoryTable
              items={filteredItems}
              onAdjustClick={(item) => { setSelected(item); setAdjustOpen(true); }}
              onAddItem={() => setAddItemOpen(true)}
              onManageMargins={() => setManageMarginsOpen(true)}
            />
            <InventoryAlerts
              alerts={filteredItems
                .filter(i => i.quantity <= i.reorder_point)
                .map(i => ({
                  id: i.inventory_id,
                  type: 'Inventory' as const,
                  message: `${i.product_name} at or below reorder point`,
                  priority: 'high' as const
                }))}
            />
          </TabsContent>

          <TabsContent value="labels" className="flex-1 overflow-y-auto mt-4">
            <ProductLabels products={uniqueProducts} />
          </TabsContent>
        </Tabs>
      </div>

      <SupplierSidebar
        suppliers={suppliers}
        selectedSupplierId={selectedSupplierId}
        onSelectSupplier={setSelectedSupplierId}
        onAddSupplier={() => setAddSupplierOpen(true)}
      />

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

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Stock</DialogTitle></DialogHeader>
          {selected && (
            <StockAdjustmentForm
              item={{
                id: selected.inventory_id,
                name: selected.product_name,
                stock: selected.quantity,
                quantity: selected.quantity,
                reorder_point: selected.reorder_point,
                updated_at: selected.updated_at
              }}
              onSubmit={async (adj) => {
                await fetch('/api/inventory/adjust', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    product_id: selected?.product_id,
                    type: adj.type,
                    quantity: adj.quantity,
                    reason: adj.reason
                  })
                });
                fetchAll();
                setAdjustOpen(false);
              }}
              onCancel={() => setAdjustOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

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

      <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
          <SupplierForm
            onSubmit={async sup => {
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