import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, XCircle, Network, Server, Wifi, WifiOff, Copy, Check } from 'lucide-react';

interface NetworkInfo {
  clientIp?: string;
  serverIp?: string;
  proxyIps?: string[];
  userAgent?: string;
  timestamp: string;
}

interface DeviceInfo {
  id: string;
  name: string;
  ip: string;
  port: number;
  reachable: boolean;
}

interface NetworkDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncSuccess: boolean;
  deviceInfo?: DeviceInfo;
  networkInfo?: NetworkInfo;
  errorMessage?: string;
  recordsSynced?: number;
}

export function NetworkDebugModal({
  isOpen,
  onClose,
  syncSuccess,
  deviceInfo,
  networkInfo,
  errorMessage,
  recordsSynced = 0,
}: NetworkDebugModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Network Debug Information
          </DialogTitle>
          <DialogDescription>
            Diagnostic information about device connectivity and network routing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sync Status */}
          <div className={`p-4 rounded-lg border-2 ${
            syncSuccess 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {syncSuccess ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <h3 className={`font-semibold ${
                  syncSuccess ? 'text-green-900' : 'text-red-900'
                }`}>
                  {syncSuccess ? 'Sync Successful' : 'Sync Failed'}
                </h3>
                {syncSuccess && recordsSynced !== undefined && (
                  <p className="text-sm text-green-700">
                    {recordsSynced} records synced
                  </p>
                )}
                {!syncSuccess && errorMessage && (
                  <p className="text-sm text-red-700 mt-1">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Device Information */}
          {deviceInfo && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">ESSL Device</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Device Name:</span>
                  <span className="text-sm font-medium">{deviceInfo.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">IP Address:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded">
                      {deviceInfo.ip}:{deviceInfo.port}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(`${deviceInfo.ip}:${deviceInfo.port}`, 'device')}
                    >
                      {copiedField === 'device' ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status:</span>
                  <div className="flex items-center gap-2">
                    {deviceInfo.reachable ? (
                      <>
                        <Wifi className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Reachable</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Unreachable</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Network Information */}
          {networkInfo && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <Network className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Your Network Information</h3>
              </div>
              <div className="space-y-2">
                {networkInfo.clientIp && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">Your IP Address:</span>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono bg-white px-2 py-1 rounded">
                          {networkInfo.clientIp}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(networkInfo.clientIp!, 'client')}
                        >
                          {copiedField === 'client' ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {(networkInfo.clientIp === '::1' || networkInfo.clientIp === '127.0.0.1') && (
                        <span className="text-xs text-amber-600 italic">
                          (localhost - deploy to see your real IP)
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {networkInfo.serverIp && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">Vercel Server IP:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-white px-2 py-1 rounded">
                        {networkInfo.serverIp}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(networkInfo.serverIp!, 'server')}
                      >
                        {copiedField === 'server' ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                {networkInfo.proxyIps && networkInfo.proxyIps.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-600">Proxy Chain:</span>
                    <div className="flex flex-col items-end gap-1">
                      {networkInfo.proxyIps.map((ip, index) => (
                        <code key={index} className="text-sm font-mono bg-white px-2 py-1 rounded">
                          {ip}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <span className="text-sm text-gray-600">Timestamp:</span>
                  <span className="text-sm font-mono">
                    {new Date(networkInfo.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Troubleshooting Tips */}
          <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">
                  {syncSuccess ? 'Success Details' : 'Troubleshooting Tips'}
                </h3>
                {syncSuccess ? (
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>✅ Your network can reach the ESSL device</li>
                    <li>✅ Device is responding to sync requests</li>
                    <li>✅ Data has been synced to database for all users</li>
                    {networkInfo?.clientIp && (
                      <li>📍 Your IP: <code className="bg-white px-1 rounded">{networkInfo.clientIp}</code></li>
                    )}
                  </ul>
                ) : (
                  <ul className="text-sm text-amber-800 space-y-1">
                    {deviceInfo && (
                      <>
                        <li>• Check if you&apos;re on the same network as the device ({deviceInfo.ip})</li>
                        <li>• Try pinging the device: <code className="bg-white px-1 rounded">ping {deviceInfo.ip}</code></li>
                        <li>• Verify device is powered on and network cable connected</li>
                        <li>• Check firewall isn&apos;t blocking port {deviceInfo.port}</li>
                      </>
                    )}
                    <li>• If working remotely, ask someone on office network to sync</li>
                    {networkInfo?.clientIp && (
                      <li>📍 Your IP: <code className="bg-white px-1 rounded">{networkInfo.clientIp}</code> (may not be on device network)</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={onClose} variant={syncSuccess ? "default" : "outline"}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
