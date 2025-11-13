import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // Extract date range from query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Default to current month if no dates provided
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // MTD date range
    const defaultStartDate = new Date(year, month, 1).toISOString().split('T')[0];
    const defaultEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const finalStartDate = startDate || defaultStartDate;
    const finalEndDate = endDate || defaultEndDate;

    // Fetch logistics data
    const [
      deliveriesResult,
      salesOrdersResult,
    ] = await Promise.all([
      // Deliveries
      supabase
        .from('deliveries')
        .select('id, status, actual_delivery_time, estimated_delivery_time, delivery_fee, route_id, driver_id, created_at')
        .gte('created_at', finalStartDate)
        .lte('created_at', finalEndDate + 'T23:59:59.999Z'),

      // Sales orders for pending deliveries
      supabase
        .from('sales_orders')
        .select('id, status, delivery_date')
        .eq('status', 'pending')
        .gte('delivery_date', finalStartDate),
    ]);

    if (deliveriesResult.error) throw deliveriesResult.error;
    if (salesOrdersResult.error) throw salesOrdersResult.error;

    const deliveries = deliveriesResult.data || [];
    const pendingOrders = salesOrdersResult.data || [];

    // Calculate KPIs
    const totalDeliveries = deliveries.filter(d => d.status === 'delivered' || d.status === 'completed').length;
    
    // On-time delivery percentage
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered' || d.status === 'completed');
    const onTimeDeliveries = completedDeliveries.filter(d => {
      if (!d.actual_delivery_time || !d.estimated_delivery_time) return false;
      const actualDate = new Date(d.actual_delivery_time);
      const estimatedDate = new Date(d.estimated_delivery_time);
      return actualDate <= estimatedDate;
    });
    const onTimePercentage = completedDeliveries.length > 0
      ? ((onTimeDeliveries.length / completedDeliveries.length) * 100).toFixed(1)
      : '0.0';

    // Fleet utilization - calculate based on drivers with deliveries
    const activeDrivers = new Set(deliveries.map(d => d.driver_id).filter(Boolean)).size;
    const fleetUtilization = activeDrivers > 0 ? ((activeDrivers / 10) * 100).toFixed(1) : '0.0'; // Assuming 10 total drivers

    // Average delivery cost
    const totalCost = deliveries.reduce((sum, d) => sum + (d.delivery_fee || 0), 0);
    const avgDeliveryCost = deliveries.length > 0 ? Math.round(totalCost / deliveries.length) : 0;

    // Pending deliveries
    const pendingDeliveries = pendingOrders.length;

    // Daily delivery trend (last 7 days)
    const deliveryTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dateLabel = date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });

      const dayDeliveries = deliveries.filter(d => d.created_at?.startsWith(dateStr));
      
      deliveryTrend.push({
        date: dateLabel,
        completed: dayDeliveries.filter(d => d.status === 'delivered' || d.status === 'completed').length,
        pending: dayDeliveries.filter(d => d.status === 'pending').length,
        failed: dayDeliveries.filter(d => d.status === 'failed').length,
      });
    }

    // Route efficiency analysis
    const routeGroups: Record<string, { totalDeliveries: number; completed: number; avgFee: number }> = {};
    deliveries.forEach(d => {
      const route = d.route_id || 'Unknown';
      if (!routeGroups[route]) {
        routeGroups[route] = { totalDeliveries: 0, completed: 0, avgFee: 0 };
      }
      routeGroups[route].totalDeliveries++;
      if (d.status === 'delivered' || d.status === 'completed') {
        routeGroups[route].completed++;
      }
      routeGroups[route].avgFee += d.delivery_fee || 0;
    });

    const routeEfficiency = Object.entries(routeGroups).map(([route, data]) => ({
      route,
      avgTime: data.totalDeliveries > 0 ? (data.avgFee / data.totalDeliveries).toFixed(1) : '0',
      deliveries: data.totalDeliveries,
      efficiency: data.totalDeliveries > 0 ? Math.round((data.completed / data.totalDeliveries) * 100) : 0,
    }));

    // Driver/Vehicle performance - Group by driver
    const driverGroups: Record<string, { trips: number; completed: number; totalFees: number }> = {};
    deliveries.forEach(d => {
      const driverId = d.driver_id || 'unassigned';
      if (!driverGroups[driverId]) {
        driverGroups[driverId] = { trips: 0, completed: 0, totalFees: 0 };
      }
      driverGroups[driverId].trips++;
      if (d.status === 'delivered' || d.status === 'completed') {
        driverGroups[driverId].completed++;
      }
      driverGroups[driverId].totalFees += d.delivery_fee || 0;
    });

    const vehiclePerformance = Object.values(driverGroups)
      .slice(0, 6) // Top 6 drivers
      .map((data, index) => ({
        vehicle: `Driver-${index + 1}`,
        trips: data.trips,
        utilization: data.trips > 0 ? Math.round((data.completed / data.trips) * 100) : 0,
        fuel: Math.round(data.totalFees), // Using fees as proxy
        maintenance: data.trips > 0 && data.trips > 0 ? (Math.round((data.completed / data.trips) * 100) > 80 ? 'Good' : 'Fair') : 'Fair',
      }));

    // Delivery status distribution
    const statusGroups: Record<string, number> = {};
    deliveries.forEach(d => {
      const status = d.status || 'unknown';
      statusGroups[status] = (statusGroups[status] || 0) + 1;
    });

    const totalCount = deliveries.length || 1;
    const deliveryStatus = [
      {
        status: 'Completed',
        count: (statusGroups['delivered'] || 0) + (statusGroups['completed'] || 0),
        percentage: (((statusGroups['delivered'] || 0) + (statusGroups['completed'] || 0)) / totalCount * 100).toFixed(1),
        color: '#22c55e',
      },
      {
        status: 'In Transit',
        count: statusGroups['in_transit'] || 0,
        percentage: ((statusGroups['in_transit'] || 0) / totalCount * 100).toFixed(1),
        color: '#3b82f6',
      },
      {
        status: 'Pending',
        count: statusGroups['pending'] || 0,
        percentage: ((statusGroups['pending'] || 0) / totalCount * 100).toFixed(1),
        color: '#f59e0b',
      },
      {
        status: 'Failed',
        count: statusGroups['failed'] || 0,
        percentage: ((statusGroups['failed'] || 0) / totalCount * 100).toFixed(1),
        color: '#ef4444',
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        totalDeliveries,
        onTimePercentage,
        fleetUtilization,
        avgDeliveryCost,
        pendingDeliveries,
        deliveryTrend,
        routeEfficiency,
        vehiclePerformance,
        deliveryStatus,
        summary: {
          totalCost,
          onTimeCount: onTimeDeliveries.length,
          lateCount: completedDeliveries.length - onTimeDeliveries.length,
          routes: Object.keys(routeGroups).length,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching Logistics dashboard data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Logistics data',
      },
      { status: 500 }
    );
  }
}
