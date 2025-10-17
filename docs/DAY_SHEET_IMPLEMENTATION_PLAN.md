# Day Sheet Implementation Plan

## 📋 Overview
The Day Sheet should be a comprehensive **daily transaction summary** showing ALL cash inflows and outflows for a selected date. This is a critical financial control report used for:
- Daily reconciliation
- Cash management
- Audit trail
- End-of-day closing
- Financial oversight

## 🎯 What Should Be Included

### ✅ ALL Transaction Types to Include

#### 1. **CASH INFLOWS (Receipts/Deposits)** 💰

| Source | Table | Amount Column | Description |
|--------|-------|---------------|-------------|
| **Sales Payments** | `payments` | `amount` | Customer payments for invoices |
| **Refund Reversals** | `invoice_refunds` (reversed) | `refund_amount` | Cancelled refunds (rare) |
| **Loan Disbursements** | `loan_opening_balances` | `original_amount` | Money received from loans |
| **Investor Contributions** | `investments` | `amount` | Capital invested by partners |
| **Asset Sales** | `asset_disposals` | `payment_received` | Money from selling assets |
| **Bank Deposits** | `bank_transactions` (type='deposit') | `amount` | Bank deposits |
| **Cash Deposits** | `cash_transactions` (type='CREDIT') | `amount` | Cash account deposits |

#### 2. **CASH OUTFLOWS (Payments/Withdrawals)** 💸

| Source | Table | Amount Column | Description |
|--------|-------|---------------|-------------|
| **Vendor Payments** | `vendor_payment_history` | `amount` | Payments to suppliers |
| **Expenses** | `expenses` | `amount` | Operating expenses (rent, utilities, etc.) |
| **Salary Payments** | `payroll_records` | `net_pay` | Employee salaries |
| **Loan Repayments** | `liability_payments` | `payment_amount` | Loan principal + interest payments |
| **Partner Withdrawals** | `withdrawals` | `amount` | Owner/partner withdrawals |
| **Customer Refunds** | `invoice_refunds` | `refund_amount` | Money refunded to customers |
| **Bank Withdrawals** | `bank_transactions` (type='withdrawal') | `amount` | Bank withdrawals |
| **Cash Withdrawals** | `cash_transactions` (type='DEBIT') | `amount` | Cash account withdrawals |
| **Asset Purchases** | `expenses` (category='CAPEX') | `amount` | Capital expenditures |

### 📊 Transaction Categories

Each transaction should be categorized:

1. **Operating Activities**
   - Sales Receipts
   - Vendor Payments
   - Expenses
   - Salary Payments

2. **Investing Activities**
   - Asset Purchases
   - Asset Sales

3. **Financing Activities**
   - Loan Disbursements
   - Loan Repayments
   - Investor Contributions
   - Partner Withdrawals
   - Customer Refunds

## 🗃️ Database Structure

### Tables to Query

```sql
-- 1. Sales Payments (INFLOW)
SELECT 
  'sales_payment' as source,
  'Operating' as category,
  payment_date as date,
  amount,
  'Sales Payment' as type,
  description,
  reference,
  method as payment_method
FROM payments
WHERE DATE(payment_date) = '2025-10-17'

UNION ALL

-- 2. Vendor Payments (OUTFLOW)
SELECT 
  'vendor_payment' as source,
  'Operating' as category,
  payment_date as date,
  amount,
  'Vendor Payment' as type,
  description,
  reference_number as reference,
  payment_method
FROM vendor_payment_history
WHERE DATE(payment_date) = '2025-10-17'

UNION ALL

-- 3. Expenses (OUTFLOW)
SELECT 
  'expense' as source,
  CASE WHEN category = 'CAPEX' THEN 'Investing' ELSE 'Operating' END as category,
  date,
  amount,
  category || ' Expense' as type,
  description,
  receipt_number as reference,
  payment_method
FROM expenses
WHERE DATE(date) = '2025-10-17'

UNION ALL

-- 4. Payroll (OUTFLOW)
SELECT 
  'payroll' as source,
  'Operating' as category,
  payment_date as date,
  net_pay as amount,
  'Salary Payment' as type,
  'Salary for ' || employee_name as description,
  reference_number as reference,
  payment_method
FROM payroll_records
WHERE DATE(payment_date) = '2025-10-17'

UNION ALL

-- 5. Loan Disbursements (INFLOW)
SELECT 
  'loan_disbursement' as source,
  'Financing' as category,
  disbursement_date as date,
  original_amount as amount,
  'Loan Disbursement' as type,
  description,
  reference_number as reference,
  payment_method
FROM loan_opening_balances
WHERE DATE(disbursement_date) = '2025-10-17'

UNION ALL

-- 6. Loan Repayments (OUTFLOW)
SELECT 
  'loan_repayment' as source,
  'Financing' as category,
  payment_date as date,
  payment_amount as amount,
  'Loan Payment' as type,
  description,
  reference_number as reference,
  payment_method
FROM liability_payments
WHERE DATE(payment_date) = '2025-10-17'

UNION ALL

-- 7. Investments (INFLOW)
SELECT 
  'investment' as source,
  'Financing' as category,
  investment_date as date,
  amount,
  'Investment/Capital' as type,
  description || ' - ' || investor_name as description,
  reference_number as reference,
  payment_method
FROM investments
WHERE DATE(investment_date) = '2025-10-17'

UNION ALL

-- 8. Withdrawals (OUTFLOW)
SELECT 
  'withdrawal' as source,
  'Financing' as category,
  withdrawal_date as date,
  amount,
  'Partner Withdrawal' as type,
  description,
  reference_number as reference,
  payment_method
FROM withdrawals
WHERE DATE(withdrawal_date) = '2025-10-17'

UNION ALL

-- 9. Customer Refunds (OUTFLOW)
SELECT 
  'refund' as source,
  'Financing' as category,
  refund_date as date,
  refund_amount as amount,
  'Customer Refund' as type,
  'Refund to ' || customer_name as description,
  id::text as reference,
  refund_method as payment_method
FROM invoice_refunds
WHERE DATE(refund_date) = '2025-10-17'

UNION ALL

-- 10. Bank Transactions (MIXED)
SELECT 
  'bank_transaction' as source,
  'Operating' as category,
  date,
  amount,
  CASE 
    WHEN type = 'deposit' THEN 'Bank Deposit'
    ELSE 'Bank Withdrawal'
  END as type,
  description,
  reference,
  'bank' as payment_method
FROM bank_transactions
WHERE DATE(date) = '2025-10-17'
  AND source_type IS NULL  -- Only manual/unlinked transactions

UNION ALL

-- 11. Cash Transactions (MIXED)
SELECT 
  'cash_transaction' as source,
  'Operating' as category,
  transaction_date as date,
  amount,
  CASE 
    WHEN transaction_type = 'CREDIT' THEN 'Cash Receipt'
    ELSE 'Cash Payment'
  END as type,
  description,
  reference_number as reference,
  'cash' as payment_method
FROM cash_transactions
WHERE DATE(transaction_date) = '2025-10-17'
  AND is_deleted = false
  AND source_type NOT IN ('expense', 'sales_payment', 'refund')  -- Avoid duplicates

ORDER BY date, type;
```

## 📈 Expected UI Layout

### Summary Cards (Top)
```
┌──────────────────┬──────────────────┬──────────────────┐
│ Total Receipts   │ Total Payments   │ Net Cash Flow    │
│ ₹1,25,000        │ ₹87,500          │ ₹37,500          │
│ 📊 Cash In       │ 📊 Cash Out      │ 📊 Surplus       │
└──────────────────┴──────────────────┴──────────────────┘
```

### Detailed Transaction Table
```
Time     Type              Description                    Category    Debit      Credit     Balance
09:15    Sales Payment     INV-001 - Customer A          Operating              ₹50,000    ₹50,000
10:30    Vendor Payment    Supplier B - Materials        Operating   ₹30,000               ₹20,000
11:45    Expense          Electricity Bill               Operating   ₹5,000                ₹15,000
14:20    Salary Payment    Employee C - Monthly          Operating   ₹25,000              -₹10,000
15:00    Investment       Partner Investment             Financing              ₹75,000    ₹65,000
16:30    Withdrawal       Owner Draw                     Financing   ₹27,500               ₹37,500
```

### Category Breakdown (Bottom)
```
Operating Activities:    ₹15,000 net (₹50,000 in - ₹60,000 out)
Investing Activities:    ₹0 net
Financing Activities:    ₹47,500 net (₹75,000 in - ₹27,500 out)
```

## 🎨 UI Enhancements Needed

### 1. **Running Balance Column**
- Show cumulative cash position throughout the day
- Helps identify cash flow issues during the day

### 2. **Category Grouping**
- Group transactions by category (Operating/Investing/Financing)
- Collapsible sections for better organization

### 3. **Payment Method Filter**
- Filter by: All, Cash, Bank, Card, UPI, Cheque
- Show payment method icons

### 4. **Transaction Type Icons**
```typescript
const icons = {
  'Sales Payment': <TrendingUp className="text-green-600" />,
  'Vendor Payment': <TrendingDown className="text-red-600" />,
  'Expense': <Receipt className="text-orange-600" />,
  'Salary Payment': <Users className="text-blue-600" />,
  'Loan Disbursement': <Banknote className="text-green-600" />,
  'Loan Payment': <CreditCard className="text-red-600" />,
  'Investment': <TrendingUp className="text-purple-600" />,
  'Withdrawal': <TrendingDown className="text-purple-600" />,
  'Refund': <RotateCcw className="text-amber-600" />,
};
```

### 5. **Export Options**
- PDF export with company header
- Excel export with formulas
- Print-friendly layout

### 6. **Quick Stats**
```
Total Transactions: 47
Cash Transactions: 12 (₹35,000)
Bank Transactions: 35 (₹1,77,500)
Largest Transaction: ₹75,000 (Investment)
Smallest Transaction: ₹500 (Office Supplies)
```

## 🔧 Implementation Steps

### Step 1: Create API Endpoint
**File**: `src/app/api/finance/day-sheet/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  
  // Fetch all transaction types for the date
  const transactions = await fetchAllDailyTransactions(date);
  
  // Calculate running balance
  const withBalance = calculateRunningBalance(transactions);
  
  // Calculate summary
  const summary = {
    totalReceipts: sum of all debits,
    totalPayments: sum of all credits,
    netCashFlow: totalReceipts - totalPayments,
    transactionCount: transactions.length,
    byCategoryy: group by category,
    byPaymentMethod: group by payment_method
  };
  
  return NextResponse.json({ transactions: withBalance, summary });
}
```

### Step 2: Update Frontend
**File**: `src/app/(erp)/reports/day-sheet/page.tsx`

- Remove placeholder note
- Add category grouping
- Add payment method filter
- Add export functionality
- Add running balance calculation

### Step 3: Add Drill-Down
- Click transaction → View details
- Link to source document (invoice, bill, etc.)
- Show journal entry if exists

## 🚨 Important Considerations

### 1. **Avoid Duplicates**
Some transactions may exist in multiple tables:
- An expense paid via bank will be in BOTH `expenses` and `bank_transactions`
- A sales payment will be in BOTH `payments` and `bank_transactions`

**Solution**: Use `source_type` and `source_id` to identify and exclude duplicates

### 2. **Deleted Transactions**
- Filter out `is_deleted = true` or `deleted_at IS NOT NULL`
- Show deleted transactions separately (optional)

### 3. **Cash vs Accrual**
- Day Sheet shows **CASH** transactions only (when money moved)
- Different from P&L which uses accrual basis

### 4. **Multi-Currency**
- Convert all to base currency (INR)
- Show original currency in description

### 5. **Opening/Closing Balance**
- Show opening balance at start of day
- Show closing balance at end of day
- Calculate from previous day's closing

## 📊 Sample Data Structure

```typescript
interface DaySheetTransaction {
  id: string;
  time: string;  // HH:mm format
  source: 'sales_payment' | 'vendor_payment' | 'expense' | 'payroll' | etc.
  type: string;  // Display name
  description: string;
  category: 'Operating' | 'Investing' | 'Financing';
  paymentMethod: 'cash' | 'bank' | 'card' | 'upi' | 'cheque';
  debit: number;   // Money IN
  credit: number;  // Money OUT
  balance: number; // Running balance
  reference: string;
  sourceId: string; // For drill-down
}

interface DaySheetSummary {
  date: string;
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  netCashFlow: number;
  transactionCount: number;
  byCategory: {
    operating: { receipts: number; payments: number; net: number };
    investing: { receipts: number; payments: number; net: number };
    financing: { receipts: number; payments: number; net: number };
  };
  byPaymentMethod: {
    cash: number;
    bank: number;
    card: number;
    upi: number;
    cheque: number;
  };
}
```

## ✅ Benefits

1. **Complete Daily Picture**: See ALL money movement
2. **Cash Control**: Monitor daily cash position
3. **Audit Trail**: Complete transaction history
4. **Reconciliation**: Match with bank statements
5. **Decision Making**: Know daily cash availability
6. **Compliance**: Meet audit requirements
7. **Fraud Detection**: Spot unusual transactions

## 🎯 Success Criteria

- ✅ Shows ALL transaction types for the date
- ✅ No duplicate transactions
- ✅ Correct categorization
- ✅ Running balance accurate
- ✅ Summary totals match details
- ✅ Fast loading (<2 seconds)
- ✅ Export works correctly
- ✅ Drill-down to source documents

---

**Ready to implement?** This will give you a comprehensive Day Sheet that shows the complete daily financial picture!
