# Meta Ads CRM Integration - Quick Start

## ✅ Completed Tasks

### 1. **CRM Sidebar Updates** 
✅ Added 3 new menu items to CRM section in `Sidebar.tsx`:
- **Meta Campaigns** (Megaphone icon)
- **Meta Leads** (UserPlus icon)  
- **Campaign Performance** (LineChart icon)

### 2. **New Pages Created**
✅ **Meta Campaigns** - `/crm/meta-campaigns/page.tsx`
- Displays all Facebook/Instagram/WhatsApp campaigns
- Summary stats: Spend, Impressions, Clicks, Leads, Conversions
- Filters: Status, Platform, Search
- Campaign performance table with ROI/ROAS metrics
- "Sync from Meta" button ready for API integration

✅ **Meta Leads** - `/crm/meta-leads/page.tsx`
- Grid view of leads from Meta Lead Forms
- Status summary cards (New, Contacted, Qualified, Converted, Rejected)
- Filters: Status, Platform, Search (name/email/phone)
- Lead cards with campaign attribution
- Action buttons: Contact, Assign, View Customer
- Export functionality ready

✅ **Campaign Performance** - `/crm/campaign-performance/page.tsx`
- ROI & ROAS analytics dashboard
- 8 key metric cards with trend indicators
- Performance table by campaign
- Metrics: Revenue, Spend, ROI, ROAS, CTR, Conversion Rate
- Cost per Lead & Cost per Conversion tracking
- Chart placeholder for visualization library

### 3. **Database Schema**
✅ Created `database/meta_ads_schema.sql`:
- **meta_campaigns** table (campaigns with performance metrics)
- **meta_adsets** table (targeting groups)
- **meta_ads** table (individual ads)
- **meta_leads** table (captured leads)
- **meta_sync_log** table (API sync tracking)
- Auto-update triggers for timestamps
- **Auto-customer creation** trigger (converts leads → customers)
- Quality scoring (0-100) for leads
- Comprehensive indexes for performance

### 4. **API Routes**
✅ **Campaign API** - `/api/crm/meta-campaigns/route.ts`
- GET: Fetch campaigns with filters & summary stats
- POST: Create new campaign
- PATCH: Update campaign metrics

✅ **Leads API** - `/api/crm/meta-leads/route.ts`
- GET: Fetch leads with filters, pagination, status counts
- POST: Create new lead with quality scoring
- PATCH: Update lead status, assignment
- DELETE: Remove lead

### 5. **Documentation**
✅ `docs/META_ADS_CRM_INTEGRATION.md` - Comprehensive guide
- Complete feature overview
- Database schema documentation
- API endpoint reference
- Integration steps
- Sample queries and usage examples

---

## 🚀 Next Steps (Meta API Integration)

### 1. Create Meta App
```
1. Visit: https://developers.facebook.com/apps/
2. Create new app
3. Add products: Facebook Login, Ads Management, Lead Ads
4. Get App ID and App Secret
```

### 2. Environment Variables
Add to `.env.local`:
```env
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_ACCESS_TOKEN=your_long_lived_token
META_AD_ACCOUNT_ID=act_123456
```

### 3. Create Sync Service
```typescript
// lib/metaService.ts
import { supabase } from '@/lib/supabaseClient';

export async function syncMetaCampaigns() {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${process.env.META_AD_ACCOUNT_ID}/campaigns?fields=id,name,objective,status,spend,impressions,clicks&access_token=${process.env.META_ACCESS_TOKEN}`
  );
  
  const { data } = await response.json();
  
  for (const campaign of data) {
    await supabase.from('meta_campaigns').upsert({
      id: campaign.id,
      account_id: process.env.META_AD_ACCOUNT_ID,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      spend: campaign.spend,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      last_synced_at: new Date().toISOString()
    });
  }
}

export async function syncMetaLeads(formId: string) {
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${formId}/leads?access_token=${process.env.META_ACCESS_TOKEN}`
  );
  
  const { data } = await response.json();
  
  for (const lead of data) {
    await supabase.from('meta_leads').upsert({
      meta_lead_id: lead.id,
      full_name: lead.field_data.find(f => f.name === 'full_name')?.values[0],
      email: lead.field_data.find(f => f.name === 'email')?.values[0],
      phone: lead.field_data.find(f => f.name === 'phone_number')?.values[0],
      form_id: formId,
      platform: 'facebook',
      created_time: lead.created_time,
      status: 'new'
    });
  }
}
```

### 4. Wire Up Sync Buttons
Update `meta-campaigns/page.tsx`:
```typescript
const handleSync = async () => {
  setIsSyncing(true);
  await syncMetaCampaigns();
  // Refresh data
  const response = await fetch('/api/crm/meta-campaigns');
  const { data } = await response.json();
  setCampaigns(data);
  setIsSyncing(false);
};
```

### 5. Set Up Webhooks (Optional)
Create `/api/webhooks/meta/route.ts`:
```typescript
export async function POST(request: Request) {
  const body = await request.json();
  
  if (body.entry[0].changes[0].field === 'leadgen') {
    const leadData = body.entry[0].changes[0].value;
    await syncMetaLeads(leadData.form_id);
  }
  
  return new Response('OK', { status: 200 });
}
```

---

## 📊 Features Overview

| Feature | Status | Description |
|---------|--------|-------------|
| Meta Campaigns View | ✅ Complete | List all campaigns with metrics |
| Meta Leads View | ✅ Complete | Grid view of captured leads |
| Campaign Performance | ✅ Complete | ROI/ROAS analytics dashboard |
| Database Schema | ✅ Complete | 5 tables with triggers |
| API Endpoints | ✅ Complete | Full CRUD operations |
| Filtering & Search | ✅ Complete | By status, platform, dates |
| Summary Statistics | ✅ Complete | Aggregate metrics calculation |
| Lead Quality Scoring | ✅ Complete | Auto-scored 0-100 |
| Auto-Customer Creation | ✅ Complete | Trigger on lead conversion |
| Mock Data | ✅ Included | Sample campaigns & leads |
| Meta API Integration | 🔄 Pending | Next phase |
| Real-time Webhooks | 🔄 Pending | Next phase |
| Chart Visualizations | 🔄 Pending | Add Recharts/Chart.js |

---

## 🎯 Key Metrics Tracked

- **ROI** (Return on Investment) = ((Revenue - Spend) / Spend) × 100
- **ROAS** (Return on Ad Spend) = Revenue / Spend  
- **CTR** (Click-Through Rate) = (Clicks / Impressions) × 100
- **Conversion Rate** = (Conversions / Leads) × 100
- **Cost per Lead** = Total Spend / Total Leads
- **Cost per Conversion** = Total Spend / Total Conversions

---

## 📁 Files Modified/Created

**New Files:**
- `src/app/(erp)/crm/meta-campaigns/page.tsx`
- `src/app/(erp)/crm/meta-leads/page.tsx`
- `src/app/(erp)/crm/campaign-performance/page.tsx`
- `src/app/api/crm/meta-campaigns/route.ts`
- `src/app/api/crm/meta-leads/route.ts`
- `database/meta_ads_schema.sql`
- `docs/META_ADS_CRM_INTEGRATION.md`
- `docs/META_ADS_QUICK_START.md` (this file)

**Modified Files:**
- `src/components/Sidebar.tsx` (added 3 menu items)

---

## 🔒 Security Considerations

1. ✅ API routes use Supabase client (RLS enabled)
2. ✅ All pages respect existing CRM permissions
3. ⚠️ Meta access tokens should be stored securely (use Supabase Vault or encrypted env vars)
4. ⚠️ Webhook endpoints need HMAC signature verification
5. ⚠️ Rate limiting recommended for sync operations

---

## 📖 Documentation

**Full Documentation:** `docs/META_ADS_CRM_INTEGRATION.md`
- Complete schema reference
- API endpoint documentation
- Sample queries
- Integration guide
- Troubleshooting

**Database Schema:** `database/meta_ads_schema.sql`
- Copy-paste ready SQL
- Includes triggers, functions, indexes
- Sample queries in comments

---

**Status:** ✅ Phase 1-3 Complete | 🔄 Phase 4 (Meta API) Pending  
**Ready for:** Database setup → Frontend testing → API integration
