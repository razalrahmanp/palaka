import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Stock by Category
    const { data: inventoryData } = await supabase
      .from('inventory_items')
      .select('category, quantity, cost_per_unit');

    const stockByCategory = inventoryData?.reduce((acc: Record<string, { totalQuantity: number; value: number }>, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { totalQuantity: 0, value: 0 };
      }
      acc[category].totalQuantity += item.quantity || 0;
      acc[category].value += (item.quantity || 0) * (item.cost_per_unit || 0);
      return acc;
    }, {}) || {};

    const stockByCategoryArray = Object.entries(stockByCategory).map(([category, data]) => ({
      category,
      totalQuantity: data.totalQuantity,
      value: data.value
    }));

    // Low Stock Alerts
    const { data: lowStockData } = await supabase
      .from('inventory_items')
      .select(`
        id,
        name,
        quantity,
        reorder_point,
        category,
        supplier_id,
        suppliers(name)
      `)
      .filter('quantity', 'lte', 'reorder_point')
      .order('quantity')
      .limit(20);

    const lowStockAlerts = lowStockData?.map(item => ({
      id: item.id,
      name: item.name,
      currentStock: item.quantity,
      reorderPoint: item.reorder_point,
      category: item.category || 'Unknown',
      supplier: (item.suppliers as any)?.name || 'Unknown'
    })) || [];

    // Stock Movement (mock data for now)
    const stockMovement = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
      return {
        date: date.toISOString().split('T')[0],
        inbound: Math.floor(Math.random() * 100) + 50,
        outbound: Math.floor(Math.random() * 150) + 75
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        stockByCategory: stockByCategoryArray,
        lowStockAlerts,
        stockMovement
      }
    });

  } catch (error) {
    console.error('Error fetching inventory analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory analytics' },
      { status: 500 }
    );
  }
}
