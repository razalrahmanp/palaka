-- Query to check existing sales orders and their payment status
-- This will help us understand what data is available for testing

-- 1. Sales orders with their payment status
SELECT 
    so.id,
    so.customer_id,
    c.name as customer_name,
    so.final_price,
    so.is_invoiced,
    i.id as invoice_id,
    i.total as invoice_total,
    i.paid_amount,
    i.status as invoice_status
FROM sales_orders so
LEFT JOIN customers c ON so.customer_id = c.id
LEFT JOIN invoices i ON so.id = i.sales_order_id
WHERE so.final_price > 0
ORDER BY so.id DESC
LIMIT 10;

-- 2. Recent payments
SELECT 
    p.id,
    p.invoice_id,
    p.amount,
    p.method,
    p.date,
    p.reference,
    i.sales_order_id
FROM payments p
LEFT JOIN invoices i ON p.invoice_id = i.id
ORDER BY p.date DESC
LIMIT 5;

-- 3. Check if required chart of accounts exist
SELECT 'Chart of Accounts Check:' as info;
SELECT account_code, account_name, account_type, current_balance 
FROM chart_of_accounts 
WHERE account_code IN ('1010', '1200', '4000')
ORDER BY account_code;
