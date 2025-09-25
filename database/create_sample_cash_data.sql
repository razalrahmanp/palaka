-- Create sample cash accounts and transactions for testing
-- Run this in Supabase SQL editor to create test data

-- First, let's create some cash accounts
INSERT INTO public.bank_accounts (name, current_balance, account_type, currency, is_active) VALUES
('Main Cash Register', 15000.00, 'CASH', 'INR', true),
('Petty Cash', 2000.00, 'CASH', 'INR', true),
('Counter Cash', 5000.00, 'CASH', 'INR', true);

-- Get the IDs of the cash accounts we just created
-- (You'll need to run this and get the actual IDs to use in the next part)
SELECT id, name, current_balance, account_type 
FROM public.bank_accounts 
WHERE account_type = 'CASH'
ORDER BY name;

-- Sample cash transactions (replace the UUIDs with actual IDs from above query)
-- INSERT INTO public.bank_transactions (bank_account_id, date, type, amount, description, reference) VALUES
-- ('YOUR_CASH_ACCOUNT_ID_1', '2024-01-15', 'deposit', 5000.00, 'Cash sales revenue from daily operations', 'SALE-001'),
-- ('YOUR_CASH_ACCOUNT_ID_1', '2024-01-16', 'withdrawal', 1200.00, 'Office supplies expense payment', 'EXP-001'),
-- ('YOUR_CASH_ACCOUNT_ID_2', '2024-01-17', 'deposit', 500.00, 'Investment return payment', 'INV-001'),
-- ('YOUR_CASH_ACCOUNT_ID_2', '2024-01-18', 'withdrawal', 300.00, 'Liability payment for utilities', 'LIB-001');