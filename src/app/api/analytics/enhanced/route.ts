// Enhanced Analytics API for Furniture Industry KPIs
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Type definitions
interface InventoryItem {
  product_id: string;
  product_name: string;
  annual_usage_value: number;
  current_stock: number;
  abc_category: 'A' | 'B' | 'C';
  reorder_recommendation: string;
}

interface QualityMetric {
  log_date: string;
  defect_rate: number;
}

interface ProductionEfficiency {
  product_name: string;
  efficiency_score: number;
  avg_production_time: number;
  defect_rate: number;
  cost_per_unit: number;
  total_output: number;
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const revalidate = 0;

export async function GET() {
  try {
    // Fetch enhanced furniture industry KPIs
    const [
      industryKpis,
      productionEfficiency,
      financialMetrics,
      qualityMetrics,
      inventoryHealth
    ] = await Promise.all([
      supabaseAdmin.rpc('get_furniture_industry_kpis'),
      supabaseAdmin.rpc('get_production_efficiency_analysis'),
      supabaseAdmin.rpc('get_financial_performance_metrics'),
      supabaseAdmin.rpc('get_daily_defect_rate'),
      supabaseAdmin.rpc('get_inventory_abc_analysis')
    ]);

    // Handle errors
    if (industryKpis.error) throw new Error(`Industry KPIs Error: ${industryKpis.error.message}`);
    if (productionEfficiency.error) throw new Error(`Production Efficiency Error: ${productionEfficiency.error.message}`);
    if (financialMetrics.error) throw new Error(`Financial Metrics Error: ${financialMetrics.error.message}`);

    // Calculate additional metrics
    const totalInventoryItems = inventoryHealth.data?.length || 0;
    const criticalStockItems = (inventoryHealth.data as InventoryItem[])?.filter((item: InventoryItem) => 
      item.reorder_recommendation === 'HIGH PRIORITY REORDER'
    ).length || 0;

    const avgDefectRate = (qualityMetrics.data as QualityMetric[])?.length > 0 
      ? (qualityMetrics.data as QualityMetric[]).reduce((sum: number, item: QualityMetric) => sum + (item.defect_rate || 0), 0) / (qualityMetrics.data as QualityMetric[]).length
      : 0;

    // Structure enhanced response
    const responseData = {
      // Core Industry KPIs
      kpis: {
        ...industryKpis.data,
        avg_defect_rate: Number(avgDefectRate.toFixed(2)),
        critical_stock_items: criticalStockItems,
        total_inventory_items: totalInventoryItems,
        inventory_health_score: totalInventoryItems > 0 
          ? Number(((totalInventoryItems - criticalStockItems) / totalInventoryItems * 100).toFixed(1))
          : 100
      },

      // Production Analytics
      production: {
        efficiency: productionEfficiency.data || [],
        qualityTrends: qualityMetrics.data || [],
        avgEfficiency: (productionEfficiency.data as ProductionEfficiency[])?.length > 0
          ? Number(((productionEfficiency.data as ProductionEfficiency[]).reduce((sum: number, item: ProductionEfficiency) => sum + (item.efficiency_score || 0), 0) / (productionEfficiency.data as ProductionEfficiency[]).length).toFixed(1))
          : 0
      },

      // Financial Performance
      financial: financialMetrics.data || {},

      // Inventory Insights
      inventory: {
        abcAnalysis: inventoryHealth.data?.slice(0, 20) || [], // Top 20 items
        categoryBreakdown: (inventoryHealth.data as InventoryItem[])?.reduce((acc: Record<string, number>, item: InventoryItem) => {
          acc[item.abc_category] = (acc[item.abc_category] || 0) + 1;
          return acc;
        }, {}) || { A: 0, B: 0, C: 0 }
      },

      // Alerts and Recommendations
      alerts: [
        ...(criticalStockItems > 0 ? [{
          type: 'inventory',
          severity: 'high',
          message: `${criticalStockItems} items require immediate reordering`,
          count: criticalStockItems
        }] : []),
        ...(avgDefectRate > 5 ? [{
          type: 'quality',
          severity: 'medium', 
          message: `Quality alert: Average defect rate is ${avgDefectRate.toFixed(1)}%`,
          value: avgDefectRate
        }] : [])
      ]
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[ENHANCED_ANALYTICS_GET]', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(
      JSON.stringify({ 
        error: "Internal Server Error", 
        details: errorMessage,
        timestamp: new Date().toISOString()
      }), 
      { status: 500 }
    );
  }
}
