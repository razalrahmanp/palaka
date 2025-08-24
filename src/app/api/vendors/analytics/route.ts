import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get('vendorId');
    const range = searchParams.get('range') || '3m';
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '1m':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 3);
    }

    // Call the comprehensive vendor analytics function
    const { data, error } = await supabase.rpc('get_vendor_analytics_api', {
      p_vendor_id: vendorId || null,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0]
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch vendor analytics', details: error.message },
        { status: 500 }
      );
    }

    // If the function returns a JSON object with success/data structure, use it directly
    if (data && typeof data === 'object' && 'success' in data) {
      return NextResponse.json(data);
    }

    // Otherwise, wrap the data
    return NextResponse.json({
      success: true,
      data: data || {
        summary: {
          totalVendors: 0,
          activeVendors: 0,
          totalOrders: 0,
          totalAmount: 0,
          averageDeliveryTime: 0,
          onTimeDeliveryRate: 0
        },
        topVendors: [],
        monthlyTrends: [],
        categoryDistribution: [],
        performanceMetrics: []
      }
    });

  } catch (error) {
    console.error('Vendor analytics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, vendorId } = body;

    if (action === 'refresh_analytics') {
      // Refresh analytics data
      const { error } = await supabase.rpc('refresh_comprehensive_analytics');
      
      if (error) {
        console.error('Analytics refresh error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to refresh analytics' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Analytics refreshed successfully' 
      });
    }

    if (action === 'get_vendor_performance' && vendorId) {
      // Get detailed vendor performance
      const { data, error } = await supabase.rpc('get_vendor_performance_details', {
        vendor_id_in: vendorId
      });

      if (error) {
        console.error('Vendor performance error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to fetch vendor performance' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: data
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('POST vendor analytics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
