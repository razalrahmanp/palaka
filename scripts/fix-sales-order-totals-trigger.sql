-- Fix for sales_order_totals trigger to include freight charges
-- This trigger was overwriting the correct discount_amount calculation

-- Drop existing triggers
DROP TRIGGER IF EXISTS sync_sales_order_totals_insert ON sales_order_items;
DROP TRIGGER IF EXISTS sync_sales_order_totals_update ON sales_order_items;
DROP TRIGGER IF EXISTS sync_sales_order_totals_delete ON sales_order_items;

-- Create improved trigger function that preserves freight charges
CREATE OR REPLACE FUNCTION sync_sales_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    items_original_price DECIMAL(10,2);
    items_final_price DECIMAL(10,2);
    current_freight_charges DECIMAL(10,2);
    total_original_price DECIMAL(10,2);
    total_final_price DECIMAL(10,2);
    total_discount_amount DECIMAL(10,2);
BEGIN
    -- Calculate totals from items only
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * final_price), 0)
    INTO items_original_price, items_final_price
    FROM sales_order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Get current freight charges (preserve existing value)
    SELECT COALESCE(freight_charges, 0)
    INTO current_freight_charges
    FROM sales_orders
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Calculate final totals including freight
    total_original_price := items_original_price;
    total_final_price := items_final_price + current_freight_charges;
    total_discount_amount := total_original_price + current_freight_charges - total_final_price;
    
    -- Update the parent sales order with corrected calculation
    UPDATE sales_orders SET
        original_price = total_original_price,
        final_price = total_final_price,
        discount_amount = total_discount_amount,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with the fixed function
CREATE TRIGGER sync_sales_order_totals_insert
    AFTER INSERT ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_order_totals();

CREATE TRIGGER sync_sales_order_totals_update
    AFTER UPDATE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_order_totals();

CREATE TRIGGER sync_sales_order_totals_delete
    AFTER DELETE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_order_totals();
