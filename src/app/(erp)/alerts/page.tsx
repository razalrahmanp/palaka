'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertCircle, AlertTriangle, Info, CheckCircle, Bell, Search, Filter, Eye, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Alert } from '@/types';

// Priority icons mapping
const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'medium':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'low':
      return <Info className="h-4 w-4 text-blue-500" />;
    default:
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

// Status badge styles
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'unread':
      return <Badge variant="destructive">Unread</Badge>;
    case 'read':
      return <Badge variant="secondary">Read</Badge>;
    case 'resolved':
      return <Badge variant="outline" className="border-green-500 text-green-500">Resolved</Badge>;
    case 'archived':
      return <Badge variant="outline">Archived</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Type badge styles
const getTypeBadge = (type: string) => {
  const colors = {
    inventory: 'bg-blue-100 text-blue-800',
    sales: 'bg-green-100 text-green-800',
    procurement: 'bg-purple-100 text-purple-800',
    hr: 'bg-orange-100 text-orange-800',
    finance: 'bg-red-100 text-red-800',
    system: 'bg-gray-100 text-gray-800',
    manufacturing: 'bg-indigo-100 text-indigo-800',
  };
  
  return (
    <Badge variant="outline" className={colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </Badge>
  );
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Fetch alerts from API
  const fetchAlerts = async (filters: { type?: string; priority?: string; status?: string } = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.priority && filters.priority !== 'all') params.append('priority', filters.priority);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      
      const response = await fetch(`/api/alerts?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      
      const data = await response.json();
      setAlerts(data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, []);

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    fetchAlerts({ 
      type: value === 'all' ? undefined : value,
      priority: selectedPriority === 'all' ? undefined : selectedPriority,
      status: selectedStatus === 'all' ? undefined : selectedStatus
    });
  };

  // Handle filter change
  const handleFilterChange = () => {
    fetchAlerts({
      type: activeTab === 'all' ? undefined : activeTab,
      priority: selectedPriority === 'all' ? undefined : selectedPriority,
      status: selectedStatus === 'all' ? undefined : selectedStatus
    });
  };

  // Mark alert as read
  const markAsRead = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'read' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update alert');
      }

      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, status: 'read' } : alert
      ));
      
      toast.success('Alert marked as read');
    } catch (error) {
      console.error('Error updating alert:', error);
      toast.error('Failed to update alert');
    }
  };

  // Mark alert as resolved
  const markAsResolved = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'resolved' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update alert');
      }

      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, status: 'resolved' } : alert
      ));
      
      toast.success('Alert marked as resolved');
    } catch (error) {
      console.error('Error updating alert:', error);
      toast.error('Failed to update alert');
    }
  };

  // Filter alerts based on search term
  const filteredAlerts = alerts.filter(alert =>
    alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get alert counts by type for tabs
  const getAlertCounts = () => {
    const counts = {
      all: alerts.length,
      inventory: alerts.filter(a => a.type === 'inventory').length,
      sales: alerts.filter(a => a.type === 'sales').length,
      procurement: alerts.filter(a => a.type === 'procurement').length,
      hr: alerts.filter(a => a.type === 'hr').length,
      finance: alerts.filter(a => a.type === 'finance').length,
      system: alerts.filter(a => a.type === 'system').length,
    };
    return counts;
  };

  const alertCounts = getAlertCounts();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
              System Alerts
            </h1>
            <p className="text-gray-600 mt-2">Monitor and manage system alerts and notifications</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <Button onClick={() => fetchAlerts()} className="bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white shadow-lg">
              <Bell className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </h2>
          <p className="text-gray-600">Filter and search through system alerts</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedPriority} onValueChange={(value) => {
              setSelectedPriority(value);
              setTimeout(handleFilterChange, 0);
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={(value) => {
              setSelectedStatus(value);
              setTimeout(handleFilterChange, 0);
            }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
        </div>
      </div>

      {/* Alert Tabs */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <div className="bg-gradient-to-r from-red-50 to-rose-50 px-6 py-4 border-b border-red-100/50">
            <TabsList className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-xl p-1 grid w-full grid-cols-7 gap-1">
              <TabsTrigger 
                value="all"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs"
              >
                All ({alertCounts.all})
              </TabsTrigger>
              <TabsTrigger 
                value="inventory"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs"
              >
                Inventory ({alertCounts.inventory})
              </TabsTrigger>
              <TabsTrigger 
                value="sales"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs"
              >
                Sales ({alertCounts.sales})
              </TabsTrigger>
              <TabsTrigger 
                value="procurement"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs"
              >
                Procurement ({alertCounts.procurement})
              </TabsTrigger>
              <TabsTrigger 
                value="hr"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs"
              >
                HR ({alertCounts.hr})
              </TabsTrigger>
              <TabsTrigger 
                value="finance"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs"
              >
                Finance ({alertCounts.finance})
              </TabsTrigger>
              <TabsTrigger 
                value="system"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-rose-600 data-[state=active]:text-white rounded-lg transition-all duration-300 text-xs"
              >
                System ({alertCounts.system})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            {/* Alert List */}
            <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Alerts</h3>
                <p className="text-muted-foreground text-center">
                  {searchTerm ? 'No alerts match your search criteria.' : 'All clear! No alerts at this time.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => (
                <Card key={alert.id} className={`transition-all hover:shadow-md ${
                  alert.status === 'unread' ? 'border-l-4 border-l-primary' : ''
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getPriorityIcon(alert.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{alert.title}</h3>
                            {getTypeBadge(alert.type)}
                            {getStatusBadge(alert.status)}
                          </div>
                          <p className="text-gray-600 mb-3">{alert.message}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {format(new Date(alert.created_at), 'PPpp')}
                            {alert.source && (
                              <span className="ml-4">Source: {alert.source}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedAlert(alert)}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                {getPriorityIcon(alert.priority)}
                                {alert.title}
                              </DialogTitle>
                              <DialogDescription>
                                Alert Details and Actions
                              </DialogDescription>
                            </DialogHeader>
                            {selectedAlert && (
                              <div className="space-y-6">
                                <div className="flex gap-2">
                                  {getTypeBadge(selectedAlert.type)}
                                  {getStatusBadge(selectedAlert.status)}
                                  <Badge variant="outline">{selectedAlert.priority} priority</Badge>
                                </div>
                                
                                <div>
                                  <h4 className="font-semibold mb-2">Message</h4>
                                  <p className="text-gray-600">{selectedAlert.message}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-semibold">Created:</span>
                                    <p>{format(new Date(selectedAlert.created_at), 'PPpp')}</p>
                                  </div>
                                  <div>
                                    <span className="font-semibold">Source:</span>
                                    <p>{selectedAlert.source || 'N/A'}</p>
                                  </div>
                                </div>

                                {selectedAlert.metadata && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Additional Details</h4>
                                    <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto">
                                      {JSON.stringify(selectedAlert.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                <div className="flex gap-2 pt-4 border-t">
                                  {selectedAlert.status === 'unread' && (
                                    <Button 
                                      variant="outline" 
                                      onClick={() => markAsRead(selectedAlert.id)}
                                    >
                                      Mark as Read
                                    </Button>
                                  )}
                                  {selectedAlert.status !== 'resolved' && (
                                    <Button 
                                      onClick={() => markAsResolved(selectedAlert.id)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Mark as Resolved
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        
                        {alert.status === 'unread' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => markAsRead(alert.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                        {alert.status !== 'resolved' && (
                          <Button 
                            size="sm"
                            onClick={() => markAsResolved(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
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
          </div>
        </Tabs>
      </div>
    </div>
  );
}
