'use client';

import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Search, 
  DollarSign,
  TrendingUp,
  Eye,
  MousePointerClick,
  Users,
  CheckCircle2,
  Pause,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  Calendar,
  Target,
  Phone,
  Mail,
  UserPlus
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface MetaCampaign {
  id: string;
  name: string;
  objective: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'multi';
  start_time: string;
  end_time: string | null;
  daily_budget: number;
  lifetime_budget: number | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  leads_count: number;
  created_at: string;
  updated_at: string;
}

interface MetaLead {
  id: string;
  meta_lead_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  campaign_name: string;
  campaign_id: string;
  adset_name: string;
  ad_name: string;
  form_name: string;
  platform: 'facebook' | 'instagram' | 'whatsapp';
  created_time: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
}

export default function MetaCampaignsPage() {
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<MetaCampaign | null>(null);
  const [campaignLeads, setCampaignLeads] = useState<MetaLead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);

  // Fetch campaigns from database on component mount
  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('meta_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching campaigns:', error);
        return;
      }

      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncFromMeta = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/crm/meta-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync_type: 'campaigns' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Sync completed! Created: ${data.summary.records_created}, Updated: ${data.summary.records_updated}`);
        // Reload campaigns from database
        await fetchCampaigns();
      } else {
        alert(`Sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert('Failed to sync campaigns. Please check your Meta API credentials in .env file.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleViewDetails = async (campaign: MetaCampaign) => {
    setSelectedCampaign(campaign);
    setIsLoadingLeads(true);
    
    try {
      // Fetch leads for this campaign
      const { data, error } = await supabase
        .from('meta_leads')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('created_time', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        setCampaignLeads([]);
      } else {
        setCampaignLeads(data || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setCampaignLeads([]);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const closeModal = () => {
    setSelectedCampaign(null);
    setCampaignLeads([]);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      ACTIVE: 'bg-green-100 text-green-800 border-green-300',
      PAUSED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      ARCHIVED: 'bg-gray-100 text-gray-800 border-gray-300',
      DELETED: 'bg-red-100 text-red-800 border-red-300'
    };
    const icons = {
      ACTIVE: <CheckCircle2 className="h-3 w-3" />,
      PAUSED: <Pause className="h-3 w-3" />,
      ARCHIVED: <AlertCircle className="h-3 w-3" />,
      DELETED: <AlertCircle className="h-3 w-3" />
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${badges[status as keyof typeof badges]}`}>
        {icons[status as keyof typeof icons]}
        {status}
      </span>
    );
  };

  const getPlatformBadge = (platform: string) => {
    const badges = {
      facebook: 'bg-blue-100 text-blue-800 border-blue-300',
      instagram: 'bg-pink-100 text-pink-800 border-pink-300',
      whatsapp: 'bg-green-100 text-green-800 border-green-300',
      multi: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${badges[platform as keyof typeof badges]}`}>
        {platform.toUpperCase()}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    const matchesPlatform = platformFilter === 'all' || campaign.platform === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const totalStats = campaigns.reduce((acc, campaign) => ({
    spend: acc.spend + campaign.spend,
    impressions: acc.impressions + campaign.impressions,
    clicks: acc.clicks + campaign.clicks,
    leads: acc.leads + campaign.leads_count,
    conversions: acc.conversions + campaign.conversions
  }), { spend: 0, impressions: 0, clicks: 0, leads: 0, conversions: 0 });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-blue-600" />
            Meta Campaigns
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor your Facebook, Instagram & WhatsApp advertising campaigns
          </p>
        </div>
        <button 
          onClick={handleSyncFromMeta}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync from Meta'}
        </button>
      </div>

      {/* Info Banner about Leads */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Understanding Lead Metrics
            </h3>
            <p className="text-sm text-blue-800 mb-2">
              The &ldquo;Leads&rdquo; count shows aggregated metrics from Meta. Only <strong>OUTCOME_LEADS</strong> campaigns with lead forms can capture actual contact information.
            </p>
            <div className="text-xs text-blue-700 space-y-1">
              <div>• <strong>Lead Form Ads:</strong> Collect structured data (name, email, phone) - retrievable via API</div>
              <div>• <strong>Click to WhatsApp Ads:</strong> Direct users to chat - messages not stored as leads</div>
              <div>• <strong>Engagement/Awareness Ads:</strong> Drive clicks and views - no lead data captured</div>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              💡 To view actual leads with contact info, go to <strong>Meta Leads</strong> page and click &ldquo;Sync from Meta&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <DollarSign className="h-4 w-4" />
            Total Spend
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalStats.spend)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <Eye className="h-4 w-4" />
            Impressions
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(totalStats.impressions)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <MousePointerClick className="h-4 w-4" />
            Clicks
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(totalStats.clicks)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <Users className="h-4 w-4" />
            Leads
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(totalStats.leads)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <TrendingUp className="h-4 w-4" />
            Conversions
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(totalStats.conversions)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="ARCHIVED">Archived</option>
            <option value="DELETED">Deleted</option>
          </select>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filter by platform"
          >
            <option value="all">All Platforms</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="multi">Multi-Platform</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Impressions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clicks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CTR
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Leads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                      <p className="text-lg font-medium">Loading campaigns...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <Megaphone className="h-12 w-12 text-gray-300" />
                      <p className="text-lg font-medium">No campaigns found</p>
                      <p className="text-sm">Click &quot;Sync from Meta&quot; button above to import your campaigns</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500">{campaign.objective}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getPlatformBadge(campaign.platform)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(campaign.daily_budget)}/day
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{formatCurrency(campaign.spend)}</div>
                        {campaign.lifetime_budget && (
                          <div className="text-xs text-gray-500">
                            of {formatCurrency(campaign.lifetime_budget)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatNumber(campaign.impressions)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatNumber(campaign.clicks)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {campaign.ctr.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-gray-900">{campaign.leads_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleViewDetails(campaign)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedCampaign.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(selectedCampaign.status)}
                  {getPlatformBadge(selectedCampaign.platform)}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Campaign Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Campaign Metrics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Total Spend</div>
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(selectedCampaign.spend)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Impressions</div>
                    <div className="text-xl font-bold text-gray-900">{formatNumber(selectedCampaign.impressions)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Clicks</div>
                    <div className="text-xl font-bold text-gray-900">{formatNumber(selectedCampaign.clicks)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">CTR</div>
                    <div className="text-xl font-bold text-gray-900">{selectedCampaign.ctr.toFixed(2)}%</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">CPC</div>
                    <div className="text-xl font-bold text-gray-900">{formatCurrency(selectedCampaign.cpc)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Leads</div>
                    <div className="text-xl font-bold text-blue-600">{selectedCampaign.leads_count}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Conversions</div>
                    <div className="text-xl font-bold text-green-600">{selectedCampaign.conversions}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-600 mb-1">Objective</div>
                    <div className="text-sm font-medium text-gray-900">{selectedCampaign.objective}</div>
                  </div>
                </div>
              </div>

              {/* Campaign Details */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Campaign Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Daily Budget</div>
                    <div className="font-medium text-gray-900">{formatCurrency(selectedCampaign.daily_budget)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Lifetime Budget</div>
                    <div className="font-medium text-gray-900">
                      {selectedCampaign.lifetime_budget ? formatCurrency(selectedCampaign.lifetime_budget) : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Start Time</div>
                    <div className="font-medium text-gray-900">
                      {new Date(selectedCampaign.start_time).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">End Time</div>
                    <div className="font-medium text-gray-900">
                      {selectedCampaign.end_time ? new Date(selectedCampaign.end_time).toLocaleDateString() : 'Ongoing'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Leads Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  Leads ({campaignLeads.length})
                </h3>
                
                {isLoadingLeads ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  </div>
                ) : campaignLeads.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-yellow-900 mb-2">No Leads Found</h4>
                        {selectedCampaign.objective === 'OUTCOME_LEADS' ? (
                          <div className="text-sm text-yellow-800 space-y-2">
                            <p>This is a lead generation campaign, but no leads are currently available.</p>
                            <p className="font-medium">Possible reasons:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              <li>Leads haven&apos;t been synced yet - go to Meta Leads page and click &ldquo;Sync from Meta&rdquo;</li>
                              <li>Lead form is not attached to the ads</li>
                              <li>Leads are older than 90 days (Meta deletes old leads)</li>
                              <li>Campaign hasn&apos;t generated any form submissions yet</li>
                            </ul>
                          </div>
                        ) : (
                          <div className="text-sm text-yellow-800 space-y-2">
                            <p>This is a <strong>{selectedCampaign.objective.replace('OUTCOME_', '')}</strong> campaign.</p>
                            <p>These campaigns don&apos;t capture lead forms. They focus on:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                              {selectedCampaign.objective === 'OUTCOME_ENGAGEMENT' && (
                                <>
                                  <li>Post engagement (likes, comments, shares)</li>
                                  <li>Click to WhatsApp/Messenger conversations</li>
                                  <li>Video views and interactions</li>
                                </>
                              )}
                              {selectedCampaign.objective === 'OUTCOME_AWARENESS' && (
                                <>
                                  <li>Brand awareness and reach</li>
                                  <li>Impressions and visibility</li>
                                  <li>Building audience recognition</li>
                                </>
                              )}
                              {selectedCampaign.objective === 'OUTCOME_SALES' && (
                                <>
                                  <li>Website conversions and purchases</li>
                                  <li>Product catalog sales</li>
                                  <li>E-commerce transactions</li>
                                </>
                              )}
                            </ul>
                            <p className="font-medium mt-2">💡 To collect contact information, create a campaign with OUTCOME_LEADS objective and attach a lead form.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {campaignLeads.map((lead) => (
                      <div key={lead.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900">{lead.full_name || 'Unnamed Lead'}</h4>
                            <div className="text-xs text-gray-500">
                              {new Date(lead.created_time).toLocaleString()}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                            lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                            lead.status === 'qualified' ? 'bg-purple-100 text-purple-800' :
                            lead.status === 'converted' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {lead.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="h-4 w-4" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs text-gray-500">
                            Ad: {lead.ad_name || 'Unknown'} | Form: {lead.form_name || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
