-- Quick test script to check existing data and trigger status
-- Run this in Supabase SQL Editor to see what data we have

-- Check if we have sales orders
SELECT 'Sales Orders Count' as table_name, COUNT(*) as count FROM sales_orders
UNION ALL
-- Check if we have payments
SELECT 'Payments Count' as table_name, COUNT(*) as count FROM payments
UNION ALL
-- Check if we have invoices
SELECT 'Invoices Count' as table_name, COUNT(*) as count FROM invoices
UNION ALL
-- Check journal entries
SELECT 'Journal Entries Count' as table_name, COUNT(*) as count FROM journal_entries
UNION ALL
-- Check journal entry lines
SELECT 'Journal Entry Lines Count' as table_name, COUNT(*) as count FROM journal_entry_lines;

-- Check what triggers are currently active
SELECT 
    trigger_name, 
    event_object_table, 
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%journal%' 
   OR trigger_name LIKE 'trg_%'
ORDER BY event_object_table, trigger_name;

-- Sample some recent sales orders to see structure
SELECT 
    id,
    customer_name,
    total_price,
    final_price,
    created_at
FROM sales_orders 
ORDER BY created_at DESC 
LIMIT 5;

-- Sample some recent payments to see structure
SELECT 
    id,
    amount,
    payment_date,
    sales_order_id,
    invoice_id,
    created_at
FROM payments 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if we have the required chart of accounts
SELECT 
    account_code,
    account_name,
    account_type
FROM chart_of_accounts 
WHERE account_code IN ('1001', '1010', '1200', '1100', '4010', '4000', '2010', '2000', '1300', '1350')
ORDER BY account_code;
