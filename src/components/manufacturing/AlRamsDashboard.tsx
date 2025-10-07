'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Package, TrendingUp, ShoppingCart, AlertCircle } from 'lucide-react';
import { AlRamsPurchaseOrders } from './AlRamsPurchaseOrders';
import { AlRamsInventory } from './AlRamsInventory';
import { AlRamsSalesReport } from './AlRamsSalesReport';

interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
  created_at: string;
}

export function AlRamsDashboard() {
  const [alRamsSupplier, setAlRamsSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('purchase-orders');
  const [error, setError] = useState<string | null>(null);

  const fetchAlRamsSupplier = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/vendors');
      const data = await response.json();
      
      if (data.success && data.vendors) {
        // Find Al Rams supplier (case-insensitive search)
        const alRamsVendor = data.vendors.find((vendor: Supplier) => 
          vendor.name.toLowerCase().includes('al rams') || 
          vendor.name.toLowerCase().includes('alrams') ||
          vendor.name.toLowerCase().includes('al-rams')
        );
        
        if (alRamsVendor) {
          setAlRamsSupplier(alRamsVendor);
        } else {
          setError('Al Rams supplier not found in the system. Please ensure Al Rams is added as a supplier.');
        }
      } else {
        setError('Failed to fetch suppliers from the system.');
      }
    } catch (error) {
      console.error('Error fetching Al Rams supplier:', error);
      setError('An error occurred while fetching supplier data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlRamsSupplier();
  }, [fetchAlRamsSupplier]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Loading Al Rams data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-center">
            <div>
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-800 mb-2">Al Rams Supplier Not Found</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <div className="bg-red-100 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                <p className="font-medium mb-2">To resolve this issue:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Go to Vendors/Suppliers management</li>
                  <li>Add &quot;Al Rams&quot; as a supplier</li>
                  <li>Ensure the name contains &quot;Al Rams&quot; or &quot;AlRams&quot;</li>
                  <li>Refresh this page after adding the supplier</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!alRamsSupplier) {
    return (
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-6">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-800">Al Rams Supplier Not Found</h3>
            <p className="text-yellow-600">Please add Al Rams as a supplier to view the dashboard.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Al Rams Supplier Info Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-100 border-0 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {alRamsSupplier.name}
                  <Badge className="bg-green-100 text-green-800 border-green-200">Own Supplier</Badge>
                </CardTitle>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  {alRamsSupplier.contact && (
                    <span>📞 {alRamsSupplier.contact}</span>
                  )}
                  {alRamsSupplier.email && (
                    <span>📧 {alRamsSupplier.email}</span>
                  )}
                  <span>📅 Since {new Date(alRamsSupplier.created_at).toLocaleDateString()}</span>
                </div>
                {alRamsSupplier.address && (
                  <p className="text-sm text-gray-600 mt-1">📍 {alRamsSupplier.address}</p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabbed Dashboard */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 pt-6">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-white/50 backdrop-blur-sm">
                <TabsTrigger 
                  value="purchase-orders" 
                  className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-blue-500 transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Purchase Orders</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="inventory" 
                  className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-green-500 transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Inventory</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="sales-report" 
                  className="text-sm font-medium h-full data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-purple-500 transition-all duration-200"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Sales Report</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="purchase-orders" className="mt-0">
                <AlRamsPurchaseOrders alRamsId={alRamsSupplier.id} />
              </TabsContent>

              <TabsContent value="inventory" className="mt-0">
                <AlRamsInventory alRamsId={alRamsSupplier.id} />
              </TabsContent>

              <TabsContent value="sales-report" className="mt-0">
                <AlRamsSalesReport alRamsId={alRamsSupplier.id} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}