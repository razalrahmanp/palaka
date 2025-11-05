-- Force refresh check - verify current data in database
-- Run this to confirm what's actually in the database now

SELECT 
    COUNT(*) as total_transactions,
    MIN(date) as oldest_date,
    MAX(date) as newest_date,
    TO_CHAR(MIN(date), 'YYYY-MM') as oldest_month,
    TO_CHAR(MAX(date), 'YYYY-MM') as newest_month
FROM bank_transactions;

-- Show all transactions by month
SELECT 
    TO_CHAR(date, 'YYYY-MM') as month,
    COUNT(*) as count
FROM bank_transactions
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY month DESC;

-- Show transactions for HDFC specifically
SELECT 
    ba.name as bank_name,
    COUNT(bt.id) as transaction_count,
    MIN(bt.date) as oldest_transaction,
    MAX(bt.date) as newest_transaction
FROM bank_transactions bt
JOIN bank_accounts ba ON ba.id = bt.bank_account_id
WHERE ba.name ILIKE '%HDFC%'
GROUP BY ba.name;
