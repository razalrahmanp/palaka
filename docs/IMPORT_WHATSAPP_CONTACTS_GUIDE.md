# How to Import WhatsApp Contacts to CRM

## ✅ Feature Added: Manual Import

I've just added an **"Import Contacts"** button to your Meta Leads page!

### 🎯 What It Does

Allows you to manually import WhatsApp contacts (or any contacts) into your CRM as leads.

---

## 📋 Step-by-Step Guide

### Step 1: Go to Meta Leads Page

Navigate to: `/crm/meta-leads`

You'll see a new blue button: **"Import Contacts"**

### Step 2: Click "Import Contacts"

A modal will open with:
- Instructions
- Template download button
- File upload field
- Preview table

### Step 3: Download Template

Click **"Download Template CSV"** button

This downloads: `whatsapp_import_template.csv`

Template format:
```csv
full_name,phone,email,campaign_name,platform,status,notes
John Doe,+919876543210,john@example.com,WhatsApp - Sofa Inquiry,whatsapp,new,Interested in L-shaped sofa
Sarah Smith,+918765432109,sarah@example.com,Instagram - Hiring Ad,instagram,new,Applied for sales position
```

### Step 4: Fill in Your Contacts

Open the CSV in Excel/Google Sheets and add your WhatsApp contacts:

**Required Fields:**
- `full_name` - Contact's name
- `phone` - Phone number (include country code: +91...)

**Optional Fields:**
- `email` - Email address
- `campaign_name` - Which ad/campaign they came from (e.g., "Instagram Sofa Ad")
- `platform` - whatsapp, instagram, or facebook (default: whatsapp)
- `status` - new, contacted, qualified, converted, or rejected (default: new)
- `notes` - Any additional notes

**Example:**
```csv
full_name,phone,email,campaign_name,platform,status,notes
Rahul Kumar,+919876543210,rahul@gmail.com,WhatsApp - L-Sofa,whatsapp,new,Interested in brown leather sofa
Priya Sharma,+918765432109,,Instagram Hiring,instagram,new,Applied for sales position
Amit Patel,+917654321098,amit@yahoo.com,WhatsApp - Dining Table,whatsapp,contacted,Called on Nov 5
```

### Step 5: Upload CSV

1. Click **"Choose File"** or drag file
2. Select your filled CSV file
3. Wait for preview to load

### Step 6: Preview & Confirm

- Check the preview table (shows first 5 rows)
- Verify data looks correct
- Click **"Import Leads"**

### Step 7: Done!

- Success message shows how many leads were imported
- Leads appear in your Meta Leads page
- They're marked as "Manual Import" campaign
- You can filter, search, and manage them like any other lead

---

## 💡 Tips for Exporting from WhatsApp Business

### Option 1: Manual Entry (Small Volume)

If you have < 20 contacts:
1. Open WhatsApp Business app
2. Go through recent conversations
3. Copy names and numbers to CSV

### Option 2: Export Chat (Medium Volume)

For individual conversations:
1. Open WhatsApp chat
2. Menu (⋮) → More → Export Chat
3. Choose "Without Media"
4. Extract name and number manually

### Option 3: Use WhatsApp Business Statistics (Better)

1. Open WhatsApp Business app
2. Settings → Business tools → Statistics
3. See message counts
4. Manually create list of contacts you've chatted with

### Option 4: Third-Party Tools (High Volume)

If you have 100+ contacts:
- Use WhatsApp contact export tools
- Export to VCF/CSV format
- Clean up data
- Import to CRM

---

## 📊 Example Use Cases

### Use Case 1: Furniture Inquiry via Instagram Ad

**Scenario:** 50 people clicked your Instagram sofa ad and messaged on WhatsApp

**Process:**
1. Go through WhatsApp chats
2. Create CSV with their details:
```csv
full_name,phone,email,campaign_name,platform,status,notes
Ramesh K,+919876543210,,Instagram - Premium Sofa Nov,whatsapp,new,Wants 3-seater
Lakshmi S,+918765432109,lakshmi@gmail.com,Instagram - Premium Sofa Nov,whatsapp,contacted,Sent catalog
```
3. Import to CRM
4. Assign to sales team
5. Track follow-ups

### Use Case 2: Hiring Applications

**Scenario:** 30 people applied via WhatsApp for sales position

**Process:**
```csv
full_name,phone,email,campaign_name,platform,status,notes
Suresh Kumar,+919871234567,suresh@gmail.com,Hiring - Sales Executive,whatsapp,new,5 years exp
Anjali Nair,+918761234567,anjali@yahoo.com,Hiring - Sales Executive,whatsapp,contacted,Interview scheduled
```

### Use Case 3: Product-Specific Campaigns

**Scenario:** Different products, different ad campaigns

```csv
full_name,phone,email,campaign_name,platform,status,notes
Customer 1,+919871111111,,WhatsApp - Dining Table Oct,whatsapp,qualified,Budget 50k
Customer 2,+919872222222,,WhatsApp - Wardrobe Nov,whatsapp,new,Wants 4-door
Customer 3,+919873333333,,Instagram - Bed Set,instagram,converted,Purchased Nov 7
```

---

## 🎯 Best Practices

### 1. Campaign Naming Convention

Be consistent with campaign names:
- `WhatsApp - [Product] - [Month]`
- `Instagram - [Product] - [Month]`
- `Hiring - [Position]`

Examples:
- `WhatsApp - L-Sofa - Nov 2025`
- `Instagram - Dining Table - Oct 2025`
- `Hiring - Sales Executive`

### 2. Phone Number Format

Always include country code:
- ✅ `+919876543210`
- ❌ `9876543210`
- ❌ `+91 98765 43210` (no spaces)

### 3. Status Guidelines

- **new** - Just received message, not contacted yet
- **contacted** - Called/messaged but no commitment
- **qualified** - Serious buyer, budget confirmed
- **converted** - Made purchase/hired
- **rejected** - Not interested/budget too low

### 4. Notes Field

Add useful context:
- Product interest
- Budget range
- Timeline
- Special requirements
- Last conversation summary

---

## ⚙️ Advanced: Automating the Process

### Future Enhancement: WhatsApp Webhook

Instead of manual import, you could set up:

1. **WhatsApp Business API** (we discussed this)
2. **Webhook** receives messages automatically
3. **Auto-create leads** in CRM
4. **No manual work**

But for now, manual import works perfectly!

---

## ❓ FAQ

**Q: Can I import the same contact twice?**
A: Yes, but they'll appear as separate leads. We use unique IDs for each import.

**Q: What if I don't have email addresses?**
A: That's fine! Only name and phone are required. Leave email blank.

**Q: Can I update existing leads?**
A: Currently imports create new leads. Use the "Edit" button on individual leads to update them.

**Q: How many contacts can I import at once?**
A: Technically unlimited, but we recommend batches of 100-200 for best performance.

**Q: What happens if the CSV format is wrong?**
A: The preview will show errors. Just fix the CSV and re-upload.

**Q: Can I import leads from Facebook/Instagram too?**
A: Yes! Just set the `platform` column to `facebook` or `instagram`.

---

## 🚀 Quick Start (TL;DR)

1. Click **"Import Contacts"** button on Meta Leads page
2. Download template CSV
3. Fill in your WhatsApp contacts (name, phone required)
4. Upload CSV
5. Preview looks good? Click **"Import Leads"**
6. Done! Leads are now in your CRM

---

## 📞 Next Steps After Import

Once your WhatsApp contacts are in the CRM:

1. **Assign to Team:**
   - Click "Assign" button on each lead
   - Distribute to sales team

2. **Follow Up:**
   - Filter by "new" status
   - Contact within 24 hours
   - Update status to "contacted"

3. **Track Progress:**
   - Move through pipeline: new → contacted → qualified → converted
   - Add notes after each interaction

4. **Analyze:**
   - See which campaigns generate best leads
   - Track conversion rates
   - Optimize future ads

---

## 🎉 You're All Set!

The **Import Contacts** feature is live on your Meta Leads page right now!

Try it with 2-3 test contacts first to get comfortable with the process.

*Last updated: November 8, 2025*
