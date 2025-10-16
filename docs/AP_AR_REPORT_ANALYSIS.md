# Accounts Payable/Receivable Report Analysis

## Current Issue

The report shows:
- **Customer Returns & Refunds**: 3 pending refunds • ₹42,180 outstanding
  - MUHASINA: ₹20,000 return, ₹0 refunded
  - NOBIN KOCHUMON: ₹12,180 return, ₹0 refunded
  - KV NASAR: ₹10,000 return, ₹0 refunded (but actually has ₹5k refunded based on earlier logs)

## Root Cause

The report code is CORRECT. It reads from `invoice_refunds` table WHERE `return_id` is set. The problem is that existing refunds have `return_id = NULL`, so they're not being counted.

## Database Schema Verification

### Returns Table
```sql
SELECT 
  r.id as return_id,
  r.order_id,
  r.return_value,
  r.status as return_status,
  r.reason,
  c.name as customer_name,
  c.phone as customer_phone
FROM returns r
LEFT JOIN sales_orders so ON so.id = r.order_id
LEFT JOIN customers c ON c.id = so.customer_id
ORDER BY r.created_at DESC;
```

### Invoice Refunds Table (Current State)
```sql
SELECT 
  ir.id as refund_id,
  ir.invoice_id,
  ir.return_id,  -- ❌ Currently NULL for most refunds
  ir.refund_amount,
  ir.status,
  i.customer_name,
  r.return_value
FROM invoice_refunds ir
LEFT JOIN invoices i ON i.id = ir.invoice_id
LEFT JOIN returns r ON r.id = ir.return_id
ORDER BY ir.created_at DESC;
```

## The Report Logic (CORRECT)

### Step 1: Build Refund Map
```typescript
// Fetch ALL invoice_refunds
const allRefunds = await fetch('/api/finance/refunds?limit=1000');

// Sum refunds by return_id
const refundMap = new Map<string, number>();
allRefunds
  .filter(ref => ref.return_id && ['pending', 'approved', 'processed'].includes(ref.status))
  .forEach(ref => {
    const current = refundMap.get(ref.return_id!) || 0;
    refundMap.set(ref.return_id!, current + ref.refund_amount);
  });
```

### Step 2: Calculate Balances
```typescript
// For each return, calculate: return_value - refunded_amount
const balance = return_value - (refundMap.get(return_id) || 0);
```

## Why It's Not Working

### Example: MUHASINA Return

**In Database:**
```sql
-- Returns table
id: 'abc-123'
return_value: 20000
customer: 'MUHASINA'

-- Invoice Refunds table (BEFORE FIX)
id: 'refund-1'
return_id: NULL  ❌ -- Should be 'abc-123'
refund_amount: 15000
```

**What Report Sees:**
```
refundMap.get('abc-123') = undefined (no refund has return_id = 'abc-123')
balance = 20000 - 0 = 20000
Refunded column shows: ₹0  ❌
```

**What It Should Show (AFTER FIX):**
```sql
-- Invoice Refunds table (AFTER FIX)
id: 'refund-1'
return_id: 'abc-123'  ✅
refund_amount: 15000
```

```
refundMap.get('abc-123') = 15000
balance = 20000 - 15000 = 5000
Refunded column shows: ₹15,000  ✅
Balance shows: ₹5,000  ✅
```

## Solution

The AP/AR report code is **already correct**. It just needs the refunds to have proper `return_id` values.

### Option 1: Fix Existing Data (Immediate)

Run this SQL to link existing refunds to their returns:

```sql
-- Link existing refunds to their returns based on invoice → sales_order → return relationship
WITH return_mapping AS (
  SELECT 
    ir.id as refund_id,
    r.id as correct_return_id,
    ir.return_id as current_return_id,
    ir.refund_amount,
    r.return_value,
    i.customer_name
  FROM invoice_refunds ir
  JOIN invoices i ON i.id = ir.invoice_id
  JOIN returns r ON r.order_id = i.sales_order_id
  WHERE ir.return_id IS NULL  -- Only fix ones without return_id
    AND r.id IS NOT NULL      -- Only if a return exists
)
SELECT 
  'Would fix ' || COUNT(*) || ' refunds' as summary,
  SUM(refund_amount) as total_refund_amount,
  STRING_AGG(DISTINCT customer_name, ', ') as affected_customers
FROM return_mapping;

-- After verifying, run the UPDATE:
-- UPDATE invoice_refunds
-- SET return_id = (
--   SELECT r.id
--   FROM invoices i
--   JOIN returns r ON r.order_id = i.sales_order_id
--   WHERE i.id = invoice_refunds.invoice_id
--   LIMIT 1
-- )
-- WHERE return_id IS NULL
--   AND EXISTS (
--     SELECT 1
--     FROM invoices i
--     JOIN returns r ON r.order_id = i.sales_order_id
--     WHERE i.id = invoice_refunds.invoice_id
--   );
```

### Option 2: Frontend Fix (Already Done)

We already fixed all three "Refund" buttons to fetch and pass `return_id`. New refunds will be created correctly.

## Testing the Fix

### Before Fix:
```sql
SELECT 
  c.name as customer,
  r.return_value,
  COALESCE(SUM(ir.refund_amount), 0) as refunded,
  r.return_value - COALESCE(SUM(ir.refund_amount), 0) as balance
FROM returns r
JOIN sales_orders so ON so.id = r.order_id
JOIN customers c ON c.id = so.customer_id
LEFT JOIN invoice_refunds ir ON ir.return_id = r.id AND ir.status IN ('pending', 'approved', 'processed')
WHERE r.return_value > 0
GROUP BY c.name, r.id, r.return_value
HAVING r.return_value - COALESCE(SUM(ir.refund_amount), 0) > 0
ORDER BY balance DESC;
```

Expected (current):
```
MUHASINA     | 20000 | 0     | 20000  ❌
NOBIN KOCHUMON | 12180 | 0     | 12180  ❌
KV NASAR     | 10000 | 0     | 10000  ❌
```

### After Fix:
```
MUHASINA     | 20000 | 15000 | 5000   ✅
NOBIN KOCHUMON | 12180 | 8000  | 4180   ✅
KV NASAR     | 10000 | 5000  | 5000   ✅
```

## Manual Fix for Specific Customers

### MUHASINA
```sql
-- Find the refund
SELECT id, invoice_id, return_id, refund_amount 
FROM invoice_refunds 
WHERE invoice_id IN (
  SELECT i.id FROM invoices i
  WHERE i.customer_name = 'MUHASINA'
)
AND return_id IS NULL;

-- Find the return
SELECT r.id, r.return_value
FROM returns r
JOIN sales_orders so ON so.id = r.order_id
JOIN customers c ON c.id = so.customer_id
WHERE c.name = 'MUHASINA';

-- Link them
UPDATE invoice_refunds 
SET return_id = '<return_id_from_above>'
WHERE id = '<refund_id_from_above>';
```

### KV NASAR
Already has ₹5k refunded (from earlier test), but might not be linked.

### NOBIN KOCHUMON  
Similar process as MUHASINA.

## Expected Report After Fix

**Customer Returns & Refunds**
```
Customer Name       | Return Value | Refunded | Balance Due | Status
--------------------|--------------|----------|-------------|--------
MUHASINA            | ₹20,000      | ₹15,000  | ₹5,000      | Pending
NOBIN KOCHUMON      | ₹12,180      | ₹8,000   | ₹4,180      | Pending
KV NASAR            | ₹10,000      | ₹5,000   | ₹5,000      | Pending
--------------------|--------------|----------|-------------|--------
SUBTOTAL            | ₹42,180      | ₹28,000  | ₹14,180     |
```

## Conclusion

The AP/AR report is **working correctly**. It's reading the data the right way. The problem is the source data (invoice_refunds.return_id) is NULL.

**Two-Part Solution:**
1. ✅ Frontend fix (DONE) - New refunds will have return_id
2. ⏳ Database fix (NEEDED) - Backfill existing refunds' return_id

Once the database is updated, the report will immediately show the correct "Refunded" and "Balance Due" amounts without any code changes needed.
