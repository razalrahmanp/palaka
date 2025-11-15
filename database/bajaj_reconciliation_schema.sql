-- ================================================================================================
-- BAJAJ FINANCE RECONCILIATION SCHEMA
-- ================================================================================================
-- Tracks Bajaj Finance EMI transactions and reconciles with bank deposits
-- ================================================================================================

-- Table to track expected Bajaj deposits from sales orders
CREATE TABLE IF NOT EXISTS bajaj_expected_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  finance_company TEXT DEFAULT 'bajaj', -- bajaj, hdfc, etc.
  loan_account_number TEXT,
  
  -- Expected amounts
  order_total DECIMAL(12, 2) NOT NULL,
  finance_amount DECIMAL(12, 2) NOT NULL, -- Amount financed by Bajaj
  expected_deposit DECIMAL(12, 2) NOT NULL, -- What we expect to receive
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending, received, partially_received, variance
  received_amount DECIMAL(12, 2) DEFAULT 0,
  variance_amount DECIMAL(12, 2) DEFAULT 0, -- Difference (charges, etc.)
  
  -- Bank reconciliation
  bank_transaction_id UUID REFERENCES bank_transactions(id),
  reconciled_at TIMESTAMP,
  
  -- Metadata
  expected_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track Bajaj charges/deductions
CREATE TABLE IF NOT EXISTS bajaj_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expected_deposit_id UUID REFERENCES bajaj_expected_deposits(id) ON DELETE CASCADE,
  charge_type TEXT NOT NULL, -- processing_fee, gst, bank_charges, etc.
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to track bank statement imports for reconciliation
CREATE TABLE IF NOT EXISTS bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES bank_accounts(id),
  statement_date DATE NOT NULL,
  
  -- File info
  file_name TEXT,
  import_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  imported_by UUID REFERENCES users(id),
  
  -- Statistics
  total_transactions INTEGER DEFAULT 0,
  matched_transactions INTEGER DEFAULT 0,
  unmatched_transactions INTEGER DEFAULT 0,
  
  status TEXT DEFAULT 'pending', -- pending, processed, completed
  notes TEXT
);

-- Table to store unmatched bank statement entries
CREATE TABLE IF NOT EXISTS unmatched_bank_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_import_id UUID REFERENCES bank_statement_imports(id),
  bank_account_id UUID REFERENCES bank_accounts(id),
  
  -- Transaction details from bank statement
  transaction_date DATE NOT NULL,
  description TEXT,
  reference_number TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  
  -- Matching status
  matched BOOLEAN DEFAULT FALSE,
  matched_to_id UUID, -- Can reference bajaj_expected_deposits or sales_orders
  matched_type TEXT, -- bajaj_finance, customer_payment, other
  matched_at TIMESTAMP,
  
  -- Manual handling
  assigned_to UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bajaj_deposits_status ON bajaj_expected_deposits(status);
CREATE INDEX IF NOT EXISTS idx_bajaj_deposits_order ON bajaj_expected_deposits(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_bajaj_deposits_date ON bajaj_expected_deposits(expected_date);
CREATE INDEX IF NOT EXISTS idx_unmatched_deposits_matched ON unmatched_bank_deposits(matched);
CREATE INDEX IF NOT EXISTS idx_unmatched_deposits_date ON unmatched_bank_deposits(transaction_date);

-- Function to automatically create expected deposit when order is financed
CREATE OR REPLACE FUNCTION create_bajaj_expected_deposit()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order has Bajaj finance (bajaj_finance_amount > 0)
  IF NEW.bajaj_finance_amount > 0 THEN
    INSERT INTO bajaj_expected_deposits (
      sales_order_id,
      order_total,
      finance_amount,
      expected_deposit,
      expected_date,
      status
    ) VALUES (
      NEW.id,
      NEW.final_price,
      NEW.bajaj_finance_amount,
      NEW.bajaj_merchant_receivable, -- Amount expected from Bajaj (after their fees)
      NEW.created_at::DATE + INTERVAL '7 days', -- Expect within 7 days
      'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create expected deposits
CREATE TRIGGER trigger_create_bajaj_expected_deposit
  AFTER INSERT OR UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION create_bajaj_expected_deposit();

-- Function to match bank deposits with expected Bajaj payments
CREATE OR REPLACE FUNCTION match_bajaj_deposit(
  p_unmatched_deposit_id UUID,
  p_expected_deposit_id UUID,
  p_variance_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_unmatched RECORD;
  v_expected RECORD;
  v_variance DECIMAL(12, 2);
  v_bank_transaction_id UUID;
BEGIN
  -- Get unmatched deposit
  SELECT * INTO v_unmatched FROM unmatched_bank_deposits WHERE id = p_unmatched_deposit_id;
  
  -- Get expected deposit
  SELECT * INTO v_expected FROM bajaj_expected_deposits WHERE id = p_expected_deposit_id;
  
  -- Calculate variance
  v_variance := v_unmatched.amount - v_expected.expected_deposit;
  
  -- Create bank transaction for the deposit
  INSERT INTO bank_transactions (
    bank_account_id,
    date,
    type,
    amount,
    description,
    reference,
    transaction_type,
    source_record_id
  ) VALUES (
    v_unmatched.bank_account_id,
    v_unmatched.transaction_date,
    'deposit',
    v_unmatched.amount,
    'Bajaj Finance EMI Deposit - Order ID: ' || v_expected.sales_order_id,
    v_unmatched.reference_number,
    'bajaj_finance_deposit',
    v_expected.sales_order_id
  ) RETURNING id INTO v_bank_transaction_id;
  
  -- Update expected deposit
  UPDATE bajaj_expected_deposits SET
    status = CASE 
      WHEN ABS(v_variance) < 10 THEN 'received'
      ELSE 'variance'
    END,
    received_amount = v_unmatched.amount,
    variance_amount = v_variance,
    bank_transaction_id = v_bank_transaction_id,
    reconciled_at = CURRENT_TIMESTAMP,
    notes = COALESCE(notes || ' | ', '') || COALESCE(p_variance_notes, ''),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_expected_deposit_id;
  
  -- Mark unmatched deposit as matched
  UPDATE unmatched_bank_deposits SET
    matched = TRUE,
    matched_to_id = p_expected_deposit_id,
    matched_type = 'bajaj_finance',
    matched_at = CURRENT_TIMESTAMP
  WHERE id = p_unmatched_deposit_id;
  
  -- If there's variance, create a charge record
  IF ABS(v_variance) > 0 THEN
    INSERT INTO bajaj_charges (
      expected_deposit_id,
      charge_type,
      amount,
      description
    ) VALUES (
      p_expected_deposit_id,
      CASE WHEN v_variance < 0 THEN 'bank_charges' ELSE 'excess_payment' END,
      ABS(v_variance),
      COALESCE(p_variance_notes, 'Variance from expected amount')
    );
  END IF;
  
  RETURN json_build_object(
    'success', TRUE,
    'bank_transaction_id', v_bank_transaction_id,
    'variance', v_variance,
    'message', 'Deposit matched successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- View for reconciliation dashboard
CREATE OR REPLACE VIEW v_bajaj_reconciliation_status AS
SELECT 
  bed.id,
  bed.sales_order_id,
  so.id AS order_id,
  c.name AS customer_name,
  bed.finance_company,
  bed.loan_account_number,
  bed.expected_deposit,
  bed.received_amount,
  bed.variance_amount,
  bed.status,
  bed.expected_date,
  bed.reconciled_at,
  CASE 
    WHEN bed.status = 'pending' AND bed.expected_date < CURRENT_DATE THEN 'overdue'
    WHEN bed.status = 'pending' THEN 'pending'
    WHEN bed.status = 'variance' THEN 'needs_review'
    ELSE 'completed'
  END AS reconciliation_status,
  bt.date AS received_date,
  bt.reference AS bank_reference
FROM bajaj_expected_deposits bed
LEFT JOIN sales_orders so ON bed.sales_order_id = so.id
LEFT JOIN customers c ON bed.customer_id = c.id
LEFT JOIN bank_transactions bt ON bed.bank_transaction_id = bt.id
ORDER BY bed.expected_date DESC;

COMMENT ON TABLE bajaj_expected_deposits IS 'Tracks expected Bajaj Finance deposits for sales orders';
COMMENT ON TABLE bajaj_charges IS 'Records charges/deductions by finance companies';
COMMENT ON TABLE bank_statement_imports IS 'Tracks bank statement import history';
COMMENT ON TABLE unmatched_bank_deposits IS 'Stores unmatched deposits from bank statements for reconciliation';
