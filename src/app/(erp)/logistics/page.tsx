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
import { Eye, Plus, Truck, MapPin, CheckCircle, Clock } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Logistics & Delivery Management
            </h1>
            <p className="text-gray-600 mt-2">Track shipments and manage delivery operations</p>
          </div>
          {user?.permissions.includes('delivery:create') && (
            <Button 
              onClick={() => { setSelected(null); setOpen(true); }}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="mr-2 h-5 w-5" /> New Delivery
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">{deliveries.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Truck className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">Active shipments</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Transit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deliveries.filter(d => d.status === 'in_transit').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-blue-600 font-medium">On the way</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deliveries.filter(d => d.status === 'delivered').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">Completed</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deliveries.filter(d => d.status === 'pending').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-orange-600 font-medium">Awaiting pickup</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-t-xl border-b border-teal-100/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Delivery Operations</CardTitle>
              <CardDescription className="text-gray-600">
                Monitor and manage all delivery activities
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                <TableRow className="border-gray-200">
                  <TableHead className="font-semibold text-gray-700 py-4">Delivery ID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Customer</TableHead>
                  <TableHead className="font-semibold text-gray-700">Address</TableHead>
                  <TableHead className="font-semibold text-gray-700">Delivery Date</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map(d => (
                  <TableRow key={d.id} className="hover:bg-teal-50/50 transition-colors border-gray-100">
                    <TableCell className="py-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {d.id}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {(d.sales_order?.customer?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">
                          {d.sales_order?.customer?.name ?? '—'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-gray-600">
                        {d.sales_order?.address ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-gray-600">
                        {d.time_slot ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge 
                        className={`${
                          d.status === 'delivered' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : d.status === 'in_transit'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : d.status === 'pending'
                            ? 'bg-orange-100 text-orange-800 border-orange-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        } px-3 py-1 rounded-full font-medium`}
                      >
                        {d.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setSelected(d); setOpen(true); }}
                        className="h-8 w-8 p-0 hover:bg-teal-100 hover:text-teal-600 transition-colors rounded-lg"
                      >
                        <Eye className="h-4 w-4"/>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {deliveries.length === 0 && (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No deliveries scheduled</h3>
              <p className="text-gray-500 mb-4">Start managing your delivery operations</p>
              {user?.permissions.includes('delivery:create') && (
                <Button 
                  onClick={() => { setSelected(null); setOpen(true); }}
                  className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Delivery
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              {selected ? 'Delivery Details' : 'New Delivery'}
            </DialogTitle>
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
