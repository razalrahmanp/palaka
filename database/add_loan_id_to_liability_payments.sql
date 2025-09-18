-- Add loan_id column to liability_payments table to link payments to specific loans
-- This creates the connection between loan setup and liability payments

-- Add loan_id column with foreign key reference to loan_opening_balances
ALTER TABLE liability_payments 
ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES loan_opening_balances(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_liability_payments_loan_id ON liability_payments(loan_id);

-- Add comment for documentation
COMMENT ON COLUMN liability_payments.loan_id IS 'Reference to specific loan when payment is made against a loan from loan_opening_balances table';

-- Update existing liability payments to be nullable since existing records won't have loan_id
-- New payments should include loan_id when paying specific loans