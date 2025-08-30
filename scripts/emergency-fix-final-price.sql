-- EMERGENCY FIX: Disable ALL triggers that override final_price
-- This script completely disables the problematic triggers

-- Drop all sales order totals triggers to prevent override
DROP TRIGGER IF EXISTS sync_sales_order_totals_insert ON sales_order_items;
DROP TRIGGER IF EXISTS sync_sales_order_totals_update ON sales_order_items; 
DROP TRIGGER IF EXISTS sync_sales_order_totals_delete ON sales_order_items;

-- Drop the sync function entirely to prevent any recalculation
DROP FUNCTION IF EXISTS sync_sales_order_totals();

-- Create a minimal sync function that ONLY updates item-related fields, NEVER final_price
CREATE OR REPLACE FUNCTION sync_sales_order_items_only()
RETURNS TRIGGER AS $$
DECLARE
    order_original_price DECIMAL(15,2);
    order_discount_amount DECIMAL(15,2);
    order_items_total DECIMAL(15,2);
BEGIN
    -- Calculate only item-based totals (NOT final_price)
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * COALESCE(final_price, unit_price)), 0)
    INTO order_original_price, order_items_total
    FROM sales_order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    order_discount_amount := order_original_price - order_items_total;
    
    -- Update ONLY item-related fields - NEVER touch final_price, freight_charges, tax fields
    UPDATE sales_orders SET
        original_price = order_original_price,
        discount_amount = order_discount_amount,
        updated_at = NOW()
        -- EXPLICITLY NOT updating: final_price, freight_charges, tax_percentage, tax_amount, grand_total
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create minimal triggers that preserve UI calculations
CREATE TRIGGER sync_sales_order_items_only_insert
    AFTER INSERT ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_order_items_only();

CREATE TRIGGER sync_sales_order_items_only_update
    AFTER UPDATE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_order_items_only();

CREATE TRIGGER sync_sales_order_items_only_delete
    AFTER DELETE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_order_items_only();

-- Verify triggers are properly set
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing, 
    action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'sales_order_items'
ORDER BY trigger_name;
