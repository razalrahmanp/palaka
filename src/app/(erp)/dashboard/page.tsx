"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/StatCard";
import { Charts } from "@/components/Charts";
import { hasPermission } from "@/lib/auth";
import { IndianRupee, ShoppingCart, TrendingUp, Warehouse, LucideProps } from "lucide-react";

// --- Data Fetching Functions ---
const fetchExecutiveData = async () => {
  const res = await fetch('/api/analytics/executive');
  if (!res.ok) throw new Error('Failed to fetch executive data');
  return res.json();
};

const fetchInventoryAlerts = async () => {
  const res = await fetch('/api/inventory/alerts');
  if (!res.ok) throw new Error('Failed to fetch inventory alerts');
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


export default function DashboardPage() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);

  // --- API Queries ---
  const { data: executiveData, isLoading: isLoadingExecutive } = useQuery({
    queryKey: ['executiveDashboardData'],
    queryFn: fetchExecutiveData,
    enabled: hasAccess,
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
  if (isLoadingExecutive || isLoadingInventory) return <p className="p-4">Loading Dashboard Data...</p>;

  // --- Data Transformation & Change Calculation ---
  let revenueChange: { change: string; changeType: 'increase' | 'decrease' | 'neutral' } = { change: 'No data', changeType: 'neutral' };
  if (executiveData?.salesTrends && executiveData.salesTrends.length >= 2) {
      const lastTwoSales = executiveData.salesTrends.slice(-2);
      revenueChange = calculateChange(lastTwoSales[1].sales, lastTwoSales[0].sales);
  }

  let profitChange: { change: string; changeType: 'increase' | 'decrease' | 'neutral' } = { change: 'No data', changeType: 'neutral' };
  if (executiveData?.profitVsExpenses && executiveData.profitVsExpenses.length >= 2) {
      const lastTwoProfits = executiveData.profitVsExpenses.slice(-2);
      profitChange = calculateChange(lastTwoProfits[1].profit, lastTwoProfits[0].profit);
  }

  const statsCardsData: StatCardData[] = executiveData ? [
    {
      title: "Total Sales",
      value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(executiveData.kpis.totalRevenue),
      icon: IndianRupee,
      ...revenueChange
    },
    {
      title: "Inventory Alerts",
      value: inventoryAlerts?.length || 0,
      change: "Items at or below reorder point",
      changeType: (inventoryAlerts?.length || 0) > 0 ? 'danger' : 'increase',
      icon: Warehouse,
    },
    {
      title: "Production Progress",
      value: `${executiveData.kpis.ordersFulfilled.toLocaleString()} Orders`,
      icon: TrendingUp,
      ...profitChange,
    },
    {
      title: "Delivery Rate",
      value: `${(executiveData.kpis.grossMargin * 100).toFixed(1)}% Margin`,
      change: "",
      changeType: "increase",
      icon: ShoppingCart,
    },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Executive Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Real-time business intelligence and key performance indicators</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600">Live Data</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsCardsData.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Analytics Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Business Intelligence & Analytics
          </h2>
          <p className="text-gray-600">Comprehensive view of business performance and trends</p>
        </div>
        <Charts
          profitVsExpenses={executiveData?.profitVsExpenses}
          salesTrends={executiveData?.salesTrends}
          topPerformers={executiveData?.topPerformers}
        />
      </div>
    </div>
  );
}
