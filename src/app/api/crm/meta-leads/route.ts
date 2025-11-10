import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get filter parameters
    const status = searchParams.get('status');
    const platform = searchParams.get('platform');
    const campaignId = searchParams.get('campaign_id');
    const assignedTo = searchParams.get('assigned_to');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort_by') || 'created_time';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query with joins
    let query = supabase
      .from('meta_leads')
      .select(`
        *,
        campaign:meta_campaigns(name, platform),
        assigned_user:users!meta_leads_assigned_to_fkey(id, name, email),
        customer:customers(id, name, status)
      `);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status.toLowerCase());
    }

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform.toLowerCase());
    }

    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }

    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    if (startDate) {
      query = query.gte('created_time', startDate);
    }

    if (endDate) {
      query = query.lte('created_time', endDate);
    }

    // Search by name, email, or phone
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching meta leads:', error);
      return NextResponse.json(
        { error: 'Failed to fetch leads', details: error.message },
        { status: 500 }
      );
    }

    // Get status counts
    const { data: statusCounts } = await supabase
      .from('meta_leads')
      .select('status');

    const counts = (statusCounts || []).reduce((acc: Record<string, number>, lead: { status: string }) => {
      const status = lead.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: data,
      pagination: {
        total: count || data.length,
        limit,
        offset,
        has_more: count ? (offset + limit) < count : false
      },
      status_counts: counts
    });

  } catch (error) {
    console.error('Error in meta-leads API:', error);
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
    const { meta_lead_id, platform, created_time } = body;
    if (!meta_lead_id || !platform || !created_time) {
      return NextResponse.json(
        { error: 'Missing required fields: meta_lead_id, platform, created_time' },
        { status: 400 }
      );
    }

    // Check if lead already exists
    const { data: existingLead } = await supabase
      .from('meta_leads')
      .select('id')
      .eq('meta_lead_id', meta_lead_id)
      .single();

    if (existingLead) {
      return NextResponse.json(
        { error: 'Lead already exists', lead_id: existingLead.id },
        { status: 409 }
      );
    }

    // Calculate quality score based on available data
    let qualityScore = 0;
    if (body.full_name || (body.first_name && body.last_name)) qualityScore += 20;
    if (body.email) qualityScore += 30;
    if (body.phone) qualityScore += 30;
    if (body.company) qualityScore += 10;
    if (body.job_title) qualityScore += 10;

    // Insert lead
    const { data, error } = await supabase
      .from('meta_leads')
      .insert([{
        meta_lead_id,
        full_name: body.full_name,
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        company: body.company,
        job_title: body.job_title,
        campaign_id: body.campaign_id,
        campaign_name: body.campaign_name,
        adset_id: body.adset_id,
        adset_name: body.adset_name,
        ad_id: body.ad_id,
        ad_name: body.ad_name,
        form_id: body.form_id,
        form_name: body.form_name,
        platform: platform.toLowerCase(),
        status: body.status || 'new',
        assigned_to: body.assigned_to || null,
        quality_score: qualityScore,
        custom_fields: body.custom_fields || null,
        created_time,
        synced_at: new Date().toISOString(),
        meta_data: body.meta_data || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating meta lead:', error);
      return NextResponse.json(
        { error: 'Failed to create lead', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    }, { status: 201 });

  } catch (error) {
    console.error('Error in meta-leads POST:', error);
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
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Handle status changes
    if (updates.status) {
      if (updates.status === 'contacted' && !updates.last_contacted_at) {
        updates.last_contacted_at = new Date().toISOString();
        updates.contact_attempts = supabase.rpc('increment', { x: 1 });
      }
      
      if (updates.status === 'converted' && !updates.converted_at) {
        updates.converted_at = new Date().toISOString();
      }
    }

    // Handle assignment
    if (updates.assigned_to && !updates.assigned_at) {
      updates.assigned_at = new Date().toISOString();
    }

    // Update lead
    const { data, error } = await supabase
      .from('meta_leads')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        campaign:meta_campaigns(name, platform),
        assigned_user:users!meta_leads_assigned_to_fkey(id, name, email),
        customer:customers(id, name, status)
      `)
      .single();

    if (error) {
      console.error('Error updating meta lead:', error);
      return NextResponse.json(
        { error: 'Failed to update lead', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Error in meta-leads PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('meta_leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting meta lead:', error);
      return NextResponse.json(
        { error: 'Failed to delete lead', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lead deleted successfully'
    });

  } catch (error) {
    console.error('Error in meta-leads DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
