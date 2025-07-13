// components/manufacturing/ProductionJobForm.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProductionRun, Product, Order, User } from '@/types';
import { normalizeProduct } from '@/lib/helper';

interface Props {
  initialData: ProductionRun | null;
  onSubmit: (job: Omit<ProductionRun,'id'|'startDate'>) => void;
  onCancel: () => void;
}

export const ProductionJobForm: React.FC<Props> = ({ initialData, onSubmit, onCancel }) => {
  type State = Omit<ProductionRun,'id'|'startDate'>;
  const [form, setForm] = useState<State>({
    bom_id:      '',
    product_id:  '',
    product:     '', // This will be set based on selected product
    quantity:    1,
    status:      'Pending',
    progress:    0,
    stage:       '',
    order_id:    '',
    assigned_to: '',
    start_date:  '',
    due_date:    '',
    notes:       '',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [users,    setUsers]    = useState<User[]>([]);

  useEffect(() => {
  fetch('/api/products')
    .then((r) => r.json())
    .then((data) => {
      setProducts(
        data.map(
          normalizeProduct
        )
      );
    });
  fetch('/api/sales/orders').then((r) => r.json()).then(setOrders);
  fetch('/api/users?role=employee').then((r) => r.json()).then(setUsers);
}, []);


  useEffect(() => {
    if (initialData) {
      setForm({ ...initialData, start_date: initialData.start_date });
    }
  }, [initialData]);

  const change = <K extends keyof State>(k:K, v:State[K]) => setForm(f=>({ ...f, [k]: v }));

  const submit = (e:React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Product</Label>
          <Select value={form.product_id} onValueChange={(v) => change('product_id', v)}>
  <SelectTrigger>
    <SelectValue placeholder="Select product" />
  </SelectTrigger>
  <SelectContent>
    {products.map((p) => (
      <SelectItem key={p.id} value={p.id}>
        {p.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

        </div>
        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            min={1}
            value={form.quantity}
            onChange={e=>change('quantity', parseInt(e.target.value) || 1)}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v=>change('status',v as State['status'])}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              {['planned','in_progress','quality_check','completed','delayed'].map(s=>(
                <SelectItem key={s} value={s}>{s.replace('_',' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Stage</Label>
          <Input
            value={form.stage}
            onChange={e=>change('stage',e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <Label>Progress</Label>
        <Input
          type="range"
          min={0} max={100}
          value={form.progress}
          onChange={e=>change('progress', parseInt(e.target.value)||0)}
        />
        <span className="ml-2">{form.progress}%</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Linked Order</Label>
          <Select value={form.order_id} onValueChange={v=>change('order_id',v)}>
            <SelectTrigger><SelectValue placeholder="None"/></SelectTrigger>
            <SelectContent>
              {orders.map(o=>(
                <SelectItem key={o.id} value={o.id}>{o.id} – {o.customer}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Assigned To</Label>
          <Select value={form.assigned_to} onValueChange={v=>change('assigned_to',v)}>
            <SelectTrigger><SelectValue placeholder="Unassigned"/></SelectTrigger>
            <SelectContent>
              {users.map(u=>(
                <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Due Date</Label>
        <Input
          type="date"
          value={form.due_date || ''}
          onChange={e=>change('due_date', e.target.value)}
        />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea
          value={form.notes || ''}
          onChange={e=>change('notes', e.target.value)}
        />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Job' : 'Create Job'}</Button>
      </div>
    </form>
  );
};
