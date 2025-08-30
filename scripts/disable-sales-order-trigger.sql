-- DISABLE Sales Order Trigger
-- This script disables the trigger that recalculates sales order totals
-- which was causing conflicts between UI calculations and database values

-- Drop the trigger that automatically recalculates totals
DROP TRIGGER IF EXISTS sync_sales_order_totals_trigger ON sales_order_items;

-- Optionally, you can also drop the function if you don't need it anymore
-- Uncomment the line below if you want to completely remove the function
-- DROP FUNCTION IF EXISTS sync_sales_order_totals();

-- Note: After running this script, the sales order totals will be calculated
-- and stored exactly as sent from the UI, without any database-level recalculation.

-- This ensures that:
-- 1. EMI monthly values match between UI and DB
-- 2. Sales order final price and discount amounts preserve UI calculations
-- 3. No automatic recalculation conflicts

SELECT 'Sales order trigger disabled successfully' as status;
