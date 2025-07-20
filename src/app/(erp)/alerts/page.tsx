'use client'
import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Search,
  RefreshCw,
  Package,
  TrendingDown,
  Calendar,
  AlertCircle,
  Users,
  DollarSign
} from 'lucide-react'
import { hasPermission } from '@/lib/auth'

interface Alert {
  id: string
  type: 'inventory' | 'production' | 'sales' | 'system' | 'hr' | 'finance'
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'new' | 'acknowledged' | 'resolved'
  timestamp: Date
  assignedTo?: string
  source: string
}

const AlertsPage = () => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  // Mock alerts data - in real app, this would come from API
  useEffect(() => {
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'inventory',
        title: 'Low Stock Alert',
        message: 'Office Chair - Model ABC123 stock is below reorder point (5 units remaining)',
        priority: 'high',
        status: 'new',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        source: 'Inventory Management',
      },
      {
        id: '2',
        type: 'production',
        title: 'Production Delay',
        message: 'Work Order #WO-2024-001 is behind schedule by 2 days',
        priority: 'medium',
        status: 'acknowledged',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        source: 'Manufacturing',
        assignedTo: 'Production Manager'
      },
      {
        id: '3',
        type: 'sales',
        title: 'High Value Order',
        message: 'New sales order from ABC Corp worth $50,000 requires approval',
        priority: 'high',
        status: 'new',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        source: 'Sales Management',
      },
      {
        id: '4',
        type: 'system',
        title: 'Database Backup Complete',
        message: 'Daily database backup completed successfully',
        priority: 'low',
        status: 'resolved',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        source: 'System',
      },
      {
        id: '5',
        type: 'hr',
        title: 'Performance Review Due',
        message: '5 employee performance reviews are due this week',
        priority: 'medium',
        status: 'new',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        source: 'Human Resources',
      },
      {
        id: '6',
        type: 'finance',
        title: 'Invoice Overdue',
        message: 'Invoice INV-2024-0123 is 15 days overdue ($15,230)',
        priority: 'critical',
        status: 'new',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        source: 'Finance',
      }
    ]
    setAlerts(mockAlerts)
    setLoading(false)
  }, [])

  // Filter alerts based on search, priority, and status
  useEffect(() => {
    let filtered = alerts

    if (activeTab !== 'all') {
      filtered = filtered.filter(alert => alert.type === activeTab)
    }

    if (searchTerm) {
      filtered = filtered.filter(alert => 
        alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(alert => alert.priority === filterPriority)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(alert => alert.status === filterStatus)
    }

    setFilteredAlerts(filtered)
  }, [alerts, activeTab, searchTerm, filterPriority, filterStatus])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'resolved': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inventory': return <Package className="h-4 w-4" />
      case 'production': return <TrendingDown className="h-4 w-4" />
      case 'sales': return <DollarSign className="h-4 w-4" />
      case 'system': return <AlertCircle className="h-4 w-4" />
      case 'hr': return <Users className="h-4 w-4" />
      case 'finance': return <DollarSign className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const handleStatusChange = (alertId: string, newStatus: 'acknowledged' | 'resolved') => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, status: newStatus } : alert
    ))
  }

  const alertCounts = {
    all: alerts.length,
    inventory: alerts.filter(a => a.type === 'inventory').length,
    production: alerts.filter(a => a.type === 'production').length,
    sales: alerts.filter(a => a.type === 'sales').length,
    system: alerts.filter(a => a.type === 'system').length,
    hr: alerts.filter(a => a.type === 'hr').length,
    finance: alerts.filter(a => a.type === 'finance').length,
  }

  const newAlertsCount = alerts.filter(a => a.status === 'new').length
  const criticalAlertsCount = alerts.filter(a => a.priority === 'critical').length

  if (!hasPermission('analytics:read')) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="mx-auto h-16 w-16 mb-4 opacity-50 text-red-500" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-gray-600">You don&apos;t have permission to view system alerts</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Alerts</h1>
          <p className="text-gray-600">Monitor and manage system notifications</p>
        </div>
        <div className="flex items-center gap-4">
          {criticalAlertsCount > 0 && (
            <Badge variant="destructive" className="px-3 py-1">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {criticalAlertsCount} Critical
            </Badge>
          )}
          <Badge variant="outline" className="px-3 py-1">
            <Bell className="h-4 w-4 mr-2" />
            {newAlertsCount} New
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Alerts</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Critical</p>
                <p className="text-2xl font-bold">{criticalAlertsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{newAlertsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold">{alerts.filter(a => a.status === 'resolved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="acknowledged">Acknowledged</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alert Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">All ({alertCounts.all})</TabsTrigger>
          <TabsTrigger value="inventory">Inventory ({alertCounts.inventory})</TabsTrigger>
          <TabsTrigger value="production">Production ({alertCounts.production})</TabsTrigger>
          <TabsTrigger value="sales">Sales ({alertCounts.sales})</TabsTrigger>
          <TabsTrigger value="hr">HR ({alertCounts.hr})</TabsTrigger>
          <TabsTrigger value="finance">Finance ({alertCounts.finance})</TabsTrigger>
          <TabsTrigger value="system">System ({alertCounts.system})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="text-center py-12">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                <p className="mt-4 text-gray-600">Loading alerts...</p>
              </CardContent>
            </Card>
          ) : filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="mx-auto h-16 w-16 mb-4 opacity-50 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No alerts found</h3>
                <p className="text-gray-600">No alerts match your current filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id} className={`${alert.priority === 'critical' ? 'border-red-200 bg-red-50' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getTypeIcon(alert.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{alert.title}</h3>
                            <Badge className={getPriorityColor(alert.priority)}>
                              {alert.priority.toUpperCase()}
                            </Badge>
                            <Badge className={getStatusColor(alert.status)}>
                              {alert.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-gray-700 mb-3">{alert.message}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {formatTime(alert.timestamp)}
                            </div>
                            <div>Source: {alert.source}</div>
                            {alert.assignedTo && <div>Assigned: {alert.assignedTo}</div>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.status === 'new' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(alert.id, 'acknowledged')}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(alert.id, 'resolved')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AlertsPage

