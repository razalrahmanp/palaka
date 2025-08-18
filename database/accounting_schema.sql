-- ===============================================
-- COMPREHENSIVE ACCOUNTING SYSTEM IMPLEMENTATION
-- ===============================================
-- This file contains the additional tables needed for a full accounting system
-- Implements: Chart of Accounts, General Ledger, Journal Entries, Financial Statements

-- ===============================================
-- 1. CHART OF ACCOUNTS STRUCTURE
-- ===============================================

-- Account Types enum
CREATE TYPE account_type AS ENUM (
  'ASSET',
  'LIABILITY', 
  'EQUITY',
  'REVENUE',
  'EXPENSE'
);

-- Account Sub-types for detailed classification
CREATE TYPE account_subtype AS ENUM (
  -- ASSETS
  'CURRENT_ASSET',
  'FIXED_ASSET',
  'INTANGIBLE_ASSET',
  'OTHER_ASSET',
  
  -- LIABILITIES
  'CURRENT_LIABILITY',
  'LONG_TERM_LIABILITY',
  'OTHER_LIABILITY',
  
  -- EQUITY
  'OWNERS_EQUITY',
  'RETAINED_EARNINGS',
  'CAPITAL',
  
  -- REVENUE
  'OPERATING_REVENUE',
  'OTHER_REVENUE',
  
  -- EXPENSES
  'COST_OF_GOODS_SOLD',
  'OPERATING_EXPENSE',
  'OTHER_EXPENSE',
  'DEPRECIATION'
);

-- Chart of Accounts - The foundation of accounting system
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 1000, 1010, 2000
  account_name VARCHAR(255) NOT NULL,
  account_type account_type NOT NULL,
  account_subtype account_subtype NOT NULL,
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  normal_balance TEXT CHECK (normal_balance IN ('DEBIT', 'CREDIT')) NOT NULL,
  current_balance NUMERIC(15,2) DEFAULT 0,
  opening_balance NUMERIC(15,2) DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- 2. JOURNAL ENTRIES SYSTEM (Double-Entry Accounting)
-- ===============================================

-- Journal Entry Status
CREATE TYPE journal_status AS ENUM (
  'DRAFT',
  'POSTED',
  'REVERSED',
  'ADJUSTED'
);

-- Journal Entry Types
CREATE TYPE journal_entry_type AS ENUM (
  'STANDARD',
  'ADJUSTING',
  'CLOSING',
  'REVERSING',
  'AUTOMATIC'
);

-- Journal Entries Header
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  posting_date DATE,
  reference_number VARCHAR(100),
  description TEXT NOT NULL,
  entry_type journal_entry_type DEFAULT 'STANDARD',
  status journal_status DEFAULT 'DRAFT',
  total_debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  source_document_type VARCHAR(50), -- 'INVOICE', 'PAYMENT', 'PURCHASE_ORDER', etc.
  source_document_id UUID,
  created_by UUID REFERENCES users(id) NOT NULL,
  posted_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  posted_at TIMESTAMP,
  notes TEXT,
  
  -- Ensure double-entry principle: debits = credits
  CONSTRAINT check_balanced_entry CHECK (total_debit = total_credit)
);

-- Journal Entry Line Items (Individual debits and credits)
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE NOT NULL,
  line_number INTEGER NOT NULL,
  account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  description TEXT,
  debit_amount NUMERIC(15,2) DEFAULT 0,
  credit_amount NUMERIC(15,2) DEFAULT 0,
  reference VARCHAR(255),
  
  -- Ensure line has either debit or credit, not both
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (debit_amount = 0 AND credit_amount > 0)
  )
);

-- ===============================================
-- 3. GENERAL LEDGER SYSTEM
-- ===============================================

-- General Ledger - Consolidated view of all account transactions
CREATE TABLE general_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  journal_entry_id UUID REFERENCES journal_entries(id) NOT NULL,
  journal_line_id UUID REFERENCES journal_entry_lines(id) NOT NULL,
  transaction_date DATE NOT NULL,
  posting_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference VARCHAR(255),
  debit_amount NUMERIC(15,2) DEFAULT 0,
  credit_amount NUMERIC(15,2) DEFAULT 0,
  running_balance NUMERIC(15,2) NOT NULL,
  source_document_type VARCHAR(50),
  source_document_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- 4. FINANCIAL PERIODS & CLOSING
-- ===============================================

CREATE TYPE period_status AS ENUM ('OPEN', 'CLOSED', 'LOCKED');

-- Accounting Periods
CREATE TABLE accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  period_type VARCHAR(20) CHECK (period_type IN ('MONTHLY', 'QUARTERLY', 'YEARLY')),
  status period_status DEFAULT 'OPEN',
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_period_dates CHECK (end_date > start_date)
);

-- ===============================================
-- 5. FINANCIAL STATEMENTS STRUCTURE
-- ===============================================

-- Trial Balance View (Auto-calculated)
CREATE VIEW trial_balance AS
SELECT 
  coa.account_code,
  coa.account_name,
  coa.account_type,
  coa.account_subtype,
  coa.normal_balance,
  SUM(gl.debit_amount) as total_debits,
  SUM(gl.credit_amount) as total_credits,
  CASE 
    WHEN coa.normal_balance = 'DEBIT' 
    THEN coa.opening_balance + SUM(gl.debit_amount) - SUM(gl.credit_amount)
    ELSE coa.opening_balance + SUM(gl.credit_amount) - SUM(gl.debit_amount)
  END as balance
FROM chart_of_accounts coa
LEFT JOIN general_ledger gl ON coa.id = gl.account_id
WHERE coa.is_active = true
GROUP BY coa.id, coa.account_code, coa.account_name, coa.account_type, 
         coa.account_subtype, coa.normal_balance, coa.opening_balance
ORDER BY coa.account_code;

-- Balance Sheet View
CREATE VIEW balance_sheet AS
SELECT 
  account_type,
  account_subtype,
  account_code,
  account_name,
  balance
FROM trial_balance
WHERE account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
ORDER BY 
  CASE account_type 
    WHEN 'ASSET' THEN 1 
    WHEN 'LIABILITY' THEN 2 
    WHEN 'EQUITY' THEN 3 
  END,
  account_code;

-- Income Statement (Profit & Loss) View
CREATE VIEW income_statement AS
SELECT 
  account_type,
  account_subtype,
  account_code,
  account_name,
  balance
FROM trial_balance
WHERE account_type IN ('REVENUE', 'EXPENSE')
ORDER BY 
  CASE account_type 
    WHEN 'REVENUE' THEN 1 
    WHEN 'EXPENSE' THEN 2 
  END,
  account_code;

-- ===============================================
-- 6. ACCOUNT RECONCILIATION
-- ===============================================

CREATE TYPE reconciliation_status AS ENUM ('PENDING', 'RECONCILED', 'DISCREPANCY');

-- Bank Reconciliation
CREATE TABLE bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES bank_accounts(id) NOT NULL,
  statement_date DATE NOT NULL,
  statement_ending_balance NUMERIC(15,2) NOT NULL,
  book_ending_balance NUMERIC(15,2) NOT NULL,
  reconciled_balance NUMERIC(15,2),
  status reconciliation_status DEFAULT 'PENDING',
  reconciled_by UUID REFERENCES users(id),
  reconciled_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reconciliation Items (Outstanding checks, deposits in transit, etc.)
CREATE TABLE reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID REFERENCES bank_reconciliations(id) ON DELETE CASCADE,
  transaction_id UUID, -- References bank_transactions or journal_entries
  transaction_type VARCHAR(50), -- 'BANK_TRANSACTION', 'JOURNAL_ENTRY'
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  item_type VARCHAR(50) CHECK (item_type IN ('OUTSTANDING_CHECK', 'DEPOSIT_IN_TRANSIT', 'BANK_FEE', 'INTEREST', 'ERROR', 'OTHER')),
  is_cleared BOOLEAN DEFAULT false,
  cleared_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- 7. ACCOUNTS RECEIVABLE AGING
-- ===============================================

-- AR Aging View
CREATE VIEW accounts_receivable_aging AS
WITH invoice_aging AS (
  SELECT 
    i.id,
    i.customer_id,
    c.name as customer_name,
    i.created_at::date as invoice_date,
    i.total,
    i.paid_amount,
    (i.total - i.paid_amount) as outstanding_amount,
    CURRENT_DATE - i.created_at::date as days_outstanding,
    CASE 
      WHEN CURRENT_DATE - i.created_at::date <= 30 THEN 'Current'
      WHEN CURRENT_DATE - i.created_at::date <= 60 THEN '31-60 Days'
      WHEN CURRENT_DATE - i.created_at::date <= 90 THEN '61-90 Days'
      WHEN CURRENT_DATE - i.created_at::date <= 120 THEN '91-120 Days'
      ELSE 'Over 120 Days'
    END as aging_bucket
  FROM invoices i
  JOIN customers c ON i.customer_id = c.id
  WHERE (i.total - i.paid_amount) > 0
)
SELECT 
  customer_id,
  customer_name,
  SUM(CASE WHEN aging_bucket = 'Current' THEN outstanding_amount ELSE 0 END) as current_amount,
  SUM(CASE WHEN aging_bucket = '31-60 Days' THEN outstanding_amount ELSE 0 END) as days_31_60,
  SUM(CASE WHEN aging_bucket = '61-90 Days' THEN outstanding_amount ELSE 0 END) as days_61_90,
  SUM(CASE WHEN aging_bucket = '91-120 Days' THEN outstanding_amount ELSE 0 END) as days_91_120,
  SUM(CASE WHEN aging_bucket = 'Over 120 Days' THEN outstanding_amount ELSE 0 END) as over_120_days,
  SUM(outstanding_amount) as total_outstanding
FROM invoice_aging
GROUP BY customer_id, customer_name
ORDER BY total_outstanding DESC;

-- ===============================================
-- 8. ACCOUNTS PAYABLE AGING
-- ===============================================

-- AP Aging View
CREATE VIEW accounts_payable_aging AS
WITH bill_aging AS (
  SELECT 
    vb.id,
    vb.supplier_id,
    s.name as supplier_name,
    vb.bill_date,
    vb.due_date,
    vb.total_amount,
    vb.paid_amount,
    vb.remaining_amount,
    CURRENT_DATE - vb.due_date as days_overdue,
    CASE 
      WHEN CURRENT_DATE <= vb.due_date THEN 'Not Due'
      WHEN CURRENT_DATE - vb.due_date <= 30 THEN '1-30 Days'
      WHEN CURRENT_DATE - vb.due_date <= 60 THEN '31-60 Days'
      WHEN CURRENT_DATE - vb.due_date <= 90 THEN '61-90 Days'
      ELSE 'Over 90 Days'
    END as aging_bucket
  FROM vendor_bills vb
  JOIN suppliers s ON vb.supplier_id = s.id
  WHERE vb.remaining_amount > 0
)
SELECT 
  supplier_id,
  supplier_name,
  SUM(CASE WHEN aging_bucket = 'Not Due' THEN remaining_amount ELSE 0 END) as not_due,
  SUM(CASE WHEN aging_bucket = '1-30 Days' THEN remaining_amount ELSE 0 END) as days_1_30,
  SUM(CASE WHEN aging_bucket = '31-60 Days' THEN remaining_amount ELSE 0 END) as days_31_60,
  SUM(CASE WHEN aging_bucket = '61-90 Days' THEN remaining_amount ELSE 0 END) as days_61_90,
  SUM(CASE WHEN aging_bucket = 'Over 90 Days' THEN remaining_amount ELSE 0 END) as over_90_days,
  SUM(remaining_amount) as total_outstanding
FROM bill_aging
GROUP BY supplier_id, supplier_name
ORDER BY total_outstanding DESC;

-- ===============================================
-- 9. AUDIT TRAIL
-- ===============================================

CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'POST', 'REVERSE');

-- Audit Trail for all financial transactions
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  action audit_action NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES users(id) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  description TEXT
);

-- ===============================================
-- 10. TAX CONFIGURATION
-- ===============================================

CREATE TYPE tax_type AS ENUM ('SALES_TAX', 'VAT', 'GST', 'INCOME_TAX', 'PAYROLL_TAX');

-- Tax Codes and Rates
CREATE TABLE tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_code VARCHAR(20) UNIQUE NOT NULL,
  tax_name VARCHAR(100) NOT NULL,
  tax_type tax_type NOT NULL,
  tax_rate NUMERIC(5,4) NOT NULL, -- e.g., 0.1250 for 12.5%
  description TEXT,
  account_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- 11. AUTOMATED JOURNAL ENTRY TEMPLATES
-- ===============================================

-- Templates for automatic journal entries
CREATE TABLE journal_entry_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) NOT NULL,
  template_code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  source_document_type VARCHAR(50) NOT NULL, -- 'INVOICE', 'PAYMENT', etc.
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Template Lines for automated entries
CREATE TABLE journal_template_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES journal_entry_templates(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_code VARCHAR(20) NOT NULL,
  debit_formula TEXT, -- e.g., 'total_amount', 'tax_amount'
  credit_formula TEXT,
  description_template TEXT,
  is_conditional BOOLEAN DEFAULT false,
  condition_field VARCHAR(100),
  condition_operator VARCHAR(10),
  condition_value TEXT
);

-- ===============================================
-- 12. DAYSHEET (Daily Financial Summary)
-- ===============================================

-- Daily Financial Summary
CREATE TABLE daysheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  total_sales NUMERIC(15,2) DEFAULT 0,
  total_receipts NUMERIC(15,2) DEFAULT 0,
  total_expenses NUMERIC(15,2) DEFAULT 0,
  total_purchases NUMERIC(15,2) DEFAULT 0,
  cash_position NUMERIC(15,2) DEFAULT 0,
  bank_balance NUMERIC(15,2) DEFAULT 0,
  net_position NUMERIC(15,2) DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- 12. OPENING BALANCES SYSTEM (Enhanced)
-- ===============================================

-- Enhanced Opening Balance Types for comprehensive business coverage
CREATE TYPE opening_balance_type AS ENUM (
  -- Traditional Types
  'CUSTOMER_RECEIVABLE',
  'VENDOR_OUTSTANDING', -- Updated name for consistency
  'BANK_ACCOUNT',
  'CASH_ACCOUNT',
  'INVENTORY_ASSET',
  'FIXED_ASSET',
  'RETAINED_EARNINGS',
  
  -- Enhanced Business Entity Types
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

-- Enhanced Opening Balances Table
CREATE TABLE opening_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  financial_year INTEGER NOT NULL,
  period_id UUID REFERENCES accounting_periods(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Type and Entity Information
  balance_type opening_balance_type NOT NULL,
  entity_id UUID, -- References customers, suppliers, bank_accounts, etc.
  entity_name VARCHAR(255) NOT NULL, -- Auto-populated from entity
  entity_code VARCHAR(50), -- Auto-populated from entity
  
  -- Account Mapping (Auto-determined based on type)
  debit_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  credit_account_id UUID REFERENCES chart_of_accounts(id) NOT NULL,
  
  -- Amounts
  amount NUMERIC(15,2) NOT NULL CHECK (amount >= 0),
  currency_code VARCHAR(3) DEFAULT 'AED',
  
  -- Additional Details for specific types
  loan_details JSONB, -- For loans: {interest_rate, tenure, monthly_payment, etc.}
  investor_details JSONB, -- For investors: {investment_date, monthly_return_rate, etc.}
  
  -- Reference and Description
  reference_number VARCHAR(100),
  description TEXT,
  notes TEXT,
  
  -- Journal Entry Link
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  -- Status and Audit
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED')),
  is_opening_entry BOOLEAN DEFAULT true,
  
  -- Audit fields
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  posted_by UUID REFERENCES users(id),
  posted_at TIMESTAMP,
  
  CONSTRAINT unique_opening_balance UNIQUE (balance_type, entity_id, financial_year)
);

-- ===============================================
-- 13. LOAN MANAGEMENT SYSTEM
-- ===============================================

-- Loan Types
CREATE TYPE loan_type AS ENUM ('BUSINESS_LOAN', 'GOLD_LOAN', 'PERSONAL_LOAN', 'OTHER');

-- Loans Table
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_number VARCHAR(50) UNIQUE NOT NULL,
  loan_type loan_type NOT NULL,
  
  -- Lender Information
  lender_name VARCHAR(255) NOT NULL,
  lender_contact VARCHAR(100),
  
  -- Loan Details
  principal_amount NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(5,4) NOT NULL, -- Annual percentage
  tenure_months INTEGER NOT NULL,
  monthly_payment NUMERIC(15,2) NOT NULL,
  
  -- Dates
  loan_date DATE NOT NULL,
  first_payment_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  
  -- Current Status
  outstanding_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAID_OFF', 'DEFAULTED')),
  
  -- Gold Loan Specific
  gold_details JSONB, -- {weight, purity, current_value, etc.}
  
  -- Accounting Integration
  loan_account_id UUID REFERENCES chart_of_accounts(id),
  interest_expense_account_id UUID REFERENCES chart_of_accounts(id),
  
  -- Audit
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Loan Payment Schedule
CREATE TABLE loan_payment_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  payment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_amount NUMERIC(15,2) NOT NULL,
  interest_amount NUMERIC(15,2) NOT NULL,
  total_payment NUMERIC(15,2) NOT NULL,
  outstanding_balance NUMERIC(15,2) NOT NULL,
  
  -- Payment Status
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  paid_amount NUMERIC(15,2),
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  CONSTRAINT unique_loan_payment UNIQUE (loan_id, payment_number)
);

-- ===============================================
-- 14. INVESTOR MANAGEMENT SYSTEM
-- ===============================================

-- Investor Types
CREATE TYPE investor_type AS ENUM ('INDIVIDUAL', 'CORPORATE', 'PARTNER', 'SILENT_PARTNER');

-- Investors Table
CREATE TABLE investors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_code VARCHAR(50) UNIQUE NOT NULL,
  investor_name VARCHAR(255) NOT NULL,
  investor_type investor_type NOT NULL,
  
  -- Contact Information
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  
  -- Investment Details
  total_investment NUMERIC(15,2) DEFAULT 0,
  current_balance NUMERIC(15,2) DEFAULT 0,
  monthly_return_rate NUMERIC(5,4), -- Percentage
  fixed_monthly_return NUMERIC(15,2), -- Fixed amount if applicable
  
  -- Dates
  investment_start_date DATE NOT NULL,
  last_return_date DATE,
  next_return_date DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'WITHDRAWN')),
  
  -- Accounting Integration
  investment_account_id UUID REFERENCES chart_of_accounts(id),
  return_expense_account_id UUID REFERENCES chart_of_accounts(id),
  
  -- Audit
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Investor Returns History
CREATE TABLE investor_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID REFERENCES investors(id) ON DELETE CASCADE,
  
  -- Return Details
  return_date DATE NOT NULL,
  return_amount NUMERIC(15,2) NOT NULL,
  calculation_method VARCHAR(50), -- 'PERCENTAGE', 'FIXED_AMOUNT'
  base_amount NUMERIC(15,2), -- Amount used for percentage calculation
  rate_applied NUMERIC(5,4), -- Rate used if percentage
  
  -- Reference
  reference_number VARCHAR(100),
  description TEXT,
  
  -- Payment Status
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
  paid_date DATE,
  payment_method VARCHAR(50),
  
  -- Accounting Integration
  journal_entry_id UUID REFERENCES journal_entries(id),
  
  -- Audit
  created_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ===============================================
-- 15. VIEWS FOR AUTOMATED DROPDOWNS
-- ===============================================

-- Opening Balance Entity Options View (Enhanced)
CREATE VIEW opening_balance_entities AS
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
  
  -- Bank Accounts
  SELECT 
    'BANK_ACCOUNT' as balance_type,
    id as entity_id,
    CONCAT(bank_name, ' - ', account_number) as entity_name,
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
  
  -- Employees for Advances
  SELECT 
    'EMPLOYEE_ADVANCE' as balance_type,
    id as entity_id,
    name as entity_name,
    'Employee' as entity_type
  FROM employees
  WHERE is_active = true
  
  UNION ALL
  
  -- Government Entities (placeholder - can be expanded)
  SELECT 
    'GOVERNMENT_DUES' as balance_type,
    'gov_' || generate_random_uuid() as entity_id,
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
  
  -- Tax Liabilities (placeholder)
  SELECT 
    'TAX_LIABILITY' as balance_type,
    'tax_' || generate_random_uuid() as entity_id,
    entity_name,
    'Tax Authority' as entity_type
  FROM (VALUES 
    ('Corporate Income Tax'),
    ('VAT Payable'),
    ('Withholding Tax'),
    ('Municipal Tax')
  ) AS tax_entities(entity_name);

-- Account Mapping for Opening Balances
CREATE VIEW opening_balance_account_mapping AS
SELECT 
  'CUSTOMER_RECEIVABLE' as balance_type,
  (SELECT id FROM chart_of_accounts WHERE account_code = '1200' LIMIT 1) as debit_account_id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '3000' LIMIT 1) as credit_account_id,
  'Accounts Receivable' as debit_account_name,
  'Opening Balance Equity' as credit_account_name

UNION ALL

SELECT 
  'VENDOR_PAYABLE' as balance_type,
  (SELECT id FROM chart_of_accounts WHERE account_code = '3000' LIMIT 1) as debit_account_id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '2100' LIMIT 1) as credit_account_id,
  'Opening Balance Equity' as debit_account_name,
  'Accounts Payable' as credit_account_name

UNION ALL

SELECT 
  'BANK_ACCOUNT' as balance_type,
  (SELECT id FROM chart_of_accounts WHERE account_code = '1100' LIMIT 1) as debit_account_id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '3000' LIMIT 1) as credit_account_id,
  'Cash and Bank' as debit_account_name,
  'Opening Balance Equity' as credit_account_name

UNION ALL

SELECT 
  'LOAN_LIABILITY' as balance_type,
  (SELECT id FROM chart_of_accounts WHERE account_code = '1100' LIMIT 1) as debit_account_id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '2200' LIMIT 1) as credit_account_id,
  'Cash and Bank' as debit_account_name,
  'Long Term Loans' as credit_account_name

UNION ALL

SELECT 
  'INVESTOR_LIABILITY' as balance_type,
  (SELECT id FROM chart_of_accounts WHERE account_code = '1100' LIMIT 1) as debit_account_id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '2300' LIMIT 1) as credit_account_id,
  'Cash and Bank' as debit_account_name,
  'Investor Payable' as credit_account_name

UNION ALL

SELECT 
  'INVESTOR_EQUITY' as balance_type,
  (SELECT id FROM chart_of_accounts WHERE account_code = '1100' LIMIT 1) as debit_account_id,
  (SELECT id FROM chart_of_accounts WHERE account_code = '3100' LIMIT 1) as credit_account_id,
  'Cash and Bank' as debit_account_name,
  'Partner Capital' as credit_account_name;

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Chart of Accounts indexes
CREATE INDEX idx_chart_of_accounts_code ON chart_of_accounts(account_code);
CREATE INDEX idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX idx_chart_of_accounts_active ON chart_of_accounts(is_active);

-- Opening Balances indexes
CREATE INDEX idx_opening_balances_type ON opening_balances(balance_type);
CREATE INDEX idx_opening_balances_entity ON opening_balances(entity_id);
CREATE INDEX idx_opening_balances_year ON opening_balances(financial_year);
CREATE INDEX idx_opening_balances_status ON opening_balances(status);

-- Loans indexes
CREATE INDEX idx_loans_status ON loans(status);
CREATE INDEX idx_loans_type ON loans(loan_type);
CREATE INDEX idx_loans_dates ON loans(loan_date, maturity_date);

-- Loan Payment Schedule indexes
CREATE INDEX idx_loan_payments_loan ON loan_payment_schedule(loan_id);
CREATE INDEX idx_loan_payments_due_date ON loan_payment_schedule(due_date);
CREATE INDEX idx_loan_payments_status ON loan_payment_schedule(is_paid);

-- Investors indexes
CREATE INDEX idx_investors_status ON investors(status);
CREATE INDEX idx_investors_type ON investors(investor_type);
CREATE INDEX idx_investors_return_date ON investors(next_return_date);

-- Investor Returns indexes
CREATE INDEX idx_investor_returns_investor ON investor_returns(investor_id);
CREATE INDEX idx_investor_returns_date ON investor_returns(return_date);
CREATE INDEX idx_investor_returns_status ON investor_returns(status);

-- Journal Entries indexes
CREATE INDEX idx_journal_entries_date ON journal_entries(entry_date);
CREATE INDEX idx_journal_entries_number ON journal_entries(journal_number);
CREATE INDEX idx_journal_entries_status ON journal_entries(status);
CREATE INDEX idx_journal_entries_source ON journal_entries(source_document_type, source_document_id);

-- General Ledger indexes
CREATE INDEX idx_general_ledger_account ON general_ledger(account_id);
CREATE INDEX idx_general_ledger_date ON general_ledger(transaction_date);
CREATE INDEX idx_general_ledger_posting_date ON general_ledger(posting_date);
CREATE INDEX idx_general_ledger_source ON general_ledger(source_document_type, source_document_id);

-- Journal Entry Lines indexes
CREATE INDEX idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_entry_lines(account_id);

-- Audit Trail indexes
CREATE INDEX idx_audit_trail_table_record ON audit_trail(table_name, record_id);
CREATE INDEX idx_audit_trail_user_time ON audit_trail(user_id, timestamp);

-- ===============================================
-- AUTOMATED FUNCTIONS FOR OPENING BALANCES
-- ===============================================

-- Function to auto-create journal entries for opening balances
CREATE OR REPLACE FUNCTION create_opening_balance_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  journal_entry_id UUID;
  journal_number VARCHAR(50);
  account_mapping RECORD;
BEGIN
  -- Only process when status changes to 'POSTED'
  IF NEW.status = 'POSTED' AND (OLD.status IS NULL OR OLD.status != 'POSTED') THEN
    
    -- Get account mapping for this balance type
    SELECT * INTO account_mapping 
    FROM opening_balance_account_mapping 
    WHERE balance_type = NEW.balance_type;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No account mapping found for balance type: %', NEW.balance_type;
    END IF;
    
    -- Generate journal number
    SELECT COALESCE(MAX(CAST(journal_number AS INTEGER)), 0) + 1 
    INTO journal_number
    FROM journal_entries 
    WHERE journal_number ~ '^[0-9]+$';
    
    journal_number := LPAD(journal_number, 6, '0');
    
    -- Create journal entry header
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
      journal_number,
      NEW.entry_date,
      CONCAT('Opening Balance - ', NEW.entity_name),
      'STANDARD',
      'POSTED',
      NEW.amount,
      NEW.amount,
      'OPENING_BALANCE',
      NEW.id,
      NEW.created_by
    ) RETURNING id INTO journal_entry_id;
    
    -- Create debit line
    INSERT INTO journal_entry_lines (
      journal_entry_id,
      line_number,
      account_id,
      description,
      debit_amount,
      credit_amount
    ) VALUES (
      journal_entry_id,
      1,
      account_mapping.debit_account_id,
      CONCAT('Opening Balance - ', NEW.entity_name),
      NEW.amount,
      0
    );
    
    -- Create credit line
    INSERT INTO journal_entry_lines (
      journal_entry_id,
      line_number,
      account_id,
      description,
      debit_amount,
      credit_amount
    ) VALUES (
      journal_entry_id,
      2,
      account_mapping.credit_account_id,
      CONCAT('Opening Balance - ', NEW.entity_name),
      0,
      NEW.amount
    );
    
    -- Update opening balance record with journal entry reference
    UPDATE opening_balances 
    SET journal_entry_id = journal_entry_id,
        posted_by = NEW.created_by,
        posted_at = NOW()
    WHERE id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic journal entry creation
CREATE TRIGGER trigger_create_opening_balance_journal
AFTER UPDATE OF status ON opening_balances
FOR EACH ROW EXECUTE FUNCTION create_opening_balance_journal_entry();

-- Function to auto-populate entity details in opening balances
CREATE OR REPLACE FUNCTION populate_opening_balance_entity_details()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-populate entity details based on balance type and entity_id
  CASE NEW.balance_type
    WHEN 'CUSTOMER_RECEIVABLE' THEN
      SELECT name, customer_code INTO NEW.entity_name, NEW.entity_code
      FROM customers WHERE id = NEW.entity_id;
      
    WHEN 'VENDOR_PAYABLE' THEN
      SELECT name, supplier_code INTO NEW.entity_name, NEW.entity_code
      FROM suppliers WHERE id = NEW.entity_id;
      
    WHEN 'BANK_ACCOUNT' THEN
      SELECT account_name, account_number INTO NEW.entity_name, NEW.entity_code
      FROM bank_accounts WHERE id = NEW.entity_id;
      
    WHEN 'LOAN_LIABILITY' THEN
      SELECT CONCAT(loan_type, ': ', lender_name), loan_number INTO NEW.entity_name, NEW.entity_code
      FROM loans WHERE id = NEW.entity_id;
      
    WHEN 'INVESTOR_LIABILITY', 'INVESTOR_EQUITY' THEN
      SELECT investor_name, investor_code INTO NEW.entity_name, NEW.entity_code
      FROM investors WHERE id = NEW.entity_id;
  END CASE;
  
  -- Auto-populate account mappings
  IF NEW.debit_account_id IS NULL OR NEW.credit_account_id IS NULL THEN
    SELECT debit_account_id, credit_account_id 
    INTO NEW.debit_account_id, NEW.credit_account_id
    FROM opening_balance_account_mapping 
    WHERE balance_type = NEW.balance_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-populating entity details
CREATE TRIGGER trigger_populate_opening_balance_details
BEFORE INSERT OR UPDATE ON opening_balances
FOR EACH ROW EXECUTE FUNCTION populate_opening_balance_entity_details();

-- Function to generate loan payment schedule
CREATE OR REPLACE FUNCTION generate_loan_payment_schedule(loan_id_param UUID)
RETURNS VOID AS $$
DECLARE
  loan_rec RECORD;
  payment_date DATE;
  payment_num INTEGER;
  principal_payment NUMERIC(15,2);
  interest_payment NUMERIC(15,2);
  remaining_balance NUMERIC(15,2);
  monthly_rate NUMERIC;
BEGIN
  -- Get loan details
  SELECT * INTO loan_rec FROM loans WHERE id = loan_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loan not found: %', loan_id_param;
  END IF;
  
  -- Clear existing schedule
  DELETE FROM loan_payment_schedule WHERE loan_id = loan_id_param;
  
  -- Initialize variables
  monthly_rate := loan_rec.interest_rate / 12 / 100;
  remaining_balance := loan_rec.principal_amount;
  payment_date := loan_rec.first_payment_date;
  
  -- Generate payment schedule
  FOR payment_num IN 1..loan_rec.tenure_months LOOP
    -- Calculate interest and principal for this payment
    interest_payment := remaining_balance * monthly_rate;
    principal_payment := loan_rec.monthly_payment - interest_payment;
    
    -- Adjust last payment for any rounding differences
    IF payment_num = loan_rec.tenure_months THEN
      principal_payment := remaining_balance;
    END IF;
    
    -- Insert payment record
    INSERT INTO loan_payment_schedule (
      loan_id,
      payment_number,
      due_date,
      principal_amount,
      interest_amount,
      total_payment,
      outstanding_balance
    ) VALUES (
      loan_id_param,
      payment_num,
      payment_date,
      principal_payment,
      interest_payment,
      principal_payment + interest_payment,
      remaining_balance - principal_payment
    );
    
    -- Update for next iteration
    remaining_balance := remaining_balance - principal_payment;
    payment_date := payment_date + INTERVAL '1 month';
  END LOOP;
  
  -- Update loan outstanding balance
  UPDATE loans 
  SET outstanding_balance = principal_amount
  WHERE id = loan_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate payment schedule when loan is created
CREATE OR REPLACE FUNCTION trigger_generate_loan_schedule()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM generate_loan_payment_schedule(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_loan_schedule
AFTER INSERT ON loans
FOR EACH ROW EXECUTE FUNCTION trigger_generate_loan_schedule();

-- ===============================================
-- TRIGGERS FOR AUTOMATION
-- ===============================================

-- Function to update account balances when general ledger changes
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE chart_of_accounts 
    SET current_balance = CASE 
      WHEN normal_balance = 'DEBIT' 
      THEN current_balance + NEW.debit_amount - NEW.credit_amount
      ELSE current_balance + NEW.credit_amount - NEW.debit_amount
    END,
    updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE chart_of_accounts 
    SET current_balance = CASE 
      WHEN normal_balance = 'DEBIT' 
      THEN current_balance - OLD.debit_amount + OLD.credit_amount
      ELSE current_balance - OLD.credit_amount + OLD.debit_amount
    END,
    updated_at = NOW()
    WHERE id = OLD.account_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update account balances
CREATE TRIGGER trigger_update_account_balance
AFTER INSERT OR DELETE ON general_ledger
FOR EACH ROW EXECUTE FUNCTION update_account_balance();

-- Function to auto-generate journal entries from posted journal entries
CREATE OR REPLACE FUNCTION create_general_ledger_entries()
RETURNS TRIGGER AS $$
DECLARE
  line_rec RECORD;
  running_balance NUMERIC(15,2);
BEGIN
  -- Only process when status changes to 'POSTED'
  IF NEW.status = 'POSTED' AND (OLD.status IS NULL OR OLD.status != 'POSTED') THEN
    
    -- Process each journal entry line
    FOR line_rec IN 
      SELECT * FROM journal_entry_lines 
      WHERE journal_entry_id = NEW.id 
      ORDER BY line_number
    LOOP
      -- Calculate running balance for the account
      SELECT COALESCE(
        (SELECT running_balance FROM general_ledger 
         WHERE account_id = line_rec.account_id 
         ORDER BY created_at DESC, id DESC 
         LIMIT 1), 
        (SELECT opening_balance FROM chart_of_accounts WHERE id = line_rec.account_id)
      ) INTO running_balance;
      
      -- Update running balance
      running_balance := running_balance + line_rec.debit_amount - line_rec.credit_amount;
      
      -- Insert into general ledger
      INSERT INTO general_ledger (
        account_id,
        journal_entry_id,
        journal_line_id,
        transaction_date,
        posting_date,
        description,
        reference,
        debit_amount,
        credit_amount,
        running_balance,
        source_document_type,
        source_document_id
      ) VALUES (
        line_rec.account_id,
        NEW.id,
        line_rec.id,
        NEW.entry_date,
        NEW.posting_date,
        line_rec.description,
        NEW.reference_number,
        line_rec.debit_amount,
        line_rec.credit_amount,
        running_balance,
        NEW.source_document_type,
        NEW.source_document_id
      );
    END LOOP;
    
    -- Update posting timestamp
    UPDATE journal_entries 
    SET posted_at = NOW() 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create general ledger entries when journal entry is posted
CREATE TRIGGER trigger_create_gl_entries
AFTER UPDATE OF status ON journal_entries
FOR EACH ROW EXECUTE FUNCTION create_general_ledger_entries();

-- Function for audit trail
CREATE OR REPLACE FUNCTION create_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  audit_action audit_action;
  old_data JSONB;
  new_data JSONB;
BEGIN
  -- Determine action
  IF TG_OP = 'DELETE' THEN
    audit_action := 'DELETE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    audit_action := 'UPDATE';
    old_data := row_to_json(OLD)::JSONB;
    new_data := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'INSERT' THEN
    audit_action := 'CREATE';
    old_data := NULL;
    new_data := row_to_json(NEW)::JSONB;
  END IF;

  -- Insert audit record
  INSERT INTO audit_trail (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id,
    timestamp
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    audit_action,
    old_data,
    new_data,
    COALESCE(NEW.created_by, NEW.updated_by, OLD.created_by, OLD.updated_by),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key financial tables
CREATE TRIGGER audit_journal_entries
AFTER INSERT OR UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION create_audit_trail();

CREATE TRIGGER audit_journal_entry_lines
AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
FOR EACH ROW EXECUTE FUNCTION create_audit_trail();

CREATE TRIGGER audit_chart_of_accounts
AFTER INSERT OR UPDATE OR DELETE ON chart_of_accounts
FOR EACH ROW EXECUTE FUNCTION create_audit_trail();
