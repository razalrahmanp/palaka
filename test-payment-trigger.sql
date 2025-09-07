-- Test script to verify payment trigger functionality
-- This will help us understand why automatic journal entries aren't being created

-- First, let's check if we have the required accounts
SELECT 
    'Required Accounts Check' as check_type,
    account_code,
    account_name,
    id
FROM chart_of_accounts 
WHERE account_code IN ('1001', '1010', '1200', '1100')
ORDER BY account_code;

-- Check if payment trigger exists and is enabled
SELECT 
    'Payment Trigger Status' as check_type,
    t.trigger_name,
    t.event_object_table as table_name,
    t.action_statement as function_call,
    t.event_manipulation as event
FROM information_schema.triggers t
WHERE t.trigger_name = 'trg_payments_create_journal'
   AND t.trigger_schema = 'public';

-- Alternative trigger check using pg_trigger
SELECT 
    'Detailed Trigger Info' as check_type,
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgenabled as enabled_status,
    pg_get_functiondef(tgfoid) as function_definition
FROM pg_trigger 
WHERE tgname = 'trg_payments_create_journal';

-- Check recent payments to see if any journal entries were created
SELECT 
    'Recent Payments & Journal Entries' as check_type,
    p.id as payment_id,
    p.amount,
    p.payment_date,
    p.created_at as payment_created,
    je.id as journal_entry_id,
    je.journal_number,
    je.description,
    je.total_debit,
    je.total_credit,
    je.status
FROM payments p
LEFT JOIN journal_entries je ON je.reference_number = 'PAY-' || p.id::text
ORDER BY p.created_at DESC
LIMIT 10;

-- Test creating a small payment to see if trigger fires
-- Let's run this test to see what happens
INSERT INTO payments (
    amount,
    payment_date,
    method,
    reference,
    description
) VALUES (
    1.00,
    CURRENT_DATE,
    'CASH',
    'TEST-PAYMENT-' || EXTRACT(EPOCH FROM NOW()),
    'Test payment to verify trigger functionality'
);

-- Check if journal entry was created for our test payment
SELECT 
    'Test Payment Result' as check_type,
    p.id as payment_id,
    p.amount,
    p.reference,
    je.id as journal_entry_id,
    je.journal_number,
    je.description
FROM payments p
LEFT JOIN journal_entries je ON je.reference_number = 'PAY-' || p.id::text
WHERE p.reference LIKE 'TEST-PAYMENT-%'
ORDER BY p.created_at DESC
LIMIT 1;
