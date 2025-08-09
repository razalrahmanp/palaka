'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { ProductionRun } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Edit, Trash2, Wrench, Clock, CheckCircle, TrendingUp } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Manufacturing Operations
            </h1>
            <p className="text-gray-600 mt-2">Manage production jobs and track manufacturing progress</p>
          </div>
          <Button
            onClick={() => open(null)}
            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <PlusCircle className="mr-2 h-5 w-5" /> New Production Job
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{runs.length}</p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                <Wrench className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">Active production</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {runs.filter(r => r.status === 'In Progress').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-blue-600 font-medium">Currently running</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {runs.filter(r => r.status === 'Completed').length}
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-green-600 font-medium">Finished jobs</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {runs.length > 0 ? Math.round(runs.reduce((sum, r) => sum + (r.progress || 0), 0) / runs.length) : 0}%
                </p>
              </div>
              <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-purple-600 font-medium">Overall completion</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Jobs Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-xl border-b border-amber-100/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">Production Jobs</CardTitle>
              <CardDescription className="text-gray-600">
                Track and manage all manufacturing operations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
            <Table>
              <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                <TableRow className="border-gray-200">
                  <TableHead className="font-semibold text-gray-700 py-4">Job ID</TableHead>
                  <TableHead className="font-semibold text-gray-700">Product</TableHead>
                  <TableHead className="font-semibold text-gray-700">Quantity</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status</TableHead>
                  <TableHead className="font-semibold text-gray-700">Progress</TableHead>
                  <TableHead className="font-semibold text-gray-700">Due Date</TableHead>
                  <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map(r => (
                  <TableRow key={r.id} className="hover:bg-amber-50/50 transition-colors border-gray-100">
                    <TableCell className="py-4">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {r.id}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="font-medium text-gray-900">{r.product_id}</span>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {r.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge 
                        className={`${
                          r.status === 'Completed' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : r.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        } px-3 py-1 rounded-full font-medium`}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center space-x-2">
                        <Progress value={r.progress} className="w-20" />
                        <span className="text-sm font-medium text-gray-600 w-12">{r.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-gray-600">
                        {r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => open(r)}
                          className="h-8 w-8 p-0 hover:bg-amber-100 hover:text-amber-600 transition-colors rounded-lg"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => deleteJob(r.id)}
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600 transition-colors rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {runs.length === 0 && (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No production jobs</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first production job</p>
              <Button 
                onClick={() => open(null)}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Create Production Job
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Production Scheduler */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Production Scheduler</h2>
          <p className="text-gray-600">Visual timeline and capacity planning</p>
        </div>
        <ProductionScheduler productionRuns={runs} />
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              {selected ? 'Edit Production Job' : 'New Production Job'}
            </DialogTitle>
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
