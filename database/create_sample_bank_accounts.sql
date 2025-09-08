-- Create sample bank accounts for testing the expense system
-- Run this in Supabase SQL editor to create test bank accounts

INSERT INTO public.bank_accounts (name, account_number, current_balance, account_type, is_active) VALUES
('Main Business Account', '1234567890', 50000.00, 'BANK', true),
('Petty Cash Account', '0987654321', 5000.00, 'BANK', true),
('UPI Payment Account', NULL, 10000.00, 'UPI', true);

-- Verify the creation
SELECT id, name, account_number, current_balance, account_type, is_active 
FROM public.bank_accounts 
WHERE is_active = true
ORDER BY name;
