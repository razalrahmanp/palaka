-- Create liability_payments table for tracking loan and liability payments
-- This table will store payments made towards bank loans, equipment loans, and other liabilities

CREATE TABLE IF NOT EXISTS liability_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    liability_type VARCHAR(50) NOT NULL CHECK (liability_type IN ('bank_loan', 'bank_loan_current', 'equipment_loan', 'other_liability')),
    principal_amount DECIMAL(15,2) DEFAULT 0.00,
    interest_amount DECIMAL(15,2) DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'cheque', 'online', 'upi')),
    bank_account_id UUID REFERENCES bank_accounts(id),
    upi_reference VARCHAR(100),
    reference_number VARCHAR(100),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_liability_payments_date ON liability_payments(date);
CREATE INDEX IF NOT EXISTS idx_liability_payments_liability_type ON liability_payments(liability_type);
CREATE INDEX IF NOT EXISTS idx_liability_payments_bank_account ON liability_payments(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_liability_payments_created_at ON liability_payments(created_at);

-- Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_liability_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_liability_payments_updated_at ON liability_payments;
CREATE TRIGGER trigger_update_liability_payments_updated_at
    BEFORE UPDATE ON liability_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_liability_payments_updated_at();

-- Add comments for documentation
COMMENT ON TABLE liability_payments IS 'Records payments made towards bank loans, equipment loans, and other liabilities with proper principal/interest breakdown';
COMMENT ON COLUMN liability_payments.liability_type IS 'Type of liability: bank_loan, bank_loan_current, equipment_loan, other_liability';
COMMENT ON COLUMN liability_payments.principal_amount IS 'Amount paid towards principal reduction';
COMMENT ON COLUMN liability_payments.interest_amount IS 'Amount paid towards interest expense';
COMMENT ON COLUMN liability_payments.total_amount IS 'Total payment amount (principal + interest)';
COMMENT ON COLUMN liability_payments.payment_method IS 'Method of payment: cash, bank_transfer, card, cheque, online, upi';
COMMENT ON COLUMN liability_payments.bank_account_id IS 'Bank account used for payment (if not cash)';
COMMENT ON COLUMN liability_payments.upi_reference IS 'UPI transaction reference number';
COMMENT ON COLUMN liability_payments.reference_number IS 'Check number, transaction ID, or other reference';

-- Sample data for testing (optional - remove in production)
/*
INSERT INTO liability_payments (
    date,
    liability_type,
    principal_amount,
    interest_amount,
    total_amount,
    description,
    payment_method,
    reference_number
) VALUES 
(
    CURRENT_DATE,
    'bank_loan',
    15000.00,
    2500.00,
    17500.00,
    'Monthly bank loan payment - Principal and Interest',
    'bank_transfer',
    'TXN123456789'
),
(
    CURRENT_DATE - INTERVAL '1 month',
    'equipment_loan',
    8000.00,
    1200.00,
    9200.00,
    'Equipment loan EMI payment',
    'bank_transfer',
    'TXN987654321'
);
*/

SELECT 'Liability payments table created successfully!' as result;