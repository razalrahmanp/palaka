-- Add columns to track Bajaj Finance additional charges
-- These charges are collected by Bajaj Finance directly from customer

-- Add columns to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_rate DECIMAL(5,2) DEFAULT 8.00, -- 8% processing fee
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_convenience_charges DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_total_customer_payment DECIMAL(12,2) DEFAULT 0, -- Total amount customer pays to Bajaj
ADD COLUMN IF NOT EXISTS bajaj_merchant_receivable DECIMAL(12,2) DEFAULT 0; -- Amount merchant receives from Bajaj

-- Add columns to sales_orders table  
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_rate DECIMAL(5,2) DEFAULT 8.00, -- 8% processing fee
ADD COLUMN IF NOT EXISTS bajaj_processing_fee_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_convenience_charges DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bajaj_total_customer_payment DECIMAL(12,2) DEFAULT 0, -- Total amount customer pays to Bajaj
ADD COLUMN IF NOT EXISTS bajaj_merchant_receivable DECIMAL(12,2) DEFAULT 0; -- Amount merchant receives from Bajaj

-- Add comments to explain the fields
COMMENT ON COLUMN public.quotes.bajaj_processing_fee_rate IS 'Processing fee percentage charged by Bajaj Finance (usually 8%)';
COMMENT ON COLUMN public.quotes.bajaj_processing_fee_amount IS 'Calculated processing fee amount (bill_amount * processing_fee_rate / 100)';
COMMENT ON COLUMN public.quotes.bajaj_convenience_charges IS 'Additional convenience charges by Bajaj Finance';
COMMENT ON COLUMN public.quotes.bajaj_total_customer_payment IS 'Total amount customer pays to Bajaj Finance (bill + processing fee + convenience charges)';
COMMENT ON COLUMN public.quotes.bajaj_merchant_receivable IS 'Amount merchant receives from Bajaj Finance (usually same as bill amount)';

COMMENT ON COLUMN public.sales_orders.bajaj_processing_fee_rate IS 'Processing fee percentage charged by Bajaj Finance (usually 8%)';
COMMENT ON COLUMN public.sales_orders.bajaj_processing_fee_amount IS 'Calculated processing fee amount (bill_amount * processing_fee_rate / 100)';
COMMENT ON COLUMN public.sales_orders.bajaj_convenience_charges IS 'Additional convenience charges by Bajaj Finance';
COMMENT ON COLUMN public.sales_orders.bajaj_total_customer_payment IS 'Total amount customer pays to Bajaj Finance (bill + processing fee + convenience charges)';
COMMENT ON COLUMN public.sales_orders.bajaj_merchant_receivable IS 'Amount merchant receives from Bajaj Finance (usually same as bill amount)';

-- Create a function to calculate Bajaj Finance charges
CREATE OR REPLACE FUNCTION calculate_bajaj_finance_charges(
    bill_amount DECIMAL(12,2),
    processing_fee_rate DECIMAL(5,2) DEFAULT 8.00,
    convenience_charges DECIMAL(12,2) DEFAULT 0
) RETURNS TABLE (
    processing_fee_amount DECIMAL(12,2),
    total_customer_payment DECIMAL(12,2),
    merchant_receivable DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY SELECT
        ROUND((bill_amount * processing_fee_rate / 100), 2) as processing_fee_amount,
        ROUND((bill_amount + (bill_amount * processing_fee_rate / 100) + convenience_charges), 2) as total_customer_payment,
        bill_amount as merchant_receivable; -- Merchant gets the original bill amount
END;
$$ LANGUAGE plpgsql;

-- Example usage:
-- SELECT * FROM calculate_bajaj_finance_charges(10000.00, 8.00, 200.00);
-- This will return:
-- processing_fee_amount: 800.00
-- total_customer_payment: 11000.00 (10000 + 800 + 200)
-- merchant_receivable: 10000.00
