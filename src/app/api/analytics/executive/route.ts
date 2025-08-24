import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AnalyticsTrend {
  date: string;
  revenue: number;
  orders: number;
}

interface CashFlowData {
  date: string;
  inflows: number;
  outflows: number;
}

interface ProductData {
  product_name: string;
  revenue: number;
  category: string;
}

interface ExecutiveKPIs {
  totalRevenue: number;
  ordersFulfilled: number;
  grossMargin: number;
  activeCustomers: number;
  inventoryValue: number;
  cashFlow: number;
}

interface SalesTrend {
  date: string;
  sales: number;
  orders: number;
}

interface ProfitExpense {
  month: string;
  profit: number;
  expenses: number;
}

interface TopPerformer {
  name: string;
  revenue: number;
  category: string;
}

interface ExecutiveDashboardData {
  kpis: ExecutiveKPIs;
  salesTrends: SalesTrend[];
  profitVsExpenses: ProfitExpense[];
  topPerformers: TopPerformer[];
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Calculate default date range (last 30 days)
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : new Date();
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Fetch business summary analytics
    const { data: businessSummary, error: summaryError } = await supabase.rpc('get_business_summary', {
      p_start_date: formatDate(startDate),
      p_end_date: formatDate(endDate)
    });

    if (summaryError) {
      console.error('Business summary error:', summaryError);
      throw summaryError;
    }

    // Fetch sales analytics for trends
    const { data: salesAnalytics, error: salesError } = await supabase.rpc('get_sales_analytics_comprehensive', {
      p_start_date: formatDate(startDate),
      p_end_date: formatDate(endDate)
    });

    if (salesError) {
      console.error('Sales analytics error:', salesError);
      throw salesError;
    }

    // Fetch financial analytics
    const { data: financialAnalytics, error: financialError } = await supabase.rpc('get_financial_analytics_comprehensive', {
      p_start_date: formatDate(startDate),
      p_end_date: formatDate(endDate)
    });

    if (financialError) {
      console.error('Financial analytics error:', financialError);
      throw financialError;
    }

    // Transform data for executive dashboard
    const executiveData: ExecutiveDashboardData = {
      kpis: {
        totalRevenue: businessSummary?.revenue?.total || 0,
        ordersFulfilled: businessSummary?.revenue?.completed_orders || 0,
        grossMargin: financialAnalytics?.profitability?.profit_margin ? 
          financialAnalytics.profitability.profit_margin / 100 : 0,
        activeCustomers: businessSummary?.customers?.active || 0,
        inventoryValue: businessSummary?.inventory?.total_value || 0,
        cashFlow: businessSummary?.financial?.cash_flow || 0
      },
      salesTrends: salesAnalytics?.trends?.map((trend: AnalyticsTrend) => ({
        date: new Date(trend.date).toLocaleDateString('en-IN'),
        sales: trend.revenue || 0,
        orders: trend.orders || 0
      })) || [],
      profitVsExpenses: financialAnalytics?.cash_flow?.map((cf: CashFlowData) => ({
        month: new Date(cf.date).toLocaleDateString('en-IN', { month: 'short' }),
        profit: cf.inflows || 0,
        expenses: cf.outflows || 0
      })) || [],
      topPerformers: salesAnalytics?.top_products?.slice(0, 5)?.map((product: ProductData) => ({
        name: product.product_name || 'Unknown Product',
        revenue: product.revenue || 0,
        category: product.category || 'General'
      })) || [],
      lastUpdated: new Date().toISOString()
    };

    // Add mock data if arrays are empty to prevent UI issues
    if (executiveData.salesTrends.length === 0) {
      executiveData.salesTrends = [
        { date: '1 month ago', sales: 50000, orders: 15 },
        { date: 'Current', sales: businessSummary?.revenue?.total || 0, orders: businessSummary?.revenue?.completed_orders || 0 }
      ];
    }

    if (executiveData.profitVsExpenses.length === 0) {
      executiveData.profitVsExpenses = [
        { month: 'Last Month', profit: 40000, expenses: 30000 },
        { month: 'Current', profit: financialAnalytics?.profitability?.gross_profit || 0, expenses: financialAnalytics?.profitability?.total_costs || 0 }
      ];
    }

    if (executiveData.topPerformers.length === 0) {
      executiveData.topPerformers = [
        { name: 'Loading...', revenue: 0, category: 'General' }
      ];
    }

    return NextResponse.json(executiveData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Executive analytics error:', error);
    
    // Return fallback data structure in case of error
    const fallbackData: ExecutiveDashboardData = {
      kpis: {
        totalRevenue: 0,
        ordersFulfilled: 0,
        grossMargin: 0,
        activeCustomers: 0,
        inventoryValue: 0,
        cashFlow: 0
      },
      salesTrends: [
        { date: 'No Data', sales: 0, orders: 0 }
      ],
      profitVsExpenses: [
        { month: 'No Data', profit: 0, expenses: 0 }
      ],
      topPerformers: [
        { name: 'No Data Available', revenue: 0, category: 'General' }
      ],
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(fallbackData, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
