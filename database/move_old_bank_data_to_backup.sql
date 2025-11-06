
-- Step 3D: Delete old records that are now in backup (run after all backed up)
-- Ultra-small batch version - delete 10 at a time to avoid timeout
DELETE FROM bank_transactions
WHERE id IN (
    SELECT id 
    FROM bank_transactions
    WHERE date < '2025-11-01'
    LIMIT 10
);

-- Step 3E: Check remaining to delete
SELECT 
    COUNT(*) as remaining_to_delete
FROM bank_transactions
WHERE date < '2025-11-01';

-- Repeat Step 3D until Step 3E shows 0

-- Step 4: Verify results
SELECT 
    'Main Table (bank_transactions)' as table_name,
    COUNT(*) as total_records,
    MIN(date) as oldest_date,
    MAX(date) as newest_date,
    TO_CHAR(MIN(date), 'YYYY-MM') as oldest_month,
    TO_CHAR(MAX(date), 'YYYY-MM') as newest_month
FROM bank_transactions
UNION ALL
SELECT 
    'Backup Table (bank_transactions_backup)' as table_name,
    COUNT(*) as total_records,
    MIN(date) as oldest_date,
    MAX(date) as newest_date,
    TO_CHAR(MIN(date), 'YYYY-MM') as oldest_month,
    TO_CHAR(MAX(date), 'YYYY-MM') as newest_month
FROM bank_transactions_backup;

-- Step 5: View backed up data
SELECT 
    TO_CHAR(date, 'YYYY-MM') as month,
    COUNT(*) as records,
    SUM(amount) as total_amount
FROM bank_transactions_backup
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY month DESC;
