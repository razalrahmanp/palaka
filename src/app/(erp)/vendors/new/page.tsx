'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { VendorForm } from '@/components/vendors/VendorForm';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VendorFormData {
  name: string;
  contact: string;
  email: string;
  address: string;
}

export default function NewVendorPage() {
  const router = useRouter();

  const handleSubmit = async (data: VendorFormData) => {
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create vendor');
      }

      router.push('/vendors');
    } catch (error) {
      console.error('Error creating vendor:', error);
      alert('Failed to create vendor. Please try again.');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Vendor</h1>
          <p className="text-gray-600 mt-1">Create a new vendor profile</p>
        </div>
      </div>

      <div className="flex justify-center">
        <VendorForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
