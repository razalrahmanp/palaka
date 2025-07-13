'use client'
import React, { useEffect, useState, useCallback } from 'react'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card'
import {
  Table, TableHeader, TableRow, TableHead,
  TableBody, TableCell
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { SlidersHorizontal, AlertCircle, Printer, Tags, List } from 'lucide-react'
import { Supplier, ProductWithInventory } from '@/types'
import { InventoryAlerts } from '@/components/inventory/InventoryAlerts'
import { StockAdjustmentForm } from '@/components/inventory/StockAdjustmentForm'
import { SupplierForm } from '@/components/inventory/SupplierForm'
import InventoryItemForm from '@/components/inventory/InventoryItemForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// --- New Product Label Card Component ---
// The type for 'product' is expanded here to include 'sku' to fix the TypeScript error.
// The root cause is likely an outdated 'ProductWithInventory' type in '@/types' or an API response that omits the SKU.
const ProductLabelCard = ({ product }: { product: ProductWithInventory & { sku?: string | null } }) => {
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(product.product_id)}`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Label</title>
            <style>
              @media print {
                body { font-family: sans-serif; margin: 0; padding: 0; }
                .label-container {
                  width: 4in;
                  height: 3in;
                  padding: 0.25in;
                  border: 1px solid #ccc;
                  display: flex;
                  flex-direction: column;
                  box-sizing: border-box;
                }
                .label-header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; }
                .label-title { font-size: 18px; font-weight: bold; margin: 0; }
                .label-sku { font-size: 12px; color: #555; }
                .label-body { display: flex; flex: 1; gap: 16px; }
                .label-details { flex: 1; }
                .label-details p { margin: 4px 0; font-size: 14px; }
                .label-qr { text-align: center; }
                .label-qr img { width: 100px; height: 100px; }
                .label-qr p { font-size: 10px; margin-top: 4px; }
              }
            </style>
          </head>
          <body>
            <div class="label-container">
              <div class="label-header">
                <h2 class="label-title">${product.product_name}</h2>

              </div>
              <div class="label-body">
                <div class="label-details">
                  <p><strong>Category:</strong> ${product.category || 'N/A'}</p>
                  <p><strong>Material:</strong> ${product.material || 'N/A'}</p>
                  <p><strong>Supplier:</strong> ${product.supplier_name || 'N/A'}</p>
                </div>
                <div class="label-qr">
                  <img src="${qrCodeUrl}" alt="QR Code" />
                  <p>${product.product_id}</p>
                </div>
              </div>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="truncate">{product.product_name}</CardTitle>
        {/* <CardDescription>SKU: {product.sku || 'N/A'}</CardDescription> */}
      </CardHeader>
      <CardContent className="flex gap-4">
        <div className="flex-1 space-y-1 text-sm">
            <p><strong className="font-medium">Category:</strong> {product.category || 'N/A'}</p>
            <p><strong className="font-medium">Material:</strong> {product.material || 'N/A'}</p>
            <p><strong className="font-medium">Supplier:</strong> {product.supplier_name || 'N/A'}</p>
        </div>
        <div className="text-center">
            <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24 rounded-md" />
            <Button variant="outline" size="sm" className="mt-2" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};


export default function InventoryPage() {
  const [items, setItems] = useState<ProductWithInventory[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [selected, setSelected] = useState<ProductWithInventory | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)
  const [addSupplierOpen, setAddSupplierOpen] = useState(false)

  const fetchAll = useCallback(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setItems)
    fetch('/api/suppliers')
      .then(r => r.json())
      .then(setSuppliers)
  }, [])

  useEffect(fetchAll, [fetchAll])


  const createInventory = useCallback(
    (form: {
      useExisting: boolean
      product_id?: string
      newProduct?: {
        name: string
        sku: string
        description: string
        category: string
        price: number
        image_url?: string
      }
      supplier_id?: string
      category: string
      subcategory: string
      material: string
      location: string
      quantity: number
      reorder_point: number
    }) => {
      (async () => {
        let pid = form.product_id
        if (!form.useExisting && form.newProduct) {
            // --- SKU Generation Logic ---
            // This logic generates a unique, informative SKU for new products.
            // Format: [SUPPLIER_CODE]-[CATEGORY_CODE]-[YYMMDD]-[RANDOM_4_DIGITS]
            const supplier = suppliers.find(s => s.id === form.supplier_id);
            const supplierCode = supplier ? supplier.name.substring(0, 3).toUpperCase() : 'GEN';
            const categoryCode = form.newProduct.category ? form.newProduct.category.substring(0, 3).toUpperCase() : 'PROD';
            
            const now = new Date();
            const year = now.getFullYear().toString().slice(-2);
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const dateCode = `${year}${month}${day}`;
            
            const randomPart = Math.floor(1000 + Math.random() * 9000);
            
            const generatedSku = `${supplierCode}-${categoryCode}-${dateCode}-${randomPart}`;

            const productWithSku = {
                ...form.newProduct,
                sku: generatedSku,
            };
            // --- End SKU Generation Logic ---

          const resp = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productWithSku) // Send the product with the new SKU
          })
          const prod = await resp.json()
          pid = prod.id
        }
        if (!form.supplier_id) {
          return
        }
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
        fetchAll()
        setAddItemOpen(false)
      })()
    },
    [fetchAll, suppliers] // Added suppliers to dependency array for SKU generation
  )

  const filteredItems = selectedSupplierId
    ? items.filter(i => i.supplier_id === selectedSupplierId)
    : items

  // Create a unique list of products for the label view
  const uniqueProducts = Array.from(new Map(items.map(item => [item.product_id, item])).values());

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full h-auto md:h-[calc(100vh-4rem)] p-4">
      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="list" className="w-full h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list"><List className="mr-2 h-4 w-4" /> Inventory List</TabsTrigger>
            <TabsTrigger value="labels"><Tags className="mr-2 h-4 w-4" /> Product Labels</TabsTrigger>
          </TabsList>
          
          {/* Inventory List View */}
          <TabsContent value="list" className="flex-1 overflow-y-auto mt-4">
            <div className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row justify-between items-center">
                    <div>
                      <CardTitle>Inventory</CardTitle>
                      <CardDescription>
                        {selectedSupplierId
                          ? `Showing items from ${suppliers.find(s => s.id === selectedSupplierId)?.name}`
                          : 'Manage stock levels for all products'}
                      </CardDescription>
                    </div>
                    <Button onClick={() => setAddItemOpen(true)}>Add New Item</Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {['Product','Supplier','Category','Subcat','Material','Location','Stock','Reorder','Actions'].map(h => (
                            <TableHead key={h}>{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map(i => (
                          <TableRow key={i.inventory_id}>
                            <TableCell>{i.product_name}</TableCell>
                            <TableCell>{i.supplier_name}</TableCell>
                            <TableCell>{i.category}</TableCell>
                            <TableCell>{i.subcategory}</TableCell>
                            <TableCell>{i.material}</TableCell>
                            <TableCell>{i.location}</TableCell>
                            <TableCell>
                              <Badge variant={i.quantity > i.reorder_point ? 'default' : 'destructive'}>
                                {i.quantity <= i.reorder_point && (
                                  <AlertCircle className="mr-1 h-3 w-3" />
                                )}
                                {i.quantity}
                              </Badge>
                            </TableCell>
                            <TableCell>{i.reorder_point}</TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setSelected(i); setAdjustOpen(true) }}
                              >
                                <SlidersHorizontal className="mr-1 h-4 w-4" />
                                Adjust
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
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
            </div>
          </TabsContent>

          {/* Product Labels View */}
          <TabsContent value="labels" className="flex-1 overflow-y-auto mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {uniqueProducts.map(product => (
                    <ProductLabelCard key={product.product_id} product={product} />
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Suppliers Sidebar */}
      <div className="relative max-w-xs w-full md:w-60 border-l p-4 overflow-y-auto bg-muted/50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Suppliers</h2>
        <div className="flex flex-col gap-2">
          <Button
            variant={!selectedSupplierId ? "secondary" : "ghost"}
            onClick={() => setSelectedSupplierId(null)}
            className="justify-start"
          >
            All Suppliers
          </Button>
          {suppliers.map(s => (
            <Button
              key={s.id}
              variant={selectedSupplierId === s.id ? "secondary" : "ghost"}
              onClick={() => setSelectedSupplierId(s.id)}
              className="justify-start"
            >
              {s.name}
            </Button>
          ))}
           <Button
              variant="outline"
              className="mt-4"
              onClick={() => setAddSupplierOpen(true)}
            >
              Add Supplier
            </Button>
        </div>
      </div>


      {/* Dialogs */}
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
