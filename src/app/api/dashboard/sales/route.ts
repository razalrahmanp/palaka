import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Revenue Trend (last 12 months)
    const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data: salesData } = await supabase
      .from('sales_orders')
      .select('created_at, final_price')
      .gte('created_at', yearAgo)
      .order('created_at');

    // Group by month
    const monthlyRevenue = salesData?.reduce((acc: Record<string, number>, order) => {
      const month = new Date(order.created_at).toISOString().slice(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + (order.final_price || 0);
      return acc;
    }, {}) || {};

    const revenuetrend = Object.entries(monthlyRevenue).map(([month, revenue]) => ({
      month,
      revenue: revenue as number
    }));

    // Top Products
    const { data: itemsData } = await supabase
      .from('sales_order_items')
      .select(`
        quantity,
        unit_price,
        product_id,
        products!inner(name)
      `);

    const productStats = itemsData?.reduce((acc: Record<string, { quantity: number; revenue: number }>, item) => {
      const productName = (item.products as any)?.name || 'Unknown';
      if (!acc[productName]) {
        acc[productName] = { quantity: 0, revenue: 0 };
      }
      acc[productName].quantity += item.quantity || 0;
      acc[productName].revenue += (item.quantity || 0) * (item.unit_price || 0);
      return acc;
    }, {}) || {};

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Quotes Funnel
    const { data: quotesData } = await supabase
      .from('quotes')
      .select('status, total_price');

    const quotesFunnel = quotesData?.reduce((acc: Record<string, { count: number; value: number }>, quote) => {
      const status = quote.status || 'draft';
      if (!acc[status]) {
        acc[status] = { count: 0, value: 0 };
      }
      acc[status].count++;
      acc[status].value += quote.total_price || 0;
      return acc;
    }, {}) || {};

    const quoteFunnelArray = Object.entries(quotesFunnel).map(([status, data]) => ({
      status,
      count: data.count,
      value: data.value
    }));

    // Receivables Aging (mock data for now)
    const receivablesAging = [
      { range: '0-30 days', amount: 125000, count: 15 },
      { range: '31-60 days', amount: 85000, count: 8 },
      { range: '61-90 days', amount: 45000, count: 5 },
      { range: '90+ days', amount: 25000, count: 3 }
    ];

    return NextResponse.json({
      success: true,
      data: {
        revenuetrend,
        topProducts,
        quotesFunnel: quoteFunnelArray,
        receivablesAging
      }
    });

  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sales analytics' },
      { status: 500 }
    );
  }
}
