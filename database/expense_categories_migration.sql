-- Enhanced Expense Categories Migration
-- This script updates the expense table to support the new comprehensive expense categories

-- First, remove the existing constraint
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Add the new comprehensive constraint with all expense categories
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

-- Update any existing 'Other' categories to 'Miscellaneous' for consistency
UPDATE public.expenses 
SET category = 'Miscellaneous' 
WHERE category = 'Other';

-- Update legacy categories to new comprehensive categories for better categorization
UPDATE public.expenses 
SET category = 'Administrative' 
WHERE category = 'Administration';

UPDATE public.expenses 
SET category = 'Logistics & Distribution' 
WHERE category = 'Logistics';

UPDATE public.expenses 
SET category = 'Raw Materials' 
WHERE category = 'Manufacturing';

UPDATE public.expenses 
SET category = 'Raw Materials' 
WHERE category = 'Production';

UPDATE public.expenses 
SET category = 'Maintenance & Repairs' 
WHERE category = 'Maintenance';

UPDATE public.expenses 
SET category = 'Salaries & Benefits' 
WHERE category = 'Salaries';

UPDATE public.expenses 
SET category = 'Marketing & Sales' 
WHERE category = 'Marketing';

UPDATE public.expenses 
SET category = 'Administrative' 
WHERE category = 'Rent';

UPDATE public.expenses 
SET category = 'Administrative' 
WHERE category = 'Utilities';

-- Add comment to document the enhancement
COMMENT ON TABLE public.expenses IS 'Enhanced expense tracking with comprehensive categorization following proper accounting principles. Categories include direct expenses (COGS) and indirect expenses (Operating Expenses) with detailed subcategories for better financial analysis.';

COMMENT ON COLUMN public.expenses.category IS 'Comprehensive expense category following accounting standards. Direct expenses include Raw Materials, Direct Labor, and Manufacturing Overhead. Indirect expenses include Administrative, Marketing & Sales, Technology, Insurance, etc.';

COMMENT ON COLUMN public.expenses.type IS 'Expense classification: Direct (part of COGS), Indirect (operating expense), Fixed (constant regardless of production), Variable (changes with activity level)';
