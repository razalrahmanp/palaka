import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

// Define interfaces for strong typing
interface ProductInfo {
  cost_price?: number;
  selling_price?: number;
  name?: string;
  category?: string;
}

interface SalesOrderItem {
  quantity: number;
  unit_price: number;
  total_price?: number;
  products?: ProductInfo | ProductInfo[];
}

interface SalesOrder {
  id: string;
  final_price: number;
  original_price: number;
  discount_amount: number;
  created_at: string;
  status: string;
  sales_order_items?: SalesOrderItem[] | SalesOrderItem;
}

interface Expense {
  amount: number;
  category: string;
  created_at: string;
}

interface MonthlyData {
  period: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  operating_expenses: number;
  operating_profit: number;
  net_profit: number;
  gross_margin: number;
  operating_margin: number;
  net_margin: number;
  roi: number;
}

interface ProfitCenter {
  center_name: string;
  revenue: number;
  profit: number;
  margin: number;
  contribution: number;
  trend: 'up' | 'down' | 'stable';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('start_date') || '2024-01-01';
  const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];

  try {
    // Get sales data with items for profitability analysis
    const { data: salesData, error: salesError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        original_price,
        discount_amount,
        created_at,
        status,
        sales_order_items!inner(
          quantity,
          unit_price,
          total_price,
          products!inner(
            cost_price,
            selling_price,
            name,
            category
          )
        )
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('status', ['completed', 'paid', 'delivered'])
      .order('created_at');

    if (salesError) throw salesError;

    // Get expense data for the same period
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, category, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (expenseError) console.warn('Could not fetch expense data:', expenseError);

    // Process monthly profitability data
    const monthlyData: Record<string, MonthlyData> = {};
    
    (salesData || []).forEach((sale: SalesOrder) => {
      const date = new Date(sale.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          period: monthName,
          revenue: 0,
          cogs: 0,
          gross_profit: 0,
          operating_expenses: 0,
          operating_profit: 0,
          net_profit: 0,
          gross_margin: 0,
          operating_margin: 0,
          net_margin: 0,
          roi: 0
        };
      }

      const revenue = sale.final_price || 0;
      monthlyData[monthKey].revenue += revenue;

      // Calculate COGS from items
      if (sale.sales_order_items) {
        const items = Array.isArray(sale.sales_order_items) ? sale.sales_order_items : [sale.sales_order_items];
        items.forEach((item: SalesOrderItem) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const costPrice = product?.cost_price || 0;
          const cogs = (item.quantity || 0) * costPrice;
          monthlyData[monthKey].cogs += cogs;
        });
      }
    });

    // Add operating expenses from expense data
    (expenseData || []).forEach((expense: Expense) => {
      const date = new Date(expense.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].operating_expenses += expense.amount || 0;
      }
    });

    // Calculate derived metrics
    Object.values(monthlyData).forEach((month: MonthlyData) => {
      month.gross_profit = month.revenue - month.cogs;
      month.operating_profit = month.gross_profit - month.operating_expenses;
      month.net_profit = month.operating_profit; // Simplified - would subtract taxes, interest, etc.
      
      month.gross_margin = month.revenue > 0 ? (month.gross_profit / month.revenue) * 100 : 0;
      month.operating_margin = month.revenue > 0 ? (month.operating_profit / month.revenue) * 100 : 0;
      month.net_margin = month.revenue > 0 ? (month.net_profit / month.revenue) * 100 : 0;
      month.roi = month.cogs > 0 ? (month.net_profit / month.cogs) * 100 : 0;
    });

    const periods = Object.values(monthlyData).slice(-12); // Last 12 months

    // Create profit centers analysis (simplified)
    const profitCenters = await createProfitCentersAnalysis(salesData || []);

    // Calculate summary KPIs
    const totalRevenue = periods.reduce((sum: number, p: MonthlyData) => sum + p.revenue, 0);
    const totalProfit = periods.reduce((sum: number, p: MonthlyData) => sum + p.net_profit, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const roi = periods.reduce((sum: number, p: MonthlyData) => sum + p.roi, 0) / periods.length;

    // Calculate trends
    const recentPeriods = periods.slice(-6);
    const revenueGrowth = calculateGrowthRate(recentPeriods.map(p => p.revenue));
    const profitGrowth = calculateGrowthRate(recentPeriods.map(p => p.net_profit));
    const marginTrend = calculateGrowthRate(recentPeriods.map(p => p.net_margin));

    const response = {
      success: true,
      data: {
        periods,
        profit_centers: profitCenters,
        kpis: {
          total_revenue: Math.round(totalRevenue),
          total_profit: Math.round(totalProfit),
          avg_margin: Math.round(avgMargin * 10) / 10,
          roi: Math.round(roi * 10) / 10,
          growth_rate: Math.round(revenueGrowth * 10) / 10,
          break_even_point: Math.round(totalRevenue * 0.67) // Simplified break-even calculation
        },
        trends: {
          revenue_trend: Math.round(revenueGrowth * 10) / 10,
          profit_trend: Math.round(profitGrowth * 10) / 10,
          margin_trend: Math.round(marginTrend * 10) / 10,
          efficiency_score: Math.min(100, Math.max(0, avgMargin * 3)) // Mock efficiency score
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching profitability analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profitability analysis' },
      { status: 500 }
    );
  }
}

async function createProfitCentersAnalysis(salesData: SalesOrder[]) {
  const centerStats: Record<string, ProfitCenter> = {};
  
  salesData.forEach((sale: SalesOrder) => {
    if (sale.sales_order_items) {
      const items = Array.isArray(sale.sales_order_items) ? sale.sales_order_items : [sale.sales_order_items];
      items.forEach((item: SalesOrderItem) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        const category = product?.category || 'Other';
        const revenue = item.total_price || (item.quantity * item.unit_price) || 0;
        const cost = (item.quantity || 0) * (product?.cost_price || 0);
        const profit = revenue - cost;
        
        if (!centerStats[category]) {
          centerStats[category] = {
            center_name: category,
            revenue: 0,
            profit: 0,
            margin: 0,
            contribution: 0,
            trend: 'stable' as 'up' | 'down' | 'stable'
          };
        }
        
        centerStats[category].revenue += revenue;
        centerStats[category].profit += profit;
      });
    }
  });

  const totalRevenue = Object.values(centerStats).reduce((sum: number, center: ProfitCenter) => sum + center.revenue, 0);
  
  return Object.values(centerStats).map((center: ProfitCenter) => {
    center.margin = center.revenue > 0 ? (center.profit / center.revenue) * 100 : 0;
    center.contribution = totalRevenue > 0 ? (center.revenue / totalRevenue) * 100 : 0;
    center.trend = center.margin > 15 ? 'up' : center.margin < 5 ? 'down' : 'stable';
    return center;
  });
}

function calculateGrowthRate(values: number[]): number {
  if (values.length < 2) return 0;
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  return firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
}