-- Deploy missing helper functions that triggers depend on
-- This fixes the issue where payment triggers fail silently

-- Function to create journal entry
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
    
    -- If still no user, use null (it's allowed in the schema)
    IF system_user_id IS NULL THEN
        RAISE WARNING 'No users found in system. Creating journal entry without user reference.';
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

-- Verify the functions were created successfully
SELECT 
    'create_journal_entry' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'create_journal_entry'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'add_journal_entry_line' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'add_journal_entry_line'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
    'post_journal_entry' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'post_journal_entry'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;
