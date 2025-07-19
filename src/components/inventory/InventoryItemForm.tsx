// src/components/inventory/InventoryItemForm.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue
} from '@/components/ui/select';
import { Supplier } from '@/types';

export interface InventoryItemFormProps {
  existingProducts: { id: string; name: string }[];
  suppliers: Supplier[];
  onSubmit: (form: {
    useExisting: boolean;
    product_id?: string;
    newProduct?: {
      name: string;
      sku: string;
      description: string;
      category: string;
      price: number;
      image_url?: string;
    };
    supplier_id?: string;
    category: string;
    subcategory: string;
    material: string;
    location: string;
    quantity: number;
    reorder_point: number;
  }) => void;
  onCancel: () => void;
}

const InventoryItemForm: React.FC<InventoryItemFormProps> = ({
  existingProducts, suppliers, onSubmit, onCancel
}) => {
  const [useExisting, setUseExisting] = useState(true);
  const [product_id, setProductId] = useState('');

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(0);
  const [image_url, setImageUrl] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);

  const [supplier_id, setSupplier] = useState<string | undefined>();
  const [subcat, setSubcat] = useState('');
  const [material, setMaterial] = useState('');
  const [location, setLocation] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [reorder_point, setReorder] = useState(0);

// Auto-generate SKU when Name or Supplier changes, if SKU is empty
useEffect(() => {
  if (!useExisting && name) {
    (async () => {
      try {
        const res = await fetch('/api/sku', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName: name,
            supplierName: suppliers.find(s => s.id === supplier_id)?.name || undefined
          })
        });
        const data = await res.json();
        if (data?.sku) {
          setSku(data.sku);
        } else {
          console.error('SKU generation error:', data);
        }
      } catch (err) {
        console.error('Failed to fetch SKU:', err);
      }
    })();
  }
}, [name, supplier_id, useExisting, suppliers]);




  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    setImageUrl(data.url);
    setUploading(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      useExisting,
      product_id: useExisting ? product_id : undefined,
      newProduct: useExisting
        ? undefined
        : {
            name,
            sku,
            description,
            category,
            price,
            image_url
          },
      supplier_id,
      category,
      subcategory: subcat,
      material,
      location,
      quantity,
      reorder_point
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6 py-4">
      {/* Toggle */}
      <div className="flex items-center gap-4">
        <Label>
          <input
            type="radio"
            checked={useExisting}
            onChange={() => setUseExisting(true)}
            className="mr-2"
            title='select'
          />
          Use existing product
        </Label>
        <Label>
          <input
            type="radio"
            checked={!useExisting}
            onChange={() => setUseExisting(false)}
            className="mr-2"
            title='select'
          />
          Create new product
        </Label>
      </div>

      {useExisting ? (
        <div>
          <Label>Product</Label>
          <Select value={product_id} onValueChange={setProductId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {existingProducts.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 border p-4 rounded-lg">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              placeholder="e.g., Modern Chair"
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SKU</Label>
                <Input value={sku} readOnly disabled placeholder="SKU will be generated automatically" />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  required
                />
              </div>
            </div>

          <div>
            <Label>Description</Label>
            <Input value={description} onChange={e => setDesc(e.target.value)} />
          </div>
          <div>
            <Label>Price</Label>
            <Input
              type="number"
              step="0.01"
              value={price}
              onChange={e => setPrice(+e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Product Image</Label>
            <Input type="file" accept="image/*" onChange={handleUpload} />
            {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
            {image_url && (
              <img src={image_url} alt="Preview" className="h-24 mt-2 rounded-md border" />
            )}
          </div>
        </div>
      )}

      <div>
        <Label>Supplier</Label>
        <Select onValueChange={v => setSupplier(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select supplier (optional)" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Subcategory</Label>
          <Input value={subcat} onChange={e => setSubcat(e.target.value)} required />
        </div>
        <div>
          <Label>Material</Label>
          <Input value={material} onChange={e => setMaterial(e.target.value)} required />
        </div>
      </div>

      <div>
        <Label>Location</Label>
        <Input value={location} onChange={e => setLocation(e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            min={0}
            value={quantity}
            onChange={e => setQuantity(+e.target.value)}
            required
          />
        </div>
        <div>
          <Label>Reorder Point</Label>
          <Input
            type="number"
            min={0}
            value={reorder_point}
            onChange={e => setReorder(+e.target.value)}
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Item</Button>
      </div>
    </form>
  );
};

export default InventoryItemForm;
