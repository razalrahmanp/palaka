"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { Charts } from "@/components/Charts";
import { hasPermission } from "@/lib/auth";
import { 
  IndianRupee, 
  ShoppingCart, 
  TrendingUp, 
  Warehouse, 
  Users, 
  AlertTriangle,
  DollarSign,
  Package,
  LucideProps 
} from "lucide-react";

// --- Data Fetching Functions ---
const fetchExecutiveData = async () => {
  const res = await fetch('/api/analytics/executive');
  if (!res.ok) throw new Error('Failed to fetch executive data');
  return res.json();
};

const fetchComprehensiveAnalytics = async () => {
  const res = await fetch('/api/analytics/comprehensive?section=summary');
  if (!res.ok) throw new Error('Failed to fetch comprehensive analytics');
  return res.json();
};

const fetchInventoryAlerts = async () => {
  const res = await fetch('/api/inventory/alerts');
  if (!res.ok) {
    // If alerts endpoint doesn't exist, return empty array
    return [];
  }
  return res.json();
};

// --- Type Definitions ---
type IconComponent = React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;

interface StatCardData {
    title: string;
    value: string | number;
    change: string;
    changeType: 'increase' | 'decrease' | 'neutral' | 'danger';
    icon: IconComponent;
}

interface ExecutiveData {
  kpis: {
    totalRevenue: number;
    ordersFulfilled: number;
    grossMargin: number;
    activeCustomers: number;
    inventoryValue: number;
    cashFlow: number;
  };
  salesTrends: Array<{ date: string; sales: number; orders: number }>;
  profitVsExpenses: Array<{ month: string; profit: number; expenses: number }>;
  topPerformers: Array<{ name: string; revenue: number; category: string }>;
}

interface ComprehensiveAnalytics {
  summary: {
    revenue: {
      total: number;
      growth_rate: number;
      completed_orders: number;
    };
    inventory: {
      total_value: number;
      stockout_rate: number;
      total_products: number;
    };
    customers: {
      active: number;
      new_this_period: number;
    };
    financial: {
      cash_flow: number;
      bank_balance: number;
    };
  };
}

// Helper to calculate percentage change
const calculateChange = (current: number, previous: number): { change: string; changeType: 'increase' | 'decrease' | 'neutral' } => {
    if (previous === 0) {
        return { change: current > 0 ? '+100%' : 'No change', changeType: current > 0 ? 'increase' : 'neutral' };
    }
    const percentChange = ((current - previous) / previous) * 100;
    const changeType = percentChange >= 0 ? 'increase' : 'decrease';
    return {
        change: `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}% vs last month`,
        changeType,
    };
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function DashboardPage() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);

  // --- API Queries ---
  const { data: executiveData, isLoading: isLoadingExecutive, error: executiveError } = useQuery<ExecutiveData>({
    queryKey: ['executiveDashboardData'],
    queryFn: fetchExecutiveData,
    enabled: hasAccess,
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const { data: comprehensiveData, isLoading: isLoadingComprehensive } = useQuery<ComprehensiveAnalytics>({
    queryKey: ['comprehensiveAnalytics'],
    queryFn: fetchComprehensiveAnalytics,
    enabled: hasAccess,
    refetchInterval: 300000,
  });

  const { data: inventoryAlerts, isLoading: isLoadingInventory } = useQuery({
      queryKey: ['inventoryAlertsData'],
      queryFn: fetchInventoryAlerts,
      enabled: hasAccess,
  });

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

  if (!hasAccess) return <p className="p-4">Checking access...</p>;
  if (isLoadingExecutive || isLoadingComprehensive || isLoadingInventory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-gray-600">Loading Dashboard Analytics...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (executiveError) {
    console.error('Executive data error:', executiveError);
  }

  // --- Data Transformation & Change Calculation ---
  let revenueChange: { change: string; changeType: 'increase' | 'decrease' | 'neutral' } = { change: 'No data', changeType: 'neutral' };
  if (executiveData?.salesTrends && executiveData.salesTrends.length >= 2) {
      const lastTwoSales = executiveData.salesTrends.slice(-2);
      revenueChange = calculateChange(lastTwoSales[1].sales, lastTwoSales[0].sales);
  } else if (comprehensiveData?.summary?.revenue?.growth_rate !== undefined) {
      const growthRate = comprehensiveData.summary.revenue.growth_rate;
      revenueChange = {
        change: `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
        changeType: growthRate >= 0 ? 'increase' : 'decrease'
      };
  }

  // Use comprehensive data as fallback
  const totalRevenue = executiveData?.kpis?.totalRevenue || comprehensiveData?.summary?.revenue?.total || 0;
  const completedOrders = executiveData?.kpis?.ordersFulfilled || comprehensiveData?.summary?.revenue?.completed_orders || 0;
  const grossMargin = executiveData?.kpis?.grossMargin || 0;
  const activeCustomers = executiveData?.kpis?.activeCustomers || comprehensiveData?.summary?.customers?.active || 0;
  const inventoryValue = executiveData?.kpis?.inventoryValue || comprehensiveData?.summary?.inventory?.total_value || 0;
  const cashFlow = executiveData?.kpis?.cashFlow || comprehensiveData?.summary?.financial?.cash_flow || 0;

  const statsCardsData: StatCardData[] = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: IndianRupee,
      ...revenueChange
    },
    {
      title: "Orders Completed",
      value: `${completedOrders.toLocaleString()}`,
      change: `${activeCustomers} active customers`,
      changeType: completedOrders > 0 ? 'increase' : 'neutral',
      icon: ShoppingCart,
    },
    {
      title: "Inventory Value",
      value: formatCurrency(inventoryValue),
      change: `${(inventoryAlerts?.length || 0)} low stock alerts`,
      changeType: (inventoryAlerts?.length || 0) > 0 ? 'danger' : 'increase',
      icon: Warehouse,
    },
    {
      title: "Cash Flow",
      value: formatCurrency(cashFlow),
      change: `${grossMargin ? (grossMargin * 100).toFixed(1) : '0'}% gross margin`,
      changeType: cashFlow >= 0 ? 'increase' : 'decrease',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Al Rams Furniture - Executive Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Real-time business intelligence and key performance indicators</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-600">Live Analytics</span>
            </div>
            {(inventoryAlerts?.length || 0) > 0 && (
              <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">{inventoryAlerts.length} Alerts</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsCardsData.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Quick Insights */}
      {comprehensiveData?.summary && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Insights</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Customer Growth</p>
                <p className="text-lg font-bold text-blue-900">
                  +{comprehensiveData.summary.customers.new_this_period} new customers
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-green-600 font-medium">Bank Balance</p>
                <p className="text-lg font-bold text-green-900">
                  {formatCurrency(comprehensiveData.summary.financial.bank_balance)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg">
              <Package className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-purple-600 font-medium">Stock Health</p>
                <p className="text-lg font-bold text-purple-900">
                  {comprehensiveData.summary.inventory.stockout_rate.toFixed(1)}% stockout rate
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Business Intelligence & Analytics
          </h2>
          <p className="text-gray-600">Comprehensive view of business performance and trends</p>
        </div>
        
        {executiveData && (
          <Charts
            profitVsExpenses={executiveData.profitVsExpenses.map(item => ({
              name: item.month,
              profit: item.profit,
              expenses: item.expenses
            }))}
            salesTrends={executiveData.salesTrends.map(item => ({
              name: item.date,
              sales: item.sales
            }))}
            topPerformers={executiveData.topPerformers.map(item => ({
              name: item.name,
              value: item.revenue
            }))}
          />
        )}
        
        {!executiveData && (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Loading analytics data...</p>
          </div>
        )}
      </div>
    </div>
  );
}
