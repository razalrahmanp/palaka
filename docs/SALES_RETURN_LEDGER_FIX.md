# Sales Return Ledger Fix - Showing Actual Refund Status

**Date**: 2025-10-16  
**Issue**: Sales Return ledgers showing as "Settled" with ₹0 balance when refunds are only partial  
**Status**: ✅ FIXED

---

## Problem Description

### What the User Reported
In the General Ledger → Sales Returns tab, all 4 sales return ledgers were showing:
- **Debit**: Correct return value (₹20k, ₹12.18k, ₹10k, ₹2.925k)
- **Credit**: Same as debit (WRONG - showing full amount refunded)
- **Balance**: ₹0 (WRONG - should show outstanding balance)
- **Status**: "Settled" (WRONG - returns are only partially refunded)

```
Type  Account Name       Debit     Credit    Balance  Status
────  ─────────────────  ────────  ────────  ───────  ────────
      Sales Return e6f1  ₹2,925    ₹2,925    ₹0       Settled
      Sales Return c544  ₹12,180   ₹12,180   ₹0       Settled
      Sales Return f66a  ₹10,000   ₹10,000   ₹0       Settled
      Sales Return 4094  ₹20,000   ₹20,000   ₹0       Settled
```

### Actual Database State
From `invoice_refunds` table:
- MUHASINA (4094d994): ₹20,000 return → ₹15,000 refunded → **₹5,000 outstanding**
- NOBIN KOCHUMON (c544daa1): ₹12,180 return → ₹8,000 refunded → **₹4,180 outstanding**
- KV NASAR (f66aff6a): ₹10,000 return → ₹5,000 refunded → **₹5,000 outstanding**
- ASEES (e6f1904c): ₹2,925 return → ₹1,500 refunded → **₹1,425 outstanding**

**Total Outstanding**: ₹15,605 (not ₹0!)

---

## Root Cause Analysis

### File Location
**File**: `src/app/api/finance/ledgers-summary/route.ts`  
**Functions**: 
- `getSalesReturnsLedgers()` (lines 1595-1627)
- `getSalesReturnsLedgersPaginated()` (lines 1629-1687)

### Problematic Code (BEFORE)

```typescript
async function getSalesReturnsLedgers(search: string, hideZeroBalances: boolean) {
  const { data: returns } = await supabaseAdmin
    .from('returns')
    .select('id, return_type, status, return_value, created_at');

  const ledgers: LedgerSummary[] = returns.map(ret => ({
    id: ret.id,
    name: `Sales Return ${ret.id.slice(0, 8)}`,
    type: 'sales_returns',
    total_transactions: 1,
    total_amount: ret.return_value || 0,      // ✅ Correct
    balance_due: 0,                            // ❌ WRONG - Hardcoded to 0
    paid_amount: ret.return_value || 0,        // ❌ WRONG - Assumes full refund
    return_value: ret.return_value || 0,
    status: ret.status
  }));

  return ledgers;
}
```

### Why It Was Wrong

1. **Hardcoded `balance_due: 0`**: Assumed all returns are fully refunded
2. **`paid_amount: ret.return_value`**: Assumed full return value has been refunded
3. **No refund calculation**: Never checked the `invoice_refunds` table
4. **Status not updated**: Status remained as original return status, not reflecting refund completion

### Missing Data Flow

The code was only reading from `returns` table:
```
returns table → Ledger Display (WRONG)
```

It should have been:
```
returns table + invoice_refunds table → Calculate refunded amount → Ledger Display (CORRECT)
```

---

## Solution Implementation

### Fixed Code (AFTER)

```typescript
async function getSalesReturnsLedgers(search: string, hideZeroBalances: boolean) {
  // Step 1: Fetch returns
  const { data: returns } = await supabaseAdmin
    .from('returns')
    .select('id, return_type, status, return_value, created_at')
    .order('created_at', { ascending: false });

  // Step 2: Fetch ALL invoice refunds (NEW!)
  const { data: allRefunds } = await supabaseAdmin
    .from('invoice_refunds')
    .select('return_id, refund_amount, status')
    .in('status', ['pending', 'approved', 'processed']);

  // Step 3: Build refund map (NEW!)
  const refundMap = new Map<string, number>();
  if (allRefunds) {
    allRefunds.forEach(refund => {
      if (refund.return_id) {
        const current = refundMap.get(refund.return_id) || 0;
        refundMap.set(refund.return_id, current + (refund.refund_amount || 0));
      }
    });
  }

  // Step 4: Calculate balances properly (NEW!)
  const ledgers: LedgerSummary[] = returns.map(ret => {
    const returnValue = ret.return_value || 0;
    const refundedAmount = refundMap.get(ret.id) || 0;  // ✅ Actual refunded
    const balanceDue = returnValue - refundedAmount;    // ✅ Real balance

    return {
      id: ret.id,
      name: `Sales Return ${ret.id.slice(0, 8)}`,
      type: 'sales_returns' as const,
      total_transactions: 1,
      total_amount: returnValue,           // ✅ Return value (debit)
      balance_due: balanceDue,             // ✅ Outstanding balance
      paid_amount: refundedAmount,         // ✅ Actual refunded (credit)
      return_value: returnValue,
      status: balanceDue <= 0 ? 'settled' : ret.status  // ✅ Dynamic status
    };
  });

  return ledgers;
}
```

### Key Changes

1. ✅ **Fetch invoice_refunds**: Added query to get all refunds
2. ✅ **Build refund map**: Sum up refund amounts grouped by `return_id`
3. ✅ **Calculate balance**: `return_value - refunded_amount`
4. ✅ **Dynamic status**: Only show "settled" when `balance_due <= 0`
5. ✅ **Include all refund statuses**: pending, approved, processed

### Same Fix Applied to Paginated Function

The `getSalesReturnsLedgersPaginated()` function received the exact same fix to ensure consistency across both code paths.

---

## Expected Results

### After Fix - Ledger Display

```
Type  Account Name       Contact  Debit     Credit    Balance   Status
────  ─────────────────  ───────  ────────  ────────  ────────  ────────
      Sales Return e6f1           ₹2,925    ₹1,500    ₹1,425    Pending
      Sales Return c544           ₹12,180   ₹8,000    ₹4,180    Pending
      Sales Return f66a           ₹10,000   ₹5,000    ₹5,000    Pending
      Sales Return 4094           ₹20,000   ₹15,000   ₹5,000    Pending
────────────────────────────────────────────────────────────────────────
Total                             ₹45,105   ₹29,500   ₹15,605
```

### Summary Stats (Top Cards)
- **Total Ledgers**: 4
- **Total Debit**: ₹45,105 (sum of return values)
- **Total Credit**: ₹29,500 (sum of refunded amounts)
- **Net Balance**: ₹15,605 (outstanding refunds to process)

---

## Data Flow Diagram

### BEFORE (Incorrect)
```
┌──────────────┐
│   returns    │
│  table only  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Hardcoded values │
│  balance_due = 0 │
│  paid = full amt │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Ledger Display   │
│ Status: Settled  │ ❌ WRONG
└──────────────────┘
```

### AFTER (Correct)
```
┌──────────────┐     ┌──────────────────┐
│   returns    │     │ invoice_refunds  │
│    table     │     │      table       │
└──────┬───────┘     └────────┬─────────┘
       │                      │
       └──────────┬───────────┘
                  ▼
          ┌───────────────┐
          │  Build refund │
          │   map by ID   │
          └───────┬───────┘
                  ▼
          ┌───────────────┐
          │  Calculate:   │
          │ balance_due = │
          │ return_value  │
          │  - refunded   │
          └───────┬───────┘
                  ▼
          ┌───────────────┐
          │ Ledger Display│
          │ Status: Based │ ✅ CORRECT
          │  on balance   │
          └───────────────┘
```

---

## Testing Checklist

### Verify Fix Works
- [ ] Navigate to General Ledger (Finance → Ledgers)
- [ ] Click on "Sales Returns" tab
- [ ] Verify 4 ledgers are displayed
- [ ] Check Debit column shows: ₹20,000, ₹12,180, ₹10,000, ₹2,925
- [ ] Check Credit column shows: ₹15,000, ₹8,000, ₹5,000, ₹1,500
- [ ] Check Balance column shows: ₹5,000, ₹4,180, ₹5,000, ₹1,425
- [ ] Check Status shows "Pending" (not "Settled")
- [ ] Verify summary stats:
  - Total Debit: ₹45,105
  - Total Credit: ₹29,500
  - Net Balance: ₹15,605

### Edge Cases to Test
- [ ] Create a new full refund → Should show ₹0 balance, "Settled" status
- [ ] Create a return with no refunds → Should show full balance, "Pending" status
- [ ] Toggle "Hide Zero Balance" → Settled returns should disappear
- [ ] Search for return by ID → Should find and show correct balance

---

## Related Files Modified

1. **src/app/api/finance/ledgers-summary/route.ts**
   - Fixed `getSalesReturnsLedgers()` (lines 1595-1649)
   - Fixed `getSalesReturnsLedgersPaginated()` (lines 1651-1725)

2. **Related Documentation**
   - `docs/REFUNDED_COLUMN_DATA_FLOW_EXPLAINED.md` - Shows how refunds flow to Accounts Payable report
   - `docs/CORRECT_SCHEMA_REFUNDS.md` - Schema relationships for invoice_refunds
   - `docs/DOUBLE_ENTRY_FIX_INVOICE_REFUNDS.md` - Fix for duplicate refund display

---

## Database Schema Reference

### Tables Involved

**returns** table:
```sql
id              UUID PRIMARY KEY
order_id        UUID (FK to sales_orders)
return_value    DECIMAL
status          TEXT (pending/approved/completed)
created_at      TIMESTAMP
```

**invoice_refunds** table:
```sql
id              UUID PRIMARY KEY
invoice_id      UUID (FK to invoices, NOT NULL)
return_id       UUID (FK to returns, NULLABLE)
refund_amount   DECIMAL
status          TEXT (pending/approved/processed)
created_at      TIMESTAMP
```

### Join Logic
```sql
-- Get returns with refunded amounts
SELECT 
  r.id,
  r.return_value,
  COALESCE(SUM(ir.refund_amount), 0) as refunded_amount,
  r.return_value - COALESCE(SUM(ir.refund_amount), 0) as balance_due
FROM returns r
LEFT JOIN invoice_refunds ir ON r.id = ir.return_id
  AND ir.status IN ('pending', 'approved', 'processed')
GROUP BY r.id, r.return_value;
```

---

## Impact Analysis

### What Changed
- ✅ Ledger balances now reflect actual outstanding refunds
- ✅ Status badges show "Pending" for partially refunded returns
- ✅ Summary stats accurate (₹15,605 outstanding instead of ₹0)
- ✅ Consistent with Accounts Payable & Receivable report

### What Stayed the Same
- ✅ UI layout unchanged
- ✅ Return creation process unchanged
- ✅ Refund creation process unchanged
- ✅ Other ledger types (customers, suppliers, etc.) unaffected

### Benefits
1. **Accurate financial reporting**: True liability shown
2. **Better cash flow visibility**: Know exactly how much needs to be refunded
3. **Consistent with AP/AR report**: Same refund data shown in both places
4. **Proper status tracking**: "Settled" only when fully refunded

---

## Future Enhancements

### Potential Improvements
1. **Add refund details link**: Click ledger → See all refund transactions
2. **Color-coded balance**: Red for high outstanding, green for low
3. **Aging analysis**: Show how long refunds have been pending
4. **Refund timeline**: Visual timeline of partial refunds over time

### Related Features
- Refund approval workflow (already exists via invoice_refunds.status)
- Refund payment processing (links to bank transactions)
- Customer notification when refund processed

---

## Conclusion

**Problem**: Sales return ledgers showed ₹0 balance (all settled) when ₹15,605 was actually outstanding  
**Root Cause**: Code assumed full refunds, never checked `invoice_refunds` table  
**Solution**: Fetch refunds, calculate actual balances, update status dynamically  
**Result**: Ledgers now show accurate balances and status

This fix ensures the General Ledger accurately reflects the company's financial obligations for customer refunds, matching the data shown in the Accounts Payable & Receivable report.

---

**Next Steps for User**:
1. Refresh the General Ledger page
2. Click on Sales Returns tab
3. Verify balances show ₹5,000, ₹4,180, ₹5,000, ₹1,425
4. Confirm status shows "Pending" (not "Settled")
5. Check summary shows ₹15,605 net balance
