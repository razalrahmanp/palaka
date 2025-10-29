# Meta (Facebook/Instagram) Ads Lead Integration Guide

## Overview
This system integrates your CRM with Meta (Facebook/Instagram) Lead Ads to automatically capture and manage leads from your advertising campaigns.

## Features
✅ Automatic lead capture from Facebook & Instagram ads
✅ Real-time webhook integration
✅ Lead status tracking (new, contacted, qualified, converted, lost)
✅ Auto-assignment rules based on campaign/platform
✅ Activity logging for all lead interactions
✅ Conversion tracking with revenue attribution
✅ Modern professional CRM dashboard

## Setup Instructions

### 1. Database Setup

Run the SQL schema file to create necessary tables:

```bash
psql -h your-host -U your-user -d your-database -f database/leads_schema.sql
```

This creates:
- `meta_ads_leads` - Main leads table
- `lead_activities` - Activity/interaction log
- `lead_assignment_rules` - Auto-assignment configuration

### 2. Meta App Configuration

#### A. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or use existing
3. Add "Lead Ads" product to your app
4. Note your **App ID** and **App Secret**

#### B. Generate Access Token
1. Go to Graph API Explorer
2. Select your app
3. Get a **User Access Token** with `leads_retrieval` permission
4. Convert to **Long-Lived Token** (expires in 60 days)
5. Or generate a **Page Access Token** (doesn't expire)

```bash
# Convert to long-lived token
https://graph.facebook.com/v18.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id={app-id}&
  client_secret={app-secret}&
  fb_exchange_token={short-lived-token}
```

#### C. Subscribe to Webhooks
1. In Facebook App Dashboard → Webhooks
2. Click "Edit Subscription" for your page
3. Subscribe to `leadgen` events
4. Enter callback URL: `https://yourdomain.com/api/crm/meta-webhook`
5. Enter Verify Token (you choose this - remember it!)

### 3. Environment Variables

Add to your `.env.local` file:

```bash
# Meta App Credentials
META_APP_SECRET=your_app_secret_here
META_VERIFY_TOKEN=your_chosen_verify_token
META_ACCESS_TOKEN=your_long_lived_access_token

# Supabase (if not already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Webhook Verification

Test your webhook endpoint:

```bash
# Facebook will call this to verify your endpoint
GET https://yourdomain.com/api/crm/meta-webhook?
  hub.mode=subscribe&
  hub.verify_token=your_chosen_verify_token&
  hub.challenge=test_challenge
```

Expected response: The challenge value

### 5. Test Lead Submission

#### A. Create a Test Lead Form
1. Go to Facebook Business Suite → Lead Ads Forms
2. Create a new form or edit existing
3. Add fields: Name, Email, Phone

#### B. Test the Integration
1. Create a test ad with your lead form
2. Submit a test lead
3. Check your database for the new lead
4. Verify webhook logs

```sql
-- Check recent leads
SELECT * FROM meta_ads_leads ORDER BY created_at DESC LIMIT 10;

-- Check activities
SELECT * FROM lead_activities ORDER BY created_at DESC LIMIT 20;
```

### 6. Lead Assignment Rules

Configure auto-assignment in the database:

```sql
-- Example: Assign all Instagram leads to user ABC
INSERT INTO lead_assignment_rules (name, conditions, assigned_to, priority, is_active)
VALUES (
  'Instagram Leads to Sarah',
  '{"platform": "instagram"}',
  'user-uuid-here',
  1,
  true
);

-- Example: Assign specific campaign leads
INSERT INTO lead_assignment_rules (name, conditions, assigned_to, priority, is_active)
VALUES (
  'Product Launch Campaign to John',
  '{"campaign_name": "Product Launch 2025"}',
  'user-uuid-here',
  2,
  true
);
```

## API Endpoints

### Get Leads
```bash
GET /api/crm/leads
Query Parameters:
  - status: new|contacted|qualified|converted|lost|invalid
  - assigned_to: user_id
  - platform: facebook|instagram|messenger|audience_network
  - limit: number (default: 50)
  - offset: number (default: 0)
```

### Update Lead
```bash
PATCH /api/crm/leads
Body: {
  "leadId": "uuid",
  "updates": {
    "status": "contacted",
    "notes": "Called customer, interested in product",
    "next_follow_up_date": "2025-11-01T10:00:00Z"
  }
}
```

### Webhook Endpoint (Meta)
```bash
POST /api/crm/meta-webhook
# Automatically receives leads from Meta
# Verifies signature with META_APP_SECRET
# Processes and stores leads in database
```

## Dashboard Access

### Modern Dashboard
Navigate to `/crm` - you'll see the new modern dashboard by default with:
- Today's tasks calendar
- Top customers widget
- Satisfaction rate
- Revenue by industry
- Sales revenue charts
- Customer reports
- Online visitor analytics

### Classic View
Click the "Classic View" button to switch to the traditional customer management interface.

## Lead Management Workflow

### 1. New Lead Arrives
- Webhook receives lead from Meta
- Lead stored in `meta_ads_leads` table
- Auto-assignment rules applied
- Notification sent (configure in code)

### 2. Lead Assignment
- Manual: Admin assigns to salesperson
- Automatic: Rules-based assignment
- Activity logged

### 3. Lead Qualification
```sql
UPDATE meta_ads_leads 
SET status = 'qualified',
    priority = 'high',
    next_follow_up_date = NOW() + INTERVAL '2 days'
WHERE id = 'lead-uuid';
```

### 4. Lead Conversion
```sql
-- When lead becomes customer
UPDATE meta_ads_leads
SET 
  status = 'converted',
  converted_to_customer = true,
  customer_id = 'customer-uuid',
  conversion_date = NOW(),
  conversion_value = 25000.00
WHERE id = 'lead-uuid';
```

## Monitoring & Analytics

### Conversion Rate
```sql
SELECT * FROM get_lead_conversion_stats(
  NOW() - INTERVAL '30 days',
  NOW()
);
```

### Lead Source Performance
```sql
SELECT 
  platform,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE converted_to_customer = true) as conversions,
  ROUND(AVG(conversion_value), 2) as avg_value
FROM meta_ads_leads
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY platform;
```

### Campaign Performance
```sql
SELECT 
  campaign_name,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE status = 'converted') as conversions,
  SUM(conversion_value) as total_revenue
FROM meta_ads_leads
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY campaign_name
ORDER BY total_revenue DESC;
```

## Troubleshooting

### Webhook Not Receiving Leads
1. Check webhook subscription in Facebook App settings
2. Verify callback URL is publicly accessible (https required)
3. Check META_VERIFY_TOKEN matches Facebook settings
4. Review server logs for errors

### Signature Verification Failed
- Ensure META_APP_SECRET is correct
- Check request headers include `x-hub-signature-256`
- Verify payload hasn't been modified

### Leads Not Auto-Assigned
1. Check `lead_assignment_rules` table has active rules
2. Verify `assigned_to` user IDs exist in `users` table
3. Review rule conditions match lead data

### Can't Fetch Lead Details
- Verify META_ACCESS_TOKEN is valid (not expired)
- Check token has `leads_retrieval` permission
- Ensure lead_id from webhook matches Meta format

## Security Best Practices

1. **Use HTTPS only** for webhook endpoints
2. **Verify webhook signatures** (already implemented)
3. **Rotate access tokens** regularly
4. **Limit token permissions** to only what's needed
5. **Log all webhook events** for audit trails
6. **Rate limit** API endpoints
7. **Sanitize form data** before storage
8. **Use environment variables** for secrets

## Advanced Features

### Custom Form Field Mapping
Edit the `processLeadGenEvent` function in `/api/crm/meta-webhook/route.ts` to map additional form fields.

### Notification Integration
Implement `sendLeadNotification` function for:
- Email alerts (SendGrid, AWS SES)
- SMS notifications (Twilio)
- Slack/Teams messages
- Push notifications

### CRM Integration
Sync leads with external CRMs:
- Salesforce
- HubSpot
- Zoho CRM
- Custom integrations

## Support & Resources

- [Meta Lead Ads Documentation](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/)
- [Webhook Setup Guide](https://developers.facebook.com/docs/graph-api/webhooks/)
- [Graph API Reference](https://developers.facebook.com/docs/graph-api/reference/lead/)

## License

This integration is part of your CRM system. Use according to your project license.
