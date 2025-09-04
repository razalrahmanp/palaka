'use client';
import React, { useState } from 'react';
import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Calendar, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';

type BasicOrderEditData = {
  status: string;
  expected_delivery_date?: string;
  delivery_floor?: string;
  first_floor_awareness?: boolean;
  notes?: string;
};

export const BasicOrderEditForm: React.FC<{
  order: Order & {
    expected_delivery_date?: string;
    delivery_floor?: string;
    first_floor_awareness?: boolean;
    notes?: string;
  };
  onSave: (updates: BasicOrderEditData) => Promise<void>;
  onCancel: () => void;
}> = ({ order, onSave, onCancel }) => {
  // Pre-fill form with existing order data
  const [status, setStatus] = useState<string>(order.status || 'draft');
  const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate || order.expected_delivery_date || '');
  const [deliveryFloor, setDeliveryFloor] = useState(order.delivery_floor || 'ground');
  const [firstFloorAwareness, setFirstFloorAwareness] = useState(order.first_floor_awareness || false);
  const [notes, setNotes] = useState(order.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await onSave({
        status,
        expected_delivery_date: deliveryDate || undefined,
        delivery_floor: deliveryFloor,
        first_floor_awareness: firstFloorAwareness,
        notes: notes.trim() || undefined,
      });
      
      toast.success('Order updated successfully!');
      onCancel(); // Close the modal
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-800">Quick Order Edit</span>
        </div>
        <p className="text-blue-700">
          Edit basic order details: delivery date, status, and delivery address. 
          For items or pricing changes, use the full order edit option.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Status */}
        <div className="space-y-2">
          <Label htmlFor="status" className="flex items-center gap-2">
            <span className="text-sm font-medium">Order Status</span>
          </Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Delivery Date */}
        <div className="space-y-2">
          <Label htmlFor="deliveryDate" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="text-sm font-medium">Expected Delivery Date</span>
          </Label>
          <Input
            id="deliveryDate"
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Delivery Floor */}
        <div className="space-y-2">
          <Label htmlFor="deliveryFloor" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">Delivery Floor</span>
          </Label>
          <Select value={deliveryFloor} onValueChange={setDeliveryFloor}>
            <SelectTrigger>
              <SelectValue placeholder="Select floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ground">Ground Floor</SelectItem>
              <SelectItem value="first">First Floor</SelectItem>
              <SelectItem value="second">Second Floor</SelectItem>
              <SelectItem value="third">Third Floor</SelectItem>
              <SelectItem value="higher">Higher Floor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* First Floor Awareness Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            id="firstFloorAwareness"
            type="checkbox"
            checked={firstFloorAwareness}
            onChange={(e) => setFirstFloorAwareness(e.target.checked)}
            className="rounded border-gray-300"
            aria-label="Customer aware of first floor delivery requirements"
          />
          <Label htmlFor="firstFloorAwareness" className="text-sm font-medium">
            Customer aware of first floor delivery requirements
          </Label>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Delivery Notes</span>
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any delivery instructions or notes..."
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
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
      </form>
    </div>
  );
};
