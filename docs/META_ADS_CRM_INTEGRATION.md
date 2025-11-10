# Meta Ads CRM Integration

**Complete integration of Facebook, Instagram & WhatsApp advertising campaigns into the ERP CRM module**

---

## 🎯 Overview

This integration enables your ERP system to automatically sync and manage all Meta advertising campaigns (Facebook, Instagram, WhatsApp), track leads from lead forms, analyze campaign performance, and measure ROI/ROAS directly within your CRM.

### ✅ What's Included

1. **3 New CRM Pages**
   - Meta Campaigns - View and manage all advertising campaigns
   - Meta Leads - Track leads from Facebook/Instagram ads
   - Campaign Performance - ROI/ROAS analytics and conversion tracking

2. **Database Schema**
   - `meta_campaigns` - Store campaign data with performance metrics
   - `meta_adsets` - Ad sets within campaigns (targeting groups)
   - `meta_ads` - Individual ads with creative details
   - `meta_leads` - Leads captured from Meta Lead Forms
   - `meta_sync_log` - Track API sync operations
   - Auto-triggers for customer creation and timestamp updates

3. **API Endpoints**
   - `/api/crm/meta-campaigns` - CRUD operations for campaigns
   - `/api/crm/meta-leads` - CRUD operations for leads
   - Full filtering, sorting, and pagination support

4. **CRM Sidebar Integration**
   - New menu items automatically added to CRM section
   - Icon-based navigation with proper permissions

---

## 📂 File Structure

```
src/
├── app/
│   ├── (erp)/
│   │   └── crm/
│   │       ├── meta-campaigns/
│   │       │   └── page.tsx          ✅ Campaign listing & stats
│   │       ├── meta-leads/
│   │       │   └── page.tsx          ✅ Lead management
│   │       └── campaign-performance/
│   │           └── page.tsx          ✅ ROI/ROAS analytics
│   └── api/
│       └── crm/
│           ├── meta-campaigns/
│           │   └── route.ts          ✅ Campaign API
│           └── meta-leads/
│               └── route.ts          ✅ Lead API
├── components/
│   └── Sidebar.tsx                   ✅ Updated with Meta tabs
└── database/
    └── meta_ads_schema.sql           ✅ Complete database schema

docs/
└── META_ADS_CRM_INTEGRATION.md       ✅ This file
```

---

## 🗄️ Database Schema

### Tables Created

#### 1. `meta_campaigns`
Stores all Meta advertising campaigns with performance metrics.

**Key Columns:**
- `id` (TEXT) - Meta campaign ID (primary key)
- `name`, `objective`, `status`, `platform`
- Budget: `daily_budget`, `lifetime_budget`, `spend`
- Metrics: `impressions`, `clicks`, `ctr`, `cpc`, `leads_count`, `conversions`
- ROI: `roi`, `roas`, `conversion_value`
- Sync: `last_synced_at`, `sync_status`

#### 2. `meta_leads`
Captures leads from Meta Lead Forms.

**Key Columns:**
- `id` (UUID) - Internal ID
- `meta_lead_id` (TEXT) - Meta's lead ID (unique)
- Contact: `full_name`, `email`, `phone`, `company`, `job_title`
- Attribution: `campaign_id`, `campaign_name`, `ad_id`, `form_name`
- Status: `status` (new/contacted/qualified/converted/rejected)
- Assignment: `assigned_to`, `assigned_at`
- CRM Link: `customer_id` (references customers table)
- Quality: `quality_score` (0-100)

#### 3. `meta_adsets` & `meta_ads`
Store ad sets and individual ads for detailed campaign analysis.

#### 4. `meta_sync_log`
Tracks all sync operations with Meta API for debugging and auditing.

### Database Triggers

1. **Auto-update timestamps**
   - `trg_update_meta_campaign_timestamp`
   - `trg_update_meta_lead_timestamp`

2. **Auto-create customers from converted leads**
   - `trg_create_customer_from_meta_lead`
   - When lead status → 'converted', automatically creates customer record

---

## 🚀 Features

### Meta Campaigns Page
**Route:** `/crm/meta-campaigns`

**Features:**
- ✅ View all campaigns with real-time metrics
- ✅ Filter by: Status (Active/Paused/Archived), Platform (FB/IG/WA)
- ✅ Search campaigns by name
- ✅ Summary stats: Total Spend, Impressions, Clicks, Leads, Conversions
- ✅ Campaign table with sortable columns
- ✅ Performance badges (CTR, CPC, leads count)
- ✅ "Sync from Meta" button (ready for API integration)

**Mock Data Included:** 2 sample campaigns with realistic metrics

### Meta Leads Page
**Route:** `/crm/meta-leads`

**Features:**
- ✅ Grid view of all leads with contact information
- ✅ Filter by: Status (New/Contacted/Qualified/Converted/Rejected), Platform
- ✅ Search by name, email, or phone
- ✅ Status summary cards (count by status)
- ✅ Lead cards showing: Campaign source, Contact info, Assignment, Platform
- ✅ Action buttons: Contact Lead, Assign, View Customer (if converted)
- ✅ Export and Sync buttons

**Mock Data Included:** 4 sample leads in various stages

### Campaign Performance Page
**Route:** `/crm/campaign-performance`

**Features:**
- ✅ ROI & ROAS tracking
- ✅ Key metrics dashboard: Revenue, Spend, ROI, ROAS
- ✅ Secondary metrics: Total Leads, Conversions, CTR, Conversion Rate
- ✅ Performance table by campaign with detailed metrics
- ✅ Cost per Lead and Cost per Conversion tracking
- ✅ Visual indicators for high-performing campaigns
- ✅ Chart placeholder (ready for Recharts/Chart.js integration)
- ✅ Date range filtering

**Metrics Calculated:**
- Total Revenue & Spend
- Average ROI (%) = ((Revenue - Spend) / Spend) × 100
- Average ROAS (x) = Revenue / Spend
- Average CTR = (Clicks / Impressions) × 100
- Conversion Rate = (Conversions / Leads) × 100

---

## 🔌 API Endpoints

### `/api/crm/meta-campaigns`

#### GET - Fetch Campaigns
**Query Parameters:**
- `status` - Filter by status (ACTIVE/PAUSED/ARCHIVED/DELETED)
- `platform` - Filter by platform (facebook/instagram/whatsapp/multi)
- `start_date` - Filter campaigns starting after date
- `end_date` - Filter campaigns starting before date
- `sort_by` - Sort field (default: updated_at)
- `sort_order` - Sort direction (asc/desc)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "summary": {
    "total_spend": 93500,
    "total_impressions": 214000,
    "total_clicks": 5300,
    "total_leads": 254,
    "total_conversions": 36,
    "total_revenue": 1080000,
    "avg_ctr": 2.48,
    "avg_roi": 1054.55,
    "avg_roas": 11.55
  }
}
```

#### POST - Create Campaign
**Body:**
```json
{
  "id": "META_CAMPAIGN_ID",
  "account_id": "ACT_123456",
  "name": "Campaign Name",
  "objective": "LEAD_GENERATION",
  "platform": "instagram",
  "daily_budget": 5000,
  "spend": 0,
  "impressions": 0,
  ...
}
```

#### PATCH - Update Campaign
**Body:**
```json
{
  "id": "META_CAMPAIGN_ID",
  "spend": 42500,
  "impressions": 125000,
  "clicks": 3200,
  "leads_count": 156,
  ...
}
```

### `/api/crm/meta-leads`

#### GET - Fetch Leads
**Query Parameters:**
- `status` - Filter by lead status
- `platform` - Filter by platform
- `campaign_id` - Filter by campaign
- `assigned_to` - Filter by assigned user
- `start_date`, `end_date` - Date range
- `search` - Search in name/email/phone
- `limit`, `offset` - Pagination

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 254,
    "limit": 100,
    "offset": 0,
    "has_more": true
  },
  "status_counts": {
    "new": 45,
    "contacted": 89,
    "qualified": 67,
    "converted": 42,
    "rejected": 11,
    "total": 254
  }
}
```

#### POST - Create Lead
**Body:**
```json
{
  "meta_lead_id": "META_LEAD_12345",
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+91 98765 43210",
  "campaign_id": "CAMPAIGN_ID",
  "campaign_name": "Summer Sale",
  "platform": "instagram",
  "created_time": "2025-11-08T10:30:00",
  ...
}
```

#### PATCH - Update Lead
**Body:**
```json
{
  "id": "UUID",
  "status": "contacted",
  "assigned_to": "USER_UUID",
  "notes": "Called customer, interested in sofa set",
  "next_follow_up_date": "2025-11-10"
}
```

---

## 🔧 Integration Steps

### Phase 1: Database Setup ✅ COMPLETE
1. ✅ Run `database/meta_ads_schema.sql` in Supabase SQL Editor
2. ✅ Tables created: meta_campaigns, meta_leads, meta_adsets, meta_ads, meta_sync_log
3. ✅ Triggers configured for auto-updates
4. ✅ Function to auto-create customers from converted leads

### Phase 2: Frontend Pages ✅ COMPLETE
1. ✅ Meta Campaigns page with filters and stats
2. ✅ Meta Leads page with grid view and actions
3. ✅ Campaign Performance dashboard with ROI/ROAS
4. ✅ Sidebar navigation updated

### Phase 3: API Layer ✅ COMPLETE
1. ✅ Campaign API with full CRUD
2. ✅ Leads API with filtering and search
3. ✅ Summary statistics calculation
4. ✅ Error handling and validation

### Phase 4: Meta API Integration 🔄 NEXT STEP
**To implement:**

1. **Create Meta App**
   - Go to [Meta for Developers](https://developers.facebook.com/apps/)
   - Create app → Add Facebook Login, Ads Management, Lead Ads permissions
   - Get App ID and App Secret

2. **Get Access Tokens**
   - Generate long-lived page access token
   - Store in environment variables:
     ```env
     META_APP_ID=your_app_id
     META_APP_SECRET=your_app_secret
     META_ACCESS_TOKEN=your_long_lived_token
     META_AD_ACCOUNT_ID=act_123456
     ```

3. **Create Sync Service**
   ```typescript
   // lib/metaService.ts
   export async function syncMetaCampaigns() {
     const url = `https://graph.facebook.com/v19.0/${META_AD_ACCOUNT_ID}/campaigns`;
     const response = await fetch(url, {
       headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` }
     });
     const data = await response.json();
     
     // Store in database via API
     for (const campaign of data.data) {
       await fetch('/api/crm/meta-campaigns', {
         method: 'POST',
         body: JSON.stringify(campaign)
       });
     }
   }
   ```

4. **Set up Webhooks** (Optional but recommended)
   - Configure webhook in Meta App dashboard
   - Create endpoint: `/api/webhooks/meta`
   - Subscribe to lead form submissions
   - Real-time lead capture!

---

## 📊 Sample Usage

### Fetching Campaign Performance
```typescript
const response = await fetch('/api/crm/meta-campaigns?status=ACTIVE&platform=instagram');
const { data, summary } = await response.json();

console.log(`Total Spend: ₹${summary.total_spend}`);
console.log(`Average ROI: ${summary.avg_roi}%`);
console.log(`Average ROAS: ${summary.avg_roas}x`);
```

### Creating a Lead
```typescript
await fetch('/api/crm/meta-leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    meta_lead_id: 'LEAD_001',
    full_name: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '+91 9876543210',
    campaign_id: 'CAMP_001',
    platform: 'instagram',
    created_time: new Date().toISOString()
  })
});
```

### Converting a Lead to Customer
```typescript
// Update lead status to 'converted'
await fetch('/api/crm/meta-leads', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'LEAD_UUID',
    status: 'converted',
    conversion_value: 45000
  })
});

// Database trigger automatically creates customer record!
```

---

## 🎨 UI Components Used

- **Lucide Icons:** Megaphone, UserPlus, LineChart, TrendingUp, etc.
- **Color-coded Badges:** Status (Active/Paused), Platform (FB/IG/WA)
- **Metric Cards:** Spend, Revenue, ROI, ROAS, Leads, Conversions
- **Data Tables:** Sortable columns with hover effects
- **Grid Layouts:** Responsive cards for leads
- **Filter Components:** Dropdowns and search inputs

---

## 🔒 Permissions & Security

Current permission mapping:
- All Meta pages use existing CRM permissions: `customer:read` and `customer:read_own`
- Sales representatives can view their assigned leads
- Managers can view all campaigns and leads

**Recommended:** Create specific permissions:
- `meta_campaigns:read` - View campaigns
- `meta_campaigns:manage` - Create/update campaigns
- `meta_leads:read` - View leads
- `meta_leads:assign` - Assign leads to sales reps
- `meta_leads:convert` - Convert leads to customers

---

## 📈 Performance Metrics Explained

### ROI (Return on Investment)
```
ROI = ((Revenue - Spend) / Spend) × 100
```
Example: Spend ₹50,000, Revenue ₹500,000 → ROI = 900%

### ROAS (Return on Ad Spend)
```
ROAS = Revenue / Spend
```
Example: Spend ₹50,000, Revenue ₹500,000 → ROAS = 10x

### CTR (Click-Through Rate)
```
CTR = (Clicks / Impressions) × 100
```
Example: 3,200 clicks / 125,000 impressions → CTR = 2.56%

### Conversion Rate
```
Conversion Rate = (Conversions / Leads) × 100
```
Example: 24 conversions / 156 leads → 15.38%

### Cost Per Lead
```
Cost Per Lead = Total Spend / Total Leads
```

### Cost Per Conversion
```
Cost Per Conversion = Total Spend / Total Conversions
```

---

## 🚧 Future Enhancements

### Short Term
- [ ] Connect real Meta Ads API
- [ ] Implement webhook receiver for instant lead capture
- [ ] Add chart visualizations (Recharts/Chart.js)
- [ ] Lead assignment automation (round-robin, territory-based)
- [ ] Email/WhatsApp notifications for new leads

### Medium Term
- [ ] A/B testing tracking
- [ ] Creative performance analysis
- [ ] Audience insights integration
- [ ] Automated lead scoring with AI
- [ ] Campaign optimization suggestions

### Long Term
- [ ] Multi-account management
- [ ] Competitive analysis
- [ ] Predictive ROI modeling
- [ ] Integration with Google Ads
- [ ] Custom attribution models

---

## 📝 Notes

- **Mock Data:** All pages currently use mock data. Replace with API calls when Meta integration is live.
- **Chart Placeholder:** Campaign Performance page has a chart placeholder ready for visualization library.
- **Auto-Customer Creation:** When a lead status is changed to 'converted', a customer record is automatically created via database trigger.
- **Quality Scoring:** Leads are automatically scored 0-100 based on data completeness (name, email, phone, company, job title).

---

## 🐛 Troubleshooting

### Sidebar items not showing
- Check user permissions: `customer:read` or `customer:read_own`
- Clear role access cache
- Refresh page

### API errors
- Verify Supabase client configuration
- Check database tables exist
- Ensure proper column names in queries

### Leads not creating customers
- Check trigger: `trg_create_customer_from_meta_lead`
- Verify `assigned_to` user exists
- Check customers table permissions

---

## 📚 References

- [Meta Marketing API Documentation](https://developers.facebook.com/docs/marketing-apis)
- [Meta Lead Ads API](https://developers.facebook.com/docs/marketing-api/guides/lead-ads)
- [Meta Webhooks](https://developers.facebook.com/docs/graph-api/webhooks)
- [Supabase Database Triggers](https://supabase.com/docs/guides/database/postgres-triggers)

---

**Status:** ✅ Complete - Ready for Meta API Integration  
**Last Updated:** November 8, 2025  
**Version:** 1.0.0
