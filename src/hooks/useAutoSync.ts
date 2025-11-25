import { useState, useEffect, useCallback, useRef } from 'react';

interface CachedData {
  available: boolean;
  recordCount: number;
  lastSyncTime: string | null;
  lastSyncRecords: number;
  minutesSinceSync?: number | null;
}

interface NetworkInfo {
  clientIp: string;
  proxyIps: string[];
  userAgent: string;
  timestamp: string;
}

interface DeviceInfo {
  id: string;
  name: string;
  ip: string;
  port: number;
}

interface SyncStatus {
  status: 'idle' | 'checking' | 'syncing' | 'completed' | 'cached' | 'error';
  message: string;
  progress: number;
  error: string | null;
  isOpen: boolean;
  deviceUnreachable?: boolean;
  cachedData?: CachedData;
  networkInfo?: NetworkInfo;
  deviceInfo?: DeviceInfo;
  recordsSynced?: number;
}

interface UseAutoSyncReturn {
  syncStatus: SyncStatus;
  startSync: () => Promise<void>;
  closeModal: () => void;
}

export function useAutoSync(autoTriggerOnMount: boolean = true): UseAutoSyncReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    status: 'idle',
    message: '',
    progress: 0,
    error: null,
    isOpen: false,
  });

  const hasAutoTriggered = useRef(false);

  const performSync = useCallback(async () => {
    // Step 1: Attempt sync directly
    setSyncStatus({
      status: 'syncing',
      message: 'Connecting to ESSL device...',
      progress: 30,
      error: null,
      isOpen: true,
    });

    try {
      // Call the ESSL sync API directly
      const response = await fetch('/api/essl/sync-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        // Sync succeeded - device was reachable
        setSyncStatus({
          status: 'completed',
          message: `Successfully synced ${data.totalRecords || data.stats?.synced || 0} records`,
          progress: 100,
          error: null,
          isOpen: true,
          networkInfo: data.networkInfo,
          deviceInfo: data.deviceInfo,
          recordsSynced: data.totalRecords || data.stats?.synced || 0,
        });

        // Auto-close modal after 2 seconds on success
        setTimeout(() => {
          setSyncStatus((prev) => ({ ...prev, isOpen: false }));
        }, 2000);
      } else if (data.deviceUnreachable && data.cachedData) {
        // Device unreachable but we have cached data
        const minutesAgo = data.cachedData.minutesSinceSync 
          ? `${data.cachedData.minutesSinceSync} minutes ago`
          : 'earlier';

        setSyncStatus({
          status: 'cached',
          message: data.cachedData.lastSyncTime 
            ? `Device not reachable. Using cached data (last synced ${minutesAgo})`
            : 'Device not reachable. Using cached attendance data',
          progress: 0,
          error: data.error || null,
          isOpen: true,
          deviceUnreachable: true,
          cachedData: data.cachedData,
          networkInfo: data.networkInfo,
          deviceInfo: data.deviceInfo,
        });

        // Keep modal open longer for cached data warning
        setTimeout(() => {
          setSyncStatus((prev) => ({ ...prev, isOpen: false }));
        }, 5000);
      } else {
        // Other error
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setSyncStatus({
        status: 'error',
        message: 'Failed to sync attendance',
        progress: 0,
        error: errorMsg,
        isOpen: true,
      });
      
      // Keep error modal open until user closes it
    }
  }, []);

  const startSync = useCallback(async () => {
    await performSync();
  }, [performSync]);

  const closeModal = useCallback(() => {
    setSyncStatus((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Auto-trigger on mount if specified
  useEffect(() => {
    if (autoTriggerOnMount && !hasAutoTriggered.current) {
      hasAutoTriggered.current = true;
      performSync();
    }
  }, [autoTriggerOnMount, performSync]);

  return {
    syncStatus,
    startSync,
    closeModal,
  };
}
