-- IMMEDIATE FIX: Disable trigger that overrides final_price
-- Run this to stop triggers from overwriting UI calculations

-- Disable all sales order item triggers temporarily
DROP TRIGGER IF EXISTS sync_sales_order_totals_insert ON sales_order_items;
DROP TRIGGER IF EXISTS sync_sales_order_totals_update ON sales_order_items; 
DROP TRIGGER IF EXISTS sync_sales_order_totals_delete ON sales_order_items;
