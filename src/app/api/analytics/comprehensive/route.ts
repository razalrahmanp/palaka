import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AnalyticsData {
  [key: string]: unknown;
}

interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  department?: string;
  includeForecasts?: boolean;
  section?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params: AnalyticsParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      department: searchParams.get('department') || undefined,
      includeForecasts: searchParams.get('includeForecasts') === 'true',
      section: searchParams.get('section') || 'all'
    };

    // Calculate default date range if not provided
    const endDate = params.endDate ? new Date(params.endDate) : new Date();
    const startDate = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Define which analytics to fetch based on section
    const sectionsToFetch = params.section === 'all' 
      ? ['summary', 'sales', 'inventory', 'financial', 'operations', 'customers', 'vendors', 'hr', 'production']
      : [params.section];

    const analyticsData: AnalyticsData = {};

    // Fetch each section's analytics
    for (const section of sectionsToFetch) {
      try {
        switch (section) {
          case 'summary':
            const { data: summaryData, error: summaryError } = await supabase.rpc('get_business_summary', {
              p_start_date: formatDate(startDate),
              p_end_date: formatDate(endDate)
            });
            if (summaryError) throw summaryError;
            analyticsData.summary = summaryData;
            break;

          case 'sales':
            const { data: salesData, error: salesError } = await supabase.rpc('get_sales_analytics_comprehensive', {
              p_start_date: formatDate(startDate),
              p_end_date: formatDate(endDate)
            });
            if (salesError) throw salesError;
            analyticsData.sales = salesData;
            break;

          case 'inventory':
            const { data: inventoryData, error: inventoryError } = await supabase.rpc('get_inventory_analytics_comprehensive', {
              p_start_date: formatDate(startDate),
              p_end_date: formatDate(endDate)
            });
            if (inventoryError) throw inventoryError;
            analyticsData.inventory = inventoryData;
            break;

          case 'financial':
            const { data: financialData, error: financialError } = await supabase.rpc('get_financial_analytics_comprehensive', {
              p_start_date: formatDate(startDate),
              p_end_date: formatDate(endDate)
            });
            if (financialError) throw financialError;
            analyticsData.financial = financialData;
            break;

          case 'operations':
            const { data: operationsData, error: operationsError } = await supabase.rpc('get_operations_analytics_comprehensive', {
              p_start_date: formatDate(startDate),
              p_end_date: formatDate(endDate)
            });
            if (operationsError) throw operationsError;
            analyticsData.operations = operationsData;
            break;

          case 'customers':
            const { data: customersData, error: customersError } = await supabase.rpc('get_customer_analytics_comprehensive', {
              p_start_date: formatDate(startDate),
              p_end_date: formatDate(endDate)
            });
            if (customersError) throw customersError;
            analyticsData.customers = customersData;
            break;

          case 'vendors':
            const { data: vendorsData, error: vendorsError } = await supabase.rpc('get_vendor_analytics_comprehensive', {
              p_start_date: formatDate(startDate),
              p_end_date: formatDate(endDate)
            });
            if (vendorsError) throw vendorsError;
            analyticsData.vendors = vendorsData;
            break;

          case 'hr':
            const { data: hrData, error: hrError } = await supabase.rpc('get_hr_analytics_comprehensive', {
              p_start_date: formatDate(startDate),
              p_end_date: formatDate(endDate)
            });
            if (hrError) throw hrError;
            analyticsData.hr = hrData;
            break;

          case 'production':
            const { data: productionData, error: productionError } = await supabase.rpc('get_production_analytics_comprehensive', {
              p_start_date: formatDate(startDate),
              p_end_date: formatDate(endDate)
            });
            if (productionError) throw productionError;
            analyticsData.production = productionData;
            break;
        }
      } catch (sectionError) {
        console.warn(`Failed to fetch ${section} analytics:`, sectionError);
        // Set empty data for failed sections to prevent complete failure
        if (section) {
          analyticsData[section] = null;
        }
      }
    }

    // Fetch forecasts if requested
    if (params.includeForecasts) {
      try {
        const { data: forecastsData, error: forecastsError } = await supabase.rpc('get_forecasting_analytics', {
          p_start_date: formatDate(startDate),
          p_end_date: formatDate(endDate)
        });
        if (forecastsError) throw forecastsError;
        analyticsData.forecasts = forecastsData;
      } catch (forecastError) {
        console.warn('Failed to fetch forecasts:', forecastError);
        analyticsData.forecasts = null;
      }
    }

    // Fetch business alerts
    try {
      const { data: alertsData, error: alertsError } = await supabase.rpc('get_business_alerts');
      if (alertsError) throw alertsError;
      analyticsData.alerts = alertsData;
    } catch (alertError) {
      console.warn('Failed to fetch alerts:', alertError);
      analyticsData.alerts = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        ...analyticsData,
        metadata: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          section: params.section,
          includeForecasts: params.includeForecasts,
          generatedAt: new Date().toISOString(),
          dataQuality: calculateDataQuality(analyticsData)
        }
      }
    });

  } catch (error) {
    console.error('Comprehensive analytics error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analytics data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'refresh_analytics':
        const { error: refreshError } = await supabase.rpc('refresh_comprehensive_analytics');
        if (refreshError) {
          console.error('Analytics refresh error:', refreshError);
          return NextResponse.json(
            { success: false, error: 'Failed to refresh analytics' },
            { status: 500 }
          );
        }
        return NextResponse.json({ 
          success: true, 
          message: 'Analytics refreshed successfully',
          timestamp: new Date().toISOString()
        });

      case 'export_analytics':
        // Generate export data
        const { data: exportData, error: exportError } = await supabase.rpc('get_comprehensive_analytics', {
          p_start_date: params?.startDate || (new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          p_end_date: params?.endDate || new Date().toISOString().split('T')[0],
          p_department: params?.department || null,
          p_include_forecasts: params?.includeForecasts || true
        });

        if (exportError) {
          console.error('Export error:', exportError);
          return NextResponse.json(
            { success: false, error: 'Failed to export analytics' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          exportData: exportData,
          filename: `analytics_export_${new Date().toISOString().split('T')[0]}.json`
        });

      case 'save_snapshot':
        // Save analytics snapshot
        const { error: snapshotError } = await supabase
          .from('analytics_snapshots')
          .insert({
            snapshot_date: new Date().toISOString().split('T')[0],
            metric_type: params?.type || 'manual_snapshot',
            dimensions: params?.dimensions || {},
            metrics: params?.metrics || {}
          });

        if (snapshotError) {
          console.error('Snapshot save error:', snapshotError);
          return NextResponse.json(
            { success: false, error: 'Failed to save snapshot' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Analytics snapshot saved successfully'
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('POST analytics error:', error);
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

// Helper function to calculate data quality score
function calculateDataQuality(analyticsData: AnalyticsData): number {
  let totalSections = 0;
  let successfulSections = 0;

  for (const [key, value] of Object.entries(analyticsData)) {
    if (key !== 'metadata') {
      totalSections++;
      if (value !== null && value !== undefined) {
        successfulSections++;
      }
    }
  }

  return totalSections > 0 ? Math.round((successfulSections / totalSections) * 100) : 0;
}
