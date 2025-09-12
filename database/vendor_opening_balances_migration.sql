-- Create vendor_opening_balances table
CREATE TABLE IF NOT EXISTS vendor_opening_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  opening_stock_value DECIMAL(15,2) DEFAULT 0,
  as_of_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_marked_as_already_paid BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(vendor_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_vendor_opening_balances_vendor_id ON vendor_opening_balances(vendor_id);

-- Add comments
COMMENT ON TABLE vendor_opening_balances IS 'Stores opening balance information for vendors to track historical amounts owed';
COMMENT ON COLUMN vendor_opening_balances.opening_balance IS 'Initial amount owed to vendor at the start of system tracking';
COMMENT ON COLUMN vendor_opening_balances.opening_stock_value IS 'Initial value of stock received from this vendor';
COMMENT ON COLUMN vendor_opening_balances.is_marked_as_already_paid IS 'Whether the opening balance has been marked as already settled';
