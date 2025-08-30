-- FINAL PRICE FIX: Ensure final_price includes tax + freight + item totals
-- This script completely redefines how final_price is calculated

-- First, drop ALL existing sales order sync triggers
DROP TRIGGER IF EXISTS sync_sales_order_totals_insert ON sales_order_items;
DROP TRIGGER IF EXISTS sync_sales_order_totals_update ON sales_order_items; 
DROP TRIGGER IF EXISTS sync_sales_order_totals_delete ON sales_order_items;
DROP TRIGGER IF EXISTS sync_sales_order_basic_totals_insert ON sales_order_items;
DROP TRIGGER IF EXISTS sync_sales_order_basic_totals_update ON sales_order_items; 
DROP TRIGGER IF EXISTS sync_sales_order_basic_totals_delete ON sales_order_items;
DROP TRIGGER IF EXISTS sync_sales_order_items_only_insert ON sales_order_items;
DROP TRIGGER IF EXISTS sync_sales_order_items_only_update ON sales_order_items; 
DROP TRIGGER IF EXISTS sync_sales_order_items_only_delete ON sales_order_items;

-- Drop all related functions
DROP FUNCTION IF EXISTS sync_sales_order_totals();
DROP FUNCTION IF EXISTS sync_sales_order_basic_totals();
DROP FUNCTION IF EXISTS sync_sales_order_items_only();

-- Create a new function that PRESERVES UI-calculated final_price
CREATE OR REPLACE FUNCTION update_sales_order_item_totals()
RETURNS TRIGGER AS $$
DECLARE
    order_original_price DECIMAL(15,2);
    order_items_subtotal DECIMAL(15,2);
    order_discount_amount DECIMAL(15,2);
    current_freight DECIMAL(15,2);
    current_tax_percentage DECIMAL(5,2);
    current_tax_amount DECIMAL(15,2);
    current_grand_total DECIMAL(15,2);
    current_final_price DECIMAL(15,2);
BEGIN
    -- Get current values to preserve UI calculations
    SELECT 
        COALESCE(freight_charges, 0),
        COALESCE(tax_percentage, 18.00),
        COALESCE(tax_amount, 0),
        COALESCE(grand_total, 0),
        COALESCE(final_price, 0)
    INTO 
        current_freight,
        current_tax_percentage, 
        current_tax_amount,
        current_grand_total,
        current_final_price
    FROM sales_orders 
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Calculate ONLY item-level totals
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * COALESCE(final_price, unit_price)), 0)
    INTO order_original_price, order_items_subtotal
    FROM sales_order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    order_discount_amount := order_original_price - order_items_subtotal;
    
    -- Update sales_orders - PRESERVE final_price if it was set by UI (includes tax + freight)
    -- Only update final_price if it's currently 0 or matches items subtotal (meaning it wasn't set by UI)
    UPDATE sales_orders SET
        original_price = order_original_price,
        discount_amount = order_discount_amount,
        -- CRITICAL: Only update final_price if it appears to be unset or just item total
        final_price = CASE 
            WHEN current_final_price = 0 OR current_final_price = order_items_subtotal THEN 
                order_items_subtotal + current_freight + current_tax_amount
            ELSE 
                current_final_price  -- PRESERVE UI-calculated final_price
        END,
        -- Always preserve these UI-calculated fields
        freight_charges = current_freight,
        tax_percentage = current_tax_percentage,
        tax_amount = current_tax_amount,
        grand_total = CASE 
            WHEN current_grand_total = 0 THEN 
                order_items_subtotal + current_freight + current_tax_amount
            ELSE 
                current_grand_total  -- PRESERVE UI-calculated grand_total
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create new triggers that preserve UI calculations
CREATE TRIGGER update_sales_order_item_totals_insert
    AFTER INSERT ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_item_totals();

CREATE TRIGGER update_sales_order_item_totals_update
    AFTER UPDATE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_item_totals();

CREATE TRIGGER update_sales_order_item_totals_delete
    AFTER DELETE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_order_item_totals();

-- Verify the new triggers
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing 
FROM information_schema.triggers 
WHERE event_object_table = 'sales_order_items' 
    AND trigger_schema = current_schema()
ORDER BY trigger_name;
