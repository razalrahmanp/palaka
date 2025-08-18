import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';

interface InventoryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VendorInventoryPage({ params }: InventoryPageProps) {
  const { id } = await params;
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Inventory</h1>
          <p className="text-gray-600">Manage inventory for vendor: {id}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">In Stock</p>
                  <p className="text-sm text-green-700">Items available</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-900">Low Stock</p>
                  <p className="text-sm text-yellow-700">Needs attention</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">Out of Stock</p>
                  <p className="text-sm text-red-700">Requires restocking</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Vendor inventory management coming soon</p>
            <Badge variant="secondary" className="mt-2">
              Under Development
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}