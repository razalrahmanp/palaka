'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { ProductionRun } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { ProductionJobForm } from '@/components/manufacturing/ProductionJobForm';
import { ProductionScheduler } from '@/components/manufacturing/ProductionScheduler';

export default function ManufacturingPage() {
  const [runs, setRuns] = useState<ProductionRun[]>([]);
  const [selected, setSelected] = useState<ProductionRun | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try {
        const user = JSON.parse(u);
        setCurrentUserId(user.id);
      } catch {}
    }
  }, []);

  const fetchRuns = useCallback(async () => {
    const res = await fetch('/api/manufacturing/work_orders');
    setRuns(await res.json());
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

const saveJob = useCallback(
  async (jobData: Omit<ProductionRun,'id'|'startDate'>) => {
  if (!currentUserId) {
    console.error('Current user ID is not set');
    return;
  }
  const payload = {
    bom_id:      jobData.bom_id,
    product_id:  jobData.product_id,
    quantity:    jobData.quantity,
    status:      jobData.status,
    progress:    jobData.progress,
    stage:       jobData.stage,
    order_id:    jobData.order_id,
    assigned_to: jobData.assigned_to,
    start_date:  jobData.start_date,
    due_date:    jobData.due_date,
    notes:       jobData.notes,
    created_by: currentUserId,
  };
  const url = selected
    ? `/api/manufacturing/work_orders/${selected.id}`
    : '/api/manufacturing/work_orders';
  const method = selected ? 'PUT' : 'POST';

  await fetch(url, {
    method, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  setModalOpen(false);
  fetchRuns();
}, [selected, fetchRuns, currentUserId]);

  const deleteJob = useCallback(async (id: string) => {
    await fetch(`/api/manufacturing/work_orders/${id}`, { method: 'DELETE' });
    fetchRuns();
  }, [fetchRuns]);

  const open = (job: ProductionRun | null) => {
    setSelected(job);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div>
            <CardTitle>Manufacturing</CardTitle>
            <CardDescription>Manage and track production jobs.</CardDescription>
          </div>
          <Button onClick={() => open(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Job
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.product_id}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell><Badge>{r.status}</Badge></TableCell>
                  <TableCell><Progress value={r.progress} className="w-full" /></TableCell>
                  <TableCell>{r.due_date ?? '—'}</TableCell>
                  <TableCell className="space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => open(r)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteJob(r.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductionScheduler productionRuns={runs} />

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected ? 'Edit Production Job' : 'New Production Job'}</DialogTitle>
          </DialogHeader>
          <ProductionJobForm
            initialData={selected}
            onSubmit={saveJob}
            onCancel={() => setModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
