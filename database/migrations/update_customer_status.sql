-- Migration: Update Customer Status Based on Sales Orders and Invoices
-- Date: 2025-11-03
-- Description: Updates customer status to Lead/Active/Closed based on sales orders and payment status

-- Step 1: Set all customers to 'Lead' by default (no sales orders)
UPDATE customers 
SET status = 'Lead', 
    updated_at = now()
WHERE id NOT IN (
  SELECT DISTINCT customer_id 
  FROM sales_orders 
  WHERE customer_id IS NOT NULL
);

-- Step 2: Update to 'Active' - Customers with unpaid or partially paid invoices
UPDATE customers c
SET status = 'Active', 
    updated_at = now()
WHERE EXISTS (
  SELECT 1 
  FROM invoices i 
  WHERE i.customer_id = c.id 
  AND (
    -- Invoice is marked as unpaid AND not fully paid by amount
    (i.status = 'unpaid' AND (i.paid_amount < i.total - i.waived_amount))
    OR 
    -- Partial payment (has some payment but not full)
    (i.paid_amount > 0 AND i.paid_amount < (i.total - i.waived_amount))
  )
);

-- Step 3: Update to 'Closed' - Customers with all invoices fully paid
UPDATE customers c
SET status = 'Closed', 
    updated_at = now()
WHERE id IN (
  -- Has sales orders
  SELECT DISTINCT customer_id 
  FROM sales_orders 
  WHERE customer_id IS NOT NULL
)
AND NOT EXISTS (
  -- No unpaid or partial invoices (considering waived amounts)
  SELECT 1 
  FROM invoices i 
  WHERE i.customer_id = c.id 
  AND (
    -- Invoice not fully paid (considering waived amount)
    i.paid_amount < (i.total - i.waived_amount)
  )
)
AND EXISTS (
  -- Has at least one invoice (to confirm they've been invoiced)
  SELECT 1 
  FROM invoices i 
  WHERE i.customer_id = c.id
);

-- Verification Query: Check the distribution of customer statuses
SELECT 
  status, 
  COUNT(*) as customer_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM customers
WHERE is_deleted = false
GROUP BY status
ORDER BY customer_count DESC;

-- Show some examples of Closed customers (fully paid)
SELECT 
  c.id,
  c.name,
  c.status,
  COUNT(DISTINCT i.id) as total_invoices,
  SUM(i.total) as total_invoice_amount,
  SUM(i.paid_amount) as total_paid_amount,
  SUM(i.waived_amount) as total_waived,
  SUM(i.total - i.waived_amount - i.paid_amount) as outstanding_balance
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id
WHERE c.is_deleted = false 
  AND c.status = 'Closed'
GROUP BY c.id, c.name, c.status
ORDER BY c.name
LIMIT 10;

-- Show some examples of Active customers (with balance)
SELECT 
  c.id,
  c.name,
  c.status,
  COUNT(DISTINCT i.id) as total_invoices,
  SUM(i.total) as total_invoice_amount,
  SUM(i.paid_amount) as total_paid_amount,
  SUM(i.waived_amount) as total_waived,
  SUM(i.total - i.waived_amount - i.paid_amount) as outstanding_balance
FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id
WHERE c.is_deleted = false 
  AND c.status = 'Active'
GROUP BY c.id, c.name, c.status
HAVING SUM(i.total - i.waived_amount - i.paid_amount) > 0
ORDER BY outstanding_balance DESC
LIMIT 10;

-- Show Lead customers (no orders)
SELECT 
  c.id,
  c.name,
  c.status,
  c.created_at
FROM customers c
WHERE c.is_deleted = false 
  AND c.status = 'Lead'
  AND NOT EXISTS (SELECT 1 FROM sales_orders WHERE customer_id = c.id)
ORDER BY c.created_at DESC
LIMIT 10;

-- Sample customers in each status (for verification)
SELECT 
  c.id,
  c.name,
  c.status,
  COUNT(DISTINCT so.id) as total_orders,
  COUNT(DISTINCT i.id) as total_invoices,
  COUNT(DISTINCT CASE WHEN i.status = 'paid' THEN i.id END) as paid_invoices,
  COUNT(DISTINCT CASE WHEN i.status = 'unpaid' OR (i.paid_amount > 0 AND i.paid_amount < (i.total - i.waived_amount)) THEN i.id END) as unpaid_partial_invoices,
  SUM(COALESCE(i.total, 0)) as total_invoice_amount,
  SUM(COALESCE(i.paid_amount, 0)) as total_paid_amount,
  SUM(COALESCE(i.waived_amount, 0)) as total_waived,
  SUM(COALESCE(i.total - i.waived_amount - i.paid_amount, 0)) as outstanding_balance
FROM customers c
LEFT JOIN sales_orders so ON so.customer_id = c.id
LEFT JOIN invoices i ON i.customer_id = c.id
WHERE c.is_deleted = false
GROUP BY c.id, c.name, c.status
ORDER BY c.status, outstanding_balance DESC
LIMIT 30;
