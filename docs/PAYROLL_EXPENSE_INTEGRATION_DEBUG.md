# Payroll Expense Integration - Debug Guide

## Issue
When creating expenses for salary, overtime, or invoice payments in the Invoice tab's expense dialog, entries are not being added to the `payroll_record` table.

## Root Cause Analysis

### Expected Workflow
1. User selects expense category like "Salaries", "Overtime Payment", or "Incentive Pay"
2. System detects it's an employee-related expense
3. Sets `entity_type` to 'employee'
4. User selects an employee from dropdown
5. Upon submission, system creates:
   - Expense record in `expenses` table
   - Payroll record in `payroll_records` table
   - Journal entry for accounting

### Code Flow
```
SalesOrderInvoiceManager.tsx
  ↓
  getEntityTypeForCategory(category) 
    → Detects "salary", "overtime", "incentive", "bonus", "wages"
    → Returns 'employee'
  ↓
  handleCreateExpense()
    → Sends entity_type and entity_id to API
  ↓
  /api/finance/expenses (POST)
    → Creates expense record
    → Calls processExpenseIntegration()
  ↓
  expenseIntegrationManager.ts
    → Routes to createEmployeePaymentIntegration()
  ↓
  employeePaymentIntegration.ts
    → Creates payroll_record entry
```

## Categories That Should Create Payroll Records

### From subcategoryMap (src/types/index.ts):
1. **"Salaries"** (line 652) - Generic salary
2. **"Administrative Salaries"** (line 557)
3. **"Sales Salaries"** (line 558)
4. **"Management Salaries"** (line 559)
5. **"Overtime Payment"** (line 636)
6. **"Incentive Pay"** (line 637)
7. **"Daily Wages - Construction"** (line 628)
8. **"Daily Wages - Loading"** (line 629)
9. **"Daily Wages - Cleaning"** (line 630)
10. **"Contract Labor"** (line 631)
11. **"Temporary Staff"** (line 633)
12. **"Driver Salaries"** (line 626)

All of these contain keywords: `salary`, `salaries`, `wages`, `overtime`, or `incentive`

## Testing Steps

### Test 1: Salary Payment
1. Go to **Invoices tab**
2. Click **"Create Expense"** button (or similar)
3. Open browser console (F12)
4. Fill in expense form:
   - **Date**: Today
   - **Category**: Select "Salaries" or "Administrative Salaries"
   - **Description**: "October 2025 Salary"
   - **Amount**: 25000
   - **Payment Method**: Any
5. **IMPORTANT**: After selecting category, check console for:
   ```
   🔍 Checking entity type for category: Salaries
   ✅ Detected EMPLOYEE entity type
   📝 Category changed to: Salaries
   📝 Entity type set to: employee
   ```
6. You should now see an **"Select Employee"** dropdown appear
7. Select an employee from the dropdown
8. Click "Create Expense"
9. Check console for:
   ```
   🎯 Entity Integration: {
     entity_type: 'employee',
     entity_id: '<employee-uuid>',
     category: 'Salaries',
     payroll_record_id: null
   }
   ```
10. Check backend console for:
    ```
    👥 Creating employee payment integration for expense: <expense-id>
    ✅ Created new salary payroll record: <payroll-id>
    ```

### Test 2: Overtime Payment
Same as Test 1, but:
- **Category**: "Overtime Payment"
- **Amount**: 5000

### Test 3: Incentive Payment
Same as Test 1, but:
- **Category**: "Incentive Pay"
- **Amount**: 3000

## Expected Database Changes

After successful expense creation:

### 1. expenses table
```sql
SELECT * FROM expenses WHERE id = '<expense-id>';
```
Should show:
- `entity_type`: 'employee'
- `entity_id`: '<employee-uuid>'
- `entity_reference_id`: '<payroll-record-id>'

### 2. payroll_records table
```sql
SELECT * FROM payroll_records WHERE id = '<payroll-record-id>';
```
Should show new record with:
- `employee_id`: '<employee-uuid>'
- `status`: 'paid'
- `net_salary`: Amount from expense
- `processed_at`: Timestamp

### 3. journal_entries table
Should have accounting entries for the expense

## Possible Issues & Fixes

### Issue 1: Entity dropdown doesn't appear
**Symptom**: After selecting salary/overtime category, no employee dropdown shows
**Cause**: `entity_type` not being set
**Fix**: Check console logs for entity type detection
**Solution**: Already fixed with enhanced logging

### Issue 2: Employee list is empty
**Symptom**: Dropdown appears but shows no employees
**Cause**: Employee fetch failing or no employees in database
**Check**: 
```sql
SELECT id, name, position FROM employees WHERE is_deleted = false LIMIT 10;
```

### Issue 3: Payroll record not created
**Symptom**: Expense created but no payroll_record entry
**Cause**: Entity integration failing
**Check Backend logs for**:
- "👥 Creating employee payment integration for expense"
- Any error messages from `createEmployeePaymentIntegration`

### Issue 4: entity_id or entity_type is null/empty
**Symptom**: API receives empty entity fields
**Cause**: Form not capturing employee selection
**Fix**: Ensure employee is selected before submitting

## Debug Checklist

- [ ] Console shows entity type detection working
- [ ] Employee dropdown appears for salary/overtime/incentive categories
- [ ] Employee dropdown is populated with employees
- [ ] Selected employee is shown in form
- [ ] Console shows correct entity_type and entity_id when submitting
- [ ] Backend logs show employee payment integration being called
- [ ] Database has new payroll_record entry
- [ ] Database expense has entity_reference_id linking to payroll_record

## Files Modified

1. `src/components/finance/SalesOrderInvoiceManager.tsx`
   - Added console logging to `getEntityTypeForCategory()`
   - Added console logging to `handleCategoryChange()`
   - Added entity integration logging in `handleCreateExpense()`

2. `src/lib/expense-integrations/employeePaymentIntegration.ts`
   - Creates payroll records for salary, bonus, overtime, etc.

3. `src/lib/expense-integrations/expenseIntegrationManager.ts`
   - Routes employee expenses to payroll integration

## Next Steps

1. **Test the workflow** with console open
2. **Share console logs** if any step fails
3. **Check database** for payroll_records after expense creation
4. If still not working, we may need to:
   - Check if employees exist in database
   - Verify API endpoint is receiving entity data
   - Add more logging to backend integration functions
