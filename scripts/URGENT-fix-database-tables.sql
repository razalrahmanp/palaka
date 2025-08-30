-- URGENT: Run this script to fix the database tables for Bajaj Finance

-- 1. Add missing columns to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_rate DECIMAL(5,2) DEFAULT 8.00,
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_convenience_charges DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_total_customer_payment DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_merchant_receivable DECIMAL(12,2) DEFAULT 0;

-- 2. Add missing columns to sales_orders table  
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_rate DECIMAL(5,2) DEFAULT 8.00,
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_convenience_charges DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_total_customer_payment DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_merchant_receivable DECIMAL(12,2) DEFAULT 0;

-- 3. Verify the columns were added successfully
\echo 'Checking sales_orders table...'
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales_orders' 
  AND column_name LIKE 'bajaj%'
ORDER BY column_name;

\echo 'Checking quotes table...'
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
  AND column_name LIKE 'bajaj%'
ORDER BY column_name;

-- 4. Show current row count to verify tables exist
\echo 'Current table status...'
SELECT 'sales_orders' as table_name, COUNT(*) as row_count FROM sales_orders
UNION ALL
SELECT 'quotes' as table_name, COUNT(*) as row_count FROM quotes;

\echo 'Database update completed! You can now test the billing system.'
