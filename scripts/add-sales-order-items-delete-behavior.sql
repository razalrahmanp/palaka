-- Migration script to add ON DELETE behaviors for sales_order_items foreign key constraints
-- This handles the relationship between sales orders, sales order items, and custom products

-- Part 1: Handle custom_product_id foreign key constraint
-- When a custom product is deleted, we need to decide what happens to sales order items
-- Option 1: RESTRICT - Prevent deletion of custom products that have sales order items (safer)
-- Option 2: SET NULL - Allow deletion but set custom_product_id to NULL (loses reference)
-- Option 3: CASCADE - Delete sales order items when custom product is deleted (aggressive)

-- For this use case, RESTRICT makes the most sense to protect sales data integrity

-- Drop the existing custom_product_id constraint
ALTER TABLE public.sales_order_items 
DROP CONSTRAINT sales_order_items_custom_product_id_fkey;

-- Add the constraint back with ON DELETE RESTRICT
-- This prevents deletion of custom products that are referenced by sales order items
ALTER TABLE public.sales_order_items 
ADD CONSTRAINT sales_order_items_custom_product_id_fkey 
FOREIGN KEY (custom_product_id) REFERENCES public.custom_products(id) ON DELETE RESTRICT;

-- Part 2: Verify the order_id constraint has CASCADE (already done in previous script)
-- The sales_order_items_order_id_fkey should already have ON DELETE CASCADE
-- so when sales orders are deleted, their items are automatically deleted

-- Verification query to check both constraints
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
