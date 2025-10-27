/**
 * Custom hook for managing data refresh after mutations
 * Provides consistent patterns for cache invalidation and UI updates
 */
import { useCallback, useRef } from 'react';

interface RefreshCallbacks {
  [key: string]: () => Promise<void> | void;
}

export interface DataRefreshConfig {
  onSuccess?: (data?: unknown) => void;
  onError?: (error: Error) => void;
  showSuccessMessage?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

export function useDataRefresh() {
  const refreshCallbacks = useRef<RefreshCallbacks>({});
  const pendingRefreshes = useRef(new Set<string>());

  /**
   * Register a callback for refreshing specific data
   */
  const registerRefreshCallback = useCallback((key: string, callback: () => Promise<void> | void) => {
    refreshCallbacks.current[key] = callback;
  }, []);

  /**
   * Trigger refresh for specific data keys
   */
  const triggerRefresh = useCallback(async (keys: string | string[], config?: DataRefreshConfig) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const refreshPromises: Promise<void>[] = [];

    for (const key of keyArray) {
      if (pendingRefreshes.current.has(key)) {
        console.log(`⏳ Refresh already pending for ${key}, skipping duplicate`);
        continue;
      }

      const callback = refreshCallbacks.current[key];
      if (callback) {
        pendingRefreshes.current.add(key);
        console.log(`🔄 Triggering refresh for: ${key}`);
        
        const refreshPromise = Promise.resolve(callback())
          .then(() => {
            console.log(`✅ Refresh completed for: ${key}`);
            pendingRefreshes.current.delete(key);
          })
          .catch((error) => {
            console.error(`❌ Refresh failed for ${key}:`, error);
            pendingRefreshes.current.delete(key);
            config?.onError?.(error instanceof Error ? error : new Error(String(error)));
          });
        
        refreshPromises.push(refreshPromise);
      } else {
        console.warn(`⚠️ No refresh callback registered for: ${key}`);
      }
    }

    try {
      await Promise.all(refreshPromises);
      config?.onSuccess?.();
      
      if (config?.showSuccessMessage) {
        // You can integrate with your toast/notification system here
        console.log(config.successMessage || 'Data refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Some refreshes failed:', error);
      config?.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  /**
   * Enhanced mutation wrapper with automatic refresh
   */
  const withRefresh = useCallback(<T extends unknown[], R>(
    mutationFn: (...args: T) => Promise<R>,
    refreshKeys: string | string[],
    config?: DataRefreshConfig
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        console.log('🚀 Executing mutation...');
        const result = await mutationFn(...args);
        console.log('✅ Mutation completed successfully');
        
        // Add small delay to ensure backend processing is complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Trigger refresh
        await triggerRefresh(refreshKeys, config);
        
        return result;
      } catch (error) {
        console.error('❌ Mutation failed:', error);
        config?.onError?.(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    };
  }, [triggerRefresh]);

  /**
   * Debounced refresh to prevent multiple rapid calls
   */
  const debouncedRefresh = useCallback((keys: string | string[], config?: DataRefreshConfig) => {
    const debouncedFn = debounce(() => {
      triggerRefresh(keys, config);
    }, 200);
    debouncedFn();
  }, [triggerRefresh]);

  return {
    registerRefreshCallback,
    triggerRefresh,
    debouncedRefresh,
    withRefresh,
    isPending: (key: string) => pendingRefreshes.current.has(key)
  };
}

// Debounce utility function
function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Common refresh keys for the application
 */
export const REFRESH_KEYS = {
  VENDOR_BILLS: 'vendor_bills',
  VENDOR_PAYMENTS: 'vendor_payments',
  VENDOR_EXPENSES: 'vendor_expenses',
  SALES_ORDERS: 'sales_orders',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  EXPENSES: 'expenses',
  DASHBOARD_KPIS: 'dashboard_kpis',
  REPORTS: 'reports',
  VENDOR_FINANCIAL_SUMMARY: 'vendor_financial_summary',
  BILL_PAYMENT_HISTORY: 'bill_payment_history'
} as const;