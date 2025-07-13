'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label }  from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Order, User } from '@/types';

interface Props {
  onSubmit: (data: {
    sales_order_id: string;
    driver_id:      string;
    tracking_number: string;
  }) => void;
  onCancel: () => void;
}

export const DeliveryForm: React.FC<Props> = ({ onSubmit, onCancel }) => {
  const [orders, setOrders]   =
    useState<(Order & { address: string; time_slot: string; customer: string })[]>([]);
  const [drivers, setDrivers] = useState<User[]>([]);
  const [orderId, setOrderId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [tracking, setTracking] = useState('');

  useEffect(() => {
    fetch('/api/sales/orders?status=confirmed,shipped')
      .then(r => r.json())
      .then((data) => setOrders(data));
    fetch('/api/users?role=Delivery%20Driver')
      .then(r => r.json())
      .then(setDrivers);
  }, []);

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      sales_order_id: orderId,
      driver_id:      driverId,
      tracking_number: tracking
    });
  };

  return (
    <form onSubmit={handle} className="space-y-4 p-4">
      <div>
        <Label>Sales Order</Label>
        <Select value={orderId} onValueChange={setOrderId} required>
          <SelectTrigger><SelectValue placeholder="Select order"/></SelectTrigger>
          <SelectContent>
            {orders.map(o => (
              <SelectItem key={o.id} value={o.id}>
                {o.id} — {o.customer}
                <br/>
                <span className="text-xs text-gray-500">
                  {o.address} 
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Assign Driver</Label>
        <Select value={driverId} onValueChange={setDriverId} required>
          <SelectTrigger><SelectValue placeholder="Select driver"/></SelectTrigger>
          <SelectContent>
            {drivers.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Tracking #</Label>
        <Input
          value={tracking}
          onChange={e => setTracking(e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Create Delivery</Button>
      </div>
    </form>
  );
};
