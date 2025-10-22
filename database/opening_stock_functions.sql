-- Function to calculate and store opening stock snapshots
-- This should be run periodically (monthly) to keep the snapshots updated

CREATE OR REPLACE FUNCTION calculate_opening_stock_snapshot(
  p_snapshot_date DATE,
  p_snapshot_type VARCHAR DEFAULT 'month_end',
  p_period_label VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  snapshot_date DATE,
  opening_stock DECIMAL,
  closing_stock DECIMAL,
  total_sales_cost DECIMAL,
  message TEXT
) AS $$
DECLARE
  v_closing_stock DECIMAL;
  v_total_sales_cost DECIMAL;
  v_opening_stock DECIMAL;
  v_period_label VARCHAR;
BEGIN
  -- Calculate closing stock (current inventory value)
  SELECT COALESCE(SUM(ii.quantity * p.cost), 0)
  INTO v_closing_stock
  FROM inventory_items ii
  INNER JOIN products p ON ii.product_id = p.id
  WHERE ii.quantity > 0 AND p.cost > 0;

  -- Calculate total sales cost (cost of all regular products sold)
  -- Only includes items with product_id (excludes custom products)
  SELECT COALESCE(SUM(soi.quantity * p.cost), 0)
  INTO v_total_sales_cost
  FROM sales_order_items soi
  INNER JOIN products p ON soi.product_id = p.id
  WHERE soi.product_id IS NOT NULL
    AND p.cost > 0;

  -- Calculate opening stock
  -- For "all_time": Opening = Total Sales Cost + Closing Stock
  -- For other periods: This will be adjusted later to use previous period's closing
  IF p_snapshot_type = 'all_time' THEN
    v_opening_stock := v_total_sales_cost + v_closing_stock;
    v_period_label := COALESCE(p_period_label, 'All Time');
  ELSE
    -- For month/year snapshots, opening = previous period's closing
    -- Initially set to 0, will be updated by the snapshot management function
    v_opening_stock := 0;
    v_period_label := COALESCE(p_period_label, TO_CHAR(p_snapshot_date, 'Month YYYY'));
  END IF;

  -- Insert or update the snapshot
  INSERT INTO opening_stock_snapshots (
    snapshot_date,
    opening_stock_value,
    closing_stock_value,
    total_sales_cost,
    snapshot_type,
    period_label,
    calculated_at
  ) VALUES (
    p_snapshot_date,
    v_opening_stock,
    v_closing_stock,
    v_total_sales_cost,
    p_snapshot_type,
    v_period_label,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (snapshot_date) 
  DO UPDATE SET
    opening_stock_value = EXCLUDED.opening_stock_value,
    closing_stock_value = EXCLUDED.closing_stock_value,
    total_sales_cost = EXCLUDED.total_sales_cost,
    snapshot_type = EXCLUDED.snapshot_type,
    period_label = EXCLUDED.period_label,
    calculated_at = EXCLUDED.calculated_at,
    updated_at = CURRENT_TIMESTAMP;

  -- Return the results
  RETURN QUERY
  SELECT 
    p_snapshot_date,
    v_opening_stock,
    v_closing_stock,
    v_total_sales_cost,
    'Snapshot saved successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to generate snapshots for a full year (Jan-Dec)
CREATE OR REPLACE FUNCTION generate_yearly_snapshots(p_year INTEGER)
RETURNS TABLE (
  month_name VARCHAR,
  snapshot_date DATE,
  opening_stock DECIMAL,
  closing_stock DECIMAL
) AS $$
DECLARE
  v_month INTEGER;
  v_month_end DATE;
  v_prev_closing DECIMAL := 0;
  v_closing DECIMAL;
  v_total_sales DECIMAL;
BEGIN
  -- Loop through each month
  FOR v_month IN 1..12 LOOP
    -- Get last day of the month
    v_month_end := (DATE_TRUNC('month', MAKE_DATE(p_year, v_month, 1)) + INTERVAL '1 month - 1 day')::DATE;
    
    -- Calculate snapshot for this month
    PERFORM calculate_opening_stock_snapshot(
      v_month_end,
      'month_end',
      TO_CHAR(v_month_end, 'Month YYYY')
    );
    
    -- Get the closing stock for this month
    SELECT oss.closing_stock_value INTO v_closing
    FROM opening_stock_snapshots oss
    WHERE oss.snapshot_date = v_month_end;
    
    -- Update opening stock to previous month's closing
    IF v_month > 1 THEN
      UPDATE opening_stock_snapshots oss
      SET opening_stock_value = v_prev_closing
      WHERE oss.snapshot_date = v_month_end;
    END IF;
    
    -- Store for next iteration
    v_prev_closing := v_closing;
    
    -- Return this month's data
    RETURN QUERY
    SELECT 
      TO_CHAR(v_month_end, 'Month YYYY')::VARCHAR,
      v_month_end,
      CASE WHEN v_month = 1 THEN 0 ELSE v_prev_closing END,
      v_closing;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to generate financial year snapshots (April-March)
CREATE OR REPLACE FUNCTION generate_financial_year_snapshots(p_start_year INTEGER)
RETURNS TABLE (
  month_name VARCHAR,
  snapshot_date DATE,
  opening_stock DECIMAL,
  closing_stock DECIMAL
) AS $$
DECLARE
  v_month INTEGER;
  v_year INTEGER;
  v_month_end DATE;
  v_prev_closing DECIMAL := 0;
  v_closing DECIMAL;
BEGIN
  -- Loop through financial year months (April to March)
  FOR i IN 0..11 LOOP
    -- Calculate year and month (April = month 4)
    v_month := ((i + 3) % 12) + 1; -- Start from April (4)
    v_year := CASE WHEN v_month < 4 THEN p_start_year + 1 ELSE p_start_year END;
    
    -- Get last day of the month
    v_month_end := (DATE_TRUNC('month', MAKE_DATE(v_year, v_month, 1)) + INTERVAL '1 month - 1 day')::DATE;
    
    -- Calculate snapshot
    PERFORM calculate_opening_stock_snapshot(
      v_month_end,
      'month_end',
      TO_CHAR(v_month_end, 'Month YYYY') || ' (FY ' || p_start_year::TEXT || '-' || (p_start_year + 1)::TEXT || ')'
    );
    
    -- Get closing stock
    SELECT oss.closing_stock_value INTO v_closing
    FROM opening_stock_snapshots oss
    WHERE oss.snapshot_date = v_month_end;
    
    -- Update opening stock
    IF i > 0 THEN
      UPDATE opening_stock_snapshots oss
      SET opening_stock_value = v_prev_closing
      WHERE oss.snapshot_date = v_month_end;
    END IF;
    
    v_prev_closing := v_closing;
    
    RETURN QUERY
    SELECT 
      TO_CHAR(v_month_end, 'Month YYYY')::VARCHAR,
      v_month_end,
      CASE WHEN i = 0 THEN 0 ELSE v_prev_closing END,
      v_closing;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION calculate_opening_stock_snapshot IS 'Calculates and stores opening/closing stock snapshot for a specific date';
COMMENT ON FUNCTION generate_yearly_snapshots IS 'Generates monthly snapshots for an entire calendar year (Jan-Dec)';
COMMENT ON FUNCTION generate_financial_year_snapshots IS 'Generates monthly snapshots for a financial year (April-March)';
