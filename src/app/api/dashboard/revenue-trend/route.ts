import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const [revenueTrendResult, topProductsResult] = await Promise.all([
      // Revenue trend from view
      supabase
        .from('view_revenue_trend_12_months')
        .select('*')
        .order('month', { ascending: true }),

      // Top products from view
      supabase
        .from('view_top_products_by_revenue')
        .select('*')
        .limit(10)
    ]);

    if (revenueTrendResult.error) {
      console.error('Revenue trend error:', revenueTrendResult.error);
    }

    if (topProductsResult.error) {
      console.error('Top products error:', topProductsResult.error);
    }

    // Format revenue trend data for charts
    const revenueTrend = revenueTrendResult.data?.map(item => ({
      month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      revenue: Number(item.revenue) || 0,
      rawMonth: item.month
    })) || [];

    // Calculate month-over-month growth
    const trendWithGrowth = revenueTrend.map((item, index) => {
      if (index === 0) return { ...item, growth: 0 };
      const prevRevenue = revenueTrend[index - 1].revenue;
      const growth = prevRevenue > 0 ? ((item.revenue - prevRevenue) / prevRevenue) * 100 : 0;
      return { ...item, growth: Math.round(growth * 100) / 100 };
    });

    // Top products with better formatting
    const topProducts = topProductsResult.data?.map(item => ({
      productId: item.product_id,
      name: item.product_name || 'Unknown Product',
      quantity: item.total_quantity || 0,
      revenue: Number(item.revenue) || 0
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        revenueTrend: trendWithGrowth,
        topProducts,
        summary: {
          totalMonths: revenueTrend.length,
          currentMonthRevenue: revenueTrend[revenueTrend.length - 1]?.revenue || 0,
          avgMonthlyRevenue: revenueTrend.length > 0 
            ? Math.round(revenueTrend.reduce((sum, item) => sum + item.revenue, 0) / revenueTrend.length)
            : 0,
          topProductRevenue: topProducts.reduce((sum, product) => sum + product.revenue, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching revenue trend:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue trend data' },
      { status: 500 }
    );
  }
}
