import { useState, useEffect, useCallback, useRef } from 'react';

interface CachedData {
  available: boolean;
  recordCount: number;
  lastSyncTime: string | null;
  lastSyncRecords: number;
  minutesSinceSync?: number | null;
}

interface SyncStatus {
  status: 'idle' | 'checking' | 'syncing' | 'completed' | 'cached' | 'error';
  message: string;
  progress: number;
  error: string | null;
  isOpen: boolean;
  deviceUnreachable?: boolean;
  cachedData?: CachedData;
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
    // Step 1: Check device connectivity
    setSyncStatus({
      status: 'checking',
      message: 'Checking device connectivity...',
      progress: 10,
      error: null,
      isOpen: true,
    });

    try {
      // First, check if any device is reachable
      const checkResponse = await fetch('/api/essl/check-device');
      const checkResult = await checkResponse.json();

      if (checkResult.success && checkResult.reachableCount > 0) {
        // Device is reachable, proceed with sync
        setSyncStatus({
          status: 'syncing',
          message: `Syncing ${checkResult.reachableCount} device(s)...`,
          progress: 30,
          error: null,
          isOpen: true,
        });

        // Call the ESSL sync API
        const response = await fetch('/api/essl/sync-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();

        if (data.success) {
          setSyncStatus({
            status: 'completed',
            message: `Successfully synced ${data.totalRecords || 0} records`,
            progress: 100,
            error: null,
            isOpen: true,
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
              ? `Using cached data (last synced ${minutesAgo})`
              : 'Using cached attendance data',
            progress: 0,
            error: null,
            isOpen: true,
            deviceUnreachable: true,
            cachedData: data.cachedData,
          });

          // Keep modal open longer for cached data warning
          setTimeout(() => {
            setSyncStatus((prev) => ({ ...prev, isOpen: false }));
          }, 5000);
        } else {
          throw new Error(data.error || 'Sync failed');
        }
      } else {
        // No devices reachable - inform user to use cached data
        setSyncStatus({
          status: 'cached',
          message: 'Device not reachable from your network. Showing cached data.',
          progress: 0,
          error: null,
          isOpen: true,
          deviceUnreachable: true,
        });

        setTimeout(() => {
          setSyncStatus((prev) => ({ ...prev, isOpen: false }));
        }, 5000);
      }
    } catch (error) {
      setSyncStatus({
        status: 'error',
        message: 'Sync failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        isOpen: true,
      });
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
