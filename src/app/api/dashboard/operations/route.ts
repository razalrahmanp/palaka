import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookies() 
    });

    // 1. Inventory Stock by Category
    const { data: inventoryData } = await supabase
      .from('inventory_items')
      .select('category, quantity, reorder_point, cost_price');

    const stockByCategory = inventoryData?.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = {
          totalQuantity: 0,
          itemCount: 0,
          totalValue: 0,
          lowStockItems: 0
        };
      }
      acc[category].totalQuantity += item.quantity || 0;
      acc[category].itemCount += 1;
      acc[category].totalValue += (item.quantity || 0) * (item.cost_price || 0);
      
      if ((item.quantity || 0) <= (item.reorder_point || 0)) {
        acc[category].lowStockItems += 1;
      }
      
      return acc;
    }, {} as Record<string, {
      totalQuantity: number;
      itemCount: number;
      totalValue: number;
      lowStockItems: number;
    }>) || {};

    // 2. Low Stock Alerts (detailed list)
    const { data: lowStockItems } = await supabase
      .from('inventory_items')
      .select('name, sku, quantity, reorder_point, category')
      .filter('quantity', 'lte', 'reorder_point')
      .order('quantity', { ascending: true })
      .limit(20);

    const lowStockAlerts = lowStockItems?.map(item => ({
      ...item,
      severity: (item.quantity || 0) === 0 ? 'critical' : 
               (item.quantity || 0) < (item.reorder_point || 0) * 0.5 ? 'high' : 'medium'
    })) || [];

    // 3. Work Orders Status
    const { data: workOrdersData } = await supabase
      .from('work_orders')
      .select('status, created_at, due_date');

    const workOrdersStatus = workOrdersData?.reduce((acc, wo) => {
      const status = wo.status || 'pending';
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status] += 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // 4. Production Logs Summary (if available)
    const { data: productionData } = await supabase
      .from('production_logs')
      .select('output_quantity, defect_quantity, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const productionSummary = productionData?.reduce((acc, log) => {
      const date = new Date(log.created_at).toISOString().slice(0, 10);
      if (!acc[date]) {
        acc[date] = {
          date,
          output: 0,
          defects: 0,
          efficiency: 0
        };
      }
      acc[date].output += log.output_quantity || 0;
      acc[date].defects += log.defect_quantity || 0;
      return acc;
    }, {} as Record<string, {
      date: string;
      output: number;
      defects: number;
      efficiency: number;
    }>) || {};

    // Calculate efficiency for each day
    Object.values(productionSummary).forEach(day => {
      const total = day.output + day.defects;
      day.efficiency = total > 0 ? (day.output / total) * 100 : 100;
    });

    const productionTrend = Object.values(productionSummary).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 5. Inventory Turnover (simplified calculation)
    const { data: salesItemsData } = await supabase
      .from('sales_order_items')
      .select('product_id, quantity')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    const productSales = salesItemsData?.reduce((acc, item) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = 0;
      }
      acc[item.product_id] += item.quantity || 0;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get current inventory for turnover calculation
    const { data: currentInventory } = await supabase
      .from('inventory_items')
      .select('product_id, quantity');

    const inventoryTurnover = currentInventory?.map(item => {
      const salesQty = productSales[item.product_id] || 0;
      const currentQty = item.quantity || 0;
      const turnoverRate = currentQty > 0 ? salesQty / currentQty : 0;
      
      return {
        productId: item.product_id,
        currentStock: currentQty,
        quarterSales: salesQty,
        turnoverRate: turnoverRate,
        velocity: turnoverRate > 2 ? 'fast' : turnoverRate > 1 ? 'medium' : 'slow'
      };
    }).sort((a, b) => b.turnoverRate - a.turnoverRate).slice(0, 20) || [];

    // 6. Procurement Needs (items that need reordering)
    const procurementNeeds = lowStockAlerts.filter(item => 
      item.severity === 'critical' || item.severity === 'high'
    ).map(item => ({
      ...item,
      suggestedOrderQty: Math.max((item.reorder_point || 0) * 2, 10),
      estimatedCost: 0 // Would need supplier pricing data
    }));

    return NextResponse.json({
      success: true,
      data: {
        inventory: {
          stockByCategory: Object.entries(stockByCategory).map(([category, data]) => ({
            category,
            ...data
          })),
          lowStockAlerts,
          inventoryTurnover,
          totalValue: Object.values(stockByCategory).reduce((sum, cat) => sum + cat.totalValue, 0),
          totalItems: inventoryData?.length || 0,
          lowStockCount: lowStockAlerts.length
        },
        production: {
          workOrdersStatus: Object.entries(workOrdersStatus).map(([status, count]) => ({
            status,
            count
          })),
          productionTrend,
          averageEfficiency: productionTrend.length > 0 ? 
            productionTrend.reduce((sum, day) => sum + day.efficiency, 0) / productionTrend.length : 0,
          totalOutput: productionTrend.reduce((sum, day) => sum + day.output, 0),
          totalDefects: productionTrend.reduce((sum, day) => sum + day.defects, 0)
        },
        procurement: {
          needsReorder: procurementNeeds,
          urgentCount: procurementNeeds.filter(item => item.severity === 'critical').length,
          estimatedReorderValue: procurementNeeds.reduce((sum, item) => 
            sum + (item.suggestedOrderQty * item.estimatedCost), 0
          )
        }
      }
    });

  } catch (error) {
    console.error('Operations API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch operations data' },
      { status: 500 }
    );
  }
}
