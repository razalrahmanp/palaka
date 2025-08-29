-- Migration script to add ON DELETE CASCADE for sales_order_items when sales_orders are deleted
-- This ensures that when a sales order is deleted, all its related sales order items are automatically deleted

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.sales_order_items 
DROP CONSTRAINT sales_order_items_order_id_fkey;

-- Step 2: Add the foreign key constraint back with ON DELETE CASCADE
ALTER TABLE public.sales_order_items 
ADD CONSTRAINT sales_order_items_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;

-- Step 3: Verify the constraint was added correctly
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
    AND tc.constraint_name = 'sales_order_items_order_id_fkey';

-- Expected result: delete_rule should show 'CASCADE'

-- What this accomplishes:
-- ✅ DELETE FROM sales_orders WHERE id = 'some-uuid' 
--     → Automatically deletes all related sales_order_items
-- ✅ No orphaned sales_order_items records
-- ✅ Clean data integrity
-- ✅ Proper cascading behavior
