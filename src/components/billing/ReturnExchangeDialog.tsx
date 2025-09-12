import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCcw, ArrowLeftRight } from "lucide-react";
import { BillingItem } from "@/types";
import { toast } from "sonner";

interface ReturnExchangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: BillingItem | null;
  orderId?: string;
  salesRepId?: string;
  onSuccess: () => void;
}

interface ReturnExchangeData {
  type: 'return' | 'exchange';
  reason: string;
  condition_notes: string;
}

export function ReturnExchangeDialog({ 
  isOpen, 
  onClose, 
  item, 
  orderId,
  salesRepId,
  onSuccess 
}: ReturnExchangeDialogProps) {
  const [data, setData] = useState<ReturnExchangeData>({
    type: 'return',
    reason: '',
    condition_notes: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!item || !orderId) {
      toast.error('Missing required information');
      return;
    }

    if (!data.reason.trim()) {
      toast.error('Please provide a reason for the return/exchange');
      return;
    }

    setIsProcessing(true);

    try {
      const returnItem = {
        sales_order_item_id: item.id,
        product_id: item.isCustom ? null : item.product?.product_id,
        custom_product_id: item.isCustom ? item.customProduct?.id : null,
        quantity: item.quantity,
        unit_price: item.finalPrice,
        cost: item.isCustom 
          ? (item.customProduct?.cost || item.customProduct?.cost_price || 0)
          : (item.product?.cost || 0),
        is_custom_product: item.isCustom,
        condition_notes: data.condition_notes
      };

      const response = await fetch('/api/sales/returns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          items: [returnItem],
          return_type: data.type,
          reason: data.reason,
          sales_representative_id: salesRepId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process return/exchange');
      }

      const result = await response.json();
      
      toast.success(result.message || `${data.type === 'return' ? 'Return' : 'Exchange'} request submitted successfully`);
      onSuccess();
      onClose();
      
      // Reset form
      setData({
        type: 'return',
        reason: '',
        condition_notes: ''
      });

    } catch (error) {
      console.error('Return/Exchange error:', error);
      toast.error('Failed to process request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!item) return null;

  const displayName = item.isCustom 
    ? item.customProduct?.name 
    : item.product?.product_name;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {data.type === 'return' ? (
              <RotateCcw className="h-5 w-5 text-blue-600" />
            ) : (
              <ArrowLeftRight className="h-5 w-5 text-green-600" />
            )}
            {data.type === 'return' ? 'Return' : 'Exchange'} Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium text-sm text-gray-800">{displayName}</div>
            <div className="text-xs text-gray-600 mt-1">
              Qty: {item.quantity} | Price: ₹{item.finalPrice.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-gray-600">
              Total: ₹{(item.quantity * item.finalPrice).toLocaleString('en-IN')}
            </div>
          </div>

          {/* Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="type">Action</Label>
            <Select value={data.type} onValueChange={(value: 'return' | 'exchange') => setData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="return">Return Product</SelectItem>
                <SelectItem value="exchange">Exchange Product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for {data.type} <span className="text-red-500">*</span></Label>
            <Textarea
              id="reason"
              value={data.reason}
              onChange={(e) => setData(prev => ({ ...prev, reason: e.target.value }))}
              placeholder={`Enter reason for ${data.type}...`}
              className="min-h-[80px]"
            />
          </div>

          {/* Condition Notes */}
          <div className="space-y-2">
            <Label htmlFor="condition_notes">Product Condition Notes</Label>
            <Textarea
              id="condition_notes"
              value={data.condition_notes}
              onChange={(e) => setData(prev => ({ ...prev, condition_notes: e.target.value }))}
              placeholder="Describe the product condition..."
              className="min-h-[60px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || !data.reason.trim()}
            className={data.type === 'return' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {isProcessing ? 'Processing...' : `Submit ${data.type === 'return' ? 'Return' : 'Exchange'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}