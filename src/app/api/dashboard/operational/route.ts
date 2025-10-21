import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET() {
  try {
    const [
      inventoryCategoryResult,
      inventoryAlertsResult,
      workOrdersResult,
      productionEfficiencyResult
    ] = await Promise.all([
      // Inventory by category from view
      supabase
        .from('view_inventory_by_category')
        .select('*')
        .order('total_stock', { ascending: false }),

      // Inventory alerts from view
      supabase
        .from('view_inventory_alerts')
        .select('*')
        .order('quantity', { ascending: true })
        .limit(20),

      // Work orders status from view
      supabase
        .from('view_work_orders_status')
        .select('*'),

      // Production efficiency from view
      supabase
        .from('view_production_efficiency')
        .select('*')
        .order('week', { ascending: false })
        .limit(12)
    ]);

    if (inventoryCategoryResult.error) {
      console.error('Inventory category error:', inventoryCategoryResult.error);
    }

    if (inventoryAlertsResult.error) {
      console.error('Inventory alerts error:', inventoryAlertsResult.error);
    }

    if (workOrdersResult.error) {
      console.error('Work orders error:', workOrdersResult.error);
    }

    if (productionEfficiencyResult.error) {
      console.error('Production efficiency error:', productionEfficiencyResult.error);
    }

    // Format inventory by category for pie chart
    const inventoryCategories = inventoryCategoryResult.data?.map(item => ({
      category: item.category || 'Uncategorized',
      quantity: item.total_quantity || 0,
      value: Number(item.est_value) || 0
    })) || [];

    // Format inventory alerts with priority mapping
    const inventoryAlerts = inventoryAlertsResult.data?.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.product_name || 'Unknown Product',
      category: item.category || 'Uncategorized',
      currentStock: item.current_stock || 0,
      reorderPoint: item.reorder_point || 0,
      alertType: item.alert_type,
      priority: item.priority,
      maxStock: item.max_stock_level || 0
    })) || [];

    // Format work orders status for donut chart
    const workOrdersStatus = workOrdersResult.data?.map(item => ({
      status: item.status || 'unknown',
      count: item.count || 0
    })) || [];

    // Format production efficiency for line chart
    const productionEfficiency = productionEfficiencyResult.data?.map(item => ({
      week: new Date(item.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      totalOrders: item.total_work_orders || 0,
      completed: item.completed_orders || 0,
      inProgress: item.in_progress_orders || 0,
      delayed: item.delayed_orders || 0,
      completionRate: Number(item.completion_rate) || 0,
      avgCycleTime: Number(item.avg_cycle_time_days) || 0
    })) || [];

    // Calculate summary statistics
    const totalInventoryValue = inventoryCategories.reduce((sum, cat) => sum + cat.value, 0);
    const totalInventoryQuantity = inventoryCategories.reduce((sum, cat) => sum + cat.quantity, 0);
    
    const alertsSummary = inventoryAlerts.reduce((acc, alert) => {
      acc[alert.alertType] = (acc[alert.alertType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalWorkOrders = workOrdersStatus.reduce((sum, status) => sum + status.count, 0);
    const avgCompletionRate = productionEfficiency.length > 0 
      ? productionEfficiency.reduce((sum, week) => sum + week.completionRate, 0) / productionEfficiency.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        inventory: {
          categories: inventoryCategories,
          alerts: inventoryAlerts,
          summary: {
            totalValue: totalInventoryValue,
            totalQuantity: totalInventoryQuantity,
            totalAlerts: inventoryAlerts.length,
            alertsSummary
          }
        },
        production: {
          workOrdersStatus,
          efficiency: productionEfficiency,
          summary: {
            totalWorkOrders,
            avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
            currentWeekOrders: productionEfficiency[0]?.totalOrders || 0,
            avgCycleTime: productionEfficiency.length > 0
              ? Math.round(productionEfficiency.reduce((sum, week) => sum + week.avgCycleTime, 0) / productionEfficiency.length * 100) / 100
              : 0
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching operational data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch operational data' },
      { status: 500 }
    );
  }
}
