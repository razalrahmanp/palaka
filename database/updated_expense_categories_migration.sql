-- Updated Expense Categories Migration with New Categories
-- This script updates the expense table to support ALL the new comprehensive expense categories

-- First, remove the existing constraint
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Add the new comprehensive constraint with ALL expense categories including our new ones
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check 
CHECK (category = ANY (ARRAY[
  -- Direct Expense Categories (COGS)
  'Raw Materials'::text,
  'Direct Labor'::text,
  'Manufacturing Overhead'::text,
  
  -- Indirect Expense Categories (Operating Expenses)
  'Administrative'::text,
  'Salaries & Benefits'::text,
  'Marketing & Sales'::text,
  'Logistics & Distribution'::text,
  'Technology'::text,
  'Insurance'::text,
  'Maintenance & Repairs'::text,
  'Travel & Entertainment'::text,
  'Research & Development'::text,
  'Miscellaneous'::text,
  
  -- NEW CATEGORIES ADDED:
  -- Vehicle Fleet Management
  'Vehicle Fleet'::text,
  
  -- Vendor/Supplier Payments  
  'Accounts Payable'::text,
  'Prepaid Expenses'::text,
  
  -- Legacy categories for backward compatibility
  'Rent'::text,
  'Utilities'::text,
  'Salaries'::text,
  'Marketing'::text,
  'Other'::text,
  'Manufacturing'::text,
  'Production'::text,
  'Maintenance'::text,
  'Administration'::text,
  'Logistics'::text
]));

-- Also update subcategory column if it exists, or add it
DO $$ 
BEGIN
    -- Check if subcategory column exists, if not add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'expenses' AND column_name = 'subcategory') THEN
        ALTER TABLE public.expenses ADD COLUMN subcategory text;
    END IF;
END $$;

-- Update any existing 'Other' categories to 'Miscellaneous' for consistency
UPDATE public.expenses 
SET category = 'Miscellaneous' 
WHERE category = 'Other';

-- Update legacy categories to new comprehensive categories for better categorization
UPDATE public.expenses 
SET category = 'Administrative' 
WHERE category = 'Administration';

UPDATE public.expenses 
SET category = 'Salaries & Benefits' 
WHERE category = 'Salaries';

UPDATE public.expenses 
SET category = 'Marketing & Sales' 
WHERE category = 'Marketing';

UPDATE public.expenses 
SET category = 'Maintenance & Repairs' 
WHERE category = 'Maintenance';

UPDATE public.expenses 
SET category = 'Logistics & Distribution' 
WHERE category = 'Logistics';

UPDATE public.expenses 
SET category = 'Manufacturing Overhead' 
WHERE category = 'Manufacturing' OR category = 'Production';

UPDATE public.expenses 
SET category = 'Administrative' 
WHERE category = 'Rent' OR category = 'Utilities';

-- Add comment to table
COMMENT ON TABLE public.expenses IS 'Enhanced expense tracking with comprehensive categorization including Vehicle Fleet, Daily Wages, and Vendor Payment categories. Supports both direct expenses (COGS) and indirect expenses (Operating Expenses) with detailed subcategories for better financial analysis.';
