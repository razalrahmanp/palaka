import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, ArrowLeftRight, AlertTriangle, IndianRupee } from "lucide-react";
import { toast } from "sonner";

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  final_price: number;
  product_id?: string;
  products?: {
    sku: string;
  };
  returned_quantity?: number;
  available_for_return?: number;
  return_status?: 'none' | 'partial' | 'full';
}

interface InvoiceReturnExchangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceItem: InvoiceItem | null;
  invoiceId: string;
  onSuccess: () => void;
}

interface ReturnFormData {
  type: 'return' | 'exchange';
  quantity: number;
  reason: string;
  condition_notes: string;
  refund_method: string;
}

const RETURN_REASONS = [
  'Defective product',
  'Wrong item received',
  'Customer changed mind',
  'Damaged during shipping',
  'Quality issues',
  'Not as described',
  'Warranty claim',
  'Other'
];

const REFUND_METHODS = [
  { value: 'original_payment', label: 'Original Payment Method' },
  { value: 'store_credit', label: 'Store Credit' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' }
];

export function InvoiceReturnExchangeDialog({ 
  isOpen, 
  onClose, 
  invoiceItem, 
  invoiceId, 
  onSuccess 
}: InvoiceReturnExchangeDialogProps) {
  const [formData, setFormData] = useState<ReturnFormData>({
    type: 'return',
    quantity: 1,
    reason: '',
    condition_notes: '',
    refund_method: 'original_payment'
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [customReason, setCustomReason] = useState('');

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (isOpen && invoiceItem) {
      setFormData({
        type: 'return',
        quantity: Math.min(1, invoiceItem.available_for_return || 1),
        reason: '',
        condition_notes: '',
        refund_method: 'original_payment'
      });
      setCustomReason('');
    }
  }, [isOpen, invoiceItem]);

  const handleSubmit = async () => {
    if (!invoiceItem || !invoiceId) {
      toast.error('Missing required information');
      return;
    }

    // Validation
    if (formData.quantity <= 0) {
      toast.error('Return quantity must be greater than 0');
      return;
    }

    if (formData.quantity > (invoiceItem.available_for_return || 0)) {
      toast.error(`Cannot return more than ${invoiceItem.available_for_return} items`);
      return;
    }

    const finalReason = formData.reason === 'Other' ? customReason : formData.reason;
    if (!finalReason.trim()) {
      toast.error('Please provide a reason for the return/exchange');
      return;
    }

    setIsProcessing(true);

    try {
      const returnData = {
        invoice_id: invoiceId,
        items: [{
          sales_order_item_id: invoiceItem.id,
          product_id: invoiceItem.product_id,
          quantity_to_return: formData.quantity,
          reason: finalReason,
          condition_notes: formData.condition_notes,
          is_custom_product: !invoiceItem.product_id // If no product_id, assume custom
        }],
        return_type: formData.type,
        refund_method: formData.refund_method
      };

      const response = await fetch(`/api/finance/invoices/${invoiceId}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(returnData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process return/exchange');
      }

      const result = await response.json();
      
      toast.success(result.message || `${formData.type === 'return' ? 'Return' : 'Exchange'} request submitted successfully`);
      
      // Call success callback to refresh data
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Return/Exchange error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!invoiceItem) return null;

  const maxQuantity = invoiceItem.available_for_return || 0;
  const refundAmount = formData.quantity * invoiceItem.final_price;
  const productSku = Array.isArray(invoiceItem.products) 
    ? invoiceItem.products[0]?.sku 
    : invoiceItem.products?.sku || 'N/A';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.type === 'return' ? (
              <RotateCcw className="h-5 w-5 text-blue-600" />
            ) : (
              <ArrowLeftRight className="h-5 w-5 text-green-600" />
            )}
            {formData.type === 'return' ? 'Return' : 'Exchange'} Product
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Information Card */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-sm">{invoiceItem.name}</h3>
                    <p className="text-xs text-gray-600">SKU: {productSku}</p>
                  </div>
                  <Badge variant={invoiceItem.return_status === 'none' ? 'default' : 'secondary'}>
                    {invoiceItem.return_status === 'none' ? 'No Returns' : 
                     invoiceItem.return_status === 'partial' ? 'Partially Returned' : 'Fully Returned'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-600">Original Qty:</span>
                    <span className="ml-1 font-medium">{invoiceItem.quantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Unit Price:</span>
                    <span className="ml-1 font-medium">₹{invoiceItem.final_price.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Returned:</span>
                    <span className="ml-1 font-medium">{invoiceItem.returned_quantity || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Available:</span>
                    <span className="ml-1 font-medium text-green-600">{maxQuantity}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Return/Exchange Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="type">Action Type</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value: 'return' | 'exchange') => 
                setFormData(prev => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="return">Return Product (Refund)</SelectItem>
                <SelectItem value="exchange">Exchange Product (Replace)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Selection */}
          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity to {formData.type} <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="quantity"
                type="number"
                min="1"
                max={maxQuantity}
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  quantity: Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1))
                }))}
                className="w-24"
              />
              <span className="text-sm text-gray-600">
                Max: {maxQuantity}
              </span>
              {maxQuantity === 0 && (
                <div className="flex items-center gap-1 text-amber-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  No items available for return
                </div>
              )}
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for {formData.type} <span className="text-red-500">*</span>
            </Label>
            <Select 
              value={formData.reason} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map(reason => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Reason Input */}
          {formData.reason === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="custom_reason">
                Please specify <span className="text-red-500">*</span>
              </Label>
              <Input
                id="custom_reason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter custom reason..."
              />
            </div>
          )}

          {/* Condition Notes */}
          <div className="space-y-2">
            <Label htmlFor="condition_notes">Product Condition Notes</Label>
            <Textarea
              id="condition_notes"
              value={formData.condition_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, condition_notes: e.target.value }))}
              placeholder="Describe the product condition, damage, or other relevant details..."
              className="min-h-[80px]"
            />
          </div>

          {/* Refund Method (only for returns) */}
          {formData.type === 'return' && (
            <div className="space-y-2">
              <Label htmlFor="refund_method">Refund Method</Label>
              <Select 
                value={formData.refund_method} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, refund_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select refund method" />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_METHODS.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Refund Amount Display */}
          {formData.type === 'return' && formData.quantity > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    Estimated Refund Amount:
                  </span>
                  <div className="flex items-center gap-1 text-lg font-bold text-blue-900">
                    <IndianRupee className="h-4 w-4" />
                    {refundAmount.toLocaleString('en-IN')}
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {formData.quantity} × ₹{invoiceItem.final_price.toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Exchange Notice */}
          {formData.type === 'exchange' && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">Exchange Process:</p>
                    <p className="text-xs mt-1">
                      After submitting this exchange request, you&apos;ll need to add the replacement product 
                      to create a new order or invoice. The original item will be marked as returned.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              isProcessing || 
              maxQuantity === 0 || 
              !formData.reason || 
              (formData.reason === 'Other' && !customReason.trim())
            }
            className={formData.type === 'return' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                {formData.type === 'return' ? (
                  <RotateCcw className="h-4 w-4 mr-2" />
                ) : (
                  <ArrowLeftRight className="h-4 w-4 mr-2" />
                )}
                Submit {formData.type === 'return' ? 'Return' : 'Exchange'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}