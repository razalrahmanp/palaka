[
  {
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "table_name": "bank_transactions",
    "event": "DELETE",
    "function_name": "sync_bank_account_to_chart_of_accounts",
    "function_source": "\r\nDECLARE\r\n    cash_account_id UUID;\r\n    ar_account_id UUID;\r\n    journal_id UUID;\r\n    bank_account_name TEXT;\r\n    transaction_amount DECIMAL;\r\n    is_deposit BOOLEAN;\r\nBEGIN\r\n    -- Determine if this is a deposit or withdrawal\r\n    IF TG_OP = 'INSERT' THEN\r\n        is_deposit := (NEW.type = 'deposit' OR NEW.type = 'credit' OR NEW.type = 'CREDIT');\r\n        transaction_amount := NEW.amount;\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = NEW.bank_account_id;\r\n        \r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        -- For updates, calculate the difference\r\n        is_deposit := ((NEW.type = 'deposit' OR NEW.type = 'credit' OR NEW.type = 'CREDIT') AND \r\n                      (OLD.type != 'deposit' AND OLD.type != 'credit' AND OLD.type != 'CREDIT')) OR\r\n                     (NEW.amount > OLD.amount);\r\n        transaction_amount := ABS(NEW.amount - OLD.amount);\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = NEW.bank_account_id;\r\n        \r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        -- For deletes, reverse the transaction\r\n        is_deposit := NOT (OLD.type = 'deposit' OR OLD.type = 'credit' OR OLD.type = 'CREDIT');\r\n        transaction_amount := OLD.amount;\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = OLD.bank_account_id;\r\n    END IF;\r\n    \r\n    -- Skip if amount is zero\r\n    IF transaction_amount IS NULL OR transaction_amount = 0 THEN\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Get Cash account from chart of accounts (account code 1010)\r\n    SELECT id INTO cash_account_id \r\n    FROM chart_of_accounts \r\n    WHERE account_code IN ('1010', '1001') \r\n    ORDER BY account_code \r\n    LIMIT 1;\r\n    \r\n    -- Get Accounts Receivable account (account code 1200) for contra entry\r\n    SELECT id INTO ar_account_id \r\n    FROM chart_of_accounts \r\n    WHERE account_code IN ('1200', '1100') \r\n    ORDER BY account_code \r\n    LIMIT 1;\r\n    \r\n    -- Skip if cash account not found\r\n    IF cash_account_id IS NULL THEN\r\n        RAISE WARNING 'Cash account (1010/1001) not found in chart of accounts. Skipping bank transaction sync.';\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Skip if AR account not found  \r\n    IF ar_account_id IS NULL THEN\r\n        RAISE WARNING 'Accounts Receivable account (1200/1100) not found in chart of accounts. Skipping bank transaction sync.';\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Create journal entry to sync bank transaction with chart of accounts\r\n    journal_id := create_journal_entry(\r\n        COALESCE(NEW.date::date, OLD.date::date, CURRENT_DATE),\r\n        CASE \r\n            WHEN TG_OP = 'DELETE' THEN 'Reversal - Bank transaction deleted from ' || COALESCE(bank_account_name, 'Bank Account')\r\n            WHEN is_deposit THEN 'Bank deposit to ' || COALESCE(bank_account_name, 'Bank Account')\r\n            ELSE 'Bank withdrawal from ' || COALESCE(bank_account_name, 'Bank Account')\r\n        END,\r\n        CASE \r\n            WHEN TG_OP = 'INSERT' THEN 'BT-' || NEW.id::text\r\n            WHEN TG_OP = 'UPDATE' THEN 'BT-UPD-' || NEW.id::text  \r\n            ELSE 'BT-DEL-' || OLD.id::text\r\n        END\r\n    );\r\n    \r\n    IF is_deposit THEN\r\n        -- For deposits: Debit Cash (increase asset), Credit AR (decrease receivable)\r\n        PERFORM add_journal_entry_line(journal_id, cash_account_id, transaction_amount, 0, 'Cash received');\r\n        PERFORM add_journal_entry_line(journal_id, ar_account_id, 0, transaction_amount, 'Bank deposit applied');\r\n    ELSE\r\n        -- For withdrawals: Credit Cash (decrease asset), Debit AR (increase receivable)  \r\n        PERFORM add_journal_entry_line(journal_id, cash_account_id, 0, transaction_amount, 'Cash paid');\r\n        PERFORM add_journal_entry_line(journal_id, ar_account_id, transaction_amount, 0, 'Bank withdrawal');\r\n    END IF;\r\n    \r\n    -- Post the journal entry to update chart of accounts balances\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\n    \r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the bank transaction\r\n        RAISE WARNING 'Failed to sync bank transaction to chart of accounts: %', SQLERRM;\r\n        RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "table_name": "bank_transactions",
    "event": "INSERT",
    "function_name": "sync_bank_account_to_chart_of_accounts",
    "function_source": "\r\nDECLARE\r\n    cash_account_id UUID;\r\n    ar_account_id UUID;\r\n    journal_id UUID;\r\n    bank_account_name TEXT;\r\n    transaction_amount DECIMAL;\r\n    is_deposit BOOLEAN;\r\nBEGIN\r\n    -- Determine if this is a deposit or withdrawal\r\n    IF TG_OP = 'INSERT' THEN\r\n        is_deposit := (NEW.type = 'deposit' OR NEW.type = 'credit' OR NEW.type = 'CREDIT');\r\n        transaction_amount := NEW.amount;\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = NEW.bank_account_id;\r\n        \r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        -- For updates, calculate the difference\r\n        is_deposit := ((NEW.type = 'deposit' OR NEW.type = 'credit' OR NEW.type = 'CREDIT') AND \r\n                      (OLD.type != 'deposit' AND OLD.type != 'credit' AND OLD.type != 'CREDIT')) OR\r\n                     (NEW.amount > OLD.amount);\r\n        transaction_amount := ABS(NEW.amount - OLD.amount);\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = NEW.bank_account_id;\r\n        \r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        -- For deletes, reverse the transaction\r\n        is_deposit := NOT (OLD.type = 'deposit' OR OLD.type = 'credit' OR OLD.type = 'CREDIT');\r\n        transaction_amount := OLD.amount;\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = OLD.bank_account_id;\r\n    END IF;\r\n    \r\n    -- Skip if amount is zero\r\n    IF transaction_amount IS NULL OR transaction_amount = 0 THEN\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Get Cash account from chart of accounts (account code 1010)\r\n    SELECT id INTO cash_account_id \r\n    FROM chart_of_accounts \r\n    WHERE account_code IN ('1010', '1001') \r\n    ORDER BY account_code \r\n    LIMIT 1;\r\n    \r\n    -- Get Accounts Receivable account (account code 1200) for contra entry\r\n    SELECT id INTO ar_account_id \r\n    FROM chart_of_accounts \r\n    WHERE account_code IN ('1200', '1100') \r\n    ORDER BY account_code \r\n    LIMIT 1;\r\n    \r\n    -- Skip if cash account not found\r\n    IF cash_account_id IS NULL THEN\r\n        RAISE WARNING 'Cash account (1010/1001) not found in chart of accounts. Skipping bank transaction sync.';\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Skip if AR account not found  \r\n    IF ar_account_id IS NULL THEN\r\n        RAISE WARNING 'Accounts Receivable account (1200/1100) not found in chart of accounts. Skipping bank transaction sync.';\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Create journal entry to sync bank transaction with chart of accounts\r\n    journal_id := create_journal_entry(\r\n        COALESCE(NEW.date::date, OLD.date::date, CURRENT_DATE),\r\n        CASE \r\n            WHEN TG_OP = 'DELETE' THEN 'Reversal - Bank transaction deleted from ' || COALESCE(bank_account_name, 'Bank Account')\r\n            WHEN is_deposit THEN 'Bank deposit to ' || COALESCE(bank_account_name, 'Bank Account')\r\n            ELSE 'Bank withdrawal from ' || COALESCE(bank_account_name, 'Bank Account')\r\n        END,\r\n        CASE \r\n            WHEN TG_OP = 'INSERT' THEN 'BT-' || NEW.id::text\r\n            WHEN TG_OP = 'UPDATE' THEN 'BT-UPD-' || NEW.id::text  \r\n            ELSE 'BT-DEL-' || OLD.id::text\r\n        END\r\n    );\r\n    \r\n    IF is_deposit THEN\r\n        -- For deposits: Debit Cash (increase asset), Credit AR (decrease receivable)\r\n        PERFORM add_journal_entry_line(journal_id, cash_account_id, transaction_amount, 0, 'Cash received');\r\n        PERFORM add_journal_entry_line(journal_id, ar_account_id, 0, transaction_amount, 'Bank deposit applied');\r\n    ELSE\r\n        -- For withdrawals: Credit Cash (decrease asset), Debit AR (increase receivable)  \r\n        PERFORM add_journal_entry_line(journal_id, cash_account_id, 0, transaction_amount, 'Cash paid');\r\n        PERFORM add_journal_entry_line(journal_id, ar_account_id, transaction_amount, 0, 'Bank withdrawal');\r\n    END IF;\r\n    \r\n    -- Post the journal entry to update chart of accounts balances\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\n    \r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the bank transaction\r\n        RAISE WARNING 'Failed to sync bank transaction to chart of accounts: %', SQLERRM;\r\n        RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_bank_transactions_sync_chart_accounts",
    "table_name": "bank_transactions",
    "event": "UPDATE",
    "function_name": "sync_bank_account_to_chart_of_accounts",
    "function_source": "\r\nDECLARE\r\n    cash_account_id UUID;\r\n    ar_account_id UUID;\r\n    journal_id UUID;\r\n    bank_account_name TEXT;\r\n    transaction_amount DECIMAL;\r\n    is_deposit BOOLEAN;\r\nBEGIN\r\n    -- Determine if this is a deposit or withdrawal\r\n    IF TG_OP = 'INSERT' THEN\r\n        is_deposit := (NEW.type = 'deposit' OR NEW.type = 'credit' OR NEW.type = 'CREDIT');\r\n        transaction_amount := NEW.amount;\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = NEW.bank_account_id;\r\n        \r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        -- For updates, calculate the difference\r\n        is_deposit := ((NEW.type = 'deposit' OR NEW.type = 'credit' OR NEW.type = 'CREDIT') AND \r\n                      (OLD.type != 'deposit' AND OLD.type != 'credit' AND OLD.type != 'CREDIT')) OR\r\n                     (NEW.amount > OLD.amount);\r\n        transaction_amount := ABS(NEW.amount - OLD.amount);\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = NEW.bank_account_id;\r\n        \r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        -- For deletes, reverse the transaction\r\n        is_deposit := NOT (OLD.type = 'deposit' OR OLD.type = 'credit' OR OLD.type = 'CREDIT');\r\n        transaction_amount := OLD.amount;\r\n        \r\n        -- Get bank account name for description\r\n        SELECT name INTO bank_account_name \r\n        FROM bank_accounts \r\n        WHERE id = OLD.bank_account_id;\r\n    END IF;\r\n    \r\n    -- Skip if amount is zero\r\n    IF transaction_amount IS NULL OR transaction_amount = 0 THEN\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Get Cash account from chart of accounts (account code 1010)\r\n    SELECT id INTO cash_account_id \r\n    FROM chart_of_accounts \r\n    WHERE account_code IN ('1010', '1001') \r\n    ORDER BY account_code \r\n    LIMIT 1;\r\n    \r\n    -- Get Accounts Receivable account (account code 1200) for contra entry\r\n    SELECT id INTO ar_account_id \r\n    FROM chart_of_accounts \r\n    WHERE account_code IN ('1200', '1100') \r\n    ORDER BY account_code \r\n    LIMIT 1;\r\n    \r\n    -- Skip if cash account not found\r\n    IF cash_account_id IS NULL THEN\r\n        RAISE WARNING 'Cash account (1010/1001) not found in chart of accounts. Skipping bank transaction sync.';\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Skip if AR account not found  \r\n    IF ar_account_id IS NULL THEN\r\n        RAISE WARNING 'Accounts Receivable account (1200/1100) not found in chart of accounts. Skipping bank transaction sync.';\r\n        RETURN COALESCE(NEW, OLD);\r\n    END IF;\r\n    \r\n    -- Create journal entry to sync bank transaction with chart of accounts\r\n    journal_id := create_journal_entry(\r\n        COALESCE(NEW.date::date, OLD.date::date, CURRENT_DATE),\r\n        CASE \r\n            WHEN TG_OP = 'DELETE' THEN 'Reversal - Bank transaction deleted from ' || COALESCE(bank_account_name, 'Bank Account')\r\n            WHEN is_deposit THEN 'Bank deposit to ' || COALESCE(bank_account_name, 'Bank Account')\r\n            ELSE 'Bank withdrawal from ' || COALESCE(bank_account_name, 'Bank Account')\r\n        END,\r\n        CASE \r\n            WHEN TG_OP = 'INSERT' THEN 'BT-' || NEW.id::text\r\n            WHEN TG_OP = 'UPDATE' THEN 'BT-UPD-' || NEW.id::text  \r\n            ELSE 'BT-DEL-' || OLD.id::text\r\n        END\r\n    );\r\n    \r\n    IF is_deposit THEN\r\n        -- For deposits: Debit Cash (increase asset), Credit AR (decrease receivable)\r\n        PERFORM add_journal_entry_line(journal_id, cash_account_id, transaction_amount, 0, 'Cash received');\r\n        PERFORM add_journal_entry_line(journal_id, ar_account_id, 0, transaction_amount, 'Bank deposit applied');\r\n    ELSE\r\n        -- For withdrawals: Credit Cash (decrease asset), Debit AR (increase receivable)  \r\n        PERFORM add_journal_entry_line(journal_id, cash_account_id, 0, transaction_amount, 'Cash paid');\r\n        PERFORM add_journal_entry_line(journal_id, ar_account_id, transaction_amount, 0, 'Bank withdrawal');\r\n    END IF;\r\n    \r\n    -- Post the journal entry to update chart of accounts balances\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\n    \r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the bank transaction\r\n        RAISE WARNING 'Failed to sync bank transaction to chart of accounts: %', SQLERRM;\r\n        RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "enforce_bucket_name_length_trigger",
    "table_name": "buckets",
    "event": "INSERT",
    "function_name": "enforce_bucket_name_length",
    "function_source": "\nbegin\n    if length(new.name) > 100 then\n        raise exception 'bucket name \"%\" is too long (% characters). Max is 100.', new.name, length(new.name);\n    end if;\n    return new;\nend;\n",
    "enabled": "O",
    "type_flags": 23
  },
  {
    "trigger_name": "enforce_bucket_name_length_trigger",
    "table_name": "buckets",
    "event": "UPDATE",
    "function_name": "enforce_bucket_name_length",
    "function_source": "\nbegin\n    if length(new.name) > 100 then\n        raise exception 'bucket name \"%\" is too long (% characters). Max is 100.', new.name, length(new.name);\n    end if;\n    return new;\nend;\n",
    "enabled": "O",
    "type_flags": 23
  },
  {
    "trigger_name": "audit_chart_of_accounts",
    "table_name": "chart_of_accounts",
    "event": "UPDATE",
    "function_name": "create_audit_trail",
    "function_source": "\r\nDECLARE\r\n  audit_action audit_action;\r\n  old_data JSONB;\r\n  new_data JSONB;\r\nBEGIN\r\n  -- Determine action\r\n  IF TG_OP = 'DELETE' THEN\r\n    audit_action := 'DELETE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := NULL;\r\n  ELSIF TG_OP = 'UPDATE' THEN\r\n    audit_action := 'UPDATE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  ELSIF TG_OP = 'INSERT' THEN\r\n    audit_action := 'CREATE';\r\n    old_data := NULL;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  END IF;\r\n\r\n  -- Insert audit record\r\n  INSERT INTO audit_trail (\r\n    table_name,\r\n    record_id,\r\n    action,\r\n    old_values,\r\n    new_values,\r\n    user_id,\r\n    timestamp\r\n  ) VALUES (\r\n    TG_TABLE_NAME,\r\n    COALESCE(NEW.id, OLD.id),\r\n    audit_action,\r\n    old_data,\r\n    new_data,\r\n    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),\r\n    NOW()\r\n  );\r\n\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "audit_chart_of_accounts",
    "table_name": "chart_of_accounts",
    "event": "DELETE",
    "function_name": "create_audit_trail",
    "function_source": "\r\nDECLARE\r\n  audit_action audit_action;\r\n  old_data JSONB;\r\n  new_data JSONB;\r\nBEGIN\r\n  -- Determine action\r\n  IF TG_OP = 'DELETE' THEN\r\n    audit_action := 'DELETE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := NULL;\r\n  ELSIF TG_OP = 'UPDATE' THEN\r\n    audit_action := 'UPDATE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  ELSIF TG_OP = 'INSERT' THEN\r\n    audit_action := 'CREATE';\r\n    old_data := NULL;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  END IF;\r\n\r\n  -- Insert audit record\r\n  INSERT INTO audit_trail (\r\n    table_name,\r\n    record_id,\r\n    action,\r\n    old_values,\r\n    new_values,\r\n    user_id,\r\n    timestamp\r\n  ) VALUES (\r\n    TG_TABLE_NAME,\r\n    COALESCE(NEW.id, OLD.id),\r\n    audit_action,\r\n    old_data,\r\n    new_data,\r\n    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),\r\n    NOW()\r\n  );\r\n\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "audit_chart_of_accounts",
    "table_name": "chart_of_accounts",
    "event": "INSERT",
    "function_name": "create_audit_trail",
    "function_source": "\r\nDECLARE\r\n  audit_action audit_action;\r\n  old_data JSONB;\r\n  new_data JSONB;\r\nBEGIN\r\n  -- Determine action\r\n  IF TG_OP = 'DELETE' THEN\r\n    audit_action := 'DELETE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := NULL;\r\n  ELSIF TG_OP = 'UPDATE' THEN\r\n    audit_action := 'UPDATE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  ELSIF TG_OP = 'INSERT' THEN\r\n    audit_action := 'CREATE';\r\n    old_data := NULL;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  END IF;\r\n\r\n  -- Insert audit record\r\n  INSERT INTO audit_trail (\r\n    table_name,\r\n    record_id,\r\n    action,\r\n    old_values,\r\n    new_values,\r\n    user_id,\r\n    timestamp\r\n  ) VALUES (\r\n    TG_TABLE_NAME,\r\n    COALESCE(NEW.id, OLD.id),\r\n    audit_action,\r\n    old_data,\r\n    new_data,\r\n    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),\r\n    NOW()\r\n  );\r\n\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_chart_of_accounts_opening_balance",
    "table_name": "chart_of_accounts",
    "event": "INSERT",
    "function_name": "trigger_create_opening_balance",
    "function_source": "\r\nBEGIN\r\n    -- Create opening balance entry if opening_balance is set\r\n    IF NEW.opening_balance IS NOT NULL AND NEW.opening_balance != 0 THEN\r\n        INSERT INTO opening_balances (\r\n            account_id,\r\n            opening_date,\r\n            debit_amount,\r\n            credit_amount\r\n        ) VALUES (\r\n            NEW.id,\r\n            CURRENT_DATE,\r\n            CASE WHEN NEW.normal_balance = 'DEBIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END,\r\n            CASE WHEN NEW.normal_balance = 'CREDIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END\r\n        )\r\n        ON CONFLICT (account_id) DO UPDATE SET\r\n            debit_amount = CASE WHEN NEW.normal_balance = 'DEBIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END,\r\n            credit_amount = CASE WHEN NEW.normal_balance = 'CREDIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 21
  },
  {
    "trigger_name": "trg_chart_of_accounts_opening_balance",
    "table_name": "chart_of_accounts",
    "event": "UPDATE",
    "function_name": "trigger_create_opening_balance",
    "function_source": "\r\nBEGIN\r\n    -- Create opening balance entry if opening_balance is set\r\n    IF NEW.opening_balance IS NOT NULL AND NEW.opening_balance != 0 THEN\r\n        INSERT INTO opening_balances (\r\n            account_id,\r\n            opening_date,\r\n            debit_amount,\r\n            credit_amount\r\n        ) VALUES (\r\n            NEW.id,\r\n            CURRENT_DATE,\r\n            CASE WHEN NEW.normal_balance = 'DEBIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END,\r\n            CASE WHEN NEW.normal_balance = 'CREDIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END\r\n        )\r\n        ON CONFLICT (account_id) DO UPDATE SET\r\n            debit_amount = CASE WHEN NEW.normal_balance = 'DEBIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END,\r\n            credit_amount = CASE WHEN NEW.normal_balance = 'CREDIT' AND NEW.opening_balance > 0 THEN NEW.opening_balance ELSE 0 END;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 21
  },
  {
    "trigger_name": "trg_chart_of_accounts_timestamp",
    "table_name": "chart_of_accounts",
    "event": "UPDATE",
    "function_name": "trigger_update_timestamp",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = CURRENT_TIMESTAMP;\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "chat_room_last_message_trigger",
    "table_name": "chat_messages",
    "event": "INSERT",
    "function_name": "update_chat_room_last_message",
    "function_source": "\r\nBEGIN\r\n    IF TG_OP = 'INSERT' THEN\r\n        UPDATE chat_rooms \r\n        SET last_message_at = NEW.sent_at\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        UPDATE chat_rooms \r\n        SET last_message_at = NEW.sent_at\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    END IF;\r\n    RETURN NULL;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 21
  },
  {
    "trigger_name": "chat_room_last_message_trigger",
    "table_name": "chat_messages",
    "event": "UPDATE",
    "function_name": "update_chat_room_last_message",
    "function_source": "\r\nBEGIN\r\n    IF TG_OP = 'INSERT' THEN\r\n        UPDATE chat_rooms \r\n        SET last_message_at = NEW.sent_at\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        UPDATE chat_rooms \r\n        SET last_message_at = NEW.sent_at\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    END IF;\r\n    RETURN NULL;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 21
  },
  {
    "trigger_name": "trigger_create_message_notifications",
    "table_name": "chat_messages",
    "event": "INSERT",
    "function_name": "create_message_notifications",
    "function_source": "\r\nBEGIN\r\n    -- Create notifications for all participants except the sender\r\n    INSERT INTO chat_notifications (user_id, room_id, message_id, type)\r\n    SELECT \r\n        cp.user_id,\r\n        NEW.room_id,\r\n        NEW.id,\r\n        'message'\r\n    FROM chat_participants cp\r\n    WHERE cp.room_id = NEW.room_id \r\n    AND cp.user_id != NEW.sender_id\r\n    AND cp.is_active = true;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 5
  },
  {
    "trigger_name": "chat_participant_count_trigger",
    "table_name": "chat_participants",
    "event": "UPDATE",
    "function_name": "update_chat_room_participant_count",
    "function_source": "\r\nBEGIN\r\n    IF TG_OP = 'INSERT' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = NEW.room_id AND is_active = true\r\n        )\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = NEW.room_id AND is_active = true\r\n        )\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = OLD.room_id AND is_active = true\r\n        )\r\n        WHERE id = OLD.room_id;\r\n        RETURN OLD;\r\n    END IF;\r\n    RETURN NULL;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "chat_participant_count_trigger",
    "table_name": "chat_participants",
    "event": "INSERT",
    "function_name": "update_chat_room_participant_count",
    "function_source": "\r\nBEGIN\r\n    IF TG_OP = 'INSERT' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = NEW.room_id AND is_active = true\r\n        )\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = NEW.room_id AND is_active = true\r\n        )\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = OLD.room_id AND is_active = true\r\n        )\r\n        WHERE id = OLD.room_id;\r\n        RETURN OLD;\r\n    END IF;\r\n    RETURN NULL;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "chat_participant_count_trigger",
    "table_name": "chat_participants",
    "event": "DELETE",
    "function_name": "update_chat_room_participant_count",
    "function_source": "\r\nBEGIN\r\n    IF TG_OP = 'INSERT' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = NEW.room_id AND is_active = true\r\n        )\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'UPDATE' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = NEW.room_id AND is_active = true\r\n        )\r\n        WHERE id = NEW.room_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        UPDATE chat_rooms \r\n        SET participant_count = (\r\n            SELECT COUNT(*) \r\n            FROM chat_participants \r\n            WHERE room_id = OLD.room_id AND is_active = true\r\n        )\r\n        WHERE id = OLD.room_id;\r\n        RETURN OLD;\r\n    END IF;\r\n    RETURN NULL;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_add_creator_as_participant",
    "table_name": "chat_rooms",
    "event": "INSERT",
    "function_name": "add_creator_as_participant",
    "function_source": "\r\nBEGIN\r\n    INSERT INTO chat_participants (room_id, user_id, role)\r\n    VALUES (NEW.id, NEW.created_by, 'admin')\r\n    ON CONFLICT (room_id, user_id) DO NOTHING;\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 5
  },
  {
    "trigger_name": "update_chat_rooms_updated_at",
    "table_name": "chat_rooms",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "calculate_cost_price_trigger",
    "table_name": "custom_products",
    "event": "INSERT",
    "function_name": "calculate_custom_product_cost_price",
    "function_source": "\r\nBEGIN\r\n    -- If cost_price is null but price (MRP) is set, calculate cost_price\r\n    -- Using a default margin of 30% (cost = 70% of MRP)\r\n    IF NEW.cost_price IS NULL AND NEW.price IS NOT NULL AND NEW.price > 0 THEN\r\n        NEW.cost_price := ROUND(NEW.price * 0.70, 2);  -- 30% margin\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 23
  },
  {
    "trigger_name": "calculate_cost_price_trigger",
    "table_name": "custom_products",
    "event": "UPDATE",
    "function_name": "calculate_custom_product_cost_price",
    "function_source": "\r\nBEGIN\r\n    -- If cost_price is null but price (MRP) is set, calculate cost_price\r\n    -- Using a default margin of 30% (cost = 70% of MRP)\r\n    IF NEW.cost_price IS NULL AND NEW.price IS NOT NULL AND NEW.price > 0 THEN\r\n        NEW.cost_price := ROUND(NEW.price * 0.70, 2);  -- 30% margin\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 23
  },
  {
    "trigger_name": "trg_customers_set_updated_at",
    "table_name": "customers",
    "event": "UPDATE",
    "function_name": "set_updated_at",
    "function_source": "\r\nBEGIN\r\n  NEW.updated_at = now();\r\n  RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "trg_customers_updated_at",
    "table_name": "customers",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "trigger_update_route_efficiency",
    "table_name": "deliveries",
    "event": "DELETE",
    "function_name": "update_route_efficiency",
    "function_source": "\r\nBEGIN\r\n    -- Update route statistics and efficiency\r\n    UPDATE delivery_routes \r\n    SET \r\n        route_efficiency_score = (\r\n            SELECT \r\n                CASE \r\n                    WHEN total_deliveries = 0 THEN 0\r\n                    ELSE ROUND(\r\n                        (completed_deliveries::numeric / total_deliveries::numeric) * 100 * \r\n                        (1 - (COALESCE(route_distance, 0) / NULLIF(COALESCE(route_distance, 0) + 100, 0))), 2\r\n                    )\r\n                END\r\n        ),\r\n        current_load_items = (\r\n            SELECT COALESCE(SUM(di.quantity_to_deliver), 0)\r\n            FROM deliveries d\r\n            JOIN delivery_items di ON d.id = di.delivery_id\r\n            WHERE d.route_id = COALESCE(NEW.route_id, OLD.route_id) \r\n            AND di.item_status IN ('loaded', 'in_transit')\r\n        ),\r\n        updated_at = now()\r\n    WHERE id = COALESCE(NEW.route_id, OLD.route_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_route_efficiency",
    "table_name": "deliveries",
    "event": "INSERT",
    "function_name": "update_route_efficiency",
    "function_source": "\r\nBEGIN\r\n    -- Update route statistics and efficiency\r\n    UPDATE delivery_routes \r\n    SET \r\n        route_efficiency_score = (\r\n            SELECT \r\n                CASE \r\n                    WHEN total_deliveries = 0 THEN 0\r\n                    ELSE ROUND(\r\n                        (completed_deliveries::numeric / total_deliveries::numeric) * 100 * \r\n                        (1 - (COALESCE(route_distance, 0) / NULLIF(COALESCE(route_distance, 0) + 100, 0))), 2\r\n                    )\r\n                END\r\n        ),\r\n        current_load_items = (\r\n            SELECT COALESCE(SUM(di.quantity_to_deliver), 0)\r\n            FROM deliveries d\r\n            JOIN delivery_items di ON d.id = di.delivery_id\r\n            WHERE d.route_id = COALESCE(NEW.route_id, OLD.route_id) \r\n            AND di.item_status IN ('loaded', 'in_transit')\r\n        ),\r\n        updated_at = now()\r\n    WHERE id = COALESCE(NEW.route_id, OLD.route_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_route_efficiency",
    "table_name": "deliveries",
    "event": "UPDATE",
    "function_name": "update_route_efficiency",
    "function_source": "\r\nBEGIN\r\n    -- Update route statistics and efficiency\r\n    UPDATE delivery_routes \r\n    SET \r\n        route_efficiency_score = (\r\n            SELECT \r\n                CASE \r\n                    WHEN total_deliveries = 0 THEN 0\r\n                    ELSE ROUND(\r\n                        (completed_deliveries::numeric / total_deliveries::numeric) * 100 * \r\n                        (1 - (COALESCE(route_distance, 0) / NULLIF(COALESCE(route_distance, 0) + 100, 0))), 2\r\n                    )\r\n                END\r\n        ),\r\n        current_load_items = (\r\n            SELECT COALESCE(SUM(di.quantity_to_deliver), 0)\r\n            FROM deliveries d\r\n            JOIN delivery_items di ON d.id = di.delivery_id\r\n            WHERE d.route_id = COALESCE(NEW.route_id, OLD.route_id) \r\n            AND di.item_status IN ('loaded', 'in_transit')\r\n        ),\r\n        updated_at = now()\r\n    WHERE id = COALESCE(NEW.route_id, OLD.route_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_delivery_status_from_items",
    "table_name": "delivery_items",
    "event": "DELETE",
    "function_name": "update_delivery_status_from_items",
    "function_source": "\r\nBEGIN\r\n  -- Update delivery status based on item statuses\r\n  -- Implementation depends on business logic\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_delivery_status_from_items",
    "table_name": "delivery_items",
    "event": "UPDATE",
    "function_name": "update_delivery_status_from_items",
    "function_source": "\r\nBEGIN\r\n  -- Update delivery status based on item statuses\r\n  -- Implementation depends on business logic\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_delivery_status_from_items",
    "table_name": "delivery_items",
    "event": "INSERT",
    "function_name": "update_delivery_status_from_items",
    "function_source": "\r\nBEGIN\r\n  -- Update delivery status based on item statuses\r\n  -- Implementation depends on business logic\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_sales_order_delivery_status",
    "table_name": "delivery_items",
    "event": "UPDATE",
    "function_name": "update_sales_order_delivery_status",
    "function_source": "\r\nBEGIN\r\n  -- Update sales order delivery status based on delivery items\r\n  -- Implementation depends on business logic\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 17
  },
  {
    "trigger_name": "trg_general_ledger_update_balance",
    "table_name": "general_ledger",
    "event": "UPDATE",
    "function_name": "trigger_update_account_balance",
    "function_source": "\r\nDECLARE\r\n    affected_account_id UUID;\r\nBEGIN\r\n    -- Handle different trigger events\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        affected_account_id := NEW.account_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        affected_account_id := OLD.account_id;\r\n        RETURN OLD;\r\n    END IF;\r\n    \r\n    -- Update account balance\r\n    UPDATE chart_of_accounts \r\n    SET \r\n        current_balance = calculate_account_balance(affected_account_id),\r\n        updated_at = CURRENT_TIMESTAMP\r\n    WHERE id = affected_account_id;\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_general_ledger_update_balance",
    "table_name": "general_ledger",
    "event": "DELETE",
    "function_name": "trigger_update_account_balance",
    "function_source": "\r\nDECLARE\r\n    affected_account_id UUID;\r\nBEGIN\r\n    -- Handle different trigger events\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        affected_account_id := NEW.account_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        affected_account_id := OLD.account_id;\r\n        RETURN OLD;\r\n    END IF;\r\n    \r\n    -- Update account balance\r\n    UPDATE chart_of_accounts \r\n    SET \r\n        current_balance = calculate_account_balance(affected_account_id),\r\n        updated_at = CURRENT_TIMESTAMP\r\n    WHERE id = affected_account_id;\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_general_ledger_update_balance",
    "table_name": "general_ledger",
    "event": "INSERT",
    "function_name": "trigger_update_account_balance",
    "function_source": "\r\nDECLARE\r\n    affected_account_id UUID;\r\nBEGIN\r\n    -- Handle different trigger events\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        affected_account_id := NEW.account_id;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        affected_account_id := OLD.account_id;\r\n        RETURN OLD;\r\n    END IF;\r\n    \r\n    -- Update account balance\r\n    UPDATE chart_of_accounts \r\n    SET \r\n        current_balance = calculate_account_balance(affected_account_id),\r\n        updated_at = CURRENT_TIMESTAMP\r\n    WHERE id = affected_account_id;\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_general_ledger_validate_account",
    "table_name": "general_ledger",
    "event": "INSERT",
    "function_name": "trigger_validate_account_usage",
    "function_source": "\r\nDECLARE\r\n    account_info RECORD;\r\nBEGIN\r\n    -- Get account information\r\n    SELECT account_type, is_active INTO account_info\r\n    FROM chart_of_accounts\r\n    WHERE id = NEW.account_id;\r\n    \r\n    -- Validate account is active\r\n    IF NOT account_info.is_active THEN\r\n        RAISE EXCEPTION 'Cannot post to inactive account';\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 23
  },
  {
    "trigger_name": "trg_general_ledger_validate_account",
    "table_name": "general_ledger",
    "event": "UPDATE",
    "function_name": "trigger_validate_account_usage",
    "function_source": "\r\nDECLARE\r\n    account_info RECORD;\r\nBEGIN\r\n    -- Get account information\r\n    SELECT account_type, is_active INTO account_info\r\n    FROM chart_of_accounts\r\n    WHERE id = NEW.account_id;\r\n    \r\n    -- Validate account is active\r\n    IF NOT account_info.is_active THEN\r\n        RAISE EXCEPTION 'Cannot post to inactive account';\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 23
  },
  {
    "trigger_name": "trigger_update_account_balance",
    "table_name": "general_ledger",
    "event": "DELETE",
    "function_name": "update_account_balance",
    "function_source": "\r\nBEGIN\r\n  IF TG_OP = 'INSERT' THEN\r\n    UPDATE chart_of_accounts \r\n    SET current_balance = CASE \r\n      WHEN normal_balance = 'DEBIT' \r\n      THEN current_balance + NEW.debit_amount - NEW.credit_amount\r\n      ELSE current_balance + NEW.credit_amount - NEW.debit_amount\r\n    END,\r\n    updated_at = NOW()\r\n    WHERE id = NEW.account_id;\r\n    \r\n    RETURN NEW;\r\n  ELSIF TG_OP = 'DELETE' THEN\r\n    UPDATE chart_of_accounts \r\n    SET current_balance = CASE \r\n      WHEN normal_balance = 'DEBIT' \r\n      THEN current_balance - OLD.debit_amount + OLD.credit_amount\r\n      ELSE current_balance - OLD.credit_amount + OLD.debit_amount\r\n    END,\r\n    updated_at = NOW()\r\n    WHERE id = OLD.account_id;\r\n    \r\n    RETURN OLD;\r\n  END IF;\r\n  \r\n  RETURN NULL;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 13
  },
  {
    "trigger_name": "trigger_update_account_balance",
    "table_name": "general_ledger",
    "event": "INSERT",
    "function_name": "update_account_balance",
    "function_source": "\r\nBEGIN\r\n  IF TG_OP = 'INSERT' THEN\r\n    UPDATE chart_of_accounts \r\n    SET current_balance = CASE \r\n      WHEN normal_balance = 'DEBIT' \r\n      THEN current_balance + NEW.debit_amount - NEW.credit_amount\r\n      ELSE current_balance + NEW.credit_amount - NEW.debit_amount\r\n    END,\r\n    updated_at = NOW()\r\n    WHERE id = NEW.account_id;\r\n    \r\n    RETURN NEW;\r\n  ELSIF TG_OP = 'DELETE' THEN\r\n    UPDATE chart_of_accounts \r\n    SET current_balance = CASE \r\n      WHEN normal_balance = 'DEBIT' \r\n      THEN current_balance - OLD.debit_amount + OLD.credit_amount\r\n      ELSE current_balance - OLD.credit_amount + OLD.debit_amount\r\n    END,\r\n    updated_at = NOW()\r\n    WHERE id = OLD.account_id;\r\n    \r\n    RETURN OLD;\r\n  END IF;\r\n  \r\n  RETURN NULL;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 13
  },
  {
    "trigger_name": "trg_invoices_create_journal",
    "table_name": "invoices",
    "event": "INSERT",
    "function_name": "trigger_create_sales_journal_entry",
    "function_source": "\r\nDECLARE\r\n    ar_account_id UUID;\r\n    sales_account_id UUID;\r\n    journal_id UUID;\r\n    customer_name TEXT;\r\n    amount_to_record DECIMAL;\r\nBEGIN\r\n    -- Determine amount to record with better logic\r\n    amount_to_record := COALESCE(NEW.final_price, NEW.total, NEW.total_price, NEW.grand_total, 0);\r\n    \r\n    -- Skip if total is null or zero\r\n    IF amount_to_record IS NULL OR amount_to_record = 0 THEN\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get account IDs with flexible lookup\r\n    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code IN ('1200', '1100') ORDER BY account_code LIMIT 1;\r\n    SELECT id INTO sales_account_id FROM chart_of_accounts WHERE account_code IN ('4010', '4000', '4001') ORDER BY account_code LIMIT 1;\r\n    \r\n    -- Skip if accounts not found but log warning\r\n    IF ar_account_id IS NULL OR sales_account_id IS NULL THEN\r\n        RAISE WARNING 'Required accounts not found for sales journal entry: AR=%, Sales=%. Available codes: %', \r\n            ar_account_id, sales_account_id,\r\n            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1200','1100','4010','4000','4001'));\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get customer name\r\n    customer_name := COALESCE(NEW.customer_name, 'Customer');\r\n    \r\n    -- Create journal entry for sale\r\n    journal_id := create_journal_entry(\r\n        CURRENT_DATE,\r\n        'Sale to ' || customer_name,\r\n        CASE \r\n            WHEN TG_TABLE_NAME = 'sales_orders' THEN 'SO-' || NEW.id::text\r\n            WHEN TG_TABLE_NAME = 'invoices' THEN 'INV-' || NEW.id::text\r\n            ELSE 'SALE-' || NEW.id::text\r\n        END\r\n    );\r\n    \r\n    -- Debit Accounts Receivable (increase asset)\r\n    PERFORM add_journal_entry_line(journal_id, ar_account_id, amount_to_record, 0, 'Invoice created');\r\n    \r\n    -- Credit Sales Revenue (increase revenue)\r\n    PERFORM add_journal_entry_line(journal_id, sales_account_id, 0, amount_to_record, 'Sales revenue');\r\n    \r\n    -- Post the journal entry\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN NEW;\r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the sale\r\n        RAISE WARNING 'Failed to create journal entry for sale %: %', NEW.id, SQLERRM;\r\n        RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 5
  },
  {
    "trigger_name": "audit_journal_entries",
    "table_name": "journal_entries",
    "event": "UPDATE",
    "function_name": "create_audit_trail",
    "function_source": "\r\nDECLARE\r\n  audit_action audit_action;\r\n  old_data JSONB;\r\n  new_data JSONB;\r\nBEGIN\r\n  -- Determine action\r\n  IF TG_OP = 'DELETE' THEN\r\n    audit_action := 'DELETE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := NULL;\r\n  ELSIF TG_OP = 'UPDATE' THEN\r\n    audit_action := 'UPDATE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  ELSIF TG_OP = 'INSERT' THEN\r\n    audit_action := 'CREATE';\r\n    old_data := NULL;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  END IF;\r\n\r\n  -- Insert audit record\r\n  INSERT INTO audit_trail (\r\n    table_name,\r\n    record_id,\r\n    action,\r\n    old_values,\r\n    new_values,\r\n    user_id,\r\n    timestamp\r\n  ) VALUES (\r\n    TG_TABLE_NAME,\r\n    COALESCE(NEW.id, OLD.id),\r\n    audit_action,\r\n    old_data,\r\n    new_data,\r\n    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),\r\n    NOW()\r\n  );\r\n\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "audit_journal_entries",
    "table_name": "journal_entries",
    "event": "INSERT",
    "function_name": "create_audit_trail",
    "function_source": "\r\nDECLARE\r\n  audit_action audit_action;\r\n  old_data JSONB;\r\n  new_data JSONB;\r\nBEGIN\r\n  -- Determine action\r\n  IF TG_OP = 'DELETE' THEN\r\n    audit_action := 'DELETE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := NULL;\r\n  ELSIF TG_OP = 'UPDATE' THEN\r\n    audit_action := 'UPDATE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  ELSIF TG_OP = 'INSERT' THEN\r\n    audit_action := 'CREATE';\r\n    old_data := NULL;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  END IF;\r\n\r\n  -- Insert audit record\r\n  INSERT INTO audit_trail (\r\n    table_name,\r\n    record_id,\r\n    action,\r\n    old_values,\r\n    new_values,\r\n    user_id,\r\n    timestamp\r\n  ) VALUES (\r\n    TG_TABLE_NAME,\r\n    COALESCE(NEW.id, OLD.id),\r\n    audit_action,\r\n    old_data,\r\n    new_data,\r\n    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),\r\n    NOW()\r\n  );\r\n\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "audit_journal_entries",
    "table_name": "journal_entries",
    "event": "DELETE",
    "function_name": "create_audit_trail",
    "function_source": "\r\nDECLARE\r\n  audit_action audit_action;\r\n  old_data JSONB;\r\n  new_data JSONB;\r\nBEGIN\r\n  -- Determine action\r\n  IF TG_OP = 'DELETE' THEN\r\n    audit_action := 'DELETE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := NULL;\r\n  ELSIF TG_OP = 'UPDATE' THEN\r\n    audit_action := 'UPDATE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  ELSIF TG_OP = 'INSERT' THEN\r\n    audit_action := 'CREATE';\r\n    old_data := NULL;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  END IF;\r\n\r\n  -- Insert audit record\r\n  INSERT INTO audit_trail (\r\n    table_name,\r\n    record_id,\r\n    action,\r\n    old_values,\r\n    new_values,\r\n    user_id,\r\n    timestamp\r\n  ) VALUES (\r\n    TG_TABLE_NAME,\r\n    COALESCE(NEW.id, OLD.id),\r\n    audit_action,\r\n    old_data,\r\n    new_data,\r\n    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),\r\n    NOW()\r\n  );\r\n\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_journal_entries_timestamp",
    "table_name": "journal_entries",
    "event": "UPDATE",
    "function_name": "trigger_update_timestamp",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = CURRENT_TIMESTAMP;\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "trg_journal_entries_validate_balance",
    "table_name": "journal_entries",
    "event": "UPDATE",
    "function_name": "trigger_validate_journal_balance",
    "function_source": "\r\nBEGIN\r\n    -- Only validate when status changes to POSTED\r\n    IF NEW.status = 'POSTED' AND OLD.status != 'POSTED' THEN\r\n        IF ABS(COALESCE(NEW.total_debit, 0) - COALESCE(NEW.total_credit, 0)) > 0.01 THEN\r\n            RAISE EXCEPTION 'Cannot post unbalanced journal entry. Debits: %, Credits: %', \r\n                NEW.total_debit, NEW.total_credit;\r\n        END IF;\r\n    END IF;\r\n    \r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "trigger_create_gl_entries",
    "table_name": "journal_entries",
    "event": "UPDATE",
    "function_name": "create_general_ledger_entries",
    "function_source": "\r\nDECLARE\r\n  line_rec RECORD;\r\n  running_balance NUMERIC(15,2);\r\nBEGIN\r\n  -- Only process when status changes to 'POSTED'\r\n  IF NEW.status = 'POSTED' AND (OLD.status IS NULL OR OLD.status != 'POSTED') THEN\r\n    \r\n    -- Process each journal entry line\r\n    FOR line_rec IN \r\n      SELECT * FROM journal_entry_lines \r\n      WHERE journal_entry_id = NEW.id \r\n      ORDER BY line_number\r\n    LOOP\r\n      -- Calculate running balance for the account\r\n      SELECT COALESCE(\r\n        (SELECT running_balance FROM general_ledger \r\n         WHERE account_id = line_rec.account_id \r\n         ORDER BY created_at DESC, id DESC \r\n         LIMIT 1), \r\n        (SELECT opening_balance FROM chart_of_accounts WHERE id = line_rec.account_id)\r\n      ) INTO running_balance;\r\n      \r\n      -- Update running balance\r\n      running_balance := running_balance + line_rec.debit_amount - line_rec.credit_amount;\r\n      \r\n      -- Insert into general ledger\r\n      INSERT INTO general_ledger (\r\n        account_id,\r\n        journal_entry_id,\r\n        journal_line_id,\r\n        transaction_date,\r\n        posting_date,\r\n        description,\r\n        reference,\r\n        debit_amount,\r\n        credit_amount,\r\n        running_balance,\r\n        source_document_type,\r\n        source_document_id\r\n      ) VALUES (\r\n        line_rec.account_id,\r\n        NEW.id,\r\n        line_rec.id,\r\n        NEW.entry_date,\r\n        NEW.posting_date,\r\n        line_rec.description,\r\n        NEW.reference_number,\r\n        line_rec.debit_amount,\r\n        line_rec.credit_amount,\r\n        running_balance,\r\n        NEW.source_document_type,\r\n        NEW.source_document_id\r\n      );\r\n    END LOOP;\r\n    \r\n    -- Update posting timestamp\r\n    UPDATE journal_entries \r\n    SET posted_at = NOW() \r\n    WHERE id = NEW.id;\r\n  END IF;\r\n  \r\n  RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 17
  },
  {
    "trigger_name": "update_journal_entries_updated_at",
    "table_name": "journal_entries",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "audit_journal_entry_lines",
    "table_name": "journal_entry_lines",
    "event": "UPDATE",
    "function_name": "create_audit_trail",
    "function_source": "\r\nDECLARE\r\n  audit_action audit_action;\r\n  old_data JSONB;\r\n  new_data JSONB;\r\nBEGIN\r\n  -- Determine action\r\n  IF TG_OP = 'DELETE' THEN\r\n    audit_action := 'DELETE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := NULL;\r\n  ELSIF TG_OP = 'UPDATE' THEN\r\n    audit_action := 'UPDATE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  ELSIF TG_OP = 'INSERT' THEN\r\n    audit_action := 'CREATE';\r\n    old_data := NULL;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  END IF;\r\n\r\n  -- Insert audit record\r\n  INSERT INTO audit_trail (\r\n    table_name,\r\n    record_id,\r\n    action,\r\n    old_values,\r\n    new_values,\r\n    user_id,\r\n    timestamp\r\n  ) VALUES (\r\n    TG_TABLE_NAME,\r\n    COALESCE(NEW.id, OLD.id),\r\n    audit_action,\r\n    old_data,\r\n    new_data,\r\n    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),\r\n    NOW()\r\n  );\r\n\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "audit_journal_entry_lines",
    "table_name": "journal_entry_lines",
    "event": "INSERT",
    "function_name": "create_audit_trail",
    "function_source": "\r\nDECLARE\r\n  audit_action audit_action;\r\n  old_data JSONB;\r\n  new_data JSONB;\r\nBEGIN\r\n  -- Determine action\r\n  IF TG_OP = 'DELETE' THEN\r\n    audit_action := 'DELETE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := NULL;\r\n  ELSIF TG_OP = 'UPDATE' THEN\r\n    audit_action := 'UPDATE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  ELSIF TG_OP = 'INSERT' THEN\r\n    audit_action := 'CREATE';\r\n    old_data := NULL;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  END IF;\r\n\r\n  -- Insert audit record\r\n  INSERT INTO audit_trail (\r\n    table_name,\r\n    record_id,\r\n    action,\r\n    old_values,\r\n    new_values,\r\n    user_id,\r\n    timestamp\r\n  ) VALUES (\r\n    TG_TABLE_NAME,\r\n    COALESCE(NEW.id, OLD.id),\r\n    audit_action,\r\n    old_data,\r\n    new_data,\r\n    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),\r\n    NOW()\r\n  );\r\n\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "audit_journal_entry_lines",
    "table_name": "journal_entry_lines",
    "event": "DELETE",
    "function_name": "create_audit_trail",
    "function_source": "\r\nDECLARE\r\n  audit_action audit_action;\r\n  old_data JSONB;\r\n  new_data JSONB;\r\nBEGIN\r\n  -- Determine action\r\n  IF TG_OP = 'DELETE' THEN\r\n    audit_action := 'DELETE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := NULL;\r\n  ELSIF TG_OP = 'UPDATE' THEN\r\n    audit_action := 'UPDATE';\r\n    old_data := row_to_json(OLD)::JSONB;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  ELSIF TG_OP = 'INSERT' THEN\r\n    audit_action := 'CREATE';\r\n    old_data := NULL;\r\n    new_data := row_to_json(NEW)::JSONB;\r\n  END IF;\r\n\r\n  -- Insert audit record\r\n  INSERT INTO audit_trail (\r\n    table_name,\r\n    record_id,\r\n    action,\r\n    old_values,\r\n    new_values,\r\n    user_id,\r\n    timestamp\r\n  ) VALUES (\r\n    TG_TABLE_NAME,\r\n    COALESCE(NEW.id, OLD.id),\r\n    audit_action,\r\n    old_data,\r\n    new_data,\r\n    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),\r\n    NOW()\r\n  );\r\n\r\n  RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_journal_lines_update_totals",
    "table_name": "journal_entry_lines",
    "event": "INSERT",
    "function_name": "trigger_update_journal_totals",
    "function_source": "\r\nDECLARE\r\n    je_id UUID;\r\nBEGIN\r\n    -- Get journal entry ID\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        je_id := NEW.journal_entry_id;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        je_id := OLD.journal_entry_id;\r\n    END IF;\r\n    \r\n    -- Update journal entry totals\r\n    UPDATE journal_entries \r\n    SET \r\n        total_debit = (\r\n            SELECT COALESCE(SUM(debit_amount), 0)\r\n            FROM journal_entry_lines \r\n            WHERE journal_entry_id = je_id\r\n        ),\r\n        total_credit = (\r\n            SELECT COALESCE(SUM(credit_amount), 0)\r\n            FROM journal_entry_lines \r\n            WHERE journal_entry_id = je_id\r\n        ),\r\n        updated_at = CURRENT_TIMESTAMP\r\n    WHERE id = je_id;\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_journal_lines_update_totals",
    "table_name": "journal_entry_lines",
    "event": "UPDATE",
    "function_name": "trigger_update_journal_totals",
    "function_source": "\r\nDECLARE\r\n    je_id UUID;\r\nBEGIN\r\n    -- Get journal entry ID\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        je_id := NEW.journal_entry_id;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        je_id := OLD.journal_entry_id;\r\n    END IF;\r\n    \r\n    -- Update journal entry totals\r\n    UPDATE journal_entries \r\n    SET \r\n        total_debit = (\r\n            SELECT COALESCE(SUM(debit_amount), 0)\r\n            FROM journal_entry_lines \r\n            WHERE journal_entry_id = je_id\r\n        ),\r\n        total_credit = (\r\n            SELECT COALESCE(SUM(credit_amount), 0)\r\n            FROM journal_entry_lines \r\n            WHERE journal_entry_id = je_id\r\n        ),\r\n        updated_at = CURRENT_TIMESTAMP\r\n    WHERE id = je_id;\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_journal_lines_update_totals",
    "table_name": "journal_entry_lines",
    "event": "DELETE",
    "function_name": "trigger_update_journal_totals",
    "function_source": "\r\nDECLARE\r\n    je_id UUID;\r\nBEGIN\r\n    -- Get journal entry ID\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        je_id := NEW.journal_entry_id;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        je_id := OLD.journal_entry_id;\r\n    END IF;\r\n    \r\n    -- Update journal entry totals\r\n    UPDATE journal_entries \r\n    SET \r\n        total_debit = (\r\n            SELECT COALESCE(SUM(debit_amount), 0)\r\n            FROM journal_entry_lines \r\n            WHERE journal_entry_id = je_id\r\n        ),\r\n        total_credit = (\r\n            SELECT COALESCE(SUM(credit_amount), 0)\r\n            FROM journal_entry_lines \r\n            WHERE journal_entry_id = je_id\r\n        ),\r\n        updated_at = CURRENT_TIMESTAMP\r\n    WHERE id = je_id;\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "update_journal_entry_lines_updated_at",
    "table_name": "journal_entry_lines",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "objects_delete_delete_prefix",
    "table_name": "objects",
    "event": "DELETE",
    "function_name": "delete_prefix_hierarchy_trigger",
    "function_source": "\nDECLARE\n    prefix text;\nBEGIN\n    prefix := \"storage\".\"get_prefix\"(OLD.\"name\");\n\n    IF coalesce(prefix, '') != '' THEN\n        PERFORM \"storage\".\"delete_prefix\"(OLD.\"bucket_id\", prefix);\n    END IF;\n\n    RETURN OLD;\nEND;\n",
    "enabled": "O",
    "type_flags": 9
  },
  {
    "trigger_name": "objects_insert_create_prefix",
    "table_name": "objects",
    "event": "INSERT",
    "function_name": "objects_insert_prefix_trigger",
    "function_source": "\nBEGIN\n    PERFORM \"storage\".\"add_prefixes\"(NEW.\"bucket_id\", NEW.\"name\");\n    NEW.level := \"storage\".\"get_level\"(NEW.\"name\");\n\n    RETURN NEW;\nEND;\n",
    "enabled": "O",
    "type_flags": 7
  },
  {
    "trigger_name": "objects_update_create_prefix",
    "table_name": "objects",
    "event": "UPDATE",
    "function_name": "objects_update_prefix_trigger",
    "function_source": "\nDECLARE\n    old_prefixes TEXT[];\nBEGIN\n    -- Ensure this is an update operation and the name has changed\n    IF TG_OP = 'UPDATE' AND (NEW.\"name\" <> OLD.\"name\" OR NEW.\"bucket_id\" <> OLD.\"bucket_id\") THEN\n        -- Retrieve old prefixes\n        old_prefixes := \"storage\".\"get_prefixes\"(OLD.\"name\");\n\n        -- Remove old prefixes that are only used by this object\n        WITH all_prefixes as (\n            SELECT unnest(old_prefixes) as prefix\n        ),\n        can_delete_prefixes as (\n             SELECT prefix\n             FROM all_prefixes\n             WHERE NOT EXISTS (\n                 SELECT 1 FROM \"storage\".\"objects\"\n                 WHERE \"bucket_id\" = OLD.\"bucket_id\"\n                   AND \"name\" <> OLD.\"name\"\n                   AND \"name\" LIKE (prefix || '%')\n             )\n         )\n        DELETE FROM \"storage\".\"prefixes\" WHERE name IN (SELECT prefix FROM can_delete_prefixes);\n\n        -- Add new prefixes\n        PERFORM \"storage\".\"add_prefixes\"(NEW.\"bucket_id\", NEW.\"name\");\n    END IF;\n    -- Set the new level\n    NEW.\"level\" := \"storage\".\"get_level\"(NEW.\"name\");\n\n    RETURN NEW;\nEND;\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "update_objects_updated_at",
    "table_name": "objects",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\nBEGIN\n    NEW.updated_at = now();\n    RETURN NEW; \nEND;\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "prefixes_create_hierarchy",
    "table_name": "prefixes",
    "event": "INSERT",
    "function_name": "prefixes_insert_trigger",
    "function_source": "\nBEGIN\n    PERFORM \"storage\".\"add_prefixes\"(NEW.\"bucket_id\", NEW.\"name\");\n    RETURN NEW;\nEND;\n",
    "enabled": "O",
    "type_flags": 7
  },
  {
    "trigger_name": "prefixes_delete_hierarchy",
    "table_name": "prefixes",
    "event": "DELETE",
    "function_name": "delete_prefix_hierarchy_trigger",
    "function_source": "\nDECLARE\n    prefix text;\nBEGIN\n    prefix := \"storage\".\"get_prefix\"(OLD.\"name\");\n\n    IF coalesce(prefix, '') != '' THEN\n        PERFORM \"storage\".\"delete_prefix\"(OLD.\"bucket_id\", prefix);\n    END IF;\n\n    RETURN OLD;\nEND;\n",
    "enabled": "O",
    "type_flags": 9
  },
  {
    "trigger_name": "trg_products_set_updated_at",
    "table_name": "products",
    "event": "UPDATE",
    "function_name": "set_updated_at",
    "function_source": "\r\nBEGIN\r\n  NEW.updated_at = now();\r\n  RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "trg_products_updated_at",
    "table_name": "products",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "update_purchase_order_items_updated_at",
    "table_name": "purchase_order_items",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "trg_purchase_orders_create_journal",
    "table_name": "purchase_orders",
    "event": "INSERT",
    "function_name": "trigger_create_purchase_journal_entry",
    "function_source": "\r\nDECLARE\r\n    inventory_account_id UUID;\r\n    ap_account_id UUID;\r\n    journal_id UUID;\r\n    supplier_name TEXT;\r\nBEGIN\r\n    -- Skip if no total amount\r\n    IF NEW.total IS NULL OR NEW.total = 0 THEN\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get account IDs with flexible lookup\r\n    SELECT id INTO inventory_account_id FROM chart_of_accounts WHERE account_code IN ('1300', '1350', '1320') ORDER BY account_code LIMIT 1;\r\n    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code IN ('2010', '2000') ORDER BY account_code LIMIT 1;\r\n    \r\n    -- Skip if accounts not found but log warning\r\n    IF inventory_account_id IS NULL OR ap_account_id IS NULL THEN\r\n        RAISE WARNING 'Required accounts not found for purchase journal entry: Inventory=%, AP=%. Available codes: %', \r\n            inventory_account_id, ap_account_id,\r\n            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1300','1350','1320','2010','2000'));\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get supplier name\r\n    IF NEW.supplier_id IS NOT NULL THEN\r\n        SELECT name INTO supplier_name FROM suppliers WHERE id = NEW.supplier_id;\r\n    END IF;\r\n    \r\n    -- Create journal entry for purchase\r\n    journal_id := create_journal_entry(\r\n        COALESCE(NEW.due_date, CURRENT_DATE),\r\n        'Purchase from ' || COALESCE(supplier_name, 'Supplier'),\r\n        'PO-' || NEW.id::text\r\n    );\r\n    \r\n    -- Debit Inventory (increase asset)\r\n    PERFORM add_journal_entry_line(journal_id, inventory_account_id, NEW.total, 0, 'Inventory purchased');\r\n    \r\n    -- Credit Accounts Payable (increase liability)\r\n    PERFORM add_journal_entry_line(journal_id, ap_account_id, 0, NEW.total, 'Amount owed to supplier');\r\n    \r\n    -- Post the journal entry\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN NEW;\r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the purchase order\r\n        RAISE WARNING 'Failed to create journal entry for purchase order %: %', NEW.id, SQLERRM;\r\n        RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 5
  },
  {
    "trigger_name": "calculate_sales_order_item_tax_trigger",
    "table_name": "sales_order_items",
    "event": "INSERT",
    "function_name": "calculate_sales_order_item_tax",
    "function_source": "\r\nDECLARE\r\n    item_tax_percentage DECIMAL(5,2);\r\nBEGIN\r\n    -- Get tax percentage from parent sales order or use item's own tax percentage\r\n    SELECT COALESCE(so.tax_percentage, NEW.tax_percentage, 18.00)\r\n    INTO item_tax_percentage\r\n    FROM sales_orders so\r\n    WHERE so.id = NEW.order_id;\r\n    \r\n    -- Calculate tax for this item\r\n    NEW.tax_percentage := item_tax_percentage;\r\n    NEW.taxable_amount := NEW.quantity * NEW.final_price;\r\n    NEW.tax_amount := ROUND(NEW.taxable_amount * item_tax_percentage / 100, 2);\r\n    \r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 23
  },
  {
    "trigger_name": "calculate_sales_order_item_tax_trigger",
    "table_name": "sales_order_items",
    "event": "UPDATE",
    "function_name": "calculate_sales_order_item_tax",
    "function_source": "\r\nDECLARE\r\n    item_tax_percentage DECIMAL(5,2);\r\nBEGIN\r\n    -- Get tax percentage from parent sales order or use item's own tax percentage\r\n    SELECT COALESCE(so.tax_percentage, NEW.tax_percentage, 18.00)\r\n    INTO item_tax_percentage\r\n    FROM sales_orders so\r\n    WHERE so.id = NEW.order_id;\r\n    \r\n    -- Calculate tax for this item\r\n    NEW.tax_percentage := item_tax_percentage;\r\n    NEW.taxable_amount := NEW.quantity * NEW.final_price;\r\n    NEW.tax_amount := ROUND(NEW.taxable_amount * item_tax_percentage / 100, 2);\r\n    \r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 23
  },
  {
    "trigger_name": "update_sales_order_item_totals_delete",
    "table_name": "sales_order_items",
    "event": "DELETE",
    "function_name": "update_sales_order_item_totals",
    "function_source": "\r\nDECLARE\r\n    order_original_price DECIMAL(15,2);\r\n    order_items_subtotal DECIMAL(15,2);\r\n    order_discount_amount DECIMAL(15,2);\r\n    current_freight DECIMAL(15,2);\r\n    current_tax_percentage DECIMAL(5,2);\r\n    current_tax_amount DECIMAL(15,2);\r\n    current_grand_total DECIMAL(15,2);\r\n    current_final_price DECIMAL(15,2);\r\nBEGIN\r\n    -- Get current values to preserve UI calculations\r\n    SELECT \r\n        COALESCE(freight_charges, 0),\r\n        COALESCE(tax_percentage, 18.00),\r\n        COALESCE(tax_amount, 0),\r\n        COALESCE(grand_total, 0),\r\n        COALESCE(final_price, 0)\r\n    INTO \r\n        current_freight,\r\n        current_tax_percentage, \r\n        current_tax_amount,\r\n        current_grand_total,\r\n        current_final_price\r\n    FROM sales_orders \r\n    WHERE id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    -- Calculate ONLY item-level totals\r\n    SELECT \r\n        COALESCE(SUM(quantity * unit_price), 0),\r\n        COALESCE(SUM(quantity * COALESCE(final_price, unit_price)), 0)\r\n    INTO order_original_price, order_items_subtotal\r\n    FROM sales_order_items \r\n    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    order_discount_amount := order_original_price - order_items_subtotal;\r\n    \r\n    -- Update sales_orders - PRESERVE final_price if it was set by UI (includes tax + freight)\r\n    -- Only update final_price if it's currently 0 or matches items subtotal (meaning it wasn't set by UI)\r\n    UPDATE sales_orders SET\r\n        original_price = order_original_price,\r\n        discount_amount = order_discount_amount,\r\n        -- CRITICAL: Only update final_price if it appears to be unset or just item total\r\n        final_price = CASE \r\n            WHEN current_final_price = 0 OR current_final_price = order_items_subtotal THEN \r\n                order_items_subtotal + current_freight + current_tax_amount\r\n            ELSE \r\n                current_final_price  -- PRESERVE UI-calculated final_price\r\n        END,\r\n        -- Always preserve these UI-calculated fields\r\n        freight_charges = current_freight,\r\n        tax_percentage = current_tax_percentage,\r\n        tax_amount = current_tax_amount,\r\n        grand_total = CASE \r\n            WHEN current_grand_total = 0 THEN \r\n                order_items_subtotal + current_freight + current_tax_amount\r\n            ELSE \r\n                current_grand_total  -- PRESERVE UI-calculated grand_total\r\n        END,\r\n        updated_at = NOW()\r\n    WHERE id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 9
  },
  {
    "trigger_name": "update_sales_order_item_totals_insert",
    "table_name": "sales_order_items",
    "event": "INSERT",
    "function_name": "update_sales_order_item_totals",
    "function_source": "\r\nDECLARE\r\n    order_original_price DECIMAL(15,2);\r\n    order_items_subtotal DECIMAL(15,2);\r\n    order_discount_amount DECIMAL(15,2);\r\n    current_freight DECIMAL(15,2);\r\n    current_tax_percentage DECIMAL(5,2);\r\n    current_tax_amount DECIMAL(15,2);\r\n    current_grand_total DECIMAL(15,2);\r\n    current_final_price DECIMAL(15,2);\r\nBEGIN\r\n    -- Get current values to preserve UI calculations\r\n    SELECT \r\n        COALESCE(freight_charges, 0),\r\n        COALESCE(tax_percentage, 18.00),\r\n        COALESCE(tax_amount, 0),\r\n        COALESCE(grand_total, 0),\r\n        COALESCE(final_price, 0)\r\n    INTO \r\n        current_freight,\r\n        current_tax_percentage, \r\n        current_tax_amount,\r\n        current_grand_total,\r\n        current_final_price\r\n    FROM sales_orders \r\n    WHERE id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    -- Calculate ONLY item-level totals\r\n    SELECT \r\n        COALESCE(SUM(quantity * unit_price), 0),\r\n        COALESCE(SUM(quantity * COALESCE(final_price, unit_price)), 0)\r\n    INTO order_original_price, order_items_subtotal\r\n    FROM sales_order_items \r\n    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    order_discount_amount := order_original_price - order_items_subtotal;\r\n    \r\n    -- Update sales_orders - PRESERVE final_price if it was set by UI (includes tax + freight)\r\n    -- Only update final_price if it's currently 0 or matches items subtotal (meaning it wasn't set by UI)\r\n    UPDATE sales_orders SET\r\n        original_price = order_original_price,\r\n        discount_amount = order_discount_amount,\r\n        -- CRITICAL: Only update final_price if it appears to be unset or just item total\r\n        final_price = CASE \r\n            WHEN current_final_price = 0 OR current_final_price = order_items_subtotal THEN \r\n                order_items_subtotal + current_freight + current_tax_amount\r\n            ELSE \r\n                current_final_price  -- PRESERVE UI-calculated final_price\r\n        END,\r\n        -- Always preserve these UI-calculated fields\r\n        freight_charges = current_freight,\r\n        tax_percentage = current_tax_percentage,\r\n        tax_amount = current_tax_amount,\r\n        grand_total = CASE \r\n            WHEN current_grand_total = 0 THEN \r\n                order_items_subtotal + current_freight + current_tax_amount\r\n            ELSE \r\n                current_grand_total  -- PRESERVE UI-calculated grand_total\r\n        END,\r\n        updated_at = NOW()\r\n    WHERE id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 5
  },
  {
    "trigger_name": "update_sales_order_item_totals_update",
    "table_name": "sales_order_items",
    "event": "UPDATE",
    "function_name": "update_sales_order_item_totals",
    "function_source": "\r\nDECLARE\r\n    order_original_price DECIMAL(15,2);\r\n    order_items_subtotal DECIMAL(15,2);\r\n    order_discount_amount DECIMAL(15,2);\r\n    current_freight DECIMAL(15,2);\r\n    current_tax_percentage DECIMAL(5,2);\r\n    current_tax_amount DECIMAL(15,2);\r\n    current_grand_total DECIMAL(15,2);\r\n    current_final_price DECIMAL(15,2);\r\nBEGIN\r\n    -- Get current values to preserve UI calculations\r\n    SELECT \r\n        COALESCE(freight_charges, 0),\r\n        COALESCE(tax_percentage, 18.00),\r\n        COALESCE(tax_amount, 0),\r\n        COALESCE(grand_total, 0),\r\n        COALESCE(final_price, 0)\r\n    INTO \r\n        current_freight,\r\n        current_tax_percentage, \r\n        current_tax_amount,\r\n        current_grand_total,\r\n        current_final_price\r\n    FROM sales_orders \r\n    WHERE id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    -- Calculate ONLY item-level totals\r\n    SELECT \r\n        COALESCE(SUM(quantity * unit_price), 0),\r\n        COALESCE(SUM(quantity * COALESCE(final_price, unit_price)), 0)\r\n    INTO order_original_price, order_items_subtotal\r\n    FROM sales_order_items \r\n    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    order_discount_amount := order_original_price - order_items_subtotal;\r\n    \r\n    -- Update sales_orders - PRESERVE final_price if it was set by UI (includes tax + freight)\r\n    -- Only update final_price if it's currently 0 or matches items subtotal (meaning it wasn't set by UI)\r\n    UPDATE sales_orders SET\r\n        original_price = order_original_price,\r\n        discount_amount = order_discount_amount,\r\n        -- CRITICAL: Only update final_price if it appears to be unset or just item total\r\n        final_price = CASE \r\n            WHEN current_final_price = 0 OR current_final_price = order_items_subtotal THEN \r\n                order_items_subtotal + current_freight + current_tax_amount\r\n            ELSE \r\n                current_final_price  -- PRESERVE UI-calculated final_price\r\n        END,\r\n        -- Always preserve these UI-calculated fields\r\n        freight_charges = current_freight,\r\n        tax_percentage = current_tax_percentage,\r\n        tax_amount = current_tax_amount,\r\n        grand_total = CASE \r\n            WHEN current_grand_total = 0 THEN \r\n                order_items_subtotal + current_freight + current_tax_amount\r\n            ELSE \r\n                current_grand_total  -- PRESERVE UI-calculated grand_total\r\n        END,\r\n        updated_at = NOW()\r\n    WHERE id = COALESCE(NEW.order_id, OLD.order_id);\r\n    \r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 17
  },
  {
    "trigger_name": "sales_order_analytics_trigger",
    "table_name": "sales_orders",
    "event": "UPDATE",
    "function_name": "trigger_analytics_update",
    "function_source": "\r\nBEGIN\r\n    -- Schedule a refresh of analytics views (in a real implementation, this would be queued)\r\n    PERFORM pg_notify('analytics_refresh', 'scheduled');\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "sales_order_analytics_trigger",
    "table_name": "sales_orders",
    "event": "INSERT",
    "function_name": "trigger_analytics_update",
    "function_source": "\r\nBEGIN\r\n    -- Schedule a refresh of analytics views (in a real implementation, this would be queued)\r\n    PERFORM pg_notify('analytics_refresh', 'scheduled');\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "sales_order_analytics_trigger",
    "table_name": "sales_orders",
    "event": "DELETE",
    "function_name": "trigger_analytics_update",
    "function_source": "\r\nBEGIN\r\n    -- Schedule a refresh of analytics views (in a real implementation, this would be queued)\r\n    PERFORM pg_notify('analytics_refresh', 'scheduled');\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_sales_orders_create_journal",
    "table_name": "sales_orders",
    "event": "INSERT",
    "function_name": "trigger_create_sales_journal_entry",
    "function_source": "\r\nDECLARE\r\n    ar_account_id UUID;\r\n    sales_account_id UUID;\r\n    journal_id UUID;\r\n    customer_name TEXT;\r\n    amount_to_record DECIMAL;\r\nBEGIN\r\n    -- Determine amount to record with better logic\r\n    amount_to_record := COALESCE(NEW.final_price, NEW.total, NEW.total_price, NEW.grand_total, 0);\r\n    \r\n    -- Skip if total is null or zero\r\n    IF amount_to_record IS NULL OR amount_to_record = 0 THEN\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get account IDs with flexible lookup\r\n    SELECT id INTO ar_account_id FROM chart_of_accounts WHERE account_code IN ('1200', '1100') ORDER BY account_code LIMIT 1;\r\n    SELECT id INTO sales_account_id FROM chart_of_accounts WHERE account_code IN ('4010', '4000', '4001') ORDER BY account_code LIMIT 1;\r\n    \r\n    -- Skip if accounts not found but log warning\r\n    IF ar_account_id IS NULL OR sales_account_id IS NULL THEN\r\n        RAISE WARNING 'Required accounts not found for sales journal entry: AR=%, Sales=%. Available codes: %', \r\n            ar_account_id, sales_account_id,\r\n            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1200','1100','4010','4000','4001'));\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get customer name\r\n    customer_name := COALESCE(NEW.customer_name, 'Customer');\r\n    \r\n    -- Create journal entry for sale\r\n    journal_id := create_journal_entry(\r\n        CURRENT_DATE,\r\n        'Sale to ' || customer_name,\r\n        CASE \r\n            WHEN TG_TABLE_NAME = 'sales_orders' THEN 'SO-' || NEW.id::text\r\n            WHEN TG_TABLE_NAME = 'invoices' THEN 'INV-' || NEW.id::text\r\n            ELSE 'SALE-' || NEW.id::text\r\n        END\r\n    );\r\n    \r\n    -- Debit Accounts Receivable (increase asset)\r\n    PERFORM add_journal_entry_line(journal_id, ar_account_id, amount_to_record, 0, 'Invoice created');\r\n    \r\n    -- Credit Sales Revenue (increase revenue)\r\n    PERFORM add_journal_entry_line(journal_id, sales_account_id, 0, amount_to_record, 'Sales revenue');\r\n    \r\n    -- Post the journal entry\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN NEW;\r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the sale\r\n        RAISE WARNING 'Failed to create journal entry for sale %: %', NEW.id, SQLERRM;\r\n        RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 5
  },
  {
    "trigger_name": "trg_sales_orders_set_updated_at",
    "table_name": "sales_orders",
    "event": "UPDATE",
    "function_name": "set_updated_at",
    "function_source": "\r\nBEGIN\r\n  NEW.updated_at = now();\r\n  RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "trg_sales_orders_updated_at",
    "table_name": "sales_orders",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "apply_stock_adjustment_trigger",
    "table_name": "stock_adjustments",
    "event": "INSERT",
    "function_name": "apply_stock_adjustment",
    "function_source": "\r\nBEGIN\r\n  UPDATE inventory_items\r\n  SET quantity = NEW.quantity_after,\r\n      updated_at = NOW()\r\n  WHERE id = NEW.inventory_item_id;\r\n  RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 5
  },
  {
    "trigger_name": "stock_adjustments_updated_at_trigger",
    "table_name": "stock_adjustments",
    "event": "UPDATE",
    "function_name": "update_stock_adjustments_updated_at",
    "function_source": "\r\nBEGIN\r\n  NEW.updated_at = NOW();\r\n  RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "tr_check_filters",
    "table_name": "subscription",
    "event": "INSERT",
    "function_name": "subscription_check_filters",
    "function_source": "\n    /*\n    Validates that the user defined filters for a subscription:\n    - refer to valid columns that the claimed role may access\n    - values are coercable to the correct column type\n    */\n    declare\n        col_names text[] = coalesce(\n                array_agg(c.column_name order by c.ordinal_position),\n                '{}'::text[]\n            )\n            from\n                information_schema.columns c\n            where\n                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity\n                and pg_catalog.has_column_privilege(\n                    (new.claims ->> 'role'),\n                    format('%I.%I', c.table_schema, c.table_name)::regclass,\n                    c.column_name,\n                    'SELECT'\n                );\n        filter realtime.user_defined_filter;\n        col_type regtype;\n\n        in_val jsonb;\n    begin\n        for filter in select * from unnest(new.filters) loop\n            -- Filtered column is valid\n            if not filter.column_name = any(col_names) then\n                raise exception 'invalid column for filter %', filter.column_name;\n            end if;\n\n            -- Type is sanitized and safe for string interpolation\n            col_type = (\n                select atttypid::regtype\n                from pg_catalog.pg_attribute\n                where attrelid = new.entity\n                      and attname = filter.column_name\n            );\n            if col_type is null then\n                raise exception 'failed to lookup type for column %', filter.column_name;\n            end if;\n\n            -- Set maximum number of entries for in filter\n            if filter.op = 'in'::realtime.equality_op then\n                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);\n                if coalesce(jsonb_array_length(in_val), 0) > 100 then\n                    raise exception 'too many values for `in` filter. Maximum 100';\n                end if;\n            else\n                -- raises an exception if value is not coercable to type\n                perform realtime.cast(filter.value, col_type);\n            end if;\n\n        end loop;\n\n        -- Apply consistent order to filters so the unique constraint on\n        -- (subscription_id, entity, filters) can't be tricked by a different filter order\n        new.filters = coalesce(\n            array_agg(f order by f.column_name, f.op, f.value),\n            '{}'\n        ) from unnest(new.filters) f;\n\n        return new;\n    end;\n    ",
    "enabled": "O",
    "type_flags": 23
  },
  {
    "trigger_name": "tr_check_filters",
    "table_name": "subscription",
    "event": "UPDATE",
    "function_name": "subscription_check_filters",
    "function_source": "\n    /*\n    Validates that the user defined filters for a subscription:\n    - refer to valid columns that the claimed role may access\n    - values are coercable to the correct column type\n    */\n    declare\n        col_names text[] = coalesce(\n                array_agg(c.column_name order by c.ordinal_position),\n                '{}'::text[]\n            )\n            from\n                information_schema.columns c\n            where\n                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity\n                and pg_catalog.has_column_privilege(\n                    (new.claims ->> 'role'),\n                    format('%I.%I', c.table_schema, c.table_name)::regclass,\n                    c.column_name,\n                    'SELECT'\n                );\n        filter realtime.user_defined_filter;\n        col_type regtype;\n\n        in_val jsonb;\n    begin\n        for filter in select * from unnest(new.filters) loop\n            -- Filtered column is valid\n            if not filter.column_name = any(col_names) then\n                raise exception 'invalid column for filter %', filter.column_name;\n            end if;\n\n            -- Type is sanitized and safe for string interpolation\n            col_type = (\n                select atttypid::regtype\n                from pg_catalog.pg_attribute\n                where attrelid = new.entity\n                      and attname = filter.column_name\n            );\n            if col_type is null then\n                raise exception 'failed to lookup type for column %', filter.column_name;\n            end if;\n\n            -- Set maximum number of entries for in filter\n            if filter.op = 'in'::realtime.equality_op then\n                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);\n                if coalesce(jsonb_array_length(in_val), 0) > 100 then\n                    raise exception 'too many values for `in` filter. Maximum 100';\n                end if;\n            else\n                -- raises an exception if value is not coercable to type\n                perform realtime.cast(filter.value, col_type);\n            end if;\n\n        end loop;\n\n        -- Apply consistent order to filters so the unique constraint on\n        -- (subscription_id, entity, filters) can't be tricked by a different filter order\n        new.filters = coalesce(\n            array_agg(f order by f.column_name, f.op, f.value),\n            '{}'\n        ) from unnest(new.filters) f;\n\n        return new;\n    end;\n    ",
    "enabled": "O",
    "type_flags": 23
  },
  {
    "trigger_name": "trg_suppliers_set_updated_at",
    "table_name": "suppliers",
    "event": "UPDATE",
    "function_name": "set_updated_at",
    "function_source": "\r\nBEGIN\r\n  NEW.updated_at = now();\r\n  RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "trg_suppliers_updated_at",
    "table_name": "suppliers",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "update_support_tickets_updated_at",
    "table_name": "support_tickets",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "update_user_notification_settings_updated_at",
    "table_name": "user_notification_settings",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "trg_vendor_payments_create_journal",
    "table_name": "vendor_payment_history",
    "event": "INSERT",
    "function_name": "trigger_create_vendor_payment_journal_entry",
    "function_source": "\r\nDECLARE\r\n    cash_account_id UUID;\r\n    ap_account_id UUID;\r\n    journal_id UUID;\r\n    supplier_name TEXT;\r\n    payment_amount DECIMAL;\r\nBEGIN\r\n    -- Determine payment amount (handle different column names)\r\n    payment_amount := COALESCE(NEW.amount_paid, NEW.amount, 0);\r\n    \r\n    -- Skip if amount is null or zero\r\n    IF payment_amount IS NULL OR payment_amount = 0 THEN\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Skip if payment is not completed (if status field exists)\r\n    IF NEW.status IS NOT NULL AND NEW.status != 'completed' THEN\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get account IDs with flexible lookup\r\n    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code IN ('1001', '1010') ORDER BY account_code LIMIT 1;\r\n    SELECT id INTO ap_account_id FROM chart_of_accounts WHERE account_code IN ('2010', '2000') ORDER BY account_code LIMIT 1;\r\n    \r\n    -- Skip if accounts not found but log warning\r\n    IF cash_account_id IS NULL OR ap_account_id IS NULL THEN\r\n        RAISE WARNING 'Required accounts not found for vendor payment journal entry: Cash=%, AP=%. Available codes: %', \r\n            cash_account_id, ap_account_id,\r\n            (SELECT array_agg(account_code) FROM chart_of_accounts WHERE account_code IN ('1001','1010','2010','2000'));\r\n        RETURN NEW;\r\n    END IF;\r\n    \r\n    -- Get supplier name\r\n    IF NEW.supplier_id IS NOT NULL THEN\r\n        SELECT name INTO supplier_name FROM suppliers WHERE id = NEW.supplier_id;\r\n    END IF;\r\n    \r\n    -- Create journal entry for vendor payment\r\n    journal_id := create_journal_entry(\r\n        COALESCE(NEW.payment_date, CURRENT_DATE),\r\n        'Payment to ' || COALESCE(supplier_name, 'Supplier'),\r\n        'VP-' || NEW.id::text\r\n    );\r\n    \r\n    -- Debit Accounts Payable (decrease liability)\r\n    PERFORM add_journal_entry_line(journal_id, ap_account_id, payment_amount, 0, 'Payment to supplier');\r\n    \r\n    -- Credit Cash (decrease asset)\r\n    PERFORM add_journal_entry_line(journal_id, cash_account_id, 0, payment_amount, 'Cash paid');\r\n    \r\n    -- Post the journal entry\r\n    PERFORM post_journal_entry(journal_id);\r\n    \r\n    RETURN NEW;\r\nEXCEPTION\r\n    WHEN OTHERS THEN\r\n        -- Log error and continue without failing the payment\r\n        RAISE WARNING 'Failed to create journal entry for vendor payment %: %', NEW.id, SQLERRM;\r\n        RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 5
  },
  {
    "trigger_name": "trg_vendor_payments_update_po_status",
    "table_name": "vendor_payment_history",
    "event": "INSERT",
    "function_name": "trigger_update_po_payment_status",
    "function_source": "\r\nBEGIN\r\n    -- Handle different trigger events\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        -- Update for new/updated vendor payment\r\n        IF NEW.purchase_order_id IS NOT NULL THEN\r\n            PERFORM update_purchase_order_payment_status(NEW.purchase_order_id);\r\n        END IF;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        -- Update for deleted vendor payment\r\n        IF OLD.purchase_order_id IS NOT NULL THEN\r\n            PERFORM update_purchase_order_payment_status(OLD.purchase_order_id);\r\n        END IF;\r\n        RETURN OLD;\r\n    END IF;\r\n    \r\n    RETURN NULL;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_vendor_payments_update_po_status",
    "table_name": "vendor_payment_history",
    "event": "UPDATE",
    "function_name": "trigger_update_po_payment_status",
    "function_source": "\r\nBEGIN\r\n    -- Handle different trigger events\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        -- Update for new/updated vendor payment\r\n        IF NEW.purchase_order_id IS NOT NULL THEN\r\n            PERFORM update_purchase_order_payment_status(NEW.purchase_order_id);\r\n        END IF;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        -- Update for deleted vendor payment\r\n        IF OLD.purchase_order_id IS NOT NULL THEN\r\n            PERFORM update_purchase_order_payment_status(OLD.purchase_order_id);\r\n        END IF;\r\n        RETURN OLD;\r\n    END IF;\r\n    \r\n    RETURN NULL;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_vendor_payments_update_po_status",
    "table_name": "vendor_payment_history",
    "event": "DELETE",
    "function_name": "trigger_update_po_payment_status",
    "function_source": "\r\nBEGIN\r\n    -- Handle different trigger events\r\n    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN\r\n        -- Update for new/updated vendor payment\r\n        IF NEW.purchase_order_id IS NOT NULL THEN\r\n            PERFORM update_purchase_order_payment_status(NEW.purchase_order_id);\r\n        END IF;\r\n        RETURN NEW;\r\n    ELSIF TG_OP = 'DELETE' THEN\r\n        -- Update for deleted vendor payment\r\n        IF OLD.purchase_order_id IS NOT NULL THEN\r\n            PERFORM update_purchase_order_payment_status(OLD.purchase_order_id);\r\n        END IF;\r\n        RETURN OLD;\r\n    END IF;\r\n    \r\n    RETURN NULL;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_po_payment_status",
    "table_name": "vendor_payment_history",
    "event": "UPDATE",
    "function_name": "update_purchase_order_payment_status",
    "function_source": "\r\nBEGIN\r\n    UPDATE purchase_orders \r\n    SET payment_status = CASE \r\n        WHEN paid_amount = 0 THEN 'unpaid'\r\n        WHEN paid_amount >= total THEN 'paid'\r\n        WHEN paid_amount > 0 AND paid_amount < total THEN 'partially_paid'\r\n        ELSE payment_status\r\n    END\r\n    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);\r\n\r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_po_payment_status",
    "table_name": "vendor_payment_history",
    "event": "DELETE",
    "function_name": "update_purchase_order_payment_status",
    "function_source": "\r\nBEGIN\r\n    UPDATE purchase_orders \r\n    SET payment_status = CASE \r\n        WHEN paid_amount = 0 THEN 'unpaid'\r\n        WHEN paid_amount >= total THEN 'paid'\r\n        WHEN paid_amount > 0 AND paid_amount < total THEN 'partially_paid'\r\n        ELSE payment_status\r\n    END\r\n    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);\r\n\r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_po_payment_status",
    "table_name": "vendor_payment_history",
    "event": "INSERT",
    "function_name": "update_purchase_order_payment_status",
    "function_source": "\r\nBEGIN\r\n    UPDATE purchase_orders \r\n    SET payment_status = CASE \r\n        WHEN paid_amount = 0 THEN 'unpaid'\r\n        WHEN paid_amount >= total THEN 'paid'\r\n        WHEN paid_amount > 0 AND paid_amount < total THEN 'partially_paid'\r\n        ELSE payment_status\r\n    END\r\n    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);\r\n\r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_vendor_bill_status",
    "table_name": "vendor_payment_history",
    "event": "DELETE",
    "function_name": "update_vendor_bill_status",
    "function_source": "\r\nBEGIN\r\n    UPDATE vendor_bills \r\n    SET status = CASE \r\n        WHEN paid_amount = 0 THEN 'pending'\r\n        WHEN paid_amount >= total_amount THEN 'paid'\r\n        WHEN paid_amount > 0 AND paid_amount < total_amount THEN 'partial'\r\n        ELSE status\r\n    END,\r\n    updated_at = now()\r\n    WHERE id = COALESCE(NEW.vendor_bill_id, OLD.vendor_bill_id);\r\n\r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_vendor_bill_status",
    "table_name": "vendor_payment_history",
    "event": "UPDATE",
    "function_name": "update_vendor_bill_status",
    "function_source": "\r\nBEGIN\r\n    UPDATE vendor_bills \r\n    SET status = CASE \r\n        WHEN paid_amount = 0 THEN 'pending'\r\n        WHEN paid_amount >= total_amount THEN 'paid'\r\n        WHEN paid_amount > 0 AND paid_amount < total_amount THEN 'partial'\r\n        ELSE status\r\n    END,\r\n    updated_at = now()\r\n    WHERE id = COALESCE(NEW.vendor_bill_id, OLD.vendor_bill_id);\r\n\r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trigger_update_vendor_bill_status",
    "table_name": "vendor_payment_history",
    "event": "INSERT",
    "function_name": "update_vendor_bill_status",
    "function_source": "\r\nBEGIN\r\n    UPDATE vendor_bills \r\n    SET status = CASE \r\n        WHEN paid_amount = 0 THEN 'pending'\r\n        WHEN paid_amount >= total_amount THEN 'paid'\r\n        WHEN paid_amount > 0 AND paid_amount < total_amount THEN 'partial'\r\n        ELSE status\r\n    END,\r\n    updated_at = now()\r\n    WHERE id = COALESCE(NEW.vendor_bill_id, OLD.vendor_bill_id);\r\n\r\n    RETURN COALESCE(NEW, OLD);\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 29
  },
  {
    "trigger_name": "trg_work_orders_set_updated_at",
    "table_name": "work_orders",
    "event": "UPDATE",
    "function_name": "set_updated_at",
    "function_source": "\r\nBEGIN\r\n  NEW.updated_at = now();\r\n  RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  },
  {
    "trigger_name": "trg_work_orders_updated_at",
    "table_name": "work_orders",
    "event": "UPDATE",
    "function_name": "update_updated_at_column",
    "function_source": "\r\nBEGIN\r\n    NEW.updated_at = NOW();\r\n    RETURN NEW;\r\nEND;\r\n",
    "enabled": "O",
    "type_flags": 19
  }
]