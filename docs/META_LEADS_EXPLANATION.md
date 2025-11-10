# Meta Ads Leads - Important Information

## 🔍 Understanding Your Lead Data

### Current Situation

**Database Status:**
- ✅ 57 campaigns synced successfully
- ✅ Campaign metrics synced (spend, impressions, clicks)
- ⚠️ **0 actual lead records** in database
- 📊 **114 "leads"** shown in insights (aggregated metric from Meta)

### Why the Numbers Don't Match

#### Meta Reports 3 Types of "Leads":

1. **Lead Form Submissions** ✅ Retrievable
   - User fills out a form in the ad
   - Data stored in Meta's system
   - Can be fetched via Graph API
   - **Example:** Pinterest SOFA Leads KL (10 leads found)

2. **Click to WhatsApp/Messenger** ❌ Not Retrievable as Leads
   - User clicks "Send Message" button
   - Redirects to WhatsApp/Messenger
   - No form data collected
   - **Counted as "lead" in metrics but no data to fetch**

3. **Deleted/Expired Leads** ❌ No Longer Available
   - Meta only retains lead data for 90 days
   - After that, leads are deleted
   - Metrics still show historical count

---

## 🎯 Your Campaign Breakdown

### OUTCOME_LEADS Campaigns (7 total):

| Campaign | Status | Metric Shows | API Returns | Why? |
|----------|--------|-------------|-------------|------|
| **Pinterest SOFA Leads KL** | PAUSED | 10 leads | ✅ 10 leads | Has lead form attached |
| Hiring Sales & Telecaller | PAUSED | 17 leads | ❌ 0 leads | Form removed or leads expired |
| Hiring Manager | PAUSED | 28 leads | ❌ 0 leads | Form removed or leads expired |
| Hiring Sale executive | PAUSED | 33 leads | ❌ 0 leads | Form removed or leads expired |
| Hiring Account | PAUSED | 14 leads | ❌ 0 leads | Form removed or leads expired |
| Logistic Hiring | PAUSED | 12 leads | ❌ 0 leads | Form removed or leads expired |
| Sale Hiring | PAUSED | 0 leads | ❌ 0 leads | No form attached |

### OUTCOME_ENGAGEMENT/AWARENESS Campaigns (50 total):
- These campaigns drive clicks, engagement, and awareness
- They **cannot** generate lead form data
- "Click to WhatsApp" buttons don't capture structured lead data

---

## 💡 Solutions

### Option 1: Sync Available Leads (Recommended)

Click **"Sync from Meta"** on the Meta Leads page to fetch the 10 available leads from Pinterest SOFA Leads KL campaign.

**Steps:**
1. Go to `/crm/meta-leads`
2. Click "Sync from Meta"
3. 10 leads will be imported to your database

### Option 2: Create New Lead Form Campaigns

To capture more leads in the future:

1. **In Meta Ads Manager:**
   - Create campaign with OUTCOME_LEADS objective
   - Create a lead form (Instant Form)
   - Attach form to your ads

2. **In This CRM:**
   - Click "Sync from Meta"
   - Leads will automatically appear

3. **Best Practices:**
   - Keep forms short (3-5 fields max)
   - Offer clear value (discount, catalog, etc.)
   - Follow up within 24 hours

### Option 3: WhatsApp Business API Integration

To capture WhatsApp conversations:

**Requirements:**
- WhatsApp Business Platform account
- Business verification
- Webhook setup
- Developer resources

**What You'll Get:**
- Real-time message notifications
- Full conversation history
- Ability to reply from CRM
- Customer contact information

**Implementation Complexity:** High (requires backend development)

### Option 4: Manual Import from WhatsApp Business App

**For Now:**
1. Open WhatsApp Business app
2. Export chat conversations
3. Manually create lead records in CRM
4. Assign to sales team

**Limitations:**
- Time-consuming
- No automation
- Prone to errors

---

## 📋 Action Plan

### Immediate (Today):

1. ✅ Sync the 10 available leads:
   ```
   Go to: /crm/meta-leads
   Click: "Sync from Meta"
   ```

2. ✅ Review which campaigns actually need lead forms:
   - Hiring campaigns → Create lead forms
   - Product campaigns → Consider "Click to WhatsApp" for direct conversation

### Short Term (This Week):

1. **Decide on lead capture strategy:**
   - Lead forms for hiring/high-value products
   - WhatsApp for quick inquiries
   - Both for maximum coverage

2. **Update active campaigns:**
   - Attach lead forms to relevant ads
   - Ensure forms are mobile-optimized
   - Add privacy policy link

### Long Term (This Month):

1. **Consider WhatsApp Business API:**
   - Research providers (Twilio, MessageBird, Meta Cloud API)
   - Get business verified
   - Set up webhook integration

2. **Build lead nurture process:**
   - Auto-assign leads to sales team
   - Set follow-up reminders
   - Track conversion rates

---

## 🔧 Technical Notes

### Why Some Leads Show in Metrics But Not API:

```typescript
// Meta Insights API returns aggregated metrics
{
  "leads": 114 // Total count over campaign lifetime
}

// But Graph API only returns leads that:
// 1. Are less than 90 days old
// 2. Have form data attached
// 3. Haven't been deleted
```

### Difference Between Metrics:

- **`leads_count` in insights** = Historical total (all time)
- **`/leads` endpoint data** = Currently retrievable leads
- **Database count** = What you've synced and stored

---

## ❓ FAQs

**Q: Why do I see 114 leads but can only fetch 10?**
A: Meta's insights show historical totals, but only recent leads with forms attached can be retrieved.

**Q: Can I get WhatsApp messages as leads?**
A: Not directly. WhatsApp messages require separate Business API integration.

**Q: How long does Meta store lead data?**
A: 90 days. After that, you can't retrieve the data (but metrics still count them).

**Q: Should I use lead forms or "Click to WhatsApp"?**
A: 
- **Lead forms**: Better for qualifying leads before contact
- **Click to WhatsApp**: Better for immediate conversation
- **Both**: Use lead form with WhatsApp as follow-up option

---

## 📞 Next Steps

1. Click "Sync from Meta" to get the 10 available leads
2. Review your campaign objectives:
   - Lead generation → Attach forms
   - Brand awareness → Keep as is
   - Sales → Consider WhatsApp API
3. Monitor which campaigns actually generate retrievable leads
4. Adjust strategy based on what works

---

*Last updated: November 8, 2025*
*For technical support, check the console logs or Meta's Business Help Center*
