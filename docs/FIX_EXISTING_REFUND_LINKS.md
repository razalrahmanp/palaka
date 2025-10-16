# Fix Existing Invoice Refunds - Link to Returns

## Problem Statement

Existing refunds in the database have `return_id = NULL`, which breaks the link between refunds and their source returns. This causes:

1. **Accounts Payable Report**: Shows incorrect refunded amounts (₹0 instead of actual amounts)
2. **Sales Returns Ledger**: Shows incorrect balances
3. **Duplicate Entries**: Returns AND refunds show separately instead of being linked

## Database Schema Verification

### Returns Table
```sql
SELECT 
  id as return_id,
  order_id,
  return_value,
  status,
  created_at
FROM returns
WHERE return_value > 0
ORDER BY created_at DESC
LIMIT 10;
```

### Invoice Refunds Table (Current State)
```sql
SELECT 
  id as refund_id,
  invoice_id,
  return_id,  -- ❌ Currently NULL for most refunds
  refund_amount,
  status,
  created_at
FROM invoice_refunds
ORDER BY created_at DESC
LIMIT 10;
```

## Check Broken Links

### Find Refunds Without return_id
```sql
SELECT 
  ir.id as refund_id,
  ir.invoice_id,
  ir.return_id,  -- NULL
  ir.refund_amount,
  ir.status,
  ir.created_at,
  i.sales_order_id,
  -- Check if a return exists for this invoice's sales order
  EXISTS(
    SELECT 1 FROM returns r 
    WHERE r.order_id = i.sales_order_id
  ) as has_matching_return
FROM invoice_refunds ir
JOIN invoices i ON i.id = ir.invoice_id
WHERE ir.return_id IS NULL
ORDER BY ir.created_at DESC;
```

**Expected Result**: Shows all refunds that are NOT linked to returns

## Find Matching Returns for Orphaned Refunds

```sql
-- This query shows which return_id SHOULD be used for each refund
SELECT 
  ir.id as refund_id,
  ir.invoice_id,
  ir.return_id as current_return_id,  -- NULL
  ir.refund_amount,
  ir.created_at as refund_created,
  i.sales_order_id,
  r.id as correct_return_id,  -- ← This should be used!
  r.return_value,
  r.status as return_status,
  r.created_at as return_created,
  -- Check if values match
  CASE 
    WHEN r.return_value = ir.refund_amount THEN '✅ Exact Match'
    WHEN r.return_value > ir.refund_amount THEN '✅ Partial Refund'
    WHEN r.return_value < ir.refund_amount THEN '⚠️  Refund > Return'
    ELSE '❓ No Match'
  END as match_type
FROM invoice_refunds ir
JOIN invoices i ON i.id = ir.invoice_id
LEFT JOIN returns r ON r.order_id = i.sales_order_id
WHERE ir.return_id IS NULL
ORDER BY ir.created_at DESC;
```

**This shows:**
- Which refunds need to be linked
- What their correct `return_id` should be
- Whether amounts match

## Specific Cases from Your Data

### MUHASINA - ₹20k Return
```sql
-- Find MUHASINA's return and refund
SELECT 
  'Return' as type,
  r.id,
  NULL as invoice_id,
  r.order_id as sales_order_id,
  r.return_value as amount,
  r.status,
  r.created_at
FROM returns r
WHERE EXISTS(
  SELECT 1 FROM sales_orders so
  JOIN customers c ON c.id = so.customer_id
  WHERE so.id = r.order_id AND c.name = 'MUHASINA'
)

UNION ALL

SELECT 
  'Refund' as type,
  ir.id,
  ir.invoice_id,
  i.sales_order_id,
  ir.refund_amount as amount,
  ir.status,
  ir.created_at
FROM invoice_refunds ir
JOIN invoices i ON i.id = ir.invoice_id
JOIN customers c ON c.id = i.customer_id
WHERE c.name = 'MUHASINA'
ORDER BY created_at DESC;
```

### NOBIN KOCHUMON - ₹12.18k Return
```sql
SELECT 
  'Return' as type,
  r.id,
  r.return_value,
  r.status
FROM returns r
WHERE EXISTS(
  SELECT 1 FROM sales_orders so
  JOIN customers c ON c.id = so.customer_id
  WHERE so.id = r.order_id AND c.name LIKE '%NOBIN%'
);
```

### KV NASAR - ₹10k Return
```sql
SELECT 
  'Return' as type,
  r.id,
  r.return_value,
  r.status
FROM returns r
WHERE EXISTS(
  SELECT 1 FROM sales_orders so
  JOIN customers c ON c.id = so.customer_id
  WHERE so.id = r.order_id AND c.name LIKE '%NASAR%'
);
```

## Fix Script - Link Refunds to Returns

### Dry Run (Check what will be updated)
```sql
-- See how many refunds will be linked
SELECT 
  COUNT(*) as refunds_to_fix,
  SUM(ir.refund_amount) as total_amount
FROM invoice_refunds ir
JOIN invoices i ON i.id = ir.invoice_id
JOIN returns r ON r.order_id = i.sales_order_id
WHERE ir.return_id IS NULL
  AND r.id IS NOT NULL;
```

### Update Script (Link refunds to returns)
```sql
-- ⚠️ BACKUP YOUR DATA BEFORE RUNNING THIS!
-- This will update all refunds to link them to their returns

WITH return_mapping AS (
  SELECT 
    ir.id as refund_id,
    ir.invoice_id,
    r.id as correct_return_id,
    ir.refund_amount,
    r.return_value,
    ir.created_at as refund_date,
    r.created_at as return_date
  FROM invoice_refunds ir
  JOIN invoices i ON i.id = ir.invoice_id
  JOIN returns r ON r.order_id = i.sales_order_id
  WHERE ir.return_id IS NULL  -- Only update ones without return_id
    AND r.id IS NOT NULL      -- Only if a return actually exists
    -- Optional: Only link if dates make sense (refund after return)
    AND ir.created_at >= r.created_at
)
UPDATE invoice_refunds
SET return_id = return_mapping.correct_return_id
FROM return_mapping
WHERE invoice_refunds.id = return_mapping.refund_id
RETURNING 
  invoice_refunds.id as refund_id,
  invoice_refunds.return_id as new_return_id,
  invoice_refunds.refund_amount;
```

### Alternative: Update Specific Refunds Only

If you want to be more careful, update one at a time:

```sql
-- Update ASEES refund (from your log: id = 42beaccd-012b-4de0-82af-3a3185b82a88)
UPDATE invoice_refunds ir
SET return_id = (
  SELECT r.id 
  FROM invoices i
  JOIN returns r ON r.order_id = i.sales_order_id
  WHERE i.id = ir.invoice_id
  LIMIT 1
)
WHERE ir.id = '42beaccd-012b-4de0-82af-3a3185b82a88'
RETURNING 
  id as refund_id,
  return_id as new_return_id,
  refund_amount;
```

## Verification After Fix

### Check if Links are Correct
```sql
SELECT 
  ir.id as refund_id,
  ir.return_id,
  ir.refund_amount,
  r.return_value,
  r.status as return_status,
  c.name as customer_name,
  CASE 
    WHEN ir.return_id IS NULL THEN '❌ Not Linked'
    WHEN ir.return_id = r.id THEN '✅ Correctly Linked'
    ELSE '⚠️  Wrong Link'
  END as link_status
FROM invoice_refunds ir
JOIN invoices i ON i.id = ir.invoice_id
LEFT JOIN returns r ON r.id = ir.return_id
LEFT JOIN customers c ON c.id = i.customer_id
ORDER BY ir.created_at DESC
LIMIT 20;
```

### Check AP Report Data
```sql
-- This mimics what the AP report does
SELECT 
  r.id as return_id,
  c.name as customer_name,
  r.return_value,
  COALESCE(SUM(ir.refund_amount), 0) as refunded_amount,
  r.return_value - COALESCE(SUM(ir.refund_amount), 0) as balance,
  CASE 
    WHEN r.return_value - COALESCE(SUM(ir.refund_amount), 0) > 0 THEN 'Pending'
    ELSE 'Settled'
  END as status
FROM returns r
JOIN sales_orders so ON so.id = r.order_id
JOIN customers c ON c.id = so.customer_id
LEFT JOIN invoice_refunds ir ON ir.return_id = r.id 
  AND ir.status IN ('pending', 'approved', 'processed')
WHERE r.return_value > 0
GROUP BY r.id, c.name, r.return_value
HAVING r.return_value - COALESCE(SUM(ir.refund_amount), 0) > 0
ORDER BY balance DESC;
```

**Expected Result After Fix:**
```
Customer         Return Value  Refunded  Balance  Status
MUHASINA         ₹20,000      ₹0        ₹20,000  Pending  (if no refund processed yet)
NOBIN KOCHUMON   ₹12,180      ₹0        ₹12,180  Pending
KV NASAR         ₹10,000      ₹5,000    ₹5,000   Pending
ASEES            ₹2,925       ₹2,925    ₹0       Settled  (if fully refunded)
```

## Safety Checks

### Before Running Update
1. **Backup your database**:
   ```bash
   pg_dump your_database > backup_before_return_id_fix.sql
   ```

2. **Count affected rows**:
   ```sql
   SELECT COUNT(*) FROM invoice_refunds WHERE return_id IS NULL;
   ```

3. **Check for edge cases**:
   ```sql
   -- Find refunds where multiple returns exist for same order
   SELECT 
     ir.id,
     ir.invoice_id,
     COUNT(r.id) as return_count
   FROM invoice_refunds ir
   JOIN invoices i ON i.id = ir.invoice_id
   JOIN returns r ON r.order_id = i.sales_order_id
   WHERE ir.return_id IS NULL
   GROUP BY ir.id, ir.invoice_id
   HAVING COUNT(r.id) > 1;
   ```

### After Running Update
1. **Verify no NULL return_ids remain** (for refunds that should have them):
   ```sql
   SELECT COUNT(*) 
   FROM invoice_refunds ir
   JOIN invoices i ON i.id = ir.invoice_id
   WHERE ir.return_id IS NULL
     AND EXISTS(SELECT 1 FROM returns r WHERE r.order_id = i.sales_order_id);
   ```
   Should return 0.

2. **Check AP report** in the UI - should show correct refunded amounts

3. **Check ledgers** - should show correct balances

## Expected Impact

**Before Fix:**
- AP Report shows: MUHASINA ₹20k return, ₹0 refunded
- Database: `invoice_refunds.return_id = NULL`

**After Fix:**
- AP Report shows: MUHASINA ₹20k return, ₹X refunded (actual amount)
- Database: `invoice_refunds.return_id = '<correct-uuid>'`
- Ledgers show correct balances
- No duplicate entries in AP report

## Quick Fix for Test

If you want to test with just one customer:

```sql
-- Fix ASEES refund only
UPDATE invoice_refunds ir
SET return_id = 'e6f1904c-2b66-4759-908a-b48f6847e505'  -- The return_id we found in logs
WHERE ir.id = '42beaccd-012b-4de0-82af-3a3185b82a88';  -- ASEES refund ID

-- Then check the result
SELECT 
  ir.*,
  r.return_value,
  r.status as return_status
FROM invoice_refunds ir
LEFT JOIN returns r ON r.id = ir.return_id
WHERE ir.id = '42beaccd-012b-4de0-82af-3a3185b82a88';
```

Then refresh the AP report and check if ASEES shows correct refunded amount.
