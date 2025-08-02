'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { VendorForm } from '@/components/vendors/VendorForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VendorFormData {
  name: string;
  contact: string;
  email: string;
  address: string;
}

interface Vendor extends VendorFormData {
  id: string;
  created_at: string;
  updated_at: string;
}

export default function EditVendorPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const response = await fetch(`/api/vendors/${vendorId}`);
        if (!response.ok) {
          throw new Error('Vendor not found');
        }
        const data = await response.json();
        setVendor(data);
      } catch (error) {
        console.error('Error fetching vendor:', error);
        router.push('/vendors');
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [vendorId, router]);

  const handleSubmit = async (data: VendorFormData) => {
    try {
      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update vendor');
      }

      router.push(`/vendors/${vendorId}`);
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Loading vendor...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Vendor not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Vendor</h1>
          <p className="text-gray-600 mt-1">Update vendor information</p>
        </div>
      </div>

      <div className="flex justify-center">
        <VendorForm
          initialData={vendor}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isEditing={true}
        />
      </div>
    </div>
  );
}
