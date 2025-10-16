-- FINAL VERIFICATION: Prove the system is working correctly
-- Run this to see the complete picture

-- 1. Show ALL returns with their refund status
SELECT 
  r.id as return_id,
  c.name as customer_name,
  c.phone,
  r.return_value,
  r.status as return_status,
  COALESCE(SUM(ir.refund_amount), 0) as total_refunded,
  r.return_value - COALESCE(SUM(ir.refund_amount), 0) as balance_due,
  COUNT(ir.id) as refund_count,
  CASE 
    WHEN COALESCE(SUM(ir.refund_amount), 0) = 0 THEN '❌ NOT REFUNDED (Shows ₹0 in report)'
    WHEN r.return_value - COALESCE(SUM(ir.refund_amount), 0) > 0 THEN '⚠️ PARTIALLY REFUNDED'
    WHEN r.return_value - COALESCE(SUM(ir.refund_amount), 0) = 0 THEN '✅ FULLY REFUNDED (Hidden from report)'
  END as display_status
FROM returns r
JOIN sales_orders so ON so.id = r.order_id
JOIN customers c ON c.id = so.customer_id
LEFT JOIN invoice_refunds ir ON ir.return_id = r.id
WHERE r.return_value > 0
GROUP BY r.id, c.name, c.phone, r.return_value, r.status
ORDER BY c.name;

-- Expected Result:
-- customer_name   | return_value | total_refunded | balance_due | display_status
-- ----------------|--------------|----------------|-------------|-------------------
-- ASEES           | 2925         | 2925           | 0           | ✅ FULLY REFUNDED (Hidden from report)
-- KV NASAR        | 10000        | 0              | 10000       | ❌ NOT REFUNDED (Shows ₹0 in report)
-- MUHASINA        | 20000        | 0              | 20000       | ❌ NOT REFUNDED (Shows ₹0 in report)
-- NOBIN KOCHUMON  | 12180        | 0              | 12180       | ❌ NOT REFUNDED (Shows ₹0 in report)


-- 2. Show what's in the refund map (what the code builds)
SELECT 
  ir.return_id,
  c.name as customer_name,
  SUM(ir.refund_amount) as total_in_map,
  COUNT(ir.id) as refund_count,
  STRING_AGG(ir.id::text, ', ') as refund_ids
FROM invoice_refunds ir
LEFT JOIN invoices i ON i.id = ir.invoice_id
LEFT JOIN customers c ON c.id = i.customer_id
WHERE ir.return_id IS NOT NULL
GROUP BY ir.return_id, c.name
ORDER BY c.name;

-- Expected Result:
-- return_id                            | customer_name | total_in_map | refund_count
-- -------------------------------------|---------------|--------------|-------------
-- e6f1904c-2b66-4759-908a-b48f6847e505 | ASEES         | 2925         | 1

-- This proves: Only ASEES has an entry in the refund map!


-- 3. Show what the AP report displays
SELECT 
  c.name as customer_name,
  r.return_value,
  COALESCE(SUM(ir.refund_amount), 0) as refunded,
  r.return_value - COALESCE(SUM(ir.refund_amount), 0) as balance_due,
  CASE 
    WHEN r.return_value - COALESCE(SUM(ir.refund_amount), 0) > 0 THEN '✅ SHOWN IN REPORT'
    ELSE '❌ HIDDEN (balance = 0)'
  END as in_report
FROM returns r
JOIN sales_orders so ON so.id = r.order_id
JOIN customers c ON c.id = so.customer_id
LEFT JOIN invoice_refunds ir ON ir.return_id = r.id
WHERE r.return_value > 0
GROUP BY r.id, c.name, r.return_value
HAVING r.return_value - COALESCE(SUM(ir.refund_amount), 0) > 0
ORDER BY c.name;

-- Expected Result (matches the screenshot):
-- customer_name   | return_value | refunded | balance_due | in_report
-- ----------------|--------------|----------|-------------|------------------
-- KV NASAR        | 10000        | 0        | 10000       | ✅ SHOWN IN REPORT
-- MUHASINA        | 20000        | 0        | 20000       | ✅ SHOWN IN REPORT
-- NOBIN KOCHUMON  | 12180        | 0        | 12180       | ✅ SHOWN IN REPORT

-- Note: ASEES is NOT in this result because balance = 0 (fully refunded)


-- 4. Prove return_id linkage is correct
SELECT 
  'Refunds with return_id' as metric,
  COUNT(*) as count
FROM invoice_refunds
WHERE return_id IS NOT NULL

UNION ALL

SELECT 
  'Refunds without return_id',
  COUNT(*)
FROM invoice_refunds
WHERE return_id IS NULL

UNION ALL

SELECT 
  'Total refunds',
  COUNT(*)
FROM invoice_refunds;

-- Expected Result:
-- metric                      | count
-- ----------------------------|------
-- Refunds with return_id      | 1
-- Refunds without return_id   | 0
-- Total refunds               | 1

-- This proves: 100% of refunds have return_id populated ✅
