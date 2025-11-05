-- Recalculate balance column for all bank transactions
-- This will compute running balances for each bank account based on date order

-- Step 1: Check current state before recalculation
SELECT 
    bank_account_id,
    COUNT(*) as transaction_count,
    MIN(date) as first_transaction,
    MAX(date) as last_transaction,
    MIN(balance) as min_balance,
    MAX(balance) as max_balance
FROM bank_transactions
GROUP BY bank_account_id
ORDER BY bank_account_id;

-- Step 2: Recalculate balances for all transactions
-- This uses a window function to calculate running balance per bank account
-- Assumes the first transaction starts from 0 and builds up from there
WITH ranked_transactions AS (
    SELECT 
        id,
        bank_account_id,
        date,
        type,
        amount,
        ROW_NUMBER() OVER (PARTITION BY bank_account_id ORDER BY date, id) as rn
    FROM bank_transactions
),
calculated_balances AS (
    SELECT 
        rt.id,
        rt.bank_account_id,
        rt.date,
        rt.type,
        rt.amount,
        SUM(
            CASE 
                WHEN rt.type IN ('deposit', 'credit', 'CREDIT') THEN rt.amount
                ELSE -rt.amount
            END
        ) OVER (
            PARTITION BY rt.bank_account_id 
            ORDER BY rt.date, rt.rn
        ) as new_balance
    FROM ranked_transactions rt
)
UPDATE bank_transactions bt
SET balance = cb.new_balance
FROM calculated_balances cb
WHERE bt.id = cb.id;

-- Step 3: Verify the recalculation
SELECT 
    bank_account_id,
    COUNT(*) as transaction_count,
    MIN(date) as first_transaction,
    MAX(date) as last_transaction,
    MIN(balance) as min_balance,
    MAX(balance) as max_balance
FROM bank_transactions
GROUP BY bank_account_id
ORDER BY bank_account_id;

-- Step 4: Check a sample of transactions to verify correctness
SELECT 
    bt.date,
    ba.name as bank_account_name,
    bt.type,
    bt.amount,
    bt.balance,
    bt.description
FROM bank_transactions bt
LEFT JOIN bank_accounts ba ON ba.id = bt.bank_account_id
ORDER BY ba.name, bt.date
LIMIT 20;

-- Step 5: Update bank_accounts current_balance to match the latest transaction balance
UPDATE bank_accounts ba
SET current_balance = (
    SELECT balance
    FROM bank_transactions bt
    WHERE bt.bank_account_id = ba.id
    ORDER BY bt.date DESC, bt.id DESC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM bank_transactions bt WHERE bt.bank_account_id = ba.id
);

-- Step 6: Verify bank_accounts balances match
SELECT 
    ba.name,
    ba.current_balance,
    (SELECT balance 
     FROM bank_transactions bt 
     WHERE bt.bank_account_id = ba.id 
     ORDER BY bt.date DESC, bt.id DESC 
     LIMIT 1) as last_transaction_balance,
    (SELECT COUNT(*) 
     FROM bank_transactions bt 
     WHERE bt.bank_account_id = ba.id) as transaction_count
FROM bank_accounts ba
WHERE ba.account_type IN ('BANK', 'UPI')
ORDER BY ba.name;
