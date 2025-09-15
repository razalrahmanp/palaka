-- =====================================================
-- EQUITY MANAGEMENT SYSTEM SCHEMA
-- =====================================================
-- This schema creates a comprehensive system for tracking:
-- 1. Partners/Investors and their equity shares
-- 2. Capital Investments by partners
-- 3. Partner Withdrawals with detailed categorization
-- 4. Automatic equity balance calculations

-- =====================================================
-- 1. PARTNERS/INVESTORS TABLE
-- =====================================================
CREATE TABLE partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    partner_type VARCHAR(50) NOT NULL DEFAULT 'partner', -- 'owner', 'partner', 'investor', 'silent_partner'
    initial_investment DECIMAL(15,2) DEFAULT 0,
    equity_percentage DECIMAL(5,2) DEFAULT 0, -- Percentage ownership (0-100)
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_equity_percentage CHECK (equity_percentage >= 0 AND equity_percentage <= 100)
);


-- =====================================================
-- 2. INVESTMENT CATEGORIES TABLE
-- =====================================================
CREATE TABLE investment_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    chart_account_code VARCHAR(20) DEFAULT '3100', -- Paid-in Capital account
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add default investment categories
INSERT INTO investment_categories (category_name, description, chart_account_code) VALUES
('Initial Capital', 'Starting capital investment', '3100'),
('Additional Investment', 'Additional capital contributed', '3100'),
('Equipment Investment', 'Investment in business equipment', '3110'),
('Property Investment', 'Investment in business property', '3120'),
('Working Capital', 'Investment for day-to-day operations', '3100'),
('Emergency Fund', 'Investment for emergency reserves', '3130'),
('Expansion Capital', 'Investment for business expansion', '3140'),
('Technology Investment', 'Investment in technology and software', '3150');

-- =====================================================
-- 3. WITHDRAWAL CATEGORIES TABLE
-- =====================================================
CREATE TABLE withdrawal_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    chart_account_code VARCHAR(20) DEFAULT '3200', -- Owner Drawings account
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add default withdrawal categories
INSERT INTO withdrawal_categories (category_name, description, chart_account_code) VALUES
('Personal Withdrawals', 'Regular personal withdrawals by partners', '3200'),
('Home Expenses', 'Personal home and family expenses', '3210'),
('Vehicle Expenses (Personal)', 'Personal vehicle fuel, maintenance', '3220'),
('Personal Purchases', 'Personal shopping and purchases', '3230'),
('Family Support', 'Support to family members', '3240'),
('Personal Healthcare', 'Personal medical and healthcare expenses', '3250'),
('Personal Education', 'Personal education and training expenses', '3260'),
('Personal Travel', 'Personal vacation and travel expenses', '3270'),
('Gold/Jewelry', 'Personal gold and jewelry purchases', '3280'),
('Loans/Advances', 'Personal loans and advances taken', '3290'),
('Emergency Withdrawals', 'Emergency personal withdrawals', '3295');

-- =====================================================
-- 4. WITHDRAWAL SUBCATEGORIES TABLE
-- =====================================================
CREATE TABLE withdrawal_subcategories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES withdrawal_categories(id) ON DELETE CASCADE,
    subcategory_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(category_id, subcategory_name)
);

-- Add default subcategories
INSERT INTO withdrawal_subcategories (category_id, subcategory_name, description) VALUES
-- Personal Withdrawals subcategories
(1, 'Monthly Salary', 'Regular monthly personal salary'),
(1, 'Bonus Withdrawal', 'Performance or year-end bonus'),
(1, 'Profit Distribution', 'Share of business profits'),

-- Home Expenses subcategories
(2, 'Groceries', 'Household groceries and food'),
(2, 'Utilities', 'Home electricity, water, gas bills'),
(2, 'House Rent/EMI', 'House rent or loan EMI'),
(2, 'House Maintenance', 'Home repairs and maintenance'),
(2, 'Servant Salary', 'Domestic help salary'),

-- Vehicle Expenses subcategories
(3, 'Fuel', 'Personal vehicle fuel'),
(3, 'Insurance', 'Personal vehicle insurance'),
(3, 'Maintenance', 'Personal vehicle servicing'),
(3, 'Registration', 'Vehicle registration and taxes'),

-- Personal Purchases subcategories
(4, 'Clothing', 'Personal clothing and accessories'),
(4, 'Electronics', 'Personal electronics and gadgets'),
(4, 'Gifts', 'Personal gifts and celebrations'),
(4, 'Entertainment', 'Personal entertainment expenses'),

-- Family Support subcategories
(5, 'Parents Support', 'Financial support to parents'),
(5, 'Siblings Support', 'Financial support to siblings'),
(5, 'Children Education', 'Children school and college fees'),
(5, 'Family Medical', 'Family medical expenses'),

-- Loans/Advances subcategories
(10, 'Main Loan', 'Main personal loan payments'),
(10, 'Small Loan', 'Small personal loan payments'),
(10, 'Advance to Family', 'Advances given to family'),
(10, 'Personal Emergency Loan', 'Emergency personal loans');

-- =====================================================
-- 5. INVESTMENTS TABLE
-- =====================================================
CREATE TABLE investments (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES investment_categories(id),
    amount DECIMAL(15,2) NOT NULL,
    investment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    payment_method VARCHAR(100) NOT NULL DEFAULT 'cash', -- 'cash', 'bank_transfer', 'cheque', 'card', 'online', 'upi'
    bank_account_id UUID, -- Reference to bank_accounts table if payment is not cash
    reference_number VARCHAR(255), -- Bank transaction ID, cheque number, UPI reference, etc.
    upi_reference VARCHAR(255), -- UPI transaction ID for UPI payments
    notes TEXT,
    journal_entry_id UUID, -- Reference to journal_entries table for automatic accounting
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_investment_amount CHECK (amount > 0)
);

-- =====================================================
-- 6. WITHDRAWALS TABLE
-- =====================================================
CREATE TABLE withdrawals (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES withdrawal_categories(id),
    subcategory_id INTEGER REFERENCES withdrawal_subcategories(id),
    amount DECIMAL(15,2) NOT NULL,
    withdrawal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    payment_method VARCHAR(100) NOT NULL DEFAULT 'cash', -- 'cash', 'bank_transfer', 'cheque', 'card', 'online', 'upi'
    bank_account_id UUID, -- Reference to bank_accounts table if payment is not cash
    reference_number VARCHAR(255), -- Bank transaction ID, cheque number, UPI reference, etc.
    upi_reference VARCHAR(255), -- UPI transaction ID for UPI payments
    notes TEXT,
    journal_entry_id UUID, -- Reference to journal_entries table for automatic accounting
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT positive_withdrawal_amount CHECK (amount > 0)
);

-- =====================================================
-- 7. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_partners_active ON partners(is_active);
CREATE INDEX idx_partners_type ON partners(partner_type);
CREATE INDEX idx_investments_partner_date ON investments(partner_id, investment_date);
CREATE INDEX idx_investments_category ON investments(category_id);
CREATE INDEX idx_withdrawals_partner_date ON withdrawals(partner_id, withdrawal_date);
CREATE INDEX idx_withdrawals_category ON withdrawals(category_id);
CREATE INDEX idx_withdrawals_subcategory ON withdrawals(subcategory_id);

-- =====================================================
-- 8. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update timestamp trigger for partners
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_partners_modtime 
    BEFORE UPDATE ON partners 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_investments_modtime 
    BEFORE UPDATE ON investments 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_withdrawals_modtime 
    BEFORE UPDATE ON withdrawals 
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- =====================================================
-- 9. VIEWS FOR EQUITY CALCULATIONS
-- =====================================================

-- Partner equity summary view
CREATE VIEW partner_equity_summary AS
SELECT 
    p.id,
    p.name,
    p.partner_type,
    p.equity_percentage,
    p.initial_investment,
    COALESCE(i.total_investments, 0) as total_investments,
    COALESCE(w.total_withdrawals, 0) as total_withdrawals,
    (p.initial_investment + COALESCE(i.total_investments, 0) - COALESCE(w.total_withdrawals, 0)) as current_equity_balance,
    p.is_active
FROM partners p
LEFT JOIN (
    SELECT partner_id, SUM(amount) as total_investments
    FROM investments
    GROUP BY partner_id
) i ON p.id = i.partner_id
LEFT JOIN (
    SELECT partner_id, SUM(amount) as total_withdrawals
    FROM withdrawals
    GROUP BY partner_id
) w ON p.id = w.partner_id
WHERE p.is_active = true;

-- Monthly equity activity view
CREATE VIEW monthly_equity_activity AS
SELECT 
    DATE_TRUNC('month', investment_date) as month,
    partner_id,
    p.name as partner_name,
    'Investment' as activity_type,
    SUM(amount) as amount
FROM investments i
JOIN partners p ON i.partner_id = p.id
GROUP BY DATE_TRUNC('month', investment_date), partner_id, p.name

UNION ALL

SELECT 
    DATE_TRUNC('month', withdrawal_date) as month,
    partner_id,
    p.name as partner_name,
    'Withdrawal' as activity_type,
    -SUM(amount) as amount
FROM withdrawals w
JOIN partners p ON w.partner_id = p.id
GROUP BY DATE_TRUNC('month', withdrawal_date), partner_id, p.name
ORDER BY month DESC, partner_name;


-- =====================================================
-- 11. AUTOMATIC JOURNAL ENTRY FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to create journal entry for investment
CREATE OR REPLACE FUNCTION create_investment_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    je_id UUID;
    cash_account_id UUID;
    bank_account_id UUID;
    capital_account_id UUID;
    line_counter INTEGER := 1;
BEGIN
    -- Get account IDs from chart of accounts
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code = '1010'; -- Cash
    SELECT id INTO capital_account_id FROM chart_of_accounts WHERE account_code = '3100'; -- Owner's Capital
    
    -- For bank payments, get the specific bank account or use cash as fallback
    IF NEW.payment_method != 'cash' AND NEW.bank_account_id IS NOT NULL THEN
        bank_account_id := NEW.bank_account_id;
    ELSE
        bank_account_id := cash_account_id;
    END IF;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        entry_date,
        description,
        reference_number,
        entry_type,
        source_document_type,
        source_document_id,
        created_by,
        status,
        journal_number
    ) VALUES (
        NEW.investment_date,
        CONCAT('Investment by ', (SELECT name FROM partners WHERE id = NEW.partner_id)),
        CONCAT('INV-', NEW.id),
        'STANDARD',
        'EQUITY_INVESTMENT',
        gen_random_uuid(), -- Generate a UUID for source_document_id
        COALESCE(
            CASE 
                WHEN NEW.created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN NEW.created_by::uuid 
                ELSE NULL 
            END, 
            gen_random_uuid()
        ),
        'POSTED',
        CONCAT('JE-INV-', EXTRACT(EPOCH FROM NOW())::bigint)
    ) RETURNING id INTO je_id;
    
    -- Create journal entry lines
    -- Debit: Cash/Bank Account (Asset increases)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        line_number,
        account_id,
        description,
        debit_amount,
        credit_amount,
        reference
    ) VALUES (
        je_id,
        line_counter,
        CASE 
            WHEN NEW.payment_method = 'cash' THEN cash_account_id
            ELSE bank_account_id
        END,
        CONCAT('Investment received via ', NEW.payment_method, ' from ', (SELECT name FROM partners WHERE id = NEW.partner_id)),
        NEW.amount,
        0,
        NEW.reference_number
    );
    
    -- Credit: Owner's Capital (Equity increases)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        line_number,
        account_id,
        description,
        debit_amount,
        credit_amount,
        reference
    ) VALUES (
        je_id,
        line_counter + 1,
        capital_account_id,
        CONCAT('Capital investment by ', (SELECT name FROM partners WHERE id = NEW.partner_id)),
        0,
        NEW.amount,
        NEW.reference_number
    );
    
    -- Update the investment record with journal entry ID
    UPDATE investments SET journal_entry_id = je_id WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create journal entry for withdrawal
CREATE OR REPLACE FUNCTION create_withdrawal_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
    je_id UUID;
    cash_account_id UUID;
    bank_account_id UUID;
    drawings_account_id UUID;
    line_counter INTEGER := 1;
BEGIN
    -- Get account IDs from chart of accounts
    SELECT id INTO cash_account_id FROM chart_of_accounts WHERE account_code = '1010'; -- Cash
    SELECT id INTO drawings_account_id FROM chart_of_accounts WHERE account_code = '3200'; -- Owner's Drawings
    
    -- For bank payments, get the specific bank account or use cash as fallback
    IF NEW.payment_method != 'cash' AND NEW.bank_account_id IS NOT NULL THEN
        bank_account_id := NEW.bank_account_id;
    ELSE
        bank_account_id := cash_account_id;
    END IF;
    
    -- Create journal entry
    INSERT INTO journal_entries (
        entry_date,
        description,
        reference_number,
        entry_type,
        source_document_type,
        source_document_id,
        created_by,
        status,
        journal_number
    ) VALUES (
        NEW.withdrawal_date,
        CONCAT('Withdrawal by ', (SELECT name FROM partners WHERE id = NEW.partner_id)),
        CONCAT('WDL-', NEW.id),
        'STANDARD',
        'EQUITY_WITHDRAWAL',
        gen_random_uuid(), -- Generate a UUID for source_document_id
        COALESCE(
            CASE 
                WHEN NEW.created_by ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
                THEN NEW.created_by::uuid 
                ELSE NULL 
            END, 
            gen_random_uuid()
        ),
        'POSTED',
        CONCAT('JE-WDL-', EXTRACT(EPOCH FROM NOW())::bigint)
    ) RETURNING id INTO je_id;
    
    -- Create journal entry lines
    -- Debit: Owner's Drawings (Equity decreases)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        line_number,
        account_id,
        description,
        debit_amount,
        credit_amount,
        reference
    ) VALUES (
        je_id,
        line_counter,
        drawings_account_id,
        CONCAT('Withdrawal by ', (SELECT name FROM partners WHERE id = NEW.partner_id)),
        NEW.amount,
        0,
        NEW.reference_number
    );
    
    -- Credit: Cash/Bank Account (Asset decreases)
    INSERT INTO journal_entry_lines (
        journal_entry_id,
        line_number,
        account_id,
        description,
        debit_amount,
        credit_amount,
        reference
    ) VALUES (
        je_id,
        line_counter + 1,
        CASE 
            WHEN NEW.payment_method = 'cash' THEN cash_account_id
            ELSE bank_account_id
        END,
        CONCAT('Withdrawal via ', NEW.payment_method, ' by ', (SELECT name FROM partners WHERE id = NEW.partner_id)),
        0,
        NEW.amount,
        NEW.reference_number
    );
    
    -- Update the withdrawal record with journal entry ID
    UPDATE withdrawals SET journal_entry_id = je_id WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic journal entries
CREATE TRIGGER trigger_investment_journal_entry
    AFTER INSERT ON investments
    FOR EACH ROW
    EXECUTE FUNCTION create_investment_journal_entry();

CREATE TRIGGER trigger_withdrawal_journal_entry
    AFTER INSERT ON withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION create_withdrawal_journal_entry();

-- =====================================================
-- 12. NEW INVESTOR/PARTNER MANAGEMENT
-- =====================================================

-- Function to add new investor with validation
CREATE OR REPLACE FUNCTION add_new_investor(
    p_name VARCHAR(255),
    p_email VARCHAR(255),
    p_phone VARCHAR(50),
    p_partner_type VARCHAR(50) DEFAULT 'investor',
    p_initial_investment DECIMAL(15,2) DEFAULT 0,
    p_equity_percentage DECIMAL(5,2) DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    new_partner_id INTEGER;
    current_total_equity DECIMAL(5,2);
BEGIN
    -- Check if total equity percentage would exceed 100%
    SELECT COALESCE(SUM(equity_percentage), 0) INTO current_total_equity
    FROM partners WHERE is_active = true;
    
    IF (current_total_equity + p_equity_percentage) > 100 THEN
        RAISE EXCEPTION 'Total equity percentage cannot exceed 100%%. Current total: %s. Trying to add: %s', 
            current_total_equity::text, p_equity_percentage::text;
    END IF;
    
    -- Insert new partner
    INSERT INTO partners (
        name, email, phone, partner_type, 
        initial_investment, equity_percentage, notes
    ) VALUES (
        p_name, p_email, p_phone, p_partner_type,
        p_initial_investment, p_equity_percentage, p_notes
    ) RETURNING id INTO new_partner_id;
    
    RETURN new_partner_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update equity percentages when new investor joins
CREATE OR REPLACE FUNCTION rebalance_equity_percentages(
    p_new_investor_percentage DECIMAL(5,2)
)
RETURNS TABLE (
    partner_id INTEGER,
    partner_name VARCHAR(255),
    old_percentage DECIMAL(5,2),
    new_percentage DECIMAL(5,2)
) AS $$
DECLARE
    total_existing_equity DECIMAL(5,2);
    reduction_factor DECIMAL(10,8);
BEGIN
    -- Get current total equity percentage
    SELECT COALESCE(SUM(equity_percentage), 0) INTO total_existing_equity
    FROM partners WHERE is_active = true;
    
    -- Calculate reduction factor for existing partners
    reduction_factor := (100 - p_new_investor_percentage) / 100.0;
    
    -- Return table showing the changes
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.equity_percentage as old_percentage,
        ROUND(p.equity_percentage * reduction_factor, 2) as new_percentage
    FROM partners p
    WHERE p.is_active = true;
    
END;
$$ LANGUAGE plpgsql;

