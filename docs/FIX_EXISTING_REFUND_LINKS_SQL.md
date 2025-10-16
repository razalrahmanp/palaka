# Fix Existing Refund Links - SQL Script

## Problem

Existing refunds in the `invoice_refunds` table have `return_id = NULL`, so they're not linked to their corresponding returns. This causes:

1. **Returns show ₹0 refunded** (MUHASINA, NOBIN KOCHUMON, KV NASAR)
2. **Refunds appear as standalone** instead of linked to returns
3. **AP Report shows incorrect outstanding balances**

## Solution

Link existing refunds to their returns by populating the `return_id` field based on the invoice → sales_order → return relationship.

## Step 1: Verify the Problem

### Check Current State
```sql
-- See refunds without return_id
SELECT 
  ir.id as refund_id,
  ir.invoice_id,
  ir.return_id,
  ir.refund_amount,
  ir.status,
  ir.created_at,
  i.sales_order_id,
  r.id as available_return_id,
  r.return_value,
  r.status as return_status,
  c.name as customer_name,
  CASE 
    WHEN ir.return_id IS NULL AND r.id IS NOT NULL THEN '❌ BROKEN - Return exists but not linked'
    WHEN ir.return_id IS NULL AND r.id IS NULL THEN '⚠️ NO RETURN - Standalone refund'
    WHEN ir.return_id IS NOT NULL THEN '✅ LINKED - Properly connected'
  END as link_status
FROM invoice_refunds ir
JOIN invoices i ON i.id = ir.invoice_id
LEFT JOIN returns r ON r.order_id = i.sales_order_id
LEFT JOIN customers c ON c.id = i.customer_id
ORDER BY ir.created_at DESC;
```

**Expected Results:**
```
refund_id | customer_name | refund_amount | return_id | available_return_id | link_status
----------|---------------|---------------|-----------|--------------------|--------------
...       | MUHASINA      | 20000         | NULL      | <return-uuid>      | ❌ BROKEN
...       | NOBIN KOCHUMON| 12180         | NULL      | <return-uuid>      | ❌ BROKEN  
...       | KV NASAR      | 10000         | NULL      | <return-uuid>      | ❌ BROKEN
...       | ASEES         | 2925          | NULL      | <return-uuid>      | ❌ BROKEN
```

## Step 2: Preview the Fix

### See What Will Be Updated
```sql
-- Preview: Show which refunds will be linked to which returns
SELECT 
  ir.id as refund_id,
  ir.refund_amount,
  ir.return_id as current_return_id,
  r.id as new_return_id,
  c.name as customer_name,
  r.return_value,
  i.sales_order_id,
  '→' as arrow,
  'Will link refund ' || ir.id || ' to return ' || r.id as action
FROM invoice_refunds ir
JOIN invoices i ON i.id = ir.invoice_id
JOIN returns r ON r.order_id = i.sales_order_id
LEFT JOIN customers c ON c.id = i.customer_id
WHERE ir.return_id IS NULL  -- Only refunds without return_id
  AND r.id IS NOT NULL      -- Only if a return exists
ORDER BY c.name, ir.created_at;
```

**Expected Output:**
```
customer_name   | refund_amount | current_return_id | new_return_id        | action
----------------|---------------|-------------------|---------------------|------------------
ASEES           | 2925          | NULL              | e6f1904c-2b66-...   | Will link...
KV NASAR        | 10000         | NULL              | <return-uuid>       | Will link...
MUHASINA        | 20000         | NULL              | <return-uuid>       | Will link...
NOBIN KOCHUMON  | 12180         | NULL              | <return-uuid>       | Will link...
```

## Step 3: Count Affected Records

```sql
-- How many refunds will be fixed?
SELECT 
  COUNT(*) as total_refunds_to_fix,
  SUM(ir.refund_amount) as total_amount_to_link,
  COUNT(DISTINCT c.name) as affected_customers
FROM invoice_refunds ir
JOIN invoices i ON i.id = ir.invoice_id
JOIN returns r ON r.order_id = i.sales_order_id
LEFT JOIN customers c ON c.id = i.customer_id
WHERE ir.return_id IS NULL
  AND r.id IS NOT NULL;
```

**Expected:**
```
total_refunds_to_fix | total_amount_to_link | affected_customers
---------------------|----------------------|-------------------
4+                   | ₹42,180+             | 4+
```

## Step 4: Execute the Fix

### Update Existing Refunds with return_id

```sql
-- BACKUP FIRST! (Optional but recommended)
-- CREATE TABLE invoice_refunds_backup AS SELECT * FROM invoice_refunds WHERE return_id IS NULL;

-- Main Fix: Link refunds to returns
WITH refund_return_mapping AS (
  SELECT 
    ir.id as refund_id,
    r.id as correct_return_id,
    ir.refund_amount,
    c.name as customer_name
  FROM invoice_refunds ir
  JOIN invoices i ON i.id = ir.invoice_id
  JOIN returns r ON r.order_id = i.sales_order_id
  LEFT JOIN customers c ON c.id = i.customer_id
  WHERE ir.return_id IS NULL  -- Only fix refunds without return_id
    AND r.id IS NOT NULL       -- Only if a return actually exists
)
UPDATE invoice_refunds
SET 
  return_id = refund_return_mapping.correct_return_id,
  updated_at = NOW()
FROM refund_return_mapping
WHERE invoice_refunds.id = refund_return_mapping.refund_id
RETURNING 
  invoice_refunds.id,
  invoice_refunds.return_id,
  invoice_refunds.refund_amount,
  (SELECT name FROM customers WHERE id = (SELECT customer_id FROM invoices WHERE id = invoice_refunds.invoice_id)) as customer;
```

**Expected Output:**
```
id                                   | return_id                            | refund_amount | customer
-------------------------------------|--------------------------------------|---------------|----------------
42beaccd-012b-4de0-82af-3a3185b82a88 | e6f1904c-2b66-4759-908a-b48f6847e505 | 2925          | ASEES
<refund-id>                          | <return-id>                          | 10000         | KV NASAR
<refund-id>                          | <return-id>                          | 20000         | MUHASINA
<refund-id>                          | <return-id>                          | 12180         | NOBIN KOCHUMON
```

## Step 5: Verify the Fix

### Confirm All Refunds Are Linked
```sql
-- Check: Should show all refunds now have return_id
SELECT 
  c.name as customer_name,
  ir.id as refund_id,
  ir.return_id,
  ir.refund_amount,
  r.return_value,
  CASE 
    WHEN ir.return_id IS NULL THEN '❌ STILL BROKEN'
    WHEN ir.return_id = r.id THEN '✅ FIXED'
    ELSE '⚠️ MISMATCH'
  END as status
FROM invoice_refunds ir
JOIN invoices i ON i.id = ir.invoice_id
LEFT JOIN returns r ON r.order_id = i.sales_order_id
LEFT JOIN customers c ON c.id = i.customer_id
ORDER BY c.name;
```

**Expected:** All rows show `✅ FIXED`

### Check Returns with Refunds
```sql
-- Verify: Returns now show correct refunded amounts
SELECT 
  c.name as customer_name,
  r.id as return_id,
  r.return_value,
  COALESCE(SUM(ir.refund_amount), 0) as total_refunded,
  r.return_value - COALESCE(SUM(ir.refund_amount), 0) as balance_due,
  CASE 
    WHEN r.return_value - COALESCE(SUM(ir.refund_amount), 0) <= 0 THEN '✅ Fully Refunded'
    WHEN COALESCE(SUM(ir.refund_amount), 0) > 0 THEN '⚠️ Partially Refunded'
    ELSE '❌ Not Refunded'
  END as refund_status
FROM returns r
JOIN sales_orders so ON so.id = r.order_id
JOIN customers c ON c.id = so.customer_id
LEFT JOIN invoices i ON i.sales_order_id = so.id
LEFT JOIN invoice_refunds ir ON ir.return_id = r.id
GROUP BY r.id, r.return_value, c.name
HAVING r.return_value > 0
ORDER BY c.name;
```

**Expected:**
```
customer_name   | return_value | total_refunded | balance_due | refund_status
----------------|--------------|----------------|-------------|------------------
ASEES           | 2925         | 2925           | 0           | ✅ Fully Refunded
KV NASAR        | 10000        | 10000          | 0           | ✅ Fully Refunded
MUHASINA        | 20000        | 20000          | 0           | ✅ Fully Refunded
NOBIN KOCHUMON  | 12180        | 12180          | 0           | ✅ Fully Refunded
```

## Step 6: Test in Application

### Before Fix:
```
Customer Returns & Refunds
3 pending refunds • ₹42,180 outstanding

Customer Name          Return Value  Refunded  Balance Due  Status
MUHASINA (Return)      ₹20,000       ₹0        ₹20,000      Pending
NOBIN KOCHUMON (Return)₹12,180       ₹0        ₹12,180      Pending
KV NASAR (Return)      ₹10,000       ₹0        ₹10,000      Pending
```

### After Fix:
```
Customer Returns & Refunds
0 pending refunds • ₹0 outstanding

(If fully refunded, no entries shown - or entries show correct refunded amounts)
```

## Alternative: Fix Specific Customers

If you only want to fix specific customers:

```sql
-- Fix only ASEES refund
UPDATE invoice_refunds ir
SET return_id = r.id, updated_at = NOW()
FROM invoices i
JOIN returns r ON r.order_id = i.sales_order_id
JOIN customers c ON c.id = i.customer_id
WHERE ir.invoice_id = i.id
  AND ir.return_id IS NULL
  AND c.name = 'ASEES'
RETURNING ir.id, ir.return_id, ir.refund_amount;
```

## Edge Cases

### Multiple Returns per Invoice
If one invoice has multiple returns, the UPDATE will link to one of them (first match):

```sql
-- Check for invoices with multiple returns
SELECT 
  i.id as invoice_id,
  i.sales_order_id,
  COUNT(DISTINCT r.id) as return_count,
  STRING_AGG(r.id::text, ', ') as return_ids
FROM invoices i
JOIN returns r ON r.order_id = i.sales_order_id
GROUP BY i.id, i.sales_order_id
HAVING COUNT(DISTINCT r.id) > 1;
```

If found, you may need to manually specify which return to link to.

### Multiple Refunds per Return
This is valid - one return can have multiple refund payments:

```sql
-- Check: Returns with multiple refunds (this is OK)
SELECT 
  r.id as return_id,
  c.name as customer,
  r.return_value,
  COUNT(ir.id) as refund_count,
  SUM(ir.refund_amount) as total_refunded
FROM returns r
JOIN sales_orders so ON so.id = r.order_id
JOIN customers c ON c.id = so.customer_id
LEFT JOIN invoices i ON i.sales_order_id = so.id
LEFT JOIN invoice_refunds ir ON ir.return_id = r.id
GROUP BY r.id, r.return_value, c.name
HAVING COUNT(ir.id) > 1
ORDER BY refund_count DESC;
```

## Rollback (If Needed)

If something goes wrong:

```sql
-- Rollback: Clear return_id for recently updated refunds
UPDATE invoice_refunds
SET return_id = NULL, updated_at = NOW()
WHERE updated_at > NOW() - INTERVAL '1 hour'
  AND return_id IS NOT NULL
RETURNING id, return_id;

-- Or restore from backup
-- DELETE FROM invoice_refunds WHERE return_id IS NOT NULL;
-- INSERT INTO invoice_refunds SELECT * FROM invoice_refunds_backup;
```

## Summary

**Run these in order:**

1. ✅ **Step 1:** Check current state (verify the problem)
2. ✅ **Step 2:** Preview what will change
3. ✅ **Step 3:** Count affected records
4. ✅ **Step 4:** Execute the UPDATE (THE FIX)
5. ✅ **Step 5:** Verify it worked
6. ✅ **Step 6:** Refresh AP report and confirm

After running Step 4, the AP report should automatically show correct refunded amounts! 🎉

## Quick Fix Script (All in One)

```sql
-- Complete fix in one transaction
BEGIN;

-- 1. Preview
SELECT COUNT(*) as will_fix FROM invoice_refunds ir
JOIN invoices i ON i.id = ir.invoice_id
JOIN returns r ON r.order_id = i.sales_order_id
WHERE ir.return_id IS NULL AND r.id IS NOT NULL;

-- 2. Execute
WITH mapping AS (
  SELECT ir.id as refund_id, r.id as return_id
  FROM invoice_refunds ir
  JOIN invoices i ON i.id = ir.invoice_id
  JOIN returns r ON r.order_id = i.sales_order_id
  WHERE ir.return_id IS NULL AND r.id IS NOT NULL
)
UPDATE invoice_refunds
SET return_id = mapping.return_id, updated_at = NOW()
FROM mapping
WHERE invoice_refunds.id = mapping.refund_id;

-- 3. Verify
SELECT 
  COUNT(*) FILTER (WHERE return_id IS NULL) as still_broken,
  COUNT(*) FILTER (WHERE return_id IS NOT NULL) as fixed,
  COUNT(*) as total
FROM invoice_refunds;

-- If looks good: COMMIT;
-- If not: ROLLBACK;
COMMIT;
```
