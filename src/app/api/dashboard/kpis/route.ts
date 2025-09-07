import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Fetch all KPI data using optimized views for better performance
    const [
      mtdRevenueResult,
      quotePipelineResult,
      customPendingResult,
      lowStockResult,
      openPOsResult,
      onTimeDeliveryResult
    ] = await Promise.all([
      // MTD Revenue from view
      supabase
        .from('view_mtd_revenue')
        .select('*')
        .single(),

      // Quote Pipeline from view
      supabase
        .from('view_quotes_pipeline')
        .select('*'),

      // Custom Orders Pending from view
      supabase
        .from('view_custom_orders_pending')
        .select('*')
        .single(),

      // Low Stock Count from view
      supabase
        .from('view_low_stock_items')
        .select('*')
        .single(),

      // Open Purchase Orders from view
      supabase
        .from('view_open_purchase_orders')
        .select('*')
        .single(),

      // On-time Delivery from view
      supabase
        .from('view_on_time_delivery_pct_7d')
        .select('*')
        .single()
    ]);

    // Process results with error handling
    const mtdRevenue = mtdRevenueResult.data?.mtd_revenue || 0;

    const quotePipeline = quotePipelineResult.data?.[0] || { total_quotes: 0, total_value: 0 };

    const customPendingCount = customPendingResult.data?.custom_orders_pending || 0;
    const lowStockCount = lowStockResult.data?.low_stock_count || 0;
    
    const openPurchaseOrders = {
      count: openPOsResult.data?.open_pos || 0,
      value: openPOsResult.data?.open_po_value || 0
    };

    const onTimeDeliveryRate = onTimeDeliveryResult.data?.on_time_pct || 100;
    const totalDeliveries = onTimeDeliveryResult.data?.total_deliveries || 0;

    return NextResponse.json({
      success: true,
      data: {
        mtdRevenue,
        quotePipeline: {
          totalQuotes: quotePipeline.total_quotes,
          totalValue: quotePipeline.total_value
        },
        customOrdersPending: customPendingCount,
        lowStockItems: lowStockCount,
        openPurchaseOrders,
        onTimeDeliveryRate,
        deliveryStats: {
          onTimePercentage: onTimeDeliveryRate,
          totalDeliveries
        }
      }
    });

  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPI data' },
      { status: 500 }
    );
  }
}
