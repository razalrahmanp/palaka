'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { hasPermission } from '@/lib/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { 
  BarChart3,
  ShoppingCart,
  Package,
  Warehouse,
  Wallet,
  Users,
  Truck,
  DollarSign,
  UserCheck,
  Calendar,
  ChevronDown,
  RefreshCw
} from 'lucide-react';

// Import department dashboards
import OverviewDashboard from '@/components/dashboard/OverviewDashboard';
import SalesDashboard from '@/components/dashboard/SalesDashboard';
import SalesRepsDashboard from '@/components/dashboard/SalesRepsDashboard';
import ProcurementDashboard from '@/components/dashboard/ProcurementDashboard';
import InventoryDashboard from '@/components/dashboard/InventoryDashboard';
import FinanceDashboard from '@/components/dashboard/FinanceDashboard';
import HRDashboard from '@/components/dashboard/HRDashboard';
import LogisticsDashboard from '@/components/dashboard/LogisticsDashboard';
import InvestorWithdrawalDashboard from '@/components/dashboard/InvestorWithdrawalDashboard';

export default function NextGenDashboard() {
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Date Filter State - Default to This Month
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
      // Weekly ranges
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

  const dateRange = getDateRange();

  // Broadcast date change to all tabs
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      // Store current date range in sessionStorage so components can read it on mount
      sessionStorage.setItem('dashboard-date-range', JSON.stringify({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        filter: dateFilter
      }));

      // Broadcast the change
      window.dispatchEvent(new CustomEvent('dashboard-date-change', {
        detail: { 
          startDate: dateRange.startDate, 
          endDate: dateRange.endDate,
          filter: dateFilter 
        }
      }));
    }
  }, [dateRange, dateFilter]);

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
              {dateRange.startDate && dateRange.endDate && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                  {DATE_FILTER_LABELS[dateFilter]}
                </span>
              )}
            </p>
          </div>

          {/* Date Filter Controls */}
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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.location.reload()}
              className="h-8 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
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
              value="sales-reps"
              className="flex items-center gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
            >
              <UserCheck className="h-4 w-4" />
              Sales Reps
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
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              <Truck className="h-4 w-4" />
              Logistics
            </TabsTrigger>
            <TabsTrigger 
              value="investors"
              className="flex items-center gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white"
            >
              <DollarSign className="h-4 w-4" />
              Investors
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

            <TabsContent value="sales-reps" className="h-full m-0 p-6">
              <SalesRepsDashboard />
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

            <TabsContent value="investors" className="h-full m-0 p-6">
              <InvestorWithdrawalDashboard kpiData={null} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
