-- Script to delete all November 2025 entries from payroll, salary expenses, and vendor payments
-- Created: November 20, 2025
-- WARNING: This will permanently delete data. Create backup before running!

-- =============================================================================
-- STEP 1: PREVIEW - Count records that will be deleted
-- =============================================================================

-- 1a. Count payroll records for November 2025
SELECT 
    'Payroll Records - November 2025' AS table_name,
    COUNT(*) AS records_to_delete,
    MIN(pay_period_start) AS earliest_date,
    MAX(pay_period_end) AS latest_date,
    SUM(net_salary) AS total_amount
FROM payroll_records
WHERE DATE_TRUNC('month', pay_period_start) = '2025-11-01'::date
   OR DATE_TRUNC('month', pay_period_end) = '2025-11-01'::date
   OR DATE_TRUNC('month', created_at) = '2025-11-01'::date;

-- 1b. Count expense records for salary categories in November 2025
SELECT 
    'Expense Records - Salary Categories - November 2025' AS table_name,
    COUNT(*) AS records_to_delete,
    MIN(date) AS earliest_date,
    MAX(date) AS latest_date,
    SUM(amount) AS total_amount,
    STRING_AGG(DISTINCT category, ', ') AS categories
FROM expenses
WHERE DATE_TRUNC('month', date) = '2025-11-01'::date
  AND LOWER(category) LIKE '%salary%'
     OR LOWER(category) LIKE '%salaries%'
     OR LOWER(category) LIKE '%payroll%'
     OR LOWER(category) = 'salary'
     OR LOWER(category) = 'salaries';

-- 1c. Count vendor payment history records for November 2025
SELECT 
    'Vendor Payment History - November 2025' AS table_name,
    COUNT(*) AS records_to_delete,
    MIN(payment_date) AS earliest_date,
    MAX(payment_date) AS latest_date,
    SUM(amount) AS total_amount
FROM vendor_payment_history
WHERE DATE_TRUNC('month', payment_date) = '2025-11-01'::date
   OR DATE_TRUNC('month', created_at) = '2025-11-01'::date;

-- 1d. Overall summary
SELECT 
    'TOTAL SUMMARY' AS summary,
    (SELECT COUNT(*) FROM payroll_records 
     WHERE DATE_TRUNC('month', pay_period_start) = '2025-11-01'::date
        OR DATE_TRUNC('month', pay_period_end) = '2025-11-01'::date
        OR DATE_TRUNC('month', created_at) = '2025-11-01'::date) AS payroll_records,
    (SELECT COUNT(*) FROM expenses 
     WHERE DATE_TRUNC('month', date) = '2025-11-01'::date
       AND (LOWER(category) LIKE '%salary%' 
            OR LOWER(category) LIKE '%salaries%' 
            OR LOWER(category) LIKE '%payroll%'
            OR LOWER(category) = 'salary'
            OR LOWER(category) = 'salaries')) AS expense_records,
    (SELECT COUNT(*) FROM vendor_payment_history 
     WHERE DATE_TRUNC('month', payment_date) = '2025-11-01'::date) AS vendor_payment_records;

-- =============================================================================
-- STEP 2: DETAILED PREVIEW - Show actual records to be deleted
-- =============================================================================

-- 2a. Preview payroll records
SELECT 
    '2a. Payroll Records to Delete' AS preview_section,
    id,
    employee_id,
    pay_period_start,
    pay_period_end,
    net_salary,
    status,
    payment_type,
    created_at
FROM payroll_records
WHERE DATE_TRUNC('month', pay_period_start) = '2025-11-01'::date
   OR DATE_TRUNC('month', pay_period_end) = '2025-11-01'::date
   OR DATE_TRUNC('month', created_at) = '2025-11-01'::date
ORDER BY pay_period_start, created_at
LIMIT 100;

-- 2b. Preview expense records (salary categories)
SELECT 
    '2b. Expense Records to Delete (Salary Categories)' AS preview_section,
    id,
    date,
    category,
    amount,
    description,
    created_at
FROM expenses
WHERE DATE_TRUNC('month', date) = '2025-11-01'::date
  AND (LOWER(category) LIKE '%salary%' 
       OR LOWER(category) LIKE '%salaries%' 
       OR LOWER(category) LIKE '%payroll%'
       OR LOWER(category) = 'salary'
       OR LOWER(category) = 'salaries')
ORDER BY date, created_at
LIMIT 100;

-- 2c. Preview vendor payment history records
SELECT 
    '2c. Vendor Payment History to Delete' AS preview_section,
    id,
    supplier_id,
    payment_date,
    amount,
    payment_method,
    reference_number,
    created_at
FROM vendor_payment_history
WHERE DATE_TRUNC('month', payment_date) = '2025-11-01'::date
   OR DATE_TRUNC('month', created_at) = '2025-11-01'::date
ORDER BY payment_date, created_at
LIMIT 100;

-- =============================================================================
-- STEP 3: CREATE BACKUP TABLES
-- =============================================================================

-- 3a. Backup payroll records
DROP TABLE IF EXISTS payroll_records_nov2025_backup;
CREATE TABLE payroll_records_nov2025_backup AS
SELECT 
    *,
    NOW() AS backup_timestamp,
    'November 2025 cleanup' AS backup_reason
FROM payroll_records
WHERE DATE_TRUNC('month', pay_period_start) = '2025-11-01'::date
   OR DATE_TRUNC('month', pay_period_end) = '2025-11-01'::date
   OR DATE_TRUNC('month', created_at) = '2025-11-01'::date;

-- 3b. Backup expense records (salary categories)
DROP TABLE IF EXISTS expenses_salary_nov2025_backup;
CREATE TABLE expenses_salary_nov2025_backup AS
SELECT 
    *,
    NOW() AS backup_timestamp,
    'November 2025 salary expenses cleanup' AS backup_reason
FROM expenses
WHERE DATE_TRUNC('month', date) = '2025-11-01'::date
  AND (LOWER(category) LIKE '%salary%' 
       OR LOWER(category) LIKE '%salaries%' 
       OR LOWER(category) LIKE '%payroll%'
       OR LOWER(category) = 'salary'
       OR LOWER(category) = 'salaries');

-- 3c. Backup vendor payment history
DROP TABLE IF EXISTS vendor_payment_history_nov2025_backup;
CREATE TABLE vendor_payment_history_nov2025_backup AS
SELECT 
    *,
    NOW() AS backup_timestamp,
    'November 2025 vendor payments cleanup' AS backup_reason
FROM vendor_payment_history
WHERE DATE_TRUNC('month', payment_date) = '2025-11-01'::date
   OR DATE_TRUNC('month', created_at) = '2025-11-01'::date;

-- 3d. Verify backups
SELECT 
    'Backup Verification' AS verification,
    (SELECT COUNT(*) FROM payroll_records_nov2025_backup) AS payroll_backed_up,
    (SELECT COUNT(*) FROM expenses_salary_nov2025_backup) AS expenses_backed_up,
    (SELECT COUNT(*) FROM vendor_payment_history_nov2025_backup) AS vendor_payments_backed_up,
    NOW() AS backup_time;

-- =============================================================================
-- STEP 4: DELETE RECORDS (UNCOMMENT TO EXECUTE)
-- =============================================================================

-- ⚠️ WARNING: UNCOMMENT AND RUN THESE STATEMENTS ONLY AFTER:
--    1. Reviewing the preview queries above
--    2. Verifying the backup tables are created
--    3. Getting approval to proceed

-- 4a. Delete payroll records for November 2025
DELETE FROM payroll_records
WHERE DATE_TRUNC('month', pay_period_start) = '2025-11-01'::date
   OR DATE_TRUNC('month', pay_period_end) = '2025-11-01'::date
   OR DATE_TRUNC('month', created_at) = '2025-11-01'::date;

-- 4b. Delete expense records (salary categories only) for November 2025
DELETE FROM expenses
WHERE DATE_TRUNC('month', date) = '2025-11-01'::date
  AND (LOWER(category) LIKE '%salary%' 
       OR LOWER(category) LIKE '%salaries%' 
       OR LOWER(category) LIKE '%payroll%'
       OR LOWER(category) = 'salary'
       OR LOWER(category) = 'salaries');

-- 4c. Delete vendor payment history for November 2025
DELETE FROM vendor_payment_history
WHERE DATE_TRUNC('month', payment_date) = '2025-11-01'::date
   OR DATE_TRUNC('month', created_at) = '2025-11-01'::date;

-- =============================================================================
-- STEP 5: POST-DELETION VERIFICATION
-- =============================================================================

-- 5a. Verify payroll records deleted
SELECT 
    'Post-Deletion: Payroll Records' AS verification,
    COUNT(*) AS remaining_november_records,
    (SELECT COUNT(*) FROM payroll_records_nov2025_backup) AS backed_up_records
FROM payroll_records
WHERE DATE_TRUNC('month', pay_period_start) = '2025-11-01'::date
   OR DATE_TRUNC('month', pay_period_end) = '2025-11-01'::date
   OR DATE_TRUNC('month', created_at) = '2025-11-01'::date;

-- 5b. Verify expense records deleted
SELECT 
    'Post-Deletion: Expense Records (Salary)' AS verification,
    COUNT(*) AS remaining_november_records,
    (SELECT COUNT(*) FROM expenses_salary_nov2025_backup) AS backed_up_records
FROM expenses
WHERE DATE_TRUNC('month', date) = '2025-11-01'::date
  AND (LOWER(category) LIKE '%salary%' 
       OR LOWER(category) LIKE '%salaries%' 
       OR LOWER(category) LIKE '%payroll%'
       OR LOWER(category) = 'salary'
       OR LOWER(category) = 'salaries');

-- 5c. Verify vendor payment history deleted
SELECT 
    'Post-Deletion: Vendor Payment History' AS verification,
    COUNT(*) AS remaining_november_records,
    (SELECT COUNT(*) FROM vendor_payment_history_nov2025_backup) AS backed_up_records
FROM vendor_payment_history
WHERE DATE_TRUNC('month', payment_date) = '2025-11-01'::date
   OR DATE_TRUNC('month', created_at) = '2025-11-01'::date;

-- 5d. Overall verification summary
SELECT 
    'DELETION VERIFICATION SUMMARY' AS summary,
    (SELECT COUNT(*) FROM payroll_records_nov2025_backup) AS payroll_deleted,
    (SELECT COUNT(*) FROM expenses_salary_nov2025_backup) AS expenses_deleted,
    (SELECT COUNT(*) FROM vendor_payment_history_nov2025_backup) AS vendor_payments_deleted,
    NOW() AS verification_time;

-- =============================================================================
-- STEP 6: RESTORE FROM BACKUP (If needed)
-- =============================================================================

/*
-- Only use this if you need to restore the deleted data

-- 6a. Restore payroll records
INSERT INTO payroll_records
SELECT 
    id, employee_id, salary_structure_id, pay_period_start, pay_period_end,
    basic_salary, total_allowances, total_deductions, gross_salary, net_salary,
    working_days, present_days, leave_days, overtime_hours, overtime_amount,
    bonus, status, processed_by, processed_at, created_at, payment_type
FROM payroll_records_nov2025_backup;

-- 6b. Restore expense records
INSERT INTO expenses
SELECT 
    id, date, category, amount, description, payment_method, 
    vendor_id, receipt_number, bank_account_id, created_by, 
    created_at, updated_at, approved_by, approved_at, status
FROM expenses_salary_nov2025_backup;

-- 6c. Restore vendor payment history
INSERT INTO vendor_payment_history
SELECT 
    id, supplier_id, vendor_bill_id, purchase_order_id, amount, 
    payment_date, payment_method, reference_number, bank_account_id, 
    notes, status, created_by, created_at
FROM vendor_payment_history_nov2025_backup;
*/
