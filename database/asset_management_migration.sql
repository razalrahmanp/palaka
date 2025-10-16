-- ============================================
-- ASSET MANAGEMENT SYSTEM - COMPREHENSIVE MIGRATION
-- Created: 2025-10-16
-- Purpose: Add asset tracking, purchases, disposals, and depreciation
-- ============================================

-- ============================================
-- 1. CREATE ASSET CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.asset_categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  depreciation_method VARCHAR(50) DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'units_of_production', 'no_depreciation')),
  default_useful_life INTEGER, -- in months
  default_salvage_percentage NUMERIC(5,2) DEFAULT 0, -- percentage of original cost
  chart_account_code VARCHAR(20), -- Link to Chart of Accounts
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default asset categories
INSERT INTO public.asset_categories (category_name, description, depreciation_method, default_useful_life, default_salvage_percentage, chart_account_code) VALUES
  ('Land', 'Land and property (non-depreciable)', 'no_depreciation', NULL, 0, '1210'),
  ('Buildings', 'Buildings and structures', 'straight_line', 360, 10, '1220'),
  ('Machinery & Equipment', 'Manufacturing machinery and equipment', 'straight_line', 120, 5, '1230'),
  ('Vehicles', 'Company vehicles and transportation', 'declining_balance', 60, 15, '1240'),
  ('Furniture & Fixtures', 'Office furniture and fixtures', 'straight_line', 84, 10, '1250'),
  ('Computer Equipment', 'Computers, laptops, servers', 'straight_line', 36, 5, '1260'),
  ('Software', 'Software licenses and systems', 'straight_line', 36, 0, '1270'),
  ('Office Equipment', 'Printers, scanners, office machines', 'straight_line', 60, 10, '1280'),
  ('Leasehold Improvements', 'Improvements to leased property', 'straight_line', 120, 0, '1290')
ON CONFLICT (category_name) DO NOTHING;

-- ============================================
-- 2. CREATE MAIN ASSETS TABLE (FIXED ASSETS REGISTER)
-- ============================================
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag VARCHAR(50) UNIQUE NOT NULL, -- e.g., AST-2025-001
  asset_name VARCHAR(200) NOT NULL,
  category_id INTEGER NOT NULL REFERENCES public.asset_categories(id),
  description TEXT,
  
  -- Purchase Information
  purchase_date DATE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  purchase_price NUMERIC(15,2) NOT NULL CHECK (purchase_price > 0),
  purchase_reference VARCHAR(100), -- Invoice/PO number
  
  -- Depreciation Settings
  depreciation_method VARCHAR(50) DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'units_of_production', 'no_depreciation')),
  useful_life_months INTEGER, -- Expected useful life in months
  salvage_value NUMERIC(15,2) DEFAULT 0,
  depreciation_start_date DATE,
  
  -- Current Status
  current_book_value NUMERIC(15,2),
  accumulated_depreciation NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'under_maintenance', 'retired', 'disposed', 'sold', 'donated', 'scrapped')),
  
  -- Location & Assignment
  location VARCHAR(200),
  department VARCHAR(100),
  assigned_to UUID REFERENCES public.employees(id),
  
  -- Additional Details
  serial_number VARCHAR(100),
  model_number VARCHAR(100),
  manufacturer VARCHAR(100),
  warranty_expiry_date DATE,
  insurance_value NUMERIC(15,2),
  insurance_expiry_date DATE,
  
  -- Accounting Links
  asset_account_code VARCHAR(20), -- Link to Chart of Accounts
  depreciation_account_code VARCHAR(20),
  accumulated_depreciation_account_code VARCHAR(20),
  
  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT assets_useful_life_check CHECK (
    (depreciation_method = 'no_depreciation') OR 
    (useful_life_months > 0)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_purchase_date ON public.assets(purchase_date);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON public.assets(assigned_to);

-- ============================================
-- 3. CREATE ASSET PURCHASES TABLE (TRANSACTION LOG)
-- ============================================
CREATE TABLE IF NOT EXISTS public.asset_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  
  -- Purchase Details
  purchase_date DATE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id),
  invoice_number VARCHAR(100),
  purchase_order_number VARCHAR(100),
  
  -- Cost Breakdown
  asset_cost NUMERIC(15,2) NOT NULL CHECK (asset_cost > 0),
  installation_cost NUMERIC(15,2) DEFAULT 0,
  freight_cost NUMERIC(15,2) DEFAULT 0,
  other_costs NUMERIC(15,2) DEFAULT 0,
  total_cost NUMERIC(15,2) GENERATED ALWAYS AS (asset_cost + installation_cost + freight_cost + other_costs) STORED,
  
  -- Payment Information
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'credit_card', 'loan', 'lease')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'financed')),
  amount_paid NUMERIC(15,2) DEFAULT 0,
  balance_due NUMERIC(15,2) GENERATED ALWAYS AS (asset_cost + installation_cost + freight_cost + other_costs - amount_paid) STORED,
  
  -- Financial Links
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  loan_id UUID REFERENCES public.loan_opening_balances(id),
  
  -- Documentation
  documents JSONB, -- Array of document URLs/paths
  notes TEXT,
  
  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_purchases_asset_id ON public.asset_purchases(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_purchases_date ON public.asset_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_asset_purchases_supplier ON public.asset_purchases(supplier_id);

-- ============================================
-- 4. CREATE ASSET DISPOSALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.asset_disposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  
  -- Disposal Details
  disposal_date DATE NOT NULL,
  disposal_type VARCHAR(50) NOT NULL CHECK (disposal_type IN ('sale', 'donation', 'scrap', 'trade_in', 'theft', 'destruction', 'obsolete')),
  
  -- Asset Value at Disposal
  original_cost NUMERIC(15,2) NOT NULL,
  accumulated_depreciation NUMERIC(15,2) NOT NULL,
  book_value NUMERIC(15,2) GENERATED ALWAYS AS (original_cost - accumulated_depreciation) STORED,
  
  -- Sale/Trade-in Details (if applicable)
  sale_price NUMERIC(15,2) DEFAULT 0,
  buyer_name VARCHAR(200),
  buyer_contact VARCHAR(100),
  sale_invoice_number VARCHAR(100),
  
  -- Gain/Loss Calculation
  gain_loss NUMERIC(15,2) GENERATED ALWAYS AS (sale_price - (original_cost - accumulated_depreciation)) STORED,
  
  -- Payment Details (for sales)
  payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'credit_card', 'trade_in')),
  payment_received NUMERIC(15,2) DEFAULT 0,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  
  -- Approval & Documentation
  approved_by UUID REFERENCES public.users(id),
  approval_date DATE,
  reason TEXT NOT NULL,
  disposal_certificate VARCHAR(200), -- Document reference
  documents JSONB,
  
  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_asset_disposals_asset_id ON public.asset_disposals(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_date ON public.asset_disposals(disposal_date);
CREATE INDEX IF NOT EXISTS idx_asset_disposals_type ON public.asset_disposals(disposal_type);

-- ============================================
-- 5. CREATE DEPRECIATION SCHEDULE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.asset_depreciation_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  
  -- Period Information
  depreciation_year INTEGER NOT NULL,
  depreciation_month INTEGER NOT NULL CHECK (depreciation_month BETWEEN 1 AND 12),
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Depreciation Calculation
  opening_book_value NUMERIC(15,2) NOT NULL,
  depreciation_amount NUMERIC(15,2) NOT NULL,
  accumulated_depreciation NUMERIC(15,2) NOT NULL,
  closing_book_value NUMERIC(15,2) NOT NULL,
  
  -- Accounting Entry
  is_posted BOOLEAN DEFAULT false,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  posted_date DATE,
  posted_by UUID REFERENCES public.users(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(asset_id, depreciation_year, depreciation_month)
);

CREATE INDEX IF NOT EXISTS idx_depreciation_schedule_asset ON public.asset_depreciation_schedule(asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_schedule_period ON public.asset_depreciation_schedule(depreciation_year, depreciation_month);
CREATE INDEX IF NOT EXISTS idx_depreciation_schedule_posted ON public.asset_depreciation_schedule(is_posted);

-- ============================================
-- 6. CREATE ASSET MAINTENANCE LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.asset_maintenance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  
  -- Maintenance Details
  maintenance_date DATE NOT NULL,
  maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('routine', 'preventive', 'corrective', 'emergency', 'inspection', 'upgrade')),
  description TEXT NOT NULL,
  
  -- Service Provider
  performed_by VARCHAR(200), -- Internal or external
  vendor_id UUID REFERENCES public.suppliers(id),
  
  -- Cost
  labor_cost NUMERIC(15,2) DEFAULT 0,
  parts_cost NUMERIC(15,2) DEFAULT 0,
  other_cost NUMERIC(15,2) DEFAULT 0,
  total_cost NUMERIC(15,2) GENERATED ALWAYS AS (labor_cost + parts_cost + other_cost) STORED,
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  next_maintenance_date DATE,
  
  -- Documentation
  invoice_number VARCHAR(100),
  documents JSONB,
  notes TEXT,
  
  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON public.asset_maintenance_log(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON public.asset_maintenance_log(maintenance_date);

-- ============================================
-- 7. UPDATE EXPENSES TABLE - ADD NEW CATEGORIES
-- ============================================

-- First, drop the existing CHECK constraint on category
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Add the new CHECK constraint with updated categories
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check 
  CHECK (category = ANY (ARRAY[
    'Raw Materials'::text, 
    'Direct Labor'::text, 
    'Manufacturing Overhead'::text, 
    'Administrative'::text, 
    'Salaries & Benefits'::text, 
    'Marketing & Sales'::text, 
    'Logistics & Distribution'::text, 
    'Technology'::text, 
    'Insurance'::text, 
    'Maintenance & Repairs'::text, 
    'Travel & Entertainment'::text, 
    'Research & Development'::text, 
    'Miscellaneous'::text, 
    'Vehicle Fleet'::text, 
    'Accounts Payable'::text, 
    'Prepaid Expenses'::text, 
    'Rent'::text, 
    'Utilities'::text, 
    'Salaries'::text, 
    'Marketing'::text, 
    'Other'::text, 
    'Manufacturing'::text, 
    'Production'::text, 
    'Maintenance'::text, 
    'Administration'::text, 
    'Logistics'::text, 
    'Customer Refunds'::text,
    -- NEW CAPITAL EXPENDITURE CATEGORIES
    'Capital Expenditure'::text,
    'Asset Purchase'::text,
    'Equipment Purchase'::text,
    'Vehicle Purchase'::text,
    'Property Purchase'::text,
    'Building Purchase'::text,
    'Machinery Purchase'::text,
    'Furniture Purchase'::text,
    'Computer Equipment Purchase'::text,
    'Software Purchase'::text,
    'Asset Improvement'::text,
    'Asset Installation'::text
  ]));

-- Add asset_id column to link expenses with assets (optional but useful)
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id);
CREATE INDEX IF NOT EXISTS idx_expenses_asset_id ON public.expenses(asset_id);

-- ============================================
-- 8. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Trigger to update assets.updated_at
CREATE OR REPLACE FUNCTION update_asset_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_timestamp();

-- Trigger to update asset status on disposal
CREATE OR REPLACE FUNCTION update_asset_on_disposal()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.assets
  SET 
    status = CASE 
      WHEN NEW.disposal_type = 'sale' THEN 'sold'
      WHEN NEW.disposal_type = 'donation' THEN 'donated'
      WHEN NEW.disposal_type = 'scrap' THEN 'scrapped'
      ELSE 'disposed'
    END,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.asset_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_asset_on_disposal
  AFTER INSERT ON public.asset_disposals
  FOR EACH ROW
  EXECUTE FUNCTION update_asset_on_disposal();

-- ============================================
-- 9. CREATE VIEWS FOR REPORTING
-- ============================================

-- View: Active Assets Summary
CREATE OR REPLACE VIEW view_active_assets AS
SELECT 
  a.id,
  a.asset_tag,
  a.asset_name,
  ac.category_name,
  a.purchase_date,
  a.purchase_price,
  a.current_book_value,
  a.accumulated_depreciation,
  (a.purchase_price - a.current_book_value) as total_depreciation,
  a.status,
  a.location,
  a.assigned_to,
  e.name as assigned_employee_name
FROM public.assets a
LEFT JOIN public.asset_categories ac ON a.category_id = ac.id
LEFT JOIN public.employees e ON a.assigned_to = e.id
WHERE a.status = 'active';

-- View: Asset Depreciation Summary by Category
CREATE OR REPLACE VIEW view_asset_depreciation_by_category AS
SELECT 
  ac.category_name,
  COUNT(a.id) as asset_count,
  SUM(a.purchase_price) as total_cost,
  SUM(a.accumulated_depreciation) as total_depreciation,
  SUM(a.current_book_value) as total_book_value
FROM public.assets a
JOIN public.asset_categories ac ON a.category_id = ac.id
WHERE a.status = 'active'
GROUP BY ac.category_name
ORDER BY total_book_value DESC;

-- View: Monthly Depreciation Schedule
CREATE OR REPLACE VIEW view_monthly_depreciation AS
SELECT 
  ads.depreciation_year,
  ads.depreciation_month,
  TO_DATE(ads.depreciation_year || '-' || LPAD(ads.depreciation_month::text, 2, '0') || '-01', 'YYYY-MM-DD') as period_date,
  COUNT(ads.asset_id) as asset_count,
  SUM(ads.depreciation_amount) as total_depreciation,
  SUM(ads.opening_book_value) as opening_value,
  SUM(ads.closing_book_value) as closing_value
FROM public.asset_depreciation_schedule ads
GROUP BY ads.depreciation_year, ads.depreciation_month
ORDER BY ads.depreciation_year DESC, ads.depreciation_month DESC;

-- ============================================
-- 10. GRANT PERMISSIONS (adjust as needed)
-- ============================================

-- Grant SELECT permissions to authenticated users
-- Note: Adjust these based on your security requirements

COMMENT ON TABLE public.assets IS 'Main fixed assets register tracking all company assets';
COMMENT ON TABLE public.asset_categories IS 'Asset categories with default depreciation settings';
COMMENT ON TABLE public.asset_purchases IS 'Transaction log for all asset purchases';
COMMENT ON TABLE public.asset_disposals IS 'Records of asset sales, donations, and disposals';
COMMENT ON TABLE public.asset_depreciation_schedule IS 'Monthly depreciation calculation schedule';
COMMENT ON TABLE public.asset_maintenance_log IS 'Maintenance and repair history for assets';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Summary:
-- ✅ Created asset_categories table
-- ✅ Created assets (fixed_assets) table
-- ✅ Created asset_purchases table
-- ✅ Created asset_disposals table
-- ✅ Created asset_depreciation_schedule table
-- ✅ Created asset_maintenance_log table
-- ✅ Updated expenses table with capital expenditure categories
-- ✅ Created triggers for automatic updates
-- ✅ Created views for reporting
-- ============================================
