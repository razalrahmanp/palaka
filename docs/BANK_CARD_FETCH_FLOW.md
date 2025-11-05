# 💳 Bank Account Cards - Complete Data Flow Analysis

## 📍 Component: `BankAccountManager.tsx`

---

## 🔄 Data Fetching Flow

### **On Component Mount**

```typescript
useEffect(() => {
  fetchBankAccounts();   // Fetch BANK type accounts
  fetchUpiAccounts();    // Fetch UPI type accounts
  fetchCashAccounts();   // Fetch CASH type accounts
}, []);
```

---

## 🏦 Individual Fetch Functions

### 1. **Bank Accounts** (HDFC, ICICI, etc.)

```typescript
const fetchBankAccounts = async () => {
  const response = await fetch('/api/finance/bank-accounts?type=BANK');
  const result = await response.json();
  setBankAccounts(result.data || []);
};
```

**API Call:**
```
GET /api/finance/bank-accounts?type=BANK
```

**Returns:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "name": "HDFC",
      "account_number": "12345678",
      "current_balance": 5200,           // ← Shown on card
      "account_type": "BANK",
      "is_active": true,
      "currency": "INR",
      "payment_count": 105,
      "payment_methods": ["bank_transfer"]
    }
  ]
}
```

---

### 2. **UPI Accounts** (Google Pay, PhonePe, etc.)

```typescript
const fetchUpiAccounts = async () => {
  const response = await fetch('/api/finance/bank-accounts?type=UPI');
  const result = await response.json();
  setUpiAccounts(result.data || []);
};
```

**API Call:**
```
GET /api/finance/bank-accounts?type=UPI
```

---

### 3. **Cash Accounts**

```typescript
const fetchCashAccounts = async () => {
  const response = await fetch('/api/finance/bank-accounts?type=CASH');
  const result = await response.json();
  setCashAccounts(result.data || []);
};
```

**API Call:**
```
GET /api/finance/bank-accounts?type=CASH
```

---

## 🎨 Card Rendering

### **Bank Account Card Structure**

```tsx
{bankAccounts.map((account) => (
  <Card 
    className={`bg-gradient-to-r ${getBalanceColorClass(account.current_balance)}`}
    onClick={() => handleAccountClick(account, 'BANK')}
  >
    <CardContent className="p-4">
      
      {/* 1. Bank Logo */}
      <div className="bg-white/20 rounded-lg p-2">
        {getBankIcon(account.name)}  {/* HDFC/SBI logo or default */}
      </div>
      
      {/* 2. Account Name */}
      <h3 className="font-semibold text-sm truncate">
        {account.name}  {/* "HDFC" */}
      </h3>
      
      {/* 3. Masked Account Number */}
      <p className="text-white/70 text-xs">
        ****{account.account_number?.slice(-4) || '0000'}  {/* "****8081" */}
      </p>
      
      {/* 4. Balance Display */}
      <p className="text-lg font-bold">
        {getDisplayBalance(account)}  {/* "₹5,200.00" */}
      </p>
      
      {/* 5. Click Hint */}
      <div className="text-center text-white/80 text-xs">
        Click to view transactions →
      </div>
      
    </CardContent>
  </Card>
))}
```

---

## 💰 Balance Display Logic

```typescript
const getDisplayBalance = (account) => {
  // Always uses current_balance from database
  return formatCurrency(account.current_balance);
};

const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};
```

**Example:**
- Input: `5200`
- Output: `₹5,200.00`

---

## 🎨 Color Coding by Balance

```typescript
const getBalanceColorClass = (balance) => {
  if (balance < -100000) 
    return 'from-red-500 to-red-700 border-red-300';      // Deep red (large debt)
  
  if (balance < 0) 
    return 'from-red-400 to-red-600 border-red-200';      // Red (negative)
  
  if (balance < 100000) 
    return 'from-amber-400 to-amber-600 border-amber-200'; // Amber (low balance)
  
  if (balance < 500000) 
    return 'from-blue-400 to-blue-600 border-blue-200';   // Blue (medium)
  
  return 'from-green-400 to-green-600 border-green-200';  // Green (good balance)
};
```

**HDFC Example:**
- Balance: `₹5,200`
- Color: `from-amber-400 to-amber-600` (low balance < ₹1,00,000)

---

## 🖼️ Bank Logo Logic

```typescript
const getBankIcon = (bankName) => {
  const name = bankName.toUpperCase();
  
  if (name.includes('HDFC')) {
    return <Image src="/assets/bank-logos/hdfc.svg" />
  } 
  else if (name.includes('SBI') || name.includes('STATE BANK')) {
    return <Image src="/assets/bank-logos/sbi.svg" />
  } 
  else if (name.includes('ICICI')) {
    return <Image src="/assets/bank-logos/icici.svg" />
  }
  else {
    return <Image src="/assets/bank-logos/default.svg" />  // Generic bank icon
  }
};
```

---

## 🖱️ Card Click Action

```typescript
const handleAccountClick = (account, accountType) => {
  // Navigate to transaction details page
  if (accountType === 'BANK') {
    router.push(`/finance/transactions/bank/${account.id}`);
  }
  else if (accountType === 'UPI') {
    router.push(`/finance/transactions/bank/${account.id}`);
  }
  else if (accountType === 'CASH') {
    router.push(`/finance/transactions/cash/${account.id}`);
  }
};
```

**Example Navigation:**
- Click HDFC card → `/finance/transactions/bank/uuid-123`

---

## 📊 Data Source: API Endpoint

### **File:** `src/app/api/finance/bank-accounts/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const accountType = searchParams.get('type'); // BANK/UPI/CASH
  
  // 1. Fetch from bank_accounts table
  let query = supabase
    .from("bank_accounts")
    .select("id, name, account_number, current_balance, account_type, is_active")
    .eq("is_active", true);
  
  if (accountType) {
    query = query.eq("account_type", accountType);  // Filter by type
  }
  
  const { data } = await query.order("name", { ascending: true });
  
  // 2. Enhance with payment statistics
  const enhancedData = await Promise.all(
    data.map(async (account) => {
      // Get payment count from payments table
      const { data: payments } = await supabase
        .from("payments")
        .select("method")
        .eq("bank_account_id", account.id);
      
      return {
        ...account,
        payment_count: payments?.length || 0,
        payment_methods: [...new Set(payments.map(p => p.method))],
        currency: 'INR'
      };
    })
  );
  
  return NextResponse.json({ success: true, data: enhancedData });
}
```

---

## 🗄️ Database Tables

### **Primary:** `bank_accounts`
```sql
SELECT 
  id,
  name,                   -- "HDFC"
  account_number,         -- "12345678"
  current_balance,        -- 5200 ← Main source for card display
  account_type,           -- "BANK"/"UPI"/"CASH"
  is_active,              -- true
  currency                -- "INR"
FROM bank_accounts
WHERE is_active = true
  AND account_type = 'BANK'
ORDER BY name ASC;
```

### **Enhancement:** `payments`
```sql
SELECT 
  method,
  COUNT(*) as payment_count
FROM payments
WHERE bank_account_id = 'uuid-123'
GROUP BY method;
```

---

## 📈 Summary Cards (Top Section)

```typescript
// Total Balance Card
const getTotalBalance = () => {
  const bankTotal = bankAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);
  const upiTotal = upiAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);
  const cashTotal = cashAccounts.reduce((sum, acc) => sum + acc.current_balance, 0);
  return bankTotal + upiTotal + cashTotal;
};

// Active Accounts Card
const activeCount = bankAccounts.length + upiAccounts.length;

// Payment Methods Card
const getTotalPaymentMethods = () => {
  const allMethods = new Set();
  bankAccounts.forEach(acc => {
    acc.payment_methods?.forEach(m => allMethods.add(m));
  });
  return allMethods.size;
};
```

---

## ⚡ Real-time Updates

Cards refresh after:
1. ✅ Adding new account
2. ✅ Fund transfer
3. ✅ Cash deposit
4. ❌ Manual browser refresh needed for external changes

```typescript
// After successful operation:
fetchBankAccounts();
fetchUpiAccounts();
fetchCashAccounts();
```

---

## 🎯 Key Points

1. **Each card shows `current_balance`** from `bank_accounts` table
2. **Three separate API calls** for BANK/UPI/CASH accounts
3. **Color-coded** based on balance amount
4. **Click navigates** to detailed transaction page
5. **Logo detection** based on bank name pattern matching
6. **Payment stats** fetched from `payments` table for enhancement

---

## 🔍 Why HDFC Shows Old Transactions

The **card balance is correct** (₹5,200 from `bank_accounts.current_balance`).

BUT when you **click the card**, it navigates to the transaction detail page which fetches from:
- ✅ `bank_transactions` (cleaned)
- ❌ `payments` (still has old data) ← **This is the problem!**
- ❌ `vendor_payment_history` (still has old data)
- ❌ `withdrawals` (still has old data)
- ❌ `liability_payments` (still has old data)

**Solution:** Clean old data from ALL transaction tables, not just `bank_transactions`.
