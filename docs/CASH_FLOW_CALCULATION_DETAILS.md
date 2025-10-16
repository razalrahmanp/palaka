# Cash Flow Statement - Calculation Details Feature

## ✅ Feature Implemented

Added **Info Icons (ℹ️)** to each Cash Flow Statement section that display:
1. **Calculation formulas**
2. **Database tables used**
3. **Field names and date filters**
4. **Current values**
5. **Detailed explanations**

---

## 🎯 How It Works

### Visual Indicator

Each section header now has an **Info button** (ℹ️ icon) on the right side:

```
┌─────────────────────────────────────────────┐
│ OPERATING ACTIVITIES              [ℹ️]      │
├─────────────────────────────────────────────┤
│ Code  Account Name         Amount           │
│ OP-001 Cash received...    ₹52,91,809      │
│ ...                                         │
└─────────────────────────────────────────────┘
```

### Click to View Details

When you click the ℹ️ icon, a **detailed dialog** opens showing:

---

## 📊 Dialog Content Structure

### 1. **Operating Activities**

**Formula:**
```
Net Operating Cash Flow = Cash from Customers - Cash to Suppliers - Operating Expenses - Employee Salaries
```

**Data Sources:**

| Line Item | Database Table | Date Field | Calculation |
|-----------|----------------|------------|-------------|
| Cash received from customers | `payments` | `date` | SUM of all customer payments |
| Cash paid to suppliers | `vendor_payment_history` | `payment_date` | SUM of all vendor payments |
| Cash paid for operating expenses | `expenses` | `date` | SUM (excluding Manufacturing, Salaries, Capital Expenditure) |
| Cash paid to employees | `payroll_records` | `processed_at` | SUM of net_salary |

**Current Values:**
- Shows actual amounts from the report
- Color-coded (green for inflows, red for outflows)

---

### 2. **Investing Activities**

**Formula:**
```
Net Investing Cash Flow = Cash from Asset Sales - Cash Paid for Asset Purchases
```

**Data Sources:**

| Line Item | Database Table | Date Field | Calculation |
|-----------|----------------|------------|-------------|
| Cash from sale of assets | `asset_disposals` | `disposal_date` | SUM of sale_price WHERE disposal_type = 'sale' |
| Cash paid for purchase of assets | `expenses` | `date` | SUM WHERE category IN (Capital Expenditure, Asset Purchase, Equipment Purchase, Vehicle Purchase, Property Purchase, Building Purchase, Machinery Purchase, Furniture Purchase, Computer Equipment Purchase, Software Purchase, Asset Improvement, Asset Installation) |

**Current Values:**
- Currently ₹0 (no asset transactions in period)

---

### 3. **Financing Activities**

**Formula:**
```
Net Financing Cash Flow = Cash from Loans + Cash from Investors - Loan Repayments - Dividends/Withdrawals
```

**Data Sources:**

| Line Item | Database Table | Date Field | Calculation |
|-----------|----------------|------------|-------------|
| Cash received from loans | `loan_opening_balances` | `loan_start_date` | SUM of original_loan_amount |
| Cash received from investors | `investments` | `investment_date` | SUM of amount |
| Cash paid for loan repayments | `liability_payments` | `date` | SUM of total_amount |
| Cash paid as dividends/withdrawals | `withdrawals` | `withdrawal_date` | SUM of amount |

**Current Values:**
- Shows actual loan, investment, and withdrawal amounts

---

## 🎨 UI Design

### Color Scheme

```
Operating Activities:   Green   (bg-green-600)
Investing Activities:   Blue    (bg-blue-600)
Financing Activities:   Orange  (bg-orange-600)
```

### Dialog Layout

1. **Header Section**
   - Title: "{Section} Calculation"
   - Description: Purpose of the section

2. **Formula Box** (Blue background)
   - Mathematical formula
   - Monospace font for clarity

3. **Current Values** (Gray background)
   - Account codes and names
   - Actual amounts from report
   - Color-coded positive/negative

4. **Data Sources Table**
   - Database table names (blue code blocks)
   - Field names (purple code blocks)
   - Calculation descriptions
   - Notes explaining each item

5. **Important Notes** (Amber background)
   - Date range information
   - Calculation methodology
   - Sign conventions (positive/negative)

---

## 📝 User Experience

### Step-by-Step Usage

1. **Navigate to Cash Flow Statement**
   - Go to Finance → Reports → Cash Flow Statement

2. **Select a Section**
   - Look for the ℹ️ icon on the right side of any section header
   - Available on: Operating, Investing, and Financing sections

3. **Click the Info Icon**
   - Dialog opens immediately
   - Scroll to view all details

4. **Review Information**
   - **Formula**: Understand how the total is calculated
   - **Current Values**: See your actual numbers
   - **Data Sources**: Know which tables are queried
   - **Calculation**: Understand the exact logic

5. **Close Dialog**
   - Click outside the dialog or the X button
   - Returns to Cash Flow Statement

---

## 🔍 Example Dialog Content

### Operating Activities Dialog

```
┌──────────────────────────────────────────────────────┐
│ Operating Activities Calculation                     │
│ Cash flows from day-to-day business operations      │
├──────────────────────────────────────────────────────┤
│ Formula:                                             │
│ Net Operating Cash Flow = Cash from Customers -      │
│ Cash to Suppliers - Operating Expenses -             │
│ Employee Salaries                                    │
├──────────────────────────────────────────────────────┤
│ Current Values:                                      │
│ OP-001 Cash received from customers    ₹52,91,809   │
│ OP-002 Cash paid to suppliers         -₹44,42,733   │
│ OP-003 Cash paid for expenses        -₹1,00,77,039  │
│ OP-004 Cash paid to employees          -₹9,52,352   │
├──────────────────────────────────────────────────────┤
│ Data Sources & Calculations:                         │
│                                                      │
│ Cash received from customers                         │
│ → Table: payments                                    │
│ → Date Field: date                                   │
│ → Calculation: SUM of all customer payments          │
│ → Notes: Customer payments via all methods           │
│                                                      │
│ Cash paid to suppliers                               │
│ → Table: vendor_payment_history                     │
│ → Date Field: payment_date                           │
│ → Calculation: SUM of all vendor payments            │
│ → Notes: Payments to suppliers for goods/services   │
│                                                      │
│ ... (continues for all line items)                  │
├──────────────────────────────────────────────────────┤
│ ⓘ Important Notes:                                  │
│ • Date range: 01 Jan 2025 - 16 Oct 2025            │
│ • Database SUM aggregation                          │
│ • Negative = outflows, Positive = inflows           │
└──────────────────────────────────────────────────────┘
```

---

## 🗂️ Database Tables Reference

### Complete List of Tables Used

1. **Operating Activities:**
   - `payments` - Customer payments
   - `vendor_payment_history` - Supplier payments
   - `expenses` - Operating expenses
   - `payroll_records` - Employee salaries

2. **Investing Activities:**
   - `asset_disposals` - Asset sales
   - `expenses` - Capital expenditure

3. **Financing Activities:**
   - `loan_opening_balances` - Loan disbursements
   - `liability_payments` - Loan repayments
   - `investments` - Investor contributions
   - `withdrawals` - Partner withdrawals/dividends

---

## 💡 Benefits

### For Users

✅ **Transparency**: Know exactly how numbers are calculated
✅ **Verification**: Can trace back to source tables
✅ **Learning**: Understand accounting logic
✅ **Audit Trail**: Clear documentation of data sources
✅ **Troubleshooting**: Identify discrepancies quickly

### For Auditors

✅ **Documentation**: Built-in calculation notes
✅ **Traceability**: Direct table and field references
✅ **Validation**: Can verify calculations independently
✅ **Compliance**: Clear audit trail

---

## 🛠️ Technical Implementation

### Files Modified

**File:** `src/components/finance/reports/CashFlowReport.tsx`

**Changes:**
1. Added `Info` icon import from lucide-react
2. Added `Dialog` components from shadcn/ui
3. Added state management for dialog visibility
4. Created `getCalculationDetails()` helper function
5. Added Info buttons to section headers
6. Implemented detailed calculation dialog

**Lines Added:** ~150 lines
**Components Used:** Dialog, Button, Info icon

---

## 🎯 Testing Checklist

### Manual Testing Steps

1. ✅ Open Cash Flow Statement
2. ✅ Verify Info icons visible on all three sections
3. ✅ Click Operating Activities info icon
4. ✅ Verify dialog opens with correct data
5. ✅ Check formula display
6. ✅ Check current values match report
7. ✅ Check data sources table
8. ✅ Check date range in notes
9. ✅ Close dialog
10. ✅ Repeat for Investing and Financing sections

### Visual Verification

```bash
# Run development server
npm run dev

# Navigate to
http://localhost:3000/finance/reports/cash-flow

# Test each section's info button
```

---

## 📚 User Guide Addition

### Help Text

**Q: What does the ℹ️ icon do?**

A: The info icon shows you:
- How the section total is calculated (formula)
- Which database tables are used
- What fields are queried
- The current values for each line item
- Important notes about the calculations

This helps you understand where the numbers come from and verify accuracy.

---

## 🔄 Future Enhancements

Potential improvements:

1. **Export Calculations**: Download calculation details as PDF
2. **Drill-Down**: Click on line items to see individual transactions
3. **Comparison**: Show prior period calculations
4. **SQL Query**: Display actual SQL queries (for advanced users)
5. **Calculation History**: Show how calculations have changed over time

---

## 📞 Support

If calculations don't match expectations:

1. Click the ℹ️ icon to see data sources
2. Check the date range filter
3. Verify the database tables exist and have data
4. Review excluded categories (especially in Operating Expenses)
5. Check for NULL values in date fields

---

**Created:** October 16, 2025
**Feature Status:** ✅ Complete and Ready to Use
**Location:** Cash Flow Statement → All Section Headers
