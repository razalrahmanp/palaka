// Enhanced Comprehensive Dashboard - Full Screen Utilization
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { hasPermission } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DailyWalkInsComponent,
  DailyMoneyFlowComponent,
  CashBankBalanceComponent,
  DailySpendingComponent
} from "@/components/dashboard/WhatComesGoesComponents";
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
  TrendingUp,
  ArrowUpDown,
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
  Users,
  CreditCard,
  Building,
  Receipt,
  ArrowDownLeft
} from "lucide-react";

// Data fetching hooks
const useKPIData = (dateRange: { startDate: string; endDate: string }) => {
  return useQuery({
    queryKey: ['dashboard-kpis', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      const response = await fetch(`/api/dashboard/kpis?${params}`);
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
    enabled: !!dateRange.startDate && !!dateRange.endDate,
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

  // Date Filtering State
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Utility function to get date range based on filter
  const getDateRange = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0]
        };
      case 'month':
        // Fixed to October 2025 for consistency across all APIs
        return {
          startDate: '2025-10-01',
          endDate: '2025-10-31'
        };
      case 'custom':
        return {
          startDate: customStartDate || today.toISOString().split('T')[0],
          endDate: customEndDate || today.toISOString().split('T')[0]
        };
      default:
        return {
          startDate: '',
          endDate: ''
        };
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Data hooks
  const dateRange = getDateRange();
  const { data: kpiData, isLoading: kpiLoading, refetch: refetchKPI } = useKPIData(dateRange);
  // Operational data hook (keeping for potential future use)
  const { isLoading: operationalLoading } = useOperationalData();

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
              <p className="text-sm text-gray-600">
                Executive Dashboard & Business Intelligence
                {dateRange.startDate && dateRange.endDate && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {dateFilter === 'today' ? 'Today' :
                     dateFilter === 'week' ? 'This Week' :
                     dateFilter === 'month' ? 'This Month' :
                     `${dateRange.startDate} to ${dateRange.endDate}`}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Date Filter Controls */}
            <div className="flex items-center space-x-2 border rounded-lg p-1 bg-gray-50">
              <Button 
                variant={dateFilter === 'today' ? "default" : "ghost"} 
                size="sm"
                onClick={() => setDateFilter('today')}
                className="text-xs h-7"
              >
                Today
              </Button>
              <Button 
                variant={dateFilter === 'week' ? "default" : "ghost"} 
                size="sm"
                onClick={() => setDateFilter('week')}
                className="text-xs h-7"
              >
                Week
              </Button>
              <Button 
                variant={dateFilter === 'month' ? "default" : "ghost"} 
                size="sm"
                onClick={() => setDateFilter('month')}
                className="text-xs h-7"
              >
                Month
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant={dateFilter === 'custom' ? "default" : "ghost"} 
                    size="sm"
                    className="text-xs h-7"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Custom
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3">
                  <div className="space-y-3">
                    <h4 className="font-medium">Custom Date Range</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-sm font-medium">Start Date</label>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Date</label>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => setDateFilter('custom')}
                      disabled={!customStartDate || !customEndDate}
                      className="w-full"
                    >
                      Apply Custom Range
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Button variant="outline" size="sm" onClick={refreshAllData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
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
      <div className="max-w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6">
        {/* KPI Section - Two Rows Layout */}
        <div className="space-y-3 md:space-y-4">
          {/* First Row: Revenue, Profit, Gross Profit, Payment Collected */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Revenue (MTD) Card */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-blue-600 truncate">
                      Revenue (MTD)
                    </p>
                    <div className="text-sm sm:text-lg font-bold text-blue-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-blue-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.mtdRevenue || 0).toLocaleString()}`
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <IndianRupee className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profit (MTD) Card */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-green-600 truncate">
                      Profit (MTD)
                    </p>
                    <div className="text-sm sm:text-lg font-bold text-green-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-green-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.totalProfit || 0).toLocaleString()}`
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gross Profit (MTD) Card */}
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-indigo-600 truncate">
                      Gross Profit (MTD)
                    </p>
                    <div className="text-sm sm:text-lg font-bold text-indigo-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-indigo-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.grossProfit || 0).toLocaleString()}`
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Collected Card */}
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-emerald-600 truncate">Payment Collected</p>
                    <div className="text-sm sm:text-lg font-bold text-emerald-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-emerald-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.totalCollected || 0).toLocaleString()}`
                      )}
                    </div>
                    <div className="text-xs text-emerald-600 truncate">
                      {isLoading ? (
                        <div className="h-3 w-12 bg-emerald-200 rounded animate-pulse"></div>
                      ) : (
                        `${kpiData?.data?.collectionRate || 0}% collected`
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Second Row: Total Expenses, Outstanding, Vendor Payments, Withdrawals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Total Expenses (MTD) Card */}
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-amber-600 truncate">
                      Total Expenses (MTD)
                    </p>
                    <div className="text-sm sm:text-lg font-bold text-amber-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-amber-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.totalExpenses || 0).toLocaleString()}`
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outstanding Card */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-orange-600 truncate">Outstanding</p>
                    <div className="text-sm sm:text-lg font-bold text-orange-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-orange-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.totalOutstanding || 0).toLocaleString()}`
                      )}
                    </div>
                    <p className="text-xs text-orange-600 truncate">
                      Revenue - Collected
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendor Payments Card */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-red-600 truncate">Vendor Payments</p>
                    <div className="text-sm sm:text-lg font-bold text-red-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-red-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.vendorPayments || 0).toLocaleString()}`
                      )}
                    </div>
                    <p className="text-xs text-red-600 truncate">
                      COGS (MTD)
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <Building className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Withdrawals (MTD) Card */}
            <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-violet-600 truncate">
                      Withdrawals (MTD)
                    </p>
                    <div className="text-sm sm:text-lg font-bold text-violet-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-12 sm:w-16 bg-violet-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.withdrawalsTotal || 0).toLocaleString()}`
                      )}
                    </div>
                    <p className="text-xs text-violet-600 truncate">
                      {isLoading ? (
                        <div className="h-3 w-12 bg-violet-200 rounded animate-pulse"></div>
                      ) : (
                        `${kpiData?.data?.withdrawalsCount || 0} transactions`
                      )}
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  What Comes & Goes
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

              {/* What Comes & Goes Tab */}
              <TabsContent value="operations" className="mt-0">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="bg-white rounded-lg shadow-sm p-6 border">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">What Comes & Goes</h2>
                    <p className="text-gray-600">Track daily walk-ins, money flow, available funds, and spending patterns</p>
                  </div>

                  {/* First Row: Walk-ins and Money Flow */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DailyWalkInsComponent startDate={dateRange.startDate} endDate={dateRange.endDate} />
                    <DailyMoneyFlowComponent startDate={dateRange.startDate} endDate={dateRange.endDate} />
                  </div>

                  {/* Second Row: Cash/Bank and Spending */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CashBankBalanceComponent startDate={dateRange.startDate} endDate={dateRange.endDate} />
                    <DailySpendingComponent startDate={dateRange.startDate} endDate={dateRange.endDate} />
                  </div>
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="mt-0">
                <div className="space-y-6">
                  {/* Header */}
                  <div className="bg-white rounded-lg shadow-sm p-6 border">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Advanced Analytics</h2>
                    <p className="text-gray-600">Deep insights into business performance, trends, and opportunities</p>
                  </div>

                  {/* Quick Analytics Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500 rounded-lg">
                            <BarChart3 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-blue-600 font-medium">Revenue Growth</p>
                            <p className="text-lg font-bold text-blue-900">+15.2%</p>
                            <p className="text-xs text-blue-600">vs last month</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-green-600 font-medium">Profit Margin</p>
                            <p className="text-lg font-bold text-green-900">28.5%</p>
                            <p className="text-xs text-green-600">industry avg: 22%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500 rounded-lg">
                            <Users className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-purple-600 font-medium">Customer Retention</p>
                            <p className="text-lg font-bold text-purple-900">87.3%</p>
                            <p className="text-xs text-purple-600">+2.1% this quarter</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-500 rounded-lg">
                            <Target className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-orange-600 font-medium">Sales Efficiency</p>
                            <p className="text-lg font-bold text-orange-900">94.1%</p>
                            <p className="text-xs text-orange-600">target achievement</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Analytics Features */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Business Intelligence Tools
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold mb-2">Sales Forecasting</h4>
                            <p className="text-sm text-gray-600">AI-powered predictions for next quarter revenue and seasonal trends</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold mb-2">Customer Segmentation</h4>
                            <p className="text-sm text-gray-600">Advanced customer analytics with behavioral patterns and lifetime value</p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-semibold mb-2">Product Performance</h4>
                            <p className="text-sm text-gray-600">Deep dive into product profitability, inventory turnover, and demand patterns</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Key Performance Indicators
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span className="font-medium">Monthly Recurring Revenue</span>
                            <span className="text-blue-600 font-bold">₹18.5L</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="font-medium">Customer Acquisition Cost</span>
                            <span className="text-green-600 font-bold">₹2,450</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                            <span className="font-medium">Average Order Value</span>
                            <span className="text-purple-600 font-bold">₹12,300</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                            <span className="font-medium">Inventory Turnover Ratio</span>
                            <span className="text-orange-600 font-bold">8.2x</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Future Enhancements */}
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Coming Soon
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4">
                          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <BarChart3 className="h-6 w-6 text-white" />
                          </div>
                          <h4 className="font-semibold mb-2">Interactive Dashboards</h4>
                          <p className="text-sm text-gray-600">Drag-and-drop customizable analytics widgets</p>
                        </div>
                        <div className="text-center p-4">
                          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <TrendingUp className="h-6 w-6 text-white" />
                          </div>
                          <h4 className="font-semibold mb-2">Predictive Analytics</h4>
                          <p className="text-sm text-gray-600">Machine learning models for business forecasting</p>
                        </div>
                        <div className="text-center p-4">
                          <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <Target className="h-6 w-6 text-white" />
                          </div>
                          <h4 className="font-semibold mb-2">Advanced Reports</h4>
                          <p className="text-sm text-gray-600">Automated report generation and insights</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
