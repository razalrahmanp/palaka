'use client';
import React, { useState, useMemo } from 'react';
import { Order, OrderUpdatePayload, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const OrderEditForm: React.FC<{
  order: Order;
  customerId: string;
  onSave: (updates: OrderUpdatePayload & { delivery_address: string }) => void;
  onCancel: () => void;
  availableProducts: Product[];
}> = ({ order, customerId, onSave, onCancel }) => {
  const [status, setStatus] = useState(order.status);
  const [items, setItems] = useState(order.items);
  const [deliveryAddress, setDeliveryAddress] = useState(order?.deliveryAddress ?? '');
  const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate || '');
  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      id: order.id,
      customer_id: customerId,
      status,
      delivery_date: deliveryDate,
      items: items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.price,
      })),
      delivery_address: deliveryAddress,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Status */}
      <div>
        <Label>Status</Label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Order['status'])}
          className="border rounded p-2 w-full"
          title="Select order status"
        >
          {['draft', 'confirmed', 'shipped', 'delivered'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Delivery Address */}
      <div>
        <Label>Delivery Address</Label>
        <Input
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          placeholder="Enter delivery address"
        />
      </div>


       {/* Delivery Date */}
      <div>
        <Label>Delivery Date</Label>
        <Input
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
        />
      </div>

      {/* Items */}
      <div>
        <Label>Order Items</Label>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 border p-2 rounded">
              <div className="w-48 px-2 py-1">
                {item.name}
              </div>

              <Input
                type="number"
                min={1}
                className="w-20"
                value={item.quantity}
                onChange={(e) => {
                  const copy = [...items];
                  copy[i].quantity = parseInt(e.target.value) || 1;
                  setItems(copy);
                }}
              />
              <span className="w-24 text-right font-medium">
                ${(item.quantity * item.price).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Total & Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-lg font-bold">Total: ${total.toFixed(2)}</div>
        <div className="space-x-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </div>
    </form>
  );
};
