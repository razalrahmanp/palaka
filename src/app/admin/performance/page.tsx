'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Database, Zap, Clock, TrendingUp } from 'lucide-react';

interface PerformanceMetric {
  endpoint: string;
  avgResponseTime: number;
  hitRate: number;
  totalRequests: number;
  slowQueries: number;
  lastUpdate: string;
}

interface CacheStats {
  totalKeys: number;
  hitRate: number;
  missRate: number;
  memoryUsage: string;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadMetrics = async () => {
    setLoading(true);
    try {
      // Fetch performance metrics
      const metricsResponse = await fetch('/api/performance/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Fetch cache statistics
      const cacheResponse = await fetch('/api/performance/cache-stats');
      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        setCacheStats(cacheData);
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatResponseTime = (time: number) => {
    if (time < 100) return `${time.toFixed(0)}ms`;
    if (time < 1000) return `${time.toFixed(0)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const getPerformanceBadge = (responseTime: number) => {
    if (responseTime < 200) return <Badge variant="default" className="bg-green-500">Fast</Badge>;
    if (responseTime < 500) return <Badge variant="secondary">Good</Badge>;
    if (responseTime < 1000) return <Badge variant="outline">Slow</Badge>;
    return <Badge variant="destructive">Very Slow</Badge>;
  };

  const getCacheEfficiencyBadge = (hitRate: number) => {
    if (hitRate > 80) return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
    if (hitRate > 60) return <Badge variant="secondary">Good</Badge>;
    if (hitRate > 40) return <Badge variant="outline">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <p className="text-muted-foreground">
            Real-time application performance and caching statistics
          </p>
        </div>
        <Button onClick={loadMetrics} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Statistics */}
      {cacheStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cacheStats.hitRate.toFixed(1)}%</div>
              <div className="flex items-center space-x-2">
                {getCacheEfficiencyBadge(cacheStats.hitRate)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cached Keys</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cacheStats.totalKeys}</div>
              <p className="text-xs text-muted-foreground">Active cache entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cacheStats.memoryUsage}</div>
              <p className="text-xs text-muted-foreground">Cache memory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {lastRefresh.toLocaleTimeString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {lastRefresh.toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* API Endpoint Performance */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Response times and cache efficiency for each endpoint
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2 mt-2"></div>
                </div>
              ))}
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No performance data available yet.</p>
              <p className="text-sm">Make some API requests to see metrics.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {metrics.map((metric, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {metric.endpoint}
                      </code>
                      {getPerformanceBadge(metric.avgResponseTime)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {metric.totalRequests} requests
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Avg Response:</span>
                      <div className="font-medium">
                        {formatResponseTime(metric.avgResponseTime)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cache Hit Rate:</span>
                      <div className="font-medium">{metric.hitRate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Slow Queries:</span>
                      <div className="font-medium">
                        {metric.slowQueries}
                        {metric.slowQueries > 0 && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Needs Attention
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Updated:</span>
                      <div className="font-medium">
                        {new Date(metric.lastUpdate).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}