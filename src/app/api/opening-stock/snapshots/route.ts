/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

/**
 * API to manage opening stock snapshots
 * 
 * GET /api/opening-stock/snapshots - List all snapshots
 * POST /api/opening-stock/snapshots - Create/update snapshots
 */

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'all_time', 'month_end', 'year_end'
    
    let query = supabase
      .from('opening_stock_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false });
    
    if (type) {
      query = query.eq('snapshot_type', type);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, year, startYear } = body;
    
    switch (action) {
      case 'calculate_all_time':
        return await calculateAllTimeSnapshot();
      
      case 'generate_yearly':
        if (!year) {
          return NextResponse.json(
            { success: false, error: 'Year is required' },
            { status: 400 }
          );
        }
        return await generateYearlySnapshots(year);
      
      case 'generate_financial_year':
        if (!startYear) {
          return NextResponse.json(
            { success: false, error: 'Start year is required' },
            { status: 400 }
          );
        }
        return await generateFinancialYearSnapshots(startYear);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error managing snapshots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage snapshots' },
      { status: 500 }
    );
  }
}

async function calculateAllTimeSnapshot() {
  try {
    // Calculate current closing stock
    const { data: inventoryItems } = await supabase
      .from('inventory_items')
      .select(`
        quantity,
        products!inner(cost)
      `)
      .gt('quantity', 0);
    
    const closingStock = inventoryItems?.reduce((sum, item: any) => {
      const cost = Array.isArray(item.products) ? item.products[0]?.cost : item.products?.cost;
      return sum + (item.quantity * parseFloat(cost || '0'));
    }, 0) || 0;
    
    // Calculate total sales cost (all regular products ever sold)
    const { data: soldItems } = await supabase
      .from('sales_order_items')
      .select(`
        quantity,
        products!inner(cost)
      `)
      .not('product_id', 'is', null);
    
    const totalSalesCost = soldItems?.reduce((sum, item: any) => {
      const cost = Array.isArray(item.products) ? item.products[0]?.cost : item.products?.cost;
      return sum + (item.quantity * parseFloat(cost || '0'));
    }, 0) || 0;
    
    const openingStock = totalSalesCost + closingStock;
    
    // Save to database
    const { data, error } = await supabase
      .from('opening_stock_snapshots')
      .upsert({
        snapshot_date: '1900-01-01', // Special date for "All Time"
        opening_stock_value: openingStock,
        closing_stock_value: closingStock,
        total_sales_cost: totalSalesCost,
        snapshot_type: 'all_time',
        period_label: 'All Time',
        calculated_at: new Date().toISOString()
      }, {
        onConflict: 'snapshot_date'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: 'All Time snapshot calculated and saved',
      data: {
        openingStock,
        closingStock,
        totalSalesCost,
        snapshot: data
      }
    });
  } catch (error) {
    console.error('Error calculating All Time snapshot:', error);
    throw error;
  }
}

async function generateYearlySnapshots(year: number) {
  try {
    const { data, error } = await supabase
      .rpc('generate_yearly_snapshots', { p_year: year });
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: `Yearly snapshots generated for ${year}`,
      data: data || []
    });
  } catch (error) {
    console.error('Error generating yearly snapshots:', error);
    throw error;
  }
}

async function generateFinancialYearSnapshots(startYear: number) {
  try {
    const { data, error } = await supabase
      .rpc('generate_financial_year_snapshots', { p_start_year: startYear });
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: `Financial year snapshots generated for FY ${startYear}-${startYear + 1}`,
      data: data || []
    });
  } catch (error) {
    console.error('Error generating financial year snapshots:', error);
    throw error;
  }
}
