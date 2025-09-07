-- Test script to verify dashboard views work correctly
-- Run this AFTER executing the dashboard views

-- Test 1: Basic view existence
SELECT 'Testing view existence...' as test_status;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'view_mtd_revenue'
) as mtd_revenue_exists;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'view_quotes_pipeline'
) as quotes_pipeline_exists;

-- Test 2: Sample data retrieval
SELECT 'Testing data retrieval...' as test_status;

-- Test MTD Revenue
SELECT * FROM view_mtd_revenue LIMIT 1;

-- Test Quotes Pipeline  
SELECT * FROM view_quotes_pipeline LIMIT 1;

-- Test Low Stock Items
SELECT * FROM view_low_stock_items LIMIT 1;

-- Test Open Purchase Orders
SELECT * FROM view_open_purchase_orders LIMIT 1;

-- Test Revenue Trend (last 3 months)
SELECT * FROM view_revenue_trend_12_months 
ORDER BY month DESC LIMIT 3;

-- Test Inventory Categories
SELECT * FROM view_inventory_by_category LIMIT 5;

-- Test Alerts
SELECT * FROM view_inventory_alerts LIMIT 5;

SELECT 'All tests completed successfully!' as final_status;
