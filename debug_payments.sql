-- Debug query to check the payments table structure and sample data
-- Run this in Supabase SQL Editor to understand the payments table

-- Check table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check sample payment data
SELECT * FROM payments 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for any payments with customer references
SELECT id, payment_date, amount, payment_method, reference_number, notes, 
       customer_id, sales_order_id, invoice_id
FROM payments 
WHERE customer_id IS NOT NULL 
   OR sales_order_id IS NOT NULL 
   OR invoice_id IS NOT NULL
   OR notes ILIKE '%customer%'
ORDER BY payment_date DESC 
LIMIT 10;

-- Check sales_orders for the specific customer
SELECT id, customer_id, created_at, final_price, status, notes
FROM sales_orders 
WHERE customer_id = 'SHOUKATHALI T V' -- Replace with actual customer ID
ORDER BY created_at DESC;
