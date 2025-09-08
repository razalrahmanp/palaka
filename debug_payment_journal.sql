-- Test script to check chart of accounts and create a test payment journal entry
-- Run this to debug journal entry creation

-- 1. Check if required accounts exist
SELECT 'Required Accounts Check:' as check_type;
SELECT account_code, account_name, account_type, current_balance 
FROM chart_of_accounts 
WHERE account_code IN ('1010', '1200') 
ORDER BY account_code;

-- 2. Check if we have any sales orders with invoices
SELECT 'Sales Orders with Invoices:' as check_type;
SELECT so.id as order_id, so.final_price, i.id as invoice_id, i.total, i.paid_amount
FROM sales_orders so
LEFT JOIN invoices i ON so.id = i.sales_order_id
WHERE so.final_price > 0
ORDER BY so.id DESC
LIMIT 5;

-- 3. Check existing payments and their journal entries
SELECT 'Recent Payments and Journal Entries:' as check_type;
SELECT 
    p.id as payment_id,
    p.amount,
    p.method,
    p.date,
    je.id as journal_entry_id,
    je.journal_number,
    je.description,
    je.status
FROM payments p
LEFT JOIN journal_entries je ON je.source_document_id = p.id::text AND je.source_document_type = 'PAYMENT'
ORDER BY p.date DESC
LIMIT 5;

-- 4. Check journal entry lines for recent payment journal entries
SELECT 'Journal Entry Lines:' as check_type;
SELECT 
    jel.journal_entry_id,
    coa.account_code,
    coa.account_name,
    jel.debit_amount,
    jel.credit_amount,
    jel.description
FROM journal_entry_lines jel
JOIN chart_of_accounts coa ON jel.account_id = coa.id
JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE je.source_document_type = 'PAYMENT'
ORDER BY jel.journal_entry_id DESC, jel.line_number
LIMIT 10;
