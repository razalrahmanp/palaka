# WhatsApp API Auto-Reply & Routing Setup Guide

## 🎯 Your Solution

**Problem:** You run Meta ads with "Click to WhatsApp" that send customers to 2 different numbers. You want those messages automatically in your CRM.

**Solution:** New WhatsApp API number → Auto-reply with routing → Customers call your existing numbers → Messages saved in CRM

---

## 📋 What We Built

### 1. **Auto-Reply System**
When customer messages your new API number:
```
Customer: "I want to buy a sofa"

Auto-Reply (Instant):
"Hello! 👋
Thank you for contacting Al Rams Furniture! 🪑

We have received your message and our Sales - Furniture team will assist you shortly.

📞 For immediate assistance, you can also call us at:
+91XXXXXXXXXX

Our team typically responds within 15-30 minutes during business hours (9 AM - 7 PM).

Thank you for your patience! 🙏"
```

### 2. **Smart Routing**
System analyzes message for keywords:

| Customer Message Contains | Routes To | Department |
|--------------------------|-----------|------------|
| furniture, sofa, chair, table, bed, etc. | Number 1 | Sales - Furniture |
| hiring, job, vacancy, apply, etc. | Number 2 | HR - Recruitment |
| (no keywords) | Number 1 | Sales - General |

### 3. **CRM Integration**
Every message automatically:
- ✅ Creates lead in CRM
- ✅ Records message content
- ✅ Shows routing info
- ✅ Tracks conversation

---

## 🚀 Setup Steps

### Step 1: Get WhatsApp Business API Access

**Option A: Meta Cloud API (Free)** ⭐ Recommended

1. Go to [Meta Business](https://business.facebook.com)
2. **Settings** → **WhatsApp Accounts**
3. Click **Add** → **Create a WhatsApp Business Account**
4. **Add Phone Number** → Use your NEW number (not existing ones)
5. Verify via SMS code
6. Get credentials:
   - Phone Number ID
   - Access Token
   - Business Account ID

**Important:** Get a NEW phone number for API. Keep your 2 existing numbers as they are!

---

### Step 2: Update Configuration File

Edit `.env.local` file:

```env
# WhatsApp Business API Credentials
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxx... (from Meta)
WHATSAPP_PHONE_NUMBER_ID=1234567890 (from Meta)
WHATSAPP_BUSINESS_ACCOUNT_ID=9876543210 (from Meta)
WHATSAPP_WEBHOOK_VERIFY_TOKEN=palaka_whatsapp_2025_secure_token_change_this
WHATSAPP_APP_SECRET=your_app_secret_here (from Meta App Settings)
```

---

### Step 3: Update Your Phone Numbers

Edit `src/lib/whatsappAutoReplyService.ts`:

Find these lines and replace with YOUR numbers:

```typescript
// Line 28-32 - Furniture Sales Routing
{
  keywords: ['furniture', 'sofa', 'chair', ...],
  phoneNumber: '+919876543210', // ⚠️ CHANGE THIS to your Number 1
  department: 'Sales - Furniture'
},

// Line 33-37 - HR/Hiring Routing
{
  keywords: ['hiring', 'job', 'vacancy', ...],
  phoneNumber: '+918765432109', // ⚠️ CHANGE THIS to your Number 2
  department: 'HR - Recruitment'
}

// Line 41-45 - Default Routing
private defaultRouting: RoutingRule = {
  keywords: [],
  phoneNumber: '+919876543210', // ⚠️ CHANGE THIS to your default number
  department: 'Sales - General'
};
```

---

### Step 4: Set Up Webhook in Meta

1. Go to your Meta App → **WhatsApp** → **Configuration**
2. **Webhook** section:
   - Callback URL: `https://your-domain.com/api/whatsapp/webhook`
   - Verify Token: `palaka_whatsapp_2025_secure_token_change_this` (same as .env)
3. Subscribe to field: **messages**
4. Save

---

### Step 5: Update Your Meta Ads

Change your Instagram/Facebook ads to show NEW API number:

**Old Ad:**
- Button: "Send Message"
- Goes to: +91XXXXXXXXXX or +91YYYYYYYYYY

**New Ad:**
- Button: "Send Message"
- Goes to: +91ZZZZZZZZZZZ (your NEW API number)

---

### Step 6: Test Everything

1. **Test Message:**
   Send "I want to buy sofa" to your new API number

2. **Check Auto-Reply:**
   You should receive instant reply with Number 1

3. **Check CRM:**
   Go to `/crm/meta-leads` - lead should appear

4. **Test Routing:**
   - Message with "sofa" → Should route to Number 1
   - Message with "hiring" → Should route to Number 2
   - Message with "hello" → Should route to default (Number 1)

---

## 📞 Your Setup (Example)

### Current (Before):
```
Instagram Ad → Click → WhatsApp Number 1 (+91 98765 43210)
Instagram Ad → Click → WhatsApp Number 2 (+91 98765 43211)

Messages: In WhatsApp Business app only
CRM: Manual entry required
```

### New (After):
```
Instagram Ad → Click → WhatsApp API Number (+91 98765 43299)
                        ↓
                Auto-Reply with routing:
                - Furniture query → Call +91 98765 43210
                - Hiring query → Call +91 98765 43211
                        ↓
              Lead created in CRM automatically

Original Numbers: Still work in WhatsApp Business app
```

---

## 🎨 Customizing Auto-Reply Messages

### Current Message Template:
```
Hello! 👋

Thank you for contacting *Al Rams Furniture*! 🪑

We have received your message and our {department} team will assist you shortly.

📞 *For immediate assistance, you can also call us at:*
{phone_number}

⏰ *Business Hours:* 9 AM - 7 PM (Mon-Sat)

Our team typically responds within 15-30 minutes during business hours.

Thank you for your patience! 🙏

_This is an automated message. A representative will reply soon._
```

### To Customize:

Edit `src/lib/whatsappAutoReplyService.ts`:

**Line 94-120** - New Customer Message
**Line 130-150** - Returning Customer Message

You can change:
- Emojis
- Business hours
- Response time
- Company name
- Address/showroom info

---

## 🔧 Configuration Page

Access: `/crm/whatsapp-config`

Features:
- Update routing rules
- Change phone numbers
- Add/remove keywords
- Set default routing
- Preview auto-reply messages

---

## 📊 How It Works (Technical Flow)

```
1. Customer clicks ad
   ↓
2. Opens WhatsApp to API number
   ↓
3. Sends message: "I need a sofa"
   ↓
4. Webhook receives message → Your server
   ↓
5. Auto-Reply Service analyzes keywords
   - Finds: "sofa" matches furniture keywords
   - Routes to: Number 1 (Sales - Furniture)
   ↓
6. Sends auto-reply with Number 1
   ↓
7. Creates lead in CRM:
   - Name: Customer name
   - Phone: Customer WhatsApp number
   - Message: "I need a sofa"
   - Routed to: +91 98765 43210
   - Department: Sales - Furniture
   ↓
8. Customer sees auto-reply
   ↓
9. Customer calls Number 1 or waits for reply
   ↓
10. Your sales team sees lead in CRM
```

---

## 💰 Costs

### Meta Cloud API (Recommended):
- **First 1,000 messages/month:** FREE
- **After 1,000:** ~₹0.40 per message
- **Business verification:** FREE

### New Phone Number:
- **SIM card:** ₹99-299 one-time
- **Monthly recharge:** ₹99-299/month

### Total Monthly Cost:
- If < 1,000 messages: **₹99-299** (just phone recharge)
- If > 1,000 messages: **₹99-299 + message costs**

---

## ⚠️ Important Notes

### What to Tell Customers:

**Update your ads with message like:**
> "Message us on WhatsApp for instant assistance! Our team will connect you with the right department."

### Your Existing Numbers:

**Keep both numbers active** on WhatsApp Business app:
- Number 1: Still receives calls from auto-replies
- Number 2: Still receives calls from auto-replies
- They DON'T need Meta API (stay on regular WhatsApp)

### Only NEW API Number:

- Gets messages from ads
- Sends auto-replies
- Tells customers to call your existing numbers
- Creates leads in CRM

---

## 🎯 Routing Examples

### Example 1: Furniture Inquiry
```
Customer: "Show me your latest sofa designs"
Keywords matched: "sofa", "designs"
Routed to: +91 98765 43210 (Number 1 - Sales)
Auto-reply: "...call us at +91 98765 43210..."
```

### Example 2: Hiring Inquiry
```
Customer: "Are you hiring for sales position?"
Keywords matched: "hiring", "position"
Routed to: +91 98765 43211 (Number 2 - HR)
Auto-reply: "...call us at +91 98765 43211..."
```

### Example 3: General Inquiry
```
Customer: "Hello"
Keywords matched: (none)
Routed to: +91 98765 43210 (Default - Number 1)
Auto-reply: "...call us at +91 98765 43210..."
```

---

## 🔍 Testing Checklist

Before going live:

- [ ] WhatsApp API credentials in `.env.local`
- [ ] Your 2 phone numbers updated in code
- [ ] Webhook URL configured in Meta
- [ ] Webhook verified successfully
- [ ] Test message sent → Auto-reply received
- [ ] Lead appears in CRM
- [ ] Routing works for furniture keywords
- [ ] Routing works for hiring keywords
- [ ] Default routing works for generic messages
- [ ] Returning customer gets shorter message

---

## 🚨 Troubleshooting

### Auto-Reply Not Sending:

1. Check `.env.local` credentials
2. Check webhook is verified
3. Check console logs
4. Verify WHATSAPP_ACCESS_TOKEN is valid

### Wrong Number in Auto-Reply:

1. Edit `src/lib/whatsappAutoReplyService.ts`
2. Update phone numbers (lines 28-45)
3. Restart dev server

### Lead Not Creating:

1. Check Supabase connection
2. Verify meta_leads table exists
3. Check console for errors

### Keywords Not Matching:

1. Keywords are case-insensitive
2. Add more keywords if needed
3. Check routing rules in code

---

## 📱 Your Final Setup

### New API Number:
- **Purpose:** Receives all ad messages
- **Action:** Sends auto-reply with routing
- **Platform:** WhatsApp Business API

### Number 1 (Existing):
- **Purpose:** Furniture sales
- **Receives:** Calls from customers (from auto-reply)
- **Platform:** WhatsApp Business App (no change)

### Number 2 (Existing):
- **Purpose:** HR/Recruitment
- **Receives:** Calls from customers (from auto-reply)
- **Platform:** WhatsApp Business App (no change)

---

## 🎉 Success Criteria

**You'll know it's working when:**

1. ✅ Customer messages API number
2. ✅ Gets instant auto-reply
3. ✅ Auto-reply shows correct phone number based on keywords
4. ✅ Lead appears in CRM within seconds
5. ✅ Your team sees the inquiry and can follow up

---

## 📞 Next Steps

1. **Today:**
   - Get new phone number (SIM card)
   - Apply for WhatsApp Business API
   - Start verification process

2. **This Week:**
   - Complete business verification
   - Configure webhook
   - Update phone numbers in code

3. **Next Week:**
   - Test thoroughly
   - Update Meta ads with new number
   - Train team on new system

4. **Ongoing:**
   - Monitor CRM for leads
   - Adjust keywords as needed
   - Track conversion rates

---

## 🔗 Resources

- **WhatsApp Business API:** https://business.whatsapp.com/products/business-platform
- **Meta Developer Console:** https://developers.facebook.com
- **CRM Meta Leads Page:** /crm/meta-leads
- **Routing Config Page:** /crm/whatsapp-config

---

*Last Updated: November 10, 2025*
*Version: 1.0*
