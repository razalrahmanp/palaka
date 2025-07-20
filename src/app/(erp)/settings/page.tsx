'use client'
import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Building, 
  Users, 
  Shield, 
  Database, 
  Mail, 
  Printer,
  Save,
  RefreshCw
} from 'lucide-react'
import { hasPermission } from '@/lib/auth'

interface CompanySettings {
  name: string
  address: string
  phone: string
  email: string
  website: string
  logo: string
  taxId: string
  currency: string
  timezone: string
}

interface SystemSettings {
  maintenanceMode: boolean
  backupInterval: string
  sessionTimeout: number
  maxUsers: number
  emailNotifications: boolean
  smsNotifications: boolean
  auditLogging: boolean
}

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('company')
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'Al Rams Furniture ERP',
    address: '123 Furniture Street, City, Country',
    phone: '+1 (555) 123-4567',
    email: 'info@alramsfurniture.com',
    website: 'www.alramsfurniture.com',
    logo: '',
    taxId: 'TAX-123456789',
    currency: 'USD',
    timezone: 'UTC'
  })

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    backupInterval: 'daily',
    sessionTimeout: 30,
    maxUsers: 100,
    emailNotifications: true,
    smsNotifications: false,
    auditLogging: true
  })

  const [saving, setSaving] = useState(false)

  const handleSave = async (settingsType: string) => {
    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log(`Saving ${settingsType} settings...`)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  // Check permissions
  const canManageUsers = hasPermission('user:manage')
  const canManageSystem = hasPermission('user:manage')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure your ERP system settings</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Settings className="h-4 w-4 mr-2" />
          System Configuration
        </Badge>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2" disabled={!canManageUsers}>
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2" disabled={!canManageSystem}>
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2" disabled={!canManageSystem}>
            <Database className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={companySettings.name}
                    onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    value={companySettings.taxId}
                    onChange={(e) => setCompanySettings({...companySettings, taxId: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={companySettings.address}
                    onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={companySettings.phone}
                    onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companySettings.email}
                    onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={companySettings.website}
                    onChange={(e) => setCompanySettings({...companySettings, website: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={companySettings.currency} onValueChange={(value) => 
                    setCompanySettings({...companySettings, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => handleSave('company')} disabled={saving}>
                {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Company Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6">
          {canManageUsers ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-16 w-16 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">User Management</h3>
                  <p>Advanced user management features will be implemented here</p>
                  <Button className="mt-4">Manage Users</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Shield className="mx-auto h-16 w-16 mb-4 opacity-50 text-red-500" />
                <h3 className="text-lg font-medium mb-2">Access Denied</h3>
                <p className="text-gray-600">You don&apos;t have permission to manage users</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          {canManageSystem ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      className="w-20"
                      value={systemSettings.sessionTimeout}
                      onChange={(e) => setSystemSettings({...systemSettings, sessionTimeout: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auditLogging">Audit Logging</Label>
                    <Switch
                      id="auditLogging"
                      checked={systemSettings.auditLogging}
                      onCheckedChange={(checked: boolean) => setSystemSettings({...systemSettings, auditLogging: checked})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <Switch
                      id="emailNotifications"
                      checked={systemSettings.emailNotifications}
                      onCheckedChange={(checked: boolean) => setSystemSettings({...systemSettings, emailNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <Switch
                      id="smsNotifications"
                      checked={systemSettings.smsNotifications}
                      onCheckedChange={(checked: boolean) => setSystemSettings({...systemSettings, smsNotifications: checked})}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Shield className="mx-auto h-16 w-16 mb-4 opacity-50 text-red-500" />
                <h3 className="text-lg font-medium mb-2">Access Denied</h3>
                <p className="text-gray-600">You don&apos;t have permission to access security settings</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-6">
          {canManageSystem ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    System Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                    <Switch
                      id="maintenanceMode"
                      checked={systemSettings.maintenanceMode}
                      onCheckedChange={(checked: boolean) => setSystemSettings({...systemSettings, maintenanceMode: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maxUsers">Max Concurrent Users</Label>
                    <Input
                      id="maxUsers"
                      type="number"
                      className="w-20"
                      value={systemSettings.maxUsers}
                      onChange={(e) => setSystemSettings({...systemSettings, maxUsers: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="backupInterval">Backup Interval</Label>
                    <Select value={systemSettings.backupInterval} onValueChange={(value) => 
                      setSystemSettings({...systemSettings, backupInterval: value})}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="h-5 w-5" />
                    Hardware Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>TSC Barcode Printer</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-green-600 border-green-600">Connected</Badge>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Receipt Printer</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-gray-600 border-gray-600">Not Connected</Badge>
                      <Button variant="outline" size="sm">Setup</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Database className="mx-auto h-16 w-16 mb-4 opacity-50 text-red-500" />
                <h3 className="text-lg font-medium mb-2">Access Denied</h3>
                <p className="text-gray-600">You don&apos;t have permission to access system settings</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsPage
