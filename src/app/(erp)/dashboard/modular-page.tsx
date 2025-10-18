// Enhanced Comprehensive Dashboard - Full Screen Utilization
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { hasPermission } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

// import { getCurrentUser } from '@/lib/auth';
// import { User, UserRole, Permission } from '@/types';
// Finance component import
import DashboardCharts from "@/components/dashboard/DashboardCharts";

import { 
  IndianRupee, 
  TrendingUp,
  RefreshCw,
  Calendar,
  ChevronDown,
  DollarSign,
  CreditCard,
  Receipt,
  ArrowDownLeft,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Activity,
  Plus,
  Minus,
  Equal
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

  // Date Filtering State - Default to This Month
  type DateFilter = 
    | 'today' 
    | 'this_week' 
    | 'this_month' 
    | 'last_month'
    | 'week_1' | 'week_2' | 'week_3' | 'week_4' | 'week_5'
    | 'jan' | 'feb' | 'mar' | 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec'
    | 'quarter_1' | 'quarter_2' | 'quarter_3' | 'quarter_4'
    | 'half_1' | 'half_2'
    | 'this_year'
    | 'all_time'
    | 'custom';

  const DATE_FILTER_LABELS: Record<DateFilter, string> = {
    today: 'Today',
    this_week: 'This Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    week_1: 'Week 1 (1-7)',
    week_2: 'Week 2 (8-14)',
    week_3: 'Week 3 (15-21)',
    week_4: 'Week 4 (22-28)',
    week_5: 'Week 5 (29+)',
    jan: 'January',
    feb: 'February',
    mar: 'March',
    apr: 'April',
    may: 'May',
    jun: 'June',
    jul: 'July',
    aug: 'August',
    sep: 'September',
    oct: 'October',
    nov: 'November',
    dec: 'December',
    quarter_1: 'Q1 (Jan-Mar)',
    quarter_2: 'Q2 (Apr-Jun)',
    quarter_3: 'Q3 (Jul-Sep)',
    quarter_4: 'Q4 (Oct-Dec)',
    half_1: 'H1 (Jan-Jun)',
    half_2: 'H2 (Jul-Dec)',
    this_year: 'This Year',
    all_time: 'All Time',
    custom: 'Custom Range',
  };

  const [dateFilter, setDateFilter] = useState<DateFilter>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Chart visibility state - Default to showing Revenue & Profit chart
  const [showCharts, setShowCharts] = useState(true);
  const [selectedChart, setSelectedChart] = useState<'revenue' | 'expense' | 'collection' | 'withdrawals' | 'cogs' | null>('revenue');
  const [isHoveringButton, setIsHoveringButton] = useState(false);

  // Utility function to get date range based on filter
  const getDateRange = useCallback(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    
    switch (dateFilter) {
      case 'today': {
        const today = formatDate(now);
        return { startDate: today, endDate: today };
      }
      case 'this_week': {
        const dayOfWeek = now.getDay();
        const monday = new Date(year, month, day - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        const sunday = new Date(year, month, day + (7 - dayOfWeek));
        return { startDate: formatDate(monday), endDate: formatDate(sunday) };
      }
      case 'this_month': {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
      }
      case 'last_month': {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        return { startDate: formatDate(firstDay), endDate: formatDate(lastDay) };
      }
      // Weekly ranges (assuming month starts on 1st)
      case 'week_1': {
        return { startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`, endDate: `${year}-${String(month + 1).padStart(2, '0')}-07` };
      }
      case 'week_2': {
        return { startDate: `${year}-${String(month + 1).padStart(2, '0')}-08`, endDate: `${year}-${String(month + 1).padStart(2, '0')}-14` };
      }
      case 'week_3': {
        return { startDate: `${year}-${String(month + 1).padStart(2, '0')}-15`, endDate: `${year}-${String(month + 1).padStart(2, '0')}-21` };
      }
      case 'week_4': {
        return { startDate: `${year}-${String(month + 1).padStart(2, '0')}-22`, endDate: `${year}-${String(month + 1).padStart(2, '0')}-28` };
      }
      case 'week_5': {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return { startDate: `${year}-${String(month + 1).padStart(2, '0')}-29`, endDate: `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}` };
      }
      // Monthly ranges
      case 'jan': return { startDate: `${year}-01-01`, endDate: `${year}-01-31` };
      case 'feb': {
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        return { startDate: `${year}-02-01`, endDate: `${year}-02-${isLeap ? '29' : '28'}` };
      }
      case 'mar': return { startDate: `${year}-03-01`, endDate: `${year}-03-31` };
      case 'apr': return { startDate: `${year}-04-01`, endDate: `${year}-04-30` };
      case 'may': return { startDate: `${year}-05-01`, endDate: `${year}-05-31` };
      case 'jun': return { startDate: `${year}-06-01`, endDate: `${year}-06-30` };
      case 'jul': return { startDate: `${year}-07-01`, endDate: `${year}-07-31` };
      case 'aug': return { startDate: `${year}-08-01`, endDate: `${year}-08-31` };
      case 'sep': return { startDate: `${year}-09-01`, endDate: `${year}-09-30` };
      case 'oct': return { startDate: `${year}-10-01`, endDate: `${year}-10-31` };
      case 'nov': return { startDate: `${year}-11-01`, endDate: `${year}-11-30` };
      case 'dec': return { startDate: `${year}-12-01`, endDate: `${year}-12-31` };
      // Quarters
      case 'quarter_1': return { startDate: `${year}-01-01`, endDate: `${year}-03-31` };
      case 'quarter_2': return { startDate: `${year}-04-01`, endDate: `${year}-06-30` };
      case 'quarter_3': return { startDate: `${year}-07-01`, endDate: `${year}-09-30` };
      case 'quarter_4': return { startDate: `${year}-10-01`, endDate: `${year}-12-31` };
      // Half yearly
      case 'half_1': return { startDate: `${year}-01-01`, endDate: `${year}-06-30` };
      case 'half_2': return { startDate: `${year}-07-01`, endDate: `${year}-12-31` };
      // Year
      case 'this_year': return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
      // All time
      case 'all_time': return { startDate: '2020-01-01', endDate: formatDate(now) };
      case 'custom': {
        return {
          startDate: customStartDate || formatDate(now),
          endDate: customEndDate || formatDate(now)
        };
      }
      default:
        return { startDate: '', endDate: '' };
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Data hooks
  const dateRange = getDateRange();
  
  // Debug logging to show exact dates being used
  console.log('🗓️ Dashboard Date Filter Debug:', {
    selectedFilter: dateFilter,
    calculatedDateRange: dateRange,
    currentDate: new Date().toISOString().split('T')[0],
    apiUrl: `/api/dashboard/kpis?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
  });
  
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
    <div className="fixed inset-0 left-16 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-200 pl-4 pr-6 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Palaka Furniture ERP
              </h1>
              <p className="text-sm text-gray-600">
                Executive Dashboard & Business Intelligence
                {dateRange.startDate && dateRange.endDate && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {DATE_FILTER_LABELS[dateFilter]}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Date Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs border-blue-300 hover:bg-blue-50">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  {DATE_FILTER_LABELS[dateFilter]}
                  <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">Quick Select</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setDateFilter('today')} className="text-xs">
                  Today
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateFilter('this_week')} className="text-xs">
                  This Week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateFilter('this_month')} className="text-xs">
                  This Month
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDateFilter('last_month')} className="text-xs">
                  Last Month
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Weekly Breakdown */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    Week (Monthly Base)
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setDateFilter('week_1')} className="text-xs">
                      Week 1 (1-7)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('week_2')} className="text-xs">
                      Week 2 (8-14)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('week_3')} className="text-xs">
                      Week 3 (15-21)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('week_4')} className="text-xs">
                      Week 4 (22-28)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('week_5')} className="text-xs">
                      Week 5 (29+)
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                {/* Monthly Breakdown */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    Month (Jan-Dec)
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                    <DropdownMenuItem onClick={() => setDateFilter('jan')} className="text-xs">January</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('feb')} className="text-xs">February</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('mar')} className="text-xs">March</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('apr')} className="text-xs">April</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('may')} className="text-xs">May</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('jun')} className="text-xs">June</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('jul')} className="text-xs">July</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('aug')} className="text-xs">August</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('sep')} className="text-xs">September</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('oct')} className="text-xs">October</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('nov')} className="text-xs">November</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('dec')} className="text-xs">December</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                {/* Yearly Breakdown */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="text-xs">
                    All Time Options
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setDateFilter('quarter_1')} className="text-xs">
                      Q1 (Jan-Mar)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('quarter_2')} className="text-xs">
                      Q2 (Apr-Jun)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('quarter_3')} className="text-xs">
                      Q3 (Jul-Sep)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('quarter_4')} className="text-xs">
                      Q4 (Oct-Dec)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDateFilter('half_1')} className="text-xs">
                      H1 (Jan-Jun)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateFilter('half_2')} className="text-xs">
                      H2 (Jul-Dec)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDateFilter('this_year')} className="text-xs">
                      This Year
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDateFilter('all_time')} className="text-xs font-semibold">
                  All Time
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Custom Date Range */}
                <Popover>
                  <PopoverTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-xs">
                      <Calendar className="h-3 w-3 mr-2" />
                      Custom Range...
                    </DropdownMenuItem>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-3" align="end" side="right">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Custom Date Range</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs font-medium">Start Date</label>
                          <Input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="mt-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">End Date</label>
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="mt-1 text-xs"
                          />
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => setDateFilter('custom')}
                        disabled={!customStartDate || !customEndDate}
                        className="w-full text-xs"
                      >
                        Apply Custom Range
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh Button */}
            <Button variant="outline" size="sm" onClick={refreshAllData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-65px-85px-8px)] overflow-hidden">
        {/* Main Grid Layout: Adjusts based on chart visibility */}
        <div className={`grid grid-cols-1 h-full ${showCharts ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
          {/* Left Section - All KPI Cards in 2 columns */}
          <div className={`${showCharts ? 'lg:col-span-1' : 'lg:col-span-1 max-w-6xl mx-auto'} px-3 overflow-y-auto`}>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* 1. Revenue (MTD) Card */}
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

            {/* 2. Gross Profit (MTD) Card */}
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

            {/* 3. Total Collected Card */}
            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-teal-600 truncate">Total Collected</p>
                    <div className="text-sm sm:text-lg font-bold text-teal-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-teal-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.totalCollected || 0).toLocaleString()}`
                      )}
                    </div>
                    <p className="text-xs text-teal-600 truncate">
                      From total sales orders
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Total Pending Card */}
            <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-rose-600 truncate">Total Pending</p>
                    <div className="text-sm sm:text-lg font-bold text-rose-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-rose-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.totalOutstanding || 0).toLocaleString()}`
                      )}
                    </div>
                    <p className="text-xs text-rose-600 truncate">
                      Outstanding from all orders
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 5. Delivered - Collected Card */}
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-emerald-600 truncate">Delivered - Collected</p>
                    <div className="text-sm sm:text-lg font-bold text-emerald-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-emerald-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.deliveredCollected || 0).toLocaleString()}`
                      )}
                    </div>
                    <div className="text-xs text-emerald-600 truncate">
                      {isLoading ? (
                        <div className="h-3 w-12 bg-emerald-200 rounded animate-pulse"></div>
                      ) : (
                        `${kpiData?.data?.deliveredCollectionRate || 0}% from delivered`
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 6. Delivered - Pending Card */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-orange-600 truncate">Delivered - Pending</p>
                    <div className="text-sm sm:text-lg font-bold text-orange-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-orange-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${(kpiData?.data?.deliveredPending || 0).toLocaleString()}`
                      )}
                    </div>
                    <p className="text-xs text-orange-600 truncate">
                      From delivered orders
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 7. Profit (MTD) Card */}
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

            {/* 8. Total Expenses (MTD) Card */}
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

            {/* 9. COGS Card */}
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 h-20 sm:h-24">
              <CardContent className="p-2 sm:p-3 h-full">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-red-600 truncate">COGS</p>
                    <div className="text-sm sm:text-lg font-bold text-red-900 truncate">
                      {isLoading ? (
                        <div className="h-4 sm:h-6 w-16 sm:w-20 bg-red-200 rounded animate-pulse"></div>
                      ) : (
                        `₹${((kpiData?.data?.mtdRevenue || 0) - (kpiData?.data?.grossProfit || 0)).toLocaleString()}`
                      )}
                    </div>
                    <p className="text-xs text-red-600 truncate">
                      Cost of Goods Sold
                    </p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 10. Withdrawals (MTD) Card */}
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
                    <div className="text-xs text-violet-600 truncate">
                      {isLoading ? (
                        <div className="h-3 w-12 bg-violet-200 rounded animate-pulse"></div>
                      ) : (
                        `${kpiData?.data?.withdrawalsCount || 0} transactions`
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-violet-500 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                    <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Right Section - Dashboard Charts (2/3) - Conditionally Rendered */}
          {showCharts && (
            <div className="lg:col-span-2 pr-3 overflow-y-auto">
              <DashboardCharts kpiData={kpiData?.data || null} selectedChart={selectedChart} />
            </div>
          )}
        </div>
      </div>

      {/* COGS Breakdown Stat Cards - Fixed Bottom Section */}
      <div className="absolute bottom-12 left-0 right-0 h-[85px] bg-gradient-to-r from-indigo-50 to-purple-50 px-3 pt-0 pb-1 flex flex-col rounded-t-lg shadow-lg">
        <h3 className="text-xs font-semibold text-gray-900 mb-0.5 flex items-center gap-1.5">
          <DollarSign className="h-3 w-3 text-indigo-600" />
          Gross Profit Calculation
        </h3>
        <div className="flex items-center justify-center gap-1.5 flex-1">
          {/* 1. Opening Stock */}
          <Card className="bg-gradient-to-br from-blue-100 to-blue-50 border-blue-300 border-2 flex-1 h-full">
            <CardContent className="p-1.5 h-full flex flex-col justify-center">
              <p className="text-[10px] font-semibold text-blue-700 leading-tight">Opening Stock</p>
              <div className="text-sm font-bold text-blue-900 truncate my-0.5">
                {isLoading ? (
                  <div className="h-4 w-16 bg-blue-200 rounded animate-pulse"></div>
                ) : (
                  `₹${(kpiData?.data?.cogsBreakdown?.openingStock || 0).toLocaleString()}`
                )}
              </div>
              <p className="text-[9px] text-blue-600 leading-tight">Start inventory</p>
            </CardContent>
          </Card>

          {/* Plus Sign */}
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-200 border-2 border-green-400 flex-shrink-0">
            <Plus className="h-4 w-4 text-green-700 font-bold" />
          </div>

          {/* 2. Purchases (Net) */}
          <Card className="bg-gradient-to-br from-green-100 to-green-50 border-green-300 border-2 flex-1 h-full">
            <CardContent className="p-1.5 h-full flex flex-col justify-center">
              <p className="text-[10px] font-semibold text-green-700 leading-tight">Purchases (Net)</p>
              <div className="text-sm font-bold text-green-900 truncate my-0.5">
                {isLoading ? (
                  <div className="h-4 w-16 bg-green-200 rounded animate-pulse"></div>
                ) : (
                  `₹${(kpiData?.data?.cogsBreakdown?.purchases || 0).toLocaleString()}`
                )}
              </div>
              <p className="text-[9px] text-green-600 leading-tight">Purchase - Return</p>
            </CardContent>
          </Card>

          {/* Minus Sign */}
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-200 border-2 border-orange-400 flex-shrink-0">
            <Minus className="h-4 w-4 text-orange-700 font-bold" />
          </div>

          {/* 3. Sales (Net) */}
          <Card className="bg-gradient-to-br from-orange-100 to-orange-50 border-orange-300 border-2 flex-1 h-full">
            <CardContent className="p-1.5 h-full flex flex-col justify-center">
              <p className="text-[10px] font-semibold text-orange-700 leading-tight">Sales (Net)</p>
              <div className="text-sm font-bold text-orange-900 truncate my-0.5">
                {isLoading ? (
                  <div className="h-4 w-16 bg-orange-200 rounded animate-pulse"></div>
                ) : (
                  `₹${(kpiData?.data?.mtdRevenue || 0).toLocaleString()}`
                )}
              </div>
              <p className="text-[9px] text-orange-600 leading-tight">Total Revenue</p>
            </CardContent>
          </Card>

          {/* Minus Sign */}
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-200 border-2 border-red-400 flex-shrink-0">
            <Minus className="h-4 w-4 text-red-700 font-bold" />
          </div>

          {/* 4. Closing Stock */}
          <Card className="bg-gradient-to-br from-red-100 to-red-50 border-red-300 border-2 flex-1 h-full">
            <CardContent className="p-1.5 h-full flex flex-col justify-center">
              <p className="text-[10px] font-semibold text-red-700 leading-tight">Closing Stock</p>
              <div className="text-sm font-bold text-red-900 truncate my-0.5">
                {isLoading ? (
                  <div className="h-4 w-16 bg-red-200 rounded animate-pulse"></div>
                ) : (
                  `₹${(kpiData?.data?.cogsBreakdown?.closingStock || 0).toLocaleString()}`
                )}
              </div>
              <p className="text-[9px] text-red-600 leading-tight">End inventory</p>
            </CardContent>
          </Card>

          {/* Equal Sign */}
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-200 border-2 border-indigo-400 flex-shrink-0">
            <Equal className="h-4 w-4 text-indigo-700 font-bold" />
          </div>

          {/* 5. Gross Profit (Result) */}
          <Card className="bg-gradient-to-br from-indigo-100 to-indigo-50 border-indigo-300 border-2 flex-1 h-full">
            <CardContent className="p-1.5 h-full flex flex-col justify-center">
              <p className="text-[10px] font-semibold text-indigo-700 leading-tight">Gross Profit</p>
              <div className="text-sm font-bold text-indigo-900 truncate my-0.5">
                {isLoading ? (
                  <div className="h-4 w-16 bg-indigo-200 rounded animate-pulse"></div>
                ) : (
                  `₹${(
                    (kpiData?.data?.cogsBreakdown?.openingStock || 0) + 
                    (kpiData?.data?.cogsBreakdown?.purchases || 0) - 
                    (kpiData?.data?.mtdRevenue || 0) - 
                    (kpiData?.data?.cogsBreakdown?.closingStock || 0)
                  ).toLocaleString()}`
                )}
              </div>
              <p className="text-[9px] text-indigo-600 leading-tight">Final Result</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Chart Toggle Button */}
      <div 
        className="fixed bottom-8 right-8 z-50"
        onMouseEnter={() => setIsHoveringButton(true)}
        onMouseLeave={() => setIsHoveringButton(false)}
      >
        {/* Expandable Menu */}
        <div className={`absolute bottom-16 right-0 mb-2 transition-all duration-300 ease-in-out ${
          isHoveringButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}>
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-2 space-y-2 min-w-[200px]">
            <button
              onClick={() => {
                setSelectedChart('revenue');
                setShowCharts(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-colors text-left"
            >
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Revenue & Profit</p>
                <p className="text-xs text-gray-500">View profitability</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                setSelectedChart('expense');
                setShowCharts(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-orange-50 transition-colors text-left"
            >
              <PieChart className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Expense Breakdown</p>
                <p className="text-xs text-gray-500">COGS & expenses</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                setSelectedChart('collection');
                setShowCharts(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-teal-50 transition-colors text-left"
            >
              <Activity className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Collections</p>
                <p className="text-xs text-gray-500">Payment status</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                setSelectedChart('withdrawals');
                setShowCharts(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-violet-50 transition-colors text-left"
            >
              <ArrowDownLeft className="h-5 w-5 text-violet-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Withdrawals</p>
                <p className="text-xs text-gray-500">Transaction summary</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                setSelectedChart('cogs');
                setShowCharts(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-amber-50 transition-colors text-left"
            >
              <DollarSign className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">COGS Breakdown</p>
                <p className="text-xs text-gray-500">Inventory analysis</p>
              </div>
            </button>
          </div>
        </div>

        {/* Main Toggle Button */}
        <button
          className={`group flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300 ${
            showCharts 
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
              : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900'
          }`}
        >
          <BarChart3 className="h-7 w-7 text-white transition-transform group-hover:scale-110" />
        </button>
      </div>
    </div>
  );
}
