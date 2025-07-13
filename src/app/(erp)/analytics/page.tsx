'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { QueryProvider } from '@/components/providers/QueryProvider'; // Import the provider
import SalesAnalytics from '@/components/analytics/SalesAnalytics';
import SupplierAnalytics from '@/components/analytics/SupplierAnalytics';
import InventoryAnalytics from '@/components/analytics/InventoryAnalytics';
import EmployeeAnalytics from '@/components/analytics/EmployeeAnalytics';
import ProductionAnalytics from '@/components/analytics/ProductionAnalytics';
import CustomerAnalytics from '@/components/analytics/CustomerAnalytics';
import ProjectAnalytics from '@/components/analytics/ProjectAnalytics';
import RiskAnalytics from '@/components/analytics/RiskAnalytics';
import ExecutiveDashboard from '@/components/analytics/ExecutiveDashboard';
import FinanceAnalytics from '@/components/analytics/FinancialAnalytics';

// Main component wrapped with the provider
function AnalyticsDashboard() {
  const [tab, setTab] = useState('executive');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:grid-cols-10">
          <TabsTrigger value="executive">Executive</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="executive"><ExecutiveDashboard /></TabsContent>
        <TabsContent value="sales"><SalesAnalytics /></TabsContent>
        <TabsContent value="suppliers"><SupplierAnalytics /></TabsContent>
        <TabsContent value="inventory"><InventoryAnalytics /></TabsContent>
        <TabsContent value="finance"><FinanceAnalytics /></TabsContent>
        <TabsContent value="employees"><EmployeeAnalytics /></TabsContent>
        <TabsContent value="production"><ProductionAnalytics /></TabsContent>
        <TabsContent value="customers"><CustomerAnalytics /></TabsContent>
        <TabsContent value="projects"><ProjectAnalytics /></TabsContent>
        <TabsContent value="risk"><RiskAnalytics /></TabsContent>
      </Tabs>
    </div>
  );
}


// Export the page with the QueryProvider wrapping the main component
export default function AnalyticsPage() {
    return (
        <QueryProvider>
            <AnalyticsDashboard />
        </QueryProvider>
    )
}
