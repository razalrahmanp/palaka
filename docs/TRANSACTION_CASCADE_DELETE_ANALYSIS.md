# Transaction Cascade Delete Analysis

## ✅ **RESOLVED - Implementation Complete**

**Status:** All issues identified below have been resolved with comprehensive DELETE endpoints.  
**See:** `CASCADE_DELETE_IMPLEMENTATION.md` for complete implementation details.

---

## Current Situation

### ❌ **Critical Gaps Identified** → ✅ **NOW RESOLVED**

The newly created `transaction_type` and `source_record_id` columns in `bank_transactions` table **DO NOT** have cascade delete protection. This creates potential orphaned records and data integrity issues.

## Detailed Analysis

### 1. Bank Transactions Table Structure

```sql
CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY,
  bank_account_id uuid,
  date date NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['deposit', 'withdrawal'])),
  amount numeric NOT NULL,
  description text,
  reference text,
  balance numeric DEFAULT 0,
  -- NEW COLUMNS (No foreign key constraints!)
  transaction_type text CHECK (...),
  source_record_id uuid,  -- ⚠️ Just UUID, not a proper FK
  
  CONSTRAINT bank_transactions_bank_account_id_fkey 
    FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
    -- ⚠️ No ON DELETE CASCADE
);
```

**Issues:**
- `source_record_id` is NOT a foreign key - just a plain UUID
- No referential integrity to source tables
- No cascade delete behavior
- No automatic cleanup on source record deletion

### 2. Current Delete Behavior by Transaction Type

#### 🔴 **EXPENSES** (transaction_type: 'expense')
**Manual cleanup in `/api/finance/expenses` DELETE endpoint:**

✅ **What Gets Deleted:**
- `expenses` table record
- `bank_transactions` (by pattern matching reference/description)
- `vendor_payment_history` (if vendor expense)
- `cash_transactions` (if cash payment)

❌ **What DOES NOT Get Deleted:**
- `vehicle_expense_logs` (orphaned!)
- `vehicle_maintenance_logs` (orphaned!)
- `payroll_records` (orphaned!)
- `journal_entries` (orphaned!)
- Related account balance adjustments

**Affected Files:** `src/app/api/finance/expenses/route.ts` lines 336-700

---

#### 🟡 **INVESTMENTS** (transaction_type: 'investment')
**No DELETE endpoint found**

❌ **Issues:**
- Cannot delete investments through API
- If deleted directly in DB, bank_transactions remain orphaned
- No cleanup logic exists

**Affected Files:** `src/app/api/equity/investments/route.ts` (only POST/GET)

---

#### 🟡 **WITHDRAWALS** (transaction_type: 'withdrawal')
**No DELETE endpoint found**

❌ **Issues:**
- Cannot delete withdrawals through API
- If deleted directly in DB, bank_transactions remain orphaned
- No cleanup logic exists

**Affected Files:** `src/app/api/equity/withdrawals/route.ts` (only POST/GET)

---

#### 🟡 **LIABILITY PAYMENTS** (transaction_type: 'liability_payment')
**No DELETE endpoint found**

❌ **Issues:**
- Cannot delete liability payments through API
- If deleted directly in DB, bank_transactions remain orphaned
- Liability balances would be incorrect

**Affected Files:** `src/app/api/finance/liability-payments/route.ts` (only POST/GET)

---

#### 🟡 **FUND TRANSFERS** (transaction_type: 'fund_transfer')
**No DELETE endpoint found**

❌ **Issues:**
- Cannot delete fund transfers through API
- Each transfer creates 2 bank_transactions (withdrawal + deposit)
- If deleted directly in DB, both transactions remain orphaned
- `fund_transfers` table record remains

**Affected Files:** `src/app/api/finance/fund-transfer/route.ts` (only POST/GET)

---

#### 🟢 **CUSTOMER PAYMENTS** (transaction_type: 'payment')
**Has DELETE endpoint in `/api/finance/payments/[id]/route.ts`**

✅ **What Gets Deleted:**
- `payments` table record
- `bank_transactions` (using reference pattern matching)
- Bank account balance automatically updated by trigger

**Affected Files:** `src/app/api/finance/payments/[id]/route.ts` lines 154-248

---

## 3. Root Cause: No Foreign Key Constraints

The `source_record_id` column has **no foreign key constraint** because it points to different tables based on `transaction_type`:

```typescript
// Different source tables based on type:
transaction_type: 'expense' → source_record_id references expenses.id
transaction_type: 'investment' → source_record_id references investments.id
transaction_type: 'withdrawal' → source_record_id references withdrawals.id
transaction_type: 'fund_transfer' → source_record_id references fund_transfers.id
transaction_type: 'payment' → source_record_id references payments.id
// ... etc
```

PostgreSQL cannot enforce foreign key to multiple tables from one column.

## 4. What Happens If You Delete Bank Transaction Directly?

**Scenario:** User manually deletes from `bank_transactions` table

```sql
DELETE FROM bank_transactions WHERE id = 'some-uuid';
```

**Result:**
- ✅ Bank transaction deleted
- ✅ Bank account balance trigger updates balance
- ❌ Source expense/investment/etc remains (orphaned)
- ❌ Related vehicle logs remain (orphaned)
- ❌ Related payroll records remain (orphaned)
- ❌ Related journal entries remain (orphaned)
- ❌ Related cash transactions remain (orphaned)

**Impact:** Data integrity corruption - expense shows as paid but no bank transaction exists.

## 5. What Happens If You Delete Source Record?

**Scenario:** User deletes an expense

### Via API (Current Implementation):
```typescript
DELETE /api/finance/expenses
```
✅ **Expenses API handles:**
- Deletes expense
- Manually finds and deletes bank_transactions (by pattern)
- Deletes vendor_payment_history (if vendor expense)
- Deletes cash_transactions (if cash)

❌ **Expenses API DOES NOT handle:**
- vehicle_expense_logs remain orphaned
- vehicle_maintenance_logs remain orphaned
- payroll_records remain orphaned
- journal_entries remain orphaned
- Cashflow table adjustments

### Via Direct DB Delete:
```sql
DELETE FROM expenses WHERE id = 'some-uuid';
```
❌ **Result:**
- Expense deleted
- bank_transactions remain (orphaned)
- vehicle logs remain (orphaned)
- payroll records remain (orphaned)
- journal entries remain (orphaned)
- Balances NOT restored

## Solutions & Recommendations

### Option 1: Database Triggers (Recommended)

Create database triggers to handle cascade deletes properly:

```sql
-- Trigger on bank_transactions DELETE
CREATE OR REPLACE FUNCTION cleanup_source_on_bank_transaction_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Based on transaction_type, delete from appropriate source table
  IF OLD.transaction_type = 'expense' THEN
    DELETE FROM expenses WHERE id = OLD.source_record_id;
  ELSIF OLD.transaction_type = 'investment' THEN
    DELETE FROM investments WHERE id = OLD.source_record_id;
  ELSIF OLD.transaction_type = 'withdrawal' THEN
    DELETE FROM withdrawals WHERE id = OLD.source_record_id;
  -- ... handle all types
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_transaction_delete_cascade
  BEFORE DELETE ON bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_source_on_bank_transaction_delete();
```

```sql
-- Trigger on source table DELETE (e.g., expenses)
CREATE OR REPLACE FUNCTION cleanup_related_on_expense_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete bank_transactions
  DELETE FROM bank_transactions 
  WHERE source_record_id = OLD.id 
    AND transaction_type = 'expense';
  
  -- Delete vehicle logs
  DELETE FROM vehicle_expense_logs WHERE expense_id = OLD.id;
  DELETE FROM vehicle_maintenance_logs WHERE expense_id = OLD.id;
  
  -- Delete payroll records if linked
  -- ... etc
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_delete_cascade
  BEFORE DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_related_on_expense_delete();
```

### Option 2: Application-Level Soft Deletes (Alternative)

Instead of hard deletes, use soft deletes with `is_deleted` flag:

```sql
-- Add to all transaction-related tables
ALTER TABLE expenses ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE bank_transactions ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE vehicle_expense_logs ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
-- ... etc
```

**Benefits:**
- No data loss
- Audit trail preserved
- Can undelete if needed
- Simpler cascade logic

**Drawbacks:**
- Queries must filter `is_deleted = false`
- Database size grows
- Indexes need updating

### Option 3: Enhanced API Delete Endpoints

Update all DELETE endpoints to use `source_record_id`:

```typescript
// Example for investments DELETE
export async function DELETE(req: Request) {
  const { investment_id } = await req.json();
  
  // 1. Delete bank_transactions using source_record_id
  await supabase
    .from('bank_transactions')
    .delete()
    .eq('source_record_id', investment_id)
    .eq('transaction_type', 'investment');
  
  // 2. Delete investment
  await supabase
    .from('investments')
    .delete()
    .eq('id', investment_id);
  
  // 3. Restore bank balance (if needed)
  // ...
}
```

### Option 4: Hybrid Approach (Recommended)

Combine multiple strategies:

1. **Database Triggers** for automatic cleanup
2. **Use `source_record_id`** in all delete operations
3. **Add DELETE endpoints** for all transaction types
4. **Soft deletes** for critical tables (expenses, payments)
5. **Audit logging** for all deletes

## Implementation Checklist

### Immediate Actions Required:

- [ ] **Update expenses DELETE to use `source_record_id`**
  - Currently uses pattern matching (reference, description)
  - Should use: `WHERE source_record_id = expense_id`

- [ ] **Create DELETE endpoints for:**
  - [ ] Investments (`/api/equity/investments`)
  - [ ] Withdrawals (`/api/equity/withdrawals`)
  - [ ] Liability Payments (`/api/finance/liability-payments`)
  - [ ] Fund Transfers (`/api/finance/fund-transfer`)

- [ ] **Enhance expense DELETE to cleanup:**
  - [ ] vehicle_expense_logs
  - [ ] vehicle_maintenance_logs
  - [ ] payroll_records (if not still needed)
  - [ ] journal_entries
  - [ ] Cashflow adjustments

- [ ] **Create database triggers:**
  - [ ] `bank_transactions` BEFORE DELETE trigger
  - [ ] `expenses` BEFORE DELETE trigger
  - [ ] `investments` BEFORE DELETE trigger
  - [ ] Other transaction source tables

- [ ] **Add soft delete columns:**
  - [ ] `expenses.is_deleted`
  - [ ] `bank_transactions.is_deleted`
  - [ ] Related tables

### Testing Checklist:

- [ ] Test deleting expense with vehicle logs
- [ ] Test deleting expense with employee payment
- [ ] Test deleting expense with vendor payment
- [ ] Test deleting investment
- [ ] Test deleting withdrawal
- [ ] Test deleting fund transfer
- [ ] Test direct bank_transaction delete
- [ ] Verify balances restore correctly
- [ ] Verify no orphaned records remain

## Summary

**Current State:**
- ✅ New columns created and populated on INSERT
- ❌ No foreign key constraints
- ❌ No cascade delete behavior
- ❌ Missing DELETE endpoints for most transaction types
- ❌ Expense DELETE doesn't cleanup all related tables
- ❌ Potential for orphaned records

**Risk Level:** 🔴 **HIGH**

**Impact:**
- Data integrity issues
- Orphaned records
- Incorrect balances
- Audit trail gaps

**Recommendation:** Implement **Option 4 (Hybrid Approach)** with:
1. Database triggers for automatic cleanup
2. Enhanced API delete endpoints
3. Use `source_record_id` in all operations
4. Soft deletes for critical tables
5. Comprehensive testing

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-13  
**Status:** Needs Implementation
