-- Fix bank account balances after mass deletion
-- The trigger works incrementally, so we need to reset and recalculate

BEGIN;

-- ============================================================================
-- Step 1: Reset ALL bank account balances to 0
-- This clears out the old balance that was affected by deleted transactions
-- ============================================================================
UPDATE bank_accounts
SET current_balance = 0,
    updated_at = NOW()
WHERE is_active = true;

-- ============================================================================
-- Step 2: Recalculate balances from November 2025 transactions
-- Calculate the correct balance from scratch for each account
-- ============================================================================
WITH account_balances AS (
  SELECT 
    bank_account_id,
    SUM(CASE 
      WHEN type = 'deposit' THEN amount 
      WHEN type = 'withdrawal' THEN -amount 
      ELSE 0 
    END) as calculated_balance
  FROM bank_transactions
  WHERE date >= '2025-11-01'  -- Only November transactions
  GROUP BY bank_account_id
)
UPDATE bank_accounts ba
SET 
  current_balance = COALESCE(ab.calculated_balance, 0),
  updated_at = NOW()
FROM account_balances ab
WHERE ba.id = ab.bank_account_id;

-- ============================================================================
-- Step 3: Also update the running balance in bank_transactions
-- ============================================================================
WITH ranked_transactions AS (
  SELECT 
    bt.id,
    bt.bank_account_id,
    bt.date,
    bt.type,
    bt.amount,
    ROW_NUMBER() OVER (
      PARTITION BY bt.bank_account_id 
      ORDER BY bt.date ASC, bt.id ASC
    ) as rn
  FROM bank_transactions bt
  WHERE bt.date >= '2025-11-01'
),
running_balance AS (
  SELECT 
    id,
    bank_account_id,
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

COMMIT;

-- Verification: Show all accounts with their balances
SELECT 
    ba.name,
    ba.account_number,
    ba.account_type,
    COUNT(bt.id) as transaction_count,
    COALESCE(SUM(CASE WHEN bt.type = 'deposit' THEN bt.amount ELSE 0 END), 0) as total_deposits,
    COALESCE(SUM(CASE WHEN bt.type = 'withdrawal' THEN bt.amount ELSE 0 END), 0) as total_withdrawals,
    ba.current_balance,
    CASE 
        WHEN ba.current_balance >= 0 THEN '✅ Positive' 
        ELSE '⚠️ Negative' 
    END as balance_status
FROM bank_accounts ba
LEFT JOIN bank_transactions bt ON bt.bank_account_id = ba.id 
    AND bt.date >= '2025-11-01'
WHERE ba.is_active = true
GROUP BY ba.id, ba.name, ba.account_number, ba.account_type, ba.current_balance
ORDER BY ba.name;

-- Show total balance across all accounts
SELECT 
    COUNT(*) as total_accounts,
    SUM(current_balance) as total_balance,
    SUM(CASE WHEN current_balance >= 0 THEN current_balance ELSE 0 END) as positive_balance,
    SUM(CASE WHEN current_balance < 0 THEN current_balance ELSE 0 END) as negative_balance
FROM bank_accounts
WHERE is_active = true;
