// app/(erp)/procurement/page.tsx
'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { PurchaseOrder, Supplier, Product } from '@/types';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Package, Users, BarChart3 } from 'lucide-react';
import { PurchaseOrderForm } from '@/components/procurement/PurchaseRequestForm';
import { getCurrentUser } from '@/lib/auth';
import { normalizeProduct } from '@/lib/helper';

export default function ProcurementPage() {
  const [orders, setOrders]         = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers]   = useState<Supplier[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [selected, setSelected]     = useState<PurchaseOrder | null>(null);
  const [open, setOpen]             = useState(false);

  const fetchAll = useCallback(async () => {
  const [ord, sup, prodRaw] = await Promise.all([
    fetch('/api/procurement/purchase_orders').then(r => r.json()),
    fetch('/api/suppliers').then(r => r.json()),
    fetch('/api/products?limit=1000').then(r => r.json()),
  ]);

  // Handle both old format (array) and new format (object with products array)
  const productsArray = Array.isArray(prodRaw) ? prodRaw : prodRaw.products || [];
  const prod = productsArray.map(
    normalizeProduct
  );

  setOrders(ord);
  setSuppliers(sup);
  setProducts(prod);
}, []);


  useEffect(() => { fetchAll(); }, [fetchAll]);

  const currentUser = getCurrentUser();

  const save = async (
    data: Omit<PurchaseOrder,'id'|'created_at'|'created_by'> & { images?: string[] }
  ) => {
    // 1) Create/update PO, including created_by
    const payload = selected
      ? { id: selected.id, ...data }
      : { ...data, created_by: currentUser?.id };

    const res = await fetch('/api/procurement/purchase_orders', {
      method: selected ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save PO');
    const po: PurchaseOrder = await res.json();

    // 2) Persist any uploaded images
    if (data.images && data.images.length > 0) {
      await fetch('/api/procurement/purchase_order_images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_order_id: po.id,
          urls: data.images,
        }),
      });
    }

    // 3) Refresh
    setOpen(false);
    fetchAll();
  };

  const remove = async (id: string) => {
    await fetch(`/api/procurement/purchase_orders?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const cycleStatus = async (o: PurchaseOrder) => {
    const next: PurchaseOrder['status'] =
      o.status === 'pending'   ? 'approved'
    : o.status === 'approved'  ? 'received'
    :                              'pending';

    await fetch('/api/procurement/purchase_orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: o.id, status: next }),
    });
    fetchAll();
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          Procurement Management
        </h1>
        <p className="text-gray-600 mt-2">Create, track, and manage your purchase orders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-800">
              {orders.length}
            </div>
            <p className="text-xs text-blue-600 mt-1">Purchase orders</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800">
              {suppliers.length}
            </div>
            <p className="text-xs text-green-600 mt-1">Registered suppliers</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-800">
              ${orders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-orange-600 mt-1">Total order value</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 hover:shadow-xl transition-all duration-300">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Purchase Orders
            </CardTitle>
            <CardDescription className="text-gray-600">Create &amp; track POs.</CardDescription>
          </div>
          <Button 
            onClick={() => { setSelected(null); setOpen(true); }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <PlusCircle className="mr-2 h-4 w-4"/> New Purchase Order
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700">
                {['ID','Supplier','Product','Qty','Price','Status','Details','Created','Actions']
                  .map(h => <TableHead key={h} className="font-semibold">{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id} className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200">
                  <TableCell className="font-medium">{o.id}</TableCell>
                  <TableCell className="text-gray-600">{o.supplier?.name ?? '—'}</TableCell>
                  <TableCell className="text-gray-600">{o.product?.name ?? '—'}</TableCell>
                  <TableCell className="font-medium">{o.quantity}</TableCell>
                  <TableCell className="font-semibold text-green-600">${o.total?.toFixed(2) ?? '—'}</TableCell>
                  <TableCell className="flex items-center space-x-2">
                    <Badge
                      variant="secondary"
                      className={
                        o.status === 'approved' ? 'bg-blue-100 text-blue-700'
                        : o.status === 'received'  ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }
                    >
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Cycle status"
                      onClick={() => cycleStatus(o)}
                      className="h-6 w-6 p-0 hover:bg-blue-100"
                    >
                      ↻
                    </Button>
                  </TableCell>
                  <TableCell className="text-gray-600">{o.description ?? '—'}</TableCell>
                  <TableCell className="text-gray-500">{o.created_at?.split('T')[0]}</TableCell>
                  <TableCell className="space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setSelected(o); setOpen(true); }}
                      className="h-8 w-8 p-0 hover:bg-blue-100"
                    >
                      <Edit className="h-4 w-4 text-blue-600"/>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(o.id)}
                      className="h-8 w-8 p-0 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 text-red-500"/>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Package className="h-5 w-5" />
              {selected ? 'Edit Purchase Order' : 'New Purchase Order'}
            </DialogTitle>
          </DialogHeader>
          <PurchaseOrderForm
            initialData={selected}
            suppliers={suppliers}
            products={products}
            onSubmit={save}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
