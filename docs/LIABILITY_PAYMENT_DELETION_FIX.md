# Liability Payment Deletion with Balance Restoration

## Issue
When deleting a liability payment from the Cashflow Manager, the system was not updating the loan's `current_balance` in the `loan_opening_balances` table. This caused the loan balance to remain reduced even after the payment record was deleted, leading to incorrect financial data.

## Root Cause
The original DELETE endpoint only deleted the `liability_payments` record without:
1. Restoring the loan balance (adding back the principal amount)
2. Restoring the bank account balance (if paid via bank)
3. Cleaning up related journal entries

## Database Impact

### Tables Affected
1. **liability_payments** - The payment record being deleted
2. **loan_opening_balances** - Loan balance needs restoration
3. **bank_accounts** - Bank balance needs restoration (if not cash)
4. **journal_entries** - Related accounting entries need cleanup

### Balance Flow

#### When Payment Created (Original Logic):
```
Loan Balance:
  current_balance = current_balance - principal_amount

Bank Balance (if not cash):
  current_balance = current_balance - total_amount
```

#### When Payment Deleted (NEW Logic):
```
Loan Balance:
  current_balance = current_balance + principal_amount

Bank Balance (if not cash):
  current_balance = current_balance + total_amount
```

## Implementation

### Updated DELETE Function
**File**: `src/app/api/finance/liability-payments/route.ts`

### Step-by-Step Process

#### 1. Fetch Payment Details
```typescript
const { data: payment, error: fetchError } = await supabase
  .from('liability_payments')
  .select('loan_id, principal_amount, bank_account_id, payment_method, total_amount')
  .eq('id', id)
  .single();
```

**Purpose**: Get the payment details BEFORE deletion to know:
- Which loan to restore balance for (`loan_id`)
- How much principal to add back (`principal_amount`)
- Which bank account was used (`bank_account_id`)
- Payment method to check if cash or bank (`payment_method`)
- Total amount for bank balance restoration (`total_amount`)

#### 2. Restore Loan Balance
```typescript
if (payment.loan_id && payment.principal_amount > 0) {
  // Fetch current loan balance
  const { data: loan } = await supabase
    .from('loan_opening_balances')
    .select('current_balance')
    .eq('id', payment.loan_id)
    .single();

  // Add principal back to loan balance
  const restoredBalance = (loan.current_balance || 0) + payment.principal_amount;
  
  // Update loan balance
  await supabase
    .from('loan_opening_balances')
    .update({ current_balance: restoredBalance })
    .eq('id', payment.loan_id);
}
```

**Logic**:
- ✅ Only restore if `loan_id` exists
- ✅ Only restore if `principal_amount > 0`
- ✅ Add principal back to current balance (reverses the deduction)
- ✅ Logs old and new balance for audit trail

#### 3. Restore Bank Account Balance
```typescript
if (payment.bank_account_id && payment.payment_method !== 'cash') {
  // Fetch current bank balance
  const { data: bankAccount } = await supabase
    .from("bank_accounts")
    .select("current_balance")
    .eq("id", payment.bank_account_id)
    .single();
  
  // Add total amount back to bank balance
  const restoredBalance = (bankAccount.current_balance || 0) + payment.total_amount;
  
  // Update bank balance
  await supabase
    .from("bank_accounts")
    .update({ current_balance: restoredBalance })
    .eq("id", payment.bank_account_id);
}
```

**Logic**:
- ✅ Only restore if `bank_account_id` exists
- ✅ Skip if payment method is 'cash' (cash doesn't affect bank balance)
- ✅ Add TOTAL amount back (not just principal - includes interest)
- ✅ Logs old and new balance for audit trail

#### 4. Delete Related Journal Entries
```typescript
await supabase
  .from('journal_entries')
  .delete()
  .eq('reference_id', id)
  .eq('reference_type', 'liability_payment');
```

**Logic**:
- ✅ Removes accounting entries associated with this payment
- ✅ Uses `reference_id` and `reference_type` for proper filtering
- ⚠️ Non-fatal - if journal deletion fails, payment still gets deleted

#### 5. Delete the Payment Record
```typescript
await supabase
  .from('liability_payments')
  .delete()
  .eq('id', id);
```

**Logic**:
- ✅ Final step after all related data is cleaned up
- ✅ Only executed if previous steps don't throw critical errors

## Example Scenarios

### Scenario 1: Delete Cash Payment
**Initial State**:
- Loan: ₹75,000 current balance
- Payment: ₹1,000 principal, ₹0 interest, cash

**After Deletion**:
- Loan: ₹76,000 current balance (restored)
- Bank: No change (was cash)
- Journal: Deleted

### Scenario 2: Delete Bank Transfer Payment
**Initial State**:
- Loan: ₹67,200 current balance
- Bank Account: ₹50,000 balance
- Payment: ₹16,400 principal, ₹0 interest, bank_transfer

**After Deletion**:
- Loan: ₹83,600 current balance (67,200 + 16,400)
- Bank: ₹66,400 balance (50,000 + 16,400)
- Journal: Deleted

### Scenario 3: Delete Payment with Interest
**Initial State**:
- Loan: ₹100,000 current balance
- Bank Account: ₹80,000 balance
- Payment: ₹5,000 principal, ₹500 interest, bank_transfer (total: ₹5,500)

**After Deletion**:
- Loan: ₹105,000 current balance (100,000 + 5,000 principal)
- Bank: ₹85,500 balance (80,000 + 5,500 total)
- Journal: Deleted

## Logging & Debugging

### Console Logs Added
```typescript
// Start of deletion
🗑️ Starting liability payment deletion: {id}

// Payment details
📋 Payment details: {loan_id, principal_amount, bank_account_id, ...}

// Loan balance restoration
🏦 Restoring loan balance for loan_id: {loan_id}
✅ Loan balance restored: {oldBalance, restoredBalance, principalRestored}

// Bank balance restoration
💰 Restoring bank balance for bank_account_id: {bank_account_id}
✅ Bank balance restored: {oldBalance, restoredBalance, amountRestored}

// Journal cleanup
✅ Related journal entries deleted

// Final success
✅ Liability payment deleted successfully: {id}
```

### Error Scenarios
```typescript
❌ Error fetching liability payment
❌ Error fetching loan
❌ Error restoring loan balance
❌ Error restoring bank balance
⚠️ Warning: Could not delete related journal entries (non-fatal)
❌ Error deleting liability payment
❌ Unexpected error in liability payment deletion
```

## API Response

### Success Response
```json
{
  "success": true,
  "message": "Liability payment deleted successfully and balances restored"
}
```

### Error Responses
```json
// Missing ID
{
  "error": "Liability payment ID is required"
}

// Payment not found
{
  "error": "Liability payment not found"
}

// Database error
{
  "error": "{database error message}"
}

// Unexpected error
{
  "error": "Internal server error"
}
```

## Testing Checklist

### ✅ Functional Tests
- [x] Delete cash payment → Loan balance restored, bank unchanged
- [x] Delete bank payment → Both loan and bank balances restored
- [x] Delete payment with only interest → Loan unchanged, bank restored
- [x] Delete payment without loan_id → No loan update attempted
- [x] Delete payment with journal entries → Entries cleaned up
- [x] Error handling for missing payment ID
- [x] Error handling for non-existent payment

### ✅ Balance Verification Tests
Before deletion, record:
1. Loan current_balance
2. Bank account current_balance
3. Payment principal_amount
4. Payment total_amount

After deletion, verify:
1. Loan balance = old balance + principal_amount ✅
2. Bank balance = old balance + total_amount (if not cash) ✅
3. Payment record deleted from liability_payments ✅
4. Journal entries deleted ✅

### ✅ Edge Cases
- [x] Payment with no loan_id (legacy data)
- [x] Payment with zero principal (interest only)
- [x] Cash payment (skip bank balance restoration)
- [x] Payment with deleted bank account (handle gracefully)
- [x] Payment with deleted loan (handle gracefully)

## Database Consistency

### Before This Fix
```
Problem: Deleting payment → Loan balance stuck at reduced amount
Example: 
  - Loan balance: ₹75,000 (after ₹1,000 payment)
  - Delete payment
  - Loan balance: ₹75,000 (WRONG - should be ₹76,000)
```

### After This Fix
```
Solution: Deleting payment → All balances restored
Example:
  - Loan balance: ₹75,000 (after ₹1,000 payment)
  - Delete payment
  - Loan balance: ₹76,000 (CORRECT - restored)
```

## Related Files
- `src/app/api/finance/liability-payments/route.ts` - Main API implementation
- `database/schema.sql` - Table definitions
- `src/components/finance/CashflowManager.tsx` - Frontend component (if applicable)

## Impact on Users

### Before Fix
❌ Deleting payments caused incorrect loan balances
❌ Financial reports showed wrong outstanding amounts
❌ Manual database fixes required

### After Fix
✅ Deleting payments properly restores all balances
✅ Loan balance accurately reflects actual debt
✅ Bank balance accurately reflects actual funds
✅ Clean deletion of related records
✅ Complete audit trail via console logs

## Future Enhancements
1. Add transaction/rollback support for atomic operations
2. Store deletion reason/notes for audit purposes
3. Soft delete option (mark as deleted instead of removing)
4. Add user permission checks (only authorized users can delete)
5. Email notification to finance team on deletion
6. Archive deleted payments in a separate table for history

## Conclusion
The liability payment deletion now properly reverses all financial impacts of the original payment, maintaining data integrity across loan balances, bank balances, and journal entries.
