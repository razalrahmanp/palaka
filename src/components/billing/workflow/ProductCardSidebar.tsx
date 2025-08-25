"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, Edit3, X } from 'lucide-react';
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
  image_url?: string;
}

interface ProductCardSidebarProps {
  cartItems: CartItem[];
  subtotal: number;
  discountPercent: number;
  taxPercent: number;
  totalAmount: number;
  onEditItem?: (itemId: string) => void;
  onRemoveItem?: (itemId: string) => void;
}

export function ProductCardSidebar({
  cartItems,
  subtotal,
  discountPercent,
  taxPercent,
  totalAmount,
  onEditItem,
  onRemoveItem
}: ProductCardSidebarProps) {
  const calculateItemTotal = (item: CartItem) => {
    const price = item.custom_price || item.price;
    const itemTotal = price * item.quantity;
    const discountAmount = item.discount ? (itemTotal * item.discount / 100) : 0;
    return itemTotal - discountAmount;
  };

  const discountAmount = subtotal * discountPercent / 100;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * taxPercent / 100;

  if (cartItems.length === 0) {
    return (
      <div className="w-80 bg-white border-l border-gray-200">
        <div className="p-6">
          <div className="text-center py-8">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Items</h3>
            <p className="text-gray-600">Add products to see them here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <ShoppingCart className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Selected Items</h2>
            <p className="text-sm text-gray-600">{cartItems.length} items in cart</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {cartItems.map((item) => (
          <Card key={item.id} className="border-2 border-gray-100 hover:border-gray-200 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.product_name}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{item.product_name}</h4>
                  <p className="text-sm text-gray-500 mb-2">SKU: {item.sku}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-600">Qty: </span>
                      <span className="font-medium">{item.quantity}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {formatCurrency(item.custom_price || item.price)}/unit
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-base font-semibold text-gray-900">
                      {formatCurrency(calculateItemTotal(item))}
                    </div>
                    <div className="flex items-center space-x-1">
                      {onEditItem && (
                        <button
                          onClick={() => onEditItem(item.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                      )}
                      {onRemoveItem && (
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Summary */}
      <div className="border-t border-gray-200 p-6 bg-gray-50">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          
          {discountPercent > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount ({discountPercent}%)</span>
              <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Taxable Amount</span>
            <span className="font-medium">{formatCurrency(taxableAmount)}</span>
          </div>
          
          {taxPercent > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax ({taxPercent}%)</span>
              <span className="font-medium">+{formatCurrency(taxAmount)}</span>
            </div>
          )}
          
          <div className="border-t border-gray-300 pt-3">
            <div className="flex justify-between">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
