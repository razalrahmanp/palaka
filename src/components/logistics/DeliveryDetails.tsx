'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Delivery, DeliveryProof } from '@/types';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Props {
  delivery: Delivery;
  onUpdateStatus: (id: string, status: Delivery['status']) => void;
}

export const DeliveryDetails: React.FC<Props> = ({ delivery, onUpdateStatus }) => {
  const [proofs, setProofs] = useState<DeliveryProof[]>([]);
  const [collectedAmount, setCollectedAmount] = useState<number>(0);
  const [deliveredItemImages, setDeliveredItemImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/logistics/proofs?delivery_id=${delivery.id}`)
      .then(r => r.json())
      .then(setProofs);
  }, [delivery.id]);

  const handleUploadProof = async (file: File) => {
    setUploading(true);
    try {
      const presign = await fetch('/api/s3/presign', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ filename:file.name, contentType:file.type })
      }).then(r=>r.json());
      
      await fetch(presign.signedUrl, {
        method:'PUT', headers:{'Content-Type':file.type}, body:file
      });
      
      const record = await fetch('/api/logistics/proofs', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          delivery_id: delivery.id,
          type: 'photo',
          url: presign.publicUrl
        })
      }).then(r=>r.json());
      
      setProofs(ps => [record, ...ps]);
      toast.success('Proof uploaded successfully');
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast.error('Failed to upload proof');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadDeliveredItemImage = async (file: File) => {
    setUploading(true);
    try {
      const presign = await fetch('/api/s3/presign', {
        method:'POST', 
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ 
          filename: `delivered-items/${delivery.id}/${Date.now()}-${file.name}`, 
          contentType: file.type 
        })
      }).then(r=>r.json());
      
      await fetch(presign.signedUrl, {
        method:'PUT', 
        headers:{'Content-Type':file.type}, 
        body:file
      });
      
      // Save as delivery proof with type 'delivered_item'
      await fetch('/api/logistics/proofs', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          delivery_id: delivery.id,
          type: 'delivered_item', // New type for delivered item photos
          url: presign.publicUrl
        })
      });
      
      setDeliveredItemImages(prev => [...prev, presign.publicUrl]);
      toast.success('Item image uploaded successfully');
    } catch (error) {
      console.error('Error uploading item image:', error);
      toast.error('Failed to upload item image');
    } finally {
      setUploading(false);
    }
  };

  const removeDeliveredItemImage = (url: string) => {
    setDeliveredItemImages(prev => prev.filter(img => img !== url));
  };

  const handleSaveAmountCollected = async () => {
    try {
      await fetch(`/api/logistics/deliveries/${delivery.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ collected_amount: collectedAmount })
      });
      toast.success('Amount collected saved');
    } catch (error) {
      console.error('Error saving amount:', error);
      toast.error('Failed to save amount collected');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
        <div><strong>Customer:</strong> {delivery.sales_order?.customer?.name}</div>
        <div><strong>Address:</strong> {delivery.sales_order?.address}</div>
        <div><strong>Tracking #:</strong> {delivery.tracking_number}</div>
        <div><strong>Status:</strong> <span className="capitalize">{delivery.status.replace('_', ' ')}</span></div>
      </div>

      {/* Amount Collected Section */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold mb-3 text-blue-900">Cash on Delivery</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="amount_collected">Amount Collected (₹)</Label>
            <Input
              id="amount_collected"
              type="number"
              min="0"
              step="0.01"
              value={collectedAmount}
              onChange={(e) => setCollectedAmount(Number(e.target.value))}
              placeholder="0"
              className="mt-1"
            />
          </div>
          <Button onClick={handleSaveAmountCollected} size="sm">
            Save Amount
          </Button>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          Leave as 0 if payment not collected at delivery
        </p>
      </div>

      {/* Delivered Items Images */}
      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-green-900">Delivered Items Photos</h3>
          <label className="cursor-pointer">
            <Button size="sm" variant="outline" disabled={uploading} asChild>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Add Photo'}
              </span>
            </Button>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  Array.from(e.target.files).forEach(file => handleUploadDeliveredItemImage(file));
                }
              }}
            />
          </label>
        </div>
        
        {deliveredItemImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {deliveredItemImages.map((url, idx) => (
              <div key={idx} className="relative group">
                <Image
                  src={url}
                  width={200}
                  height={200}
                  alt={`Delivered item ${idx + 1}`}
                  className="rounded border object-cover w-full h-32"
                />
                <button
                  onClick={() => removeDeliveredItemImage(url)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No photos of delivered items yet. Click &quot;Add Photo&quot; to upload.
          </p>
        )}
      </div>

      {/* Proof of Delivery (Signature/General Photos) */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded">
        <h3 className="font-semibold mb-3">Proof of Delivery</h3>
        <div className="flex flex-wrap gap-3">
          {proofs.filter(p => p.type !== 'delivered_item').map(p => (
            <Image
              key={p.id}
              src={p.url}
              width={112}
              height={112}
              alt={p.type}
              className="rounded bg-gray-100 border object-cover"
            />
          ))}
          {delivery.status !== 'delivered' && (
            <label className="cursor-pointer p-4 bg-gray-100 rounded flex flex-col items-center justify-center w-28 h-28 border-2 border-dashed hover:border-blue-500 transition-colors">
              <Camera className="h-6 w-6 text-gray-500" />
              <span className="text-xs mt-1 text-center">Upload Signature/Photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files && handleUploadProof(e.target.files[0])}
              />
            </label>
          )}
        </div>
      </div>

      {/* Status Update Buttons */}
      <div className="flex space-x-2 pt-4">
        {['pending','in_transit','delivered'].map(s => (
          <button
            key={s}
            disabled={delivery.status === s}
            onClick={() => onUpdateStatus(delivery.id, s as Delivery['status'])}
            className={`px-4 py-2 border rounded font-medium ${
              delivery.status === s 
                ? 'bg-blue-500 text-white cursor-not-allowed' 
                : 'bg-white hover:bg-gray-50'
            }`}
          >
            {s.replace('_',' ').toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};
