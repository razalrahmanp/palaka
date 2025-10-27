/**
 * API Utilities for cache-busting and fresh data fetching
 */

export interface CacheBustOptions {
  refresh?: boolean;
  timestamp?: string | number;
}

/**
 * Adds cache-busting parameters to URL for fresh database data
 */
export function addCacheBustParams(url: string, options: CacheBustOptions = {}): string {
  const urlObj = new URL(url, window.location.origin);
  
  if (options.refresh !== false) {
    urlObj.searchParams.set('refresh', 'true');
  }
  
  // Always add timestamp to ensure unique requests
  const timestamp = options.timestamp || Date.now();
  urlObj.searchParams.set('_t', timestamp.toString());
  
  return urlObj.toString();
}

/**
 * Fetch function that bypasses cache by default for fresh DB data
 */
export async function fetchFreshData(url: string, options: RequestInit & CacheBustOptions = {}) {
  const { refresh = true, timestamp, ...fetchOptions } = options;
  
  const cacheBustedUrl = addCacheBustParams(url, { refresh, timestamp });
  
  const requestOptions: RequestInit = {
    ...fetchOptions,
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...fetchOptions.headers,
    },
  };
  
  console.log(`🔄 Fetching fresh data from: ${cacheBustedUrl}`);
  
  return fetch(cacheBustedUrl, requestOptions);
}

/**
 * Hook-style data fetching with automatic refresh
 */
export class FreshDataManager {
  private refreshCallbacks: Set<() => void> = new Set();
  
  /**
   * Register a refresh callback
   */
  onRefresh(callback: () => void): () => void {
    this.refreshCallbacks.add(callback);
    return () => this.refreshCallbacks.delete(callback);
  }
  
  /**
   * Trigger refresh for all registered components
   */
  refreshAll(): void {
    console.log(`🔄 Triggering refresh for ${this.refreshCallbacks.size} components`);
    this.refreshCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in refresh callback:', error);
      }
    });
  }
  
  /**
   * Fetch fresh data and trigger callbacks
   */
  async fetchAndRefresh(url: string, options: RequestInit & CacheBustOptions = {}) {
    const response = await fetchFreshData(url, options);
    this.refreshAll();
    return response;
  }
}

// Global instance for sales order management
export const salesDataManager = new FreshDataManager();

/**
 * Common API endpoints with cache-busting
 */
export const API_ENDPOINTS = {
  salesOrders: () => addCacheBustParams('/api/finance/sales-orders'),
  invoices: () => addCacheBustParams('/api/finance/invoices'),
  payments: () => addCacheBustParams('/api/finance/payments'),
  expenses: () => addCacheBustParams('/api/expenses'),
} as const;