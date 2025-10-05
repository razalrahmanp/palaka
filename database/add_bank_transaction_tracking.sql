-- Add source tracking to bank_transactions table
-- This will help distinguish between different types of transactions

-- Add source_type to track where the transaction originated
ALTER TABLE public.bank_transactions 
ADD COLUMN IF NOT EXISTS source_type text CHECK (source_type = ANY (ARRAY[
  'expense'::text, 
  'vendor_payment'::text, 
  'withdrawal'::text, 
  'liability_payment'::text, 
  'sales_payment'::text, 
  'manual'::text,
  'transfer'::text
]));

-- Add payment_method to track the actual payment method
ALTER TABLE public.bank_transactions 
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method = ANY (ARRAY[
  'cash'::text, 
  'bank_transfer'::text, 
  'card'::text, 
  'cheque'::text, 
  'upi'::text, 
  'online'::text
]));

-- Add source_id to reference the original record (expense_id, vendor_payment_id, etc.)
ALTER TABLE public.bank_transactions 
ADD COLUMN IF NOT EXISTS source_id uuid;

-- Create index for better performance when querying by source
CREATE INDEX IF NOT EXISTS idx_bank_transactions_source_type ON public.bank_transactions(source_type);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_source_id ON public.bank_transactions(source_id);

-- Update existing records to set source_type based on description patterns
UPDATE public.bank_transactions 
SET source_type = CASE 
  WHEN description ILIKE '%Expense:%' THEN 'expense'
  WHEN description ILIKE '%Vendor Payment%' THEN 'vendor_payment'
  WHEN description ILIKE '%Withdrawal%' OR description ILIKE '%Owner%' THEN 'withdrawal'
  WHEN description ILIKE '%Loan Payment%' OR description ILIKE '%Liability%' THEN 'liability_payment'
  WHEN description ILIKE '%Payment received%' THEN 'sales_payment'
  ELSE 'manual'
END
WHERE source_type IS NULL;

-- Set default payment_method to bank_transfer for existing records
UPDATE public.bank_transactions 
SET payment_method = 'bank_transfer'
WHERE payment_method IS NULL;