-- ===============================================
-- DEFAULT CHART OF ACCOUNTS FOR FURNITURE ERP
-- ===============================================
-- This file contains the standard chart of accounts setup for a furniture business

-- Insert default account structure
INSERT INTO chart_of_accounts (account_code, account_name, account_type, account_subtype, normal_balance, description) VALUES

-- ===============================================
-- ASSETS (1000-1999)
-- ===============================================

-- Current Assets (1000-1199)
('1000', 'ASSETS', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Main Assets Account'),
('1010', 'Cash', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Cash on hand'),
('1020', 'Petty Cash', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Small cash fund for minor expenses'),
('1100', 'Bank Accounts', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'All bank account balances'),
('1110', 'Checking Account', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Primary business checking account'),
('1120', 'Savings Account', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Business savings account'),
('1200', 'Accounts Receivable', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Money owed by customers'),
('1210', 'Trade Receivables', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Outstanding customer invoices'),
('1220', 'Other Receivables', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Non-trade receivables'),
('1230', 'Allowance for Bad Debts', 'ASSET', 'CURRENT_ASSET', 'CREDIT', 'Provision for uncollectible accounts'),
('1300', 'Inventory', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Inventory and stock'),
('1310', 'Raw Materials', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Materials for furniture production'),
('1320', 'Work in Progress', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Partially completed furniture'),
('1330', 'Finished Goods', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Completed furniture ready for sale'),
('1340', 'Supplies Inventory', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Office and production supplies'),
('1400', 'Prepaid Expenses', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Expenses paid in advance'),
('1410', 'Prepaid Insurance', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Insurance premiums paid in advance'),
('1420', 'Prepaid Rent', 'ASSET', 'CURRENT_ASSET', 'DEBIT', 'Rent paid in advance'),

-- Fixed Assets (1500-1699)
('1500', 'Property, Plant & Equipment', 'ASSET', 'FIXED_ASSET', 'DEBIT', 'Long-term physical assets'),
('1510', 'Land', 'ASSET', 'FIXED_ASSET', 'DEBIT', 'Business property land'),
('1520', 'Buildings', 'ASSET', 'FIXED_ASSET', 'DEBIT', 'Business buildings and structures'),
('1521', 'Accumulated Depreciation - Buildings', 'ASSET', 'FIXED_ASSET', 'CREDIT', 'Depreciation on buildings'),
('1530', 'Machinery & Equipment', 'ASSET', 'FIXED_ASSET', 'DEBIT', 'Production machinery and equipment'),
('1531', 'Accumulated Depreciation - Machinery', 'ASSET', 'FIXED_ASSET', 'CREDIT', 'Depreciation on machinery'),
('1540', 'Furniture & Fixtures', 'ASSET', 'FIXED_ASSET', 'DEBIT', 'Office furniture and fixtures'),
('1541', 'Accumulated Depreciation - Furniture', 'ASSET', 'FIXED_ASSET', 'CREDIT', 'Depreciation on furniture'),
('1550', 'Vehicles', 'ASSET', 'FIXED_ASSET', 'DEBIT', 'Delivery trucks and company vehicles'),
('1551', 'Accumulated Depreciation - Vehicles', 'ASSET', 'FIXED_ASSET', 'CREDIT', 'Depreciation on vehicles'),
('1560', 'Computer Equipment', 'ASSET', 'FIXED_ASSET', 'DEBIT', 'Computers and IT equipment'),
('1561', 'Accumulated Depreciation - Computers', 'ASSET', 'FIXED_ASSET', 'CREDIT', 'Depreciation on computers'),

-- Intangible Assets (1700-1799)
('1700', 'Intangible Assets', 'ASSET', 'INTANGIBLE_ASSET', 'DEBIT', 'Non-physical assets'),
('1710', 'Goodwill', 'ASSET', 'INTANGIBLE_ASSET', 'DEBIT', 'Business goodwill'),
('1720', 'Patents & Trademarks', 'ASSET', 'INTANGIBLE_ASSET', 'DEBIT', 'Intellectual property'),
('1730', 'Software Licenses', 'ASSET', 'INTANGIBLE_ASSET', 'DEBIT', 'Software and licenses'),

-- ===============================================
-- LIABILITIES (2000-2999)
-- ===============================================

-- Current Liabilities (2000-2199)
('2000', 'LIABILITIES', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Main Liabilities Account'),
('2010', 'Accounts Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Money owed to suppliers'),
('2020', 'Trade Payables', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Outstanding supplier invoices'),
('2030', 'Other Payables', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Non-trade payables'),
('2100', 'Accrued Expenses', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Expenses incurred but not paid'),
('2110', 'Accrued Wages', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Wages earned but not paid'),
('2120', 'Accrued Interest', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Interest owed but not paid'),
('2130', 'Accrued Utilities', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Utility bills owed'),
('2200', 'Short-term Loans', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Loans due within one year'),
('2210', 'Bank Loan - Current Portion', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Current portion of long-term loans'),
('2300', 'Taxes Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Taxes owed'),
('2310', 'Income Tax Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Income taxes owed'),
('2320', 'Sales Tax Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Sales taxes collected'),
('2330', 'GST Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'GST taxes owed'),
('2340', 'Payroll Tax Payable', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Payroll taxes owed'),
('2400', 'Deferred Revenue', 'LIABILITY', 'CURRENT_LIABILITY', 'CREDIT', 'Payments received in advance'),

-- Long-term Liabilities (2500-2699)
('2500', 'Long-term Debt', 'LIABILITY', 'LONG_TERM_LIABILITY', 'CREDIT', 'Long-term loans and mortgages'),
('2510', 'Bank Loans', 'LIABILITY', 'LONG_TERM_LIABILITY', 'CREDIT', 'Long-term bank loans'),
('2520', 'Mortgage Payable', 'LIABILITY', 'LONG_TERM_LIABILITY', 'CREDIT', 'Property mortgages'),
('2530', 'Equipment Loans', 'LIABILITY', 'LONG_TERM_LIABILITY', 'CREDIT', 'Equipment financing'),

-- ===============================================
-- EQUITY (3000-3999)
-- ===============================================

('3000', 'EQUITY', 'EQUITY', 'OWNERS_EQUITY', 'CREDIT', 'Main Equity Account'),
('3010', 'Owner''s Capital', 'EQUITY', 'CAPITAL', 'CREDIT', 'Owner''s initial investment'),
('3020', 'Additional Paid-in Capital', 'EQUITY', 'CAPITAL', 'CREDIT', 'Additional capital contributions'),
('3100', 'Retained Earnings', 'EQUITY', 'RETAINED_EARNINGS', 'CREDIT', 'Accumulated profits'),
('3110', 'Current Year Earnings', 'EQUITY', 'RETAINED_EARNINGS', 'CREDIT', 'Current year profit/loss'),
('3200', 'Owner''s Drawings', 'EQUITY', 'OWNERS_EQUITY', 'DEBIT', 'Owner withdrawals'),
('3300', 'Common Stock', 'EQUITY', 'CAPITAL', 'CREDIT', 'Common stock issued'),
('3400', 'Preferred Stock', 'EQUITY', 'CAPITAL', 'CREDIT', 'Preferred stock issued'),

-- ===============================================
-- REVENUE (4000-4999)
-- ===============================================

('4000', 'REVENUE', 'REVENUE', 'OPERATING_REVENUE', 'CREDIT', 'Main Revenue Account'),
('4010', 'Sales Revenue', 'REVENUE', 'OPERATING_REVENUE', 'CREDIT', 'Furniture sales revenue'),
('4020', 'Custom Furniture Sales', 'REVENUE', 'OPERATING_REVENUE', 'CREDIT', 'Custom furniture orders'),
('4030', 'Installation Services', 'REVENUE', 'OPERATING_REVENUE', 'CREDIT', 'Installation service revenue'),
('4040', 'Delivery Services', 'REVENUE', 'OPERATING_REVENUE', 'CREDIT', 'Delivery service revenue'),
('4050', 'Repair Services', 'REVENUE', 'OPERATING_REVENUE', 'CREDIT', 'Repair and maintenance services'),
('4100', 'Returns and Allowances', 'REVENUE', 'OPERATING_REVENUE', 'DEBIT', 'Sales returns and allowances'),
('4200', 'Other Income', 'REVENUE', 'OTHER_REVENUE', 'CREDIT', 'Non-operating income'),
('4210', 'Interest Income', 'REVENUE', 'OTHER_REVENUE', 'CREDIT', 'Interest earned on deposits'),
('4220', 'Rental Income', 'REVENUE', 'OTHER_REVENUE', 'CREDIT', 'Income from property rentals'),
('4230', 'Gain on Sale of Assets', 'REVENUE', 'OTHER_REVENUE', 'CREDIT', 'Profit from asset sales'),

-- ===============================================
-- COST OF GOODS SOLD (5000-5999)
-- ===============================================

('5000', 'COST OF GOODS SOLD', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'DEBIT', 'Main COGS Account'),
('5010', 'Materials Cost', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'DEBIT', 'Raw materials used in production'),
('5020', 'Direct Labor', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'DEBIT', 'Production labor costs'),
('5030', 'Manufacturing Overhead', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'DEBIT', 'Indirect production costs'),
('5040', 'Subcontractor Costs', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'DEBIT', 'Outsourced production costs'),
('5050', 'Freight In', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'DEBIT', 'Shipping costs for inventory'),
('5100', 'Purchase Discounts', 'EXPENSE', 'COST_OF_GOODS_SOLD', 'CREDIT', 'Discounts received on purchases'),

-- ===============================================
-- OPERATING EXPENSES (6000-6999)
-- ===============================================

-- Selling Expenses (6000-6199)
('6000', 'OPERATING EXPENSES', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Main Operating Expenses'),
('6010', 'Advertising & Marketing', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Marketing and promotional costs'),
('6020', 'Sales Commissions', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Sales staff commissions'),
('6030', 'Delivery Expenses', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Customer delivery costs'),
('6040', 'Showroom Expenses', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Showroom maintenance and utilities'),

-- Administrative Expenses (6200-6399)
('6200', 'Salaries & Wages', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Employee salaries and wages'),
('6210', 'Administrative Salaries', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Administrative staff salaries'),
('6220', 'Production Wages', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Production worker wages'),
('6230', 'Sales Salaries', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Sales staff salaries'),
('6240', 'Overtime Pay', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Overtime compensation'),
('6250', 'Payroll Taxes', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Employer payroll taxes'),
('6260', 'Employee Benefits', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Health insurance, retirement, etc.'),

-- Facility Expenses (6400-6499)
('6400', 'Rent Expense', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Facility rental costs'),
('6410', 'Utilities', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Electricity, water, gas'),
('6420', 'Telephone & Internet', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Communication expenses'),
('6430', 'Maintenance & Repairs', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Facility and equipment maintenance'),
('6440', 'Cleaning & Janitorial', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Cleaning services and supplies'),
('6450', 'Security', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Security services and systems'),

-- Administrative Expenses (6500-6699)
('6500', 'Office Supplies', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'General office supplies'),
('6510', 'Professional Services', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Legal, accounting, consulting'),
('6520', 'Insurance', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Business insurance premiums'),
('6530', 'Software & Licenses', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Software subscriptions and licenses'),
('6540', 'Training & Development', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Employee training costs'),
('6550', 'Travel & Entertainment', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Business travel and entertainment'),
('6560', 'Dues & Subscriptions', 'EXPENSE', 'OPERATING_EXPENSE', 'DEBIT', 'Professional memberships'),

-- Depreciation (6700-6799)
('6700', 'Depreciation Expense', 'EXPENSE', 'DEPRECIATION', 'DEBIT', 'Asset depreciation'),
('6710', 'Depreciation - Buildings', 'EXPENSE', 'DEPRECIATION', 'DEBIT', 'Building depreciation'),
('6720', 'Depreciation - Machinery', 'EXPENSE', 'DEPRECIATION', 'DEBIT', 'Machinery depreciation'),
('6730', 'Depreciation - Vehicles', 'EXPENSE', 'DEPRECIATION', 'DEBIT', 'Vehicle depreciation'),
('6740', 'Depreciation - Furniture', 'EXPENSE', 'DEPRECIATION', 'DEBIT', 'Furniture depreciation'),
('6750', 'Depreciation - Computers', 'EXPENSE', 'DEPRECIATION', 'DEBIT', 'Computer equipment depreciation'),

-- ===============================================
-- OTHER EXPENSES (7000-7999)
-- ===============================================

('7000', 'OTHER EXPENSES', 'EXPENSE', 'OTHER_EXPENSE', 'DEBIT', 'Non-operating expenses'),
('7010', 'Interest Expense', 'EXPENSE', 'OTHER_EXPENSE', 'DEBIT', 'Interest on loans and debt'),
('7020', 'Bank Fees', 'EXPENSE', 'OTHER_EXPENSE', 'DEBIT', 'Banking fees and charges'),
('7030', 'Loss on Sale of Assets', 'EXPENSE', 'OTHER_EXPENSE', 'DEBIT', 'Loss from asset sales'),
('7040', 'Bad Debt Expense', 'EXPENSE', 'OTHER_EXPENSE', 'DEBIT', 'Uncollectible accounts'),
('7050', 'Foreign Exchange Loss', 'EXPENSE', 'OTHER_EXPENSE', 'DEBIT', 'Currency exchange losses'),
('7100', 'Income Tax Expense', 'EXPENSE', 'OTHER_EXPENSE', 'DEBIT', 'Income tax provision');

-- ===============================================
-- DEFAULT TAX CODES
-- ===============================================

INSERT INTO tax_codes (tax_code, tax_name, tax_type, tax_rate, description, effective_from) VALUES
('GST5', 'GST 5%', 'GST', 0.0500, 'Goods and Services Tax at 5%', '2024-01-01'),
('GST12', 'GST 12%', 'GST', 0.1200, 'Goods and Services Tax at 12%', '2024-01-01'),
('GST18', 'GST 18%', 'GST', 0.1800, 'Goods and Services Tax at 18%', '2024-01-01'),
('GST28', 'GST 28%', 'GST', 0.2800, 'Goods and Services Tax at 28%', '2024-01-01'),
('CGST9', 'CGST 9%', 'GST', 0.0900, 'Central GST at 9%', '2024-01-01'),
('SGST9', 'SGST 9%', 'GST', 0.0900, 'State GST at 9%', '2024-01-01'),
('IGST18', 'IGST 18%', 'GST', 0.1800, 'Integrated GST at 18%', '2024-01-01'),
('TDS', 'TDS', 'INCOME_TAX', 0.0200, 'Tax Deducted at Source', '2024-01-01'),
('EXEMPT', 'Tax Exempt', 'SALES_TAX', 0.0000, 'Tax exempt items', '2024-01-01');

-- ===============================================
-- DEFAULT ACCOUNTING PERIODS
-- ===============================================

INSERT INTO accounting_periods (period_name, start_date, end_date, fiscal_year, period_type, status) VALUES
('FY 2024-25 Q1', '2024-04-01', '2024-06-30', 2024, 'QUARTERLY', 'CLOSED'),
('FY 2024-25 Q2', '2024-07-01', '2024-09-30', 2024, 'QUARTERLY', 'CLOSED'),
('FY 2024-25 Q3', '2024-10-01', '2024-12-31', 2024, 'QUARTERLY', 'CLOSED'),
('FY 2024-25 Q4', '2025-01-01', '2025-03-31', 2024, 'QUARTERLY', 'CLOSED'),
('FY 2025-26 Q1', '2025-04-01', '2025-06-30', 2025, 'QUARTERLY', 'CLOSED'),
('FY 2025-26 Q2', '2025-07-01', '2025-09-30', 2025, 'QUARTERLY', 'OPEN'),
('FY 2025-26 Q3', '2025-10-01', '2025-12-31', 2025, 'QUARTERLY', 'OPEN'),
('FY 2025-26 Q4', '2026-01-01', '2026-03-31', 2025, 'QUARTERLY', 'OPEN');

-- ===============================================
-- SAMPLE JOURNAL ENTRY TEMPLATES
-- ===============================================

INSERT INTO journal_entry_templates (template_name, template_code, description, source_document_type) VALUES
('Sales Invoice Entry', 'SALES_INV', 'Automatic entry for sales invoices', 'INVOICE'),
('Customer Payment Entry', 'CUST_PAY', 'Automatic entry for customer payments', 'PAYMENT'),
('Purchase Invoice Entry', 'PURCH_INV', 'Automatic entry for purchase invoices', 'PURCHASE_ORDER'),
('Vendor Payment Entry', 'VEND_PAY', 'Automatic entry for vendor payments', 'VENDOR_PAYMENT'),
('Payroll Entry', 'PAYROLL', 'Automatic entry for payroll processing', 'PAYROLL'),
('Depreciation Entry', 'DEPREC', 'Monthly depreciation entries', 'DEPRECIATION');

-- Sample template lines for Sales Invoice
INSERT INTO journal_template_lines (template_id, line_number, account_code, debit_formula, description_template) VALUES
((SELECT id FROM journal_entry_templates WHERE template_code = 'SALES_INV'), 1, '1210', 'total_amount', 'Sales to {customer_name}'),
((SELECT id FROM journal_entry_templates WHERE template_code = 'SALES_INV'), 2, '4010', NULL, 'Sales Revenue'),
((SELECT id FROM journal_entry_templates WHERE template_code = 'SALES_INV'), 3, '2320', NULL, 'Sales Tax Collected');

-- Sample template lines for Customer Payment
INSERT INTO journal_template_lines (template_id, line_number, account_code, debit_formula, credit_formula, description_template) VALUES
((SELECT id FROM journal_entry_templates WHERE template_code = 'CUST_PAY'), 1, '1110', 'payment_amount', NULL, 'Payment from {customer_name}'),
((SELECT id FROM journal_entry_templates WHERE template_code = 'CUST_PAY'), 2, '1210', NULL, 'payment_amount', 'Payment applied to AR');
