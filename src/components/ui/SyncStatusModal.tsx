import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, AlertCircle, Wifi, WifiOff, Database } from 'lucide-react';

interface CachedData {
  available: boolean;
  recordCount: number;
  lastSyncTime: string | null;
  lastSyncRecords: number;
  minutesSinceSync?: number | null;
}

interface SyncStatusModalProps {
  syncStatus: {
    status: 'idle' | 'checking' | 'syncing' | 'completed' | 'cached' | 'error';
    message: string;
    progress: number;
    error: string | null;
    isOpen: boolean;
    deviceUnreachable?: boolean;
    cachedData?: CachedData;
  };
  onClose: () => void;
}

export function SyncStatusModal({
  syncStatus,
  onClose,
}: SyncStatusModalProps) {
  if (!syncStatus.isOpen) return null;

  return (
    <Dialog open={syncStatus.isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attendance Sync</DialogTitle>
          <DialogDescription>
            Syncing attendance data from ESSL devices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Checking Network Status */}
          {syncStatus.status === 'checking' && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <Wifi className="h-6 w-6 text-blue-500 mb-2" />
              <p className="text-sm font-medium text-gray-900">{syncStatus.message}</p>
              <p className="text-xs text-gray-500 mt-2">Please wait...</p>
            </div>
          )}

          {/* Syncing Status */}
          {syncStatus.status === 'syncing' && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-900">{syncStatus.message}</p>
              <p className="text-xs text-gray-500 mt-2">Please wait...</p>
            </div>
          )}

          {/* Success Status */}
          {syncStatus.status === 'completed' && (
            <div className="flex flex-col items-center justify-center py-6 bg-green-50 rounded-lg">
              <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
              <p className="text-sm font-medium text-green-900">{syncStatus.message}</p>
            </div>
          )}

          {/* Cached Data Status (Device Unreachable) */}
          {syncStatus.status === 'cached' && (
            <div className="flex flex-col items-center justify-center py-6 bg-amber-50 rounded-lg border border-amber-200">
              <div className="relative mb-4">
                <Database className="h-12 w-12 text-amber-600" />
                <WifiOff className="h-6 w-6 text-amber-700 absolute -bottom-1 -right-1" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-semibold text-amber-900">Device Not Reachable</p>
              </div>
              <p className="text-sm text-amber-800 text-center px-4">{syncStatus.message}</p>
              
              {syncStatus.cachedData && syncStatus.cachedData.available && (
                <div className="mt-4 p-3 bg-white rounded-md border border-amber-200 w-full">
                  <p className="text-xs font-medium text-gray-700 mb-2">Cached Data Info:</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Records:</span>
                      <span className="font-medium">{syncStatus.cachedData.recordCount}</span>
                    </div>
                    {syncStatus.cachedData.lastSyncTime && (
                      <div className="flex justify-between">
                        <span>Last Sync:</span>
                        <span className="font-medium">
                          {syncStatus.cachedData.minutesSinceSync 
                            ? `${syncStatus.cachedData.minutesSinceSync}m ago`
                            : new Date(syncStatus.cachedData.lastSyncTime).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <p className="text-xs text-amber-700 mt-3 text-center px-4">
                💡 Tip: Connect to the office network to sync fresh data
              </p>
            </div>
          )}

          {/* Error Status */}
          {syncStatus.status === 'error' && (
            <div className="flex flex-col items-center justify-center py-6 bg-red-50 rounded-lg">
              <XCircle className="h-12 w-12 text-red-600 mb-4" />
              <p className="text-sm font-medium text-red-900">{syncStatus.message}</p>
              {syncStatus.error && (
                <p className="text-xs text-red-700 mt-2">{syncStatus.error}</p>
              )}
            </div>
          )}

          {/* Close Button */}
          {(syncStatus.status === 'completed' || 
            syncStatus.status === 'cached' || 
            syncStatus.status === 'error') && (
            <div className="flex justify-center pt-4">
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
