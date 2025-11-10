# Meta Ads API Setup Guide

## Complete guide to connect Facebook, Instagram & WhatsApp campaigns to your CRM

---

## 📋 Prerequisites

1. **Meta Business Account** - Create at [business.facebook.com](https://business.facebook.com)
2. **Facebook Ad Account** - Active ads account with campaigns
3. **Facebook App** - Required for API access

---

## 🚀 Step 1: Create a Meta (Facebook) App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as the app type
4. Fill in app details:
   - **App Name**: "Your Company CRM Integration"
   - **App Contact Email**: your-email@company.com
5. Click **"Create App"**

---

## 🔧 Step 2: Configure App Products

### Add Required Products:

1. **In your app dashboard, add these products:**
   - ✅ **Facebook Login** - For authentication
   - ✅ **Marketing API** - For campaigns and ads data
   - ✅ **Lead Ads** - For lead forms integration

2. **Set up Facebook Login:**
   - Go to **Facebook Login** → **Settings**
   - Add **Valid OAuth Redirect URIs**: `http://localhost:3000/api/auth/callback`

---

## 🔑 Step 3: Get Access Token

### Option A: Short-Term Token (Testing)

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from dropdown
3. Click **"Generate Access Token"**
4. Select permissions:
   - ✅ `ads_read` - Read ad account data
   - ✅ `ads_management` - Manage ads
   - ✅ `leads_retrieval` - Access lead forms
   - ✅ `business_management` - Access business data
5. Click **"Generate Access Token"**
6. **Copy the token** (expires in 1-2 hours)

### Option B: Long-Lived Token (Production)

1. Get short-term token from Option A
2. Run this in terminal:

```bash
curl -i -X GET "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN"
```

3. Response will contain a long-lived token (60 days)
4. For permanent access, convert to **System User Token** or use **Meta Business SDK**

---

## 🎯 Step 4: Get Your Ad Account ID

1. Go to [Meta Ads Manager](https://business.facebook.com/adsmanager/)
2. Look at the URL: `https://business.facebook.com/adsmanager/manage/campaigns?act=123456789`
3. The number after `act=` is your **Ad Account ID**
4. Example: If URL shows `act=123456789`, your ID is `123456789`

**OR**

1. Go to **Business Settings** → **Accounts** → **Ad Accounts**
2. Click on your ad account
3. Copy the **Ad Account ID** (without the `act_` prefix)

---

## ⚙️ Step 5: Configure Your Application

### 1. Add to `.env.local` file:

```bash
# Meta Ads API Configuration
META_ACCESS_TOKEN=YOUR_LONG_LIVED_ACCESS_TOKEN_HERE
META_AD_ACCOUNT_ID=YOUR_AD_ACCOUNT_ID_HERE

# Optional: For token refresh
META_APP_ID=YOUR_APP_ID_HERE
META_APP_SECRET=YOUR_APP_SECRET_HERE
```

### 2. Example configuration:

```bash
META_ACCESS_TOKEN=EAABwzLixnjYBO1234567890abcdefghijklmnopqrstuvwxyz...
META_AD_ACCOUNT_ID=123456789
META_APP_ID=987654321
META_APP_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## 🧪 Step 6: Test API Connection

### Option 1: Using Browser (Quick Test)

Go to this URL (replace with your values):

```
https://graph.facebook.com/v19.0/act_YOUR_AD_ACCOUNT_ID/campaigns?access_token=YOUR_ACCESS_TOKEN&fields=id,name,status&limit=5
```

**Expected response:**
```json
{
  "data": [
    {
      "id": "123456789",
      "name": "My Campaign",
      "status": "ACTIVE"
    }
  ]
}
```

### Option 2: In Your App

1. Start your development server:
```bash
npm run dev
```

2. Navigate to: `http://localhost:3000/crm/meta-campaigns`

3. Click **"Sync from Meta"** button

4. Check console for errors or success message

---

## 📊 Step 7: Sync Your Campaigns

### Via UI:

1. Go to **CRM → Meta Campaigns**
2. Click **"Sync from Meta"** button
3. Wait for sync to complete
4. See campaigns from Facebook, Instagram, WhatsApp

### Via API:

```bash
# Sync campaigns
curl -X POST http://localhost:3000/api/crm/meta-sync \
  -H "Content-Type: application/json" \
  -d '{"sync_type": "campaigns"}'

# Sync leads
curl -X POST http://localhost:3000/api/crm/meta-sync \
  -H "Content-Type: application/json" \
  -d '{"sync_type": "leads"}'

# Full sync (campaigns + leads)
curl -X POST http://localhost:3000/api/crm/meta-sync \
  -H "Content-Type: application/json" \
  -d '{"sync_type": "full"}'
```

---

## 🔄 Platform Detection

Campaigns are categorized by platform:

- **Facebook** - Blue badge 📘
- **Instagram** - Pink badge 📷
- **WhatsApp** - Green badge 💬
- **Multi** - Purple badge (runs on multiple platforms)

**Note:** Meta API doesn't directly expose platform in campaign data. Platform is determined by ad set placements. Current implementation defaults to "multi" - you can enhance this by fetching ad set data.

---

## 🐛 Troubleshooting

### Error: "Meta API credentials not configured"

**Solution:** Make sure `.env.local` file has correct values and restart dev server.

### Error: "Invalid OAuth access token"

**Solutions:**
1. Token expired - generate new long-lived token
2. Wrong permissions - regenerate with all required scopes
3. App not approved - submit app for review if needed

### Error: "Unsupported get request"

**Solution:** Check your Ad Account ID format (no `act_` prefix in .env)

### No campaigns showing up

**Solutions:**
1. Check if you have active campaigns in Ads Manager
2. Verify token has `ads_read` permission
3. Check browser console for API errors
4. Try manual API call in Graph API Explorer

### Error: "Application does not have permission for this action"

**Solution:** 
1. Go to App Dashboard → **App Review** → **Permissions and Features**
2. Request advanced access for:
   - `ads_management`
   - `ads_read`
   - `leads_retrieval`

---

## 📈 What Gets Synced

### Campaigns
- ✅ Name, objective, status
- ✅ Budget (daily/lifetime)
- ✅ Performance metrics (spend, impressions, clicks)
- ✅ ROI and ROAS calculations
- ✅ Lead count and conversions
- ✅ Platform detection

### Leads (from Lead Forms)
- ✅ Contact information (name, email, phone)
- ✅ Company and job title
- ✅ Campaign attribution
- ✅ Platform source
- ✅ Quality scoring (0-100)
- ✅ Custom form fields

---

## 🔐 Security Best Practices

1. **Never commit `.env.local`** to git (already in `.gitignore`)
2. **Use System User tokens** for production (never expire)
3. **Rotate tokens** every 60 days
4. **Enable 2FA** on your Meta Business Account
5. **Restrict IP access** in Business Settings
6. **Use HTTPS** in production

---

## 🎓 Advanced: Webhook Setup (Real-time Lead Capture)

### 1. Configure Webhook in Meta App:

1. Go to **App Dashboard** → **Webhooks**
2. Subscribe to **Lead** webhooks
3. Callback URL: `https://yourdomain.com/api/webhooks/meta`
4. Verify token: Generate random string and save in `.env.local`

### 2. Create Webhook Handler:

File: `src/app/api/webhooks/meta/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get('hub.mode');
  const token = params.get('hub.verify_token');
  const challenge = params.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Process lead webhook
  if (body.object === 'leadgen') {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'leadgen') {
          const leadId = change.value.leadgen_id;
          // Fetch and save lead...
        }
      }
    }
  }
  
  return NextResponse.json({ success: true });
}
```

---

## 📚 Resources

- [Meta Marketing API Docs](https://developers.facebook.com/docs/marketing-apis)
- [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
- [Lead Ads API](https://developers.facebook.com/docs/marketing-api/guides/lead-ads)
- [Meta Business Help Center](https://www.facebook.com/business/help)

---

## ✅ Quick Checklist

- [ ] Created Meta Business Account
- [ ] Created Facebook App
- [ ] Added Marketing API and Lead Ads products
- [ ] Generated long-lived access token
- [ ] Found Ad Account ID
- [ ] Added credentials to `.env.local`
- [ ] Restarted dev server
- [ ] Tested API connection
- [ ] Clicked "Sync from Meta" button
- [ ] Verified campaigns loaded
- [ ] Checked leads imported

---

**🎉 Done! Your Meta campaigns are now syncing to your CRM!**

For support, check the troubleshooting section or contact your development team.
