-- Temporary fix: Disable the problematic triggers
-- Run this to disable the triggers that are overwriting the discount_amount

-- Disable triggers that automatically recalculate sales_order totals
ALTER TABLE sales_order_items DISABLE TRIGGER sync_sales_order_totals_insert;
ALTER TABLE sales_order_items DISABLE TRIGGER sync_sales_order_totals_update;
ALTER TABLE sales_order_items DISABLE TRIGGER sync_sales_order_totals_delete;

-- To re-enable them later (after fixing), run:
-- ALTER TABLE sales_order_items ENABLE TRIGGER sync_sales_order_totals_insert;
-- ALTER TABLE sales_order_items ENABLE TRIGGER sync_sales_order_totals_update;
-- ALTER TABLE sales_order_items ENABLE TRIGGER sync_sales_order_totals_delete;
