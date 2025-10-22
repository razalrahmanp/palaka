-- ============================================================================
-- BANK ACCOUNT BALANCE AUTO-UPDATE TRIGGER
-- ============================================================================
-- This trigger automatically updates bank_accounts.current_balance based on
-- bank_transactions table operations (INSERT, UPDATE, DELETE)
-- 
-- Rules:
-- - type = 'deposit': ADDS to bank account balance
-- - type = 'withdrawal': SUBTRACTS from bank account balance
-- - DELETE: REVERSES the original transaction effect
-- - UPDATE: REVERSES old transaction and APPLIES new transaction
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_bank_account_balance ON bank_transactions;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_bank_account_balance_from_transaction();

-- Create the trigger function
CREATE OR REPLACE FUNCTION update_bank_account_balance_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_old_effect NUMERIC := 0;
  v_new_effect NUMERIC := 0;
  v_bank_account_name TEXT;
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- ==========================================================================
  -- HANDLE INSERT: Add new transaction to balance
  -- ==========================================================================
  IF TG_OP = 'INSERT' THEN
    -- Calculate effect: deposits ADD, withdrawals SUBTRACT
    IF NEW.type = 'deposit' THEN
      v_new_effect := NEW.amount;
    ELSIF NEW.type = 'withdrawal' THEN
      v_new_effect := -NEW.amount;
    END IF;
    
    -- Get current balance for logging
    SELECT current_balance, name 
    INTO v_old_balance, v_bank_account_name
    FROM bank_accounts 
    WHERE id = NEW.bank_account_id;
    
    -- Update bank account balance
    UPDATE bank_accounts 
    SET 
      current_balance = current_balance + v_new_effect,
      updated_at = NOW()
    WHERE id = NEW.bank_account_id;
    
    -- Get new balance for logging
    SELECT current_balance INTO v_new_balance
    FROM bank_accounts 
    WHERE id = NEW.bank_account_id;
    
    RAISE NOTICE '✅ BANK BALANCE UPDATE (INSERT): Account "%" | Type: % | Amount: % | Old Balance: % | New Balance: %', 
      v_bank_account_name, NEW.type, NEW.amount, v_old_balance, v_new_balance;
    
    RETURN NEW;
  
  -- ==========================================================================
  -- HANDLE DELETE: Reverse the transaction effect
  -- ==========================================================================
  ELSIF TG_OP = 'DELETE' THEN
    -- Calculate reverse effect: deposits SUBTRACT, withdrawals ADD
    IF OLD.type = 'deposit' THEN
      v_old_effect := -OLD.amount;  -- Reverse deposit
    ELSIF OLD.type = 'withdrawal' THEN
      v_old_effect := OLD.amount;   -- Reverse withdrawal
    END IF;
    
    -- Get current balance for logging
    SELECT current_balance, name 
    INTO v_old_balance, v_bank_account_name
    FROM bank_accounts 
    WHERE id = OLD.bank_account_id;
    
    -- Update bank account balance
    UPDATE bank_accounts 
    SET 
      current_balance = current_balance + v_old_effect,
      updated_at = NOW()
    WHERE id = OLD.bank_account_id;
    
    -- Get new balance for logging
    SELECT current_balance INTO v_new_balance
    FROM bank_accounts 
    WHERE id = OLD.bank_account_id;
    
    RAISE NOTICE '🗑️ BANK BALANCE UPDATE (DELETE): Account "%" | Type: % | Amount: % | Old Balance: % | New Balance: %', 
      v_bank_account_name, OLD.type, OLD.amount, v_old_balance, v_new_balance;
    
    RETURN OLD;
  
  -- ==========================================================================
  -- HANDLE UPDATE: Reverse old transaction and apply new transaction
  -- ==========================================================================
  ELSIF TG_OP = 'UPDATE' THEN
    -- Calculate old transaction effect (to reverse)
    IF OLD.type = 'deposit' THEN
      v_old_effect := -OLD.amount;
    ELSIF OLD.type = 'withdrawal' THEN
      v_old_effect := OLD.amount;
    END IF;
    
    -- Calculate new transaction effect (to apply)
    IF NEW.type = 'deposit' THEN
      v_new_effect := NEW.amount;
    ELSIF NEW.type = 'withdrawal' THEN
      v_new_effect := -NEW.amount;
    END IF;
    
    -- Get current balance for logging
    SELECT current_balance, name 
    INTO v_old_balance, v_bank_account_name
    FROM bank_accounts 
    WHERE id = NEW.bank_account_id;
    
    -- Apply both effects: reverse old + apply new
    UPDATE bank_accounts 
    SET 
      current_balance = current_balance + v_old_effect + v_new_effect,
      updated_at = NOW()
    WHERE id = NEW.bank_account_id;
    
    -- Get new balance for logging
    SELECT current_balance INTO v_new_balance
    FROM bank_accounts 
    WHERE id = NEW.bank_account_id;
    
    RAISE NOTICE '🔄 BANK BALANCE UPDATE (UPDATE): Account "%" | Old: % % | New: % % | Old Balance: % | New Balance: %', 
      v_bank_account_name, OLD.type, OLD.amount, NEW.type, NEW.amount, v_old_balance, v_new_balance;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trg_update_bank_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_account_balance_from_transaction();

-- Add helpful comment
COMMENT ON TRIGGER trg_update_bank_account_balance ON bank_transactions IS 
  'Automatically updates bank_accounts.current_balance when bank_transactions are inserted, updated, or deleted';

COMMENT ON FUNCTION update_bank_account_balance_from_transaction() IS 
  'Trigger function that maintains bank account balance integrity based on bank transactions';

-- ============================================================================
-- RECALCULATION FUNCTION
-- ============================================================================
-- Function to recalculate bank account balance from all transactions
-- Useful for fixing balance discrepancies
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_bank_account_balance(p_bank_account_id UUID)
RETURNS TABLE(
  account_id UUID,
  account_name TEXT,
  old_balance NUMERIC,
  calculated_balance NUMERIC,
  balance_updated BOOLEAN
) AS $$
DECLARE
  v_old_balance NUMERIC;
  v_calculated_balance NUMERIC := 0;
  v_account_name TEXT;
  v_deposit_total NUMERIC;
  v_withdrawal_total NUMERIC;
BEGIN
  -- Get current balance and name
  SELECT current_balance, name 
  INTO v_old_balance, v_account_name
  FROM bank_accounts 
  WHERE id = p_bank_account_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank account not found: %', p_bank_account_id;
  END IF;
  
  -- Calculate total deposits
  SELECT COALESCE(SUM(amount), 0) 
  INTO v_deposit_total
  FROM bank_transactions 
  WHERE bank_account_id = p_bank_account_id 
    AND type = 'deposit';
  
  -- Calculate total withdrawals
  SELECT COALESCE(SUM(amount), 0) 
  INTO v_withdrawal_total
  FROM bank_transactions 
  WHERE bank_account_id = p_bank_account_id 
    AND type = 'withdrawal';
  
  -- Calculate balance: deposits - withdrawals
  v_calculated_balance := v_deposit_total - v_withdrawal_total;
  
  -- Update the balance if different
  IF v_old_balance != v_calculated_balance THEN
    UPDATE bank_accounts 
    SET 
      current_balance = v_calculated_balance,
      updated_at = NOW()
    WHERE id = p_bank_account_id;
    
    RAISE NOTICE '✅ Balance recalculated for "%": % → % (Deposits: %, Withdrawals: %)', 
      v_account_name, v_old_balance, v_calculated_balance, v_deposit_total, v_withdrawal_total;
    
    RETURN QUERY SELECT 
      p_bank_account_id,
      v_account_name,
      v_old_balance,
      v_calculated_balance,
      TRUE;
  ELSE
    RAISE NOTICE 'ℹ️ Balance correct for "%": % (Deposits: %, Withdrawals: %)', 
      v_account_name, v_old_balance, v_deposit_total, v_withdrawal_total;
    
    RETURN QUERY SELECT 
      p_bank_account_id,
      v_account_name,
      v_old_balance,
      v_calculated_balance,
      FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_bank_account_balance(UUID) IS 
  'Recalculates bank account balance from all bank_transactions. Use this to fix balance discrepancies.';

-- ============================================================================
-- RECALCULATE ALL BANK ACCOUNTS FUNCTION
-- ============================================================================
-- Recalculates balances for ALL bank accounts
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_all_bank_account_balances()
RETURNS TABLE(
  account_id UUID,
  account_name TEXT,
  old_balance NUMERIC,
  calculated_balance NUMERIC,
  balance_updated BOOLEAN
) AS $$
DECLARE
  v_account RECORD;
BEGIN
  FOR v_account IN 
    SELECT id, name FROM bank_accounts WHERE is_active = TRUE
  LOOP
    RETURN QUERY SELECT * FROM recalculate_bank_account_balance(v_account.id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recalculate_all_bank_account_balances() IS 
  'Recalculates balances for all active bank accounts. Use after data migration or to fix discrepancies.';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================
-- 
-- 1. Recalculate single account balance:
--    SELECT * FROM recalculate_bank_account_balance('account-uuid-here');
--
-- 2. Recalculate all account balances:
--    SELECT * FROM recalculate_all_bank_account_balances();
--
-- 3. View accounts with balance discrepancies:
--    SELECT * FROM recalculate_all_bank_account_balances() WHERE balance_updated = TRUE;
--
-- ============================================================================

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✅ Bank account balance trigger system installed successfully!';
  RAISE NOTICE 'ℹ️  Trigger: trg_update_bank_account_balance';
  RAISE NOTICE 'ℹ️  Functions: update_bank_account_balance_from_transaction(), recalculate_bank_account_balance(), recalculate_all_bank_account_balances()';
END $$;
