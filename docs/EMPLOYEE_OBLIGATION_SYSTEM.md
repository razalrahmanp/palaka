# Employee Obligation Management System

## Overview
Created a comprehensive manual obligation entry system for employees that allows tracking of salary, incentive, overtime, bonus, and other obligations through a dedicated database table and user interface.

## What Was Created

### 1. Database Schema (`database/employee_obligations_schema.sql`)

**Table: `employee_obligations`**
- Stores all manual obligation entries for employees
- Supports multiple obligation types: salary, incentive, overtime, bonus, allowance, commission, other
- Tracks status: pending, paid, cancelled
- Includes audit fields: created_by, created_at, updated_by, updated_at
- Has proper indexes for performance
- RLS (Row Level Security) enabled for security

**Key Fields:**
- `employee_id` - Links to employees table
- `obligation_date` - Date of the obligation (typically end of month)
- `obligation_type` - Type of obligation
- `amount` - Amount of the obligation
- `description` - Detailed description
- `reference_number` - Unique reference for tracking
- `status` - Current status of the obligation
- `notes` - Additional notes

### 2. API Routes (`src/app/api/finance/employee-obligations/route.ts`)

**Endpoints:**
- **GET** - Fetch obligations with optional filters:
  - `?employee_id=xxx` - Filter by employee
  - `?start_date=yyyy-mm-dd` - Filter by date range start
  - `?end_date=yyyy-mm-dd` - Filter by date range end
  - `?obligation_type=salary` - Filter by type
  - `?status=pending` - Filter by status

- **POST** - Create new obligation entry
  - Required: employee_id, obligation_date, obligation_type, amount
  - Optional: description, reference_number, status, notes

- **PUT** - Update existing obligation
  - Required: id
  - Optional: All other fields can be updated

- **DELETE** - Remove obligation entry
  - Required: ?id=xxx

### 3. UI Component (`src/components/finance/ObligationEntryDialog.tsx`)

**Features:**
- Modal dialog for creating/editing obligations
- Date picker for obligation date
- Dropdown for obligation type (Salary, Incentive, Overtime, Bonus, Allowance, Commission, Other)
- Amount input with validation
- Status selector (Pending, Paid, Cancelled)
- Reference number field
- Description and notes text areas
- Form validation
- Loading states
- Error handling

### 4. Updated Ledger View (`src/components/finance/DetailedLedgerView.tsx`)

**Changes:**
- Added "Add Obligation" button in header (visible for employee ledgers only)
- Removed automatic obligation calculation
- Now fetches obligations from database instead of calculating
- Obligations appear as transactions in the ledger
- Automatic refresh after adding obligations
- Proper debit/credit accounting (obligations are debits - what company owes)

## How to Use

### Step 1: Create the Database Table
Run the SQL schema file in your Supabase SQL editor:
```sql
-- Run: database/employee_obligations_schema.sql
```

### Step 2: Access Employee Ledger
1. Go to Finance → Ledgers
2. Click on an Employee ledger
3. You'll see an "Add Obligation" button in the top right

### Step 3: Add Manual Obligation
Click "Add Obligation" and fill in:
- **Obligation Date**: Usually the last day of the month
- **Obligation Type**: Select from dropdown (Salary, Incentive, etc.)
- **Amount**: Enter the obligation amount
- **Status**: Choose Pending/Paid/Cancelled
- **Reference Number**: Optional (e.g., SAL-2025-01)
- **Description**: Describe the obligation
- **Notes**: Any additional information

### Step 4: View in Ledger
- Obligations appear as debit entries (what company owes)
- Sorted by date with all other transactions
- Running balance calculated automatically

## Obligation Types Explained

1. **Salary** - Monthly base salary obligations
2. **Incentive** - Sales performance incentives
3. **Overtime** - Overtime work compensation
4. **Bonus** - Performance or festival bonuses
5. **Allowance** - Travel, phone, or other allowances
6. **Commission** - Sales commission
7. **Other** - Any other type of obligation

## Accounting Logic

**Obligations (Debits)**
- Increase what the company owes to the employee
- Appear as debit entries in the ledger
- Example: ₹25,000 salary obligation at month-end

**Payments (Credits)**
- Decrease what the company owes
- Appear as credit entries in the ledger
- Example: ₹25,000 salary payment

**Running Balance**
- Balance = Total Debits - Total Credits
- Positive balance = Company owes employee
- Shows outstanding amount

## Workflow Example

### Monthly Salary Process:
1. **End of Month** - HR adds salary obligation
   ```
   Date: 2025-01-31
   Type: Salary
   Amount: ₹25,000
   Status: Pending
   ```

2. **Payment Made** - Finance processes payment
   ```
   (Payment recorded through payroll system)
   Status: Can be updated to "Paid"
   ```

3. **Ledger Shows**:
   ```
   Jan 31: Salary Obligation    ₹25,000  Debit
   Feb 5:  Salary Payment       ₹25,000  Credit
   Balance: ₹0 (Settled)
   ```

### Incentive Process:
1. **Sales Performance Reviewed** - Manager calculates incentive
2. **Add Obligation** - Enter month-end obligation
3. **Payment Processed** - When incentive is paid
4. **Status Updated** - Mark as "Paid"

## API Usage Examples

### Create Obligation:
```javascript
const response = await fetch('/api/finance/employee-obligations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employee_id: 'uuid-here',
    obligation_date: '2025-01-31',
    obligation_type: 'salary',
    amount: 25000,
    description: 'Monthly Salary - January 2025',
    reference_number: 'SAL-2025-01',
    status: 'pending'
  })
});
```

### Fetch Employee Obligations:
```javascript
const response = await fetch(
  '/api/finance/employee-obligations?employee_id=uuid-here&status=pending'
);
const data = await response.json();
```

### Update Status to Paid:
```javascript
const response = await fetch('/api/finance/employee-obligations', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'obligation-uuid',
    status: 'paid'
  })
});
```

## Benefits

1. **Manual Control** - Full control over obligation entries
2. **Flexibility** - Support for all types of obligations
3. **Audit Trail** - Track who created/updated obligations
4. **Status Tracking** - Monitor pending vs paid obligations
5. **Integration** - Works seamlessly with existing ledger system
6. **Reporting** - Can query obligations by type, date, status
7. **Historical Data** - Maintains complete obligation history

## Next Steps

1. Run the SQL schema to create the table
2. Test with a sample employee
3. Add obligations for different types
4. Verify ledger calculations
5. Train HR/Finance teams on the process

## Notes

- Obligations are stored separately from payments
- Payments come from payroll_records table
- Ledger combines both for complete view
- No more automatic calculation - all manual
- More control and accuracy
- Better audit trail
