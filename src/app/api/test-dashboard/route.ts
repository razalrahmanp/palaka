import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test all dashboard API endpoints
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const [kpiRes, revenueRes, operationalRes, analyticsRes] = await Promise.all([
      fetch(`${baseUrl}/api/dashboard/kpis`),
      fetch(`${baseUrl}/api/dashboard/revenue-trend`),
      fetch(`${baseUrl}/api/dashboard/operational`),
      fetch(`${baseUrl}/api/dashboard/analytics`)
    ]);

    const results = {
      kpis: {
        status: kpiRes.status,
        success: kpiRes.ok,
        data: kpiRes.ok ? await kpiRes.json() : await kpiRes.text()
      },
      revenueTrend: {
        status: revenueRes.status,
        success: revenueRes.ok,
        data: revenueRes.ok ? await revenueRes.json() : await revenueRes.text()
      },
      operational: {
        status: operationalRes.status,
        success: operationalRes.ok,
        data: operationalRes.ok ? await operationalRes.json() : await operationalRes.text()
      },
      analytics: {
        status: analyticsRes.status,
        success: analyticsRes.ok,
        data: analyticsRes.ok ? await analyticsRes.json() : await analyticsRes.text()
      }
    };

    return NextResponse.json({
      success: true,
      message: 'Dashboard API test completed',
      results,
      summary: {
        totalEndpoints: 4,
        successfulEndpoints: Object.values(results).filter(r => r.success).length,
        failedEndpoints: Object.values(results).filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Dashboard test error:', error);
    return NextResponse.json(
      { success: false, error: 'Dashboard test failed', details: error },
      { status: 500 }
    );
  }
}
