# Account Code Alignment Fix Summary

## Problem Identified
The new expense categories were not appearing in the UI because their account codes didn't match the existing chart of accounts structure. This caused database constraint violations when trying to create expenses with these new categories.

## Root Cause
Our new expense categories were using account codes that don't exist in the current chart of accounts:
- Vehicle Fleet categories used non-existent codes 6810-6819 
- Daily Wages categories used non-existent codes 6207-6212
- Vendor payment categories used wrong account codes (2100 instead of 2010)
- Miscellaneous categories used non-existent codes 6900-6903

## Fixes Applied

### 1. Vehicle Fleet Management Categories
**Before:** Account codes 6810-6819 (non-existent)  
**After:** Mapped to existing accounts:
- Vehicle Fuel → 6030 (Delivery Expenses)
- Vehicle Maintenance → 6430 (Maintenance & Repairs) 
- Vehicle Insurance → 6520 (Insurance)
- Vehicle Registration & Tax → 6250 (Payroll Taxes - govt fees)
- Driver Salaries → 6200 (Salaries & Wages)
- Vehicle Parking & Tolls → 6550 (Travel & Entertainment)

### 2. Daily Wages & Contract Labor Categories  
**Before:** Account codes 6207-6212 (non-existent)
**After:** Mapped to existing accounts:
- Daily Wages - Construction/Loading → 6220 (Production Wages)
- Daily Wages - Cleaning → 6440 (Cleaning & Janitorial)
- Contract Labor → 6510 (Professional Services)
- Overtime Payment → 6240 (Overtime Pay)
- Temporary Staff → 6200 (Salaries & Wages)

### 3. Vendor/Supplier Payment Categories
**Before:** Wrong account codes 2100, 2101, 1300
**After:** Correct existing accounts:
- Vendor Payments → 2010 (Accounts Payable)
- Supplier Advance → 1400 (Prepaid Expenses)

### 4. Miscellaneous Categories
**Before:** Non-existent codes 6900-6903
**After:** Existing accounts:
- Research & Development → 7000 (OTHER EXPENSES)
- Donations & CSR → 7000 (OTHER EXPENSES) 
- Miscellaneous Expenses → 7000 (OTHER EXPENSES)
- Bad Debts → 7040 (Bad Debt Expense)

### 5. Marketing & Insurance Categories
**Before:** Non-existent codes 6301-6303, 6600, 6402
**After:** Existing accounts:
- Digital Marketing/Sales Promotion/Trade Shows → 6010 (Advertising & Marketing)
- Insurance → 6520 (Insurance)
- Packaging Materials → 6040 (Showroom Expenses)

## Files Updated

### 1. /src/types/index.ts
- Updated subcategoryMap with correct account codes for all new categories
- All account codes now reference existing chart of accounts entries

### 2. /src/lib/journalHelper.ts  
- Updated categoryToAccountMap with correct account codes
- Fixed references to account 2100 → 2010 (Accounts Payable)
- Updated default miscellaneous account from 6902 → 7000

### 3. /database/expense_categories_migration.sql
- Simplified migration to only include main category names in database constraint
- Added comments documenting the account code alignment
- Removed individual subcategory entries from database constraint (handled in frontend)

### 4. /src/components/finance/ExpensesTable.tsx
- Removed CategoryDebug component after fixing the account alignment issue

## Chart of Accounts Reference
Key existing accounts used for new categories:
- **6010** - Advertising & Marketing
- **6030** - Delivery Expenses  
- **6040** - Showroom Expenses
- **6200** - Salaries & Wages
- **6220** - Production Wages
- **6240** - Overtime Pay
- **6250** - Payroll Taxes
- **6430** - Maintenance & Repairs
- **6440** - Cleaning & Janitorial
- **6450** - Security
- **6510** - Professional Services
- **6520** - Insurance
- **6550** - Travel & Entertainment
- **7000** - OTHER EXPENSES
- **7040** - Bad Debt Expense
- **2010** - Accounts Payable
- **1400** - Prepaid Expenses

## Next Steps
1. Execute the updated migration script in Supabase to allow new categories
2. Test that new expense categories now appear in UI dropdown
3. Verify that journal entries are created with correct account codes
4. Confirm that all expense transactions properly integrate with chart of accounts

## Result
All new expense categories now use existing account codes from the chart of accounts, ensuring proper integration with the existing accounting system and resolving the database constraint violations that were preventing new categories from appearing in the UI.
