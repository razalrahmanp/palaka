# Quick Reference: Cascade Delete Endpoints

## DELETE Endpoints Cheat Sheet

### 1. Delete Expense
```typescript
DELETE /api/finance/expenses
Body: { "expense_id": "uuid" }

Cascades To:
├─ bank_transactions (via source_record_id)
├─ vehicle_expense_logs (if truck)
├─ vehicle_maintenance_logs (if truck)
├─ payroll_records (if employee)
├─ vendor_payment_history (if supplier)
├─ journal_entries
└─ cash_transactions (if cash)

Restores:
├─ Bank/Cash balance
├─ Vendor bill status
└─ Cashflow snapshot
```

### 2. Delete Investment
```typescript
DELETE /api/equity/investments/[id]

Cascades To:
├─ bank_transactions (via source_record_id)
└─ journal_entries

Restores:
├─ Bank balance (reduces)
├─ Partner equity account
└─ Partner total investment
```

### 3. Delete Withdrawal
```typescript
DELETE /api/equity/withdrawals/[id]

Cascades To:
├─ bank_transactions (via source_record_id)
└─ journal_entries

Restores:
├─ Bank balance (adds back)
├─ Partner equity account
└─ Partner total investment
```

### 4. Delete Liability Payment
```typescript
DELETE /api/finance/liability-payments/[id]

Cascades To:
├─ bank_transactions (via source_record_id)
└─ journal_entries

Restores:
├─ Bank balance
├─ Liability paid_amount (reduces)
└─ Liability outstanding_amount (increases)
```

### 5. Delete Fund Transfer
```typescript
DELETE /api/finance/fund-transfer/[id]

Cascades To:
├─ bank_transactions (2 records: withdrawal + deposit)
└─ journal_entries

Restores:
├─ FROM account balance (adds back)
└─ TO account balance (subtracts)
```

---

## Usage Examples

### Frontend Delete Functions

```typescript
// Delete expense
async function deleteExpense(expenseId: string) {
  const response = await fetch('/api/finance/expenses', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expense_id: expenseId })
  });
  
  const result = await response.json();
  console.log('Deleted:', result.deleted_items);
  return result;
}

// Delete investment
async function deleteInvestment(investmentId: string) {
  const response = await fetch(`/api/equity/investments/${investmentId}`, {
    method: 'DELETE'
  });
  return response.json();
}

// Delete withdrawal
async function deleteWithdrawal(withdrawalId: string) {
  const response = await fetch(`/api/equity/withdrawals/${withdrawalId}`, {
    method: 'DELETE'
  });
  return response.json();
}

// Delete liability payment
async function deleteLiabilityPayment(paymentId: string) {
  const response = await fetch(`/api/finance/liability-payments/${paymentId}`, {
    method: 'DELETE'
  });
  return response.json();
}

// Delete fund transfer
async function deleteFundTransfer(transferId: string) {
  const response = await fetch(`/api/finance/fund-transfer/${transferId}`, {
    method: 'DELETE'
  });
  return response.json();
}
```

---

## Response Format

All DELETE endpoints return:

```typescript
{
  success: boolean;
  message: string;
  deleted_items: {
    [table_name]: number | boolean;
  };
  [transaction_type]_details: {
    id: string;
    amount: number;
    // ... other details
  };
}
```

### Example Response
```json
{
  "success": true,
  "message": "Expense and all related records deleted successfully",
  "deleted_items": {
    "expense": true,
    "bank_transactions": 1,
    "vehicle_expense_logs": 1,
    "vehicle_maintenance_logs": 0,
    "payroll_records": 0,
    "vendor_payment_history": 0,
    "journal_entries": 2,
    "cash_transactions": 0
  },
  "expense_details": {
    "id": "abc-123",
    "amount": 5000,
    "entity_type": "truck",
    "payment_method": "bank"
  }
}
```

---

## Key Implementation Details

### Uses source_record_id
```typescript
// ✅ This is how all DELETE endpoints work now
await supabase
  .from('bank_transactions')
  .delete()
  .eq('source_record_id', record.id)
  .eq('transaction_type', 'expense');
```

### Complete Cascade
Every DELETE:
1. Deletes bank_transactions using `source_record_id`
2. Deletes all related table records
3. Restores all affected balances
4. Deletes journal entries
5. Deletes the source record itself
6. Returns detailed deletion summary

### Error Handling
```typescript
try {
  const result = await deleteExpense(id);
  if (result.success) {
    toast.success(result.message);
    console.log('Items deleted:', result.deleted_items);
  }
} catch (error) {
  toast.error('Failed to delete expense');
  console.error(error);
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `/api/finance/expenses/route.ts` | Added DELETE_V2 with complete cascade |
| `/api/equity/investments/[id]/route.ts` | NEW DELETE endpoint |
| `/api/equity/withdrawals/[id]/route.ts` | NEW DELETE endpoint |
| `/api/finance/liability-payments/[id]/route.ts` | NEW DELETE endpoint |
| `/api/finance/fund-transfer/[id]/route.ts` | NEW DELETE endpoint |

---

## Testing Commands

### Verify No Orphaned Records

```sql
-- Check bank_transactions
SELECT COUNT(*) FROM bank_transactions bt
WHERE bt.source_record_id IS NOT NULL
  AND bt.transaction_type = 'expense'
  AND NOT EXISTS (SELECT 1 FROM expenses WHERE id = bt.source_record_id);
-- Should return 0

-- Check vehicle logs
SELECT COUNT(*) FROM vehicle_expense_logs vel
WHERE NOT EXISTS (SELECT 1 FROM expenses WHERE id = vel.expense_id);
-- Should return 0

-- Check fund transfers have 2 transactions each
SELECT source_record_id, COUNT(*) as tx_count
FROM bank_transactions
WHERE transaction_type = 'fund_transfer'
GROUP BY source_record_id
HAVING COUNT(*) != 2;
-- Should return 0 rows
```

---

## Common Pitfalls

### ❌ DON'T: Delete directly from database
```sql
-- ❌ This will leave orphaned records!
DELETE FROM expenses WHERE id = 'abc-123';
```

### ✅ DO: Use API endpoints
```typescript
// ✅ This properly cascades
await fetch('/api/finance/expenses', {
  method: 'DELETE',
  body: JSON.stringify({ expense_id: 'abc-123' })
});
```

### ❌ DON'T: Use old DELETE endpoint
```typescript
// ❌ Old endpoint (if exists) won't cascade properly
await fetch('/api/finance/expenses/old-delete', { ... });
```

### ✅ DO: Use new DELETE or DELETE_V2
```typescript
// ✅ Use the new implementation
await fetch('/api/finance/expenses', {
  method: 'DELETE',
  body: JSON.stringify({ expense_id })
});
```

---

## Status

| Feature | Status |
|---------|--------|
| Expense DELETE | ✅ Complete |
| Investment DELETE | ✅ Complete |
| Withdrawal DELETE | ✅ Complete |
| Liability Payment DELETE | ✅ Complete |
| Fund Transfer DELETE | ✅ Complete |
| Documentation | ✅ Complete |
| Testing | ⏳ Pending |
| Frontend Integration | ⏳ Pending |

---

**Last Updated:** 2025-01-13  
**Version:** 1.0  
**Status:** Ready for Testing
