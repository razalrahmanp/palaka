'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Fingerprint, 
  Plus, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Users, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Link2,
  Trash2,
  AlertCircle,
  Search,
  Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { NetworkDebugModal } from '@/components/ui/NetworkDebugModal';

interface ESSLDevice {
  id: string;
  device_name: string;
  device_serial?: string;
  ip_address: string;
  port: number;
  location?: string;
  device_type: string;
  status: 'active' | 'inactive' | 'error';
  last_connected?: string;
  enrolled_users?: number;
  firmware_version?: string;
  created_at: string;
}

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  essl_device_id?: string;
}

interface DeviceUser {
  userId: string;
  name?: string;
  role?: number;
  cardNumber?: string;
}

interface SyncLog {
  id: string;
  device_id: string;
  sync_type: string;
  sync_status: 'started' | 'completed' | 'failed';
  records_synced?: number;
  records_skipped?: number;
  error_message?: string;
  sync_duration?: number;
  sync_timestamp: string;
  device?: {
    device_name: string;
  };
}

interface NetworkDebugResult {
  success: boolean;
  syncSuccess: boolean;
  deviceInfo?: {
    id: string;
    name: string;
    ip: string;
    port: number;
    reachable: boolean;
  };
  networkInfo?: {
    clientIp: string;
    proxyIps: string[];
    userAgent: string;
    timestamp: string;
  };
  recordsSynced: number;
  errorMessage?: string;
}

export default function ESSLDevicesPage() {
  const [activeTab, setActiveTab] = useState('devices');
  const [devices, setDevices] = useState<ESSLDevice[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [deviceUsers, setDeviceUsers] = useState<DeviceUser[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isEditDeviceOpen, setIsEditDeviceOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<ESSLDevice | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingMappings, setPendingMappings] = useState<Record<string, string>>({});
  
  // Network debug modal state
  const [showNetworkDebug, setShowNetworkDebug] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<NetworkDebugResult | null>(null);

  // New device form
  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    ip_address: '',
    port: 4370,
    location: '',
  });

  // Fetch devices
  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/essl/devices');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();
      console.log('Devices API response:', data);
      console.log('Devices array:', data.devices);
      if (data.devices) {
        console.log('First device structure:', data.devices[0]);
      }
      setDevices(data.devices || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (!response.ok) throw new Error('Failed to fetch employees');
      const data = await response.json();
      console.log('Total employees from API:', data.length);
      // Show all employees regardless of employment status
      setEmployees(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load employees');
    }
  };

  // Fetch sync logs
  const fetchSyncLogs = async () => {
    try {
      const response = await fetch('/api/essl/sync-logs');
      if (!response.ok) throw new Error('Failed to fetch sync logs');
      const data = await response.json();
      setSyncLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load sync logs');
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchEmployees();
    fetchSyncLogs();
  }, []);

  // Test device connection
  const handleTestConnection = async () => {
    if (!deviceForm.ip_address || !deviceForm.port) {
      toast.error('Please enter IP address and port');
      return;
    }

    try {
      setIsTestingConnection(true);
      const response = await fetch('/api/essl/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: deviceForm.ip_address,
          port: deviceForm.port,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Connected! Found ${data.data.enrolledUsers} users, ${data.data.attendanceLogs} attendance logs`);
      } else {
        toast.error(data.error || 'Connection failed');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to test connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Register new device
  const handleRegisterDevice = async () => {
    if (!deviceForm.device_name || !deviceForm.ip_address || !deviceForm.port) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/essl/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceForm),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Device registered successfully');
        setIsAddDeviceOpen(false);
        setDeviceForm({ device_name: '', ip_address: '', port: 4370, location: '' });
        fetchDevices();
      } else {
        toast.error(data.error || 'Failed to register device');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to register device');
    } finally {
      setIsLoading(false);
    }
  };

  // Update existing device
  const handleUpdateDevice = async () => {
    if (!editingDevice) return;
    if (!deviceForm.device_name || !deviceForm.ip_address || !deviceForm.port) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/essl/devices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDevice.id,
          device_name: deviceForm.device_name,
          ip_address: deviceForm.ip_address,
          port: deviceForm.port,
          location: deviceForm.location,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Device updated successfully');
        setIsEditDeviceOpen(false);
        setEditingDevice(null);
        setDeviceForm({ device_name: '', ip_address: '', port: 4370, location: '' });
        fetchDevices();
      } else {
        toast.error(data.error || 'Failed to update device');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update device');
    } finally {
      setIsLoading(false);
    }
  };

  // Open edit dialog
  const handleEditDevice = (device: ESSLDevice) => {
    setEditingDevice(device);
    setDeviceForm({
      device_name: device.device_name,
      ip_address: device.ip_address,
      port: device.port,
      location: device.location || '',
    });
    setIsEditDeviceOpen(true);
  };

  // Fetch device users (enrolled users from device)
  const handleFetchDeviceUsers = async (deviceId: string) => {
    try {
      setIsLoading(true);
      const device = devices.find(d => d.id === deviceId);
      
      if (!device) {
        console.error('Device not found:', deviceId);
        toast.error('Device not found');
        setIsLoading(false);
        return;
      }

      console.log('Fetching users from device:', device);

      const response = await fetch('/api/essl/device-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: device.ip_address,
          port: device.port,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDeviceUsers(data.users);
        setSelectedDevice(deviceId);
        toast.success(`Fetched ${data.users.length} users from device`);
      } else {
        toast.error(data.error || 'Failed to fetch device users');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch device users');
    } finally {
      setIsLoading(false);
    }
  };

  // Map employee to device user
  const handleMapEmployee = async (employeeId: string, deviceUserId: string) => {
    // Optimistic update - update UI immediately
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId 
        ? { ...emp, essl_device_id: deviceUserId || undefined }
        : emp
    ));
    
    try {
      const response = await fetch('/api/hr/employees/map-device-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          device_user_id: deviceUserId,
        }),
      });

      if (response.ok) {
        toast.success('Employee mapped successfully');
        // Refresh to ensure data is in sync
        fetchEmployees();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to map employee');
        // Revert optimistic update on error
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to map employee');
      // Revert optimistic update on error
      fetchEmployees();
    }
  };

  // Sync attendance from device
  const handleSyncAttendance = async (deviceId: string, clearAfterSync: boolean = false) => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/essl/sync-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId,
          clearAfterSync,
        }),
      });

      const data = await response.json();

      // Check actual success from data, not just HTTP status
      if (response.ok && data.success) {
        // Find the device info
        const device = devices.find(d => d.id === deviceId);
        
        // Prepare sync result for network debug modal
        setLastSyncResult({
          success: true,
          syncSuccess: true,
          deviceInfo: device ? {
            id: device.id,
            name: device.device_name,
            ip: device.ip_address,
            port: device.port,
            reachable: true, // Device was reachable since sync succeeded
          } : undefined,
          networkInfo: data.networkInfo,
          recordsSynced: data.stats?.synced || data.synced || 0,
          errorMessage: undefined,
        });
        
        toast.success(
          `Sync completed! ${data.stats?.synced || data.synced || 0} records synced`
        );
        
        // Show network debug modal
        setShowNetworkDebug(true);
        
        fetchSyncLogs();
        fetchDevices();
      } else if (data.deviceUnreachable) {
        // Device unreachable but API returned gracefully with cached data
        const device = devices.find(d => d.id === deviceId);
        
        setLastSyncResult({
          success: false,
          syncSuccess: false,
          deviceInfo: device ? {
            id: device.id,
            name: device.device_name,
            ip: device.ip_address,
            port: device.port,
            reachable: false,
          } : undefined,
          networkInfo: data.networkInfo,
          recordsSynced: 0,
          errorMessage: data.error || 'Device unreachable',
        });
        
        toast.warning(`Device unreachable. ${data.message || 'Using cached data.'}`);
        
        // Show network debug modal
        setShowNetworkDebug(true);
        
        fetchSyncLogs();
        fetchDevices();
      } else {
        // Other failure
        const device = devices.find(d => d.id === deviceId);
        
        setLastSyncResult({
          success: false,
          syncSuccess: false,
          deviceInfo: device ? {
            id: device.id,
            name: device.device_name,
            ip: device.ip_address,
            port: device.port,
            reachable: false,
          } : undefined,
          networkInfo: data.networkInfo,
          recordsSynced: 0,
          errorMessage: data.error || 'Sync failed',
        });
        
        toast.error(data.error || 'Sync failed');
        
        // Show network debug modal
        setShowNetworkDebug(true);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to sync attendance');
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete device
  const handleDeleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this device? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/essl/devices?id=${deviceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Device deleted successfully');
        fetchDevices();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete device');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete device');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Wifi className="h-4 w-4" />;
      case 'inactive': return <WifiOff className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const filteredEmployees = employees.filter(emp =>
    (emp.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (emp.employee_id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  // Get list of mapped device user IDs
  const mappedDeviceUserIds = new Set(employees.map(emp => emp.essl_device_id).filter(Boolean));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              ESSL Biometric Devices
            </h1>
            <p className="text-gray-600 mt-2">Manage biometric devices, sync attendance, and map employees</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Fingerprint className="h-6 w-6 text-white" />
            </div>
            <Button 
              onClick={() => setIsAddDeviceOpen(true)} 
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Fingerprint className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{devices.length}</div>
            <p className="text-xs text-blue-600">Registered devices</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Devices</CardTitle>
            <Wifi className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {devices.filter(d => d.status === 'active').length}
            </div>
            <p className="text-xs text-green-600">Currently online</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Users</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {devices.reduce((sum, d) => sum + (d.enrolled_users || 0), 0)}
            </div>
            <p className="text-xs text-purple-600">Total fingerprints</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mapped Employees</CardTitle>
            <Link2 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {employees.filter(e => e.essl_device_id).length}
            </div>
            <p className="text-xs text-orange-600">Of {employees.length} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="devices">
            <Fingerprint className="h-4 w-4 mr-2" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="mapping">
            <Link2 className="h-4 w-4 mr-2" />
            Employee Mapping
          </TabsTrigger>
          <TabsTrigger value="sync">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Logs
          </TabsTrigger>
        </TabsList>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Devices</CardTitle>
              <CardDescription>Manage your ESSL biometric devices</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading devices...</div>
              ) : devices.length === 0 ? (
                <div className="text-center py-12">
                  <Fingerprint className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No devices found</h3>
                  <p className="text-gray-600 mb-4">Add your first biometric device to get started</p>
                  <Button onClick={() => setIsAddDeviceOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Device
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Name</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrolled Users</TableHead>
                      <TableHead>Last Connected</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{device.device_name}</div>
                            {device.device_serial && (
                              <div className="text-xs text-gray-500">SN: {device.device_serial}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {device.ip_address}:{device.port}
                        </TableCell>
                        <TableCell>{device.location || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(device.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(device.status)}
                              {device.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>{device.enrolled_users || 0}</TableCell>
                        <TableCell>
                          {device.last_connected 
                            ? format(new Date(device.last_connected), 'MMM dd, yyyy HH:mm')
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditDevice(device)}
                              title="Edit Device"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFetchDeviceUsers(device.id)}
                              disabled={isLoading}
                              title="Fetch Users"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSyncAttendance(device.id)}
                              disabled={isSyncing}
                              title="Sync Attendance"
                            >
                              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteDevice(device.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete Device"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Mapping Tab */}
        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee to Device User Mapping</CardTitle>
              <CardDescription>
                Map your employees to device user IDs for attendance sync
                {selectedDevice && deviceUsers.length > 0 && (
                  <span className="block mt-2 text-blue-600">
                    Found {deviceUsers.length} users on device
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Device Selection */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Select Device to Fetch Users</Label>
                  <Select 
                    value={selectedDevice} 
                    onValueChange={(value) => handleFetchDeviceUsers(value)}
                    disabled={isLoading || devices.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        isLoading ? "Loading devices..." : 
                        devices.length === 0 ? "No devices available" : 
                        "Choose a device"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {devices
                        .filter((device) => device.id && device.id.trim() !== '')
                        .map((device) => (
                          <SelectItem key={device.id} value={device.id}>
                            {device.device_name} ({device.ip_address})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Search Employees</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name or employee ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Unmapped Device Users Warning */}
              {deviceUsers.length > 0 && (() => {
                const unmappedUsers = deviceUsers.filter(user => !mappedDeviceUserIds.has(user.userId));
                return unmappedUsers.length > 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-yellow-900 mb-1">
                          {unmappedUsers.length} Unmapped Device User{unmappedUsers.length !== 1 ? 's' : ''}
                        </h4>
                        <p className="text-sm text-yellow-700 mb-2">
                          These fingerprints are enrolled on the device but not mapped to any employee. 
                          Attendance records for these users will be skipped during sync.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {unmappedUsers.slice(0, 10).map(user => (
                            <Badge key={user.userId} variant="outline" className="bg-white text-yellow-800 border-yellow-300">
                              ID: {user.userId} {user.name ? `- ${user.name}` : ''}
                            </Badge>
                          ))}
                          {unmappedUsers.length > 10 && (
                            <Badge variant="outline" className="bg-white text-yellow-800 border-yellow-300">
                              +{unmappedUsers.length - 10} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Mapping Table */}
              {filteredEmployees.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Sl No</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Current Device ID</TableHead>
                      <TableHead>Map to Device User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee, index) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-xs text-gray-500">{employee.employee_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>
                          {employee.essl_device_id ? (
                            <Badge variant="outline">{employee.essl_device_id}</Badge>
                          ) : (
                            <span className="text-gray-400">Not mapped</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {deviceUsers.length > 0 ? (
                            <Select
                              value={pendingMappings[employee.id] || employee.essl_device_id || undefined}
                              onValueChange={(value) => {
                                setPendingMappings(prev => ({
                                  ...prev,
                                  [employee.id]: value === 'UNMAP' ? '' : value
                                }));
                              }}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue placeholder="Select user ID" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UNMAP">Unmap</SelectItem>
                                {deviceUsers.map((user) => {
                                  const isAlreadyMapped = mappedDeviceUserIds.has(user.userId) && 
                                                         employee.essl_device_id !== user.userId;
                                  return (
                                    <SelectItem 
                                      key={user.userId} 
                                      value={user.userId}
                                      disabled={isAlreadyMapped}
                                    >
                                      ID: {user.userId} {user.name ? `- ${user.name}` : ''}
                                      {isAlreadyMapped ? ' (Already mapped)' : ''}
                                      {!mappedDeviceUserIds.has(user.userId) ? ' ⚠️ Unmapped' : ''}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-xs text-gray-500">Select device first</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.essl_device_id ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Mapped
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Unmapped
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {pendingMappings[employee.id] !== undefined && 
                           pendingMappings[employee.id] !== employee.essl_device_id ? (
                            <Button
                              size="sm"
                              onClick={() => {
                                handleMapEmployee(employee.id, pendingMappings[employee.id]);
                                setPendingMappings(prev => {
                                  const updated = { ...prev };
                                  delete updated[employee.id];
                                  return updated;
                                });
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Link2 className="h-3 w-3 mr-1" />
                              Map
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No employees found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Logs Tab */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Sync History</CardTitle>
              <CardDescription>View past synchronization logs and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {syncLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No sync logs found</h3>
                  <p className="text-gray-600">Sync attendance from a device to see logs here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Sync Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Records Synced</TableHead>
                      <TableHead>Records Skipped</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.device?.device_name || 'Unknown Device'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.sync_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            log.sync_status === 'completed' ? 'bg-green-100 text-green-800' :
                            log.sync_status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {log.sync_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            {log.records_synced || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-gray-600">
                            {log.records_skipped || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.sync_duration 
                            ? `${(log.sync_duration / 1000).toFixed(1)}s`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          {format(new Date(log.sync_timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Device Dialog */}
      <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New ESSL Device</DialogTitle>
            <DialogDescription>
              Register a new biometric device to sync attendance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="device_name">Device Name *</Label>
              <Input
                id="device_name"
                placeholder="e.g., Main Office Biometric Scanner"
                value={deviceForm.device_name}
                onChange={(e) => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ip_address">IP Address *</Label>
                <Input
                  id="ip_address"
                  placeholder="192.168.1.71"
                  value={deviceForm.ip_address}
                  onChange={(e) => setDeviceForm({ ...deviceForm, ip_address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="port">Port *</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="4370"
                  value={deviceForm.port}
                  onChange={(e) => setDeviceForm({ ...deviceForm, port: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Front Entrance"
                value={deviceForm.location}
                onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            <Button onClick={handleRegisterDevice} disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Device Dialog */}
      <Dialog open={isEditDeviceOpen} onOpenChange={setIsEditDeviceOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit ESSL Device</DialogTitle>
            <DialogDescription>
              Update device configuration and connection details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit_device_name">Device Name *</Label>
              <Input
                id="edit_device_name"
                placeholder="e.g., Main Office Biometric Scanner"
                value={deviceForm.device_name}
                onChange={(e) => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_ip_address">IP Address *</Label>
                <Input
                  id="edit_ip_address"
                  placeholder="192.168.1.71"
                  value={deviceForm.ip_address}
                  onChange={(e) => setDeviceForm({ ...deviceForm, ip_address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_port">Port *</Label>
                <Input
                  id="edit_port"
                  type="number"
                  placeholder="4370"
                  value={deviceForm.port}
                  onChange={(e) => setDeviceForm({ ...deviceForm, port: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_location">Location</Label>
              <Input
                id="edit_location"
                placeholder="e.g., Front Entrance"
                value={deviceForm.location}
                onChange={(e) => setDeviceForm({ ...deviceForm, location: e.target.value })}
              />
            </div>
            {editingDevice && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Current Serial:</strong> {editingDevice.device_serial || 'Unknown'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Updating the IP/Port will allow you to reconnect to the device
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
            >
              {isTestingConnection ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            <Button onClick={handleUpdateDevice} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Network Debug Modal */}
      {lastSyncResult && (
        <NetworkDebugModal
          isOpen={showNetworkDebug}
          onClose={() => setShowNetworkDebug(false)}
          syncSuccess={lastSyncResult.syncSuccess}
          deviceInfo={lastSyncResult.deviceInfo}
          networkInfo={lastSyncResult.networkInfo}
          errorMessage={lastSyncResult.errorMessage}
          recordsSynced={lastSyncResult.recordsSynced}
        />
      )}
    </div>
  );
}
