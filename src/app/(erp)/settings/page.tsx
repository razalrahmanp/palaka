'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  KeyRound, 
  Activity, 
  Settings as SettingsIcon,
  Bell,
  Shield,
  Globe,
  Database,
  Building,
  Save,
  RefreshCw,
  Edit,
  Plus,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { SystemSetting } from '@/types';

const SettingsPage = () => {
  const [settings, setSettings] = useState<Record<string, SystemSetting[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSetting, setSelectedSetting] = useState<SystemSetting | null>(null);
  const [formData, setFormData] = useState({ key: '', value: '', description: '', category: '' });

  // Mock settings data for development
  const mockSettings = {
    general: [
      {
        id: '1',
        key: 'company_name',
        value: '"Al Rams Furniture ERP"',
        category: 'general',
        description: 'Company name displayed throughout the system',
        data_type: 'string' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        key: 'currency',
        value: '"USD"',
        category: 'general',
        description: 'Default currency for financial transactions',
        data_type: 'string' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        key: 'timezone',
        value: '"America/New_York"',
        category: 'general',
        description: 'Default timezone for the application',
        data_type: 'string' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    notifications: [
      {
        id: '4',
        key: 'email_notifications',
        value: 'true',
        category: 'notifications',
        description: 'Enable email notifications for system alerts',
        data_type: 'boolean' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '5',
        key: 'low_stock_threshold',
        value: '10',
        category: 'notifications',
        description: 'Stock level threshold for low stock alerts',
        data_type: 'number' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    security: [
      {
        id: '6',
        key: 'session_timeout',
        value: '3600',
        category: 'security',
        description: 'Session timeout in seconds',
        data_type: 'number' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '7',
        key: 'password_min_length',
        value: '8',
        category: 'security',
        description: 'Minimum password length requirement',
        data_type: 'number' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    integration: [
      {
        id: '8',
        key: 'api_rate_limit',
        value: '1000',
        category: 'integration',
        description: 'API rate limit per hour',
        data_type: 'number' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Mock data for development
      setSettings(mockSettings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
      setSettings(mockSettings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveSetting = async (settingData: Partial<SystemSetting>) => {
    try {
      if (selectedSetting) {
        // Update existing setting
        setSettings(prev => ({
          ...prev,
          [selectedSetting.category]: prev[selectedSetting.category].map(setting =>
            setting.id === selectedSetting.id 
              ? { ...setting, ...settingData, updated_at: new Date().toISOString() }
              : setting
          )
        }));
        toast.success('Setting updated successfully');
      } else {
        // Create new setting
        const newSetting: SystemSetting = {
          id: Date.now().toString(),
          key: settingData.key!,
          value: settingData.value!,
          category: settingData.category!,
          description: settingData.description,
          data_type: 'string',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setSettings(prev => ({
          ...prev,
          [newSetting.category]: [...(prev[newSetting.category] || []), newSetting]
        }));
        toast.success('Setting created successfully');
      }
      
      setIsEditModalOpen(false);
      setSelectedSetting(null);
      setFormData({ key: '', value: '', description: '', category: '' });
    } catch (error) {
      console.error('Error saving setting:', error);
      toast.error('Failed to save setting');
    }
  };

  const handleDeleteSetting = async (setting: SystemSetting) => {
    try {
      setSettings(prev => ({
        ...prev,
        [setting.category]: prev[setting.category].filter(s => s.id !== setting.id)
      }));
      toast.success('Setting deleted successfully');
    } catch (error) {
      console.error('Error deleting setting:', error);
      toast.error('Failed to delete setting');
    }
  };

  const openEditModal = (setting?: SystemSetting) => {
    if (setting) {
      setSelectedSetting(setting);
      setFormData({
        key: setting.key,
        value: JSON.parse(setting.value),
        description: setting.description || '',
        category: setting.category
      });
    } else {
      setSelectedSetting(null);
      setFormData({ key: '', value: '', description: '', category: activeTab });
    }
    setIsEditModalOpen(true);
  };

  const getSettingIcon = (category: string) => {
    switch (category) {
      case 'general': return Building;
      case 'notifications': return Bell;
      case 'security': return Shield;
      case 'integration': return Globe;
      default: return SettingsIcon;
    }
  };

  const renderSettingValue = (setting: SystemSetting) => {
    try {
      const value = JSON.parse(setting.value);
      if (setting.data_type === 'boolean') {
        return <Switch checked={value} disabled />;
      }
      return <span className="text-gray-700">{String(value)}</span>;
    } catch {
      return <span className="text-gray-700">{setting.value}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-slate-600 bg-clip-text text-transparent">
              System Settings
            </h1>
            <p className="text-gray-600 mt-2">Configure system-wide settings and preferences</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-gray-500 to-slate-600 rounded-lg flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-white" />
            </div>
            <Button onClick={fetchSettings} variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm border-white/20">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => openEditModal()} className="bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-700 hover:to-slate-800 text-white shadow-lg">
              <Plus className="h-4 w-4 mr-2" />
              Add Setting
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <User className="h-5 w-5" />
              User & Role Management
            </CardTitle>
            <CardDescription>
              Manage users, assign roles, and define granular permissions for each role to ensure secure access to modules.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm">
              <User className="mr-2 h-4 w-4" />
              Manage Users
            </Button>
            <Button variant="secondary" size="sm">
              <KeyRound className="mr-2 h-4 w-4" />
              Manage Roles
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Activity className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <CardDescription>
              Review system activity logs, track important changes, and monitor overall system health for compliance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white">
              <Activity className="mr-2 h-4 w-4" />
              View Audit Logs
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Database className="h-5 w-5" />
              System Backup
            </CardTitle>
            <CardDescription>
              Manage system backups, schedule automatic backups, and restore from previous backup points.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white">
              <Database className="mr-2 h-4 w-4" />
              Backup Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-100/50">
            <TabsList className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl p-1 grid w-full grid-cols-4 gap-1">
              <TabsTrigger 
                value="general"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-slate-700 data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                General
              </TabsTrigger>
              <TabsTrigger 
                value="notifications"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-slate-700 data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                Notifications
              </TabsTrigger>
              <TabsTrigger 
                value="security"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-slate-700 data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                Security
              </TabsTrigger>
              <TabsTrigger 
                value="integration"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-slate-700 data-[state=active]:text-white rounded-lg transition-all duration-300"
              >
                Integration
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            {Object.entries(settings).map(([category, categorySettings]) => (
              <TabsContent key={category} value={category} className="mt-0">
                <Card className="bg-white/60 backdrop-blur-sm border border-white/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      {React.createElement(getSettingIcon(category), { className: "h-5 w-5" })}
                      {category.charAt(0).toUpperCase() + category.slice(1)} Settings
                      <Badge variant="outline" className="bg-white/80">{categorySettings.length}</Badge>
                    </CardTitle>
                    <CardDescription>
                  Configure {category} settings for your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading settings...</div>
                ) : categorySettings.length === 0 ? (
                  <div className="text-center py-8">
                    <SettingsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No settings found</h3>
                    <p className="text-gray-600 mb-4">Get started by adding your first setting for this category.</p>
                    <Button onClick={() => openEditModal()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Setting
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {categorySettings.map((setting) => (
                      <div key={setting.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900">{setting.key}</h4>
                              <Badge variant="outline" className="text-xs">
                                {setting.data_type}
                              </Badge>
                            </div>
                            <p className="text-gray-600 text-sm mb-2">{setting.description}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Value:</span>
                              {renderSettingValue(setting)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(setting)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteSetting(setting)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
          </div>
        </Tabs>
      </div>

      {/* Edit Setting Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedSetting ? 'Edit Setting' : 'Add New Setting'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="notifications">Notifications</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="key">Setting Key</Label>
              <Input
                id="key"
                value={formData.key}
                onChange={(e) => setFormData(prev => ({ ...prev, key: e.target.value }))}
                placeholder="e.g., company_name"
                disabled={!!selectedSetting}
              />
            </div>
            
            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Enter setting value"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this setting does"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSaveSetting(formData)}
                disabled={!formData.key || !formData.value || !formData.category}
              >
                <Save className="h-4 w-4 mr-2" />
                {selectedSetting ? 'Update' : 'Create'} Setting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
