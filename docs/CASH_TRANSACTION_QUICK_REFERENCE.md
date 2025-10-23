# 🎯 Quick Reference: Cash Transaction Pattern

## Copy-Paste Code Snippets for Other Dialogs

---

## 📋 Frontend Pattern

### **1. Add Cash Account State** (if not already present)
```typescript
const [cashAccounts, setCashAccounts] = useState<{
  id: string;
  name: string;
  account_name?: string;
  current_balance?: number;
}[]>([]);
```

### **2. Fetch Cash Accounts Function**
```typescript
const fetchCashAccounts = async () => {
  try {
    const response = await fetch('/api/finance/bank-accounts?type=CASH');
    if (response.ok) {
      const data = await response.json();
      const accounts = Array.isArray(data) ? data : (data.data || []);
      setCashAccounts(accounts);
      console.log('💵 Cash accounts loaded:', accounts.length);
    }
  } catch (error) {
    console.error('Error fetching cash accounts:', error);
  }
};
```

### **3. Call Fetch on Dialog Open**
```typescript
useEffect(() => {
  if (dialogOpen) {
    fetchCashAccounts();
  }
}, [dialogOpen]);
```

### **4. Cash Account Dropdown UI** (Already exists in most dialogs)
```typescript
{formData.payment_method === 'cash' && (
  <div className="space-y-2">
    <Label htmlFor="cash_account_id" className="text-sm font-medium">
      Cash Account *
    </Label>
    <Select 
      value={formData.cash_account_id} 
      onValueChange={(value) => setFormData({ ...formData, cash_account_id: value })}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select cash account" />
      </SelectTrigger>
      <SelectContent>
        {cashAccounts && cashAccounts.length > 0 ? (
          cashAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex flex-col">
                <span>{account.name || account.account_name}</span>
                {account.current_balance !== undefined && (
                  <span className="text-xs text-gray-500">
                    Balance: ₹{account.current_balance.toFixed(2)}
                  </span>
                )}
              </div>
            </SelectItem>
          ))
        ) : (
          <SelectItem value="none" disabled>
            No cash accounts available
          </SelectItem>
        )}
      </SelectContent>
    </Select>
    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
      💰 This will update the selected cash account balance
    </div>
  </div>
)}
```

### **5. Validation Before Submit**
```typescript
// Validate cash account
if (formData.payment_method === 'cash' && !formData.cash_account_id) {
  alert('Please select a cash account for cash payment');
  return;
}
```

### **6. ✅ KEY FIX: Send cash_account_id AS bank_account_id**
```typescript
// Prepare API data
const apiData = {
  ...otherFields,
  payment_method: formData.payment_method
};

// ✅ CRITICAL: Send cash_account_id as bank_account_id for cash payments
if (formData.payment_method === 'cash' && formData.cash_account_id) {
  apiData.bank_account_id = formData.cash_account_id; // ✅ Use cash account as bank account
  apiData.cash_account_id = formData.cash_account_id; // Also keep for reference
}

// Include bank_account_id for non-cash payments
if (formData.payment_method !== 'cash' && formData.bank_account_id) {
  apiData.bank_account_id = formData.bank_account_id;
}

// Send to API
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(apiData)
});
```

### **7. ✅ Remove CashTransactionManager Calls**
```typescript
// ❌ REMOVE THIS:
if (payment_method === 'cash') {
  await CashTransactionManager.handleExpenseCashPayment(...);
}

// ✅ REPLACE WITH:
console.log(`✅ Transaction created successfully: ${transactionId}`);
// Backend automatically handles cash transactions now
```

---

## 🔧 Backend Pattern

### **Find and Replace in Backend API Routes**

#### **BEFORE (Excludes Cash):**
```typescript
// ❌ OLD: Excludes cash
if (bank_account_id && payment_method !== 'cash') {
  // Create bank transaction
  await supabase.from("bank_transactions").insert([...]);
  // Update balance
  await supabase.from("bank_accounts").update({ current_balance: newBalance });
}
```

#### **AFTER (Includes All Types):**
```typescript
// ✅ NEW: Includes ALL account types (BANK, UPI, CASH)
if (bank_account_id && bank_account_id.trim() !== '') {
  console.log(`💰 Creating bank transaction for ${payment_method} payment of ₹${amount}`);
  
  // 1. Create bank transaction
  const { data: bankTransaction, error: bankTransError } = await supabase
    .from("bank_transactions")
    .insert([{
      bank_account_id,
      date,
      type: "withdrawal" or "deposit", // Based on transaction direction
      amount,
      description: `Transaction: ${description} (${payment_method?.toUpperCase()})`,
      reference: reference_number || `TXN-${id.slice(-8)}`
    }])
    .select()
    .single();

  if (bankTransError) {
    console.error('❌ Failed to create bank transaction:', bankTransError);
    return NextResponse.json({ 
      error: 'Failed to create bank transaction', 
      details: bankTransError.message 
    }, { status: 500 });
  }
  
  console.log(`✅ Bank transaction created: ${bankTransaction.id}`);

  // 2. Update bank account balance
  const { data: bankAccount, error: bankError } = await supabase
    .from("bank_accounts")
    .select("current_balance, account_type")
    .eq("id", bank_account_id)
    .single();
  
  if (!bankError && bankAccount) {
    // Adjust balance based on transaction type
    const balanceChange = type === 'deposit' ? amount : -amount;
    const newBalance = (bankAccount.current_balance || 0) + balanceChange;
    
    await supabase
      .from("bank_accounts")
      .update({ current_balance: newBalance })
      .eq("id", bank_account_id);
    
    console.log(`✅ ${bankAccount.account_type} account balance updated: ${bankAccount.current_balance} → ${newBalance}`);
  }
}
```

---

## 📊 Transaction Direction Reference

### **Withdrawals (Cash/Money Going OUT):**
- ✅ Expenses
- ✅ Withdrawals (partner/equity)
- ✅ Liability Payments
- ✅ Refunds
- ✅ Fund Transfers (from source)

```typescript
type: "withdrawal"
balanceChange: -amount  // Decrease balance
newBalance = currentBalance - amount
```

### **Deposits (Cash/Money Coming IN):**
- ✅ Investments
- ✅ Sales Payments
- ✅ Fund Transfers (to destination)

```typescript
type: "deposit"
balanceChange: +amount  // Increase balance
newBalance = currentBalance + amount
```

---

## 🎯 Files to Update

### **Investment Dialog:**
**Frontend:** `src/components/finance/SalesOrderInvoiceManager.tsx` (Lines ~7850-7950)  
**Backend:** `src/app/api/equity/investments/route.ts`  
**Type:** `deposit` (money coming in)

### **Withdrawal Dialog:**
**Frontend:** `src/components/finance/SalesOrderInvoiceManager.tsx` (Lines ~7960-8390)  
**Backend:** `src/app/api/equity/withdrawals/route.ts`  
**Type:** `withdrawal` (money going out)

### **Pay Liability Dialog:**
**Frontend:** `src/components/finance/SalesOrderInvoiceManager.tsx` (Lines ~8400-8750)  
**Backend:** `src/app/api/finance/liability-payments/route.ts`  
**Type:** `withdrawal` (money going out)

### **Fund Transfer Dialog:**
**Frontend:** Check `SalesOrderInvoiceManager.tsx` or separate component  
**Backend:** `src/app/api/finance/fund-transfer/route.ts`  
**Type:** `withdrawal` from source, `deposit` to destination

### **Process Refund Dialog:**
**Frontend:** `src/components/finance/RefundDialog.tsx`  
**Backend:** `src/app/api/finance/refunds/route.ts`  
**Type:** `withdrawal` (money going out)

---

## ✅ Implementation Checklist

For each dialog:

### **Frontend:**
- [ ] Add `cashAccounts` state (if missing)
- [ ] Add `fetchCashAccounts()` function
- [ ] Call fetch on dialog open
- [ ] Verify cash account dropdown exists
- [ ] Add validation for cash_account_id
- [ ] **✅ Send cash_account_id AS bank_account_id when cash payment**
- [ ] Remove `CashTransactionManager` calls

### **Backend:**
- [ ] Find the bank transaction creation block
- [ ] **✅ Remove `payment_method !== 'cash'` condition**
- [ ] Add logging with account_type display
- [ ] Verify transaction type (deposit/withdrawal)
- [ ] Test with Postman/Thunder Client

### **Testing:**
- [ ] Create transaction with cash payment method
- [ ] Select cash account from dropdown
- [ ] Verify success message
- [ ] Check `bank_transactions` table for new record
- [ ] Check `bank_accounts` table for updated balance
- [ ] Verify console logs show correct account_type

---

## 🔍 Debugging Tips

### **Issue: Cash account dropdown not showing**
**Check:**
1. Is `fetchCashAccounts()` being called?
2. Does `/api/finance/bank-accounts?type=CASH` return data?
3. Is `cashAccounts` state populated?
4. Is condition `payment_method === 'cash'` correct?

### **Issue: Bank transaction not created**
**Check:**
1. Is `bank_account_id` being sent in API request?
2. Backend logs: "Creating bank transaction for cash payment..."
3. Database: CASH account exists with correct `account_type`?
4. Backend: `payment_method !== 'cash'` condition removed?

### **Issue: Balance not updated**
**Check:**
1. Bank transaction created successfully?
2. `bank_accounts.current_balance` column exists?
3. Account ID matches between transaction and account?
4. Balance update query successful?

---

## 🎉 Success Indicators

After implementation, you should see:

### **Console Logs (Frontend):**
```
💵 Cash accounts loaded: 1
Creating [transaction type] with data: {payment_method: "cash", cash_account_id: "xxx", bank_account_id: "xxx"}
✅ [Transaction type] created successfully: [id]
```

### **Console Logs (Backend):**
```
💰 Creating bank transaction for cash payment of ₹500 (account: xxx)
✅ Bank transaction created: [transaction_id]
✅ CASH account balance updated: 10000 → 9500
```

### **Database:**
```sql
-- New record in bank_transactions
SELECT * FROM bank_transactions WHERE bank_account_id = 'CASH-PETTY-ID' ORDER BY created_at DESC LIMIT 1;

-- Updated balance in bank_accounts
SELECT current_balance FROM bank_accounts WHERE id = 'CASH-PETTY-ID';
```

---

## 📞 Need Help?

Refer to detailed documentation:
- `CASH_TRANSACTION_IMPLEMENTATION_GUIDE.md` - Full implementation guide
- `CASH_TRANSACTION_FIX_COMPLETE.md` - Testing checklist
- `CASH_TRANSACTION_COMPLETE_SUMMARY.md` - Comprehensive summary

---

**Quick Pattern Summary:**

1. Frontend: `bank_account_id = cash_account_id` when `payment_method === 'cash'`
2. Backend: Remove `payment_method !== 'cash'` exclusion
3. Test: Verify `bank_transactions` and `bank_accounts` updated
4. Celebrate! 🎉
