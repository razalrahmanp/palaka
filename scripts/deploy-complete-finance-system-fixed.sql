-- COMPREHENSIVE FINANCE SYSTEM DEPLOYMENT - FIXED VERSION
-- This script creates all necessary functions and triggers for automatic accounting
-- Run this in Supabase SQL Editor

-- First, drop any existing functions to avoid conflicts
DROP FUNCTION IF EXISTS add_journal_entry_line(uuid,uuid,numeric,numeric,text);
DROP FUNCTION IF EXISTS create_journal_entry(date,text,text);
DROP FUNCTION IF EXISTS post_journal_entry(uuid);
DROP FUNCTION IF EXISTS trigger_create_payment_journal_entry();
DROP FUNCTION IF EXISTS trigger_create_sales_journal_entry();
DROP FUNCTION IF EXISTS trigger_create_vendor_payment_journal_entry();
DROP FUNCTION IF EXISTS trigger_create_purchase_journal_entry();

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_payments_create_journal ON payments;
DROP TRIGGER IF EXISTS trg_invoices_create_journal ON invoices;
DROP TRIGGER IF EXISTS trg_sales_orders_create_journal ON sales_orders;
DROP TRIGGER IF EXISTS trg_vendor_payments_create_journal ON vendor_payment_history;
DROP TRIGGER IF EXISTS trg_purchase_orders_create_journal ON purchase_orders;

-- Now create the helper functions for journal entry management
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

-- Function to add journal entry line
CREATE OR REPLACE FUNCTION add_journal_entry_line(
    p_journal_id UUID,
    p_account_id UUID,
    p_debit_amount DECIMAL,
    p_credit_amount DECIMAL,
    p_description TEXT
) RETURNS UUID AS $$
DECLARE
    line_id UUID;
    line_number INTEGER;
BEGIN
    -- Get next line number
    SELECT COALESCE(MAX(line_number), 0) + 1 
    INTO line_number 
    FROM journal_entry_lines 
    WHERE journal_entry_id = p_journal_id;
    
    -- Insert journal entry line
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        line_number,
        account_id,
        debit_amount,
        credit_amount,
        description
    ) VALUES (
        p_journal_id,
        line_number,
        p_account_id,
        p_debit_amount,
        p_credit_amount,
        p_description
    ) RETURNING id INTO line_id;
    
    -- Update journal entry totals
    UPDATE journal_entries 
    SET 
        total_debit = (
            SELECT COALESCE(SUM(debit_amount), 0) 
            FROM journal_entry_lines 
            WHERE journal_entry_id = p_journal_id
        ),
        total_credit = (
            SELECT COALESCE(SUM(credit_amount), 0) 
            FROM journal_entry_lines 
            WHERE journal_entry_id = p_journal_id
        )
    WHERE id = p_journal_id;
    
    RETURN line_id;
END;
$$ LANGUAGE plpgsql;

-- Function to post journal entry
CREATE OR REPLACE FUNCTION post_journal_entry(p_journal_id UUID) RETURNS BOOLEAN AS $$
DECLARE
    total_debit DECIMAL;
    total_credit DECIMAL;
BEGIN
    -- Get totals
    SELECT 
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO total_debit, total_credit
    FROM journal_entry_lines 
    WHERE journal_entry_id = p_journal_id;
    
    -- Check if balanced
    IF ABS(total_debit - total_credit) > 0.01 THEN
        RAISE EXCEPTION 'Journal entry is not balanced: Debits=% Credits=%', total_debit, total_credit;
        RETURN FALSE;
    END IF;
    
    -- Post the journal entry
    UPDATE journal_entries 
    SET status = 'POSTED',
        posted_at = NOW()
    WHERE id = p_journal_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Now create the automatic trigger functions
-- Function to create journal entry for payment received
CREATE OR REPLACE FUNCTION trigger_create_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    cash_account_id UUID;
    ar_account_id UUID;
    journal_id UUID;
    customer_name TEXT;
    sales_order_id UUID;
BEGIN
    -- Skip if amount is null or zero
    IF NEW.amount IS NULL OR NEW.amount = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Get account IDs (using more flexible account lookup)
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code IN ('1001', '1010') LIMIT 1; -- Cash
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code IN ('1200', '1100') LIMIT 1; -- Accounts Receivable
    
    -- Skip if accounts not found
    IF cash_account_id IS NULL OR ar_account_id IS NULL THEN
        RAISE WARNING 'Required accounts not found for payment journal entry: Cash=%, AR=%', cash_account_id, ar_account_id;
        RETURN NEW;
    END IF;
    
    -- Get customer info
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

-- Function to create journal entry for sales/invoices
CREATE OR REPLACE FUNCTION trigger_create_sales_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    ar_account_id UUID;
    sales_account_id UUID;
    journal_id UUID;
    customer_name TEXT;
    amount_to_record DECIMAL;
BEGIN
    -- Determine amount to record
    amount_to_record := COALESCE(NEW.final_price, NEW.total, NEW.total_price, 0);
    
    -- Skip if total is null or zero
    IF amount_to_record IS NULL OR amount_to_record = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Get account IDs
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code IN ('1200', '1100') LIMIT 1; -- Accounts Receivable
    SELECT id INTO sales_account_id FROM chart_of_accounts WHERE account_code IN ('4010', '4000') LIMIT 1; -- Sales Revenue
    
    -- Skip if accounts not found
    IF ar_account_id IS NULL OR sales_account_id IS NULL THEN
        RAISE WARNING 'Required accounts not found for sales journal entry: AR=%, Sales=%', ar_account_id, sales_account_id;
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

-- Function to create journal entry for vendor payments
CREATE OR REPLACE FUNCTION trigger_create_vendor_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    cash_account_id UUID;
    ap_account_id UUID;
    journal_id UUID;
    supplier_name TEXT;
BEGIN
    -- Skip if amount is null or zero
    IF NEW.amount_paid IS NULL OR NEW.amount_paid = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Skip if payment is not completed
    IF NEW.status != 'completed' THEN
        RETURN NEW;
    END IF;
    
    -- Get account IDs
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code IN ('1001', '1010') LIMIT 1; -- Cash
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code IN ('2010', '2000') LIMIT 1; -- Accounts Payable
    
    -- Skip if accounts not found
    IF cash_account_id IS NULL OR ap_account_id IS NULL THEN
        RAISE WARNING 'Required accounts not found for vendor payment journal entry: Cash=%, AP=%', cash_account_id, ap_account_id;
        RETURN NEW;
    END IF;
    
    -- Get supplier name
    IF NEW.supplier_id IS NOT NULL THEN
        SELECT name INTO supplier_name FROM suppliers WHERE id = NEW.supplier_id;
    END IF;
    
    -- Create journal entry for vendor payment
    journal_id := create_journal_entry(
        NEW.payment_date,
        'Payment to ' || COALESCE(supplier_name, 'Supplier'),
        'VP-' || NEW.id::text
    );
    
    -- Debit Accounts Payable (decrease liability)
    PERFORM add_journal_entry_line(journal_id, ap_account_id, NEW.amount_paid, 0, 'Payment to supplier');
    
    -- Credit Cash (decrease asset)
    PERFORM add_journal_entry_line(journal_id, cash_account_id, 0, NEW.amount_paid, 'Cash paid');
    
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

-- Function to create journal entry for purchase orders
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
    
    -- Get account IDs
    SELECT id INTO inventory_account_id FROM chart_of_accounts WHERE account_code IN ('1300', '1350') LIMIT 1; -- Inventory
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code IN ('2010', '2000') LIMIT 1; -- Accounts Payable
    
    -- Skip if accounts not found
    IF inventory_account_id IS NULL OR ap_account_id IS NULL THEN
        RAISE WARNING 'Required accounts not found for purchase journal entry: Inventory=%, AP=%', inventory_account_id, ap_account_id;
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

-- Now create the triggers
-- Trigger for payment journal entries
CREATE TRIGGER trg_payments_create_journal
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_payment_journal_entry();

-- Trigger for sales order journal entries
CREATE TRIGGER trg_sales_orders_create_journal
    AFTER INSERT ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_sales_journal_entry();

-- Trigger for invoice journal entries (if invoices table exists)
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

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE 'Finance system automatic journal entry triggers deployed successfully!';
    RAISE NOTICE 'Your chart of accounts will now update automatically when:';
    RAISE NOTICE '- Customer payments are received (payments table)';
    RAISE NOTICE '- Sales orders are created (sales_orders table)';
    RAISE NOTICE '- Invoices are created (invoices table)';
    RAISE NOTICE '- Vendor payments are made (vendor_payment_history table)';
    RAISE NOTICE '- Purchase orders are created (purchase_orders table)';
    RAISE NOTICE '';
    RAISE NOTICE 'Automatic journal entries will be created with proper double-entry bookkeeping.';
    RAISE NOTICE 'Run this query to verify triggers are active:';
    RAISE NOTICE 'SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_name LIKE ''trg_%_create_journal'';';
END $$;
