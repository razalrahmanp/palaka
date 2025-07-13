// File: src/components/sales/QuoteBuilderForm.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, PlusCircle,
  //  Settings
   } from 'lucide-react';
import { Customer, Product, OrderItem, UserRole } from '@/types';

interface QuoteBuilderProps {
  initialData: Partial<{
    customer_id: string;
    customer: string;
    status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
    items: OrderItem[];
  }>;
  availableCustomers: Customer[];
  availableProducts: Product[];
  userRole?: UserRole;
  onSubmit: (
    quoteData: {
      customer_id: string;
      customer: string;
      status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
      total_price: number;
      [k: string]: unknown;
    },
    items: OrderItem[]
  ) => void;
  onCancel: () => void;
  // onOpenConfigurator: (p: Product) => void;
}

export const QuoteBuilderForm: React.FC<QuoteBuilderProps> = ({
  initialData,
  availableCustomers,
  availableProducts,
  userRole,
  onSubmit,
  onCancel,
  // onOpenConfigurator,
}) => {
  const [custSearch, setCustSearch] = useState('');
  const [customerId, setCustomerId] = useState(initialData.customer_id || '');
  const [status, setStatus] = useState(initialData.status || 'Draft');
  const [items, setItems] = useState<OrderItem[]>([]);

  // ─── Normalize and prefill items on mount/edit ─────────────────────────────
  useEffect(() => {
    if (initialData.items) {
      const normalized: OrderItem[] = initialData.items.map((i: OrderItem) => ({
        product_id: i.product_id ?? '',
        name: i.name ?? '',
        price: i.price ?? 0,
        quantity: i.quantity ?? (typeof (i as { qty?: number }).qty === 'number' ? (i as { qty?: number }).qty : 1),
        ...(i.configuration ? { configuration: i.configuration } : {}),
      }));
      setItems(normalized);
    }
  }, [initialData.items]);

  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const allowedStatuses = useMemo(() => {
    const base = ['Draft', 'Pending', 'Rejected'] as const;
    return userRole === 'Finance Manager' || userRole === 'System Administrator'
      ? [...base, 'Approved']
      : base;
  }, [userRole]);

  const filteredCust = useMemo(() => {
    const q = custSearch.toLowerCase();
    return availableCustomers.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [custSearch, availableCustomers]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cust = availableCustomers.find(c => c.id === customerId);
    if (!cust) return alert('Please select a customer');
    onSubmit(
      {
        customer_id: cust.id,
        customer: cust.name,
        status,
        total_price: total,
      },
      items
    );
  }

  return (
    <div className="max-h-[90vh] overflow-auto p-6">
      <form onSubmit={submit} className="space-y-6">
        {/* Customer */}
        <div className="space-y-2">
          <Label>Search Customer</Label>
          <Input
            placeholder="Name, phone or email"
            value={custSearch}
            onChange={e => setCustSearch(e.target.value)}
          />
          <Select value={customerId} onValueChange={setCustomerId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {filteredCust.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div>
          <Label>Status</Label>
          <Select value={status} onValueChange={v => setStatus(v as 'Draft' | 'Pending' | 'Approved' | 'Rejected')}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {allowedStatuses.map(s => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Line Items */}
        <div>
          <Label>Quote Items</Label>
          <div className="space-y-3">
            {items.map((item, i) => {
              // const prod = availableProducts.find(p => p.id === item.product_id);
              return (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 border p-3 rounded"
                >
                  {initialData.customer_id ? (
                        // Editing: fixed product name & price
                        <div className="w-48 font-medium">{item.name}</div>
                      ) : (
                        // Creating: allow product selection
                        <Select
                          value={item.product_id}
                          onValueChange={v => {
                            const sel = availableProducts.find(p => p.id === v);
                            if (sel) {
                              const copy = [...items];
                              copy[i] = {
                                ...copy[i],
                                product_id: v,
                                name: sel.name,
                                price: typeof sel.price === 'number' ? sel.price : copy[i].price,
                              };
                              setItems(copy);
                            }
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Product" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProducts.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}


                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={item.quantity}
                    onChange={e => {
                      const copy = [...items];
                      copy[i].quantity = parseInt(e.target.value) || 1;
                      setItems(copy);
                    }}
                  />

                  <span className="w-24 text-right font-medium">
                    ${(item.quantity * item.price).toFixed(2)}
                  </span>

                  {/* {prod?.config_schema && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onOpenConfigurator(prod)}
                    >
                      <Settings className="h-4 w-4 text-blue-500" />
                    </Button>
                  )} */}

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setItems(items.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setItems([
                  ...items,
                  { product_id: '', name: '', quantity: 1, price: 0 },
                ])
              }
            >
              <PlusCircle className="mr-1 h-4 w-4" /> Add Item
            </Button>
          </div>
        </div>

        {/* Total & Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-lg font-bold">Total: ${total.toFixed(2)}</div>
          <div className="space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData.customer_id ? 'Update Quote' : 'Create Quote'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
