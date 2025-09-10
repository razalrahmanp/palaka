-- Updated Expense Categories Migration
-- This script updates the expense table constraint to include all the new categories
-- with account codes aligned to existing chart of accounts

-- First, remove the existing constraint
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Add the updated comprehensive constraint with all expense categories including new ones
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
  
  -- NEW CATEGORIES (aligned with existing chart of accounts)
  'Vehicle Fleet'::text,         -- Uses accounts 6030, 6430, 6520, 6250, 6200, 6550
  'Accounts Payable'::text,      -- Uses account 2010 
  'Prepaid Expenses'::text,      -- Uses account 1400
  
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
COMMENT ON TABLE public.expenses IS 'Enhanced expense tracking with comprehensive categorization following proper accounting principles. Categories include direct expenses (COGS) and indirect expenses (Operating Expenses) with detailed subcategories for better financial analysis. Account codes aligned with existing chart of accounts.';

COMMENT ON COLUMN public.expenses.category IS 'Comprehensive expense category following accounting standards. NEW CATEGORIES: Vehicle Fleet (account codes 6030,6430,6520,6250,6200,6550), Accounts Payable (2010), Prepaid Expenses (1400).';

COMMENT ON CONSTRAINT expenses_category_check ON public.expenses IS 'Updated expense category constraint including Vehicle Fleet Management, Accounts Payable, and Prepaid Expenses categories with account codes aligned to existing chart of accounts.';
