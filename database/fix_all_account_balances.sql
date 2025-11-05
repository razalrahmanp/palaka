-- Reset all bank account balances based on November 2025 transactions only
-- This fixes the issue where old balances are showing after deleting old transactions

BEGIN;

-- Step 1: Recalculate running balance for ALL bank transactions (November 2025 only)
WITH ranked_transactions AS (
  SELECT 
    bt.id,
    bt.bank_account_id,
    bt.date,
    bt.type,
    bt.amount,
    ROW_NUMBER() OVER (
      PARTITION BY bt.bank_account_id 
      ORDER BY bt.date ASC, bt.created_at ASC
    ) as rn
  FROM bank_transactions bt
  WHERE bt.date >= '2025-11-01'  -- Only November 2025 transactions
),
running_balance AS (
  SELECT 
    id,
    bank_account_id,
    date,
    type,
    amount,
    SUM(
      CASE 
        WHEN type = 'deposit' THEN amount 
        ELSE -amount 
      END
    ) OVER (
      PARTITION BY bank_account_id 
      ORDER BY date ASC, rn ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as calculated_balance
  FROM ranked_transactions
)
UPDATE bank_transactions bt
SET balance = rb.calculated_balance
FROM running_balance rb
WHERE bt.id = rb.id;

-- Step 2: Update bank_accounts.current_balance to match the latest transaction balance
UPDATE bank_accounts ba
SET current_balance = COALESCE(
  (
    SELECT bt.balance
    FROM bank_transactions bt
    WHERE bt.bank_account_id = ba.id
      AND bt.date >= '2025-11-01'  -- Only November transactions
    ORDER BY bt.date DESC, bt.created_at DESC
    LIMIT 1
  ),
  0  -- If no transactions, set to 0
);

-- Step 3: Verification - Show all account balances
SELECT 
    ba.name,
    ba.account_number,
    ba.account_type,
    COUNT(bt.id) as nov_transaction_count,
    COALESCE(SUM(CASE WHEN bt.type = 'deposit' THEN bt.amount ELSE 0 END), 0) as total_deposits,
    COALESCE(SUM(CASE WHEN bt.type = 'withdrawal' THEN bt.amount ELSE 0 END), 0) as total_withdrawals,
    COALESCE(SUM(CASE WHEN bt.type = 'deposit' THEN bt.amount ELSE -bt.amount END), 0) as calculated_balance,
    ba.current_balance as stored_balance,
    CASE 
        WHEN ba.current_balance = COALESCE(SUM(CASE WHEN bt.type = 'deposit' THEN bt.amount ELSE -bt.amount END), 0) 
        THEN '✅ Match' 
        ELSE '❌ Mismatch' 
    END as balance_check
FROM bank_accounts ba
LEFT JOIN bank_transactions bt ON bt.bank_account_id = ba.id 
    AND bt.date >= '2025-11-01'
WHERE ba.is_active = true
GROUP BY ba.id, ba.name, ba.account_number, ba.account_type, ba.current_balance
ORDER BY ba.name;

COMMIT;

-- Additional verification: Show individual account details
SELECT 
    'Shahid Cash / Bank' as account,
    ba.current_balance,
    COUNT(bt.id) as transaction_count
FROM bank_accounts ba
LEFT JOIN bank_transactions bt ON bt.bank_account_id = ba.id 
    AND bt.date >= '2025-11-01'
WHERE ba.name ILIKE '%shahid%'
GROUP BY ba.name, ba.current_balance;
