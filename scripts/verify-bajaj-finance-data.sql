-- Verification Queries for Bajaj Finance Integration
-- Run these in your Supabase SQL Editor or PostgreSQL client

-- 1. Check if all required columns exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales_orders' 
  AND column_name LIKE 'bajaj%'
ORDER BY column_name;

SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
  AND column_name LIKE 'bajaj%'
ORDER BY column_name;

-- 2. Check latest sales order with Bajaj Finance data
SELECT 
  id,
  customer_id,
  original_price,
  final_price,
  discount_amount,
  emi_enabled,
  bajaj_finance_amount,
  bajaj_processing_fee_rate,
  bajaj_processing_fee_amount,
  bajaj_convenience_charges,
  bajaj_total_customer_payment,
  bajaj_merchant_receivable,
  created_at
FROM sales_orders 
WHERE emi_enabled = true 
ORDER BY created_at DESC 
LIMIT 3;

-- 3. Check latest quote with Bajaj Finance data
SELECT 
  id,
  customer_id,
  original_price,
  final_price,
  discount_amount,
  emi_enabled,
  bajaj_finance_amount,
  bajaj_processing_fee_rate,
  bajaj_processing_fee_amount,
  bajaj_convenience_charges,
  bajaj_total_customer_payment,
  bajaj_merchant_receivable,
  created_at
FROM quotes 
WHERE emi_enabled = true 
ORDER BY created_at DESC 
LIMIT 3;

-- 4. Test data verification - Check for consistent calculations
SELECT 
  id,
  final_price,
  bajaj_finance_amount,
  bajaj_convenience_charges,
  bajaj_processing_fee_amount,
  bajaj_total_customer_payment,
  -- Verify calculations
  (final_price + bajaj_convenience_charges) as expected_bajaj_finance_amount,
  (final_price + bajaj_convenience_charges + bajaj_processing_fee_amount) as expected_total_customer_payment
FROM sales_orders 
WHERE emi_enabled = true 
  AND created_at >= CURRENT_DATE
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Check for any NULL values in required fields
SELECT 
  id,
  CASE WHEN bajaj_processing_fee_rate IS NULL THEN 'Missing processing fee rate' END as issue1,
  CASE WHEN bajaj_processing_fee_amount IS NULL THEN 'Missing processing fee amount' END as issue2,
  CASE WHEN bajaj_convenience_charges IS NULL THEN 'Missing convenience charges' END as issue3,
  CASE WHEN bajaj_total_customer_payment IS NULL THEN 'Missing total customer payment' END as issue4,
  CASE WHEN bajaj_merchant_receivable IS NULL THEN 'Missing merchant receivable' END as issue5
FROM sales_orders 
WHERE emi_enabled = true 
  AND (
    bajaj_processing_fee_rate IS NULL OR
    bajaj_processing_fee_amount IS NULL OR
    bajaj_convenience_charges IS NULL OR
    bajaj_total_customer_payment IS NULL OR
    bajaj_merchant_receivable IS NULL
  )
ORDER BY created_at DESC;

-- 6. Summary report of today's Bajaj Finance orders
SELECT 
  COUNT(*) as total_bajaj_orders,
  SUM(final_price) as total_order_value,
  SUM(bajaj_convenience_charges) as total_card_fees_collected,
  SUM(bajaj_processing_fee_amount) as total_processing_fees,
  SUM(bajaj_total_customer_payment) as total_customer_payments,
  AVG(bajaj_convenience_charges) as avg_card_fee,
  COUNT(CASE WHEN bajaj_convenience_charges > 0 THEN 1 END) as new_customer_orders,
  COUNT(CASE WHEN bajaj_convenience_charges = 0 THEN 1 END) as existing_customer_orders
FROM sales_orders 
WHERE emi_enabled = true 
  AND created_at >= CURRENT_DATE;
