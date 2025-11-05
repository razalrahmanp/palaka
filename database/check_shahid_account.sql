-- Check Shahid Cash/Bank account details and transactions

-- 1. Get account details
SELECT 
    id,
    name,
    account_number,
    account_type,
    current_balance,
    is_active,
    created_at
FROM bank_accounts
WHERE name ILIKE '%shahid%'
ORDER BY name;

-- 2. Get all transactions for Shahid account
SELECT 
    bt.id,
    bt.date,
    bt.type,
    bt.amount,
    bt.balance,
    bt.description,
    bt.reference,
    bt.created_at
FROM bank_transactions bt
JOIN bank_accounts ba ON bt.bank_account_id = ba.id
WHERE ba.name ILIKE '%shahid%'
ORDER BY bt.date DESC, bt.created_at DESC;

-- 3. Count transactions by type
SELECT 
    ba.name as account_name,
    bt.type,
    COUNT(*) as transaction_count,
    SUM(bt.amount) as total_amount
FROM bank_transactions bt
JOIN bank_accounts ba ON bt.bank_account_id = ba.id
WHERE ba.name ILIKE '%shahid%'
GROUP BY ba.name, bt.type
ORDER BY ba.name, bt.type;

-- 4. Calculate balance from transactions
SELECT 
    ba.name as account_name,
    SUM(CASE WHEN bt.type = 'deposit' THEN bt.amount ELSE 0 END) as total_deposits,
    SUM(CASE WHEN bt.type = 'withdrawal' THEN bt.amount ELSE 0 END) as total_withdrawals,
    SUM(CASE WHEN bt.type = 'deposit' THEN bt.amount ELSE -bt.amount END) as calculated_balance,
    ba.current_balance as stored_balance
FROM bank_transactions bt
JOIN bank_accounts ba ON bt.bank_account_id = ba.id
WHERE ba.name ILIKE '%shahid%'
GROUP BY ba.name, ba.current_balance;
