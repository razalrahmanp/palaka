// app/api/vendors/analytics/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get all vendors with basic stats
    const { data: vendors, error: vendorsError } = await supabase
      .from('suppliers')
      .select('id, name')
      .order('name', { ascending: true });

    if (vendorsError) throw vendorsError;

    // Get performance data for each vendor
    const vendorAnalytics = await Promise.all(
      vendors.slice(0, 5).map(async (vendor) => { // Limit to top 5 for performance
        // Purchase orders stats
        const { data: purchaseOrders } = await supabase
          .from('purchase_orders')
          .select('id, quantity, status, total, created_at')
          .eq('supplier_id', vendor.id);

        // Calculate metrics
        const totalOrders = purchaseOrders?.length || 0;
        const totalSpent = purchaseOrders?.reduce((sum, po) => sum + (po.total || 0), 0) || 0;
        const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

        // Last 30 days orders
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const last30DaysOrders = purchaseOrders?.filter(po => 
          new Date(po.created_at || '') > thirtyDaysAgo
        ).length || 0;

        // Mock performance scores (in real implementation, these would come from actual tracking)
        const onTimeDeliveryRate = Math.floor(Math.random() * 30) + 70; // 70-100%
        const qualityScore = Math.floor(Math.random() * 30) + 70; // 70-100%
        
        // Determine trend based on recent activity
        const trend = last30DaysOrders > totalOrders * 0.1 ? 'up' : 
                     last30DaysOrders === 0 ? 'down' : 'stable';

        return {
          vendor_id: vendor.id,
          vendor_name: vendor.name,
          total_orders: totalOrders,
          total_spent: totalSpent,
          avg_order_value: avgOrderValue,
          on_time_delivery_rate: onTimeDeliveryRate,
          quality_score: qualityScore,
          last_30_days_orders: last30DaysOrders,
          trend
        };
      })
    );

    // Sort by total spent (descending)
    vendorAnalytics.sort((a, b) => b.total_spent - a.total_spent);

    return NextResponse.json(vendorAnalytics);
  } catch (error) {
    console.error('GET /api/vendors/analytics error', error);
    return NextResponse.json({ error: 'Failed to fetch vendor analytics' }, { status: 500 });
  }
}
