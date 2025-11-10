# Quick Fix: Meta API Credentials

## ❌ Error You're Seeing:

```
Meta API credentials not configured
Error: Meta API connection failed: Invalid OAuth access token
```

## ✅ Quick Solution (5 minutes):

### Step 1: Get Access Token (Testing)

1. **Go to**: [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/)

2. **Select your app** from the dropdown (or use "Graph API Explorer" default app for testing)

3. **Click** "Generate Access Token"

4. **Select permissions** (check all these boxes):
   - ✅ `ads_read`
   - ✅ `ads_management`
   - ✅ `leads_retrieval`
   - ✅ `business_management`

5. **Click "Generate Access Token"**

6. **Copy the token** (long string starting with "EAA...")

### Step 2: Get Ad Account ID

**Option A - From URL:**
1. Go to [Meta Ads Manager](https://business.facebook.com/adsmanager/)
2. Look at the URL: `https://business.facebook.com/adsmanager/manage/campaigns?act=123456789`
3. Copy **only the numbers** after `act=`
4. Example: If URL shows `act=123456789`, your ID is `123456789`

**Option B - From Business Settings:**
1. Go to [Business Settings](https://business.facebook.com/settings/)
2. Click **Accounts** → **Ad Accounts**
3. Select your ad account
4. Copy the **Account ID** (numbers only, remove `act_` if present)

### Step 3: Update .env.local File

1. **Open** the file: `G:\PROJECT\Al_Rams\palaka\.env.local`

2. **Replace** the placeholder values:

```bash
# Before (placeholders):
META_ACCESS_TOKEN=your_access_token_here
META_AD_ACCOUNT_ID=your_ad_account_id_here

# After (your actual values):
META_ACCESS_TOKEN=EAABwzLixnjYBO... [paste your full token here]
META_AD_ACCOUNT_ID=123456789 [paste your numbers here]
```

3. **Save** the file

### Step 4: Restart Server

**In your terminal:**

```powershell
# Stop the server (Ctrl+C if running)

# Restart it
npm run dev
```

**IMPORTANT:** Next.js only reads `.env.local` on startup. You MUST restart the server after changing environment variables.

### Step 5: Test Connection

1. **Go to**: http://localhost:3000/crm/meta-campaigns

2. **Click**: "Sync from Meta" button

3. **Expected result**: 
   - Loading spinner appears
   - Success message: "Sync completed! Created: X, Updated: Y"
   - Your real campaigns appear in the table

---

## 🐛 Still Getting Errors?

### Error: "Invalid OAuth access token"

**Cause:** Token expired or invalid

**Fix:**
1. Token from Graph API Explorer expires in **1-2 hours**
2. Generate a **new token** (repeat Step 1)
3. For longer validity, follow the "Long-Lived Token" guide in `META_API_SETUP_GUIDE.md`

### Error: "Cannot parse access token"

**Cause:** Token has extra spaces or quotes

**Fix:**
1. Make sure token has **NO quotes** around it
2. Make sure there are **NO spaces** before or after token
3. Correct format:
   ```
   META_ACCESS_TOKEN=EAABwzLixnjYBO1234567890...
   ```
4. **NOT:**
   ```
   META_ACCESS_TOKEN="EAABwzLixnjYBO1234567890..."  ❌
   META_ACCESS_TOKEN= EAABwzLixnjYBO1234567890...   ❌
   ```

### Error: "Unsupported get request"

**Cause:** Ad Account ID has `act_` prefix or is incorrect

**Fix:**
1. Remove `act_` from the ID
2. Use **only numbers**
3. Correct: `META_AD_ACCOUNT_ID=123456789`
4. **NOT:** `META_AD_ACCOUNT_ID=act_123456789` ❌

### Error: "credentials not configured"

**Cause:** Server not restarted after editing `.env.local`

**Fix:**
1. Stop server: **Ctrl+C** in terminal
2. Restart: `npm run dev`
3. Wait for "Ready" message
4. Try sync again

---

## 📝 Checklist

Use this to verify everything:

- [ ] Opened Graph API Explorer
- [ ] Generated access token with correct permissions
- [ ] Copied full token (starts with "EAA...")
- [ ] Found Ad Account ID from Ads Manager URL
- [ ] Copied only the numbers (no `act_` prefix)
- [ ] Opened `.env.local` file
- [ ] Pasted token (no quotes, no spaces)
- [ ] Pasted Account ID (numbers only)
- [ ] Saved `.env.local` file
- [ ] Stopped dev server (Ctrl+C)
- [ ] Started dev server (`npm run dev`)
- [ ] Waited for "Ready" message
- [ ] Opened `/crm/meta-campaigns` page
- [ ] Clicked "Sync from Meta" button
- [ ] Sync completed successfully ✅

---

## 🎯 Example .env.local File

```bash
# WORKING EXAMPLE (with fake values - use your real ones):

META_ACCESS_TOKEN=EAABwzLixnjYBO1234567890abcdefghijklmnopqrstuvwxyzABCDEF
META_AD_ACCOUNT_ID=987654321

# Optional (not needed for testing):
META_APP_ID=1234567890
META_APP_SECRET=abcdef1234567890abcdef1234567890
```

**Copy this format** but replace with your actual values!

---

## ⏱️ Quick Test (30 seconds)

Test if your credentials work **without coding**:

1. **Copy this URL** (replace with your values):
```
https://graph.facebook.com/v19.0/act_YOUR_ACCOUNT_ID/campaigns?access_token=YOUR_ACCESS_TOKEN&fields=id,name&limit=3
```

2. **Replace**:
   - `YOUR_ACCOUNT_ID` with your numbers
   - `YOUR_ACCESS_TOKEN` with your token

3. **Paste in browser** and press Enter

4. **Expected result** (JSON with campaigns):
```json
{
  "data": [
    {
      "id": "123456",
      "name": "My Campaign"
    }
  ]
}
```

5. **If you see this** → Your credentials are correct! ✅

6. **If error** → Check token/account ID

---

## 🚀 After Setup

Once working, your token expires in 1-2 hours.

**For production use**, get a **long-lived token** (60 days):

See full guide: `docs/META_API_SETUP_GUIDE.md` → "Step 3: Get Access Token" → "Option B: Long-Lived Token"

---

## 💡 Pro Tips

1. **Use Graph API Explorer app for quick testing** (no need to create your own app initially)

2. **Test credentials in browser first** before using in app

3. **Check Ads Manager** to confirm you have active campaigns to sync

4. **Look at browser console** (F12 → Console tab) for detailed error messages

5. **Check terminal output** for server-side errors

---

**Need more help?** See the complete guide: `docs/META_API_SETUP_GUIDE.md`
