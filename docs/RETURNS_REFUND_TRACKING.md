# Returns Refund Tracking Analysis

## Current Schema

### `returns` Table
```sql
- id: uuid
- order_id: uuid (FK → sales_orders)
- return_type: 'return' | 'warranty' | 'complaint' | 'exchange'
- status: 'pending' | 'approved' | 'completed' | 'rejected'
- reason: text
- return_value: numeric (value of returned items)
- cost_value: numeric
- created_at, updated_at
```

**Missing Field:** No `refunded_amount` or `paid_amount` to track how much has been refunded.

### `invoice_refunds` Table
```sql
- id: uuid
- invoice_id: uuid (FK → invoices)
- return_id: uuid (FK → returns) - OPTIONAL
- refund_amount: numeric
- status: 'pending' | 'approved' | 'processed' | 'rejected' | 'cancelled' | 'reversed'
- refund_method: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'adjustment'
- processed_at: timestamp
```

## Problem

**Current Code (Line 195):**
```typescript
paidAmount: 0, // Returns not yet refunded - HARDCODED!
```

**Issue:** All returns show ₹0 in "Refunded" column because it's hardcoded.

## Solution Options

### Option 1: Query invoice_refunds for Each Return
**Query invoice_refunds where return_id matches and status='processed'**

```typescript
// For each return, sum up processed refunds
const refundedAmount = invoice_refunds
  .filter(ref => ref.return_id === return.id && ref.status === 'processed')
  .reduce((sum, ref) => sum + ref.refund_amount, 0)
```

**Pros:**
- Accurate tracking of actual refunds
- Shows partial refunds
- Reflects real payment status

**Cons:**
- Requires additional query/join
- More complex data fetching

### Option 2: Add refunded_amount to returns Table
**Alter the returns table:**

```sql
ALTER TABLE returns 
ADD COLUMN refunded_amount NUMERIC DEFAULT 0;

-- Update via trigger when invoice_refunds.status changes to 'processed'
```

**Pros:**
- Simple query
- Fast lookup
- Denormalized for performance

**Cons:**
- Schema change required
- Need trigger to keep in sync
- Data duplication

### Option 3: Calculate from invoice_refunds in Real-Time
**Fetch both returns and invoice_refunds, then match:**

```typescript
// 1. Fetch all returns
const returns = await fetch('/api/sales/returns')

// 2. Fetch all refunds linked to these returns
const returnIds = returns.map(r => r.id)
const refunds = await fetch(`/api/finance/refunds?return_ids=${returnIds.join(',')}`)

// 3. Calculate refunded amount per return
const refundMap = {}
refunds
  .filter(ref => ref.status === 'processed')
  .forEach(ref => {
    refundMap[ref.return_id] = (refundMap[ref.return_id] || 0) + ref.refund_amount
  })

// 4. Map to returns
const pendingReturns = returns.map(r => ({
  ...
  paidAmount: refundMap[r.id] || 0,
  balance: r.return_value - (refundMap[r.id] || 0)
}))
```

**Pros:**
- No schema changes
- Real-time accuracy
- Shows partial refunds

**Cons:**
- Two API calls
- More complex logic
- Performance overhead

## Recommended Approach

**Option 3 (Real-Time Calculation)** is best because:
1. ✅ No database schema changes
2. ✅ Always accurate
3. ✅ Shows partial refunds correctly
4. ✅ Can be implemented immediately

## Implementation Plan

### Step 1: Update Returns API
Add ability to fetch refunds by return_id:

```typescript
// /api/finance/refunds route
if (returnIds) {
  query = query.in('return_id', returnIds.split(','))
}
```

### Step 2: Update Accounts Payable Page
Fetch refunds and calculate paid amounts:

```typescript
// Fetch returns
const returns = await fetch('/api/sales/returns?limit=1000')

// Fetch ALL refunds (not just pending/approved)
const allRefunds = await fetch('/api/finance/refunds?limit=1000')

// Build refund map (sum processed refunds per return)
const refundMap = new Map()
allRefunds.refunds
  .filter(ref => ref.return_id && ref.status === 'processed')
  .forEach(ref => {
    const current = refundMap.get(ref.return_id) || 0
    refundMap.set(ref.return_id, current + ref.refund_amount)
  })

// Map returns with refunded amounts
const pendingReturns = returns.map(r => ({
  id: r.id,
  name: r.customer_name,
  totalAmount: r.return_value,
  paidAmount: refundMap.get(r.id) || 0, // ✅ Real refunded amount
  balance: r.return_value - (refundMap.get(r.id) || 0),
  status: r.status
}))
```

### Step 3: Handle Invoice Refunds Separately
Invoice refunds without return_id (direct refunds):

```typescript
// These are refunds NOT tied to product returns
const directRefunds = allRefunds.refunds
  .filter(ref => !ref.return_id && (ref.status === 'pending' || ref.status === 'approved'))
  .map(ref => ({
    id: ref.id,
    name: `${ref.customer_name} (Invoice Refund)`,
    totalAmount: ref.refund_amount,
    paidAmount: 0, // Not yet processed
    balance: ref.refund_amount,
    status: ref.status
  }))
```

## Current vs Proposed Display

### Current (Wrong)
```
MUHASINA (Return)      ₹20,000    ₹0        ₹20,000
NOBIN KOCHUMON (Return) ₹12,180    ₹0        ₹12,180
```
**All showing ₹0 refunded (hardcoded)**

### Proposed (Correct)
```
MUHASINA (Return)      ₹20,000    ₹5,000    ₹15,000  (partially refunded)
NOBIN KOCHUMON (Return) ₹12,180    ₹12,180   ₹0       (fully refunded)
KV NASAR (Return)      ₹10,000    ₹0        ₹10,000  (not refunded yet)
```
**Shows actual refund amounts from invoice_refunds table**

## Benefits

1. **Accuracy:** Shows real refund status
2. **Transparency:** Users can see partial refunds
3. **Reconciliation:** Total refunded + balance = return value
4. **Decision Making:** Identify which returns still need refunding

## Edge Cases

### Case 1: Return with Multiple Refunds
```
Return Value: ₹20,000
Refund 1 (processed): ₹5,000
Refund 2 (processed): ₹8,000
Refund 3 (pending): ₹7,000
---
Refunded: ₹13,000 (sum of processed)
Balance: ₹7,000 (includes pending refund)
```

### Case 2: Return Fully Refunded
```
Return Value: ₹12,180
Refund (processed): ₹12,180
---
Refunded: ₹12,180
Balance: ₹0
Should NOT appear in payables (filter out)
```

### Case 3: Return with No Refunds
```
Return Value: ₹10,000
No refunds created yet
---
Refunded: ₹0
Balance: ₹10,000
Shows in payables
```

## Filter Logic Update

**Current:**
```typescript
.filter(r => r.status === 'pending' || r.status === 'approved')
```

**Proposed:**
```typescript
.filter(r => {
  const refunded = refundMap.get(r.id) || 0
  const balance = r.return_value - refunded
  return balance > 0 && (r.status === 'pending' || r.status === 'approved')
})
```

Only show returns that:
1. Have outstanding balance (not fully refunded)
2. Are pending or approved (not rejected/completed)

## Summary

The "Refunded" column shows ₹0 because:
1. ❌ Code hardcodes `paidAmount: 0`
2. ❌ No query to check actual refunds from `invoice_refunds` table
3. ❌ Returns table doesn't track refunded amounts

**Fix:** Query `invoice_refunds` where `return_id` matches and sum up processed refunds.
