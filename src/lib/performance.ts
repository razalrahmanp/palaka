// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();
  
  static startMeasurement(name: string) {
    this.measurements.set(name, performance.now());
  }
  
  static endMeasurement(name: string): number {
    const start = this.measurements.get(name);
    if (!start) return 0;
    
    const duration = performance.now() - start;
    this.measurements.delete(name);
    
    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`🐌 Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
    
    return duration;
  }
  
  static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasurement(name);
    try {
      const result = await fn();
      const duration = this.endMeasurement(name);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      this.endMeasurement(name);
      throw error;
    }
  }
}

import { NextRequest, NextResponse } from 'next/server';

// API wrapper with performance monitoring
export function withPerformanceMonitoring(
  handler: (req: NextRequest) => Promise<NextResponse>,
  name: string
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    return PerformanceMonitor.measureAsync(name, () => handler(req));
  };
}

// Global performance tracking
interface PerformanceData {
  requests: number;
  totalTime: number;
  avgTime: number;
  cacheHits: number;
  lastAccess: Date;
}

interface SlowOperation {
  operation: string;
  duration: number;
  timestamp: Date;
}

const performanceData = new Map<string, PerformanceData>();
const slowOperations: SlowOperation[] = [];

export function trackApiPerformance(endpoint: string, duration: number, cacheHit: boolean = false) {
  const current = performanceData.get(endpoint) || {
    requests: 0,
    totalTime: 0,
    avgTime: 0,
    cacheHits: 0,
    lastAccess: new Date()
  };

  current.requests++;
  current.totalTime += duration;
  current.avgTime = current.totalTime / current.requests;
  if (cacheHit) current.cacheHits++;
  current.lastAccess = new Date();

  performanceData.set(endpoint, current);

  // Track slow operations
  if (duration > 2000) { // 2 seconds threshold
    slowOperations.push({
      operation: endpoint,
      duration,
      timestamp: new Date()
    });

    // Keep only last 100 slow operations
    if (slowOperations.length > 100) {
      slowOperations.splice(0, slowOperations.length - 100);
    }
  }
}

export function getPerformanceMetrics(): Map<string, PerformanceData> {
  return new Map(performanceData);
}

export function getSlowOperations(): SlowOperation[] {
  return [...slowOperations];
}

export function clearPerformanceData() {
  performanceData.clear();
  slowOperations.length = 0;
}