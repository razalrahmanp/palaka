-- Quick fix: Temporarily disable the sync_sales_order_totals triggers
-- This allows the UI calculations to be preserved

-- Disable the triggers that are overriding UI calculations
DROP TRIGGER IF EXISTS sync_sales_order_totals_insert ON sales_order_items;
DROP TRIGGER IF EXISTS sync_sales_order_totals_update ON sales_order_items; 
DROP TRIGGER IF EXISTS sync_sales_order_totals_delete ON sales_order_items;

-- Create a simplified trigger that preserves freight charges and tax calculations
CREATE OR REPLACE FUNCTION sync_sales_order_basic_totals()
RETURNS TRIGGER AS $$
DECLARE
    order_original_price DECIMAL(15,2);
    order_final_price DECIMAL(15,2);
    order_discount_amount DECIMAL(15,2);
    current_freight_charges DECIMAL(15,2);
    current_tax_percentage DECIMAL(5,2);
    current_tax_amount DECIMAL(15,2);
    current_grand_total DECIMAL(15,2);
BEGIN
    -- Get current freight charges and tax info to preserve them
    SELECT 
        COALESCE(freight_charges, 0), 
        COALESCE(tax_percentage, 18.00),
        COALESCE(tax_amount, 0),
        COALESCE(grand_total, 0)
    INTO 
        current_freight_charges, current_tax_percentage, current_tax_amount, current_grand_total
    FROM sales_orders 
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Calculate totals from items (but don't override freight or tax)
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * COALESCE(final_price, unit_price)), 0)
    INTO order_original_price, order_final_price
    FROM sales_order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    order_discount_amount := order_original_price - order_final_price;
    
    -- Update only the calculated fields, preserve freight charges and tax info from UI
    UPDATE sales_orders SET
        original_price = order_original_price,
        final_price = order_final_price,
        discount_amount = order_discount_amount,
        -- Preserve freight charges (don't recalculate)
        freight_charges = current_freight_charges,
        -- Preserve tax information (don't recalculate)
        tax_percentage = current_tax_percentage,
        tax_amount = current_tax_amount,
        grand_total = current_grand_total,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create new simplified triggers
CREATE TRIGGER sync_sales_order_basic_totals_insert
    AFTER INSERT ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_order_basic_totals();

CREATE TRIGGER sync_sales_order_basic_totals_update
    AFTER UPDATE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_order_basic_totals();

CREATE TRIGGER sync_sales_order_basic_totals_delete
    AFTER DELETE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_sales_order_basic_totals();
