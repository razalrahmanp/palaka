// components/procurement/PurchaseOrderForm.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label }  from '@/components/ui/label';
import { Input }  from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PurchaseOrder, Supplier, Product } from '@/types';
import NextImage from 'next/image';

interface Props {
  initialData: PurchaseOrder | null;
  suppliers: Supplier[];
  products: Product[];
  onSubmit: (data: Omit<PurchaseOrder, 'id'|'created_at'|'created_by'>) => void | Promise<void>;
  onCancel: () => void;
}

export const PurchaseOrderForm: React.FC<Props> = ({
  initialData, suppliers, products, onSubmit, onCancel
}) => {
  const fileInput = useRef<HTMLInputElement>(null);

  // form state
  const [supplier_id, setSupplier]    = useState('');
  const [product_id,  setProduct]     = useState('');
  const [quantity,    setQuantity]    = useState(1);
  const [status,      setStatus]      = useState<'pending'|'approved'|'received'>('pending');
  const [isCustom,    setIsCustom]    = useState(false);
  const [customType,  setCustomType]  = useState('');
  const [materials,   setMaterials]   = useState('');
  const [description, setDescription] = useState('');
  const [images,      setImages]      = useState<string[]>([]);   // already uploaded URLs
  const [files,       setFiles]       = useState<File[]>([]);     // newly selected
  const [progress,    setProgress]    = useState<number[]>([]);   // per-file upload %

  // prefill on edit
  useEffect(() => {
    if (!initialData) return;
    setSupplier(initialData.supplier_id);
    setProduct(initialData.product_id);
    setQuantity(initialData.quantity);
    setStatus(initialData.status);
    setIsCustom(Boolean(initialData.is_custom));
    setCustomType(initialData.custom_type ?? '');
    setMaterials((initialData.materials ?? []).join(', '));
    setDescription(initialData.description ?? '');
    // filter out any falsy
    setImages((initialData.images ?? []).filter(u => u));
  }, [initialData]);

  // compress file to WebP
  const compressToWebP = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx!.drawImage(img, 0, 0);
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/webp',
          0.7
        );
      };
      img.onerror = () => reject(new Error('Image load error'));
    });

  // upload all new files via S3 presign
  const uploadFiles = async (): Promise<string[]> => {
    if (files.length === 0) return [];
    const urls: string[] = [];
    setProgress(files.map(() => 0));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // compress
      const blob = await compressToWebP(file);

      // get presigned URL
      const pres = await fetch('/api/s3/presign', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          filename: `${Date.now()}-${file.name}.webp`,
          contentType: 'image/webp'
        })
      }).then(r => r.json());

      // upload with progress
      await new Promise<void>((res, rej) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', pres.signedUrl);
        xhr.setRequestHeader('Content-Type','image/webp');
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded/e.total)*100);
            setProgress(p => {
              const cp = [...p]; cp[i] = pct; return cp;
            });
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            urls.push(pres.publicUrl);
            res();
          } else rej(new Error('Upload failed'));
        };
        xhr.onerror = () => rej(new Error('XHR error'));
        xhr.send(blob);
      });
    }
    return urls;
  };

  // remove a selected (not yet uploaded) file
  const removeFile = (idx: number) => {
    setFiles(f => f.filter((_,i) => i!==idx));
    setProgress(p => p.filter((_,i) => i!==idx));
  };

  // remove an already-uploaded URL
  const removeImage = (idx: number) => {
    setImages(u => u.filter((_,i) => i!==idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUrls = await uploadFiles();
    await onSubmit({
      supplier_id,
      product_id:  isCustom ? '' : product_id,
      quantity,
      status,
      is_custom:   isCustom,
      custom_type: isCustom ? customType : null,
      materials:   materials? materials.split(',').map(s=>s.trim()) : null,
      description: description||null,
      images:      [...images, ...newUrls].filter(u=>u),
      });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      {/* supplier, product, qty */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Supplier</Label>
          <Select value={supplier_id} onValueChange={setSupplier} required>
            <SelectTrigger><SelectValue placeholder="Select supplier"/></SelectTrigger>
            <SelectContent>
              {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Product</Label>
          <Select
            value={product_id}
            onValueChange={setProduct}
            disabled={isCustom}
          >
            <SelectTrigger><SelectValue placeholder="Select product"/></SelectTrigger>
            <SelectContent>
              {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Quantity</Label>
          <Input
            type="number" min={1}
            value={quantity}
            onChange={e=>setQuantity(+e.target.value)}
            required
          />
        </div>
        <div className="col-span-3 flex items-center space-x-2">
          <input
            id="custom-toggle"
            type="checkbox"
            checked={isCustom}
            onChange={() => setIsCustom(c=>!c)}
            title="Toggle custom product"
            placeholder="Custom product toggle"
          />
          <Label htmlFor="custom-toggle">Custom product?</Label>
        </div>
      </div>

      {/* custom fields */}
      {isCustom && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Custom Type</Label>
            <Input
              value={customType}
              onChange={e=>setCustomType(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Materials</Label>
            <Input
              value={materials}
              onChange={e=>setMaterials(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* description */}
      <div>
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={e=>setDescription(e.target.value)}
        />
      </div>

      {/* status */}
      <div>
        <Label>Status</Label>
        <Select value={status} onValueChange={v=>setStatus(v as typeof status)}>
          <SelectTrigger><SelectValue placeholder="Select status"/></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="received">Received</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* upload */}
      <div>
        <Label>Attach Images</Label>
        <Button
          type="button"
          variant="default"
          className="bg-black text-white"
          onClick={() => fileInput.current?.click()}
        >
          Upload Images
        </Button>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          title="Upload images"
          placeholder="Select images to upload"
          onChange={e => {
            const fs = Array.from(e.target.files || []);
            setFiles(fs);
            setProgress(fs.map(() => 0));
          }}
        />
      </div>

      {/* previews */}
      <div className="block mt-2 rounded-2xl border border-dashed p-2">
        <div className="flex flex-wrap gap-3">
          {images.map((url,i) => (
            <div key={`img-${i}`} className="relative">
              <NextImage src={url} alt="" width={64} height={64}
                     className="rounded border" />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute -top-2 -right-2 text-red-500"
                onClick={() => removeImage(i)}
              >
                ×
              </Button>
            </div>
          ))}
          {files.map((file, i) => (
            <div key={`file-${i}`} className="relative">
              <NextImage
                src={URL.createObjectURL(file)}
                alt=""
                width={64} height={64}
                className="rounded border-2 border-dashed"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute -top-2 -right-2 text-red-500"
                onClick={() => removeFile(i)}
              >
                ×
              </Button>
              {progress[i] > 0 && progress[i] < 100 && (
                <div className="text-xs mt-1">{progress[i]}%</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update PO' : 'Create PO'}</Button>
      </div>
    </form>
  );
};
