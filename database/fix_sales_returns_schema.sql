-- =====================================================
-- SALES RETURNS SCHEMA FIXES
-- =====================================================
-- This script fixes the missing columns in returns and return_items tables
-- to match the API expectations and resolve the sales return errors.

-- =====================================================
-- 1. FIX RETURNS TABLE - ADD MISSING COLUMNS
-- =====================================================

-- Add missing columns to returns table
ALTER TABLE public.returns 
ADD COLUMN IF NOT EXISTS sales_representative_id uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS return_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id);

-- Add comments for clarity
COMMENT ON COLUMN public.returns.sales_representative_id IS 'ID of the sales representative handling the return';
COMMENT ON COLUMN public.returns.return_value IS 'Total value of returned items (sum of unit_price * quantity)';
COMMENT ON COLUMN public.returns.cost_value IS 'Total cost value of returned items (sum of cost * quantity)';
COMMENT ON COLUMN public.returns.created_by IS 'ID of the user who created the return record';

-- =====================================================
-- 2. FIX RETURN_ITEMS TABLE - ADD MISSING COLUMNS
-- =====================================================

-- Add missing columns to return_items table
ALTER TABLE public.return_items 
ADD COLUMN IF NOT EXISTS sales_order_item_id uuid REFERENCES public.sales_order_items(id),
ADD COLUMN IF NOT EXISTS unit_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_custom_product boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_product_id uuid REFERENCES public.custom_products(id);

-- Add comments for clarity
COMMENT ON COLUMN public.return_items.sales_order_item_id IS 'Reference to the original sales order item being returned';
COMMENT ON COLUMN public.return_items.unit_price IS 'Original unit price of the returned item';
COMMENT ON COLUMN public.return_items.is_custom_product IS 'Whether this is a custom product or regular product';
COMMENT ON COLUMN public.return_items.custom_product_id IS 'Reference to custom product if applicable';

-- =====================================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_returns_sales_representative_id ON public.returns(sales_representative_id);
CREATE INDEX IF NOT EXISTS idx_returns_created_by ON public.returns(created_by);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON public.returns(order_id);

CREATE INDEX IF NOT EXISTS idx_return_items_sales_order_item_id ON public.return_items(sales_order_item_id);
CREATE INDEX IF NOT EXISTS idx_return_items_custom_product_id ON public.return_items(custom_product_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON public.return_items(return_id);

-- =====================================================
-- 4. UPDATE RETURN TYPE CONSTRAINTS
-- =====================================================

-- Update return_type constraint to include 'exchange' which is used by the API
ALTER TABLE public.returns DROP CONSTRAINT IF EXISTS returns_return_type_check;
ALTER TABLE public.returns ADD CONSTRAINT returns_return_type_check 
CHECK (return_type::text = ANY (ARRAY['return'::character varying, 'warranty'::character varying, 'complaint'::character varying, 'exchange'::character varying]::text[]));

-- =====================================================
-- 5. ADD VALIDATION FUNCTION
-- =====================================================

-- Create a function to validate return creation
CREATE OR REPLACE FUNCTION validate_return_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure order exists
    IF NEW.order_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.sales_orders WHERE id = NEW.order_id) THEN
            RAISE EXCEPTION 'Sales order % does not exist', NEW.order_id;
        END IF;
    END IF;
    
    -- Ensure return_value and cost_value are non-negative
    IF NEW.return_value < 0 THEN
        RAISE EXCEPTION 'Return value cannot be negative';
    END IF;
    
    IF NEW.cost_value < 0 THEN
        RAISE EXCEPTION 'Cost value cannot be negative';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for return validation
DROP TRIGGER IF EXISTS trigger_validate_return_creation ON public.returns;
CREATE TRIGGER trigger_validate_return_creation
    BEFORE INSERT OR UPDATE ON public.returns
    FOR EACH ROW
    EXECUTE FUNCTION validate_return_creation();

-- =====================================================
-- 6. VERIFICATION QUERIES
-- =====================================================

-- Verify the schema changes
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    -- Check returns table columns
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'returns' 
    AND column_name IN ('sales_representative_id', 'return_value', 'cost_value', 'created_by');
    
    IF col_count = 4 THEN
        RAISE NOTICE '✅ Returns table: All 4 missing columns added successfully';
    ELSE
        RAISE NOTICE '❌ Returns table: Only % out of 4 columns added', col_count;
    END IF;
    
    -- Check return_items table columns
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'return_items' 
    AND column_name IN ('sales_order_item_id', 'unit_price', 'is_custom_product', 'custom_product_id');
    
    IF col_count = 4 THEN
        RAISE NOTICE '✅ Return_items table: All 4 missing columns added successfully';
    ELSE
        RAISE NOTICE '❌ Return_items table: Only % out of 4 columns added', col_count;
    END IF;
END $$;

-- Display final table structure
\d+ public.returns;
\d+ public.return_items;

RAISE NOTICE '🎉 Sales returns schema fixes completed successfully!';
RAISE NOTICE '📝 Next steps:';
RAISE NOTICE '   1. Test the returns API with the debug tool';
RAISE NOTICE '   2. Verify that returns can be created without foreign key errors';
RAISE NOTICE '   3. Check that all expected columns are properly populated';