import { NextResponse } from 'next/server';

// In-memory cache for API responses (use Redis in production)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// Track cache statistics
let cacheHits = 0;
let cacheMisses = 0;

export function createCachedResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  options: {
    ttl?: number; // Time to live in seconds
    cacheKey?: string;
    maxAge?: number; // Browser cache max age
  } = {}
) {
  const { maxAge = 30 } = options; // Reduced default from 300s (5min) to 30s for real-time updates
  
  const response = NextResponse.json(data);
  
  // Set cache headers - shorter duration for real-time data
  response.headers.set(
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=10`
  );
  
  // Set ETag for conditional requests
  const etag = `"${Date.now()}"`;
  response.headers.set('ETag', etag);
  
  return response;
}

export function getCachedData(key: string) {
  const cached = cache.get(key);
  if (!cached) {
    cacheMisses++;
    return null;
  }
  
  const now = Date.now();
  if (now - cached.timestamp > cached.ttl * 1000) {
    cache.delete(key);
    cacheMisses++;
    return null;
  }
  
  cacheHits++;
  return cached.data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setCachedData(key: string, data: any, ttl: number = 30) {
  // Reduced default TTL from 300s (5min) to 30s for better real-time updates
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

export function clearCache(pattern?: string) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

export function getCacheStats() {
  const now = Date.now();
  let validEntries = 0;
  let totalMemoryBytes = 0;

  for (const [key, entry] of cache.entries()) {
    const isValid = now - entry.timestamp <= entry.ttl * 1000;
    if (isValid) {
      validEntries++;
      // Rough estimate of memory usage
      totalMemoryBytes += JSON.stringify(entry.data).length + key.length;
    }
  }

  // Calculate cache efficiency
  const totalRequests = cacheHits + cacheMisses || 1;
  const hitRate = (cacheHits / totalRequests) * 100;
  const missRate = (cacheMisses / totalRequests) * 100;

  const memoryKB = totalMemoryBytes / 1024;
  const memoryMB = memoryKB / 1024;
  const memoryUsage = memoryMB > 1 
    ? `${memoryMB.toFixed(2)} MB`
    : `${memoryKB.toFixed(2)} KB`;

  return {
    totalKeys: validEntries,
    hitRate: hitRate || 0,
    missRate: missRate || 0,
    memoryUsage
  };
}

export function resetCacheStats() {
  cacheHits = 0;
  cacheMisses = 0;
}