import { NextResponse } from 'next/server';
import { getPerformanceMetrics, getSlowOperations } from '@/lib/performance';

export async function GET() {
  try {
    const metrics = getPerformanceMetrics();
    const slowOps = getSlowOperations();

    // Transform metrics for frontend consumption
    const endpointMetrics = Array.from(metrics.entries()).map(([endpoint, data]) => ({
      endpoint,
      avgResponseTime: data.avgTime,
      hitRate: data.cacheHits / Math.max(data.requests, 1) * 100,
      totalRequests: data.requests,
      slowQueries: slowOps.filter((op) => op.operation.includes(endpoint)).length,
      lastUpdate: new Date().toISOString()
    }));

    return NextResponse.json(endpointMetrics);
  } catch (error) {
    console.error('Failed to get performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve performance metrics' },
      { status: 500 }
    );
  }
}