'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasPermission } from '@/lib/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3,
  ShoppingCart,
  Package,
  Warehouse,
  Wallet,
  Users,
  Truck,
  Brain
} from 'lucide-react';

// Import department dashboards
import OverviewDashboard from '@/components/dashboard/OverviewDashboard';
import SalesDashboard from '@/components/dashboard/SalesDashboard';
import ProcurementDashboard from '@/components/dashboard/ProcurementDashboard';
import InventoryDashboard from '@/components/dashboard/InventoryDashboard';
import FinanceDashboard from '@/components/dashboard/FinanceDashboard';
import HRDashboard from '@/components/dashboard/HRDashboard';
import LogisticsDashboard from '@/components/dashboard/LogisticsDashboard';
import AIDashboard from '@/components/dashboard/AIDashboard';

export default function NextGenDashboard() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      router.replace('/login');
      return;
    }

    if (!hasPermission('dashboard:read')) {
      router.replace('/unauthorized');
    } else {
      setHasAccess(true);
    }
  }, [router]);

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center animated-gradient">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-lg text-gray-700 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 left-16 animated-gradient overflow-hidden">
      {/* Header Section with Integrated Tabs */}
      <div className="sticky top-0 z-10 glass-card border-b border-gray-200/50">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Palaka ERP Analytics
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Enterprise Intelligence Dashboard
            </p>
          </div>
        </div>

        {/* Tab Navigation - Attached to Header */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="glass-card w-full justify-start h-12 p-1 rounded-none border-t border-gray-200/50">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="sales"
              className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white"
            >
              <ShoppingCart className="h-4 w-4" />
              Sales
            </TabsTrigger>
            <TabsTrigger 
              value="procurement"
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              <Package className="h-4 w-4" />
              Procurement
            </TabsTrigger>
            <TabsTrigger 
              value="inventory"
              className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white"
            >
              <Warehouse className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger 
              value="finance"
              className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white"
            >
              <Wallet className="h-4 w-4" />
              Finance
            </TabsTrigger>
            <TabsTrigger 
              value="hr"
              className="flex items-center gap-2 data-[state=active]:bg-teal-500 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4" />
              HR
            </TabsTrigger>
            <TabsTrigger 
              value="logistics"
              className="flex items-center gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white"
            >
              <Truck className="h-4 w-4" />
              Logistics
            </TabsTrigger>
            <TabsTrigger 
              value="ai"
              className="flex items-center gap-2 data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              <Brain className="h-4 w-4" />
              AI Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content - Full Width */}
      <div className="h-[calc(100vh-144px)] overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          {/* Tab Content */}
          <div className="h-full">
            <TabsContent value="overview" className="h-full m-0 p-6">
              <OverviewDashboard />
            </TabsContent>
            
            <TabsContent value="sales" className="h-full m-0 p-6">
              <SalesDashboard />
            </TabsContent>

            <TabsContent value="procurement" className="h-full m-0 p-6">
              <ProcurementDashboard />
            </TabsContent>

            <TabsContent value="inventory" className="h-full m-0 p-6">
              <InventoryDashboard />
            </TabsContent>

            <TabsContent value="finance" className="h-full m-0 p-6">
              <FinanceDashboard />
            </TabsContent>

            <TabsContent value="hr" className="h-full m-0 p-6">
              <HRDashboard />
            </TabsContent>

            <TabsContent value="logistics" className="h-full m-0 p-6">
              <LogisticsDashboard />
            </TabsContent>

            <TabsContent value="ai" className="h-full m-0 p-6">
              <AIDashboard />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
