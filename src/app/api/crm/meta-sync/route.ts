import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { metaAdsService } from '@/lib/metaAdsService';

/**
 * Sync campaigns and leads from Meta (Facebook/Instagram/WhatsApp)
 * POST /api/crm/meta-sync
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sync_type = 'campaigns', // 'campaigns', 'leads', or 'full'
      start_date,
      end_date,
      campaign_id 
    } = body;

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('meta_sync_log')
      .insert([{
        sync_type,
        status: 'started',
        started_at: new Date().toISOString(),
        records_fetched: 0,
        records_created: 0,
        records_updated: 0,
        records_failed: 0
      }])
      .select()
      .single();

    if (syncLogError) {
      return NextResponse.json(
        { error: 'Failed to create sync log', details: syncLogError.message },
        { status: 500 }
      );
    }

    const syncId = syncLog.id;
    let recordsFetched = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    try {
      // Test Meta API connection first
      const connectionTest = await metaAdsService.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Meta API connection failed: ${connectionTest.error}`);
      }

      // Sync Campaigns
      if (sync_type === 'campaigns' || sync_type === 'full') {
        const campaigns = await metaAdsService.fetchCampaigns({
          status: ['ACTIVE', 'PAUSED'],
          startDate: start_date,
          endDate: end_date
        });

        recordsFetched += campaigns.length;

        for (const campaign of campaigns) {
          try {
            const metrics = metaAdsService.calculateMetrics(campaign);
            const platform = metaAdsService.detectPlatform();

            // Check if campaign exists
            const { data: existing } = await supabase
              .from('meta_campaigns')
              .select('id')
              .eq('id', campaign.id)
              .single();

            const campaignData = {
              id: campaign.id, // Meta campaign ID
              account_id: campaign.account_id,
              name: campaign.name,
              objective: campaign.objective,
              status: campaign.status,
              platform,
              start_time: campaign.start_time,
              end_time: campaign.stop_time || campaign.end_time,
              daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
              lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
              spend: metrics.spend,
              impressions: metrics.impressions,
              clicks: metrics.clicks,
              ctr: metrics.ctr,
              cpc: metrics.cpc,
              cpm: metrics.cpm,
              leads_count: metrics.leads_count,
              conversions: metrics.conversions,
              conversion_value: metrics.conversion_value,
              cost_per_lead: metrics.cost_per_lead,
              cost_per_conversion: metrics.cost_per_conversion,
              roi: metrics.roi,
              roas: metrics.roas,
              last_synced_at: new Date().toISOString(),
              sync_status: 'synced',
              meta_data: campaign
            };

            console.log(`Campaign ${campaign.name} metrics:`, {
              spend: metrics.spend,
              impressions: metrics.impressions,
              clicks: metrics.clicks,
              leads: metrics.leads_count
            });

            if (existing) {
              // Update existing campaign
              const { error } = await supabase
                .from('meta_campaigns')
                .update(campaignData)
                .eq('id', campaign.id);

              if (error) throw error;
              recordsUpdated++;
            } else {
              // Create new campaign
              const { error } = await supabase
                .from('meta_campaigns')
                .insert([campaignData]);

              if (error) throw error;
              recordsCreated++;
            }
          } catch (error) {
            console.error(`Failed to sync campaign ${campaign.id}:`, error);
            recordsFailed++;
          }
        }
      }

      // Sync Leads
      if (sync_type === 'leads' || sync_type === 'full') {
        const leads = await metaAdsService.fetchLeads({
          campaignId: campaign_id,
          startDate: start_date,
          endDate: end_date
        });

        recordsFetched += leads.length;

        for (const lead of leads) {
          try {
            // Check if lead already exists
            const { data: existing } = await supabase
              .from('meta_leads')
              .select('id')
              .eq('meta_lead_id', lead.id)
              .single();

            if (existing) {
              // Skip existing leads
              continue;
            }

            // Parse lead data
            const parsedData = metaAdsService.parseLeadData(lead.field_data);

            // Calculate quality score
            let qualityScore = 0;
            if (parsedData.full_name || (parsedData.first_name && parsedData.last_name)) qualityScore += 20;
            if (parsedData.email) qualityScore += 30;
            if (parsedData.phone) qualityScore += 30;
            if (parsedData.company) qualityScore += 10;
            if (parsedData.job_title) qualityScore += 10;

            // Insert lead
            const { error } = await supabase
              .from('meta_leads')
              .insert([{
                meta_lead_id: lead.id,
                full_name: parsedData.full_name,
                first_name: parsedData.first_name,
                last_name: parsedData.last_name,
                email: parsedData.email,
                phone: parsedData.phone,
                company: parsedData.company,
                job_title: parsedData.job_title,
                campaign_id: lead.campaign_id,
                campaign_name: lead.campaign_name,
                adset_id: lead.adset_id,
                adset_name: lead.adset_name,
                ad_id: lead.ad_id,
                ad_name: lead.ad_name,
                form_id: lead.form_id,
                platform: lead.platform || 'facebook',
                status: 'new',
                quality_score: qualityScore,
                custom_fields: parsedData.custom_fields,
                created_time: lead.created_time,
                synced_at: new Date().toISOString(),
                meta_data: lead
              }]);

            if (error) throw error;
            recordsCreated++;
          } catch (error) {
            console.error(`Failed to sync lead ${lead.id}:`, error);
            recordsFailed++;
          }
        }
      }

      // Update sync log with success
      await supabase
        .from('meta_sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_fetched: recordsFetched,
          records_created: recordsCreated,
          records_updated: recordsUpdated,
          records_failed: recordsFailed
        })
        .eq('id', syncId);

      return NextResponse.json({
        success: true,
        sync_id: syncId,
        summary: {
          records_fetched: recordsFetched,
          records_created: recordsCreated,
          records_updated: recordsUpdated,
          records_failed: recordsFailed
        }
      });

    } catch (error) {
      // Update sync log with failure
      await supabase
        .from('meta_sync_log')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_details: error,
          records_fetched: recordsFetched,
          records_created: recordsCreated,
          records_updated: recordsUpdated,
          records_failed: recordsFailed
        })
        .eq('id', syncId);

      throw error;
    }

  } catch (error) {
    console.error('Error in meta-sync API:', error);
    return NextResponse.json(
      { 
        error: 'Sync failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

/**
 * Get sync history
 * GET /api/crm/meta-sync
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    const { data, error } = await supabase
      .from('meta_sync_log')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch sync history', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Error fetching sync history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
