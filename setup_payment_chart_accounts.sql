-- Enhanced Chart of Accounts Setup for Payment Methods
-- This script creates the proper chart of accounts for different payment methods

-- First, check existing accounts
SELECT 'Current Asset Accounts:' as info;
SELECT account_code, account_name, account_type, current_balance 
FROM chart_of_accounts 
WHERE account_type = 'ASSET' AND account_code LIKE '10%'
ORDER BY account_code;

-- Create comprehensive asset accounts for different payment methods if they don't exist
INSERT INTO chart_of_accounts (
    account_code, 
    account_name, 
    account_type, 
    account_subtype,
    normal_balance,
    is_active, 
    current_balance,
    opening_balance,
    created_at, 
    updated_at
) VALUES 
    -- Core Cash Accounts
    ('1001', 'Petty Cash', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW()),
    ('1010', 'Cash and Cash Equivalents', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW()),
    
    -- Bank Accounts
    ('1011', 'Savings Bank Account', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW()),
    ('1012', 'Current Bank Account', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW()),
    ('1020', 'Bank Accounts', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW()),
    
    -- Digital Payment Accounts
    ('1025', 'UPI Accounts', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW()),
    ('1026', 'Mobile Wallet', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW()),
    ('1030', 'Credit Card Clearing', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW()),
    ('1031', 'Debit Card Clearing', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW()),
    
    -- Receivables
    ('1100', 'Trade Receivables', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW()),
    ('1200', 'Accounts Receivable', 'ASSET', 'CURRENT_ASSET', 'DEBIT', true, 0, 0, NOW(), NOW())
ON CONFLICT (account_code) DO UPDATE SET
    account_name = EXCLUDED.account_name,
    updated_at = NOW();

-- Create Revenue Accounts if they don't exist
INSERT INTO chart_of_accounts (
    account_code, 
    account_name, 
    account_type, 
    account_subtype,
    normal_balance,
    is_active, 
    current_balance,
    opening_balance,
    created_at, 
    updated_at
) VALUES 
    ('4000', 'Sales Revenue', 'REVENUE', 'OPERATING_REVENUE', 'CREDIT', true, 0, 0, NOW(), NOW()),
    ('4010', 'Product Sales', 'REVENUE', 'OPERATING_REVENUE', 'CREDIT', true, 0, 0, NOW(), NOW()),
    ('4001', 'Service Revenue', 'REVENUE', 'OPERATING_REVENUE', 'CREDIT', true, 0, 0, NOW(), NOW())
ON CONFLICT (account_code) DO UPDATE SET
    account_name = EXCLUDED.account_name,
    updated_at = NOW();

-- Verify the setup
SELECT 'Updated Asset Accounts:' as info;
SELECT account_code, account_name, account_type, current_balance 
FROM chart_of_accounts 
WHERE account_code IN ('1001', '1010', '1011', '1012', '1020', '1025', '1026', '1030', '1031', '1100', '1200')
ORDER BY account_code;

-- Show the payment method mapping
SELECT 'Payment Method Mapping:' as info;
SELECT 
    'cash' as payment_method,
    account_code,
    account_name
FROM chart_of_accounts 
WHERE account_code IN ('1010', '1001')

UNION ALL

SELECT 
    'bank_transfer' as payment_method,
    account_code,
    account_name
FROM chart_of_accounts 
WHERE account_code IN ('1020', '1011', '1010')

UNION ALL

SELECT 
    'cheque' as payment_method,
    account_code,
    account_name
FROM chart_of_accounts 
WHERE account_code IN ('1020', '1011', '1010')

UNION ALL

SELECT 
    'upi' as payment_method,
    account_code,
    account_name
FROM chart_of_accounts 
WHERE account_code IN ('1025', '1020', '1010')

UNION ALL

SELECT 
    'card' as payment_method,
    account_code,
    account_name
FROM chart_of_accounts 
WHERE account_code IN ('1030', '1020', '1010')

ORDER BY payment_method, account_code;
