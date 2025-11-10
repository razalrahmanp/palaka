# WhatsApp Business API Integration Setup Guide
#8590949001

## 🚨 ISSUE: WhatsApp Product Not Showing in App

**Problem:** Your Meta app (AlramsCrm) doesn't have WhatsApp as an available product.

**Why:** WhatsApp Business API is accessed differently than other Meta products.

**Solution:** Use the **WhatsApp Business Platform** dashboard instead of adding it as a product.

---

## ✅ CORRECT Way to Get WhatsApp API

### Option 1: WhatsApp Business Platform (Recommended - FREE)

**Go here NOW:** https://business.facebook.com/wa/manage/home/

1. Click **"Create a WhatsApp Business Account"** or **"Get Started"**
2. Select **"Use the Cloud API"** (this is the FREE option with 1,000 free messages/month)
3. Choose your Facebook Business Account
4. **Add Phone Number:**
   - Use a NEW number (NOT your current WhatsApp numbers)
   - Get a cheap SIM card for testing (~₹99)
   - Verify via SMS
5. You'll get:
   - **Phone Number ID** - Save this
   - **WhatsApp Business Account ID** - Save this
   - **Temporary Access Token** - Save this (we'll create permanent one later)

---

## 🎯 Overview

This guide will help you integrate WhatsApp Business API to automatically capture messages from your ads into the CRM.

**What you'll get:**
- ✅ Automatic lead creation when someone messages on WhatsApp
- ✅ All conversations saved in CRM
- ✅ Send messages from CRM to WhatsApp
- ✅ No manual import needed

## ⚠️ IMPORTANT Prerequisites

1. **Different Phone Number Required**
   - WhatsApp Business API requires a separate number
   - CANNOT use your current WhatsApp Business app number
   - Options:
     - Get a new number (recommended)
     - Use Meta's test number (for testing only)
     - Port existing landline number

2. **Business Verification**
   - Meta Business verification required (takes 1-2 weeks)
   - Need business documents
   - Required for production use

3. **Public Webhook URL**
   - Your app must be accessible from internet
   - Options:
     - Deploy to production (e.g., Vercel, AWS)
     - Use ngrok for testing (temporary URL)

---

## 🚀 Step-by-Step Setup

### Step 1: Create/Access Meta App (15 minutes)

1. Go to https://developers.facebook.com/apps
2. Find your existing app **"AlramsCrm"** or create new one
3. Click on your app

### Step 2: Add WhatsApp Product (5 minutes)

**🎯 YOU ARE HERE - DO THIS NOW:**

1. On your current Meta app page (AlramsCrm - App ID: 1536191154195043)
2. Scroll down to **"Add a product"** section
3. Look for **"WhatsApp"** in the list (it's NOT showing yet - you may need to scroll)
4. If you DON'T see WhatsApp:
   - Your account might need Business Verification first
   - OR you need to add it through WhatsApp Business API dashboard

**Alternative Method (Recommended):**

1. Go directly to: https://business.facebook.com/wa/manage/home/
2. Click **"Get Started"** 
3. Select **"Use the Cloud API"** (FREE option)
4. Choose your Facebook Business Account
5. Follow the setup wizard

**What you'll get:**
- Phone Number ID
- WhatsApp Business Account ID
- Access Token (temporary - you'll create permanent one later)

### Step 3: Get Test Number (2 minutes) OR Add Production Number

**Option A: Use Test Number (Quick - Good for Testing)**

1. In WhatsApp → **"API Setup"**
2. You'll see a test number provided by Meta
3. Note the **Phone Number ID**
4. Can send messages to 5 test numbers only
5. Good for development, not for production

**Option B: Add Production Number (30 min + verification)**

1. Click **"Add Phone Number"**
2. Enter business phone number (NOT your current WhatsApp number!)
3. Verify with OTP
4. Complete business verification
5. Wait for approval (1-2 weeks)

### Step 4: Get API Credentials (5 minutes)

1. Go to WhatsApp → **"API Setup"**
2. Copy these values:

**Phone Number ID:**
```
Example: 106724825795218
```
Look under "Phone number" section

**Access Token:**
1. Click **"Generate Access Token"**  
2. Select permissions:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
3. Copy the token (starts with `EAA...`)

**Business Account ID:**
```
Example: 2341234567890
```
Found in WhatsApp → API Setup

**App Secret:**
1. Go to **Settings → Basic**
2. Click **"Show"** next to App Secret
3. Copy the value

### Step 5: Update .env.local File (2 minutes)

Add these to your `.env.local` file:

```bash
# WhatsApp API Credentials
WHATSAPP_ACCESS_TOKEN=EAAxxxx... (your actual token)
WHATSAPP_PHONE_NUMBER_ID=106724825795218 (your actual phone number ID)
WHATSAPP_BUSINESS_ACCOUNT_ID=2341234567890 (your actual business account ID)
WHATSAPP_APP_SECRET=your_app_secret_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=palaka_whatsapp_2025_secure_token

# Optional auto-reply
WHATSAPP_AUTO_REPLY=Thank you for contacting Alrams Furniture! We'll respond shortly.
```

### Step 6: Deploy Your App or Use ngrok (10-30 minutes)

**Option A: Deploy to Production (Recommended)**

1. Deploy your Next.js app to Vercel/Netlify/AWS
2. Get your public URL: `https://your-app.vercel.app`
3. Webhook URL will be: `https://your-app.vercel.app/api/whatsapp/webhook`

**Option B: Use ngrok for Testing (Quick)**

```bash
# Install ngrok
npm install -g ngrok

# Start your Next.js app
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Webhook URL: https://abc123.ngrok.io/api/whatsapp/webhook
```

⚠️ **ngrok URLs change every restart - only for testing!**

### Step 7: Configure Webhook in Meta (5 minutes)

1. Go to WhatsApp → **"Configuration"**
2. Click **"Edit"** next to Webhook

**Callback URL:**
```
https://your-domain.com/api/whatsapp/webhook
```

**Verify Token:**
```
palaka_whatsapp_2025_secure_token
```
(Must match `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in .env.local)

3. Click **"Verify and Save"**

If successful, you'll see ✅ **"Webhook verified"**

### Step 8: Subscribe to Webhook Fields (2 minutes)

1. Still in **Configuration**
2. Click **"Manage"** next to Webhook fields
3. Subscribe to:
   - ✅ `messages` (incoming messages)
   - ✅ `message_status` (delivery status)
4. Click **"Subscribe"**

### Step 9: Test the Integration! (5 minutes)

**Test 1: Receive a Message**

1. Using a phone (not the business number), send a WhatsApp message to your business number
2. Check your server logs - you should see:
   ```
   📨 Webhook received: {...}
   🆕 Creating new lead...
   ✅ Lead created successfully
   ```
3. Go to `/crm/meta-leads` in your CRM
4. You should see the new lead!

**Test 2: Send a Message**

Create a test file or use Postman:
```bash
curl -X POST https://your-domain.com/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+919876543210",
    "message": "Hello from Palaka ERP!"
  }'
```

---

## 🎉 You're All Set!

### What Happens Now:

1. **Someone clicks your Instagram ad** → Redirected to WhatsApp
2. **They send a message** → Webhook receives it
3. **CRM automatically creates lead** → Appears in Meta Leads page
4. **Your team sees the lead** → Can assign and follow up
5. **Reply from CRM** → Send WhatsApp messages via API

### Auto-Reply Feature:

New contacts automatically receive:
> "Thank you for contacting Alrams Furniture! We'll respond shortly."

Configure this in `.env.local` → `WHATSAPP_AUTO_REPLY`

---

## 📊 How It Works

### Message Flow:

```
User clicks ad → Opens WhatsApp → Sends message
        ↓
WhatsApp Cloud API
        ↓
Your Webhook (/api/whatsapp/webhook)
        ↓
Creates/Updates Lead in Database
        ↓
Lead appears in /crm/meta-leads
        ↓
Team assigns and follows up
        ↓
Send reply via /api/whatsapp/send
        ↓
User receives message on WhatsApp
```

### Database Schema:

Leads are created with:
```typescript
{
  full_name: "Contact Name" (from WhatsApp profile),
  phone: "+919876543210",
  platform: "whatsapp",
  campaign_name: "WhatsApp Inbound",
  status: "new",
  notes: "First message: [their message text]",
  last_contacted_at: timestamp,
  contact_attempts: 1
}
```

---

## 🔧 Troubleshooting

### Webhook Not Receiving Messages

**Check:**
1. Is your webhook URL publicly accessible?
2. Is it HTTPS (not HTTP)?
3. Did you subscribe to `messages` field?
4. Check server logs for errors

**Test webhook manually:**
```bash
curl -X GET "https://your-domain.com/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=palaka_whatsapp_2025_secure_token&hub.challenge=test123"
```
Should return: `test123`

### Messages Not Creating Leads

**Check:**
1. Environment variables set correctly?
2. Database connection working?
3. Check server logs: `console.log` statements
4. Verify Supabase permissions

### Can't Send Messages

**Check:**
1. `WHATSAPP_ACCESS_TOKEN` valid?
2. `WHATSAPP_PHONE_NUMBER_ID` correct?
3. Phone number format: `+919876543210` (with country code, no spaces)
4. Business verification complete? (required for production)

### Webhook Signature Verification Failed

**Check:**
1. `WHATSAPP_APP_SECRET` matches App Secret in Meta Dashboard
2. Request body not modified before verification
3. Check logs for actual signature vs expected

---

## 🚀 Next Steps

### Phase 1: Testing (Current)
- ✅ Set up webhook
- ✅ Test with personal phone
- ✅ Verify leads created
- ✅ Send test messages

### Phase 2: Production
- Get business number verified
- Deploy to production server
- Update webhook URL to production
- Train team on new system

### Phase 3: Enhancement
- Add message templates for common responses
- Set up auto-assignment to team members
- Create dashboard for WhatsApp analytics
- Integrate with existing CRM workflows

---

## � Tips & Best Practices

### 1. Message Templates

Create approved templates for:
- Welcome message
- Product catalog
- Appointment booking
- Order status
- Follow-up messages

### 2. Response Time

- Set up notifications when new messages arrive
- Aim to respond within 15 minutes
- Use auto-reply for after-hours

### 3. Lead Assignment

- Auto-assign based on:
  - Campaign source
  - Product interest
  - Geographic location
  - Team availability

### 4. Message Storage

- All messages saved in lead notes
- Searchable from CRM
- Full conversation history
- Track response times

---

## 📞 Support

**Meta Documentation:**
- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
- Webhook Setup: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
- Message Templates: https://developers.facebook.com/docs/whatsapp/message-templates

**Common Issues:**
- Check `docs/WHATSAPP_API_TROUBLESHOOTING.md`
- Review server logs in production
- Test webhook with curl/Postman

---

## 📝 Checklist

- [ ] Meta App created/accessed
- [ ] WhatsApp product added
- [ ] Test number obtained OR production number added
- [ ] API credentials copied to .env.local
- [ ] App deployed or ngrok running
- [ ] Webhook configured and verified
- [ ] Webhook fields subscribed
- [ ] Test message received successfully
- [ ] Lead created in CRM
- [ ] Test message sent successfully
- [ ] Auto-reply working (optional)
- [ ] Team trained on new system

---

*Last updated: November 8, 2025*
*WhatsApp Business API Integration - Palaka ERP*
