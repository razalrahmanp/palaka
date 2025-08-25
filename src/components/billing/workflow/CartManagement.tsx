"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Trash2, Package, ArrowLeft, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  price: number;
  quantity: number;
  custom_price?: number;
  discount?: number;
  notes?: string;
}

interface CartManagementProps {
  cartItems: CartItem[];
  subtotal: number;
  discountPercent: number;
  taxPercent: number;
  totalAmount: number;
  onQuantityChange: (itemId: string, quantity: number) => void;
  onCustomPriceChange: (itemId: string, price: number) => void;
  onItemDiscountChange: (itemId: string, discount: number) => void;
  onRemoveItem: (itemId: string) => void;
  onDiscountChange: (discount: number) => void;
  onTaxChange: (tax: number) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function CartManagement({
  cartItems,
  subtotal,
  discountPercent,
  taxPercent,
  totalAmount,
  onQuantityChange,
  onCustomPriceChange,
  onItemDiscountChange,
  onRemoveItem,
  onDiscountChange,
  onTaxChange,
  onNext,
  onBack,
  isLoading = false
}: CartManagementProps) {
  const calculateItemTotal = (item: CartItem) => {
    const price = item.custom_price || item.price;
    const itemTotal = price * item.quantity;
    const discountAmount = item.discount ? (itemTotal * item.discount / 100) : 0;
    return itemTotal - discountAmount;
  };

  const discountAmount = subtotal * discountPercent / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * taxPercent / 100;

  return (
    <div className="space-y-6">
      {/* Cart Items */}
      <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">
                  Cart Management
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in cart
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {cartItems.map((item) => (
            <Card key={item.id} className="border-2 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    {/* Product Info */}
                    <div className="md:col-span-2">
                      <h4 className="font-semibold text-gray-900">{item.product_name}</h4>
                      <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                      <p className="text-sm text-blue-600 font-medium">
                        Base: {formatCurrency(item.price)}
                      </p>
                    </div>
                    
                    {/* Quantity - Always Editable */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => onQuantityChange(item.id, parseInt(e.target.value) || 1)}
                        className="h-9"
                      />
                    </div>
                    
                    {/* Custom Price - Always Editable */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Unit Price</Label>
                      <Input
                        type="number"
                        placeholder={item.price.toString()}
                        value={item.custom_price || ''}
                        onChange={(e) => onCustomPriceChange(item.id, parseFloat(e.target.value) || item.price)}
                        className="h-9"
                      />
                    </div>
                    
                    {/* Item Discount - Always Editable */}
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Discount %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={item.discount || ''}
                        onChange={(e) => onItemDiscountChange(item.id, parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    
                    {/* Total & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="text-right">
                        <div className="font-bold text-lg text-gray-900">
                          {formatCurrency(calculateItemTotal(item))}
                        </div>
                      </div>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onRemoveItem(item.id)}
                        className="ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Bill Summary */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-indigo-100">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-800">
              Bill Summary
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Discounts & Tax */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Overall Discount (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                  className="h-10"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Tax Rate (%)</Label>
                <Select value={taxPercent.toString()} onValueChange={(value) => onTaxChange(parseFloat(value))}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (No Tax)</SelectItem>
                    <SelectItem value="5">5% (Reduced Rate)</SelectItem>
                    <SelectItem value="12">12% (Standard Rate)</SelectItem>
                    <SelectItem value="18">18% (Standard Rate)</SelectItem>
                    <SelectItem value="28">28% (Higher Rate)</SelectItem>
                  </SelectContent>
                  </Select>
              </div>
            </div>
            
            {/* Amount Breakdown */}
            <div className="space-y-3 bg-white/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>Discount ({discountPercent}%):</span>
                  <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Taxable Amount:</span>
                <span className="font-semibold">{formatCurrency(taxableAmount)}</span>
              </div>
              
              {taxAmount > 0 && (
                <div className="flex justify-between items-center text-blue-600">
                  <span>Tax ({taxPercent}%):</span>
                  <span className="font-semibold">+{formatCurrency(taxAmount)}</span>
                </div>
              )}
              
              <div className="border-t pt-3">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-green-600">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex items-center px-6 py-3 text-base"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>
        
        <Button
          onClick={onNext}
          disabled={cartItems.length === 0 || isLoading}
          className="flex items-center px-8 py-3 text-base font-medium bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            <>
              Proceed to Payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
