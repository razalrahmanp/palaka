-- ========================================
-- ALTER bank_transactions.source_record_id TO TEXT
-- ========================================
-- Change source_record_id from UUID to TEXT to support different source types
-- (investments.id is INTEGER, payments.id is UUID, etc.)

-- Run this in your Supabase SQL Editor

BEGIN;

-- Step 1: Alter the column type from UUID to TEXT
ALTER TABLE public.bank_transactions 
ALTER COLUMN source_record_id TYPE text USING source_record_id::text;

-- Step 2: Also update backup table if it exists
ALTER TABLE public.bank_transactions_backup 
ALTER COLUMN source_record_id TYPE text USING source_record_id::text;

COMMIT;

-- Verify the change
SELECT 
    column_name, 
    data_type,
    character_maximum_length
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'bank_transactions'
    AND column_name = 'source_record_id';

-- Should show data_type = 'text'
