-- DEPLOY MISSING AUTOMATIC JOURNAL ENTRY TRIGGERS
-- Run this script in Supabase SQL Editor to enable automatic accounting
-- This adds the missing triggers for automatic journal entry creation

-- Function to create journal entry for payment received
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
    
    -- Get account IDs
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code = '1010'; -- Cash
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code = '1200'; -- Accounts Receivable
    
    -- Skip if accounts not found
    IF cash_account_id IS NULL OR ar_account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get customer name for description
    IF NEW.invoice_id IS NOT NULL THEN
        SELECT c.name INTO customer_name FROM customers c 
        JOIN invoices i ON c.id = i.customer_id 
        WHERE i.id = NEW.invoice_id;
    END IF;
    
    -- Create journal entry for payment
    journal_id := create_journal_entry(
        COALESCE(NEW.payment_date::date, NEW.date),
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

-- Function to create journal entry for sales
CREATE OR REPLACE FUNCTION trigger_create_sales_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    ar_account_id UUID;
    sales_account_id UUID;
    journal_id UUID;
    customer_name TEXT;
BEGIN
    -- Skip if total is null or zero
    IF NEW.total IS NULL OR NEW.total = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Get account IDs
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code = '1200'; -- Accounts Receivable
    SELECT id INTO sales_account_id FROM chart_of_accounts WHERE account_code = '4010'; -- Sales Revenue
    
    -- Skip if accounts not found
    IF ar_account_id IS NULL OR sales_account_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get customer name
    IF NEW.customer_id IS NOT NULL THEN
        SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
    END IF;
    
    -- Create journal entry for sale
    journal_id := create_journal_entry(
        CURRENT_DATE,
        'Sale to ' || COALESCE(customer_name, NEW.customer_name, 'Customer'),
        'INV-' || NEW.id::text
    );
    
    -- Debit Accounts Receivable (increase asset)
    PERFORM add_journal_entry_line(journal_id, ar_account_id, NEW.total, 0, 'Invoice created');
    
    -- Credit Sales Revenue (increase revenue)
    PERFORM add_journal_entry_line(journal_id, sales_account_id, 0, NEW.total, 'Sales revenue');
    
    -- Post the journal entry
    PERFORM post_journal_entry(journal_id);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue without failing the invoice
        RAISE WARNING 'Failed to create journal entry for invoice %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create journal entry for vendor payment
CREATE OR REPLACE FUNCTION trigger_create_vendor_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    cash_account_id UUID;
    ap_account_id UUID;
    journal_id UUID;
    supplier_name TEXT;
BEGIN
    -- Skip if amount is null or zero
    IF NEW.amount IS NULL OR NEW.amount = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Skip if payment is not completed
    IF NEW.status != 'completed' THEN
        RETURN NEW;
    END IF;
    
    -- Get account IDs
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code = '1010'; -- Cash
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code = '2010'; -- Accounts Payable
    
    -- Skip if accounts not found
    IF cash_account_id IS NULL OR ap_account_id IS NULL THEN
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
    PERFORM add_journal_entry_line(journal_id, ap_account_id, NEW.amount, 0, 'Payment to supplier');
    
    -- Credit Cash (decrease asset)
    PERFORM add_journal_entry_line(journal_id, cash_account_id, 0, NEW.amount, 'Cash paid');
    
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
    SELECT id INTO inventory_account_id FROM chart_of_accounts WHERE account_code = '1300'; -- Inventory
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code = '2010'; -- Accounts Payable
    
    -- Skip if accounts not found
    IF inventory_account_id IS NULL OR ap_account_id IS NULL THEN
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

-- Deploy the missing triggers

-- Trigger for payment journal entries
DROP TRIGGER IF EXISTS trg_payments_create_journal ON payments;
CREATE TRIGGER trg_payments_create_journal
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_payment_journal_entry();

-- Trigger for sales journal entries
DROP TRIGGER IF EXISTS trg_invoices_create_journal ON invoices;
CREATE TRIGGER trg_invoices_create_journal
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_sales_journal_entry();

-- Trigger for vendor payment journal entries
DROP TRIGGER IF EXISTS trg_vendor_payments_create_journal ON vendor_payment_history;
CREATE TRIGGER trg_vendor_payments_create_journal
    AFTER INSERT ON vendor_payment_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_vendor_payment_journal_entry();

-- Trigger for purchase order journal entries
DROP TRIGGER IF EXISTS trg_purchase_orders_create_journal ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_create_journal
    AFTER INSERT ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_purchase_journal_entry();

-- Confirmation message
DO $$
BEGIN
    RAISE NOTICE 'Automatic journal entry triggers deployed successfully!';
    RAISE NOTICE 'Your chart of accounts will now update automatically when:';
    RAISE NOTICE '- Customer payments are received';
    RAISE NOTICE '- Sales invoices are created';
    RAISE NOTICE '- Vendor payments are made';
    RAISE NOTICE '- Purchase orders are created';
END $$;
