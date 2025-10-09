'use client';

import { useState, useEffect } from 'react';
import { Package, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface VendorBillLineItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  total_returned_quantity?: number;
}

interface ReturnLineItem {
  vendor_bill_line_item_id: string;
  product_name: string;
  returned_quantity: number;
  unit_price: number;
  return_amount: number;
  reason?: string;
}

interface ProductReturnSelectorProps {
  billLineItems: VendorBillLineItem[];
  onReturnItemsChange: (items: ReturnLineItem[]) => void;
  disabled?: boolean;
}

export default function ProductReturnSelector({ 
  billLineItems, 
  onReturnItemsChange, 
  disabled = false 
}: ProductReturnSelectorProps) {
  const [returnItems, setReturnItems] = useState<Record<string, ReturnLineItem>>({});
  const [globalReason, setGlobalReason] = useState('');

  useEffect(() => {
    const items = Object.values(returnItems).filter(item => item.returned_quantity > 0);
    onReturnItemsChange(items);
  }, [returnItems, onReturnItemsChange]);

  const getAvailableQuantity = (item: VendorBillLineItem) => {
    return item.quantity - (item.total_returned_quantity || 0);
  };

  const updateReturnQuantity = (itemId: string, item: VendorBillLineItem, quantity: number) => {
    const availableQty = getAvailableQuantity(item);
    const validQuantity = Math.max(0, Math.min(quantity, availableQty));
    
    setReturnItems(prev => ({
      ...prev,
      [itemId]: {
        vendor_bill_line_item_id: itemId,
        product_name: item.product_name,
        returned_quantity: validQuantity,
        unit_price: item.unit_price,
        return_amount: validQuantity * item.unit_price,
        reason: prev[itemId]?.reason || globalReason
      }
    }));
  };

  const updateReturnReason = (itemId: string, reason: string) => {
    setReturnItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        reason
      }
    }));
  };

  const applyGlobalReason = () => {
    setReturnItems(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(itemId => {
        if (updated[itemId].returned_quantity > 0) {
          updated[itemId].reason = globalReason;
        }
      });
      return updated;
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTotalReturnAmount = () => {
    return Object.values(returnItems).reduce((sum, item) => sum + item.return_amount, 0);
  };

  const getTotalReturnItems = () => {
    return Object.values(returnItems).filter(item => item.returned_quantity > 0).length;
  };

  const returnableItems = billLineItems.filter(item => getAvailableQuantity(item) > 0);

  if (returnableItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select Products to Return
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No products available for return in this bill.</p>
            <p className="text-sm">All items have already been fully returned.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Select Products to Return
        </CardTitle>
        {getTotalReturnItems() > 0 && (
          <div className="flex items-center justify-between text-sm bg-muted p-3 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {getTotalReturnItems()} items selected
              </span>
            </div>
            <div className="font-semibold text-lg">
              Total: {formatAmount(getTotalReturnAmount())}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Return Reason */}
        <div className="space-y-2">
          <Label>Global Return Reason (Optional)</Label>
          <div className="flex gap-2">
            <Textarea
              placeholder="Enter a reason that applies to all returned items..."
              value={globalReason}
              onChange={(e) => setGlobalReason(e.target.value)}
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={applyGlobalReason}
              disabled={!globalReason || getTotalReturnItems() === 0 || disabled}
            >
              Apply to All
            </Button>
          </div>
        </div>

        {/* Product List */}
        <div className="space-y-4">
          {returnableItems.map((item) => {
            const availableQty = getAvailableQuantity(item);
            const currentReturn = returnItems[item.id] || { returned_quantity: 0, return_amount: 0, reason: '' };
            
            return (
              <Card key={item.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Product Info */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-semibold">{item.product_name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Unit Price: {formatAmount(item.unit_price)}</span>
                          <Badge variant="outline">
                            {availableQty} available for return
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Originally: {item.quantity} × {formatAmount(item.unit_price)}
                        </div>
                        <div className="font-semibold">
                          {formatAmount(item.total_amount)}
                        </div>
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm font-medium">Return Quantity:</Label>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateReturnQuantity(item.id, item, currentReturn.returned_quantity - 1)}
                            disabled={currentReturn.returned_quantity <= 0 || disabled}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min="0"
                            max={availableQty}
                            value={currentReturn.returned_quantity}
                            onChange={(e) => updateReturnQuantity(item.id, item, parseInt(e.target.value) || 0)}
                            disabled={disabled}
                            className="w-20 text-center"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateReturnQuantity(item.id, item, currentReturn.returned_quantity + 1)}
                            disabled={currentReturn.returned_quantity >= availableQty || disabled}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {currentReturn.returned_quantity > 0 && (
                        <div className="font-semibold text-green-600">
                          Return Amount: {formatAmount(currentReturn.return_amount)}
                        </div>
                      )}
                    </div>

                    {/* Individual Return Reason */}
                    {currentReturn.returned_quantity > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm">Return Reason for this item</Label>
                        <Textarea
                          placeholder="Specific reason for returning this item..."
                          value={currentReturn.reason || ''}
                          onChange={(e) => updateReturnReason(item.id, e.target.value)}
                          disabled={disabled}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        {!disabled && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                returnableItems.forEach(item => {
                  updateReturnQuantity(item.id, item, getAvailableQuantity(item));
                });
              }}
              className="flex-1"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Return All Available
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReturnItems({})}
              className="flex-1"
            >
              Clear All Selections
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}