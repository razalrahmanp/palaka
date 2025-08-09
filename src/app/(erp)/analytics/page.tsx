'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BarChart } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              Business Analytics
            </h1>
            <p className="text-gray-600 mt-2">Comprehensive insights and performance metrics</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <BarChart className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600">Real-time Data</span>
          </div>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 border-b border-violet-100/50">
            <TabsList className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl p-1 grid w-full grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-1">
              <TabsTrigger 
                value="executive"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs lg:text-sm"
              >
                Executive
              </TabsTrigger>
              <TabsTrigger 
                value="sales"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs lg:text-sm"
              >
                Sales
              </TabsTrigger>
              <TabsTrigger 
                value="suppliers"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs lg:text-sm"
              >
                Suppliers
              </TabsTrigger>
              <TabsTrigger 
                value="inventory"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs lg:text-sm"
              >
                Inventory
              </TabsTrigger>
              <TabsTrigger 
                value="finance"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs lg:text-sm"
              >
                Finance
              </TabsTrigger>
              <TabsTrigger 
                value="employees"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs lg:text-sm"
              >
                Employees
              </TabsTrigger>
              <TabsTrigger 
                value="production"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs lg:text-sm"
              >
                Production
              </TabsTrigger>
              <TabsTrigger 
                value="customers"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs lg:text-sm"
              >
                Customers
              </TabsTrigger>
              <TabsTrigger 
                value="projects"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs lg:text-sm"
              >
                Projects
              </TabsTrigger>
              <TabsTrigger 
                value="risk"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs lg:text-sm"
              >
                Risk
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="executive" className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Executive Dashboard</h2>
                <p className="text-gray-600">High-level business overview and key performance indicators</p>
              </div>
              <ExecutiveDashboard />
            </TabsContent>
            
            <TabsContent value="sales" className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Sales Analytics</h2>
                <p className="text-gray-600">Revenue trends, sales performance, and customer insights</p>
              </div>
              <SalesAnalytics />
            </TabsContent>
            
            <TabsContent value="suppliers" className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Supplier Analytics</h2>
                <p className="text-gray-600">Vendor performance, costs, and supply chain metrics</p>
              </div>
              <SupplierAnalytics />
            </TabsContent>
            
            <TabsContent value="inventory" className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Inventory Analytics</h2>
                <p className="text-gray-600">Stock levels, turnover rates, and optimization insights</p>
              </div>
              <InventoryAnalytics />
            </TabsContent>
            
            <TabsContent value="finance" className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Financial Analytics</h2>
                <p className="text-gray-600">Cash flow, profitability, and financial performance</p>
              </div>
              <FinanceAnalytics />
            </TabsContent>
            
            <TabsContent value="employees" className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Employee Analytics</h2>
                <p className="text-gray-600">Workforce metrics, productivity, and HR insights</p>
              </div>
              <EmployeeAnalytics />
            </TabsContent>
            
            <TabsContent value="production" className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Production Analytics</h2>
                <p className="text-gray-600">Manufacturing efficiency, capacity, and quality metrics</p>
              </div>
              <ProductionAnalytics />
            </TabsContent>
            
            <TabsContent value="customers" className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Customer Analytics</h2>
                <p className="text-gray-600">Customer behavior, satisfaction, and retention analysis</p>
              </div>
              <CustomerAnalytics />
            </TabsContent>
            
            <TabsContent value="projects" className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Project Analytics</h2>
                <p className="text-gray-600">Project performance, timelines, and resource utilization</p>
              </div>
              <ProjectAnalytics />
            </TabsContent>
            
            <TabsContent value="risk" className="mt-0">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Risk Analytics</h2>
                <p className="text-gray-600">Risk assessment, compliance, and mitigation strategies</p>
              </div>
              <RiskAnalytics />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// Export the page with the QueryProvider wrapping the main component
export default function AnalyticsPage() {
    return (
        <QueryProvider>
            <AnalyticsDashboard />
        </QueryProvider>
    );
}
