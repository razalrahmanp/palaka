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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
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
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>Create &amp; track POs.</CardDescription>
          </div>
          <Button onClick={() => { setSelected(null); setOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4"/> New PO
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {['ID','Supplier','Product','Qty','Price','Status','Details','Created','Actions']
                  .map(h => <TableHead key={h}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>{o.supplier?.name ?? '—'}</TableCell>
                  <TableCell>{o.product?.name ?? '—'}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>${o.total?.toFixed(2) ?? '—'}</TableCell>
                  <TableCell className="flex items-center space-x-2">
                    <Badge
                      variant={
                        o.status === 'approved' ? 'default'
                        : o.status === 'received'  ? 'secondary'
                        : 'destructive'
                      }
                    >
                      {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Cycle status"
                      onClick={() => cycleStatus(o)}
                    >
                      ↻
                    </Button>
                  </TableCell>
                  <TableCell>{o.description ?? '—'}</TableCell>
                  <TableCell>{o.created_at?.split('T')[0]}</TableCell>
                  <TableCell className="space-x-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setSelected(o); setOpen(true); }}
                    >
                      <Edit className="h-4 w-4"/>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(o.id)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected ? 'Edit PO' : 'New Purchase Order'}</DialogTitle>
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
