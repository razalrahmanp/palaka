// API endpoint for Meta (Facebook) Ads Lead Collection Webhook
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

// Meta App Secret for webhook verification
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'your_verification_token';

interface MetaLeadGenData {
  leadgen_id: string;
  form_id: string;
  ad_id?: string;
  ad_name?: string;
  page_id?: string;
  adgroup_id?: string;
  adgroup_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  created_time?: string;
  platform?: string;
  field_data?: LeadFieldData[]; // Support field_data directly in webhook
}

interface LeadFieldData {
  name: string;
  values: string[];
}

interface MetaLeadDetails {
  field_data?: LeadFieldData[];
}

interface LeadRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  campaign_name?: string;
  platform?: string;
}

// Webhook verification (GET request from Meta)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('📞 Meta Webhook Verification Request:', { 
    mode, 
    receivedToken: token,
    expectedToken: META_VERIFY_TOKEN,
    tokensMatch: token === META_VERIFY_TOKEN
  });

  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error('❌ Webhook verification failed', {
      modeMatches: mode === 'subscribe',
      tokenMatches: token === META_VERIFY_TOKEN,
      receivedToken: token,
      expectedToken: META_VERIFY_TOKEN
    });
    return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
  }
}

// Webhook payload processing (POST request from Meta)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    console.log('📨 Received Meta Ads webhook');

    // Verify webhook signature
    if (META_APP_SECRET && signature) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', META_APP_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(body);
    console.log('📋 Webhook data:', JSON.stringify(data, null, 2));

    // Process each entry in the webhook
    if (data.object === 'page') {
      for (const entry of data.entry) {
        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            await processLeadGenEvent(change.value, body);
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processLeadGenEvent(leadGenData: MetaLeadGenData, rawWebhookData: string) {
  try {
    console.log('🔄 Processing lead gen event:', leadGenData);

    const { leadgen_id, form_id, ad_id, ad_name, adgroup_name, campaign_name, created_time } = leadGenData;

    // Check if field_data is already provided (from import script)
    let leadDetails: MetaLeadDetails | null = null;
    
    if (leadGenData.field_data) {
      // Use provided field_data
      leadDetails = { field_data: leadGenData.field_data };
      console.log('✅ Using provided field_data from webhook payload');
    } else {
      // Fetch lead details from Meta Graph API
      leadDetails = await fetchLeadDetails(leadgen_id);
      
      if (!leadDetails) {
        console.error('❌ Could not fetch lead details');
        return;
      }
    }

    // Extract form fields
    const formData: Record<string, string> = {};
    let full_name = '';
    let email = '';
    let phone = '';

    leadDetails.field_data?.forEach((field: LeadFieldData) => {
      const fieldName = field.name.toLowerCase();
      const fieldValue = field.values[0];
      
      formData[fieldName] = fieldValue;

      // Map standard fields
      if (fieldName.includes('name') || fieldName === 'full_name') {
        full_name = fieldValue;
      } else if (fieldName.includes('email')) {
        email = fieldValue;
      } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
        phone = fieldValue;
      }
    });

    // Determine platform (Facebook/Instagram)
    const platform = leadGenData.platform || 'facebook';

    // Insert lead into database
    const { data: insertedLead, error } = await supabase
      .from('meta_ads_leads')
      .insert({
        lead_id: leadgen_id,
        form_id: form_id,
        ad_id: ad_id,
        ad_name: ad_name,
        full_name: full_name,
        email: email,
        phone: phone,
        form_data: formData,
        campaign_name: campaign_name || '',
        ad_set_name: adgroup_name || '',
        platform: platform,
        status: 'new',
        priority: 'medium',
        raw_webhook_data: JSON.parse(rawWebhookData),
        created_at: created_time
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error inserting lead:', error);
      return;
    }

    console.log('✅ Lead inserted successfully:', insertedLead.id);

    // Auto-assign based on rules
    await autoAssignLead(insertedLead.id, {
      campaign_name,
      platform,
      ad_name
    });

    // Create initial activity log
    await supabase
      .from('lead_activities')
      .insert({
        lead_id: insertedLead.id,
        activity_type: 'note',
        description: `Lead received from ${platform} - ${campaign_name || 'Campaign'}`,
        metadata: { source: 'meta_webhook' }
      });

    // Send notification (optional - integrate with your notification system)
    await sendLeadNotification(insertedLead);

  } catch (error) {
    console.error('❌ Error processing lead gen event:', error);
  }
}

async function fetchLeadDetails(leadId: string): Promise<MetaLeadDetails | null> {
  try {
    const accessToken = process.env.META_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('❌ META_ACCESS_TOKEN not configured');
      return null;
    }

    const url = `https://graph.facebook.com/v18.0/${leadId}?access_token=${accessToken}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('❌ Meta API error:', data.error);
      return null;
    }

    return data as MetaLeadDetails;
  } catch (error) {
    console.error('❌ Error fetching lead details:', error);
    return null;
  }
}

async function autoAssignLead(leadId: string, criteria: { campaign_name?: string; platform?: string; ad_name?: string }) {
  try {
    // Fetch active assignment rules
    const { data: rules, error } = await supabase
      .from('lead_assignment_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error || !rules || rules.length === 0) {
      console.log('📋 No assignment rules found');
      return;
    }

    // Find matching rule
    for (const rule of rules) {
      const conditions = rule.conditions || {};
      let matches = true;

      if (conditions.campaign_name && criteria.campaign_name) {
        matches = matches && criteria.campaign_name.toLowerCase().includes(conditions.campaign_name.toLowerCase());
      }

      if (conditions.platform && criteria.platform) {
        matches = matches && criteria.platform === conditions.platform;
      }

      if (matches && rule.assigned_to) {
        // Assign lead
        await supabase
          .from('meta_ads_leads')
          .update({ assigned_to: rule.assigned_to })
          .eq('id', leadId);

        // Log assignment
        await supabase
          .from('lead_activities')
          .insert({
            lead_id: leadId,
            activity_type: 'assigned',
            description: `Auto-assigned based on rule: ${rule.name}`,
            metadata: { rule_id: rule.id }
          });

        console.log(`✅ Lead auto-assigned to user ${rule.assigned_to}`);
        break;
      }
    }
  } catch (error) {
    console.error('❌ Error auto-assigning lead:', error);
  }
}

async function sendLeadNotification(lead: LeadRecord) {
  // Implement your notification logic here
  // Examples: Email, SMS, Slack, Push notification
  console.log('📧 Notification sent for lead:', lead.id);
}
