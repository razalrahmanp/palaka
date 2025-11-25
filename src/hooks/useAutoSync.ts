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

  /**
   * Detect if user is on local network by checking their local IP
   */
  const detectLocalNetwork = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            pc.close();
            resolve(null);
            return;
          }

          const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
          const ipMatch = ice.candidate.candidate.match(ipRegex);
          
          if (ipMatch && ipMatch[0]) {
            const ip = ipMatch[0];
            // Check if it's a private IP on device network
            if (ip.startsWith('192.168.1.')) {
              pc.close();
              resolve(ip);
              return;
            }
          }
        };

        pc.createOffer().then(offer => pc.setLocalDescription(offer));
        
        // Timeout after 3 seconds
        setTimeout(() => {
          pc.close();
          resolve(null);
        }, 3000);
      } catch (error) {
        console.error('Failed to detect local IP:', error);
        resolve(null);
      }
    });
  }, []);

  const performSync = useCallback(async () => {
    // Step 1: Detect if user is on local network
    setSyncStatus({
      status: 'syncing',
      message: 'Detecting network connection...',
      progress: 10,
      error: null,
      isOpen: true,
    });

    const localIp = await detectLocalNetwork();
    const isOnLocalNetwork = localIp !== null && localIp.startsWith('192.168.1.');

    console.log(`🌐 Network detection: ${isOnLocalNetwork ? 'ON' : 'OFF'} device network`);
    console.log(`   Local IP: ${localIp || 'not detected'}`);

    // Step 2: Choose sync method based on network
    setSyncStatus({
      status: 'syncing',
      message: isOnLocalNetwork 
        ? 'Connecting directly to ESSL device...' 
        : 'Syncing via server...',
      progress: 30,
      error: null,
      isOpen: true,
    });

    try {
      let response;
      
      if (isOnLocalNetwork) {
        // User is on device network - use client-side sync
        console.log('✅ Using CLIENT-SIDE sync (direct device connection)');
        
        // Get device info from database first
        const deviceResponse = await fetch('/api/essl/devices');
        const devicesData = await deviceResponse.json();
        const device = devicesData.devices?.[0]; // Get first device
        
        if (!device) {
          throw new Error('No ESSL device configured');
        }

        response = await fetch('/api/essl/client-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: device.id,
            deviceIp: device.ip_address,
            devicePort: device.port || 4370,
            clientInitiated: true,
          }),
        });
      } else {
        // User is NOT on device network - try server-side sync (will likely fail)
        console.log('⚠️  Using SERVER-SIDE sync (may fail if not on Vercel network)');
        response = await fetch('/api/essl/sync-attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      }

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
  }, [detectLocalNetwork]);

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
