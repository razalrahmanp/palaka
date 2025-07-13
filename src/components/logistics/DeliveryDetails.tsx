'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Delivery, DeliveryProof } from '@/types';
import { Camera } from 'lucide-react';

interface Props {
  delivery: Delivery;
  onUpdateStatus: (id: string, status: Delivery['status']) => void;
}

export const DeliveryDetails: React.FC<Props> = ({ delivery, onUpdateStatus }) => {
  const [proofs, setProofs] = useState<DeliveryProof[]>([]);

  useEffect(() => {
    fetch(`/api/logistics/proofs?delivery_id=${delivery.id}`)
      .then(r => r.json())
      .then(setProofs);
  }, [delivery.id]);

  const handleUpload = async (file: File) => {
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
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
        <div><strong>Customer:</strong> {delivery.sales_order?.customer?.name}</div>
        <div><strong>Address:</strong> {delivery.sales_order?.address}</div>
        {/* <div><strong>Time Slot:</strong> {delivery.sales_order?.time_slot}</div> */}
        <div><strong>Tracking #:</strong> {delivery.tracking_number}</div>
      </div>

      <h3 className="font-semibold">Proof of Delivery</h3>
      <div className="flex flex-wrap gap-3">
        {proofs.map(p => (
          <Image
            key={p.id}
            src={p.url}
            width={112}
            height={112}
            alt={p.type}
            className="rounded bg-gray-100"
          />
        ))}
        {delivery.status !== 'delivered' && (
          <label className="cursor-pointer p-4 bg-gray-100 rounded flex flex-col items-center">
            <Camera className="h-6 w-6 text-gray-500" />
            <span className="text-xs mt-1">Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files && handleUpload(e.target.files[0])}
            />
          </label>
        )}
      </div>

      <div className="flex space-x-2 pt-4">
        {['pending','in_transit','delivered'].map(s => (
          <button
            key={s}
            disabled={delivery.status === s}
            onClick={() => onUpdateStatus(delivery.id, s as Delivery['status'])}
            className={`px-3 py-1 border rounded ${
              delivery.status === s ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {s.replace('_',' ').toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};
