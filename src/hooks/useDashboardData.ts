'use client'

import { useQuery } from '@tanstack/react-query'

// **PERFORMANCE OPTIMIZATION**: Coordinated Dashboard Data Fetching
// Combines all dashboard API calls into parallel execution for better performance

interface DashboardDateRange {
  startDate: string;
  endDate: string;
}

// Type definitions for better type safety
interface KPIData {
  totalRevenue?: number;
  totalProfit?: number;
  totalOrders?: number;
  totalExpenses?: number;
  totalCollection?: number;
  totalWithdrawals?: number;
  totalCOGS?: number;
  mtdRevenue?: number;
  grossProfit?: number;
  cogsBreakdown?: {
    openingStock?: number;
    purchases?: number;
    closingStock?: number;
  };
  [key: string]: unknown;
}

interface OperationalData {
  totalCustomers?: number;
  totalVendors?: number;
  totalProducts?: number;
  totalEmployees?: number;
  [key: string]: unknown;
}

interface InvestorDetail {
  id: number;
  name: string;
  total_investment: number;
  total_withdrawal: number;
  net_position: number;
  equity_percentage: number;
  [key: string]: unknown;
}

interface CoordinatedDashboardData {
  kpis: {
    data: KPIData;
    success: boolean;
    message?: string;
  } | null;
  operational: {
    data: OperationalData;
    success: boolean;
    message?: string;
  } | null;
  investors: {
    totalInvestment: number;
    totalWithdrawal: number;
    netPosition: number;
    investmentByCategory: { name: string; value: number }[];
    withdrawalByType: { name: string; value: number }[];
    trendData: { month: string; investment: number; withdrawal: number }[];
    investors: InvestorDetail[];
  } | null;
}

// Main coordinated dashboard data hook - fetches all data in parallel
export const useCoordinatedDashboardData = (
  dateRange: DashboardDateRange, 
  timePeriod: string = 'all_time'
) => {
  return useQuery({
    queryKey: ['coordinated-dashboard', dateRange.startDate, dateRange.endDate, timePeriod],
    queryFn: async (): Promise<CoordinatedDashboardData> => {
      // **PERFORMANCE**: Execute all API calls in parallel
      const [kpisResponse, operationalResponse, investorsResponse] = await Promise.all([
        // KPIs API with date range
        fetch(`/api/dashboard/kpis?${new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        })}`),
        
        // Operational API (no date filtering)
        fetch('/api/dashboard/operational'),
        
        // Investors API with time period
        fetch(`/api/dashboard/investors?${new URLSearchParams({
          all_time: timePeriod === 'all_time' ? 'true' : 'false',
          ...(timePeriod !== 'all_time' && {
            start_date: dateRange.startDate,
            end_date: dateRange.endDate
          })
        })}`)
      ]);

      // Check for errors
      if (!kpisResponse.ok) throw new Error('Failed to fetch KPIs');
      if (!operationalResponse.ok) throw new Error('Failed to fetch operational data');
      if (!investorsResponse.ok) throw new Error('Failed to fetch investor data');

      // Parse all responses in parallel
      const [kpis, operational, investors] = await Promise.all([
        kpisResponse.json(),
        operationalResponse.json(),
        investorsResponse.json()
      ]);

      return { kpis, operational, investors };
    },
    // **PERFORMANCE**: Coordinated caching and refresh
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    staleTime: 3 * 60 * 1000, // 3 minutes cache
    enabled: !!dateRange.startDate && !!dateRange.endDate,
    // **PERFORMANCE**: Keep previous data while refetching
    placeholderData: (previousData: CoordinatedDashboardData | undefined) => previousData,
  });
};

// Individual hooks that use coordinated data (for backward compatibility)
export const useKPIDataFromCoordinated = (dateRange: DashboardDateRange) => {
  const { data, isLoading, error } = useCoordinatedDashboardData(dateRange);
  
  return {
    data: data?.kpis,
    isLoading,
    error
  };
};

export const useOperationalDataFromCoordinated = () => {
  // Use a default date range for operational data since it doesn't use dates
  const defaultRange = { 
    startDate: new Date().toISOString().split('T')[0], 
    endDate: new Date().toISOString().split('T')[0] 
  };
  
  const { data, isLoading, error } = useCoordinatedDashboardData(defaultRange);
  
  return {
    data: data?.operational,
    isLoading,
    error
  };
};

export const useInvestorDataFromCoordinated = (dateRange: DashboardDateRange, timePeriod: string = 'all_time') => {
  const { data, isLoading, error } = useCoordinatedDashboardData(dateRange, timePeriod);
  
  return {
    data: data?.investors,
    isLoading,
    error
  };
};