-- =============================================
-- ACCOUNTING SYSTEM SETUP SCRIPT
-- =============================================
-- This script sets up the complete accounting system for the Furniture ERP

-- First, let's check if the accounting tables exist
DO $$
BEGIN
    -- Create accounting schema if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chart_of_accounts') THEN
        -- Run the accounting schema setup
        \i database/accounting_schema.sql
    END IF;
    
    -- Check if default chart of accounts exists
    IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = '1000') THEN
        -- Run the default chart of accounts setup
        \i database/default_chart_of_accounts.sql
    END IF;
    
    RAISE NOTICE 'Accounting system setup completed successfully!';
END $$;
