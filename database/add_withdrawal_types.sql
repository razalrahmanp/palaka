-- Add withdrawal type column to withdrawals table (with IF NOT EXISTS check)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'withdrawals' AND column_name = 'withdrawal_type') THEN
        ALTER TABLE withdrawals 
        ADD COLUMN withdrawal_type VARCHAR(50) DEFAULT 'capital_withdrawal' 
        CHECK (withdrawal_type IN ('capital_withdrawal', 'interest_payment', 'profit_distribution'));
        
        -- Add comment for clarity
        COMMENT ON COLUMN withdrawals.withdrawal_type IS 'Type of withdrawal: capital_withdrawal (reduces investment), interest_payment (does not reduce investment), profit_distribution (does not reduce investment)';
        
        -- Create index for performance
        CREATE INDEX idx_withdrawals_type ON withdrawals(withdrawal_type);
    END IF;
END $$;

-- Add new withdrawal categories for interest and profit
INSERT INTO withdrawal_categories (category_name, description, chart_account_code) VALUES
('Interest Payments', 'Interest payments to partners on their investment', '5200'),
('Profit Distributions', 'Distribution of business profits to partners', '3300');

-- Add subcategories
INSERT INTO withdrawal_subcategories (category_id, subcategory_name, description) 
SELECT c.id, 'Monthly Interest', 'Regular monthly interest payment'
FROM withdrawal_categories c WHERE c.category_name = 'Interest Payments';

INSERT INTO withdrawal_subcategories (category_id, subcategory_name, description) 
SELECT c.id, 'Quarterly Interest', 'Quarterly interest payment'
FROM withdrawal_categories c WHERE c.category_name = 'Interest Payments';

INSERT INTO withdrawal_subcategories (category_id, subcategory_name, description) 
SELECT c.id, 'Quarterly Profit', 'Quarterly profit distribution'
FROM withdrawal_categories c WHERE c.category_name = 'Profit Distributions';

INSERT INTO withdrawal_subcategories (category_id, subcategory_name, description) 
SELECT c.id, 'Annual Profit', 'Annual profit distribution'
FROM withdrawal_categories c WHERE c.category_name = 'Profit Distributions';