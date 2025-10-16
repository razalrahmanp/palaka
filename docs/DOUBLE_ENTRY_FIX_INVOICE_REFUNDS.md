# Double Entry Fix - Invoice Refunds Showing Separately

## 🐛 Problem

The UI was showing duplicate entries:
- Returns appeared once (correct)
- Invoice refunds linked to those returns appeared AGAIN as separate entries

**Example of the bug:**
```
KV NASAR (Return)          ₹10,000  ₹5,000   ₹5,000   ← Correct
KV NASAR (Invoice Refund)  ₹5,000   ₹0       ₹5,000   ← DUPLICATE! 
ASEES (Return)             ₹2,925   ₹1,500   ₹1,425   ← Correct
ASEES (Invoice Refund)     ₹1,500   ₹0       ₹1,500   ← DUPLICATE!

TOTAL: ₹51,605 (WRONG - counted refunds twice!)
```

## 🔍 Root Cause

The code was fetching invoice_refunds and displaying ALL of them as separate line items, even those that were already linked to returns via `return_id`.

**Two types of invoice_refunds:**
1. **Linked to returns** (`return_id` is set) - These should ONLY update the "Refunded" column of the return, not show separately
2. **Standalone refunds** (`return_id` is NULL) - These should show as separate line items

## ✅ Solution

Added a filter to ONLY show invoice refunds that are NOT linked to returns:

### Code Change (Line 331)

**Before:**
```typescript
.filter((ref: RefundData) => {
  const hasAmount = ref.refund_amount && ref.refund_amount > 0;
  const hasStatus = ref.status === 'pending' || ref.status === 'approved';
  return hasAmount && hasStatus;  // ❌ Shows ALL refunds
})
```

**After:**
```typescript
.filter((ref: RefundData) => {
  const hasAmount = ref.refund_amount && ref.refund_amount > 0;
  const hasStatus = ref.status === 'pending' || ref.status === 'approved';
  const notLinkedToReturn = !ref.return_id;  // ✅ Only standalone refunds
  
  return hasAmount && hasStatus && notLinkedToReturn;
})
```

## 📊 Expected Result After Fix

After refreshing the page:

```
Customer Returns & Refunds
4 pending refunds • ₹15,605 outstanding  ← Correct total!

Customer Name       Return Value  Refunded   Balance    Status
MUHASINA           ₹20,000       ₹15,000    ₹5,000    Pending
NOBIN KOCHUMON     ₹12,180       ₹8,000     ₹4,180    Pending
KV NASAR           ₹10,000       ₹5,000     ₹5,000    Pending  ← Shows refunded!
ASEES              ₹2,925        ₹1,500     ₹1,425    Pending  ← Shows refunded!
SUBTOTAL           ₹45,105       ₹29,500    ₹15,605
```

**Key points:**
- ✅ Only 4 entries (no duplicates)
- ✅ "Refunded" column shows correct amounts
- ✅ Total outstanding is correct
- ✅ No "(Invoice Refund)" entries for returns

## 🎯 How It Works Now

### Data Flow

**Step 1: Fetch ALL refunds** (to build refund map)
```javascript
// Gets all refunds including those with return_id
const allRefunds = await fetch('/api/finance/refunds?limit=1000');
```

**Step 2: Build refund map** (for returns)
```javascript
// Maps return_id → total refunded amount
refundMap = {
  'return-uuid-1': 15000,
  'return-uuid-2': 8000,
  ...
}
```

**Step 3: Fetch returns and calculate refunded**
```javascript
// For each return:
const refundedAmount = refundMap.get(returnId) || 0;
// Shows in "Refunded" column
```

**Step 4: Fetch standalone refunds ONLY**
```javascript
// Only show refunds where return_id is NULL
.filter(ref => !ref.return_id)
```

### Two Scenarios

**Scenario A: Invoice refund linked to return**
- `invoice_refunds.return_id = 'abc-123'`
- Appears in refundMap
- Shows in return's "Refunded" column
- ❌ Does NOT show as separate line item

**Scenario B: Standalone invoice refund**
- `invoice_refunds.return_id = NULL`
- NOT in refundMap
- ❌ Does NOT affect returns
- ✅ Shows as separate "(Invoice Refund)" line item

## 🧪 Test Cases

### Test 1: Return with partial refund
```
Return: ₹10,000
Refund: ₹5,000 (return_id = return.id)
Expected: One line showing ₹10,000 total, ₹5,000 refunded, ₹5,000 balance
```

### Test 2: Return with NO refund
```
Return: ₹20,000
Refund: None
Expected: One line showing ₹20,000 total, ₹0 refunded, ₹20,000 balance
```

### Test 3: Standalone refund (no return)
```
Refund: ₹3,000 (return_id = NULL)
Expected: One line "(Invoice Refund)" showing ₹3,000 balance
```

### Test 4: Return with multiple refunds
```
Return: ₹20,000
Refund 1: ₹10,000 (return_id = return.id)
Refund 2: ₹5,000 (return_id = return.id)
Expected: One line showing ₹20,000 total, ₹15,000 refunded, ₹5,000 balance
```

## 📝 Files Modified

- `src/app/(erp)/reports/accounts-payable-receivable/page.tsx` (Line 316-378)
  - Added `notLinkedToReturn` filter
  - Added explanatory comments
  - Improved console logging

## 🚀 Deployment Steps

1. ✅ Code change applied
2. ⏳ Refresh browser (Ctrl+Shift+R)
3. ⏳ Verify no duplicate entries
4. ⏳ Verify "Refunded" column shows correct amounts
5. ⏳ Verify totals are correct

## 🎓 Key Learnings

1. **invoice_refunds table serves two purposes:**
   - Track refunds linked to returns
   - Track standalone refunds

2. **Always filter by return_id presence:**
   - `return_id IS NOT NULL` → Part of return (don't display separately)
   - `return_id IS NULL` → Standalone (display as separate item)

3. **Prevent double-counting:**
   - One source of truth for each liability
   - Refunds linked to returns are NOT independent liabilities
