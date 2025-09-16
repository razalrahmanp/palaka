-- Create loan_opening_balances table for tracking loan details and balances
-- This table will store initial loan amounts, current balances, and loan details

CREATE TABLE IF NOT EXISTS loan_opening_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_account_code VARCHAR(10) NOT NULL CHECK (loan_account_code IN ('2210', '2510', '2530')),
    loan_name VARCHAR(200) NOT NULL,
    bank_name VARCHAR(100),
    loan_type VARCHAR(50) NOT NULL CHECK (loan_type IN ('bank_loan', 'equipment_loan', 'vehicle_loan', 'business_loan', 'term_loan')),
    loan_number VARCHAR(50),
    original_loan_amount DECIMAL(15,2) NOT NULL,
    opening_balance DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    interest_rate DECIMAL(5,2),
    loan_tenure_months INTEGER,
    emi_amount DECIMAL(15,2),
    loan_start_date DATE,
    loan_end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'suspended')),
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opening_balance_set_date DATE DEFAULT CURRENT_DATE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loan_opening_balances_account_code ON loan_opening_balances(loan_account_code);
CREATE INDEX IF NOT EXISTS idx_loan_opening_balances_status ON loan_opening_balances(status);
CREATE INDEX IF NOT EXISTS idx_loan_opening_balances_bank_name ON loan_opening_balances(bank_name);
CREATE INDEX IF NOT EXISTS idx_loan_opening_balances_loan_type ON loan_opening_balances(loan_type);
CREATE INDEX IF NOT EXISTS idx_loan_opening_balances_created_at ON loan_opening_balances(created_at);

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_loan_opening_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_loan_opening_balances_updated_at ON loan_opening_balances;
CREATE TRIGGER trigger_update_loan_opening_balances_updated_at
    BEFORE UPDATE ON loan_opening_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_loan_opening_balances_updated_at();

-- Function to update current balance when payments are made
CREATE OR REPLACE FUNCTION update_loan_current_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the current balance of the corresponding loan
    UPDATE loan_opening_balances 
    SET current_balance = current_balance - NEW.principal_amount
    WHERE loan_account_code = CASE 
        WHEN NEW.liability_type = 'bank_loan' AND NEW.principal_amount <= 100000 THEN '2210'
        WHEN NEW.liability_type = 'bank_loan' AND NEW.principal_amount > 100000 THEN '2510' 
        WHEN NEW.liability_type = 'equipment_loan' THEN '2530'
        ELSE '2510'
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update loan balances when payments are made
DROP TRIGGER IF EXISTS trigger_update_loan_balance_on_payment ON liability_payments;
CREATE TRIGGER trigger_update_loan_balance_on_payment
    AFTER INSERT ON liability_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_loan_current_balance();

-- Add comments for documentation
COMMENT ON TABLE loan_opening_balances IS 'Stores loan details, opening balances, and tracks current balances for all company loans';
COMMENT ON COLUMN loan_opening_balances.loan_account_code IS 'Chart of accounts code: 2210 (Current), 2510 (Long-term), 2530 (Equipment)';
COMMENT ON COLUMN loan_opening_balances.loan_name IS 'Descriptive name for the loan (e.g., HDFC Business Loan, Equipment Finance ABC)';
COMMENT ON COLUMN loan_opening_balances.bank_name IS 'Name of the bank or financial institution';
COMMENT ON COLUMN loan_opening_balances.loan_type IS 'Type of loan: bank_loan, equipment_loan, vehicle_loan, business_loan, term_loan';
COMMENT ON COLUMN loan_opening_balances.original_loan_amount IS 'Original sanctioned loan amount';
COMMENT ON COLUMN loan_opening_balances.opening_balance IS 'Outstanding balance as of the opening balance date';
COMMENT ON COLUMN loan_opening_balances.current_balance IS 'Current outstanding balance (updated automatically on payments)';
COMMENT ON COLUMN loan_opening_balances.interest_rate IS 'Annual interest rate percentage';
COMMENT ON COLUMN loan_opening_balances.emi_amount IS 'Monthly EMI amount if applicable';
COMMENT ON COLUMN loan_opening_balances.status IS 'Loan status: active, closed, suspended';


SELECT 'Loan opening balances table created successfully!' as result;