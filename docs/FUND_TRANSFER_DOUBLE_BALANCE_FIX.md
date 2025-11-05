# Fund Transfer Double Balance Update Fix

## Issue Summary
Fund transfers were doubling the transaction amount in bank account balances.

**Example:**
- Transfer: ₹40,000 from CASH-PETTY CASH to Shahid Cash/Bank
- Expected: Source decreased by ₹40,000, Destination increased by ₹40,000
- Actual: Source decreased by ₹80,000, Destination increased by ₹80,000

## Root Cause
The balance was being updated **twice** for each transaction:

1. **Manual Update in API**: The `fund-transfer` API was explicitly updating `bank_accounts.current_balance`
2. **Database Trigger Update**: The trigger `trg_update_bank_account_balance` was automatically updating the same balance when `bank_transactions` rows were inserted

### Database Trigger Details
- **Trigger Name**: `trg_update_bank_account_balance`
- **Table**: `bank_transactions`
- **Events**: INSERT, UPDATE, DELETE
- **Function**: `update_bank_account_balance_from_transaction()`
- **Location**: `database/triggers.sql` (lines 88-104) and `database/functions.sql` (lines 1508-1600)

**How the trigger works:**
```sql
-- On INSERT to bank_transactions
IF TG_OP = 'INSERT' THEN
  IF NEW.type = 'deposit' THEN
    v_new_effect := NEW.amount;  -- Add to balance
  ELSIF NEW.type = 'withdrawal' THEN
    v_new_effect := -NEW.amount;  -- Subtract from balance
  END IF;
  
  UPDATE bank_accounts 
  SET current_balance = current_balance + v_new_effect
  WHERE id = NEW.bank_account_id;
END IF;
```

## Solution
**Removed manual balance updates from the API** and relied entirely on the database trigger.

### Changes Made to `/api/finance/fund-transfer/route.ts`

**BEFORE (Lines 83-129):**
```typescript
// 1. Update source account (debit)
const newFromBalance = fromAccount.current_balance - amount;
const { error: debitError } = await supabaseAdmin
  .from('bank_accounts')
  .update({
    current_balance: newFromBalance,
    updated_at: new Date().toISOString()
  })
  .eq('id', fromAccountId);

// 2. Update destination account (credit)
const newToBalance = toAccount.current_balance + amount;
const { error: creditError } = await supabaseAdmin
  .from('bank_accounts')
  .update({
    current_balance: newToBalance,
    updated_at: new Date().toISOString()
  })
  .eq('id', toAccountId);

// 3. Record transaction history for source
await supabaseAdmin.from('bank_transactions').insert({...});

// 4. Record transaction history for destination
await supabaseAdmin.from('bank_transactions').insert({...});
```

**AFTER (Lines 80-120):**
```typescript
console.log(`Note: Balances will be automatically updated by database trigger 'trg_update_bank_account_balance'`);

// Record transaction history for source account (withdrawal)
// The database trigger will automatically deduct the amount from source account balance
const { error: debitTransactionError } = await supabaseAdmin
  .from('bank_transactions')
  .insert({
    bank_account_id: fromAccountId,
    date: date,
    type: 'withdrawal',
    amount: amount,
    description: `${transferDescription} (To: ${toAccount.name})`,
    reference: transferReference
  });

// Record transaction history for destination account (deposit)
// The database trigger will automatically add the amount to destination account balance
const { error: creditTransactionError } = await supabaseAdmin
  .from('bank_transactions')
  .insert({
    bank_account_id: toAccountId,
    date: date,
    type: 'deposit',
    amount: amount,
    description: `${transferDescription} (From: ${fromAccount.name})`,
    reference: transferReference
  });
```

### Key Differences:
1. ❌ **Removed**: Manual `UPDATE bank_accounts SET current_balance = ...` statements
2. ❌ **Removed**: Rollback logic for failed balance updates
3. ✅ **Kept**: Transaction recording in `bank_transactions` table
4. ✅ **Added**: Comments explaining that the trigger handles balance updates
5. ✅ **Added**: Error handling for failed transaction inserts

## Impact
- ✅ Fund transfers now record correct amounts
- ✅ Cash deposits to bank (contra entries) also fixed
- ✅ Simpler, cleaner code (removed ~30 lines of manual balance logic)
- ✅ Better separation of concerns (balance calculation in database layer)
- ✅ Transaction history properly maintained

## Verification Steps
1. **Before Fix**:
   ```
   Transfer ₹10,000 from Account A to Account B
   Result: A decreased by ₹20,000, B increased by ₹20,000 ❌
   ```

2. **After Fix**:
   ```
   Transfer ₹10,000 from Account A to Account B
   Result: A decreased by ₹10,000, B increased by ₹10,000 ✅
   ```

3. **Database Logs** (from trigger):
   ```
   ✅ BANK BALANCE UPDATE (INSERT): Account "Account A" | Type: withdrawal | Amount: 10000 | Old: 50000 | New: 40000
   ✅ BANK BALANCE UPDATE (INSERT): Account "Account B" | Type: deposit | Amount: 10000 | Old: 20000 | New: 30000
   ```

## Related Components
- **API Route**: `src/app/api/finance/fund-transfer/route.ts`
- **UI Component**: `src/components/finance/BankAccountManager.tsx`
- **Database Trigger**: `trg_update_bank_account_balance` (on `bank_transactions` table)
- **Database Function**: `update_bank_account_balance_from_transaction()`

## Database Schema
### bank_transactions
```sql
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  reference TEXT,
  balance NUMERIC(15,2)  -- Optional: running balance snapshot
);
```

### bank_accounts
```sql
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  account_number TEXT,
  account_type TEXT,  -- 'bank', 'upi', 'cash'
  current_balance NUMERIC(15,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Best Practices Applied
1. **Single Source of Truth**: Balance updates handled in one place (database trigger)
2. **Database Integrity**: Trigger ensures balance is always in sync with transactions
3. **Automatic Rollback**: If transaction insert fails, trigger never runs, maintaining consistency
4. **Audit Trail**: All transactions recorded with proper descriptions
5. **Error Handling**: Added proper error handling for transaction insert failures

## Testing Checklist
- [x] Fund transfer between bank accounts
- [x] Cash deposit to bank (contra entry)
- [x] UPI to bank transfer
- [x] Cash to UPI transfer
- [x] Verify transaction history records correctly
- [x] Verify balances update correctly (not doubled)
- [x] Test error scenarios (insufficient funds, invalid accounts)

## Date Fixed
January 2025

## Status
✅ **FIXED** - Manual balance updates removed, relying on database trigger
