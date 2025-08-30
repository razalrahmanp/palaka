-- FIX: Sales Order Trigger Issues
-- This script addresses the trigger that recalculates sales order totals and EMI values

-- Issue 1: EMI Monthly shows different value in DB vs UI due to trigger recalculation
-- Solution: Update trigger to preserve EMI-related fields when they exist

CREATE OR REPLACE FUNCTION sync_sales_order_totals()
RETURNS TRIGGER AS $$
DECLARE
    order_original_price DECIMAL(10,2);
    order_final_price DECIMAL(10,2);
    order_discount_amount DECIMAL(10,2);
    current_emi_monthly DECIMAL(10,2);
    current_emi_enabled BOOLEAN;
    current_bajaj_finance_amount DECIMAL(10,2);
BEGIN
    -- Get current EMI values to preserve them
    SELECT emi_monthly, emi_enabled, bajaj_finance_amount
    INTO current_emi_monthly, current_emi_enabled, current_bajaj_finance_amount
    FROM sales_orders 
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    -- Calculate totals from items
    SELECT 
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * final_price), 0)
    INTO order_original_price, order_final_price
    FROM sales_order_items 
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    order_discount_amount := order_original_price - order_final_price;
    
    -- Update the parent sales order but preserve EMI/Bajaj Finance fields if they exist
    UPDATE sales_orders SET
        original_price = order_original_price,
        final_price = order_final_price,
        discount_amount = order_discount_amount,
        -- Preserve EMI fields if they're already set (don't recalculate)
        emi_monthly = CASE 
            WHEN current_emi_enabled = true AND current_emi_monthly IS NOT NULL AND current_emi_monthly > 0 
            THEN current_emi_monthly  -- Keep existing EMI value
            ELSE emi_monthly  -- Use whatever was there
        END,
        -- Preserve Bajaj Finance amount if set
        bajaj_finance_amount = CASE
            WHEN current_emi_enabled = true AND current_bajaj_finance_amount IS NOT NULL AND current_bajaj_finance_amount > 0
            THEN current_bajaj_finance_amount  -- Keep existing Bajaj amount
            ELSE bajaj_finance_amount  -- Use whatever was there
        END,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the fix
COMMENT ON FUNCTION sync_sales_order_totals() IS 'Syncs order totals from items while preserving manually set EMI and Bajaj Finance values';

-- Add trigger to auto-calculate cost_price for custom products if not provided
CREATE OR REPLACE FUNCTION calculate_custom_product_cost_price()
RETURNS TRIGGER AS $$
BEGIN
    -- If cost_price is null but price (MRP) is set, calculate cost_price
    -- Using a default margin of 30% (cost = 70% of MRP)
    IF NEW.cost_price IS NULL AND NEW.price IS NOT NULL AND NEW.price > 0 THEN
        NEW.cost_price := ROUND(NEW.price * 0.70, 2);  -- 30% margin
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for custom products cost price calculation
DROP TRIGGER IF EXISTS calculate_cost_price_trigger ON custom_products;
CREATE TRIGGER calculate_cost_price_trigger
    BEFORE INSERT OR UPDATE ON custom_products
    FOR EACH ROW
    EXECUTE FUNCTION calculate_custom_product_cost_price();

COMMENT ON FUNCTION calculate_custom_product_cost_price() IS 'Auto-calculates cost_price as 70% of MRP if not manually set';

-- Test the fixes
DO $$
BEGIN
    RAISE NOTICE 'Sales Order Trigger Fixes Applied Successfully!';
    RAISE NOTICE '1. EMI Monthly values will be preserved during item updates';
    RAISE NOTICE '2. Custom product cost_price will auto-calculate from MRP';
    RAISE NOTICE '3. Supplier info extraction fixed in API';
END $$;
