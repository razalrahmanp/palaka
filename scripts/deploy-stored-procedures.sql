-- DEPLOY STORED PROCEDURES FOR FINANCE SYSTEM
-- Run these procedures in Supabase SQL Editor
-- Based on actual database schema structure

-- Function to calculate account balance
CREATE OR REPLACE FUNCTION calculate_account_balance(account_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
    opening_balance NUMERIC := 0;
    current_balance NUMERIC := 0;
    normal_balance_type TEXT;
BEGIN
    -- Get account normal balance type
    SELECT normal_balance INTO normal_balance_type
    FROM chart_of_accounts 
    WHERE id = account_id_param;
    
    -- Get opening balance
    SELECT COALESCE(debit_amount - credit_amount, 0) INTO opening_balance
    FROM opening_balances 
    WHERE account_id = account_id_param;
    
    -- Calculate current balance from general ledger
    IF normal_balance_type = 'DEBIT' THEN
        SELECT opening_balance + COALESCE(SUM(debit_amount - credit_amount), 0) INTO current_balance
        FROM general_ledger 
        WHERE account_id = account_id_param;
    ELSE
        SELECT opening_balance + COALESCE(SUM(credit_amount - debit_amount), 0) INTO current_balance
        FROM general_ledger 
        WHERE account_id = account_id_param;
    END IF;
    
    RETURN COALESCE(current_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice payment status
CREATE OR REPLACE FUNCTION update_invoice_payment_status(invoice_id_param UUID)
RETURNS VOID AS $$
DECLARE
    total_amount NUMERIC;
    paid_amount NUMERIC;
    new_status TEXT;
BEGIN
    -- Get invoice total and calculate paid amount
    SELECT i.total INTO total_amount
    FROM invoices i
    WHERE i.id = invoice_id_param;
    
    SELECT COALESCE(SUM(p.amount), 0) INTO paid_amount
    FROM payments p
    WHERE p.invoice_id = invoice_id_param;
    
    -- Determine new status
    IF paid_amount = 0 THEN
        new_status := 'unpaid';
    ELSIF paid_amount >= total_amount THEN
        new_status := 'paid';
    ELSE
        new_status := 'unpaid'; -- Partial payment still considered unpaid
    END IF;
    
    -- Update invoice
    UPDATE invoices 
    SET 
        paid_amount = paid_amount,
        status = new_status::invoice_status
    WHERE id = invoice_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update purchase order payment status
CREATE OR REPLACE FUNCTION update_purchase_order_payment_status(po_id_param UUID)
RETURNS VOID AS $$
DECLARE
    total_amount NUMERIC;
    paid_amount NUMERIC;
    new_status TEXT;
BEGIN
    -- Get PO total and calculate paid amount
    SELECT po.total INTO total_amount
    FROM purchase_orders po
    WHERE po.id = po_id_param;
    
    SELECT COALESCE(SUM(vph.amount), 0) INTO paid_amount
    FROM vendor_payment_history vph
    WHERE vph.purchase_order_id = po_id_param AND vph.status = 'completed';
    
    -- Determine new status
    IF paid_amount = 0 THEN
        new_status := 'unpaid';
    ELSIF paid_amount >= total_amount THEN
        new_status := 'paid';
    ELSE
        new_status := 'unpaid'; -- Partial payment still considered unpaid
    END IF;
    
    -- Update purchase order
    UPDATE purchase_orders 
    SET 
        paid_amount = paid_amount,
        payment_status = new_status::payment_status
    WHERE id = po_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to create journal entry
CREATE OR REPLACE FUNCTION create_journal_entry(
    entry_date_param DATE,
    description_param TEXT,
    reference_param TEXT DEFAULT NULL,
    created_by_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    journal_id UUID;
    journal_number_val TEXT;
BEGIN
    -- Generate journal number
    SELECT 'JE-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD((
        SELECT COALESCE(MAX(CAST(SUBSTRING(journal_number FROM 'JE-[0-9]+-([0-9]+)') AS INTEGER)), 0) + 1
        FROM journal_entries 
        WHERE journal_number ~ '^JE-[0-9]+-[0-9]+$'
        AND entry_date = entry_date_param
    )::TEXT, 4, '0') INTO journal_number_val;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        journal_number,
        entry_date,
        description,
        reference_number,
        created_by,
        status
    ) VALUES (
        journal_number_val,
        entry_date_param,
        description_param,
        reference_param,
        created_by_param,
        'DRAFT'::journal_status
    ) RETURNING id INTO journal_id;
    
    RETURN journal_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add journal entry line
CREATE OR REPLACE FUNCTION add_journal_entry_line(
    journal_entry_id_param UUID,
    account_id_param UUID,
    debit_amount_param NUMERIC DEFAULT 0,
    credit_amount_param NUMERIC DEFAULT 0,
    description_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    line_id UUID;
BEGIN
    -- Insert journal entry line
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        account_id,
        debit_amount,
        credit_amount,
        description
    ) VALUES (
        journal_entry_id_param,
        account_id_param,
        debit_amount_param,
        credit_amount_param,
        description_param
    ) RETURNING id INTO line_id;
    
    -- Update journal entry totals
    UPDATE journal_entries 
    SET 
        total_debit = (
            SELECT COALESCE(SUM(debit_amount), 0)
            FROM journal_entry_lines 
            WHERE journal_entry_id = journal_entry_id_param
        ),
        total_credit = (
            SELECT COALESCE(SUM(credit_amount), 0)
            FROM journal_entry_lines 
            WHERE journal_entry_id = journal_entry_id_param
        )
    WHERE id = journal_entry_id_param;
    
    RETURN line_id;
END;
$$ LANGUAGE plpgsql;

-- Function to post journal entry to general ledger
CREATE OR REPLACE FUNCTION post_journal_entry(
    journal_entry_id_param UUID,
    posted_by_param UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    je_record RECORD;
    line_record RECORD;
    is_balanced BOOLEAN := FALSE;
BEGIN
    -- Check if journal entry exists and is balanced
    SELECT 
        je.*,
        (ABS(COALESCE(total_debit, 0) - COALESCE(total_credit, 0)) < 0.01) as balanced
    INTO je_record
    FROM journal_entries je
    WHERE je.id = journal_entry_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Journal entry not found';
    END IF;
    
    IF je_record.status != 'DRAFT' THEN
        RAISE EXCEPTION 'Journal entry is not in DRAFT status';
    END IF;
    
    IF NOT je_record.balanced THEN
        RAISE EXCEPTION 'Journal entry is not balanced. Debits: %, Credits: %', 
            je_record.total_debit, je_record.total_credit;
    END IF;
    
    -- Post lines to general ledger
    FOR line_record IN 
        SELECT * FROM journal_entry_lines 
        WHERE journal_entry_id = journal_entry_id_param
    LOOP
        INSERT INTO general_ledger (
            account_id,
            journal_entry_id,
            journal_line_id,
            transaction_date,
            posting_date,
            description,
            reference,
            debit_amount,
            credit_amount,
            running_balance
        ) VALUES (
            line_record.account_id,
            journal_entry_id_param,
            line_record.id,
            je_record.entry_date,
            CURRENT_DATE,
            COALESCE(line_record.description, je_record.description),
            je_record.reference_number,
            line_record.debit_amount,
            line_record.credit_amount,
            calculate_account_balance(line_record.account_id)
        );
    END LOOP;
    
    -- Update journal entry status
    UPDATE journal_entries 
    SET 
        status = 'POSTED'::journal_status,
        posted_by = posted_by_param,
        posted_at = CURRENT_TIMESTAMP
    WHERE id = journal_entry_id_param;
    
    -- Update account balances
    UPDATE chart_of_accounts 
    SET current_balance = calculate_account_balance(id)
    WHERE id IN (
        SELECT DISTINCT account_id 
        FROM journal_entry_lines 
        WHERE journal_entry_id = journal_entry_id_param
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get account balance as of date
CREATE OR REPLACE FUNCTION get_account_balance_as_of_date(
    account_id_param UUID,
    as_of_date DATE
)
RETURNS NUMERIC AS $$
DECLARE
    opening_balance NUMERIC := 0;
    balance_as_of_date NUMERIC := 0;
    normal_balance_type TEXT;
BEGIN
    -- Get account normal balance type
    SELECT normal_balance INTO normal_balance_type
    FROM chart_of_accounts 
    WHERE id = account_id_param;
    
    -- Get opening balance
    SELECT COALESCE(debit_amount - credit_amount, 0) INTO opening_balance
    FROM opening_balances 
    WHERE account_id = account_id_param;
    
    -- Calculate balance as of date
    IF normal_balance_type = 'DEBIT' THEN
        SELECT opening_balance + COALESCE(SUM(debit_amount - credit_amount), 0) INTO balance_as_of_date
        FROM general_ledger 
        WHERE account_id = account_id_param 
        AND transaction_date <= as_of_date;
    ELSE
        SELECT opening_balance + COALESCE(SUM(credit_amount - debit_amount), 0) INTO balance_as_of_date
        FROM general_ledger 
        WHERE account_id = account_id_param 
        AND transaction_date <= as_of_date;
    END IF;
    
    RETURN COALESCE(balance_as_of_date, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to reconcile bank transactions
CREATE OR REPLACE FUNCTION reconcile_bank_transaction(
    bank_transaction_id_param UUID,
    payment_id_param UUID DEFAULT NULL,
    vendor_payment_id_param UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    bt_record RECORD;
    reference_val TEXT;
BEGIN
    -- Get bank transaction details
    SELECT * INTO bt_record
    FROM bank_transactions
    WHERE id = bank_transaction_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bank transaction not found';
    END IF;
    
    -- Set reference based on payment type
    IF payment_id_param IS NOT NULL THEN
        SELECT reference INTO reference_val
        FROM payments
        WHERE id = payment_id_param;
        
        -- Update payment reference if needed
        UPDATE payments 
        SET reference = bt_record.reference
        WHERE id = payment_id_param AND (reference IS NULL OR reference = '');
        
    ELSIF vendor_payment_id_param IS NOT NULL THEN
        SELECT reference_number INTO reference_val
        FROM vendor_payment_history
        WHERE id = vendor_payment_id_param;
        
        -- Update vendor payment reference if needed
        UPDATE vendor_payment_history 
        SET reference_number = bt_record.reference
        WHERE id = vendor_payment_id_param AND (reference_number IS NULL OR reference_number = '');
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
