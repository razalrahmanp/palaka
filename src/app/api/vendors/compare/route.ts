// app/api/vendors/compare/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { vendor_ids } = await request.json();

    if (!vendor_ids || vendor_ids.length < 2) {
      return NextResponse.json({ error: 'At least 2 vendor IDs required' }, { status: 400 });
    }

    const comparisonData = await Promise.all(
      vendor_ids.map(async (vendorId: string) => {
        // Get vendor info
        const { data: vendor } = await supabase
          .from('suppliers')
          .select('id, name')
          .eq('id', vendorId)
          .single();

        if (!vendor) return null;

        // Get purchase orders
        const { data: purchaseOrders } = await supabase
          .from('purchase_orders')
          .select('id, quantity, status, total, created_at')
          .eq('supplier_id', vendorId);

        // Calculate metrics
        const totalOrders = purchaseOrders?.length || 0;
        const totalSpent = purchaseOrders?.reduce((sum, po) => sum + (po.total || 0), 0) || 0;

        // Mock additional metrics (in real implementation, these would come from actual tracking)
        const avgDeliveryTime = Math.floor(Math.random() * 10) + 3; // 3-13 days
        const qualityScore = Math.floor(Math.random() * 30) + 70; // 70-100%
        const priceCompetitiveness = Math.floor(Math.random() * 40) + 60; // 60-100%

        // Generate monthly trend data (mock data)
        const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (5 - i));
          return {
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            orders: Math.floor(Math.random() * 10) + 1,
            spent: Math.floor(Math.random() * 50000) + 10000
          };
        });

        return {
          vendor_id: vendorId,
          vendor_name: vendor.name,
          total_orders: totalOrders,
          total_spent: totalSpent,
          avg_delivery_time: avgDeliveryTime,
          quality_score: qualityScore,
          price_competitiveness: priceCompetitiveness,
          monthly_trend: monthlyTrend
        };
      })
    );

    // Filter out null results
    const validComparisons = comparisonData.filter(data => data !== null);

    return NextResponse.json(validComparisons);
  } catch (error) {
    console.error('POST /api/vendors/compare error', error);
    return NextResponse.json({ error: 'Failed to compare vendors' }, { status: 500 });
  }
}
