'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Delivery, DeliveryProof } from '@/types';
import { Camera, Upload, X, MapPin, Package, DollarSign, FileText, CheckCircle2, Clock, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      
      await fetch('/api/logistics/proofs', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          delivery_id: delivery.id,
          type: 'delivered_item',
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
    <div className="space-y-3">
      {/* Delivery Information - Inline Single Row */}
      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gradient-to-r from-white via-blue-50/20 to-purple-50/20 shadow-sm">
        <div className="relative p-3 flex items-center gap-4 flex-wrap">
          {/* Customer */}
          <div className="flex items-center space-x-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {(delivery.sales_order?.customer?.name || delivery.customer_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-gray-500">Customer</p>
              <p className="text-sm font-bold text-gray-900">{delivery.sales_order?.customer?.name || delivery.customer_name || '—'}</p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-300"></div>

          {/* Tracking Number */}
          <div className="flex items-center space-x-1.5">
            <FileText className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Tracking #</p>
              <p className="text-xs font-mono font-semibold text-gray-900">{delivery.tracking_number || '—'}</p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-300"></div>

          {/* Status */}
          <div className="flex items-center space-x-1.5">
            {delivery.status === 'delivered' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : delivery.status === 'in_transit' ? (
              <Truck className="h-4 w-4 text-blue-600" />
            ) : (
              <Clock className="h-4 w-4 text-orange-600" />
            )}
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                delivery.status === 'delivered' 
                  ? 'bg-green-100 text-green-800' 
                  : delivery.status === 'in_transit'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {delivery.status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-300"></div>

          {/* Address */}
          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            <MapPin className="h-4 w-4 text-red-500" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Address</p>
              <p className="text-xs text-gray-900 truncate">{delivery.delivery_address || delivery.sales_order?.address || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout for Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left Column */}
        <div className="space-y-3">
          {/* Amount Collected Section */}
          <div className="relative overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md">
                  <DollarSign className="h-3 w-3 text-white" />
                </div>
                <h3 className="font-bold text-blue-900 text-sm">Cash on Delivery</h3>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">₹</span>
                    <Input
                      id="amount_collected"
                      type="number"
                      min="0"
                      step="0.01"
                      value={collectedAmount}
                      onChange={(e) => setCollectedAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="h-8 pl-7 font-semibold text-sm border-blue-200 focus:border-blue-400 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSaveAmountCollected} 
                  size="sm" 
                  className="h-8 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-md text-xs"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Save
                </Button>
              </div>
              <p className="text-xs text-blue-700 mt-1.5 flex items-start">
                <span className="mr-1">ℹ️</span>
                <span>Leave as 0 if payment not collected</span>
              </p>
            </div>
          </div>

          {/* Proof of Delivery */}
          <div className="relative overflow-hidden rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                  <Camera className="h-3 w-3 text-white" />
                </div>
                <h3 className="font-bold text-purple-900 text-sm">Proof of Delivery</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {proofs.filter(p => p.type !== 'delivered_item').map(p => (
                  <div key={p.id} className="relative group">
                    <Image
                      src={p.url}
                      width={80}
                      height={80}
                      alt={p.type}
                      className="rounded-lg border-2 border-white shadow-md object-cover hover:shadow-lg transition-shadow"
                    />
                  </div>
                ))}
                {delivery.status !== 'delivered' && (
                  <label className="cursor-pointer group">
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-purple-300 bg-white hover:bg-purple-50 hover:border-purple-500 transition-all flex flex-col items-center justify-center shadow-sm hover:shadow-md">
                      <Camera className="h-4 w-4 text-purple-400 group-hover:text-purple-600 transition-colors" />
                      <span className="text-xs mt-0.5 text-purple-600 font-medium">Upload</span>
                    </div>
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
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Delivered Items Images */}
          <div className="relative overflow-hidden rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
            <div className="relative p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                    <Package className="h-3 w-3 text-white" />
                  </div>
                  <h3 className="font-bold text-green-900 text-sm">Delivered Items</h3>
                </div>
                <label className="cursor-pointer">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={uploading} 
                    className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-100 hover:text-green-800 shadow-sm px-2" 
                    asChild
                  >
                    <span>
                      <Upload className="h-3 w-3 mr-1" />
                      {uploading ? 'Uploading...' : 'Add'}
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
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {deliveredItemImages.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <Image
                        src={url}
                        width={120}
                        height={120}
                        alt={`Delivered item ${idx + 1}`}
                        className="rounded-lg border-2 border-white shadow-md object-cover w-full h-20 hover:shadow-lg transition-shadow"
                      />
                      <button
                        onClick={() => removeDeliveredItemImage(url)}
                        className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md transform hover:scale-110"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-green-200 rounded-lg bg-white/50">
                  <Package className="h-8 w-8 text-green-300 mb-2" />
                  <p className="text-xs text-green-700 font-medium text-center px-4">
                    No photos yet
                  </p>
                  <p className="text-xs text-green-600 text-center mt-0.5">
                    Click &quot;Add&quot; to upload
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          disabled={delivery.status === 'pending'}
          onClick={() => onUpdateStatus(delivery.id, 'pending')}
          className={`group relative overflow-hidden px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-sm hover:shadow-md ${
            delivery.status === 'pending'
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200 cursor-not-allowed' 
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <div className="relative flex items-center justify-center space-x-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>PENDING</span>
          </div>
        </button>
        
        <button
          disabled={delivery.status === 'in_transit'}
          onClick={() => onUpdateStatus(delivery.id, 'in_transit')}
          className={`group relative overflow-hidden px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-sm hover:shadow-md ${
            delivery.status === 'in_transit'
              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-blue-200 cursor-not-allowed' 
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <div className="relative flex items-center justify-center space-x-1.5">
            <Truck className="h-3.5 w-3.5" />
            <span>IN TRANSIT</span>
          </div>
        </button>
        
        <button
          disabled={delivery.status === 'delivered'}
          onClick={() => onUpdateStatus(delivery.id, 'delivered')}
          className={`group relative overflow-hidden px-3 py-2 rounded-lg font-bold text-xs transition-all shadow-sm hover:shadow-md ${
            delivery.status === 'delivered'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-200 cursor-not-allowed' 
              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-green-300 hover:bg-green-50'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <div className="relative flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>DELIVERED</span>
          </div>
        </button>
      </div>
    </div>
  );
};
