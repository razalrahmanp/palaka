-- Migration script to add ON DELETE CASCADE to sales_order_items foreign key constraint
-- This ensures that when a sales_order is deleted, all related sales_order_items are automatically deleted

-- Drop the existing foreign key constraint
ALTER TABLE public.sales_order_items 
DROP CONSTRAINT sales_order_items_order_id_fkey;

-- Add the foreign key constraint back with ON DELETE CASCADE
ALTER TABLE public.sales_order_items 
ADD CONSTRAINT sales_order_items_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;

-- Verify the constraint was added correctly
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'sales_order_items' 
    AND tc.constraint_name = 'sales_order_items_order_id_fkey';
