-- Setup required chart of accounts for payment journal entries
-- Run this in your database to ensure the accounts exist

-- Insert Cash account if it doesn't exist
INSERT INTO chartofaccounts (account_code, account_name, account_type, is_active, created_at, updated_at)
SELECT '1010', 'Cash', 'ASSET', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM chartofaccounts WHERE account_code = '1010');

-- Insert Accounts Receivable account if it doesn't exist
INSERT INTO chartofaccounts (account_code, account_name, account_type, is_active, created_at, updated_at)
SELECT '1200', 'Accounts Receivable', 'ASSET', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM chartofaccounts WHERE account_code = '1200');

-- Verify accounts were created
SELECT account_code, account_name, account_type, is_active 
FROM chartofaccounts 
WHERE account_code IN ('1010', '1200')
ORDER BY account_code;
