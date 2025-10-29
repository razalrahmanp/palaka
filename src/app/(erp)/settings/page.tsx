'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Shield } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// All available routes/modules
const ALL_ROUTES = [
  { path: '/dashboard', label: 'Dashboard', module: 'dashboard' },
  { path: '/sales', label: 'Sales', module: 'sales' },
  { path: '/sales/customers', label: 'Customers', module: 'sales' },
  { path: '/sales/orders', label: 'Sales Orders', module: 'sales' },
  { path: '/sales/quotes', label: 'Quotations', module: 'sales' },
  { path: '/inventory', label: 'Inventory', module: 'inventory' },
  { path: '/inventory/products', label: 'Products', module: 'inventory' },
  { path: '/inventory/stock', label: 'Stock Management', module: 'inventory' },
  { path: '/inventory/adjustments', label: 'Adjustments', module: 'inventory' },
  { path: '/manufacturing', label: 'Manufacturing', module: 'manufacturing' },
  { path: '/manufacturing/bom', label: 'Bill of Materials', module: 'manufacturing' },
  { path: '/manufacturing/work-orders', label: 'Work Orders', module: 'manufacturing' },
  { path: '/logistics', label: 'Logistics', module: 'logistics' },
  { path: '/logistics/deliveries', label: 'Deliveries', module: 'logistics' },
  { path: '/logistics/vehicles', label: 'Vehicles', module: 'logistics' },
  { path: '/procurement', label: 'Procurement', module: 'procurement' },
  { path: '/procurement/purchase-orders', label: 'Purchase Orders', module: 'procurement' },
  { path: '/procurement/vendors', label: 'Vendors', module: 'procurement' },
  { path: '/finance', label: 'Finance', module: 'finance' },
  { path: '/finance/invoices', label: 'Invoices', module: 'finance' },
  { path: '/finance/payments', label: 'Payments', module: 'finance' },
  { path: '/hr', label: 'Human Resources', module: 'hr' },
  { path: '/hr/employees', label: 'Employees', module: 'hr' },
  { path: '/hr/attendance', label: 'Attendance', module: 'hr' },
  { path: '/hr/payroll', label: 'Payroll', module: 'hr' },
  { path: '/hr/performance', label: 'Performance', module: 'hr' },
];

// All roles except System Administrator
const CONFIGURABLE_ROLES = [
  'Auditor',
  'Executive',
  'Sales Manager',
  'Sales Representative',
  'Procurement Manager',
  'Warehouse Manager',
  'Warehouse Staff',
  'Production Manager',
  'Production Staff',
  'Logistics Coordinator',
  'Delivery Driver',
  'Finance Manager',
  'HR Manager',
  'HR',
  'Employee',
];

interface RoleAccess {
  role: string;
  accessibleRoutes: string[];
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [roleAccessMap, setRoleAccessMap] = useState<Map<string, string[]>>(new Map());
  const [currentAccess, setCurrentAccess] = useState<string[]>([]);

  const fetchRoleAccess = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/role-access');
      
      if (!response.ok) {
        throw new Error('Failed to fetch role access');
      }

      const data = await response.json();
      const accessMap = new Map<string, string[]>();
      
      data.forEach((item: RoleAccess) => {
        accessMap.set(item.role, item.accessibleRoutes);
      });

      setRoleAccessMap(accessMap);
      
      // Set first role as default
      if (CONFIGURABLE_ROLES.length > 0 && !selectedRole) {
        setSelectedRole(CONFIGURABLE_ROLES[0]);
      }
    } catch (error) {
      console.error('Error fetching role access:', error);
      toast({
        title: 'Error',
        description: 'Failed to load role access configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoleAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedRole) {
      setCurrentAccess(roleAccessMap.get(selectedRole) || []);
    }
  }, [selectedRole, roleAccessMap]);

  const handleToggleRoute = (routePath: string) => {
    setCurrentAccess(prev => {
      if (prev.includes(routePath)) {
        return prev.filter(p => p !== routePath);
      } else {
        return [...prev, routePath];
      }
    });
  };

  const handleSelectAll = () => {
    setCurrentAccess(ALL_ROUTES.map(r => r.path));
  };

  const handleDeselectAll = () => {
    setCurrentAccess([]);
  };

  const handleSave = async () => {
    if (!selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select a role',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch('/api/settings/role-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: selectedRole,
          accessibleRoutes: currentAccess,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save role access');
      }

      // Update local map
      const newMap = new Map(roleAccessMap);
      newMap.set(selectedRole, currentAccess);
      setRoleAccessMap(newMap);

      toast({
        title: 'Success',
        description: `Access configuration saved for ${selectedRole}`,
      });
    } catch (error) {
      console.error('Error saving role access:', error);
      toast({
        title: 'Error',
        description: 'Failed to save role access configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Group routes by module
  const groupedRoutes = ALL_ROUTES.reduce((acc, route) => {
    if (!acc[route.module]) {
      acc[route.module] = [];
    }
    acc[route.module].push(route);
    return acc;
  }, {} as Record<string, typeof ALL_ROUTES>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-3 max-w-[1800px] mx-auto h-screen flex flex-col overflow-hidden">
      {/* Header Section - Compact */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <div className="p-1 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg">
          <Shield className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Role Access Control
          </h1>
          <p className="text-[10px] text-muted-foreground">Configure access permissions for each role</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-2 overflow-hidden">
        {/* Left Column - Configuration (2/3 width) */}
        <div className="xl:col-span-2 flex flex-col overflow-hidden">
          <Card className="border-2 shadow-lg flex-1 flex flex-col overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b py-2 flex-shrink-0">
              <CardTitle className="text-sm">Configure Role Permissions</CardTitle>
              <CardDescription className="text-[10px]">
                Select a role and define which pages they can access
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col py-2 px-3 space-y-2 overflow-hidden">
              {/* Role Selection */}
              <div className="space-y-1 flex-shrink-0">
                <Label htmlFor="role-select" className="text-xs font-semibold">Select Role</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="role-select" className="w-full h-8 text-xs">
                    <SelectValue placeholder="Choose a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONFIGURABLE_ROLES.map(role => (
                      <SelectItem key={role} value={role} className="text-xs py-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                          {role}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Actions */}
              {selectedRole && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded border flex-shrink-0">
                  <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-7 text-[10px] px-2">
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDeselectAll} className="h-7 text-[10px] px-2">
                      Clear All
                    </Button>
                  </div>
                  <div className="text-[10px] font-medium">
                    <span className="text-purple-600 font-bold text-sm">{currentAccess.length}</span>/{ALL_ROUTES.length}
                  </div>
                </div>
              )}

              {/* Route Access - Scrollable */}
              {selectedRole && (
                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 2xl:grid-cols-4 gap-2">
                    {Object.entries(groupedRoutes).map(([module, routes]) => (
                      <Card key={module} className="border shadow-sm">
                        <CardHeader className="pb-1 pt-2 px-2 bg-gray-50">
                          <CardTitle className="text-[10px] font-bold uppercase text-purple-700 flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-purple-500"></div>
                            {module}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-1 pb-2 px-2 space-y-1">
                          {routes.map(route => (
                            <div key={route.path} className="flex items-start space-x-1.5 p-1 rounded hover:bg-purple-50/50">
                              <Checkbox
                                id={route.path}
                                checked={currentAccess.includes(route.path)}
                                onCheckedChange={() => handleToggleRoute(route.path)}
                                className="mt-0.5 h-3 w-3"
                              />
                              <Label htmlFor={route.path} className="text-[10px] font-medium cursor-pointer flex-1 leading-tight">
                                <div className="font-semibold">{route.label}</div>
                                <div className="text-[9px] text-muted-foreground font-mono">{route.path}</div>
                              </Label>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Button */}
              {selectedRole && (
                <div className="flex justify-end pt-2 border-t flex-shrink-0">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 h-8 text-xs px-4"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 h-3 w-3" />
                        Save Configuration
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Summary (1/3 width) */}
        {selectedRole && (
          <div className="xl:col-span-1 flex flex-col overflow-hidden">
            <Card className="border-2 shadow-lg flex-1 flex flex-col overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b py-2 flex-shrink-0">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-green-600" />
                  Access Summary
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Routes for <span className="font-semibold text-foreground">{selectedRole}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2 pb-2 px-3 flex-1 overflow-y-auto">
                {currentAccess.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 mb-2">
                      <Shield className="h-5 w-5 text-gray-400" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">No routes selected</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Select routes to grant access</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                      <span className="text-lg font-bold text-green-600">{currentAccess.length}</span>
                      <span>routes accessible</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currentAccess.sort().map(path => (
                        <span
                          key={path}
                          className="inline-flex items-center px-1.5 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 rounded-full text-[9px] font-medium border border-purple-200"
                        >
                          {path}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
