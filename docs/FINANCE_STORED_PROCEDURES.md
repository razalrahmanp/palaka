# CRITICAL STORED PROCEDURES FOR FINANCE SYSTEM

## 🎯 ESSENTIAL STORED PROCEDURES

### 1. **Create Opening Balance with Journal Entry**
```sql
-- Function to create opening balance with automatic journal entry
CREATE OR REPLACE FUNCTION create_opening_balance(
    p_account_id UUID,
    p_balance_amount NUMERIC,
    p_balance_date DATE,
    p_description TEXT DEFAULT 'Opening balance',
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    balance_id UUID;
    je_id UUID;
    equity_account_id UUID;
BEGIN
    -- Insert opening balance record
    INSERT INTO opening_balances (
        account_id, 
        balance_amount, 
        balance_date, 
        description, 
        created_by
    ) VALUES (
        p_account_id, 
        p_balance_amount, 
        p_balance_date, 
        p_description, 
        COALESCE(p_created_by, (SELECT id FROM users LIMIT 1))
    ) RETURNING id INTO balance_id;
    
    -- Get retained earnings account (or create if doesn't exist)
    SELECT id INTO equity_account_id 
    FROM chart_of_accounts 
    WHERE account_code = '3900' OR account_name ILIKE '%retained earnings%'
    LIMIT 1;
    
    -- Create journal entry for opening balance
    INSERT INTO journal_entries (
        journal_number,
        entry_date,
        description,
        entry_type,
        status,
        total_debit,
        total_credit,
        source_document_type,
        source_document_id,
        created_by
    ) VALUES (
        'OB-' || EXTRACT(YEAR FROM p_balance_date) || '-' || LPAD(nextval('opening_balance_journal_seq')::text, 6, '0'),
        p_balance_date,
        'Opening balance for ' || (SELECT account_name FROM chart_of_accounts WHERE id = p_account_id),
        'OPENING',
        'POSTED',
        CASE WHEN p_balance_amount > 0 THEN p_balance_amount ELSE 0 END,
        CASE WHEN p_balance_amount < 0 THEN ABS(p_balance_amount) ELSE 0 END,
        'OPENING_BALANCE',
        balance_id,
        COALESCE(p_created_by, (SELECT id FROM users LIMIT 1))
    ) RETURNING id INTO je_id;
    
    -- Create journal entry lines based on account type and balance
    -- Get account details
    DECLARE 
        account_type TEXT;
        normal_balance TEXT;
    BEGIN
        SELECT coa.account_type, coa.normal_balance 
        INTO account_type, normal_balance
        FROM chart_of_accounts coa 
        WHERE id = p_account_id;
        
        -- Create debit/credit lines based on normal balance and amount
        IF p_balance_amount > 0 THEN
            IF normal_balance = 'DEBIT' THEN
                -- Debit the account, Credit equity
                INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit_amount, credit_amount)
                VALUES (je_id, 1, p_account_id, 'Opening balance', p_balance_amount, 0);
                
                INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit_amount, credit_amount)
                VALUES (je_id, 2, equity_account_id, 'Balancing entry', 0, p_balance_amount);
            ELSE
                -- Credit the account, Debit equity
                INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit_amount, credit_amount)
                VALUES (je_id, 1, equity_account_id, 'Balancing entry', p_balance_amount, 0);
                
                INSERT INTO journal_entry_lines (journal_entry_id, line_number, account_id, description, debit_amount, credit_amount)
                VALUES (je_id, 2, p_account_id, 'Opening balance', 0, p_balance_amount);
            END IF;
        END IF;
    END;
    
    -- Create general ledger entries
    INSERT INTO general_ledger (
        account_id, 
        journal_entry_id, 
        journal_line_id, 
        transaction_date, 
        posting_date,
        description, 
        debit_amount, 
        credit_amount, 
        running_balance
    )
    SELECT 
        jel.account_id,
        je_id,
        jel.id,
        p_balance_date,
        p_balance_date,
        jel.description,
        jel.debit_amount,
        jel.credit_amount,
        -- Calculate running balance
        COALESCE((
            SELECT running_balance 
            FROM general_ledger 
            WHERE account_id = jel.account_id 
            ORDER BY created_at DESC 
            LIMIT 1
        ), 0) + jel.debit_amount - jel.credit_amount
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = je_id;
    
    RETURN balance_id;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for opening balance journal numbering
CREATE SEQUENCE IF NOT EXISTS opening_balance_journal_seq START 1;
```

### 2. **Enhanced Payment Creation with Accounting**
```sql
-- Function to create payment with complete accounting integration
CREATE OR REPLACE FUNCTION create_payment_with_accounting(
    p_invoice_id UUID DEFAULT NULL,
    p_purchase_order_id UUID DEFAULT NULL,
    p_amount NUMERIC,
    p_payment_date TIMESTAMP,
    p_method TEXT DEFAULT 'cash',
    p_reference TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_bank_account_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    payment_id UUID;
    bank_txn_id UUID;
    je_id UUID;
    cash_account_id UUID;
    ar_account_id UUID;
    ap_account_id UUID;
    invoice_rec RECORD;
    po_rec RECORD;
BEGIN
    -- Get account IDs
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code = '1001' LIMIT 1; -- Cash
    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code = '1200' LIMIT 1; -- Accounts Receivable
    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code = '2001' LIMIT 1; -- Accounts Payable
    
    -- Handle Sales Payment (Invoice)
    IF p_invoice_id IS NOT NULL THEN
        -- Insert payment record
        INSERT INTO payments (
            invoice_id, 
            amount, 
            payment_date, 
            method, 
            reference, 
            description,
            created_by
        ) VALUES (
            p_invoice_id, 
            p_amount, 
            p_payment_date, 
            p_method, 
            p_reference, 
            COALESCE(p_description, 'Payment for invoice'),
            COALESCE(p_created_by, (SELECT id FROM users LIMIT 1))
        ) RETURNING id INTO payment_id;
        
        -- Get invoice details
        SELECT * INTO invoice_rec FROM invoices WHERE id = p_invoice_id;
        
        -- Create journal entry for sales payment
        INSERT INTO journal_entries (
            journal_number, 
            entry_date, 
            description, 
            entry_type, 
            status,
            total_debit,
            total_credit,
            source_document_type,
            source_document_id,
            created_by
        ) VALUES (
            'PAY-' || EXTRACT(YEAR FROM p_payment_date) || '-' || LPAD(nextval('payment_journal_seq')::text, 6, '0'),
            p_payment_date::date,
            'Payment received for Invoice #' || invoice_rec.invoice_number,
            'STANDARD',
            'POSTED',
            p_amount,
            p_amount,
            'PAYMENT',
            payment_id,
            COALESCE(p_created_by, (SELECT id FROM users LIMIT 1))
        ) RETURNING id INTO je_id;
        
        -- Create journal entry lines for sales payment
        -- Debit: Cash Account
        INSERT INTO journal_entry_lines (
            journal_entry_id, line_number, account_id, description, debit_amount, credit_amount
        ) VALUES (
            je_id, 1, cash_account_id, 'Cash received', p_amount, 0
        );
        
        -- Credit: Accounts Receivable
        INSERT INTO journal_entry_lines (
            journal_entry_id, line_number, account_id, description, debit_amount, credit_amount
        ) VALUES (
            je_id, 2, ar_account_id, 'A/R payment', 0, p_amount
        );
    END IF;
    
    -- Handle Purchase Payment (Purchase Order)
    IF p_purchase_order_id IS NOT NULL THEN
        -- Insert vendor payment record
        INSERT INTO vendor_payment_history (
            supplier_id,
            purchase_order_id,
            amount,
            payment_date,
            payment_method,
            reference,
            description,
            bank_account_id,
            created_by
        ) 
        SELECT 
            po.supplier_id,
            p_purchase_order_id,
            p_amount,
            p_payment_date,
            p_method,
            p_reference,
            COALESCE(p_description, 'Payment for PO #' || po.po_number),
            p_bank_account_id,
            COALESCE(p_created_by, (SELECT id FROM users LIMIT 1))
        FROM purchase_orders po 
        WHERE po.id = p_purchase_order_id
        RETURNING id INTO payment_id;
        
        -- Get PO details
        SELECT * INTO po_rec FROM purchase_orders WHERE id = p_purchase_order_id;
        
        -- Create journal entry for purchase payment
        INSERT INTO journal_entries (
            journal_number, 
            entry_date, 
            description, 
            entry_type, 
            status,
            total_debit,
            total_credit,
            source_document_type,
            source_document_id,
            created_by
        ) VALUES (
            'PPY-' || EXTRACT(YEAR FROM p_payment_date) || '-' || LPAD(nextval('purchase_payment_journal_seq')::text, 6, '0'),
            p_payment_date::date,
            'Payment for Purchase Order #' || po_rec.po_number,
            'STANDARD',
            'POSTED',
            p_amount,
            p_amount,
            'PURCHASE_PAYMENT',
            payment_id,
            COALESCE(p_created_by, (SELECT id FROM users LIMIT 1))
        ) RETURNING id INTO je_id;
        
        -- Create journal entry lines for purchase payment
        -- Debit: Accounts Payable
        INSERT INTO journal_entry_lines (
            journal_entry_id, line_number, account_id, description, debit_amount, credit_amount
        ) VALUES (
            je_id, 1, ap_account_id, 'A/P payment', p_amount, 0
        );
        
        -- Credit: Cash
        INSERT INTO journal_entry_lines (
            journal_entry_id, line_number, account_id, description, debit_amount, credit_amount
        ) VALUES (
            je_id, 2, cash_account_id, 'Cash paid', 0, p_amount
        );
    END IF;
    
    -- Create bank transaction if bank account specified
    IF p_bank_account_id IS NOT NULL THEN
        INSERT INTO bank_transactions (
            bank_account_id, 
            amount, 
            transaction_type, 
            reference, 
            transaction_date, 
            description
        ) VALUES (
            p_bank_account_id, 
            p_amount, 
            CASE WHEN p_invoice_id IS NOT NULL THEN 'credit' ELSE 'debit' END,
            p_reference, 
            p_payment_date::date, 
            COALESCE(p_description, 'Payment transaction')
        ) RETURNING id INTO bank_txn_id;
    END IF;
    
    -- Create general ledger entries for the journal
    IF je_id IS NOT NULL THEN
        INSERT INTO general_ledger (
            account_id, 
            journal_entry_id, 
            journal_line_id, 
            transaction_date, 
            posting_date,
            description, 
            debit_amount, 
            credit_amount, 
            running_balance
        )
        SELECT 
            jel.account_id,
            je_id,
            jel.id,
            p_payment_date::date,
            p_payment_date::date,
            jel.description,
            jel.debit_amount,
            jel.credit_amount,
            -- Calculate running balance
            COALESCE((
                SELECT running_balance 
                FROM general_ledger 
                WHERE account_id = jel.account_id 
                ORDER BY created_at DESC 
                LIMIT 1
            ), 0) + jel.debit_amount - jel.credit_amount
        FROM journal_entry_lines jel
        WHERE jel.journal_entry_id = je_id;
    END IF;
    
    -- Return the payment ID
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql;

-- Create sequences
CREATE SEQUENCE IF NOT EXISTS payment_journal_seq START 1;
CREATE SEQUENCE IF NOT EXISTS purchase_payment_journal_seq START 1;
```

### 3. **Journal Entry Creation with Lines**
```sql
-- Function to create journal entry with lines atomically
CREATE OR REPLACE FUNCTION create_journal_entry_with_lines(
    p_journal_data JSONB
) RETURNS UUID AS $$
DECLARE
    je_id UUID;
    je_line JSONB;
    line_number INTEGER := 1;
    total_debit NUMERIC := 0;
    total_credit NUMERIC := 0;
BEGIN
    -- Validate that debits equal credits
    SELECT 
        COALESCE(SUM((line->>'debit_amount')::NUMERIC), 0),
        COALESCE(SUM((line->>'credit_amount')::NUMERIC), 0)
    INTO total_debit, total_credit
    FROM jsonb_array_elements(p_journal_data->'lines') AS line;
    
    IF ABS(total_debit - total_credit) > 0.01 THEN
        RAISE EXCEPTION 'Journal entry must be balanced. Debits: %, Credits: %', total_debit, total_credit;
    END IF;
    
    -- Create journal entry header
    INSERT INTO journal_entries (
        journal_number,
        entry_date,
        description,
        entry_type,
        status,
        total_debit,
        total_credit,
        created_by
    ) VALUES (
        COALESCE(p_journal_data->>'journal_number', 'JE-' || EXTRACT(YEAR FROM (p_journal_data->>'entry_date')::DATE) || '-' || LPAD(nextval('manual_journal_seq')::text, 6, '0')),
        (p_journal_data->>'entry_date')::DATE,
        p_journal_data->>'description',
        COALESCE(p_journal_data->>'entry_type', 'MANUAL'),
        COALESCE(p_journal_data->>'status', 'DRAFT'),
        total_debit,
        total_credit,
        (p_journal_data->>'created_by')::UUID
    ) RETURNING id INTO je_id;
    
    -- Create journal entry lines
    FOR je_line IN SELECT * FROM jsonb_array_elements(p_journal_data->'lines')
    LOOP
        INSERT INTO journal_entry_lines (
            journal_entry_id,
            line_number,
            account_id,
            description,
            debit_amount,
            credit_amount
        ) VALUES (
            je_id,
            line_number,
            (je_line->>'account_id')::UUID,
            je_line->>'description',
            COALESCE((je_line->>'debit_amount')::NUMERIC, 0),
            COALESCE((je_line->>'credit_amount')::NUMERIC, 0)
        );
        
        line_number := line_number + 1;
    END LOOP;
    
    -- If status is POSTED, create general ledger entries
    IF COALESCE(p_journal_data->>'status', 'DRAFT') = 'POSTED' THEN
        INSERT INTO general_ledger (
            account_id, 
            journal_entry_id, 
            journal_line_id, 
            transaction_date, 
            posting_date,
            description, 
            debit_amount, 
            credit_amount, 
            running_balance
        )
        SELECT 
            jel.account_id,
            je_id,
            jel.id,
            (p_journal_data->>'entry_date')::DATE,
            CURRENT_DATE,
            jel.description,
            jel.debit_amount,
            jel.credit_amount,
            -- Calculate running balance
            COALESCE((
                SELECT running_balance 
                FROM general_ledger 
                WHERE account_id = jel.account_id 
                ORDER BY created_at DESC 
                LIMIT 1
            ), 0) + jel.debit_amount - jel.credit_amount
        FROM journal_entry_lines jel
        WHERE jel.journal_entry_id = je_id;
    END IF;
    
    RETURN je_id;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for manual journal entries
CREATE SEQUENCE IF NOT EXISTS manual_journal_seq START 1;
```

### 4. **Generate Financial Reports**
```sql
-- Profit & Loss Report Function
CREATE OR REPLACE FUNCTION generate_profit_loss_report(
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    section TEXT,
    account_code TEXT,
    account_name TEXT,
    amount NUMERIC,
    account_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH account_balances AS (
        SELECT 
            coa.id,
            coa.account_code,
            coa.account_name,
            coa.account_type,
            coa.normal_balance,
            COALESCE(SUM(
                CASE 
                    WHEN coa.account_type IN ('REVENUE') THEN gl.credit_amount - gl.debit_amount
                    WHEN coa.account_type IN ('EXPENSE', 'COST_OF_GOODS_SOLD') THEN gl.debit_amount - gl.credit_amount
                    ELSE 0
                END
            ), 0) as period_amount
        FROM chart_of_accounts coa
        LEFT JOIN general_ledger gl ON coa.id = gl.account_id 
            AND gl.transaction_date BETWEEN p_start_date AND p_end_date
        WHERE coa.account_type IN ('REVENUE', 'EXPENSE', 'COST_OF_GOODS_SOLD')
        GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.normal_balance
        HAVING COALESCE(SUM(
            CASE 
                WHEN coa.account_type IN ('REVENUE') THEN gl.credit_amount - gl.debit_amount
                WHEN coa.account_type IN ('EXPENSE', 'COST_OF_GOODS_SOLD') THEN gl.debit_amount - gl.credit_amount
                ELSE 0
            END
        ), 0) != 0
    )
    SELECT 
        CASE 
            WHEN ab.account_type = 'REVENUE' THEN 'REVENUE'
            WHEN ab.account_type = 'COST_OF_GOODS_SOLD' THEN 'COST_OF_GOODS_SOLD'
            WHEN ab.account_type = 'EXPENSE' THEN 'EXPENSES'
            ELSE 'OTHER'
        END as section,
        ab.account_code::TEXT,
        ab.account_name::TEXT,
        ab.period_amount,
        ab.account_type::TEXT
    FROM account_balances ab
    ORDER BY 
        CASE 
            WHEN ab.account_type = 'REVENUE' THEN 1
            WHEN ab.account_type = 'COST_OF_GOODS_SOLD' THEN 2
            WHEN ab.account_type = 'EXPENSE' THEN 3
            ELSE 4
        END,
        ab.account_code;
END;
$$ LANGUAGE plpgsql;

-- Balance Sheet Report Function
CREATE OR REPLACE FUNCTION generate_balance_sheet_report(
    p_as_of_date DATE
) RETURNS TABLE (
    section TEXT,
    account_code TEXT,
    account_name TEXT,
    amount NUMERIC,
    account_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH account_balances AS (
        SELECT 
            coa.id,
            coa.account_code,
            coa.account_name,
            coa.account_type,
            coa.normal_balance,
            COALESCE(ob.balance_amount, 0) + COALESCE(SUM(
                CASE 
                    WHEN coa.normal_balance = 'DEBIT' THEN gl.debit_amount - gl.credit_amount
                    ELSE gl.credit_amount - gl.debit_amount
                END
            ), 0) as balance_amount
        FROM chart_of_accounts coa
        LEFT JOIN opening_balances ob ON coa.id = ob.account_id
        LEFT JOIN general_ledger gl ON coa.id = gl.account_id 
            AND gl.transaction_date <= p_as_of_date
        WHERE coa.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
        GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, coa.normal_balance, ob.balance_amount
    )
    SELECT 
        CASE 
            WHEN ab.account_type = 'ASSET' THEN 'ASSETS'
            WHEN ab.account_type = 'LIABILITY' THEN 'LIABILITIES'
            WHEN ab.account_type = 'EQUITY' THEN 'EQUITY'
            ELSE 'OTHER'
        END as section,
        ab.account_code::TEXT,
        ab.account_name::TEXT,
        ab.balance_amount,
        ab.account_type::TEXT
    FROM account_balances ab
    WHERE ab.balance_amount != 0
    ORDER BY 
        CASE 
            WHEN ab.account_type = 'ASSET' THEN 1
            WHEN ab.account_type = 'LIABILITY' THEN 2
            WHEN ab.account_type = 'EQUITY' THEN 3
            ELSE 4
        END,
        ab.account_code;
END;
$$ LANGUAGE plpgsql;
```

## 🚀 DEPLOYMENT ORDER

1. **Create sequences** first
2. **Deploy stored procedures** in order:
   - create_opening_balance
   - create_payment_with_accounting  
   - create_journal_entry_with_lines
   - generate_profit_loss_report
   - generate_balance_sheet_report
3. **Deploy the triggers** (from FINANCE_TRIGGERS_AND_FIXES.md)
4. **Deploy APIs** (from FINANCE_BACKEND_API_FIXES.md)
5. **Test with sample data**

These stored procedures will enable your finance system to work as proper double-entry accounting!
