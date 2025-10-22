-- =====================================================
-- STEP 1: Drop and recreate the functions with fixes
-- =====================================================

DROP FUNCTION IF EXISTS generate_yearly_snapshots(INTEGER);
DROP FUNCTION IF EXISTS generate_financial_year_snapshots(INTEGER);

-- =====================================================
-- STEP 2: Create the fixed functions
-- =====================================================

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
      TO_CHAR(v_month_end, 'Month YYYY')::VARCHAR AS month_name,
      v_month_end AS snapshot_date,
      CASE WHEN v_month = 1 THEN 0 ELSE v_prev_closing END AS opening_stock,
      v_closing AS closing_stock;
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
      TO_CHAR(v_month_end, 'Month YYYY')::VARCHAR AS month_name,
      v_month_end AS snapshot_date,
      CASE WHEN i = 0 THEN 0 ELSE v_prev_closing END AS opening_stock,
      v_closing AS closing_stock;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION generate_yearly_snapshots IS 'Generates monthly snapshots for an entire calendar year (Jan-Dec)';
COMMENT ON FUNCTION generate_financial_year_snapshots IS 'Generates monthly snapshots for a financial year (April-March)';
