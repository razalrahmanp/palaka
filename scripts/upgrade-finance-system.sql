-- COMPREHENSIVE FINANCE SYSTEM UPGRADE
-- This script updates existing functions and adds missing triggers
-- Run this in Supabase SQL Editor

-- First, drop triggers to allow function updates
DROP TRIGGER IF EXISTS trg_payments_create_journal ON payments;
DROP TRIGGER IF EXISTS trg_invoices_create_journal ON invoices;
DROP TRIGGER IF EXISTS trg_sales_orders_create_journal ON sales_orders;
DROP TRIGGER IF EXISTS trg_vendor_payments_create_journal ON vendor_payment_history;
DROP TRIGGER IF EXISTS trg_purchase_orders_create_journal ON purchase_orders;

-- Now we can safely drop and recreate the functions
DROP FUNCTION IF EXISTS trigger_create_payment_journal_entry() CASCADE;
DROP FUNCTION IF EXISTS trigger_create_sales_journal_entry() CASCADE;
DROP FUNCTION IF EXISTS trigger_create_vendor_payment_journal_entry() CASCADE;
DROP FUNCTION IF EXISTS trigger_create_purchase_journal_entry() CASCADE;

-- Update the create_journal_entry function to handle missing users better
CREATE OR REPLACE FUNCTION create_journal_entry(
    p_entry_date DATE,
    p_description TEXT,
    p_reference TEXT
) RETURNS UUID AS $$
DECLARE
    journal_id UUID;
    next_journal_number TEXT;
    system_user_id UUID;
BEGIN
    -- Get system user ID (use the first admin user or create a system user)
    SELECT id INTO system_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- If no admin user found, try to get any user
    IF system_user_id IS NULL THEN
        SELECT id INTO system_user_id FROM users LIMIT 1;
    END IF;
    
    -- If still no user, we'll need to handle this gracefully
    IF system_user_id IS NULL THEN
        RAISE WARNING 'No users found in system. Creating journal entry without user reference.';
        -- We'll still create the entry but it will need manual assignment later
    END IF;
    
    -- Generate next journal number
    SELECT COALESCE(MAX(journal_number::INTEGER), 0) + 1 
    INTO next_journal_number 
    FROM journal_entries 
    WHERE journal_number ~ '^[0-9]+$';
    
    -- Default to 1 if no previous entries
    IF next_journal_number IS NULL THEN
        next_journal_number := '1';
    END IF;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        journal_number,
        entry_date,
        description,
        reference_number,
        status,
        total_debit,
        total_credit,
        created_by
    ) VALUES (
        LPAD(next_journal_number, 6, '0'),
        p_entry_date,
        p_description,
        p_reference,
        'DRAFT',
        0,
        0,
        system_user_id
    ) RETURNING id INTO journal_id;
    
    RETURN journal_id;
END;
$$ LANGUAGE plpgsql;

-- Updated payment journal entry function with better account lookup
CREATE OR REPLACE FUNCTION trigger_create_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    cash_account_id UUID;
    ar_account_id UUID;
    journal_id UUID;
    customer_name TEXT;
BEGIN
    -- Skip if amount is null or zero
    IF NEW.amount IS NULL OR NEW.amount = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Get account IDs with flexible lookup (try multiple account codes)
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code IN ('1001', '1010') ORDER BY account_code LIMIT 1;
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code IN ('1200', '1100') ORDER BY account_code LIMIT 1;
    
    -- Skip if accounts not found but log warning
    IF cash_account_id IS NULL OR ar_account_id IS NULL THEN
        RAISE WARNING 'Required accounts not found for payment journal entry: Cash=%, AR=%. Available codes: %', 
            cash_account_id, ar_account_id, 
            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1001','1010','1200','1100'));
        RETURN NEW;
    END IF;
    
    -- Get customer name for description
    IF NEW.sales_order_id IS NOT NULL THEN
        SELECT so.customer_name INTO customer_name 
        FROM sales_orders so 
        WHERE so.id = NEW.sales_order_id;
    ELSIF NEW.invoice_id IS NOT NULL THEN
        SELECT c.name INTO customer_name FROM customers c 
        JOIN invoices i ON c.id = i.customer_id 
        WHERE i.id = NEW.invoice_id;
    END IF;
    
    -- Create journal entry for payment
    journal_id := create_journal_entry(
        COALESCE(NEW.payment_date::date, NEW.date::date, CURRENT_DATE),
        'Payment received from ' || COALESCE(customer_name, 'Customer'),
        'PAY-' || NEW.id::text
    );
    
    -- Debit Cash (increase asset)
    PERFORM add_journal_entry_line(journal_id, cash_account_id, NEW.amount, 0, 'Cash received');
    
    -- Credit Accounts Receivable (decrease asset)
    PERFORM add_journal_entry_line(journal_id, ar_account_id, 0, NEW.amount, 'Payment applied to receivable');
    
    -- Post the journal entry
    PERFORM post_journal_entry(journal_id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue without failing the payment
        RAISE WARNING 'Failed to create journal entry for payment %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated sales journal entry function with better amount detection
CREATE OR REPLACE FUNCTION trigger_create_sales_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    ar_account_id UUID;
    sales_account_id UUID;
    journal_id UUID;
    customer_name TEXT;
    amount_to_record DECIMAL;
BEGIN
    -- Determine amount to record with better logic
    amount_to_record := COALESCE(NEW.final_price, NEW.total, NEW.total_price, NEW.grand_total, 0);
    
    -- Skip if total is null or zero
    IF amount_to_record IS NULL OR amount_to_record = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Get account IDs with flexible lookup
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code IN ('1200', '1100') ORDER BY account_code LIMIT 1;
    SELECT id INTO sales_account_id FROM chart_of_accounts WHERE account_code IN ('4010', '4000', '4001') ORDER BY account_code LIMIT 1;
    
    -- Skip if accounts not found but log warning
    IF ar_account_id IS NULL OR sales_account_id IS NULL THEN
        RAISE WARNING 'Required accounts not found for sales journal entry: AR=%, Sales=%. Available codes: %', 
            ar_account_id, sales_account_id,
            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1200','1100','4010','4000','4001'));
        RETURN NEW;
    END IF;
    
    -- Get customer name
    customer_name := COALESCE(NEW.customer_name, 'Customer');
    
    -- Create journal entry for sale
    journal_id := create_journal_entry(
        CURRENT_DATE,
        'Sale to ' || customer_name,
        CASE 
            WHEN TG_TABLE_NAME = 'sales_orders' THEN 'SO-' || NEW.id::text
            WHEN TG_TABLE_NAME = 'invoices' THEN 'INV-' || NEW.id::text
            ELSE 'SALE-' || NEW.id::text
        END
    );
    
    -- Debit Accounts Receivable (increase asset)
    PERFORM add_journal_entry_line(journal_id, ar_account_id, amount_to_record, 0, 'Invoice created');
    
    -- Credit Sales Revenue (increase revenue)
    PERFORM add_journal_entry_line(journal_id, sales_account_id, 0, amount_to_record, 'Sales revenue');
    
    -- Post the journal entry
    PERFORM post_journal_entry(journal_id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue without failing the sale
        RAISE WARNING 'Failed to create journal entry for sale %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated vendor payment journal entry function
CREATE OR REPLACE FUNCTION trigger_create_vendor_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    cash_account_id UUID;
    ap_account_id UUID;
    journal_id UUID;
    supplier_name TEXT;
    payment_amount DECIMAL;
BEGIN
    -- Determine payment amount (handle different column names)
    payment_amount := COALESCE(NEW.amount_paid, NEW.amount, 0);
    
    -- Skip if amount is null or zero
    IF payment_amount IS NULL OR payment_amount = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Skip if payment is not completed (if status field exists)
    IF NEW.status IS NOT NULL AND NEW.status != 'completed' THEN
        RETURN NEW;
    END IF;
    
    -- Get account IDs with flexible lookup
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code IN ('1001', '1010') ORDER BY account_code LIMIT 1;
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code IN ('2010', '2000') ORDER BY account_code LIMIT 1;
    
    -- Skip if accounts not found but log warning
    IF cash_account_id IS NULL OR ap_account_id IS NULL THEN
        RAISE WARNING 'Required accounts not found for vendor payment journal entry: Cash=%, AP=%. Available codes: %', 
            cash_account_id, ap_account_id,
            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1001','1010','2010','2000'));
        RETURN NEW;
    END IF;
    
    -- Get supplier name
    IF NEW.supplier_id IS NOT NULL THEN
        SELECT name INTO supplier_name FROM suppliers WHERE id = NEW.supplier_id;
    END IF;
    
    -- Create journal entry for vendor payment
    journal_id := create_journal_entry(
        COALESCE(NEW.payment_date, CURRENT_DATE),
        'Payment to ' || COALESCE(supplier_name, 'Supplier'),
        'VP-' || NEW.id::text
    );
    
    -- Debit Accounts Payable (decrease liability)
    PERFORM add_journal_entry_line(journal_id, ap_account_id, payment_amount, 0, 'Payment to supplier');
    
    -- Credit Cash (decrease asset)
    PERFORM add_journal_entry_line(journal_id, cash_account_id, 0, payment_amount, 'Cash paid');
    
    -- Post the journal entry
    PERFORM post_journal_entry(journal_id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue without failing the payment
        RAISE WARNING 'Failed to create journal entry for vendor payment %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated purchase order journal entry function
CREATE OR REPLACE FUNCTION trigger_create_purchase_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    inventory_account_id UUID;
    ap_account_id UUID;
    journal_id UUID;
    supplier_name TEXT;
BEGIN
    -- Skip if no total amount
    IF NEW.total IS NULL OR NEW.total = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Get account IDs with flexible lookup
    SELECT id INTO inventory_account_id FROM chart_of_accounts WHERE account_code IN ('1300', '1350', '1320') ORDER BY account_code LIMIT 1;
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code IN ('2010', '2000') ORDER BY account_code LIMIT 1;
    
    -- Skip if accounts not found but log warning
    IF inventory_account_id IS NULL OR ap_account_id IS NULL THEN
        RAISE WARNING 'Required accounts not found for purchase journal entry: Inventory=%, AP=%. Available codes: %', 
            inventory_account_id, ap_account_id,
            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1300','1350','1320','2010','2000'));
        RETURN NEW;
    END IF;
    
    -- Get supplier name
    IF NEW.supplier_id IS NOT NULL THEN
        SELECT name INTO supplier_name FROM suppliers WHERE id = NEW.supplier_id;
    END IF;
    
    -- Create journal entry for purchase
    journal_id := create_journal_entry(
        COALESCE(NEW.due_date, CURRENT_DATE),
        'Purchase from ' || COALESCE(supplier_name, 'Supplier'),
        'PO-' || NEW.id::text
    );
    
    -- Debit Inventory (increase asset)
    PERFORM add_journal_entry_line(journal_id, inventory_account_id, NEW.total, 0, 'Inventory purchased');
    
    -- Credit Accounts Payable (increase liability)
    PERFORM add_journal_entry_line(journal_id, ap_account_id, 0, NEW.total, 'Amount owed to supplier');
    
    -- Post the journal entry
    PERFORM post_journal_entry(journal_id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue without failing the purchase order
        RAISE WARNING 'Failed to create journal entry for purchase order %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Now recreate all the triggers
-- Trigger for payment journal entries
CREATE TRIGGER trg_payments_create_journal
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_payment_journal_entry();

-- Trigger for sales order journal entries (this one was missing!)
CREATE TRIGGER trg_sales_orders_create_journal
    AFTER INSERT ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_sales_journal_entry();

-- Trigger for invoice journal entries
CREATE TRIGGER trg_invoices_create_journal
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_sales_journal_entry();

-- Trigger for vendor payment journal entries
CREATE TRIGGER trg_vendor_payments_create_journal
    AFTER INSERT ON vendor_payment_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_vendor_payment_journal_entry();

-- Trigger for purchase order journal entries
CREATE TRIGGER trg_purchase_orders_create_journal
    AFTER INSERT ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_purchase_journal_entry();

-- Verification and status report
DO $$
DECLARE
    trigger_count INTEGER;
    account_count INTEGER;
    missing_accounts TEXT[];
BEGIN
    -- Count active finance triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name LIKE 'trg_%_create_journal';
    
    -- Count required chart of accounts
    SELECT COUNT(*) INTO account_count
    FROM chart_of_accounts 
    WHERE account_code IN ('1001', '1010', '1200', '1100', '4010', '4000', '2010', '2000', '1300', '1350');
    
    -- Find missing critical accounts
    SELECT array_agg(code) INTO missing_accounts
    FROM (VALUES ('1010'), ('1200'), ('4010'), ('2010'), ('1300')) AS required(code)
    WHERE NOT EXISTS (
        SELECT 1 FROM chart_of_accounts WHERE account_code = required.code
    );
    
    RAISE NOTICE '=== FINANCE SYSTEM UPGRADE COMPLETED ===';
    RAISE NOTICE 'Active finance triggers: %', trigger_count;
    RAISE NOTICE 'Required chart accounts found: %/10', account_count;
    
    IF missing_accounts IS NOT NULL THEN
        RAISE NOTICE 'WARNING: Missing critical accounts: %', missing_accounts;
        RAISE NOTICE 'Some journal entries may fail until these accounts are created.';
    ELSE
        RAISE NOTICE 'All critical accounts present - system ready!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Your finance system will now automatically create journal entries for:';
    RAISE NOTICE '- Customer payments (payments table)';
    RAISE NOTICE '- Sales orders (sales_orders table) [NEWLY ADDED]';
    RAISE NOTICE '- Invoices (invoices table)';
    RAISE NOTICE '- Vendor payments (vendor_payment_history table)';
    RAISE NOTICE '- Purchase orders (purchase_orders table)';
    RAISE NOTICE '';
    RAISE NOTICE 'Check your General Ledger and Financial Reports now!';
END $$;
