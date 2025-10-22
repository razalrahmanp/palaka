-- Opening Stock Snapshots Table
-- Stores pre-calculated opening stock values for different periods
-- This allows fast retrieval without recalculating each time

CREATE TABLE IF NOT EXISTS opening_stock_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE, -- The date for which this opening stock applies
  opening_stock_value DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Opening stock value in INR
  closing_stock_value DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Closing stock value in INR
  total_sales_cost DECIMAL(15, 2) NOT NULL DEFAULT 0, -- Cost of all sales up to this date
  snapshot_type VARCHAR(20) NOT NULL DEFAULT 'month_end', -- 'month_end', 'year_end', 'all_time'
  period_label VARCHAR(50), -- e.g., 'January 2025', 'FY 2024-25', 'All Time'
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_opening_stock_date ON opening_stock_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_opening_stock_type ON opening_stock_snapshots(snapshot_type);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_opening_stock_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_opening_stock_timestamp
  BEFORE UPDATE ON opening_stock_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_opening_stock_timestamp();

-- Comments for documentation
COMMENT ON TABLE opening_stock_snapshots IS 'Stores pre-calculated opening and closing stock values for different periods to improve performance';
COMMENT ON COLUMN opening_stock_snapshots.snapshot_date IS 'The date for which this opening stock value applies (usually month-end or year-end)';
COMMENT ON COLUMN opening_stock_snapshots.opening_stock_value IS 'Opening stock value at the start of the period';
COMMENT ON COLUMN opening_stock_snapshots.closing_stock_value IS 'Closing stock value at the end of the period';
COMMENT ON COLUMN opening_stock_snapshots.total_sales_cost IS 'Cumulative cost of all sales up to this date';
COMMENT ON COLUMN opening_stock_snapshots.snapshot_type IS 'Type of snapshot: month_end, year_end, or all_time';
COMMENT ON COLUMN opening_stock_snapshots.period_label IS 'Human-readable label for the period';
