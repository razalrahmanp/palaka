-- ===============================================
-- ENHANCED OPENING BALANCE SYSTEM - SCHEMA FIXES
-- ===============================================
-- Run this in your Supabase SQL editor to fix the database schema issues

-- 1. Create opening balance type enum (if not exists)
DO $$ BEGIN
    CREATE TYPE opening_balance_type AS ENUM (
        'VENDOR_OUTSTANDING',
        'BANK_LOAN', 
        'PERSONAL_LOAN',
        'GOLD_LOAN',
        'INVESTOR_CAPITAL',
        'MONTHLY_RETURNS',
        'GOVERNMENT_DUES',
        'TAX_LIABILITY',
        'EMPLOYEE_ADVANCE',
        'CUSTOMER_ADVANCE',
        'OTHER_RECEIVABLES',
        'OTHER_PAYABLES'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create opening balance status enum (if not exists)
DO $$ BEGIN
    CREATE TYPE opening_balance_status AS ENUM ('DRAFT', 'POSTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create enhanced opening balances table
CREATE TABLE IF NOT EXISTS enhanced_opening_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    balance_type opening_balance_type NOT NULL,
    entity_id VARCHAR NOT NULL,
    entity_name VARCHAR NOT NULL,
    entity_type VARCHAR NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    financial_year INTEGER NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number VARCHAR(100),
    description TEXT,
    status opening_balance_status DEFAULT 'DRAFT',
    debit_account_id UUID, -- No foreign key constraint for now
    credit_account_id UUID, -- No foreign key constraint for now
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- No foreign key constraint for now
    posted_at TIMESTAMP,
    posted_by UUID -- No foreign key constraint for now
);

-- 4. Create loans table for loan-related balance types
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_number VARCHAR(50) UNIQUE,
    lender_name VARCHAR(255) NOT NULL,
    loan_type VARCHAR(50) NOT NULL, -- 'BUSINESS_LOAN', 'PERSONAL_LOAN', 'GOLD_LOAN'
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2),
    loan_date DATE NOT NULL,
    maturity_date DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    collateral_description TEXT,
    monthly_payment DECIMAL(15,2),
    outstanding_balance DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create investors table for investor-related balance types
CREATE TABLE IF NOT EXISTS investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_code VARCHAR(50) UNIQUE,
    investor_name VARCHAR(255) NOT NULL,
    investor_type VARCHAR(50) NOT NULL, -- 'INDIVIDUAL', 'CORPORATE', 'PARTNER'
    investment_amount DECIMAL(15,2),
    investment_date DATE,
    equity_percentage DECIMAL(5,2),
    monthly_return_rate DECIMAL(5,2),
    fixed_monthly_return DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    contact_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create opening balance entities view
CREATE OR REPLACE VIEW opening_balance_entities AS
  -- Suppliers/Vendors for Outstanding Payments
  SELECT 
    'VENDOR_OUTSTANDING' as balance_type,
    id as entity_id,
    name as entity_name,
    'Supplier' as entity_type
  FROM suppliers
  WHERE is_active = true
  
  UNION ALL
  
  -- Customers for Outstanding Receivables
  SELECT 
    'CUSTOMER_RECEIVABLE' as balance_type,
    id as entity_id,
    name as entity_name,
    'Customer' as entity_type
  FROM customers
  WHERE is_active = true
  
  UNION ALL
  
  -- Bank Accounts (if table exists)
  SELECT 
    'BANK_ACCOUNT' as balance_type,
    id as entity_id,
    COALESCE(account_name, CONCAT(bank_name, ' - ', account_number)) as entity_name,
    'Bank Account' as entity_type
  FROM bank_accounts
  WHERE is_active = true
  
  UNION ALL
  
  -- Bank Loans
  SELECT 
    'BANK_LOAN' as balance_type,
    id as entity_id,
    CONCAT('Bank Loan: ', lender_name) as entity_name,
    'Bank' as entity_type
  FROM loans
  WHERE status = 'ACTIVE' AND loan_type = 'BUSINESS_LOAN'
  
  UNION ALL
  
  -- Personal Loans
  SELECT 
    'PERSONAL_LOAN' as balance_type,
    id as entity_id,
    CONCAT('Personal Loan: ', lender_name) as entity_name,
    'Individual' as entity_type
  FROM loans
  WHERE status = 'ACTIVE' AND loan_type = 'PERSONAL_LOAN'
  
  UNION ALL
  
  -- Gold Loans
  SELECT 
    'GOLD_LOAN' as balance_type,
    id as entity_id,
    CONCAT('Gold Loan: ', lender_name) as entity_name,
    'Financial Institution' as entity_type
  FROM loans
  WHERE status = 'ACTIVE' AND loan_type = 'GOLD_LOAN'
  
  UNION ALL
  
  -- Investor Capital
  SELECT 
    'INVESTOR_CAPITAL' as balance_type,
    id as entity_id,
    investor_name as entity_name,
    CASE 
      WHEN investor_type = 'INDIVIDUAL' THEN 'Individual Investor'
      WHEN investor_type = 'CORPORATE' THEN 'Corporate Investor'
      ELSE 'Partner'
    END as entity_type
  FROM investors
  WHERE status = 'ACTIVE'
  
  UNION ALL
  
  -- Monthly Returns to Investors
  SELECT 
    'MONTHLY_RETURNS' as balance_type,
    id as entity_id,
    CONCAT('Monthly Returns: ', investor_name) as entity_name,
    'Investor Return' as entity_type
  FROM investors
  WHERE status = 'ACTIVE' AND (monthly_return_rate > 0 OR fixed_monthly_return > 0)
  
  UNION ALL
  
  -- Employees for Advances (if table exists)
  SELECT 
    'EMPLOYEE_ADVANCE' as balance_type,
    id as entity_id,
    name as entity_name,
    'Employee' as entity_type
  FROM employees
  WHERE is_active = true
  
  UNION ALL
  
  -- Government Entities (static list)
  SELECT 
    'GOVERNMENT_DUES' as balance_type,
    'gov_' || ROW_NUMBER() OVER() as entity_id,
    entity_name,
    'Government' as entity_type
  FROM (VALUES 
    ('VAT Authority'),
    ('Labour Department'),
    ('Municipality'),
    ('Chamber of Commerce'),
    ('Trade License Authority')
  ) AS govt_entities(entity_name)
  
  UNION ALL
  
  -- Tax Liabilities (static list)
  SELECT 
    'TAX_LIABILITY' as balance_type,
    'tax_' || ROW_NUMBER() OVER() as entity_id,
    entity_name,
    'Tax Authority' as entity_type
  FROM (VALUES 
    ('Corporate Income Tax'),
    ('VAT Payable'),
    ('Withholding Tax'),
    ('Municipal Tax')
  ) AS tax_entities(entity_name);

-- 7. Create opening balance account mapping view
CREATE OR REPLACE VIEW opening_balance_account_mapping AS
SELECT 
    'VENDOR_OUTSTANDING' as balance_type,
    'EXPENSE' as default_debit_account,
    'LIABILITY' as default_credit_account,
    'Vendor Outstanding Expense' as debit_account_name,
    'Accounts Payable' as credit_account_name
    
UNION ALL

SELECT 
    'BANK_LOAN' as balance_type,
    'ASSET' as default_debit_account,
    'LIABILITY' as default_credit_account,
    'Cash/Bank Account' as debit_account_name,
    'Bank Loan Payable' as credit_account_name
    
UNION ALL

SELECT 
    'PERSONAL_LOAN' as balance_type,
    'ASSET' as default_debit_account,
    'LIABILITY' as default_credit_account,
    'Cash Account' as debit_account_name,
    'Personal Loan Payable' as credit_account_name
    
UNION ALL

SELECT 
    'GOLD_LOAN' as balance_type,
    'ASSET' as default_debit_account,
    'LIABILITY' as default_credit_account,
    'Cash Account' as debit_account_name,
    'Gold Loan Payable' as credit_account_name
    
UNION ALL

SELECT 
    'INVESTOR_CAPITAL' as balance_type,
    'ASSET' as default_debit_account,
    'EQUITY' as default_credit_account,
    'Cash Account' as debit_account_name,
    'Investor Capital' as credit_account_name
    
UNION ALL

SELECT 
    'MONTHLY_RETURNS' as balance_type,
    'EXPENSE' as default_debit_account,
    'LIABILITY' as default_credit_account,
    'Monthly Return Expense' as debit_account_name,
    'Returns Payable' as credit_account_name
    
UNION ALL

SELECT 
    'GOVERNMENT_DUES' as balance_type,
    'EXPENSE' as default_debit_account,
    'LIABILITY' as default_credit_account,
    'Government Fees Expense' as debit_account_name,
    'Government Dues Payable' as credit_account_name
    
UNION ALL

SELECT 
    'TAX_LIABILITY' as balance_type,
    'EXPENSE' as default_debit_account,
    'LIABILITY' as default_credit_account,
    'Tax Expense' as debit_account_name,
    'Tax Payable' as credit_account_name
    
UNION ALL

SELECT 
    'EMPLOYEE_ADVANCE' as balance_type,
    'ASSET' as default_debit_account,
    'ASSET' as default_credit_account,
    'Employee Advance Receivable' as debit_account_name,
    'Cash Account' as credit_account_name
    
UNION ALL

SELECT 
    'CUSTOMER_ADVANCE' as balance_type,
    'ASSET' as default_debit_account,
    'LIABILITY' as default_credit_account,
    'Cash Account' as debit_account_name,
    'Customer Advance Payable' as credit_account_name
    
UNION ALL

SELECT 
    'OTHER_RECEIVABLES' as balance_type,
    'ASSET' as default_debit_account,
    'ASSET' as default_credit_account,
    'Other Receivables' as debit_account_name,
    'Cash Account' as credit_account_name
    
UNION ALL

SELECT 
    'OTHER_PAYABLES' as balance_type,
    'EXPENSE' as default_debit_account,
    'LIABILITY' as default_credit_account,
    'Other Expenses' as debit_account_name,
    'Other Payables' as credit_account_name;

-- 8. Insert sample loan data (optional)
INSERT INTO loans (loan_number, lender_name, loan_type, principal_amount, interest_rate, loan_date, status)
VALUES 
    ('BL001', 'HDFC Bank', 'BUSINESS_LOAN', 500000.00, 12.50, '2024-01-15', 'ACTIVE'),
    ('PL001', 'John Smith', 'PERSONAL_LOAN', 100000.00, 15.00, '2024-02-20', 'ACTIVE'),
    ('GL001', 'Malabar Gold', 'GOLD_LOAN', 75000.00, 10.50, '2024-03-10', 'ACTIVE')
ON CONFLICT (loan_number) DO NOTHING;

-- 9. Insert sample investor data (optional)
INSERT INTO investors (investor_code, investor_name, investor_type, investment_amount, investment_date, monthly_return_rate, status)
VALUES 
    ('INV001', 'Ahmed Investment LLC', 'CORPORATE', 1000000.00, '2024-01-01', 2.5, 'ACTIVE'),
    ('INV002', 'Sarah Abdullah', 'INDIVIDUAL', 500000.00, '2024-02-15', 3.0, 'ACTIVE'),
    ('INV003', 'Business Partners Group', 'PARTNER', 750000.00, '2024-03-01', 2.8, 'ACTIVE')
ON CONFLICT (investor_code) DO NOTHING;

-- 10. Fix suppliers table if contact_person column is missing
DO $$ 
BEGIN
    -- Check if contact_person column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'suppliers' AND column_name = 'contact_person'
    ) THEN
        ALTER TABLE suppliers ADD COLUMN contact_person VARCHAR(255);
    END IF;
END $$;

-- 11. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enhanced_opening_balances_type ON enhanced_opening_balances(balance_type);
CREATE INDEX IF NOT EXISTS idx_enhanced_opening_balances_year ON enhanced_opening_balances(financial_year);
CREATE INDEX IF NOT EXISTS idx_enhanced_opening_balances_status ON enhanced_opening_balances(status);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_type ON loans(loan_type);
CREATE INDEX IF NOT EXISTS idx_investors_status ON investors(status);
CREATE INDEX IF NOT EXISTS idx_investors_type ON investors(investor_type);

-- Success message
SELECT 'Enhanced Opening Balance Schema Applied Successfully! ✅' as status;
