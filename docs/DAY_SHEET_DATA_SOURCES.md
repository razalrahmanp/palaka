# Day Sheet Report - Complete Data Source Documentation

## 📊 Overview
The Day Sheet Report displays ALL daily cash transactions from **9 primary database tables**, organized into 3 main UI sections. We do NOT use `cash_transactions` or `bank_transactions` tables to avoid duplicates, as all transactions are already captured from their source tables with proper payment methods.

---

## 🎯 UI Section 1: Summary Cards (Top)

### Card 1: Total Receipts (Green Card)
**Displays:** Total cash inflows for the day  
**Data Sources:**
1. **`payments`** table - Customer payments for invoices
2. **`loan_opening_balances`** table - Loan disbursements received
3. **`investments`** table - Capital contributions from partners

**Calculation:**
```typescript
totalReceipts = SUM(all debit amounts from above tables)
```

---

### Card 2: Total Payments (Red Card)
**Displays:** Total cash outflows for the day  
**Data Sources:**
1. **`vendor_payment_history`** table - Payments to suppliers
2. **`expenses`** table - Operating and capital expenses
3. **`payroll_records`** table - Employee salaries
4. **`liability_payments`** table - Loan repayments
5. **`withdrawals`** table - Partner/owner withdrawals
6. **`invoice_refunds`** table - Customer refunds

**Calculation:**
```typescript
totalPayments = SUM(all credit amounts from above tables)
```

---

### Card 3: Net Cash Flow (Blue/Orange Card)
**Displays:** Net change in cash for the day  
**Data Sources:** Derived from Cards 1 & 2

**Calculation:**
```typescript
netCashFlow = totalReceipts - totalPayments
```

**Color Logic:**
- Blue (Surplus): `netCashFlow >= 0`
- Orange (Deficit): `netCashFlow < 0`

---

## 📈 UI Section 2: Category Breakdown (3 Cards)

### Card 1: Operating Activities
**Displays:** Day-to-day business operations  
**Data Sources:**

**Receipts (Debits):**
- **`payments`** table - Sales receipts

**Payments (Credits):**
- **`vendor_payment_history`** table - Supplier payments
- **`expenses`** table - Where `category != 'CAPEX'` (operating expenses)
- **`payroll_records`** table - Salaries

**Calculation:**
```typescript
operating.receipts = SUM(debits where category = 'Operating')
operating.payments = SUM(credits where category = 'Operating')
operating.net = operating.receipts - operating.payments
```

---

### Card 2: Investing Activities
**Displays:** Asset purchases and sales  
**Data Sources:**

**Receipts (Debits):**
- **`asset_disposals`** table - Money from selling assets (future feature)

**Payments (Credits):**
- **`expenses`** table - Where `category = 'CAPEX'` (capital expenditures)

**Calculation:**
```typescript
investing.receipts = SUM(debits where category = 'Investing')
investing.payments = SUM(credits where category = 'Investing')
investing.net = investing.receipts - investing.payments
```

---

### Card 3: Financing Activities
**Displays:** Funding-related transactions  
**Data Sources:**

**Receipts (Debits):**
- **`loan_opening_balances`** table - Loan disbursements
- **`investments`** table - Capital contributions

**Payments (Credits):**
- **`liability_payments`** table - Loan repayments
- **`withdrawals`** table - Partner withdrawals
- **`invoice_refunds`** table - Customer refunds

**Calculation:**
```typescript
financing.receipts = SUM(debits where category = 'Financing')
financing.payments = SUM(credits where category = 'Financing')
financing.net = financing.receipts - financing.payments
```

---

## 📋 UI Section 3: Transaction Table (Main Detail)

### Table Structure
**Columns:** Date | Type | Description | Category | Method | Debit (₹) | Credit (₹) | Balance (₹)

### Data Sources (9 Tables)

#### Row Type 1: Sales Payment
**Table:** `payments`  
**Columns Used:**
- `id` - Unique identifier
- `payment_date` - Transaction date/time
- `amount` - Payment amount (DEBIT)
- `description` - Payment notes
- `reference` - Payment reference
- `method` - Payment method (cash/bank/card/upi)
- `invoice_id` - Link to invoice

**Joins:**
- `invoices` table → Get `customer_name`

**Display:**
- **Type:** "Sales Payment"
- **Category:** "Operating"
- **Debit:** `amount`
- **Credit:** 0

---

#### Row Type 2: Vendor Payment
**Table:** `vendor_payment_history`  
**Columns Used:**
- `id` - Unique identifier
- `payment_date` - Transaction date/time
- `amount` - Payment amount (CREDIT)
- `description` - Payment notes
- `reference_number` - Payment reference
- `payment_method` - Payment method
- `supplier_id` - Link to supplier

**Joins:**
- `suppliers` table → Get supplier `name`

**Display:**
- **Type:** "Vendor Payment"
- **Category:** "Operating"
- **Debit:** 0
- **Credit:** `amount`

---

#### Row Type 3: Expense
**Table:** `expenses`  
**Columns Used:**
- `id` - Unique identifier
- `date` - Expense date
- `amount` - Expense amount (CREDIT)
- `description` - Expense description
- `category` - Expense category (OPEX/CAPEX)
- `payment_method` - Payment method
- `receipt_number` - Receipt reference
- `entity_type` - Business entity

**Display:**
- **Type:** "Asset Purchase" (if CAPEX) OR "{category} Expense"
- **Category:** "Investing" (if CAPEX) OR "Operating"
- **Debit:** 0
- **Credit:** `amount`

---

#### Row Type 4: Salary Payment
**Table:** `payroll_records`  
**Columns Used:**
- `id` - Unique identifier
- `payment_date` - Salary payment date
- `net_pay` - Net salary amount (CREDIT)
- `reference_number` - Payment reference
- `payment_method` - Payment method
- `employee_id` - Link to employee

**Joins:**
- `employees` table → Get employee `name`

**Display:**
- **Type:** "Salary Payment"
- **Category:** "Operating"
- **Debit:** 0
- **Credit:** `net_pay`

---

#### Row Type 5: Loan Disbursement
**Table:** `loan_opening_balances`  
**Columns Used:**
- `id` - Unique identifier
- `disbursement_date` - Loan received date
- `original_amount` - Loan amount (DEBIT)
- `description` - Loan description
- `reference_number` - Loan reference
- `payment_method` - Disbursement method
- `lender_name` - Lender name

**Display:**
- **Type:** "Loan Disbursement"
- **Category:** "Financing"
- **Debit:** `original_amount`
- **Credit:** 0

---

#### Row Type 6: Loan Repayment
**Table:** `liability_payments`  
**Columns Used:**
- `id` - Unique identifier
- `payment_date` - Repayment date
- `payment_amount` - Payment amount (CREDIT)
- `description` - Payment description
- `reference_number` - Payment reference
- `payment_method` - Payment method

**Display:**
- **Type:** "Loan Payment"
- **Category:** "Financing"
- **Debit:** 0
- **Credit:** `payment_amount`

---

#### Row Type 7: Investment/Capital Contribution
**Table:** `investments`  
**Columns Used:**
- `id` - Unique identifier
- `investment_date` - Investment date
- `amount` - Investment amount (DEBIT)
- `description` - Investment description
- `reference_number` - Investment reference
- `payment_method` - Payment method
- `investor_name` - Investor name

**Display:**
- **Type:** "Investment/Capital"
- **Category:** "Financing"
- **Debit:** `amount`
- **Credit:** 0

---

#### Row Type 8: Partner Withdrawal
**Table:** `withdrawals`  
**Columns Used:**
- `id` - Unique identifier
- `withdrawal_date` - Withdrawal date
- `amount` - Withdrawal amount (CREDIT)
- `description` - Withdrawal description
- `reference_number` - Withdrawal reference
- `payment_method` - Payment method

**Display:**
- **Type:** "Partner Withdrawal"
- **Category:** "Financing"
- **Debit:** 0
- **Credit:** `amount`

---

#### Row Type 9: Customer Refund
**Table:** `invoice_refunds`  
**Columns Used:**
- `id` - Unique identifier
- `refund_date` - Refund date
- `refund_amount` - Refund amount (CREDIT)
- `customer_name` - Customer name
- `refund_method` - Refund method
- `status` - Refund status

**Display:**
- **Type:** "Customer Refund"
- **Category:** "Financing"
- **Debit:** 0
- **Credit:** `refund_amount`

---

## 🔄 Running Balance Calculation

**Source:** All 9 tables combined  
**Logic:**
```typescript
let runningBalance = 0;

For each transaction (sorted by timestamp):
  runningBalance += (transaction.debit - transaction.credit);
  transaction.balance = runningBalance;
```

**Display:** Shows cumulative cash position throughout the day

---

## 🎨 UI Filters

### Category Filter Dropdown
**Values:**
- "All Categories" (no filter)
- "Operating"
- "Investing"
- "Financing"

**Effect:** Filters transaction table rows by `category` field

---

### Payment Method Filter Dropdown
**Values:**
- "All Methods" (no filter)
- "Cash"
- "Bank"
- "Bank Transfer"
- "Card"
- "UPI"

**Effect:** Filters transaction table rows by `paymentMethod` field

---

## 📊 Transaction Count Badge

**Display:** "{filtered count} Transactions"  
**Source:** Count of rows after filters applied  
**Updates:** Real-time as filters change

---

## 🔍 Data Flow Summary

```
DATABASE (9 Primary Tables)
    ↓
API Endpoint (/api/finance/day-sheet?date=YYYY-MM-DD)
    ↓
Fetch all transactions for selected date
    ↓
Transform to unified format (DaySheetTransaction[])
    ↓
Sort by timestamp (chronological order)
    ↓
Calculate running balance
    ↓
Aggregate by category (Operating/Investing/Financing)
    ↓
Aggregate by payment method
    ↓
Return JSON Response
    ↓
FRONTEND (Day Sheet Page)
    ↓
Display in 3 UI Sections:
    1. Summary Cards
    2. Category Breakdown
    3. Transaction Table
```

---

## 📝 Empty State

**When:** No transactions for selected date  
**Display:**
- Summary cards show ₹0
- Category cards show ₹0
- Transaction table shows:
  ```
  📅 No transactions for this date
  Select a different date to view transactions
  ```

**Verification:** Current behavior on October 17, 2025 ✅

---

## ⚡ Performance Considerations

### Query Optimization
- Each table query filters by date first: `WHERE date = 'YYYY-MM-DD'`
- Indexes recommended on date columns:
  - `payments.payment_date`
  - `vendor_payment_history.payment_date`
  - `expenses.date`
  - `payroll_records.payment_date`
  - `liability_payments.payment_date`
  - `withdrawals.withdrawal_date`
  - `invoice_refunds.refund_date`
  - `loan_opening_balances.disbursement_date`
  - `investments.investment_date`

### No Deduplication Needed
- ✅ All transactions come from primary source tables
- ✅ No `cash_transactions` or `bank_transactions` used
- ✅ Payment methods stored directly in source tables
- ✅ No risk of double-counting

---

## 🎯 Use Cases

### 1. Daily Reconciliation
**Tables Used:** All 9  
**Purpose:** Verify all cash movements match bank statements

### 2. Cash Flow Monitoring
**Tables Used:** All 9  
**Purpose:** Track daily cash position and identify shortfalls

### 3. Audit Trail
**Tables Used:** All 9  
**Purpose:** Complete transaction history with timestamps and references

### 4. Department Analysis
**Tables Used:** Filtered by category
- **Operating:** payments, vendor_payment_history, expenses (OPEX), payroll_records
- **Investing:** expenses (CAPEX only)
- **Financing:** loan_opening_balances, liability_payments, investments, withdrawals, invoice_refunds

### 5. Payment Method Analysis
**Tables Used:** All 9 (grouped by payment_method)  
**Purpose:** Track cash vs bank vs card vs UPI usage

---

## 📌 Key Points

1. **Comprehensive Coverage**: ALL 9 primary transaction types included
2. **No Gaps**: Every cash movement is captured from source tables
3. **No Duplicates**: Removed cash_transactions and bank_transactions to prevent double-counting
4. **Real-time Balance**: Running balance updates throughout the day
5. **Categorized**: Clear Operating/Investing/Financing classification
6. **Flexible**: Filter by category, payment method, or view all
7. **Accurate**: Direct table queries ensure data integrity
8. **Payment Methods**: Already stored in source tables (cash, bank, card, UPI, cheque, bank_transfer)

---

## 🚀 Future Enhancements

### Potential Additional Data Sources
1. **`asset_disposals`** - Asset sales (when implemented)
2. **`tax_payments`** - Tax remittances (if separate from expenses)
3. **`inter_company_transfers`** - Multi-entity cash movements

### Potential UI Additions
1. **Opening Balance Card** - Previous day's closing balance
2. **Largest Transaction Card** - Highlight biggest debit/credit
3. **Transaction Density Chart** - Visualize transaction timing
4. **Payment Method Pie Chart** - Visual breakdown of methods used
5. **Export to PDF/Excel** - With company header and formatting

---

**Last Updated:** October 17, 2025  
**Status:** ✅ Production Ready  
**Coverage:** 100% of cash transactions from 9 primary tables  
**Accuracy:** ✅ Verified - No duplicates, all payment methods preserved
