-- Sample Data for Sales Performance Tables
-- This script adds sample data to make the performance dashboard functional

-- First, let's add sales targets for current sales representatives
INSERT INTO public.sales_targets (
  sales_rep_id, 
  target_period_start, 
  target_period_end, 
  target_type, 
  revenue_target, 
  orders_target, 
  customers_target,
  created_by
) VALUES 
-- September 2025 targets for all sales reps
('5598ae6f-f310-49ef-8a86-e15f6e694b39', '2025-09-01', '2025-09-30', 'monthly', 300000, 15, 5, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('ce994e05-5ce2-47a5-9628-19b4278289c5', '2025-09-01', '2025-09-30', 'monthly', 250000, 12, 4, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('aeb5c994-39f4-4d01-8f02-f36b1fc20613', '2025-09-01', '2025-09-30', 'monthly', 200000, 10, 3, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('163ed7f0-2d54-4fbe-83d2-6a1a081eee14', '2025-09-01', '2025-09-30', 'monthly', 180000, 8, 3, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('a95beec2-5a30-433e-b2be-b99717ad65b2', '2025-09-01', '2025-09-30', 'monthly', 150000, 7, 2, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('a43ca092-2beb-4778-96d5-a192cedea2b7', '2025-09-01', '2025-09-30', 'monthly', 220000, 11, 4, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),

-- August 2025 targets
('5598ae6f-f310-49ef-8a86-e15f6e694b39', '2025-08-01', '2025-08-31', 'monthly', 280000, 14, 5, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('ce994e05-5ce2-47a5-9628-19b4278289c5', '2025-08-01', '2025-08-31', 'monthly', 230000, 11, 4, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('aeb5c994-39f4-4d01-8f02-f36b1fc20613', '2025-08-01', '2025-08-31', 'monthly', 190000, 9, 3, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('163ed7f0-2d54-4fbe-83d2-6a1a081eee14', '2025-08-01', '2025-08-31', 'monthly', 170000, 8, 3, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('a95beec2-5a30-433e-b2be-b99717ad65b2', '2025-08-01', '2025-08-31', 'monthly', 140000, 6, 2, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('a43ca092-2beb-4778-96d5-a192cedea2b7', '2025-08-01', '2025-08-31', 'monthly', 200000, 10, 4, '5598ae6f-f310-49ef-8a86-e15f6e694b39');

-- Add customer assignments for existing customers to sales reps
-- This will help track customer acquisition and retention
INSERT INTO public.customer_assignments (
  customer_id,
  sales_rep_id,
  assigned_date,
  assigned_by
)
SELECT 
  c.id as customer_id,
  -- Assign customers to sales reps based on order history or randomly
  CASE 
    WHEN so.sales_representative_id IS NOT NULL THEN so.sales_representative_id
    ELSE (ARRAY['5598ae6f-f310-49ef-8a86-e15f6e694b39', 'ce994e05-5ce2-47a5-9628-19b4278289c5', 'aeb5c994-39f4-4d01-8f02-f36b1fc20613'])[1 + (ABS(HASHTEXT(c.id::text)) % 3)]
  END as sales_rep_id,
  COALESCE(c.created_at::date, CURRENT_DATE - INTERVAL '30 days') as assigned_date,
  '5598ae6f-f310-49ef-8a86-e15f6e694b39' as assigned_by -- Admin user
FROM customers c
LEFT JOIN (
  SELECT DISTINCT customer_id, sales_representative_id
  FROM sales_orders 
  WHERE sales_representative_id IS NOT NULL
) so ON c.id = so.customer_id
WHERE NOT EXISTS (
  SELECT 1 FROM customer_assignments ca 
  WHERE ca.customer_id = c.id AND ca.is_active = true
)
LIMIT 50; -- Limit to avoid too many inserts

-- Update customers table to have assigned_sales_rep_id field populated
UPDATE customers 
SET assigned_sales_rep_id = ca.sales_rep_id
FROM customer_assignments ca
WHERE customers.id = ca.customer_id 
  AND ca.is_active = true 
  AND customers.assigned_sales_rep_id IS NULL;

-- Add some sample customer complaints for testing
INSERT INTO public.customer_complaints (
  customer_id,
  sales_rep_id,
  complaint_type,
  subject,
  description,
  priority,
  status,
  created_by
)
SELECT 
  c.id,
  ca.sales_rep_id,
  (ARRAY['product', 'service', 'delivery', 'billing'])[1 + (ABS(HASHTEXT(c.id::text)) % 4)] as complaint_type,
  'Sample complaint about ' || c.name,
  'This is a sample complaint for testing the performance dashboard.',
  (ARRAY['low', 'medium', 'high'])[1 + (ABS(HASHTEXT(c.id::text)) % 3)] as priority,
  (ARRAY['open', 'in_progress', 'resolved'])[1 + (ABS(HASHTEXT(c.id::text)) % 3)] as status,
  ca.sales_rep_id
FROM customers c
JOIN customer_assignments ca ON c.id = ca.customer_id AND ca.is_active = true
LIMIT 10; -- Add just a few sample complaints

-- Update achievement_revenue in sales_targets based on actual sales
UPDATE sales_targets st
SET achievement_revenue = COALESCE(actual_revenue.total, 0)
FROM (
  SELECT 
    so.sales_representative_id,
    DATE_TRUNC('month', so.created_at)::date as month_start,
    SUM(so.final_price) as total
  FROM sales_orders so
  WHERE so.sales_representative_id IS NOT NULL
    AND so.final_price IS NOT NULL
  GROUP BY so.sales_representative_id, DATE_TRUNC('month', so.created_at)::date
) actual_revenue
WHERE st.sales_rep_id = actual_revenue.sales_representative_id
  AND st.target_period_start = actual_revenue.month_start
  AND st.target_type = 'monthly';

-- Create quarterly targets for Q3 2025
INSERT INTO public.sales_targets (
  sales_rep_id, 
  target_period_start, 
  target_period_end, 
  target_type, 
  revenue_target, 
  orders_target, 
  customers_target,
  created_by
) VALUES 
('5598ae6f-f310-49ef-8a86-e15f6e694b39', '2025-07-01', '2025-09-30', 'quarterly', 850000, 42, 15, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('ce994e05-5ce2-47a5-9628-19b4278289c5', '2025-07-01', '2025-09-30', 'quarterly', 720000, 36, 12, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('aeb5c994-39f4-4d01-8f02-f36b1fc20613', '2025-07-01', '2025-09-30', 'quarterly', 600000, 30, 9, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('163ed7f0-2d54-4fbe-83d2-6a1a081eee14', '2025-07-01', '2025-09-30', 'quarterly', 530000, 26, 9, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('a95beec2-5a30-433e-b2be-b99717ad65b2', '2025-07-01', '2025-09-30', 'quarterly', 440000, 21, 6, '5598ae6f-f310-49ef-8a86-e15f6e694b39'),
('a43ca092-2beb-4778-96d5-a192cedea2b7', '2025-07-01', '2025-09-30', 'quarterly', 660000, 33, 12, '5598ae6f-f310-49ef-8a86-e15f6e694b39');
