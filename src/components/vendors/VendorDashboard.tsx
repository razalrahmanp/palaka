'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VendorAnalytics } from './VendorAnalytics';
import { VendorComparison } from './VendorComparison';

export function VendorDashboard() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
          <TabsTrigger value="comparison">Vendor Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <VendorAnalytics />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <VendorComparison />
        </TabsContent>
      </Tabs>
    </div>
  );
}
