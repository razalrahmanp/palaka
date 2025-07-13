'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';
import { Delivery as DeliveryBase } from '@/types';
import { getCurrentUser } from '@/lib/auth';
import { DeliveryDetails } from '@/components/logistics/DeliveryDetails';
import { DeliveryForm }    from '@/components/logistics/DeliveryForm';

type Delivery = DeliveryBase & {
  driver?:    { id: string; name: string };
  sales_order?: {
    id:        string;
    status:    string;
    customer:  string;
    address:   string;
    time_slot: string;
  };
};

export default function LogisticsPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selected,   setSelected]   = useState<Delivery|null>(null);
  const [open,       setOpen]       = useState(false);
  // memoize once so `user` reference never changes
  const [user] = useState(getCurrentUser);

  const fetchAll = useCallback(async () => {
    const url = user?.role === 'Delivery Driver'
      ? `/api/logistics/deliveries?driver_id=${user.id}`
      : '/api/logistics/deliveries';
    const data: Delivery[] = await fetch(url).then(r => r.json());
    setDeliveries(data);
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateStatus = async (id: string, status: Delivery['status']) => {
    await fetch('/api/logistics/deliveries', {
      method: 'PUT',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ id, status })
    });
    fetchAll();
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <CardTitle>Logistics & Deliveries</CardTitle>
            <CardDescription>Manage outgoing shipments.</CardDescription>
          </div>
          {user?.permissions.includes('delivery:create') && (
            <Button onClick={() => { setSelected(null); setOpen(true); }}>
              New Delivery
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.id}</TableCell>
                  <TableCell>{d.sales_order?.customer?.name ?? '—'}</TableCell>
                  <TableCell>{d.sales_order?.address     ?? '—'}</TableCell>
                  <TableCell>{d.time_slot ?? '—'}</TableCell>
                  <TableCell>
                    <Badge>{d.status.replace('_',' ')}</Badge>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setSelected(d); setOpen(true); }}
                    >
                      <Eye className="h-4 w-4"/>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected ? 'Delivery Details' : 'New Delivery'}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <DeliveryDetails delivery={selected} onUpdateStatus={updateStatus} />
          ) : (
            <DeliveryForm
              onSubmit={async data => {
                await fetch('/api/logistics/deliveries', {
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body: JSON.stringify(data)
                });
                setOpen(false);
                fetchAll();
              }}
              onCancel={() => setOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
