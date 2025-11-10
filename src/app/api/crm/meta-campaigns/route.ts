import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get filter parameters
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const sortBy = searchParams.get('sort_by') || 'updated_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';

    // Build query
    let query = supabase
      .from('meta_campaigns')
      .select('*');

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status.toUpperCase());
    }

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform.toLowerCase());
    }

    if (startDate) {
      query = query.gte('start_time', startDate);
    }

    if (endDate) {
      query = query.lte('start_time', endDate);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching meta campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', details: error.message },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    interface SummaryStats {
      total_spend: number;
      total_impressions: number;
      total_clicks: number;
      total_leads: number;
      total_conversions: number;
      total_revenue: number;
      campaign_count: number;
    }

    const summary = (data || []).reduce((acc: SummaryStats, campaign: Record<string, unknown>) => ({
      total_spend: acc.total_spend + (parseFloat(String(campaign.spend || 0))),
      total_impressions: acc.total_impressions + (Number(campaign.impressions) || 0),
      total_clicks: acc.total_clicks + (Number(campaign.clicks) || 0),
      total_leads: acc.total_leads + (Number(campaign.leads_count) || 0),
      total_conversions: acc.total_conversions + (Number(campaign.conversions) || 0),
      total_revenue: acc.total_revenue + (parseFloat(String(campaign.conversion_value || 0))),
      campaign_count: acc.campaign_count + 1
    }), {
      total_spend: 0,
      total_impressions: 0,
      total_clicks: 0,
      total_leads: 0,
      total_conversions: 0,
      total_revenue: 0,
      campaign_count: 0
    } as SummaryStats);

    // Calculate average metrics
    const avgCTR = summary.total_impressions > 0 
      ? (summary.total_clicks / summary.total_impressions) * 100 
      : 0;
    const avgROI = summary.total_spend > 0 
      ? ((summary.total_revenue - summary.total_spend) / summary.total_spend) * 100 
      : 0;
    const avgROAS = summary.total_spend > 0 
      ? summary.total_revenue / summary.total_spend 
      : 0;

    return NextResponse.json({
      success: true,
      data: data,
      summary: {
        ...summary,
        avg_ctr: avgCTR,
        avg_roi: avgROI,
        avg_roas: avgROAS
      }
    });

  } catch (error) {
    console.error('Error in meta-campaigns API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { id, account_id, name, objective } = body;
    if (!id || !account_id || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: id, account_id, name' },
        { status: 400 }
      );
    }

    // Insert campaign
    const { data, error } = await supabase
      .from('meta_campaigns')
      .insert([{
        id,
        account_id,
        name,
        objective,
        status: body.status || 'ACTIVE',
        platform: body.platform || 'multi',
        start_time: body.start_time,
        end_time: body.end_time,
        daily_budget: body.daily_budget,
        lifetime_budget: body.lifetime_budget,
        spend: body.spend || 0,
        impressions: body.impressions || 0,
        reach: body.reach || 0,
        clicks: body.clicks || 0,
        ctr: body.ctr || 0,
        cpc: body.cpc || 0,
        cpm: body.cpm || 0,
        leads_count: body.leads_count || 0,
        conversions: body.conversions || 0,
        conversion_value: body.conversion_value || 0,
        cost_per_lead: body.cost_per_lead || 0,
        cost_per_conversion: body.cost_per_conversion || 0,
        roi: body.roi || 0,
        roas: body.roas || 0,
        meta_data: body.meta_data || null,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating meta campaign:', error);
      return NextResponse.json(
        { error: 'Failed to create campaign', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    }, { status: 201 });

  } catch (error) {
    console.error('Error in meta-campaigns POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Update campaign
    const { data, error } = await supabase
      .from('meta_campaigns')
      .update({
        ...updates,
        last_synced_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating meta campaign:', error);
      return NextResponse.json(
        { error: 'Failed to update campaign', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Error in meta-campaigns PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
