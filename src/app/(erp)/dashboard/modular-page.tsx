// Enhanced Comprehensive Dashboard - Full Screen Utilization
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { hasPermission } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChartContainer, 
  InventoryStatusChart, 
  ProductionEfficiencyChart, 
  AlertCard 
} from "@/components/dashboard/EnhancedComponents";
import { MyOrdersSection } from '@/components/sales/representative/MyOrdersSection';
import { ReturnsExchangesSection } from '@/components/sales/representative/ReturnsExchangesSection';
import { ComplaintsSection } from '@/components/sales/representative/ComplaintsSection';
import { SalesPerformanceSection } from '@/components/sales/representative/SalesPerformanceSection';
import EmployeeRankings from '@/components/sales/representative/EmployeeRankings';
import { getCurrentUser } from '@/lib/auth';
import { User, UserRole, Permission } from '@/types';
// Finance component import
import { DetailedFinanceOverview } from '@/components/finance/DetailedFinanceOverview';

interface SalesRepStats {
  totalRevenue: number;
  totalProfit: number;
  totalDiscounts: number;
  totalReturns: number;
  // Additional fields that might come from API
  total_orders?: number;
  pending_orders?: number;
  completed_orders?: number;
  total_revenue?: number;
  total_profit?: number;
  profit_margin?: number;
  total_discount_given?: number;
  pending_returns?: number;
  total_returns?: number;
  open_complaints?: number;
  monthly_achievement?: number;
  monthly_target?: number;
  conversion_rate?: number;
}

import { 
  IndianRupee, 
  Package, 
  AlertTriangle,
  TrendingUp,
  Factory,
  Truck,
  RefreshCw,
  Calendar,
  Download,
  Settings,
  BarChart3,
  Target,
  ShoppingCart,
  RotateCcw,
  MessageSquare,
  DollarSign,
  Percent,
  Users
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

export default function EnhancedModularDashboard() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Sales Representative Dashboard State
  const [salesRepActiveTab, setSalesRepActiveTab] = useState('orders');
  const [user, setUser] = useState<User | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [salesRepStats, setSalesRepStats] = useState<SalesRepStats | null>(null);
  const [salesRepLoading, setSalesRepLoading] = useState(false);

  // Finance State
  const [financeLoading, setFinanceLoading] = useState(false);

  // Data hooks
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPI } = useKPIData();
  const { data: operationalData, isLoading: operationalLoading } = useOperationalData();

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

  // Sales Representative Dashboard initialization
  const fetchFinancialData = useCallback(async () => {
    // Simple loading state for finance section
    try {
      setFinanceLoading(true);
      // DetailedFinanceOverview handles its own data fetching
      await new Promise(resolve => setTimeout(resolve, 500)); // Simple delay
    } catch (error) {
      console.error('Error with finance overview:', error);
    } finally {
      setFinanceLoading(false);
    }
  }, []);

  const fetchSalesRepStats = useCallback(async (employeeId: string) => {
    setSalesRepLoading(true);
    try {
      const response = await fetch(`/api/sales/representative/${employeeId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setSalesRepStats(data);
      }
    } catch (error) {
      console.error('Error fetching sales rep stats:', error);
    } finally {
      setSalesRepLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/sales/representatives');
      if (response.ok) {
        const data = await response.json();
        setEmployees(data || []);
        if (data && data.length > 0) {
          setSelectedEmployee(data[0].id);
          await fetchSalesRepStats(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  }, [fetchSalesRepStats]);

  const initializeSalesRepDashboard = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // Convert AuthUser to User type for state
        const userForState: User = {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role as UserRole, // Type conversion needed
          name: currentUser.email, // Use email as fallback for name
          password: '', // Not needed for display
          created_at: '', // Not needed for display
          permissions: currentUser.permissions as Permission[]
        };
        setUser(userForState);
        
        const adminPermissions = ['admin:all', 'sales:manage', 'dashboard:admin'];
        const userIsAdmin = adminPermissions.some(permission => hasPermission(permission)) || 
                           currentUser.role === 'System Administrator' || 
                           currentUser.role === 'Admin';
        setIsAdmin(userIsAdmin);
        
        if (userIsAdmin) {
          await fetchEmployees();
        }
        
        const employeeId = userIsAdmin ? null : currentUser.id;
        setSelectedEmployee(employeeId);
        
        if (employeeId) {
          await fetchSalesRepStats(employeeId);
        }
      }
    } catch (error) {
      console.error('Error initializing sales rep dashboard:', error);
    }
  }, [fetchEmployees, fetchSalesRepStats]);

  useEffect(() => {
    initializeSalesRepDashboard();
    fetchFinancialData();
  }, [initializeSalesRepDashboard, fetchFinancialData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

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

  const isLoading = kpiLoading || operationalLoading;

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
          {/* MTD Revenue Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 h-20">
            <CardContent className="p-3 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-medium text-blue-600">MTD Revenue</p>
                  <p className="text-lg font-bold text-blue-900">
                    {isLoading ? (
                      <div className="h-6 w-20 bg-blue-200 rounded animate-pulse"></div>
                    ) : (
                      `₹${(kpiData?.data?.mtdRevenue || 0).toLocaleString()}`
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Pipeline Card */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 h-20">
            <CardContent className="p-3 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-medium text-green-600">Quote Pipeline</p>
                  <p className="text-lg font-bold text-green-900">
                    {isLoading ? (
                      <div className="h-6 w-20 bg-green-200 rounded animate-pulse"></div>
                    ) : (
                      `₹${(kpiData?.data?.quotePipeline?.totalValue || 0).toLocaleString()}`
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Orders Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 h-20">
            <CardContent className="p-3 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-medium text-purple-600">Custom Orders</p>
                  <p className="text-lg font-bold text-purple-900">
                    {isLoading ? (
                      <div className="h-6 w-16 bg-purple-200 rounded animate-pulse"></div>
                    ) : (
                      `${kpiData?.data?.customOrdersPending || 0}`
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Factory className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Items Card */}
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 h-20">
            <CardContent className="p-3 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-medium text-red-600">Low Stock Items</p>
                  <p className="text-lg font-bold text-red-900">
                    {isLoading ? (
                      <div className="h-6 w-16 bg-red-200 rounded animate-pulse"></div>
                    ) : (
                      `${kpiData?.data?.lowStockItems || 0}`
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Open POs Card */}
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 h-20">
            <CardContent className="p-3 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-medium text-orange-600">Open POs</p>
                  <p className="text-lg font-bold text-orange-900">
                    {isLoading ? (
                      <div className="h-6 w-20 bg-orange-200 rounded animate-pulse"></div>
                    ) : (
                      `₹${(kpiData?.data?.openPurchaseOrders?.value || 0).toLocaleString()}`
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Package className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Rate Card */}
          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 h-20">
            <CardContent className="p-3 h-full">
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-xs font-medium text-teal-600">Delivery Rate</p>
                  <p className="text-lg font-bold text-teal-900">
                    {isLoading ? (
                      <div className="h-6 w-16 bg-teal-200 rounded animate-pulse"></div>
                    ) : (
                      `${(kpiData?.data?.onTimeDeliveryRate || 100).toFixed(1)}%`
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                  <Truck className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-white rounded-lg shadow-sm border min-h-[calc(100vh-300px)]">
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
                {financeLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-4 text-gray-600">Loading financial data...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Header
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Detailed Financial Overview</h2>
                        <p className="text-gray-600 mt-1">Comprehensive insights into your business performance</p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={fetchFinancialData}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </div>
                    </div> */}

                    {/* Detailed Finance Overview Component */}
                    <DetailedFinanceOverview />
                  </div>
                )}
              </TabsContent>

              {/* Sales Tab */}
              <TabsContent value="sales" className="mt-0">
                <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {/* Sales Representative Dashboard Header */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">Sales Representative Dashboard</h2>
                        <p className="text-gray-600 mt-1">
                          {isAdmin 
                            ? `Viewing sales data for ${employees.find((emp: User) => emp.id === selectedEmployee)?.email || 'selected employee'}`
                            : `Welcome back, ${user?.email}! Track your orders, customers, and performance.`
                          }
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={() => selectedEmployee && fetchSalesRepStats(selectedEmployee)}
                        disabled={salesRepLoading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${salesRepLoading ? 'animate-spin' : ''}`} />
                        Refresh Data
                      </Button>
                    </div>
                  </div>

                  {/* Employee Selector for Admin Users */}
                  {isAdmin && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Select Employee
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <select
                              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={selectedEmployee || ''}
                              title="Select Employee"
                              onChange={(e) => {
                                setSelectedEmployee(e.target.value);
                                if (e.target.value) {
                                  fetchSalesRepStats(e.target.value);
                                }
                              }}
                            >
                              <option value="">Select an employee...</option>
                              {employees
                                .sort((a, b) => {
                                  const nameA = a.name || a.email || '';
                                  const nameB = b.name || b.email || '';
                                  return nameA.localeCompare(nameB);
                                })
                                .map((employee: User) => (
                                  <option key={employee.id} value={employee.id}>
                                    {employee.name || 'No Name'} - {employee.email}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Stats Cards */}
                  {(salesRepStats || salesRepLoading || (selectedEmployee && isAdmin)) ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                      {/* Total Orders */}
                      <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-blue-100">Total Orders</CardTitle>
                          <ShoppingCart className="h-4 w-4 text-blue-200" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white">
                            {salesRepLoading ? (
                              <div className="h-8 w-16 bg-blue-400 rounded animate-pulse"></div>
                            ) : (
                              salesRepStats?.total_orders || 0
                            )}
                          </div>
                          <div className="flex items-center text-xs text-blue-100 mt-1">
                            <span>
                              {salesRepLoading ? '...' : `${salesRepStats?.pending_orders || 0} pending`}
                            </span>
                          </div>
                          <p className="text-xs text-blue-200 mt-1">
                            {salesRepLoading ? 'Loading...' : `${salesRepStats?.completed_orders || 0} completed`}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Total Revenue */}
                      <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-teal-100">Total Revenue</CardTitle>
                          <DollarSign className="h-4 w-4 text-teal-200" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white">
                            {salesRepLoading ? (
                              <div className="h-8 w-20 bg-teal-400 rounded animate-pulse"></div>
                            ) : (
                              formatCurrency(salesRepStats?.total_revenue || 0)
                            )}
                          </div>
                          <div className="flex items-center text-xs text-teal-100 mt-1">
                            <span>
                              {salesRepLoading ? 'Loading...' : `From ${salesRepStats?.total_orders || 0} orders`}
                            </span>
                          </div>
                          <p className="text-xs text-teal-200 mt-1">
                            {salesRepLoading ? '...' : `Average: ${formatCurrency((salesRepStats?.total_revenue || 0) / (salesRepStats?.total_orders || 1))}`}
                          </p>
                        </CardContent>
                      </Card>

                      {/* Total Profit */}
                      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-green-100">Total Profit</CardTitle>
                          <TrendingUp className="h-4 w-4 text-green-200" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white">
                            {salesRepLoading ? (
                              <div className="h-8 w-20 bg-green-400 rounded animate-pulse"></div>
                            ) : (
                              formatCurrency(salesRepStats?.total_profit || 0)
                            )}
                          </div>
                          <div className="flex items-center text-xs text-green-100 mt-1">
                            <span>
                              {salesRepLoading ? 'Loading...' : `${formatPercentage(salesRepStats?.profit_margin || 0)} margin`}
                            </span>
                          </div>
                          <p className="text-xs text-green-200 mt-1">
                            Revenue - Discounts = Profit
                          </p>
                        </CardContent>
                      </Card>

                      {/* Total Discount Given */}
                      <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-purple-100">Total Discount</CardTitle>
                          <Percent className="h-4 w-4 text-purple-200" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white">
                            {salesRepLoading ? (
                              <div className="h-8 w-20 bg-purple-400 rounded animate-pulse"></div>
                            ) : (
                              formatCurrency(salesRepStats?.total_discount_given || 0)
                            )}
                          </div>
                          <div className="flex items-center text-xs text-purple-100 mt-1">
                            <span>
                              {salesRepLoading ? 'Loading...' : `${formatPercentage((salesRepStats?.total_revenue || 0) > 0 ? ((salesRepStats?.total_discount_given || 0) / (salesRepStats?.total_revenue || 1)) * 100 : 0)} of revenue`}
                            </span>
                          </div>
                          <p className="text-xs text-purple-200 mt-1">
                            Total savings given to customers
                          </p>
                        </CardContent>
                      </Card>

                      {/* Returns & Issues */}
                      <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-orange-100">Returns & Issues</CardTitle>
                          <RotateCcw className="h-4 w-4 text-orange-200" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-white">
                            {salesRepLoading ? (
                              <div className="h-8 w-12 bg-orange-400 rounded animate-pulse"></div>
                            ) : (
                              salesRepStats?.pending_returns || 0
                            )}
                          </div>
                          <div className="flex items-center text-xs text-orange-100 mt-1">
                            <span>
                              {salesRepLoading ? 'Loading...' : `${salesRepStats?.total_returns || 0} total returns`}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-orange-200 mt-1">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            <span>
                              {salesRepLoading ? '...' : `${salesRepStats?.open_complaints || 0} open complaints`}
                            </span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Performance */}
                      <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium text-indigo-100">Monthly Performance</CardTitle>
                          <Target className="h-4 w-4 text-indigo-200" />
                        </CardHeader>
                        <CardContent>
                          {salesRepLoading ? (
                            <div className="space-y-2">
                              <div className="h-6 bg-indigo-400 rounded animate-pulse"></div>
                              <div className="h-3 bg-indigo-400 rounded animate-pulse"></div>
                              <div className="h-3 bg-indigo-400 rounded animate-pulse"></div>
                            </div>
                          ) : (
                            <>
                              <div className="text-2xl font-bold text-white">
                                {formatPercentage(salesRepStats?.monthly_achievement || 0)}
                              </div>
                              <div className="flex items-center text-xs text-indigo-100 mt-1">
                                <span>Target: {formatCurrency(salesRepStats?.monthly_target || 0)}</span>
                              </div>
                              <div className="flex items-center text-xs text-indigo-200 mt-1">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                <span>{formatPercentage(salesRepStats?.conversion_rate || 0)} conversion</span>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="bg-gray-50 rounded-lg p-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {isAdmin ? 'Select a Sales Representative' : 'Loading Sales Data...'}
                        </h3>
                        <p className="text-gray-600">
                          {isAdmin 
                            ? 'Choose a sales representative from the dropdown above to view their performance metrics and statistics.'
                            : 'Please wait while we load your sales performance data.'
                          }
                        </p>
                        {!isAdmin && (
                          <Button 
                            onClick={() => user?.id && fetchSalesRepStats(user.id)}
                            className="mt-4"
                            disabled={salesRepLoading}
                          >
                            {salesRepLoading ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Load My Data
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Employee Rankings Section */}
                  <EmployeeRankings />

                  {/* Main Content Tabs */}
                  <Card>
                    <CardContent className="p-0">
                      <Tabs value={salesRepActiveTab} onValueChange={setSalesRepActiveTab} className="w-full">
                        <div className="border-b px-6 pt-6">
                          <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="orders" className="flex items-center gap-2">
                              <ShoppingCart className="h-4 w-4" />
                              My Orders
                              {salesRepStats?.pending_orders && salesRepStats.pending_orders > 0 && (
                                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  {salesRepStats.pending_orders}
                                </span>
                              )}
                            </TabsTrigger>
                            <TabsTrigger value="returns" className="flex items-center gap-2">
                              <RotateCcw className="h-4 w-4" />
                              Returns/Exchanges
                              {salesRepStats?.pending_returns && salesRepStats.pending_returns > 0 && (
                                <span className="ml-1 px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded-full">
                                  {salesRepStats.pending_returns}
                                </span>
                              )}
                            </TabsTrigger>
                            <TabsTrigger value="complaints" className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Complaints
                              {salesRepStats?.open_complaints && salesRepStats.open_complaints > 0 && (
                                <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                                  {salesRepStats.open_complaints}
                                </span>
                              )}
                            </TabsTrigger>
                            <TabsTrigger value="performance" className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Performance
                            </TabsTrigger>
                          </TabsList>
                        </div>

                        <div className="p-6">
                          <TabsContent value="orders" className="mt-0">
                            {selectedEmployee && (
                              <MyOrdersSection 
                                userId={selectedEmployee} 
                                onRefresh={() => selectedEmployee && fetchSalesRepStats(selectedEmployee)}
                              />
                            )}
                          </TabsContent>

                          <TabsContent value="returns" className="mt-0">
                            {selectedEmployee && (
                              <ReturnsExchangesSection 
                                userId={selectedEmployee}
                                onRefresh={() => selectedEmployee && fetchSalesRepStats(selectedEmployee)}
                              />
                            )}
                          </TabsContent>

                          <TabsContent value="complaints" className="mt-0">
                            {selectedEmployee && (
                              <ComplaintsSection 
                                userId={selectedEmployee}
                                onRefresh={() => selectedEmployee && fetchSalesRepStats(selectedEmployee)}
                              />
                            )}
                          </TabsContent>

                          <TabsContent value="performance" className="mt-0">
                            {selectedEmployee && (
                              <SalesPerformanceSection 
                                userId={selectedEmployee}
                                onRefresh={() => selectedEmployee && fetchSalesRepStats(selectedEmployee)}
                              />
                            )}
                          </TabsContent>
                        </div>
                      </Tabs>
                    </CardContent>
                  </Card>
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
