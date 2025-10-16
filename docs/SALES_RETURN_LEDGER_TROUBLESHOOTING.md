# Sales Return Ledger Troubleshooting Guide

**Issue**: Sales return ledgers showing ₹0 balance and "Settled" status when they should show outstanding refunds

**Date**: 2025-10-16

---

## Current Situation

### What You're Seeing (WRONG)
```
Sales Return 4094d994  ₹20,000  ₹20,000  ₹0  Settled  ❌
Sales Return c544daa1  ₹12,180  ₹12,180  ₹0  Settled  ❌
Sales Return f66aff6a  ₹10,000  ₹10,000  ₹0  Settled  ❌
Sales Return e6f1904c  ₹2,925   ₹2,925   ₹0  Settled  ❌
```

### What You Should See (CORRECT)
Based on Accounts Payable report showing:
- MUHASINA: ₹20,000 return, ₹0 refunded, ₹20,000 outstanding
- NOBIN KOCHUMON: ₹12,180 return, ₹0 refunded, ₹12,180 outstanding
- KV NASAR: ₹10,000 return, ₹5,000 refunded, ₹5,000 outstanding
- ASEES: ₹2,925 return, ₹1,500 refunded, ₹1,425 outstanding

```
Sales Return 4094d994  ₹20,000  ₹0       ₹20,000  Pending  ✅
Sales Return c544daa1  ₹12,180  ₹0       ₹12,180  Pending  ✅
Sales Return f66aff6a  ₹10,000  ₹5,000   ₹5,000   Pending  ✅
Sales Return e6f1904c  ₹2,925   ₹1,500   ₹1,425   Pending  ✅
```

---

## What Was Fixed

**File Modified**: `src/app/api/finance/ledgers-summary/route.ts`

The code was **hardcoded** to assume all returns were fully refunded. I've fixed it to:
1. Fetch actual refund amounts from `invoice_refunds` table
2. Calculate real balances: `return_value - total_refunded`
3. Update status dynamically based on balance

---

## Troubleshooting Steps

### Step 1: Check Server Console Logs

The fix includes debug logging. After refreshing the ledger page, check your terminal running `npm run dev` for logs like:

```
📊 SALES RETURNS LEDGER DEBUG (paginated):
  - Returns found: 4
  - Refunds found: 2
  - Refunds with return_id: 2
  - Refund map size: 2
  - Refund map entries: [ 'f66aff6a → ₹5000', 'e6f1904c → ₹1500' ]
  - Return 4094d994: Value=₹20000, Refunded=₹0, Balance=₹20000, Status=pending
  - Return c544daa1: Value=₹12180, Refunded=₹0, Balance=₹12180, Status=pending
  - Return f66aff6a: Value=₹10000, Refunded=₹5000, Balance=₹5000, Status=pending
  - Return e6f1904c: Value=₹2925, Refunded=₹1500, Balance=₹1425, Status=pending
```

**If you see this**, the fix is working! The UI issue is caching.

**If you DON'T see this**, the API endpoint isn't being called or server needs restart.

### Step 2: Verify Database Data

Run this SQL query in your Supabase SQL Editor:

```sql
-- Check refunds linked to returns
SELECT 
  LEFT(r.id::text, 8) as return_id,
  r.return_value,
  COALESCE(SUM(ir.refund_amount), 0) as total_refunded,
  r.return_value - COALESCE(SUM(ir.refund_amount), 0) as balance_due
FROM returns r
LEFT JOIN invoice_refunds ir ON r.id = ir.return_id
  AND ir.status IN ('pending', 'approved', 'processed')
GROUP BY r.id, r.return_value
ORDER BY r.return_value DESC;
```

**Expected Result**:
```
return_id  | return_value | total_refunded | balance_due
-----------+--------------+----------------+-------------
4094d994   | 20000        | 0              | 20000
c544daa1   | 12180        | 0              | 12180
f66aff6a   | 10000        | 5000           | 5000
e6f1904c   | 2925         | 1500           | 1425
```

**If total_refunded is 0 for all**: The invoice_refunds are missing or the return_id links are broken. You'll need to recreate the refunds using the SQL scripts from earlier.

**If data matches expected**: Database is correct, the issue is API or caching.

### Step 3: Force Cache Refresh

Try these in order:

1. **Hard Refresh Browser**: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

2. **Clear Browser Cache**:
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

3. **Check Network Tab**:
   - Open DevTools (F12) → Network tab
   - Filter by "ledgers-summary"
   - Refresh the page
   - Click on the request
   - Look at the Response to see what data the API is returning

4. **Try Incognito/Private Mode**:
   - Open a new incognito/private window
   - Navigate to the ledger page
   - If it works there, it's definitely browser caching

### Step 4: Restart Development Server

Sometimes Next.js caches API routes. To force a complete restart:

1. **Stop the server**: Go to the terminal running `npm run dev` and press `Ctrl + C`

2. **Clear Next.js cache** (optional but recommended):
   ```powershell
   Remove-Item -Recurse -Force .next
   ```

3. **Start server again**:
   ```powershell
   npm run dev
   ```

4. **Wait for compilation**: Watch for "compiled successfully" message

5. **Refresh browser**: Hard refresh the ledger page

### Step 5: Check API Response Directly

Test the API endpoint directly in your browser:

**URL to test**:
```
http://localhost:3000/api/finance/ledgers-summary?type=sales_returns&limit=50&page=1
```

**Expected JSON Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "4094d994-...",
      "name": "Sales Return 4094d994",
      "type": "sales_returns",
      "total_amount": 20000,
      "balance_due": 20000,      // ✅ Should NOT be 0
      "paid_amount": 0,           // ✅ Should be actual refunded
      "status": "pending"         // ✅ Should NOT be "settled"
    },
    // ... more returns
  ],
  "pagination": { ... }
}
```

**If balance_due is 0**: API fix didn't apply or server needs restart.

**If balance_due is correct**: API is working, UI is cached.

---

## Common Issues & Solutions

### Issue 1: "Refund map size: 0"
**Symptom**: Console shows no refunds found
**Cause**: invoice_refunds table is empty or return_id links broken
**Solution**: Run the refund creation SQL scripts from earlier conversation

### Issue 2: "Refunds found: 0"
**Symptom**: No refunds in database at all
**Cause**: Refunds were deleted or never created
**Solution**: Recreate refunds using:
```sql
-- From database/create_missing_invoices_and_refunds.sql
-- (Use the script from earlier in our conversation)
```

### Issue 3: Ledger Shows Old Data After Refresh
**Symptom**: Still seeing ₹0 balance even after hard refresh
**Cause**: Next.js server-side caching or API route not recompiling
**Solution**: 
1. Stop server (`Ctrl + C`)
2. Delete `.next` folder
3. Restart server (`npm run dev`)
4. Hard refresh browser

### Issue 4: Console Logs Don't Appear
**Symptom**: No debug logs in terminal
**Cause**: API endpoint not being called or wrong tab selected
**Solution**:
1. Make sure you're on "Sales Returns" tab in the ledger page
2. Check Network tab in DevTools to confirm API is being called
3. Verify the correct terminal window is visible (PowerShell running `npm run dev`)

---

## Verification Checklist

After applying fixes:

- [ ] Terminal shows debug logs when loading Sales Returns tab
- [ ] Console logs show "Refund map size: 2" (or correct number)
- [ ] Database query shows correct refunded amounts
- [ ] API endpoint returns `balance_due > 0` for pending returns
- [ ] Browser Network tab shows fresh API response (not cached)
- [ ] Ledger UI displays correct balances
- [ ] Status shows "Pending" for returns with outstanding balance
- [ ] Summary stats show correct totals (₹15,605 or similar)

---

## If Nothing Works

### Last Resort: Manual API Test

Create a test file to bypass the UI:

**File**: `test-ledgers-api.js` (in project root)
```javascript
const response = await fetch('http://localhost:3000/api/finance/ledgers-summary?type=sales_returns');
const data = await response.json();
console.log('API Response:', JSON.stringify(data, null, 2));
```

Run with:
```powershell
node test-ledgers-api.js
```

This will show you the raw API response without any UI caching.

---

## Expected Timeline

1. **Immediate** (0-2 min): Check server console for debug logs
2. **Quick** (2-5 min): Run database verification query
3. **Medium** (5-10 min): Try cache clearing and hard refresh
4. **Slower** (10-15 min): Restart development server
5. **Last Resort** (15-20 min): Delete .next folder and rebuild

---

## Contact Points

If the issue persists after all steps:

1. **Share Console Logs**: Copy the debug output from terminal
2. **Share Database Query Results**: Show the refund data from SQL
3. **Share Network Tab**: Screenshot of API response from DevTools
4. **Share Browser Console**: Any errors in browser console (F12)

This will help identify whether the issue is:
- Database (missing refunds)
- API (code not executing)
- Caching (old data stuck)
- UI (display logic issue)

---

**Remember**: The fix is applied and should work. The most likely issue is caching either in:
- Next.js server-side cache
- Browser cache
- API route cache

Try the steps in order and the issue should resolve!
