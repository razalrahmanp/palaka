-- Migration script for sales_order_items foreign key constraints
-- Based on analysis: custom products are typically order-specific, so CASCADE is appropriate

-- Part 1: Update custom_product_id constraint to CASCADE
-- This allows deletion of custom products, and automatically removes related sales order items
-- This is safe because custom products are typically created per order

ALTER TABLE public.sales_order_items 
DROP CONSTRAINT sales_order_items_custom_product_id_fkey;

ALTER TABLE public.sales_order_items 
ADD CONSTRAINT sales_order_items_custom_product_id_fkey 
FOREIGN KEY (custom_product_id) REFERENCES public.custom_products(id) ON DELETE CASCADE;

-- Part 2: Ensure the order_id constraint has CASCADE (update if needed)
-- This ensures that when sales orders are deleted, all sales order items are automatically deleted

-- Check current constraint
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc 
            ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'sales_order_items' 
            AND tc.constraint_name = 'sales_order_items_order_id_fkey'
            AND rc.delete_rule = 'CASCADE'
    ) INTO constraint_exists;
    
    IF NOT constraint_exists THEN
        -- Drop and recreate with CASCADE if not already set
        ALTER TABLE public.sales_order_items 
        DROP CONSTRAINT sales_order_items_order_id_fkey;
        
        ALTER TABLE public.sales_order_items 
        ADD CONSTRAINT sales_order_items_order_id_fkey 
        FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Updated sales_order_items_order_id_fkey to CASCADE';
    ELSE
        RAISE NOTICE 'sales_order_items_order_id_fkey already has CASCADE behavior';
    END IF;
END
$$;

-- Verification query
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    rc.delete_rule,
    ccu.column_name,
    ccu.table_name as referenced_table
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON rc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'sales_order_items' 
    AND tc.constraint_name IN (
        'sales_order_items_custom_product_id_fkey',
        'sales_order_items_order_id_fkey'
    )
ORDER BY tc.constraint_name;

-- Summary of cascade behavior after this migration:
-- 1. Delete sales_order → sales_order_items are auto-deleted (CASCADE)
-- 2. Delete custom_product → related sales_order_items are auto-deleted (CASCADE)
-- 3. This creates a clean cascade: sales_order deletion → items deletion
-- 4. Custom products can be safely deleted without orphaning sales_order_items
