-- Advanced cascade deletion strategy for sales orders and custom products
-- This script provides a safer approach to handle custom product deletion

-- Option 1: Create a stored procedure for safe sales order deletion
-- This procedure will only delete custom products that are exclusively used by the sales order being deleted

CREATE OR REPLACE FUNCTION delete_sales_order_with_cleanup(order_id_to_delete UUID)
RETURNS VOID AS $$
DECLARE
    custom_product_to_delete UUID;
    custom_product_cursor CURSOR FOR
        SELECT DISTINCT soi.custom_product_id
        FROM sales_order_items soi
        WHERE soi.order_id = order_id_to_delete
        AND soi.custom_product_id IS NOT NULL;
BEGIN
    -- Step 1: Identify custom products that are only used by this sales order
    FOR custom_product_to_delete IN custom_product_cursor LOOP
        -- Check if this custom product is used by any other sales order items
        IF NOT EXISTS (
            SELECT 1 
            FROM sales_order_items soi2 
            WHERE soi2.custom_product_id = custom_product_to_delete 
            AND soi2.order_id != order_id_to_delete
        ) THEN
            -- This custom product is only used by the order being deleted
            -- It's safe to delete it
            DELETE FROM custom_products WHERE id = custom_product_to_delete;
            RAISE NOTICE 'Deleted custom product % as it was only used by sales order %', 
                        custom_product_to_delete, order_id_to_delete;
        ELSE
            -- This custom product is used by other orders, don't delete
            RAISE NOTICE 'Kept custom product % as it is used by other sales orders', 
                        custom_product_to_delete;
        END IF;
    END LOOP;
    
    -- Step 2: Delete the sales order (this will cascade to sales_order_items due to CASCADE constraint)
    DELETE FROM sales_orders WHERE id = order_id_to_delete;
    
    RAISE NOTICE 'Successfully deleted sales order % and cleaned up unused custom products', 
                order_id_to_delete;
END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT delete_sales_order_with_cleanup('your-sales-order-uuid-here');

-- Option 2: Create a trigger-based approach (more automatic but potentially riskier)
-- Uncomment the following if you want automatic cleanup

/*
CREATE OR REPLACE FUNCTION cleanup_unused_custom_products()
RETURNS TRIGGER AS $$
DECLARE
    unused_custom_product UUID;
BEGIN
    -- When sales order items are deleted, check if their custom products are now unused
    IF OLD.custom_product_id IS NOT NULL THEN
        -- Check if this custom product is still referenced by any other sales order items
        IF NOT EXISTS (
            SELECT 1 
            FROM sales_order_items 
            WHERE custom_product_id = OLD.custom_product_id
        ) THEN
            -- No other references found, safe to delete the custom product
            DELETE FROM custom_products WHERE id = OLD.custom_product_id;
            RAISE NOTICE 'Auto-deleted unused custom product %', OLD.custom_product_id;
        END IF;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_cleanup_unused_custom_products
    AFTER DELETE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_unused_custom_products();
*/
