import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, XCircle, Network, Server, Wifi, WifiOff, Copy, Check, Monitor, RefreshCw } from 'lucide-react';

interface ActiveInstance {
  id: string;
  session_id: string;
  client_ip: string;
  user_agent?: string;
  device_info?: {
    browser?: string;
    os?: string;
    localIp?: string;
  };
  location_hint?: string;
  last_seen: string;
  first_seen: string;
}

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
  const [activeInstances, setActiveInstances] = useState<ActiveInstance[]>([]);
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [showAllInstances, setShowAllInstances] = useState(false);

  useEffect(() => {
    if (isOpen && !syncSuccess) {
      // Only fetch active instances when modal opens and sync failed
      fetchActiveInstances();
    }
  }, [isOpen, syncSuccess]);

  const fetchActiveInstances = async () => {
    setIsLoadingInstances(true);
    try {
      const response = await fetch('/api/sessions/active');
      const data = await response.json();
      if (data.instances) {
        setActiveInstances(data.instances);
      }
    } catch (error) {
      console.error('Failed to fetch active instances:', error);
    } finally {
      setIsLoadingInstances(false);
    }
  };

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

          {/* Active Application Instances */}
          {!syncSuccess && activeInstances.length > 0 && (
            <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">
                    Active App Instances ({activeInstances.length})
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={fetchActiveInstances}
                  disabled={isLoadingInstances}
                >
                  {isLoadingInstances ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Sync Agent Banner */}
              {(() => {
                const syncAgents = activeInstances.filter(
                  inst => (inst.device_info?.localIp || inst.location_hint)?.startsWith('192.168.1.')
                );
                
                if (syncAgents.length > 0) {
                  return (
                    <div className="mb-3 p-3 bg-green-50 border border-green-300 rounded-lg">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">{syncAgents.length}</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-900 mb-1">
                            ✅ {syncAgents.length} Sync Agent{syncAgents.length > 1 ? 's' : ''} Available
                          </p>
                          <p className="text-xs text-green-800">
                            {syncAgents.length === 1 ? 'This user is' : 'These users are'} on the device network (192.168.1.x) 
                            and can sync attendance data directly from the ESSL device.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-amber-900 mb-1">
                            ⚠️ No Sync Agents Available
                          </p>
                          <p className="text-xs text-amber-800">
                            No users are currently on the device network (192.168.1.x). 
                            To sync, someone needs to connect to the office WiFi (DIR-615-C4A9 or Alrams).
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}
              
              <p className="text-xs text-gray-600 mb-3">
                Users currently accessing the application from different computers/networks. 
                Someone on the same network as the device ({deviceInfo?.ip}) can sync.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {activeInstances.slice(0, showAllInstances ? undefined : 5).map((instance, index) => {
                  const localIp = instance.device_info?.localIp || instance.location_hint;
                  const isOnDeviceNetwork = localIp?.startsWith('192.168.1.');
                  
                  return (
                    <div 
                      key={instance.id} 
                      className={`rounded border p-2 text-sm ${
                        isOnDeviceNetwork 
                          ? 'bg-green-50 border-green-300' 
                          : 'bg-white border-purple-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-semibold ${isOnDeviceNetwork ? 'text-green-700' : 'text-purple-700'}`}>
                              Instance {index + 1}
                            </span>
                            {isOnDeviceNetwork && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                                ✓ Can Sync
                              </span>
                            )}
                          </div>
                          
                          {/* Public IP */}
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs text-gray-500">Public IP:</span>
                            <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {instance.client_ip}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-4 w-4 p-0"
                              onClick={() => copyToClipboard(instance.client_ip, `instance-public-${instance.id}`)}
                            >
                              {copiedField === `instance-public-${instance.id}` ? (
                                <Check className="h-2.5 w-2.5 text-green-600" />
                              ) : (
                                <Copy className="h-2.5 w-2.5" />
                              )}
                            </Button>
                          </div>

                          {/* Local IP */}
                          {localIp && (
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-xs text-gray-500">Local IP:</span>
                              <code className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                isOnDeviceNetwork 
                                  ? 'bg-green-200 text-green-800 font-semibold' 
                                  : 'bg-gray-100'
                              }`}>
                                {localIp}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-4 w-4 p-0"
                                onClick={() => copyToClipboard(localIp, `instance-local-${instance.id}`)}
                              >
                                {copiedField === `instance-local-${instance.id}` ? (
                                  <Check className="h-2.5 w-2.5 text-green-600" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5" />
                                )}
                              </Button>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            {instance.device_info?.browser && (
                              <span>🌐 {instance.device_info.browser}</span>
                            )}
                            {instance.device_info?.os && (
                              <span>💻 {instance.device_info.os}</span>
                            )}
                            <span className="text-gray-400">
                              • Last seen {Math.round((new Date().getTime() - new Date(instance.last_seen).getTime()) / 1000 / 60)}m ago
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeInstances.length > 5 && (
                <Button
                  variant="link"
                  size="sm"
                  className="w-full mt-2 text-purple-600"
                  onClick={() => setShowAllInstances(!showAllInstances)}
                >
                  {showAllInstances ? 'Show Less' : `Show All ${activeInstances.length} Instances`}
                </Button>
              )}

              <div className="mt-3 pt-3 border-t border-purple-200">
                {activeInstances.some(i => (i.device_info?.localIp || i.location_hint)?.startsWith('192.168.1.')) ? (
                  <p className="text-xs text-green-700 font-medium">
                    ✅ Found {activeInstances.filter(i => (i.device_info?.localIp || i.location_hint)?.startsWith('192.168.1.')).length} user(s) on the device network (192.168.1.x). They can sync!
                  </p>
                ) : (
                  <p className="text-xs text-purple-700 font-medium">
                    💡 Tip: Ask a user on IP range 192.168.1.x to perform the sync
                  </p>
                )}
              </div>
            </div>
          )}

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
