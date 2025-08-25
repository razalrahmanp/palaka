'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Plus, AlertTriangle } from 'lucide-react';
import { ProductWithInventory } from '@/types';

interface CustomProduct {
  name: string;
  description?: string;
  category: string;
  price: number;
  cost: number;
  hsn_code?: string;
  tax_rate: number;
  unit?: string;
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

interface CustomProductFormProps {
  isOpen?: boolean;
  onClose?: () => void;
  onProductAdd: (product: BillingItem) => void;
  inline?: boolean;
}

export default function CustomProductForm({ isOpen, onClose, onProductAdd, inline = false }: CustomProductFormProps) {
  const [product, setProduct] = useState<CustomProduct>({
    name: '',
    description: '',
    category: '',
    price: 0,
    cost: 0,
    hsn_code: '',
    tax_rate: 18,
    unit: 'pcs'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!product.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!product.category.trim()) {
      newErrors.category = 'Category is required';
    }

    if (product.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }

    if (product.cost <= 0) {
      newErrors.cost = 'Cost must be greater than 0';
    }

    if (product.price <= product.cost) {
      newErrors.price = 'Price must be greater than cost';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setProduct({
      name: '',
      description: '',
      category: '',
      price: 0,
      cost: 0,
      hsn_code: '',
      tax_rate: 18,
      unit: 'pcs'
    });
    setErrors({});
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const newProduct: BillingItem = {
        id: `custom-${Date.now()}`,
        customProduct: product,
        quantity: 1,
        originalPrice: product.price,
        finalPrice: product.price,
        totalPrice: product.price,
        discountAmount: 0,
        discountPercentage: 0,
        tax: 0,
        isCustom: true
      };

      onProductAdd(newProduct);
      resetForm();
      if (onClose && !inline) {
        onClose();
      }
    }
  };

  const handleClose = () => {
    resetForm();
    if (onClose) {
      onClose();
    }
  };

  const margin = product.price > 0 && product.cost > 0 
    ? ((product.price - product.cost) / product.price * 100).toFixed(1)
    : '0';

  const formContent = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Product Name *</Label>
        <Input
          id="name"
          value={product.name}
          onChange={(e) => setProduct(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter product name"
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={product.description || ''}
          onChange={(e) => setProduct(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Product description (optional)"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category *</Label>
          <Input
            id="category"
            value={product.category}
            onChange={(e) => setProduct(prev => ({ ...prev, category: e.target.value }))}
            placeholder="Product category"
            className={errors.category ? 'border-red-500' : ''}
          />
          {errors.category && (
            <p className="text-sm text-red-600 mt-1">{errors.category}</p>
          )}
        </div>
        <div>
          <Label htmlFor="unit">Unit</Label>
          <Select
            value={product.unit}
            onValueChange={(value) => setProduct(prev => ({ ...prev, unit: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pcs">Pieces</SelectItem>
              <SelectItem value="kg">Kilograms</SelectItem>
              <SelectItem value="meter">Meters</SelectItem>
              <SelectItem value="sqft">Square Feet</SelectItem>
              <SelectItem value="box">Box</SelectItem>
              <SelectItem value="set">Set</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="cost">Cost Price *</Label>
          <Input
            id="cost"
            type="number"
            value={product.cost}
            onChange={(e) => setProduct(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
            placeholder="0"
            min="0"
            step="0.01"
            className={errors.cost ? 'border-red-500' : ''}
          />
          {errors.cost && (
            <p className="text-sm text-red-600 mt-1">{errors.cost}</p>
          )}
        </div>
        <div>
          <Label htmlFor="price">Selling Price *</Label>
          <Input
            id="price"
            type="number"
            value={product.price}
            onChange={(e) => setProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
            placeholder="0"
            min="0"
            step="0.01"
            className={errors.price ? 'border-red-500' : ''}
          />
          {errors.price && (
            <p className="text-sm text-red-600 mt-1">{errors.price}</p>
          )}
        </div>
      </div>

      {product.price > 0 && product.cost > 0 && (
        <div className={`p-3 rounded-lg ${
          parseFloat(margin) < 5 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            {parseFloat(margin) < 5 && <AlertTriangle className="h-4 w-4 text-red-600" />}
            <span className={`text-sm font-medium ${
              parseFloat(margin) < 5 ? 'text-red-700' : 'text-green-700'
            }`}>
              Profit Margin: {margin}%
            </span>
          </div>
          {parseFloat(margin) < 5 && (
            <p className="text-xs text-red-600 mt-1">
              Warning: Margin below recommended minimum of 5%
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="tax_rate">Tax Rate (%)</Label>
          <Select
            value={product.tax_rate.toString()}
            onValueChange={(value) => setProduct(prev => ({ ...prev, tax_rate: parseFloat(value) }))}
          >
            <SelectTrigger>
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
        <div>
          <Label htmlFor="hsn_code">HSN Code</Label>
          <Input
            id="hsn_code"
            value={product.hsn_code || ''}
            onChange={(e) => setProduct(prev => ({ ...prev, hsn_code: e.target.value }))}
            placeholder="HSN/SAC code"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        {!inline && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSubmit}
          className={inline ? "w-full" : "flex-1"}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>
    </div>
  );

  if (inline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Custom Product
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formContent}
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen || false} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Custom Product
          </DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
