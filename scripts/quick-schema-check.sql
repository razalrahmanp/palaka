-- Quick Schema Check - Run this first to verify table structure
-- Run in Supabase SQL Editor

-- Check sales_orders table columns - FOCUS ON BAJAJ FIELDS
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales_orders' 
  AND table_schema = 'public'
  AND (column_name LIKE '%bajaj%' OR column_name IN ('final_price', 'original_price', 'emi_enabled'))
ORDER BY column_name;

-- Check quotes table columns - FOCUS ON BAJAJ FIELDS
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
  AND table_schema = 'public'
  AND (column_name LIKE '%bajaj%' OR column_name IN ('final_price', 'original_price', 'emi_enabled'))
ORDER BY column_name;

-- Quick test - any EMI orders exist?
SELECT COUNT(*) as emi_orders_count 
FROM sales_orders 
WHERE emi_enabled = true;

-- Test data insertion capability - try to insert a test record (will rollback)
BEGIN;
INSERT INTO sales_orders (
  customer_id,
  final_price,
  original_price,
  emi_enabled,
  bajaj_convenience_charges,
  bajaj_processing_fee_amount,
  bajaj_processing_fee_rate,
  bajaj_total_customer_payment,
  bajaj_merchant_receivable
) VALUES (
  (SELECT id FROM customers LIMIT 1), -- Use first customer
  25000.00,
  27000.00,
  true,
  530.00,
  2000.00,
  8.00,
  27530.00,
  25000.00
);
SELECT 'Test insert successful - all Bajaj Finance columns working' as result;
ROLLBACK;

-- Sample of recent orders (last 5)
SELECT 
  id, 
  customer_id, 
  final_price, 
  emi_enabled,
  bajaj_convenience_charges,
  created_at
FROM sales_orders 
ORDER BY created_at DESC 
LIMIT 5;
