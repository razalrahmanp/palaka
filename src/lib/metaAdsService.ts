/**
 * Meta Ads Service
 * Fetches campaigns, ads, and leads from Facebook, Instagram, and WhatsApp
 * via Meta Graph API
 */

interface MetaCampaign {
  id: string;
  account_id: string;
  name: string;
  objective: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  end_time?: string;
  stop_time?: string;
  configured_status?: string;
  effective_status?: string;
  insights?: {
    spend: string;
    impressions: string;
    reach: string;
    clicks: string;
    ctr: string;
    cpc: string;
    cpm: string;
  };
}

interface MetaLead {
  id: string;
  created_time: string;
  ad_id: string;
  ad_name?: string;
  adset_id: string;
  adset_name?: string;
  campaign_id: string;
  campaign_name?: string;
  form_id: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
  platform: string;
}

export class MetaAdsService {
  private accessToken: string;
  private adAccountId: string;
  private apiVersion: string = 'v19.0';
  private baseUrl: string = 'https://graph.facebook.com';

  constructor(accessToken?: string, adAccountId?: string) {
    this.accessToken = accessToken || process.env.META_ACCESS_TOKEN || '';
    this.adAccountId = adAccountId || process.env.META_AD_ACCOUNT_ID || '';
    
    if (!this.accessToken || !this.adAccountId) {
      console.warn('⚠️  Meta API credentials not configured!');
      console.warn('📝 Follow these steps:');
      console.warn('   1. Go to: https://developers.facebook.com/tools/explorer/');
      console.warn('   2. Generate Access Token with permissions: ads_read, ads_management, leads_retrieval');
      console.warn('   3. Find Ad Account ID from Ads Manager URL (numbers after "act=")');
      console.warn('   4. Add to .env.local file:');
      console.warn('      META_ACCESS_TOKEN=your_token_here (NO quotes)');
      console.warn('      META_AD_ACCOUNT_ID=123456789 (numbers only)');
      console.warn('   5. Restart server: npm run dev');
      console.warn('📚 See: docs/QUICK_FIX_META_CREDENTIALS.md');
    }
  }

  /**
   * Fetch all campaigns from Meta Ad Account
   */
  async fetchCampaigns(filters?: {
    status?: string[];
    startDate?: string;
    endDate?: string;
  }): Promise<MetaCampaign[]> {
    if (!this.accessToken || !this.adAccountId) {
      throw new Error('Meta API credentials not configured');
    }

    try {
      const fields = [
        'id',
        'account_id',
        'name',
        'objective',
        'status',
        'configured_status',
        'effective_status',
        'daily_budget',
        'lifetime_budget',
        'start_time',
        'stop_time',
        'created_time',
        'updated_time'
      ].join(',');

      // Build URL with filters
      let url = `${this.baseUrl}/${this.apiVersion}/act_${this.adAccountId}/campaigns`;
      const params = new URLSearchParams({
        access_token: this.accessToken,
        fields: fields,
        limit: '100'
      });

      // Note: Meta API doesn't support filtering by 'status' field
      // We'll filter in memory after fetching all campaigns
      // If you need to filter by effective_status, use that instead

      url += '?' + params.toString();

      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Meta API Error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      let campaigns = data.data || [];

      // Apply status filter in memory if provided
      if (filters?.status && filters.status.length > 0) {
        campaigns = campaigns.filter((campaign: MetaCampaign) => 
          filters.status?.includes(campaign.status)
        );
      }

      // Fetch insights (performance metrics) for each campaign
      const campaignsWithInsights = await Promise.all(
        campaigns.map(async (campaign: MetaCampaign) => {
          const insights = await this.fetchCampaignInsights(campaign.id, filters?.startDate, filters?.endDate);
          return {
            ...campaign,
            insights
          };
        })
      );

      return campaignsWithInsights;
    } catch (error) {
      console.error('Error fetching Meta campaigns:', error);
      throw error;
    }
  }

  /**
   * Fetch performance insights for a specific campaign
   */
  async fetchCampaignInsights(
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const fields = [
        'spend',
        'impressions',
        'reach',
        'clicks',
        'ctr',
        'cpc',
        'cpm',
        'actions',
        'action_values',
        'cost_per_action_type'
      ].join(',');

      const params = new URLSearchParams({
        access_token: this.accessToken,
        fields: fields,
        level: 'campaign'
      });

      // Add date range
      if (startDate && endDate) {
        params.append('time_range', JSON.stringify({
          since: startDate,
          until: endDate
        }));
      } else {
        // Use maximum_date_range to get all historical data (last 37 months)
        // Or calculate from campaign creation to today
        const today = new Date();
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(today.getFullYear() - 3);
        
        params.append('time_range', JSON.stringify({
          since: threeYearsAgo.toISOString().split('T')[0], // YYYY-MM-DD
          until: today.toISOString().split('T')[0]
        }));
      }

      const url = `${this.baseUrl}/${this.apiVersion}/${campaignId}/insights?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        console.error(`Failed to fetch insights for campaign ${campaignId}:`, error);
        return null;
      }

      const data = await response.json();
      const insights = data.data?.[0] || null;
      
      // Log insights for debugging
      if (insights) {
        console.log(`Campaign ${campaignId} insights:`, {
          spend: insights.spend,
          impressions: insights.impressions,
          clicks: insights.clicks
        });
      } else {
        console.log(`No insights data for campaign ${campaignId}`);
      }
      
      return insights;
    } catch (error) {
      console.error(`Error fetching insights for campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Fetch leads from Meta Lead Forms
   */
  async fetchLeads(filters?: {
    formId?: string;
    campaignId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<MetaLead[]> {
    if (!this.accessToken || !this.adAccountId) {
      throw new Error('Meta API credentials not configured');
    }

    try {
      let allLeads: MetaLead[] = [];

      // Fetch all ads from the account to find lead forms
      const adsUrl = `${this.baseUrl}/${this.apiVersion}/act_${this.adAccountId}/ads`;
      const adsParams = new URLSearchParams({
        access_token: this.accessToken,
        fields: 'id,name,adset_id,campaign_id,creative{object_story_spec}',
        limit: '100',
        filtering: JSON.stringify([{
          field: 'effective_status',
          operator: 'IN',
          value: ['ACTIVE', 'PAUSED', 'PENDING_REVIEW', 'DISAPPROVED', 'ARCHIVED']
        }])
      });

      const adsResponse = await fetch(`${adsUrl}?${adsParams.toString()}`);
      
      if (!adsResponse.ok) {
        console.error('Failed to fetch ads for lead forms');
        return allLeads;
      }

      const adsData = await adsResponse.json();
      const ads = adsData.data || [];

      // For each ad, try to fetch leads if it has a lead form
      for (const ad of ads) {
        try {
          const leadsForAd = await this.fetchLeadsForAd(ad.id);
          if (leadsForAd.length > 0) {
            allLeads.push(...leadsForAd);
          }
        } catch {
          // Skip ads that don't have lead forms
          continue;
        }
      }

      // Apply date filters if provided
      if (filters?.startDate || filters?.endDate) {
        allLeads = allLeads.filter(lead => {
          const leadDate = new Date(lead.created_time);
          if (filters.startDate && leadDate < new Date(filters.startDate)) return false;
          if (filters.endDate && leadDate > new Date(filters.endDate)) return false;
          return true;
        });
      }

      // Apply campaign filter if provided
      if (filters?.campaignId) {
        allLeads = allLeads.filter(lead => lead.campaign_id === filters.campaignId);
      }

      return allLeads;
    } catch (error) {
      console.error('Error fetching Meta leads:', error);
      // Return empty array instead of throwing to avoid breaking the sync
      return [];
    }
  }

  /**
   * Fetch leads for a specific ad
   */
  async fetchLeadsForAd(adId: string): Promise<MetaLead[]> {
    try {
      const params = new URLSearchParams({
        access_token: this.accessToken,
        fields: 'id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,form_id,field_data,platform',
        limit: '100'
      });

      const url = `${this.baseUrl}/${this.apiVersion}/${adId}/leads?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const leads = data.data || [];

      return leads.map((lead: Record<string, unknown>) => {
        const parsed = this.parseLeadData(lead.field_data as Array<{ name: string; values: string[] }>);
        
        return {
          id: String(lead.id),
          created_time: String(lead.created_time),
          ad_id: String(lead.ad_id || ''),
          ad_name: String(lead.ad_name || ''),
          adset_id: String(lead.adset_id || ''),
          adset_name: String(lead.adset_name || ''),
          campaign_id: String(lead.campaign_id || ''),
          campaign_name: String(lead.campaign_name || ''),
          form_id: String(lead.form_id || ''),
          field_data: lead.field_data as Array<{ name: string; values: string[] }>,
          platform: String(lead.platform || 'facebook'),
          ...parsed
        } as MetaLead;
      });
    } catch (error) {
      console.error(`Error fetching leads for ad ${adId}:`, error);
      return [];
    }
  }

  /**
   * Detect platform from campaign/ad set data
   * Note: Meta API doesn't directly expose platform in campaign data
   * Platform is determined at ad set level via placement optimization
   */
  detectPlatform(): 'facebook' | 'instagram' | 'whatsapp' | 'multi' {
    // In a real implementation, you'd need to:
    // 1. Fetch ad sets for the campaign
    // 2. Check ad set targeting/placements
    // 3. Determine primary platform
    
    return 'multi';
  }

  /**
   * Parse lead form data into structured fields
   */
  parseLeadData(fieldData: Array<{ name: string; values: string[] }>): {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company?: string;
    job_title?: string;
    custom_fields: Record<string, string>;
  } {
    const parsed: {
      full_name?: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      company?: string;
      job_title?: string;
      custom_fields: Record<string, string>;
    } = {
      custom_fields: {}
    };

    for (const field of fieldData) {
      const name = field.name.toLowerCase();
      const value = field.values[0] || '';

      // Map common field names
      if (name === 'full_name' || name === 'name') {
        parsed.full_name = value;
      } else if (name === 'first_name') {
        parsed.first_name = value;
      } else if (name === 'last_name') {
        parsed.last_name = value;
      } else if (name === 'email') {
        parsed.email = value;
      } else if (name === 'phone' || name === 'phone_number') {
        parsed.phone = value;
      } else if (name === 'company' || name === 'company_name') {
        parsed.company = value;
      } else if (name === 'job_title' || name === 'title') {
        parsed.job_title = value;
      } else {
        // Store other fields as custom
        parsed.custom_fields[field.name] = value;
      }
    }

    return parsed;
  }

  /**
   * Calculate campaign metrics (ROI, ROAS, etc.)
   */
  calculateMetrics(campaign: MetaCampaign & { insights?: Record<string, unknown> }): {
    spend: number;
    impressions: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    leads_count: number;
    conversions: number;
    conversion_value: number;
    cost_per_lead: number;
    cost_per_conversion: number;
    roi: number;
    roas: number;
  } {
    const insights = (campaign.insights || {}) as Record<string, unknown>;
    
    const spend = parseFloat(String(insights.spend || '0'));
    const impressions = parseInt(String(insights.impressions || '0'));
    const clicks = parseInt(String(insights.clicks || '0'));
    
    // Extract leads and conversions from actions
    const actions = (insights.actions as Array<{ action_type: string; value: string }> | undefined) || [];
    const actionValues = (insights.action_values as Array<{ action_type: string; value: string }> | undefined) || [];
    
    const leadsAction = actions.find((a) => a.action_type === 'lead');
    const conversionsAction = actions.find((a) => 
      a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
      a.action_type === 'purchase'
    );
    
    const conversionValueAction = actionValues.find((a) => 
      a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
      a.action_type === 'purchase'
    );
    
    const leads_count = parseInt(leadsAction?.value || '0');
    const conversions = parseInt(conversionsAction?.value || '0');
    const conversion_value = parseFloat(conversionValueAction?.value || '0');
    
    // Calculate metrics
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const cost_per_lead = leads_count > 0 ? spend / leads_count : 0;
    const cost_per_conversion = conversions > 0 ? spend / conversions : 0;
    const roi = spend > 0 ? ((conversion_value - spend) / spend) * 100 : 0;
    const roas = spend > 0 ? conversion_value / spend : 0;
    
    return {
      spend,
      impressions,
      clicks,
      ctr: parseFloat(ctr.toFixed(2)),
      cpc: parseFloat(cpc.toFixed(2)),
      cpm: parseFloat(cpm.toFixed(2)),
      leads_count,
      conversions,
      conversion_value,
      cost_per_lead: parseFloat(cost_per_lead.toFixed(2)),
      cost_per_conversion: parseFloat(cost_per_conversion.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      roas: parseFloat(roas.toFixed(2))
    };
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{
    success: boolean;
    accountName?: string;
    error?: string;
  }> {
    try {
      const params = new URLSearchParams({
        access_token: this.accessToken,
        fields: 'id,name,account_status,currency'
      });

      const url = `${this.baseUrl}/${this.apiVersion}/act_${this.adAccountId}?${params.toString()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.error?.message || 'Failed to connect to Meta API'
        };
      }

      const data = await response.json();
      
      return {
        success: true,
        accountName: data.name
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const metaAdsService = new MetaAdsService();
