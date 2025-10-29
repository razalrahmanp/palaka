'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Search, Filter, Phone, Mail, 
  Calendar, TrendingUp, Facebook, Instagram,
  MessageSquare, CheckCircle, Clock,
  RefreshCw, Download, Eye
} from 'lucide-react';

interface Lead {
  id: string;
  lead_id: string;
  full_name: string;
  email: string;
  phone: string;
  campaign_name?: string;
  platform: 'facebook' | 'instagram' | 'messenger' | 'audience_network';
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'invalid';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  assigned_to?: string;
  form_data?: Record<string, unknown>;
}

export default function LeadsManagementPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | Lead['status']>('all');
  const [filterPlatform, setFilterPlatform] = useState<'all' | Lead['platform']>('all');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterPlatform !== 'all') params.append('platform', filterPlatform);
      
      const response = await fetch(`/api/crm/leads?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLeads(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLeadStatus = async (leadId: string, newStatus: Lead['status']) => {
    try {
      const response = await fetch('/api/crm/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: newStatus })
      });
      
      if (response.ok) {
        fetchLeads(); // Refresh the list
      }
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return Facebook;
      case 'instagram': return Instagram;
      default: return MessageSquare;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-700 border-blue-200',
      contacted: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      qualified: 'bg-purple-100 text-purple-700 border-purple-200',
      converted: 'bg-green-100 text-green-700 border-green-200',
      lost: 'bg-red-100 text-red-700 border-red-200',
      invalid: 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return colors[priority as keyof typeof colors];
  };

  const stats = [
    {
      label: 'Total Leads',
      value: leads.length,
      icon: Users,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      label: 'New Leads',
      value: leads.filter(l => l.status === 'new').length,
      icon: Clock,
      color: 'from-purple-500 to-pink-600'
    },
    {
      label: 'Converted',
      value: leads.filter(l => l.status === 'converted').length,
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-600'
    },
    {
      label: 'Conversion Rate',
      value: leads.length > 0 ? `${Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100)}%` : '0%',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads Management</h1>
          <p className="text-gray-600">Meta Ads leads from Facebook & Instagram</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={fetchLeads}
            disabled={loading}
          >
            {loading ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Refreshing...</>
            ) : (
              <><RefreshCw className="mr-2 h-4 w-4" /> Refresh</>
            )}
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
            <Download className="mr-2 h-4 w-4" />
            Export Leads
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select 
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as typeof filterStatus);
                  fetchLeads();
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
                <option value="invalid">Invalid</option>
              </select>

              <select 
                value={filterPlatform}
                onChange={(e) => {
                  setFilterPlatform(e.target.value as typeof filterPlatform);
                  fetchLeads();
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                aria-label="Filter by platform"
              >
                <option value="all">All Platforms</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="messenger">Messenger</option>
              </select>

              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      {loading ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading leads...</p>
          </CardContent>
        </Card>
      ) : filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600 mb-4">
              {leads.length === 0 
                ? 'No leads have been collected yet. Make sure your Meta Ads webhook is properly configured.' 
                : 'Try adjusting your search or filters'}
            </p>
            {leads.length === 0 && (
              <Button 
                onClick={() => window.location.href = '/crm/settings'}
                className="bg-gradient-to-r from-purple-600 to-blue-600"
              >
                Configure Meta Ads
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLeads.map((lead) => {
            const PlatformIcon = getPlatformIcon(lead.platform);
            return (
              <Card key={lead.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {lead.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{lead.full_name}</h3>
                          <p className="text-sm text-gray-600">{lead.campaign_name || 'No campaign'}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                          <Badge className={getPriorityColor(lead.priority)}>
                            {lead.priority}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                        {lead.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-4 w-4 text-purple-600" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-4 w-4 text-purple-600" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <PlatformIcon className="h-4 w-4 text-purple-600" />
                          <span className="capitalize">{lead.platform}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <Calendar className="h-4 w-4" />
                        <span>Received: {new Date(lead.created_at).toLocaleString()}</span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Phone className="h-4 w-4 mr-1" />
                            Call
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          {lead.status === 'new' && (
                            <Button 
                              size="sm" 
                              onClick={() => updateLeadStatus(lead.id, 'contacted')}
                              className="bg-gradient-to-r from-yellow-500 to-orange-500"
                            >
                              Mark Contacted
                            </Button>
                          )}
                          {lead.status === 'contacted' && (
                            <Button 
                              size="sm" 
                              onClick={() => updateLeadStatus(lead.id, 'qualified')}
                              className="bg-gradient-to-r from-purple-500 to-pink-500"
                            >
                              Mark Qualified
                            </Button>
                          )}
                          {(lead.status === 'qualified' || lead.status === 'contacted') && (
                            <Button 
                              size="sm" 
                              onClick={() => updateLeadStatus(lead.id, 'converted')}
                              className="bg-gradient-to-r from-green-500 to-emerald-500"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Convert
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
