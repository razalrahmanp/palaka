-- COMPREHENSIVE ANALYSIS: Returns & Refunds Data Flow
-- Run these queries in order to understand exactly what's happening

-- ========================================
-- PART 1: Check if refunds exist at all
-- ========================================

-- Query 1: Check ALL refunds in the system
SELECT 
  ir.id as refund_id,
  ir.invoice_id,
  ir.return_id,
  ir.refund_amount,
  ir.status as refund_status,
  ir.created_at,
  i.customer_name,
  i.sales_order_id
FROM invoice_refunds ir
LEFT JOIN invoices i ON i.id = ir.invoice_id
ORDER BY ir.created_at DESC
LIMIT 20;

-- Expected: Should see refunds with their return_id values
-- If return_id is NULL for some, that's the problem!


-- ========================================
-- PART 2: Check the 3 specific customers
-- ========================================

-- Query 2: Find returns for MUHASINA, NOBIN KOCHUMON, KV NASAR
SELECT 
  r.id as return_id,
  r.order_id,
  r.return_value,
  r.status as return_status,
  r.created_at,
  so.id as sales_order_id,
  c.name as customer_name,
  c.phone
FROM returns r
JOIN sales_orders so ON so.id = r.order_id
JOIN customers c ON c.id = so.customer_id
WHERE c.name IN ('MUHASINA', 'NOBIN KOCHUMON', 'KV NASAR')
ORDER BY c.name;

-- Expected: Should see 3 rows with return_id for each customer


-- ========================================
-- PART 3: Check if refunds exist for these customers
-- ========================================

-- Query 3: Find refunds for these 3 customers (by invoice)
SELECT 
  c.name as customer_name,
  c.phone,
  r.id as return_id,
  r.return_value,
  r.status as return_status,
  i.id as invoice_id,
  i.sales_order_id,
  ir.id as refund_id,
  ir.return_id as refund_return_id,
  ir.refund_amount,
  ir.status as refund_status,
  ir.created_at as refund_created
FROM customers c
JOIN sales_orders so ON so.customer_id = c.id
LEFT JOIN returns r ON r.order_id = so.id
LEFT JOIN invoices i ON i.sales_order_id = so.id
LEFT JOIN invoice_refunds ir ON ir.invoice_id = i.id
WHERE c.name IN ('MUHASINA', 'NOBIN KOCHUMON', 'KV NASAR')
  AND r.return_value > 0
ORDER BY c.name, ir.created_at;

-- Expected: If ir.id is NULL, no refunds exist for that customer
-- If ir.return_id is NULL, refund exists but not linked to return


-- ========================================
-- PART 4: Check refunds by return_id linkage
-- ========================================

-- Query 4: Join refunds directly via return_id
SELECT 
  c.name as customer_name,
  c.phone,
  r.id as return_id,
  r.return_value,
  COUNT(ir.id) as refund_count,
  COALESCE(SUM(ir.refund_amount), 0) as total_refunded,
  r.return_value - COALESCE(SUM(ir.refund_amount), 0) as balance_due,
  STRING_AGG(ir.status, ', ') as refund_statuses,
  STRING_AGG(ir.id::text, ', ') as refund_ids
FROM customers c
JOIN sales_orders so ON so.customer_id = c.id
JOIN returns r ON r.order_id = so.id
LEFT JOIN invoice_refunds ir ON ir.return_id = r.id  -- ← Direct join by return_id
WHERE c.name IN ('MUHASINA', 'NOBIN KOCHUMON', 'KV NASAR')
  AND r.return_value > 0
GROUP BY c.name, c.phone, r.id, r.return_value
ORDER BY c.name;

-- Expected Output:
-- customer_name   | return_id | return_value | refund_count | total_refunded | balance_due
-- MUHASINA        | abc-123   | 20000        | ?            | ?              | ?
-- NOBIN KOCHUMON  | def-456   | 12180        | ?            | ?              | ?
-- KV NASAR        | ghi-789   | 10000        | ?            | ?              | ?


-- ========================================
-- PART 5: What the code expects
-- ========================================

-- Query 5: Simulate what the frontend code does
WITH refund_map AS (
  -- This is what the code builds: return_id → total_refunded
  SELECT 
    return_id,
    SUM(refund_amount) as total_refunded
  FROM invoice_refunds
  WHERE return_id IS NOT NULL
  GROUP BY return_id
)
SELECT 
  c.name as customer_name,
  c.phone,
  r.id as return_id,
  r.return_value,
  r.status as return_status,
  COALESCE(rm.total_refunded, 0) as refunded_amount,
  r.return_value - COALESCE(rm.total_refunded, 0) as balance_due,
  CASE 
    WHEN rm.total_refunded IS NULL THEN '❌ No refunds found (shows ₹0)'
    WHEN r.return_value - COALESCE(rm.total_refunded, 0) > 0 THEN '⚠️ Partially refunded'
    ELSE '✅ Fully refunded (hidden from report)'
  END as display_status
FROM customers c
JOIN sales_orders so ON so.customer_id = c.id
JOIN returns r ON r.order_id = so.id
LEFT JOIN refund_map rm ON rm.return_id = r.id
WHERE c.name IN ('MUHASINA', 'NOBIN KOCHUMON', 'KV NASAR')
  AND r.return_value > 0
ORDER BY c.name;

-- This should show exactly what the AP report displays!


-- ========================================
-- PART 6: Find all refunds (any customer)
-- ========================================

-- Query 6: Show ALL refunds with return_id populated
SELECT 
  ir.id as refund_id,
  ir.return_id,
  ir.refund_amount,
  ir.status,
  i.customer_name,
  r.return_value,
  ir.created_at
FROM invoice_refunds ir
LEFT JOIN invoices i ON i.id = ir.invoice_id
LEFT JOIN returns r ON r.id = ir.return_id
WHERE ir.return_id IS NOT NULL
ORDER BY ir.created_at DESC
LIMIT 20;

-- Expected: Should see all refunds that have return_id populated


-- ========================================
-- PART 7: Summary statistics
-- ========================================

-- Query 7: Overall stats
SELECT 
  'Total Refunds' as metric,
  COUNT(*) as count,
  SUM(refund_amount) as total_amount
FROM invoice_refunds

UNION ALL

SELECT 
  'Refunds WITH return_id',
  COUNT(*),
  SUM(refund_amount)
FROM invoice_refunds
WHERE return_id IS NOT NULL

UNION ALL

SELECT 
  'Refunds WITHOUT return_id',
  COUNT(*),
  SUM(refund_amount)
FROM invoice_refunds
WHERE return_id IS NULL

UNION ALL

SELECT 
  'Returns with value > 0',
  COUNT(*),
  SUM(return_value)
FROM returns
WHERE return_value > 0;


-- ========================================
-- DIAGNOSTIC QUESTIONS TO ANSWER:
-- ========================================

/*
After running these queries, answer:

1. Do refunds exist for MUHASINA, NOBIN KOCHUMON, KV NASAR? (Query 3, 4)
   - If NO refunds exist → System is correct showing ₹0
   - If refunds exist → Check next question

2. Do the refunds have return_id populated? (Query 3, 4)
   - If return_id is NULL → That's the problem! Run backfill script
   - If return_id is populated → Check next question

3. Does the return_id match the correct return? (Query 4, 5)
   - Compare refund.return_id with return.id
   - If mismatch → Data integrity issue

4. What status do the refunds have? (Query 1, 6)
   - Check if status is 'processed', 'approved', 'pending', etc.
   - All statuses should be counted (we removed status filter)

5. Are refunds linked to correct invoices? (Query 3)
   - Check if invoice.sales_order_id matches return.order_id
   - Verify the relationship chain
*/
