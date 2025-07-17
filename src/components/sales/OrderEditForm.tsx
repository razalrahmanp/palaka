'use client';
import React, { useState, useMemo } from 'react';
import { Order, OrderUpdatePayload, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react'; // Import a loading spinner icon
import { toast } from 'sonner';

// Helper function for currency formatting
const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹ 0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

export const OrderEditForm: React.FC<{
  order: Order;
  customerId: string;
  onSave: (updates: OrderUpdatePayload & { delivery_address: string }) => Promise<void>;
  onCancel: () => void;
  availableProducts: Product[];
}> = ({ order, customerId, onSave, onCancel }) => {
  const [status, setStatus] = useState(order.status);
  const [items] = useState(order.items);
  const [deliveryAddress, setDeliveryAddress] = useState(order?.deliveryAddress ?? '');
  const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate || '');
  const [isSaving, setIsSaving] = useState(false); // State to track saving process

  // Memoize total calculation
  const total = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true); // Disable button and show loader
    try {
      // Call the passed onSave function and wait for it to finish
      await onSave({
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
      // The parent component is responsible for closing the modal and showing success toast
    } catch (error: unknown) {
      // The parent component should show an error toast
      const errorMessage =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: string }).message)
          : "Failed to save order.";
      toast.error(errorMessage);
      console.error("Failed to save order:", error);
    } finally {
      setIsSaving(false); // Re-enable button regardless of success or failure
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Status Dropdown */}
      <div>
        <Label htmlFor="order-status">Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as Order['status'])} disabled={isSaving}>
          <SelectTrigger id="order-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {['draft', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Delivery Address */}
      <div>
        <Label htmlFor="delivery-address">Delivery Address</Label>
        <Textarea
          id="delivery-address"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          placeholder="Enter delivery address"
          disabled={isSaving}
        />
      </div>

      {/* Delivery Date */}
      <div>
        <Label htmlFor="delivery-date">Delivery Date</Label>
        <Input
          id="delivery-date"
          type="date"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          disabled={isSaving}
        />
      </div>
      
      {/* Items (Read-only view) */}
       <div>
        <Label>Order Items (Read-only)</Label>
        <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto bg-muted/50">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span>{item.name} (x{item.quantity})</span>
              <span className="font-mono">{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Total & Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-center pt-4 border-t gap-4 flex-wrap w-full">

        <div className="text-lg font-bold">Total: {formatCurrency(total)}</div>
         <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            type="button"
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>

      </div>
    </form>
  );
};
