// app/api/vendors/[id]/performance/route.ts
import { supabase } from '@/lib/supabasePool'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;

    // Get vendor info
    const { data: vendor, error: vendorError } = await supabase
      .from('suppliers')
      .select('id, name')
      .eq('id', vendorId)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Get purchase orders for performance calculation
    const { data: purchaseOrders } = await supabase
      .from('purchase_orders')
      .select('id, quantity, status, total, created_at')
      .eq('supplier_id', vendorId);

    // Mock performance metrics (in real implementation, these would come from actual tracking)
    const qualityScore = Math.floor(Math.random() * 30) + 70; // 70-100%
    const onTimeDeliveryRate = Math.floor(Math.random() * 30) + 70; // 70-100%
    const priceCompetitiveness = Math.floor(Math.random() * 40) + 60; // 60-100%
    const avgDeliveryTime = Math.floor(Math.random() * 10) + 3; // 3-13 days
    const customerSatisfaction = Math.floor(Math.random() * 30) + 70; // 70-100%

    // Generate monthly performance data (last 6 months)
    const monthlyPerformance = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      
      // Filter orders for this month
      const monthOrders = purchaseOrders?.filter(order => {
        const orderDate = new Date(order.created_at || '');
        return orderDate.getMonth() === date.getMonth() && 
               orderDate.getFullYear() === date.getFullYear();
      }) || [];

      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        orders: monthOrders.length,
        on_time_percentage: Math.floor(Math.random() * 30) + 70,
        quality_score: Math.floor(Math.random() * 30) + 70
      };
    });

    // Determine performance trend
    const recentMonths = monthlyPerformance.slice(-3);
    const earlierMonths = monthlyPerformance.slice(0, 3);
    const recentAvg = recentMonths.reduce((sum, month) => sum + month.quality_score, 0) / recentMonths.length;
    const earlierAvg = earlierMonths.reduce((sum, month) => sum + month.quality_score, 0) / earlierMonths.length;
    
    let performanceTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentAvg > earlierAvg + 5) performanceTrend = 'improving';
    else if (recentAvg < earlierAvg - 5) performanceTrend = 'declining';

    const performanceMetrics = {
      vendor_id: vendorId,
      vendor_name: vendor.name,
      quality_score: qualityScore,
      on_time_delivery_rate: onTimeDeliveryRate,
      price_competitiveness: priceCompetitiveness,
      avg_delivery_time: avgDeliveryTime,
      customer_satisfaction: customerSatisfaction,
      monthly_performance: monthlyPerformance,
      performance_trend: performanceTrend
    };

    return NextResponse.json(performanceMetrics);
  } catch (error) {
    console.error('GET /api/vendors/[id]/performance error', error);
    return NextResponse.json({ error: 'Failed to fetch performance metrics' }, { status: 500 });
  }
}
