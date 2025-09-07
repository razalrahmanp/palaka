import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    const [
      customerAnalyticsResult,
      monthlyTrendResult,
      supplierPerformanceResult
    ] = await Promise.all([
      // Customer analytics from view
      supabase
        .from('view_customer_analytics')
        .select('*')
        .single(),

      // Monthly sales trend from view
      supabase
        .from('view_monthly_sales_trend')
        .select('*')
        .order('month', { ascending: false })
        .limit(12),

      // Supplier performance from view
      supabase
        .from('view_supplier_performance')
        .select('*')
        .order('total_value', { ascending: false })
        .limit(10)
    ]);

    if (customerAnalyticsResult.error) {
      console.error('Customer analytics error:', customerAnalyticsResult.error);
    }

    if (monthlyTrendResult.error) {
      console.error('Monthly trend error:', monthlyTrendResult.error);
    }

    if (supplierPerformanceResult.error) {
      console.error('Supplier performance error:', supplierPerformanceResult.error);
    }

    // Format customer analytics (aggregate data)
    const customerAnalytics = customerAnalyticsResult.data || {
      total_customers: 0,
      new_customers_30d: 0,
      active_customers_30d: 0,
      avg_customer_value: 0,
      avg_orders_per_customer: 0
    };

    // Format monthly trend with growth calculations
    const monthlyTrend = monthlyTrendResult.data?.map(month => ({
      month: new Date(month.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      orderCount: month.order_count || 0,
      revenue: Number(month.revenue) || 0,
      avgOrderValue: Number(month.avg_order_value) || 0,
      growthPct: Number(month.growth_pct) || 0,
      rawMonth: month.month
    })).reverse() || []; // Reverse to show oldest to newest

    // Format supplier performance
    const supplierPerformance = supplierPerformanceResult.data?.map(supplier => ({
      supplierId: supplier.supplier_id,
      name: supplier.supplier_name || 'Unknown Supplier',
      totalOrders: supplier.total_orders || 0,
      totalValue: Number(supplier.total_value) || 0,
      avgLeadTime: Number(supplier.avg_lead_time_days) || 0,
      completedOrders: supplier.completed_orders || 0,
      pendingOrders: supplier.pending_orders || 0,
      completionRate: supplier.total_orders > 0 
        ? Math.round((supplier.completed_orders / supplier.total_orders) * 100) 
        : 0,
      reliability: supplier.avg_lead_time_days <= 7 ? 'High' : 
                   supplier.avg_lead_time_days <= 14 ? 'Medium' : 'Low'
    })) || [];

    // Calculate revenue summary
    const currentMonth = monthlyTrend[monthlyTrend.length - 1];
    const prevMonth = monthlyTrend[monthlyTrend.length - 2];
    const totalRevenue = monthlyTrend.reduce((sum: number, month) => sum + month.revenue, 0);
    const avgMonthlyRevenue = monthlyTrend.length > 0 ? totalRevenue / monthlyTrend.length : 0;

    return NextResponse.json({
      success: true,
      data: {
        customers: {
          summary: {
            totalCustomers: customerAnalytics.total_customers,
            newCustomers30d: customerAnalytics.new_customers_30d,
            activeCustomers30d: customerAnalytics.active_customers_30d,
            avgCustomerValue: Number(customerAnalytics.avg_customer_value),
            avgOrdersPerCustomer: Number(customerAnalytics.avg_orders_per_customer)
          }
        },
        sales: {
          monthlyTrend,
          summary: {
            currentMonthRevenue: currentMonth?.revenue || 0,
            prevMonthRevenue: prevMonth?.revenue || 0,
            growthPct: currentMonth?.growthPct || 0,
            totalRevenue12Months: totalRevenue,
            avgMonthlyRevenue: Math.round(avgMonthlyRevenue),
            totalOrders12Months: monthlyTrend.reduce((sum: number, month) => sum + month.orderCount, 0)
          }
        },
        suppliers: {
          performance: supplierPerformance,
          summary: {
            totalSuppliers: supplierPerformance.length,
            totalPurchaseValue: supplierPerformance.reduce((sum: number, s) => sum + s.totalValue, 0),
            avgLeadTime: supplierPerformance.length > 0
              ? Math.round(supplierPerformance.reduce((sum: number, s) => sum + s.avgLeadTime, 0) / supplierPerformance.length)
              : 0,
            highReliabilitySuppliers: supplierPerformance.filter(s => s.reliability === 'High').length
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
