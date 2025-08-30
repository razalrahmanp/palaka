-- Quick fix: Add missing Bajaj Finance columns to database tables
-- Run this in your PostgreSQL database

-- Add missing columns to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_rate DECIMAL(5,2) DEFAULT 8.00,
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_convenience_charges DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_total_customer_payment DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_merchant_receivable DECIMAL(12,2) DEFAULT 0;

-- Add missing columns to sales_orders table  
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_rate DECIMAL(5,2) DEFAULT 8.00,
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_convenience_charges DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_total_customer_payment DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_merchant_receivable DECIMAL(12,2) DEFAULT 0;

-- Verify the columns were added
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
