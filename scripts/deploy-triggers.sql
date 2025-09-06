-- DEPLOY TRIGGERS FOR FINANCE SYSTEM
-- Run these triggers in Supabase SQL Editor
-- Based on actual database schema structure

-- Trigger to update invoice payment status when payments change
CREATE OR REPLACE FUNCTION trigger_update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle different trigger events
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update for new/updated payment
        IF NEW.invoice_id IS NOT NULL THEN
            PERFORM update_invoice_payment_status(NEW.invoice_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update for deleted payment
        IF OLD.invoice_id IS NOT NULL THEN
            PERFORM update_invoice_payment_status(OLD.invoice_id);
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on payments table
DROP TRIGGER IF EXISTS trg_payments_update_invoice_status ON payments;
CREATE TRIGGER trg_payments_update_invoice_status
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_invoice_payment_status();

-- Trigger to update purchase order payment status when vendor payments change
CREATE OR REPLACE FUNCTION trigger_update_po_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle different trigger events
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update for new/updated vendor payment
        IF NEW.purchase_order_id IS NOT NULL THEN
            PERFORM update_purchase_order_payment_status(NEW.purchase_order_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update for deleted vendor payment
        IF OLD.purchase_order_id IS NOT NULL THEN
            PERFORM update_purchase_order_payment_status(OLD.purchase_order_id);
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on vendor_payment_history table
DROP TRIGGER IF EXISTS trg_vendor_payments_update_po_status ON vendor_payment_history;
CREATE TRIGGER trg_vendor_payments_update_po_status
    AFTER INSERT OR UPDATE OR DELETE ON vendor_payment_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_po_payment_status();

-- Trigger to automatically update account balances when general ledger changes
CREATE OR REPLACE FUNCTION trigger_update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    affected_account_id UUID;
BEGIN
    -- Handle different trigger events
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        affected_account_id := NEW.account_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        affected_account_id := OLD.account_id;
        RETURN OLD;
    END IF;
    
    -- Update account balance
    UPDATE chart_of_accounts 
    SET 
        current_balance = calculate_account_balance(affected_account_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = affected_account_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on general_ledger table
DROP TRIGGER IF EXISTS trg_general_ledger_update_balance ON general_ledger;
CREATE TRIGGER trg_general_ledger_update_balance
    AFTER INSERT OR UPDATE OR DELETE ON general_ledger
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_account_balance();

-- Trigger to update journal entry totals when lines change
CREATE OR REPLACE FUNCTION trigger_update_journal_totals()
RETURNS TRIGGER AS $$
DECLARE
    je_id UUID;
BEGIN
    -- Get journal entry ID
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        je_id := NEW.journal_entry_id;
    ELSIF TG_OP = 'DELETE' THEN
        je_id := OLD.journal_entry_id;
    END IF;
    
    -- Update journal entry totals
    UPDATE journal_entries 
    SET 
        total_debit = (
            SELECT COALESCE(SUM(debit_amount), 0)
            FROM journal_entry_lines 
            WHERE journal_entry_id = je_id
        ),
        total_credit = (
            SELECT COALESCE(SUM(credit_amount), 0)
            FROM journal_entry_lines 
            WHERE journal_entry_id = je_id
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = je_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on journal_entry_lines table
DROP TRIGGER IF EXISTS trg_journal_lines_update_totals ON journal_entry_lines;
CREATE TRIGGER trg_journal_lines_update_totals
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_journal_totals();

-- Trigger to validate journal entry balance before posting
CREATE OR REPLACE FUNCTION trigger_validate_journal_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate when status changes to POSTED
    IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN
        IF ABS(COALESCE(NEW.total_debit, 0) - COALESCE(NEW.total_credit, 0)) > 0.01 THEN
            RAISE EXCEPTION 'Cannot post unbalanced journal entry. Debits: %, Credits: %', 
                NEW.total_debit, NEW.total_credit;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on journal_entries table
DROP TRIGGER IF EXISTS trg_journal_entries_validate_balance ON journal_entries;
CREATE TRIGGER trg_journal_entries_validate_balance
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validate_journal_balance();

-- Trigger to automatically create opening balance entries
CREATE OR REPLACE FUNCTION trigger_create_opening_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Create opening balance entry if opening_balance is set
    IF NEW.opening_balance IS NOT NULL AND NEW.opening_balance != 0 THEN
        INSERT INTO opening_balances (
            account_id,
            opening_date,
            debit_amount,
            credit_amount
        ) VALUES (
            NEW.id,
            CURRENT_DATE,
            CASE WHEN NEW.normal_balance = 'DEBIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END,
            CASE WHEN NEW.normal_balance = 'CREDIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END
        )
        ON CONFLICT (account_id) DO UPDATE SET
            debit_amount = CASE WHEN NEW.normal_balance = 'DEBIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END,
            credit_amount = CASE WHEN NEW.normal_balance = 'CREDIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on chart_of_accounts table
DROP TRIGGER IF EXISTS trg_chart_of_accounts_opening_balance ON chart_of_accounts;
CREATE TRIGGER trg_chart_of_accounts_opening_balance
    AFTER INSERT OR UPDATE ON chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_opening_balance();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION trigger_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create timestamp triggers for financial tables
DROP TRIGGER IF EXISTS trg_chart_of_accounts_timestamp ON chart_of_accounts;
CREATE TRIGGER trg_chart_of_accounts_timestamp
    BEFORE UPDATE ON chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_timestamp();

DROP TRIGGER IF EXISTS trg_journal_entries_timestamp ON journal_entries;
CREATE TRIGGER trg_journal_entries_timestamp
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_timestamp();

-- Trigger to validate account types for transactions
CREATE OR REPLACE FUNCTION trigger_validate_account_usage()
RETURNS TRIGGER AS $$
DECLARE
    account_info RECORD;
BEGIN
    -- Get account information
    SELECT account_type, is_active INTO account_info
    FROM chart_of_accounts
    WHERE id = NEW.account_id;
    
    -- Validate account is active
    IF NOT account_info.is_active THEN
        RAISE EXCEPTION 'Cannot post to inactive account';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger on general_ledger
DROP TRIGGER IF EXISTS trg_general_ledger_validate_account ON general_ledger;
CREATE TRIGGER trg_general_ledger_validate_account
    BEFORE INSERT OR UPDATE ON general_ledger
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validate_account_usage();

-- Trigger to log financial transactions for audit
CREATE OR REPLACE FUNCTION trigger_audit_financial_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- This can be extended to log to an audit table
    -- For now, just ensure created_at is set
    IF TG_OP = 'INSERT' THEN
        IF NEW.created_at IS NULL THEN
            NEW.created_at = CURRENT_TIMESTAMP;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for key financial tables
DROP TRIGGER IF EXISTS trg_payments_audit ON payments;
CREATE TRIGGER trg_payments_audit
    BEFORE INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_financial_transaction();

DROP TRIGGER IF EXISTS trg_vendor_payments_audit ON vendor_payment_history;
CREATE TRIGGER trg_vendor_payments_audit
    BEFORE INSERT ON vendor_payment_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_financial_transaction();

-- ===== AUTOMATIC ACCOUNTING ENTRY TRIGGERS =====

-- Function to create journal entry for payment received
CREATE OR REPLACE FUNCTION trigger_create_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    cash_account_id UUID;
    ar_account_id UUID;
    journal_id UUID;
    customer_name TEXT;
BEGIN
    -- Get account IDs
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code = '1010'; -- Cash
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code = '1200'; -- Accounts Receivable
    
    -- Get customer name for description
    SELECT c.name INTO customer_name FROM customers c 
    JOIN invoices i ON c.id = i.customer_id 
    WHERE i.id = NEW.invoice_id;
    
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
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment journal entries
DROP TRIGGER IF EXISTS trg_payments_create_journal ON payments;
CREATE TRIGGER trg_payments_create_journal
    AFTER INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_payment_journal_entry();

-- Function to create journal entry for vendor payment
CREATE OR REPLACE FUNCTION trigger_create_vendor_payment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    cash_account_id UUID;
    ap_account_id UUID;
    journal_id UUID;
    supplier_name TEXT;
BEGIN
    -- Get account IDs
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code = '1010'; -- Cash
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code = '2010'; -- Accounts Payable
    
    -- Get supplier name
    SELECT s.name INTO supplier_name FROM suppliers s WHERE s.id = NEW.supplier_id;
    
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
END;
$$ LANGUAGE plpgsql;

-- Trigger for vendor payment journal entries
DROP TRIGGER IF EXISTS trg_vendor_payments_create_journal ON vendor_payment_history;
CREATE TRIGGER trg_vendor_payments_create_journal
    AFTER INSERT ON vendor_payment_history
    FOR EACH ROW
    WHERE NEW.status = 'completed'
    EXECUTE FUNCTION trigger_create_vendor_payment_journal_entry();

-- Function to create journal entry for sales
CREATE OR REPLACE FUNCTION trigger_create_sales_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    ar_account_id UUID;
    sales_account_id UUID;
    journal_id UUID;
    customer_name TEXT;
BEGIN
    -- Get account IDs
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code = '1200'; -- Accounts Receivable
    SELECT id INTO sales_account_id FROM chart_of_accounts WHERE account_code = '4010'; -- Sales Revenue
    
    -- Get customer name
    SELECT name INTO customer_name FROM customers WHERE id = NEW.customer_id;
    
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
END;
$$ LANGUAGE plpgsql;

-- Trigger for sales journal entries
DROP TRIGGER IF EXISTS trg_invoices_create_journal ON invoices;
CREATE TRIGGER trg_invoices_create_journal
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_sales_journal_entry();

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
    
    -- Get supplier name
    SELECT name INTO supplier_name FROM suppliers WHERE id = NEW.supplier_id;
    
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
END;
$$ LANGUAGE plpgsql;

-- Trigger for purchase order journal entries
DROP TRIGGER IF EXISTS trg_purchase_orders_create_journal ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_create_journal
    AFTER INSERT ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_purchase_journal_entry();

-- Function to create journal entry for inventory adjustments
CREATE OR REPLACE FUNCTION trigger_create_inventory_adjustment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    inventory_account_id UUID;
    adjustment_account_id UUID;
    journal_id UUID;
    quantity_diff NUMERIC;
    value_diff NUMERIC;
BEGIN
    -- Calculate quantity difference
    IF TG_OP = 'INSERT' THEN
        quantity_diff := NEW.quantity;
    ELSIF TG_OP = 'UPDATE' THEN
        quantity_diff := NEW.quantity - OLD.quantity;
    ELSIF TG_OP = 'DELETE' THEN
        quantity_diff := -OLD.quantity;
    END IF;
    
    -- Skip if no significant change
    IF ABS(quantity_diff) < 0.01 THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculate value (assuming $50 average cost per unit for demo)
    value_diff := quantity_diff * 50;
    
    -- Get account IDs
    SELECT id INTO inventory_account_id FROM chart_of_accounts WHERE account_code = '1300'; -- Inventory
    SELECT id INTO adjustment_account_id FROM chart_of_accounts WHERE account_code = '5030'; -- Manufacturing Overhead
    
    -- Create journal entry for inventory adjustment
    journal_id := create_journal_entry(
        CURRENT_DATE,
        'Inventory adjustment - ' || COALESCE(NEW.product_name, OLD.product_name, 'Unknown Product'),
        'ADJ-' || COALESCE(NEW.id::text, OLD.id::text)
    );
    
    -- Adjust inventory and corresponding account
    IF value_diff > 0 THEN
        -- Increase inventory
        PERFORM add_journal_entry_line(journal_id, inventory_account_id, value_diff, 0, 'Inventory increase');
        PERFORM add_journal_entry_line(journal_id, adjustment_account_id, 0, value_diff, 'Inventory adjustment');
    ELSE
        -- Decrease inventory
        PERFORM add_journal_entry_line(journal_id, inventory_account_id, 0, ABS(value_diff), 'Inventory decrease');
        PERFORM add_journal_entry_line(journal_id, adjustment_account_id, ABS(value_diff), 0, 'Inventory adjustment');
    END IF;
    
    -- Post the journal entry
    PERFORM post_journal_entry(journal_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for inventory adjustments (if you have an inventory table)
-- Note: Uncomment when you identify your inventory table
-- DROP TRIGGER IF EXISTS trg_inventory_create_journal ON inventory_items;
-- CREATE TRIGGER trg_inventory_create_journal
--     AFTER INSERT OR UPDATE OR DELETE ON inventory_items
--     FOR EACH ROW
--     EXECUTE FUNCTION trigger_create_inventory_adjustment_journal_entry();
