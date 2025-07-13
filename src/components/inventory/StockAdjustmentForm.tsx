'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { InventoryItem } from '@/types';

interface Props {
  item: InventoryItem;
  onSubmit: (adj: { quantity: number; type: 'increase' | 'decrease'; reason: string }) => void;
  onCancel: () => void;
}

export const StockAdjustmentForm: React.FC<Props> = ({ item, onSubmit, onCancel }) => {
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState<'increase' | 'decrease'>('increase');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ quantity, type, reason });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <p className="text-sm text-gray-600">
        Adjusting: <span className="font-semibold">{item.name}</span><br />
        Current Stock: <span className="font-semibold">{item.stock}</span>
      </p>

      <div>
        <Label>Adjustment Type</Label>
        <RadioGroup
          value={type}
          onValueChange={(v: 'increase' | 'decrease') => setType(v)}
          className="flex items-center space-x-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="increase" id="inc" />
            <Label htmlFor="inc">Increase</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="decrease" id="dec" />
            <Label htmlFor="dec">Decrease</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
          required
        />
      </div>

      <div>
        <Label htmlFor="reason">Reason (optional)</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g., stock count correction"
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Apply</Button>
      </div>
    </form>
  );
};
