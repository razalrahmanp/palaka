-- Comprehensive trigger diagnosis script
-- Let's find out exactly why the payment trigger isn't working

-- 1. Check if the trigger actually exists in the database
SELECT 
    'Trigger Existence Check' as check_type,
    COUNT(*) as trigger_count,
    STRING_AGG(trigger_name, ', ') as found_triggers
FROM information_schema.triggers 
WHERE trigger_name LIKE '%payment%' 
   OR trigger_name LIKE '%journal%'
   AND trigger_schema = 'public';

-- 2. Check ALL triggers on the payments table
SELECT 
    'All Payment Table Triggers' as check_type,
    t.trigger_name,
    t.event_manipulation as event,
    t.action_statement as function_call,
    t.action_timing as timing
FROM information_schema.triggers t
WHERE t.event_object_table = 'payments'
   AND t.trigger_schema = 'public';

-- 3. Check if the trigger function exists
SELECT 
    'Trigger Function Check' as check_type,
    p.proname as function_name,
    p.prosrc as function_source_snippet
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname LIKE '%payment%journal%';

-- 4. Look for any triggers containing 'payment' or 'journal'
SELECT 
    'Related Triggers Search' as check_type,
    t.trigger_name,
    t.event_object_table as table_name,
    t.event_manipulation as event,
    t.action_statement
FROM information_schema.triggers t
WHERE (t.action_statement ILIKE '%payment%' OR t.action_statement ILIKE '%journal%')
   AND t.trigger_schema = 'public';

-- 5. Check if required accounts exist (this might be blocking the trigger)
SELECT 
    'Required Accounts Status' as check_type,
    CASE 
        WHEN COUNT(*) = 0 THEN 'NO ACCOUNTS FOUND - THIS IS THE PROBLEM!'
        ELSE 'Accounts exist: ' || STRING_AGG(account_code || ' (' || account_name || ')', ', ')
    END as account_status
FROM chart_of_accounts 
WHERE account_code IN ('1001', '1010', '1200', '1100');

-- 6. Let's see what accounts we DO have that might work
SELECT 
    'Available Cash Accounts' as check_type,
    account_code,
    account_name,
    account_type
FROM chart_of_accounts 
WHERE account_name ILIKE '%cash%' 
   OR account_name ILIKE '%bank%'
   OR account_code LIKE '1%'
ORDER BY account_code;

-- 7. Check for Accounts Receivable type accounts
SELECT 
    'Available AR Accounts' as check_type,
    account_code,
    account_name,
    account_type
FROM chart_of_accounts 
WHERE account_name ILIKE '%receivable%' 
   OR account_name ILIKE '%debtor%'
   OR account_code LIKE '12%'
ORDER BY account_code;
