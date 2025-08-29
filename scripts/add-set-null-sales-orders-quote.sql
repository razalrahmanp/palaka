-- Migration script to add ON DELETE SET NULL to sales_orders_quote_id_fkey constraint
-- This ensures that when a quote is deleted, related sales_orders keep their data but have quote_id set to NULL
-- This preserves important sales order records while removing the orphaned quote reference

-- Drop the existing foreign key constraint
ALTER TABLE public.sales_orders 
DROP CONSTRAINT sales_orders_quote_id_fkey;

-- Add the foreign key constraint back with ON DELETE SET NULL
ALTER TABLE public.sales_orders 
ADD CONSTRAINT sales_orders_quote_id_fkey 
FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;

-- Verify the constraint was added correctly
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'sales_orders' 
    AND tc.constraint_name = 'sales_orders_quote_id_fkey';
