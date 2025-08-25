import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Minus, 
  Plus, 
  Trash2, 
  Percent,
  AlertTriangle,
  Package
} from "lucide-react";
import { ProductWithInventory } from "@/types";

interface CustomProduct {
  name: string;
  cost: number;
}

interface BillingItem {
  id: string;
  product?: ProductWithInventory;
  customProduct?: CustomProduct;
  quantity: number;
  originalPrice: number;
  finalPrice: number;
  totalPrice: number;
  discountAmount: number;
  discountPercentage: number;
  tax: number;
  isCustom: boolean;
}

interface BillingCartProps {
  items: BillingItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onUpdateDiscount: (itemId: string, discountValue: number, discountType: 'percentage' | 'amount' | 'final_price') => void;
  onUpdateTax: (itemId: string, taxRate: number) => void; // Add tax update handler
  onRemoveItem: (itemId: string) => void;
  subtotal: number;
  totalOriginalPrice: number;
  totalDiscountAmount: number;
  totalDiscountPercentage: number;
  totalTax: number;
  finalTotal: number;
}

export function BillingCart({
  items,
  onUpdateQuantity,
  onUpdateDiscount,
  onUpdateTax,
  onRemoveItem,
  subtotal,
  totalOriginalPrice,
  totalDiscountAmount,
  totalDiscountPercentage,
  totalTax,
  finalTotal
}: BillingCartProps) {


  if (items.length === 0) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Billing Cart
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items in cart</p>
            <p className="text-sm">Search and add products to start billing</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Billing Cart ({items.length} items)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              {/* Product Info */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">
                    {item.product?.product_name || item.customProduct?.name}
                  </h4>
                  {item.product && (
                    <p className="text-sm text-gray-600">
                      SKU: {item.product.sku} | Category: {item.product.category}
                    </p>
                  )}
                  {item.isCustom && (
                    <Badge variant="secondary" className="mt-1">Custom Product</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Quantity and Price Controls */}
              <div className="grid grid-cols-2 gap-4">
                {/* Quantity */}
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 text-center"
                      type="number"
                      min="1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Original Price */}
                <div>
                  <Label className="text-xs">Original Price</Label>
                  <div className="mt-1">
                    <p className="text-lg font-semibold">₹{item.originalPrice.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Discount Controls - Three Options */}
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <Percent className="h-4 w-4" />
                  Discount Options
                </Label>
                
                <div className="grid grid-cols-3 gap-2">
                  {/* Percentage Discount */}
                  <div>
                    <Label className="text-xs">Percentage %</Label>
                    <Input
                      value={item.discountPercentage.toFixed(1)}
                      onChange={(e) => {
                        const value = Math.min(parseFloat(e.target.value) || 0, 90);
                        onUpdateDiscount(item.id, value, 'percentage');
                      }}
                      className="mt-1 text-xs"
                      type="number"
                      min="0"
                      max="90"
                      step="0.5"
                      placeholder="0"
                    />
                  </div>

                  {/* Discount Amount */}
                  <div>
                    <Label className="text-xs">Amount ₹</Label>
                    <Input
                      value={item.discountAmount.toFixed(0)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        onUpdateDiscount(item.id, value, 'amount');
                      }}
                      className="mt-1 text-xs"
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                    />
                  </div>

                  {/* Final Price */}
                  <div>
                    <Label className="text-xs">Final Price ₹</Label>
                    <Input
                      value={item.finalPrice.toFixed(0)}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        onUpdateDiscount(item.id, value, 'final_price');
                      }}
                      className="mt-1 text-xs"
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {/* Discount Summary */}
                <div className="text-xs text-gray-600 pt-2 border-t">
                  <p>Discount: ₹{item.discountAmount.toLocaleString()} ({item.discountPercentage.toFixed(1)}%)</p>
                  <p>Final Price per unit: ₹{item.finalPrice.toLocaleString()}</p>
                </div>
              </div>

              {/* Tax Selection */}
              <div>
                <Label className="text-xs">Tax Rate</Label>
                <Select
                  value={item.tax.toString()}
                  onValueChange={(value) => onUpdateTax(item.id, parseFloat(value))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select tax rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exempt)</SelectItem>
                    <SelectItem value="5">5% (GST)</SelectItem>
                    <SelectItem value="12">12% (GST)</SelectItem>
                    <SelectItem value="18">18% (GST)</SelectItem>
                    <SelectItem value="28">28% (GST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Breakdown */}
              <div className="bg-gray-50 rounded p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Base Price × {item.quantity}:</span>
                  <span>₹{(item.originalPrice * item.quantity).toLocaleString()}</span>
                </div>
                {item.discountPercentage > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount ({item.discountPercentage.toFixed(1)}%):</span>
                    <span>-₹{item.discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>After Discount:</span>
                  <span>₹{(item.finalPrice * item.quantity).toLocaleString()}</span>
                </div>
                {item.tax > 0 && (
                  <div className="flex justify-between text-sm text-blue-600">
                    <span>Tax ({item.tax}%):</span>
                    <span>+₹{(((item.finalPrice * item.quantity) * item.tax) / 100).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total:</span>
                  <span className="text-green-600">₹{item.totalPrice.toLocaleString()}</span>
                </div>
              </div>

              {/* Margin Warning */}
              {item.product && item.finalPrice < (item.product.cost * 1.05) && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-700">
                    Warning: Price below minimum margin (5%)
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="border-t pt-4 bg-gray-50 -mx-6 px-6 -mb-6 pb-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Original Price:</span>
              <span>₹{totalOriginalPrice.toLocaleString()}</span>
            </div>
            {totalDiscountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Total Discount ({totalDiscountPercentage.toFixed(1)}%):</span>
                <span>-₹{totalDiscountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>After Discount:</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            {totalTax > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>Total Tax:</span>
                <span>+₹{totalTax.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Final Total:</span>
              <span className="text-green-600">₹{finalTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
