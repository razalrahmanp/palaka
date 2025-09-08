// Enhanced Comprehensive Dashboard - Full Screen Utilization
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { hasPermission } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  EnhancedKPICard, 
  ChartContainer, 
  RevenueTrendChart, 
  InventoryStatusChart, 
  ProductionEfficiencyChart, 
  AlertCard 
} from "@/components/dashboard/EnhancedComponents";
import { 
  IndianRupee, 
  Package, 
  AlertTriangle,
  TrendingUp,
  Factory,
  Truck,
  RefreshCw,
  Calendar,
  Filter,
  Download,
  Settings,
  BarChart3,
  Activity,
  Target
} from "lucide-react";

// Data fetching hooks
const useKPIData = () => {
  return useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/kpis');
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });
};

const useRevenueTrendData = () => {
  return useQuery({
    queryKey: ['dashboard-revenue-trend'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/revenue-trend');
      if (!response.ok) throw new Error('Failed to fetch revenue trend');
      return response.json();
    },
    refetchInterval: 10 * 60 * 1000,
  });
};

const useOperationalData = () => {
  return useQuery({
    queryKey: ['dashboard-operational'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/operational');
      if (!response.ok) throw new Error('Failed to fetch operational data');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });
};

const useAnalyticsData = () => {
  return useQuery({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: 15 * 60 * 1000,
  });
};

export default function EnhancedModularDashboard() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Data hooks
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPI } = useKPIData();
  const { data: revenueData, isLoading: revenueLoading } = useRevenueTrendData();
  const { data: operationalData, isLoading: operationalLoading } = useOperationalData();
  const { data: analyticsData, isLoading: analyticsLoading } = useAnalyticsData();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      router.replace("/login");
      return;
    }

    if (!hasPermission("dashboard:read")) {
      router.replace("/unauthorized");
    } else {
      setHasAccess(true);
    }
  }, [router]);

  const refreshAllData = () => {
    refetchKPI();
  };

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-lg text-gray-700 font-medium">Checking access...</p>
        </div>
      </div>
    );
  }

  const isLoading = kpiLoading || revenueLoading || operationalLoading || analyticsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200 px-6 py-4">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Palaka Furniture ERP
              </h1>
              <p className="text-sm text-gray-600">Executive Dashboard & Business Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={refreshAllData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              30D
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto p-6 space-y-6">
        {/* KPI Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <EnhancedKPICard
            title="MTD Revenue"
            value={kpiData?.data?.mtdRevenue || 0}
            change={12.5}
            icon={IndianRupee}
            format="currency"
            trend="up"
            description="Current month revenue"
            isLoading={kpiLoading}
          />
          <EnhancedKPICard
            title="Quote Pipeline"
            value={kpiData?.data?.quotePipeline?.totalValue || 0}
            change={8.3}
            icon={TrendingUp}
            format="currency"
            trend="up"
            description={`${kpiData?.data?.quotePipeline?.totalQuotes || 0} active quotes`}
            isLoading={kpiLoading}
          />
          <EnhancedKPICard
            title="Custom Orders"
            value={kpiData?.data?.customOrdersPending || 0}
            change={-2.1}
            icon={Factory}
            trend="down"
            description="Pending production"
            isLoading={kpiLoading}
          />
          <EnhancedKPICard
            title="Low Stock Items"
            value={kpiData?.data?.lowStockItems || 0}
            change={15.0}
            icon={AlertTriangle}
            trend="up"
            description="Requiring reorder"
            isLoading={kpiLoading}
          />
          <EnhancedKPICard
            title="Open POs"
            value={kpiData?.data?.openPurchaseOrders?.value || 0}
            change={5.2}
            icon={Package}
            format="currency"
            trend="up"
            description={`${kpiData?.data?.openPurchaseOrders?.count || 0} pending orders`}
            isLoading={kpiLoading}
          />
          <EnhancedKPICard
            title="Delivery Rate"
            value={kpiData?.data?.onTimeDeliveryRate || 100}
            change={-1.5}
            icon={Truck}
            format="percentage"
            trend="down"
            description="On-time delivery (7d)"
            isLoading={kpiLoading}
          />
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200 px-6 py-4">
              <TabsList className="bg-gray-100 p-1 rounded-lg w-full md:w-auto">
                <TabsTrigger value="overview" className="px-6 py-2">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="sales" className="px-6 py-2">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="operations" className="px-6 py-2">
                  <Factory className="h-4 w-4 mr-2" />
                  Operations
                </TabsTrigger>
                <TabsTrigger value="analytics" className="px-6 py-2">
                  <Target className="h-4 w-4 mr-2" />
                  Analytics
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Revenue Trend */}
                  <div className="lg:col-span-2">
                    <ChartContainer
                      title="Revenue Trend (12 Months)"
                      height={350}
                      actions={
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Filter className="h-4 w-4 mr-2" />
                            Filter
                          </Button>
                        </div>
                      }
                    >
                      <RevenueTrendChart 
                        data={revenueData?.data?.revenueTrend || []} 
                        isLoading={revenueLoading} 
                      />
                    </ChartContainer>
                  </div>

                  {/* Right Column - Quick Stats */}
                  <div className="space-y-6">
                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <Activity className="h-5 w-5 text-blue-600" />
                          <span>Quick Stats</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Avg Monthly Revenue</span>
                          <span className="font-semibold">₹{(revenueData?.data?.summary?.avgMonthlyRevenue || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Top Products Revenue</span>
                          <span className="font-semibold">₹{(revenueData?.data?.summary?.topProductRevenue || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Customers</span>
                          <span className="font-semibold">{analyticsData?.data?.customers?.summary?.totalCustomers || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Active Suppliers</span>
                          <span className="font-semibold">{analyticsData?.data?.suppliers?.summary?.totalSuppliers || 0}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <AlertCard
                      title="Inventory Alerts"
                      alerts={operationalData?.data?.inventory?.alerts?.slice(0, 5) || []}
                      type="warning"
                      isLoading={operationalLoading}
                    />
                  </div>
                </div>

                {/* Bottom Row - Additional Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <ChartContainer title="Inventory by Category" height={300}>
                    <InventoryStatusChart 
                      data={operationalData?.data?.inventory?.categories || []} 
                      isLoading={operationalLoading} 
                    />
                  </ChartContainer>

                  <ChartContainer title="Production Efficiency" height={300}>
                    <ProductionEfficiencyChart 
                      data={operationalData?.data?.production?.efficiency || []} 
                      isLoading={operationalLoading} 
                    />
                  </ChartContainer>
                </div>
              </TabsContent>

              {/* Sales Tab */}
              <TabsContent value="sales" className="mt-0">
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sales Analytics</h3>
                  <p className="text-gray-600">Advanced sales analytics coming soon...</p>
                </div>
              </TabsContent>

              {/* Operations Tab */}
              <TabsContent value="operations" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartContainer title="Production Efficiency Trend" height={350}>
                    <ProductionEfficiencyChart 
                      data={operationalData?.data?.production?.efficiency || []} 
                      isLoading={operationalLoading} 
                    />
                  </ChartContainer>

                  <ChartContainer title="Inventory Distribution" height={350}>
                    <InventoryStatusChart 
                      data={operationalData?.data?.inventory?.categories || []} 
                      isLoading={operationalLoading} 
                    />
                  </ChartContainer>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Production Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Work Orders</span>
                        <span className="font-semibold">{operationalData?.data?.production?.summary?.totalWorkOrders || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Completion Rate</span>
                        <span className="font-semibold">{operationalData?.data?.production?.summary?.avgCompletionRate || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Cycle Time</span>
                        <span className="font-semibold">{operationalData?.data?.production?.summary?.avgCycleTime || 0} days</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Inventory Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Value</span>
                        <span className="font-semibold">₹{(operationalData?.data?.inventory?.summary?.totalValue || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Quantity</span>
                        <span className="font-semibold">{(operationalData?.data?.inventory?.summary?.totalQuantity || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Active Alerts</span>
                        <span className="font-semibold text-red-600">{operationalData?.data?.inventory?.summary?.totalAlerts || 0}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <AlertCard
                    title="Critical Alerts"
                    alerts={operationalData?.data?.inventory?.alerts || []}
                    type="error"
                    isLoading={operationalLoading}
                  />
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="mt-0">
                <div className="text-center py-12">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
                  <p className="text-gray-600">Comprehensive analytics dashboard coming soon...</p>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
