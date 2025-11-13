# Expense Dialogue Modal - Deep Analysis
## Tables Populated Based on Expense Type

---

## Overview

The **Add Expense** dialogue in `SalesOrderInvoiceManager.tsx` creates expenses that can populate **multiple tables** based on:
1. **Payment method** (cash, bank, UPI, etc.)
2. **Entity type** (truck, employee, supplier)
3. **Expense category/subcategory**

---

## Core Tables (Always Populated)

### 1. ✅ `expenses` Table
**Always created** for every expense, regardless of type.

**Fields populated:**
```typescript
{
  id: UUID,
  date: DATE,
  category: TEXT,          // From subcategoryMap
  type: TEXT,              // 'Fixed' | 'Variable' from subcategoryMap
  description: TEXT,
  amount: NUMERIC,
  payment_method: TEXT,    // 'cash', 'bank_transfer', 'card', 'cheque', 'online'
  created_by: UUID,
  entity_type: TEXT,       // 'truck' | 'employee' | 'supplier' | NULL
  entity_id: UUID,         // ID of truck/employee/supplier | NULL
  entity_reference_id: UUID // vendor_bill_id or payroll_record_id | NULL
}
```

---

### 2. ✅ `bank_transactions` Table
**Created when:** `bank_account_id` is provided (includes BANK, UPI, and CASH accounts)

**Fields populated:**
```typescript
{
  id: UUID,
  bank_account_id: UUID,
  date: DATE,
  type: 'withdrawal',
  amount: NUMERIC,
  description: TEXT,        // "Expense: {category} - {description} [{account_name}]"
  reference: TEXT,          // receipt_number or "EXP-{expense_id}"
  transaction_type: 'expense',  // NEW COLUMN
  source_record_id: UUID        // NEW COLUMN - Links to expenses.id
}
```

**Also updates:** `bank_accounts.current_balance` (decreased by expense amount)

---

### 3. ✅ `journal_entries` & `journal_entry_lines` Tables
**Always created** for accounting purposes.

**Tables:**
- `journal_entries`: Main entry record
- `journal_entry_lines`: Debit/credit lines (2-3 lines per entry)

**Typical structure:**
```sql
-- Debit: Expense Account (category-specific)
-- Credit: Cash/Bank Account
```

---

### 4. ✅ Cashflow Snapshot
**Always updated** via `upsert_cashflow_snapshot()` RPC function.

**Updates:** Monthly cashflow aggregates (outflows increased)

---

## Entity-Specific Tables (Conditional)

Based on `entity_type` selection in the expense form:

---

### A. 🚛 **TRUCK/VEHICLE Expenses** (`entity_type: 'truck'`)

#### Tables Populated:

#### 1. `vehicle_expense_logs`
**Always created** for truck expenses.

**Fields:**
```typescript
{
  id: UUID,
  truck_id: UUID,
  expense_id: UUID,           // Links to expenses.id
  expense_date: DATE,
  expense_type: TEXT,         // 'fuel' | 'maintenance' | 'insurance' | 'registration' | 'repair' | 'other'
  amount: NUMERIC,
  description: TEXT,
  odometer: NUMERIC,          // Optional
  quantity: NUMERIC,          // Optional (for fuel)
  location: TEXT,             // Optional
  vendor_name: TEXT,          // Optional
  receipt_number: TEXT,       // Optional
  created_by: UUID
}
```

#### 2. `vehicle_maintenance_logs`
**Created when:** `expense_type` is 'maintenance' or 'repair'

**Fields:**
```typescript
{
  id: UUID,
  truck_id: UUID,
  expense_id: UUID,
  maintenance_date: DATE,
  maintenance_type: TEXT,     // 'preventive' | 'repair' | 'inspection'
  description: TEXT,
  cost: NUMERIC,
  odometer: NUMERIC,
  next_service_date: DATE,    // Calculated
  next_service_odometer: NUMERIC
}
```

**Also updates:**
- `trucks.last_maintenance_date`
- `trucks.last_maintenance_type`
- `trucks.next_service_date`
- `trucks.next_service_odometer`
- `trucks.current_odometer` (if odometer provided)

---

### B. 👤 **EMPLOYEE Expenses** (`entity_type: 'employee'`)

#### Tables Populated:

#### 1. `payroll_records`
**Updated** (if `payroll_record_id` provided) or **Created** (new record)

**Payment Type Mapping:**
- **Salary**: Updates `net_salary_paid` in existing payroll record
- **Bonus**: Creates/updates bonus fields
- **Allowance**: Updates various allowance fields
- **Overtime**: Updates overtime payment
- **Incentive**: Updates incentive amounts
- **Reimbursement**: Creates new payroll record for reimbursement

**Fields Updated:**
```typescript
{
  // For Salary:
  net_salary_paid: NUMERIC,
  payment_date: DATE,
  payment_method: TEXT,
  bank_account_id: UUID,
  payment_status: 'paid',
  
  // For Bonus:
  bonus_amount: NUMERIC,
  bonus_type: TEXT,
  bonus_date: DATE,
  
  // For Allowance:
  travel_allowance: NUMERIC,
  medical_allowance: NUMERIC,
  // etc.
}
```

**Also updates:**
- `expenses.entity_reference_id` = `payroll_record_id`

---

### C. 🏢 **SUPPLIER/VENDOR Expenses** (`entity_type: 'supplier'`)

#### Tables Populated:

#### 1. `vendor_payment_history`
**Always created** for supplier expenses.

**Fields:**
```typescript
{
  id: UUID,
  supplier_id: UUID,
  expense_id: UUID,
  amount: NUMERIC,
  payment_date: DATE,
  payment_method: TEXT,
  bank_account_id: UUID,
  description: TEXT,
  vendor_bill_id: UUID,       // Optional - links to vendor_bills
  created_by: UUID
}
```

#### 2. `vendor_bills`
**Updated** (if `vendor_bill_id` provided)

**Fields Updated:**
```typescript
{
  paid_amount: NUMERIC,       // Increased by payment amount
  payment_status: TEXT,       // Updated to 'partially_paid' or 'paid'
  last_payment_date: DATE
}
```

**Also updates:**
- `expenses.entity_reference_id` = `vendor_bill_id`

---

## Special Expense Categories

### 💰 Cash to Bank Deposit
**When:** `category = 'Cash to Bank Deposit'` and `deposit_bank_id` provided

**Additional Actions:**
1. Withdraws from cash account (normal expense flow)
2. Creates **deposit** transaction in destination bank account
3. **No vendor/employee/truck integration** for this type

---

## Complete Table Population Flow

### Example 1: **Regular Office Supplies Expense (Cash)**

**Form Data:**
```javascript
{
  category: 'Office Supplies',
  amount: 5000,
  payment_method: 'cash',
  cash_account_id: 'xxx',
  entity_type: null,
  entity_id: null
}
```

**Tables Populated:**
1. ✅ `expenses` - Main expense record
2. ✅ `bank_transactions` - Withdrawal from cash account
3. ✅ `bank_accounts` - Balance updated
4. ✅ `journal_entries` + `journal_entry_lines` - Accounting entries
5. ✅ Cashflow snapshot updated

**Total: 4-5 tables**

---

### Example 2: **Vehicle Fuel Expense (Bank)**

**Form Data:**
```javascript
{
  category: 'Vehicle Fuel - Fleet',
  amount: 8000,
  payment_method: 'bank_transfer',
  bank_account_id: 'yyy',
  entity_type: 'truck',
  entity_id: 'truck-123',
  odometer: 45000,
  quantity: 100,
  location: 'Shell Station'
}
```

**Tables Populated:**
1. ✅ `expenses` - Main expense record
2. ✅ `bank_transactions` - Withdrawal from bank
3. ✅ `bank_accounts` - Balance updated
4. ✅ `journal_entries` + `journal_entry_lines` - Accounting
5. ✅ Cashflow snapshot updated
6. ✅ `vehicle_expense_logs` - Vehicle expense tracking
7. ✅ `trucks` - Odometer updated

**Total: 6-7 tables**

---

### Example 3: **Employee Salary Payment**

**Form Data:**
```javascript
{
  category: 'Salaries & Benefits',
  subcategory: 'Salary - Management',
  amount: 50000,
  payment_method: 'bank_transfer',
  bank_account_id: 'zzz',
  entity_type: 'employee',
  entity_id: 'emp-456',
  payroll_record_id: 'payroll-789'
}
```

**Tables Populated:**
1. ✅ `expenses` - Main expense record
2. ✅ `bank_transactions` - Withdrawal from bank
3. ✅ `bank_accounts` - Balance updated
4. ✅ `journal_entries` + `journal_entry_lines` - Accounting
5. ✅ Cashflow snapshot updated
6. ✅ `payroll_records` - Salary payment recorded

**Total: 5-6 tables**

---

### Example 4: **Vendor Bill Payment**

**Form Data:**
```javascript
{
  category: 'Vendor Payment',
  amount: 25000,
  payment_method: 'bank_transfer',
  bank_account_id: 'aaa',
  entity_type: 'supplier',
  entity_id: 'supplier-321',
  vendor_bill_id: 'bill-999'
}
```

**Tables Populated:**
1. ✅ `expenses` - Main expense record
2. ✅ `bank_transactions` - Withdrawal from bank
3. ✅ `bank_accounts` - Balance updated
4. ✅ `journal_entries` + `journal_entry_lines` - Accounting
5. ✅ Cashflow snapshot updated
6. ✅ `vendor_payment_history` - Payment tracking
7. ✅ `vendor_bills` - Bill status updated (paid_amount, payment_status)

**Total: 6-7 tables**

---

### Example 5: **Vehicle Maintenance with Repair**

**Form Data:**
```javascript
{
  category: 'Vehicle Maintenance - Fleet',
  amount: 15000,
  payment_method: 'cash',
  cash_account_id: 'bbb',
  entity_type: 'truck',
  entity_id: 'truck-123',
  odometer: 46000,
  description: 'Engine oil change and brake pad replacement'
}
```

**Tables Populated:**
1. ✅ `expenses` - Main expense record
2. ✅ `bank_transactions` - Withdrawal from cash
3. ✅ `bank_accounts` - Balance updated
4. ✅ `journal_entries` + `journal_entry_lines` - Accounting
5. ✅ Cashflow snapshot updated
6. ✅ `vehicle_expense_logs` - Expense tracking
7. ✅ `vehicle_maintenance_logs` - Maintenance details
8. ✅ `trucks` - Multiple fields updated:
   - `last_maintenance_date`
   - `last_maintenance_type`
   - `next_service_date`
   - `next_service_odometer`
   - `current_odometer`

**Total: 7-8 tables**

---

## Summary Table

| Expense Type | Core Tables | Entity Tables | Total Tables |
|-------------|-------------|---------------|--------------|
| **Simple Expense** (no entity) | 4-5 | 0 | **4-5** |
| **Vehicle Fuel** | 4-5 | 2 | **6-7** |
| **Vehicle Maintenance** | 4-5 | 3-4 | **7-9** |
| **Employee Salary** | 4-5 | 1 | **5-6** |
| **Vendor Payment** | 4-5 | 2-3 | **6-8** |

---

## Key Insights

### 1. Minimum Tables Per Expense
**Every expense** populates at least **4-5 core tables**:
- `expenses`
- `bank_transactions` (if bank_account_id provided)
- `bank_accounts` (balance update)
- `journal_entries` + `journal_entry_lines`
- Cashflow snapshot

### 2. Entity Integration Adds 1-4 Tables
- **Vehicle**: +2-4 tables (`vehicle_expense_logs`, `vehicle_maintenance_logs`, `trucks`)
- **Employee**: +1 table (`payroll_records`)
- **Supplier**: +2-3 tables (`vendor_payment_history`, `vendor_bills`)

### 3. Critical for Deletion
When deleting expenses, must cascade delete from:
- `bank_transactions` (matching `source_record_id`)
- `vehicle_expense_logs` (matching `expense_id`)
- `vehicle_maintenance_logs` (matching `expense_id`)
- `vendor_payment_history` (matching `expense_id`)
- Rollback balance changes in:
  - `bank_accounts`
  - `vendor_bills`
  - `payroll_records`
  - `trucks`

### 4. New Column Benefits
The new `transaction_type` and `source_record_id` columns in `bank_transactions` make it easy to:
- Find all bank transactions for a specific expense: `WHERE source_record_id = expense_id`
- Query all expense-related transactions: `WHERE transaction_type = 'expense'`
- Reconcile expenses with bank statements

---

## Expense Category → Entity Type Mapping

### Auto-detected as **TRUCK**:
- Vehicle Fuel - Fleet
- Vehicle Maintenance - Fleet
- Vehicle Insurance
- Vehicle Registration
- Logistics & Distribution
- Vehicle Fleet

### Auto-detected as **EMPLOYEE**:
- Salaries & Benefits
- Salary - (any)
- Bonus - (any)
- Allowance - (any)
- Overtime Payment
- Incentive Pay

### Auto-detected as **SUPPLIER**:
- Vendor Payment
- Supplier Payment
- Accounts Payable
- Raw Materials
- Office Supplies
- Marketing & Sales
- Technology
- Insurance
- Maintenance & Repairs
- Utilities

---

## Database Integrity

### Foreign Key Constraints
- `expenses.entity_id` → `trucks.id` | `employees.id` | `suppliers.id`
- `expenses.created_by` → `users.id`
- `bank_transactions.bank_account_id` → `bank_accounts.id`
- `bank_transactions.source_record_id` → `expenses.id` (via transaction_type check)
- `vehicle_expense_logs.expense_id` → `expenses.id`
- `vehicle_maintenance_logs.expense_id` → `expenses.id`
- `vendor_payment_history.expense_id` → `expenses.id`

### Cascading Deletes Required For
When deleting an expense, you must handle:
1. Delete child records first (expense logs, payment history)
2. Update related records (bills, payroll, trucks)
3. Reverse balance changes
4. Delete bank_transactions
5. Delete journal entries
6. Finally delete expense record

---

## Conclusion

The expense dialogue is a **sophisticated multi-table orchestrator** that can populate **4-9 tables** per expense depending on:
- Payment method
- Entity type selection
- Expense category
- Additional context (odometer, vendor bill, payroll record)

This design provides:
- ✅ Complete audit trail
- ✅ Proper accounting integration
- ✅ Entity-specific tracking
- ✅ Financial reconciliation
- ✅ Operational insights (vehicle maintenance, payroll, vendor bills)
