# Cash Flow Data Source Selection Feature

## Overview
Enhanced Cash Flow Statement with full-width layout and interactive data source selection capabilities for each line item.

## Changes Made

### 1. Full Width Layout ✅
**File:** `src/components/finance/reports/CashFlowReport.tsx`

**Change:**
```tsx
// Before:
<div className="p-6 max-w-7xl mx-auto space-y-6">

// After:
<div className="p-6 w-full space-y-6">
```

**Result:** Cash Flow page now uses full browser width instead of being constrained to max-width: 80rem (1280px)

---

### 2. Data Source Selection Icons ✅
**File:** `src/components/finance/reports/CashFlowReport.tsx`

**Changes:**
- Added `Settings` icon import from `lucide-react`
- Added Settings (⚙️) icon button next to each line item amount
- Different hover colors for each section:
  - Operating Activities: Green hover (`hover:bg-green-100`)
  - Investing Activities: Blue hover (`hover:bg-blue-100`)
  - Financing Activities: Orange hover (`hover:bg-orange-100`)

**Table Structure Updates:**
```tsx
// Increased Amount column width from w-40 to w-48 to accommodate button
<TableHead className="text-right font-semibold w-48">Amount</TableHead>

// Added Settings button in each row
<TableCell className="text-right font-mono">
  <div className="flex items-center justify-end gap-2">
    <span>{formatCurrency(item.amount)}</span>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setSelectedLineItem(item.account_code);
        setShowDataSourceDialog(true);
      }}
      className="h-7 w-7 p-0 hover:bg-green-100"
      title="Select data sources"
    >
      <Settings className="h-4 w-4 text-green-600" />
    </Button>
  </div>
</TableCell>
```

---

### 3. Data Source Mapping Function ✅
**File:** `src/components/finance/reports/CashFlowReport.tsx`

**New Function:** `getLineItemDataSource(accountCode: string)`

Maps each Cash Flow line item to its database source:

| Account Code | Table | Description | API Endpoint |
|--------------|-------|-------------|--------------|
| **Operating Activities** |
| OP-001 | `payments` | Customer Payments Table | `/api/finance/customer-payments` |
| OP-002 | `vendor_payment_history` | Vendor Payment History | `/api/finance/vendor-payments` |
| OP-003 | `expenses` | Operating Expenses (filtered) | `/api/finance/expenses` |
| OP-004 | `payroll_records` | Employee Salary Payments | `/api/finance/payroll` |
| **Investing Activities** |
| INV-001 | `asset_disposals` | Sales of Fixed Assets | `/api/finance/asset-disposals` |
| INV-002 | `expenses` | Capital Expenditure Categories | `/api/finance/expenses?category=capital` |
| **Financing Activities** |
| FIN-001 | `loan_opening_balances` | New Loans Received | `/api/finance/loan-transactions` |
| FIN-002 | `investments` | Partner/Investor Contributions | `/api/equity/investments` |
| FIN-003 | `liability_payments` | Loan Repayments (Principal + Interest) | `/api/finance/liability-payments` |
| FIN-004 | `withdrawals` | Partner Drawings & Profit Distributions | `/api/equity/withdrawals` |

---

### 4. Data Source Selection Dialog ✅
**File:** `src/components/finance/reports/CashFlowReport.tsx`

**New State Variables:**
```tsx
const [showDataSourceDialog, setShowDataSourceDialog] = useState(false);
const [selectedLineItem, setSelectedLineItem] = useState<string | null>(null);
```

**Dialog Features:**
- **Header:** Shows selected line item code, table name, and description
- **Placeholder UI:** Displays planned features and sample table structure
- **Footer:** Shows selection count and total amount with Apply/Cancel buttons

**Current Status:** Dialog framework is complete but shows placeholder content. Ready for implementation of:
1. API integration to fetch actual transaction records
2. Checkbox selection logic
3. Real-time total recalculation
4. Filtering and search capabilities

---

## UI/UX Features

### Visual Design
- **Settings Icon Color Coding:**
  - Operating: Green (`text-green-600`)
  - Investing: Blue (`text-blue-600`)
  - Financing: Orange (`text-orange-600`)
  
- **Hover States:** Subtle background color on hover matching section theme

- **Icon Size:** 4x4 Lucide icons in 7x7 button containers

### Dialog Layout
- **Max Width:** 6xl (1152px)
- **Max Height:** 85vh (with overflow scrolling)
- **Sections:**
  1. Header with title and metadata
  2. Scrollable content area for transaction table
  3. Footer with statistics and action buttons

---

## Planned Implementation (Next Phase)

### Step 1: Create API Endpoints
Create endpoints to fetch detailed transaction data for each line item:

```typescript
// Example: GET /api/finance/customer-payments?start_date=2024-01-01&end_date=2024-12-31
// Returns: Array of payment records with id, date, customer, amount, method
```

### Step 2: Fetch Data on Dialog Open
```tsx
useEffect(() => {
  if (showDataSourceDialog && selectedLineItem) {
    const source = getLineItemDataSource(selectedLineItem);
    if (source?.apiEndpoint) {
      fetchTransactionData(source.apiEndpoint);
    }
  }
}, [showDataSourceDialog, selectedLineItem]);
```

### Step 3: Display Transaction Records
Replace placeholder table with actual data:
- Checkbox column for selection
- Date, Description, Reference Number, Amount columns
- Row hover highlighting
- Select All functionality

### Step 4: Selection State Management
```tsx
const [selectedRecords, setSelectedRecords] = useState<Record<string, string[]>>({
  'OP-001': ['payment_id_1', 'payment_id_2'],
  'OP-002': ['vendor_payment_id_1'],
  // ... etc
});
```

### Step 5: Dynamic Recalculation
- Calculate total based on selected checkboxes
- Update main Cash Flow report with new totals
- Persist selections in state or localStorage

### Step 6: Advanced Features
- **Filtering:** By date range, amount range, customer/vendor
- **Sorting:** By any column (date, amount, etc.)
- **Search:** Text search across descriptions
- **Export:** Export selected data to Excel/CSV
- **Bulk Actions:** Select all, deselect all, invert selection

---

## Technical Architecture

### Component Structure
```
CashFlowReport.tsx
├── State Management
│   ├── reportData (API response)
│   ├── showDataSourceDialog (boolean)
│   ├── selectedLineItem (account code string)
│   └── (future) selectedRecords (Record<code, ids[]>)
│
├── UI Components
│   ├── Summary Cards (4 cards)
│   ├── Operating Activities Table
│   │   └── Settings buttons per row
│   ├── Investing Activities Table
│   │   └── Settings buttons per row
│   ├── Financing Activities Table
│   │   └── Settings buttons per row
│   ├── Calculation Dialog (ℹ️ icons)
│   └── Data Source Selection Dialog (⚙️ icons)
│
└── Functions
    ├── getCalculationDetails() - Info icon content
    ├── getLineItemDataSource() - Maps codes to tables
    └── (future) fetchTransactionData()
    └── (future) handleSelectionChange()
```

### Data Flow
```
User clicks ⚙️ icon
    ↓
Sets selectedLineItem = "OP-001"
Sets showDataSourceDialog = true
    ↓
Dialog opens showing account code info
    ↓
(Future) Fetch transaction data from API
    ↓
Display records with checkboxes
    ↓
User selects/deselects records
    ↓
Update selection state
    ↓
Recalculate total
    ↓
User clicks "Apply Selection"
    ↓
Update main report with new amounts
Close dialog
```

---

## Database Tables Reference

### Payments (OP-001)
```sql
SELECT id, date, customer_id, amount, payment_method
FROM payments
WHERE date BETWEEN start_date AND end_date
ORDER BY date DESC;
```

### Vendor Payment History (OP-002)
```sql
SELECT id, payment_date, vendor_id, amount, payment_method
FROM vendor_payment_history
WHERE payment_date BETWEEN start_date AND end_date
ORDER BY payment_date DESC;
```

### Expenses (OP-003, INV-002)
```sql
-- Operating Expenses (OP-003)
SELECT id, date, category, subcategory, amount, description
FROM expenses
WHERE date BETWEEN start_date AND end_date
  AND category NOT IN ('Manufacturing', 'Salaries', 'Capital Expenditure')
ORDER BY date DESC;

-- Capital Expenditure (INV-002)
SELECT id, date, category, subcategory, amount, description
FROM expenses
WHERE date BETWEEN start_date AND end_date
  AND category = 'Capital Expenditure'
ORDER BY date DESC;
```

### Payroll Records (OP-004)
```sql
SELECT id, processed_at, employee_id, net_salary
FROM payroll_records
WHERE processed_at BETWEEN start_date AND end_date
ORDER BY processed_at DESC;
```

### Asset Disposals (INV-001)
```sql
SELECT id, disposal_date, asset_id, sale_price
FROM asset_disposals
WHERE disposal_date BETWEEN start_date AND end_date
ORDER BY disposal_date DESC;
```

### Loan Opening Balances (FIN-001)
```sql
SELECT id, loan_start_date, original_loan_amount, loan_provider
FROM loan_opening_balances
WHERE loan_start_date BETWEEN start_date AND end_date
ORDER BY loan_start_date DESC;
```

### Investments (FIN-002)
```sql
SELECT id, investment_date, amount, partner_id, investment_type
FROM investments
WHERE investment_date BETWEEN start_date AND end_date
ORDER BY investment_date DESC;
```

### Liability Payments (FIN-003)
```sql
SELECT id, date, total_amount, loan_id, principal_paid, interest_paid
FROM liability_payments
WHERE date BETWEEN start_date AND end_date
ORDER BY date DESC;
```

### Withdrawals (FIN-004)
```sql
SELECT id, withdrawal_date, amount, partner_id, withdrawal_type
FROM withdrawals
WHERE withdrawal_date BETWEEN start_date AND end_date
ORDER BY withdrawal_date DESC;
```

---

## Example User Flow

### Scenario: User wants to exclude certain customer payments from Cash Flow

1. **Navigate to Cash Flow Statement**
   - Go to Finance → Reports → Cash Flow Statement
   - Set date range (e.g., Jan 1 - Dec 31, 2024)
   - View report showing "OP-001 Cash received from customers: ₹52,91,809"

2. **Open Data Source Selection**
   - Click ⚙️ (Settings) icon next to ₹52,91,809
   - Dialog opens showing:
     ```
     Table: payments
     Description: Customer Payments Table - All payments received from customers
     ```

3. **View All Payments** (Future Implementation)
   - See list of all 150 customer payments in date range
   - Each row shows: Date, Customer Name, Amount, Payment Method
   - All checkboxes selected by default

4. **Exclude Specific Payments**
   - Uncheck 5 payments that were returns/refunds
   - See real-time total update: ₹52,91,809 → ₹51,45,200
   - Footer shows: "Selected: 145/150 records"

5. **Apply Selection**
   - Click "Apply Selection" button
   - Dialog closes
   - Main Cash Flow report updates:
     - "OP-001 Cash received from customers: ₹51,45,200" (was ₹52,91,809)
     - Net Operating Cash Flow recalculates automatically
     - Net Change in Cash recalculates

6. **Save/Export**
   - Export updated report to Excel/PDF
   - Selections persist in browser session

---

## Benefits

### For Users
✅ **Transparency:** See exactly which transactions contribute to each line item
✅ **Control:** Select which records to include/exclude from calculations
✅ **Accuracy:** Exclude anomalies, duplicates, or incorrect entries
✅ **Flexibility:** Analyze different scenarios by toggling selections
✅ **Audit Trail:** Know exactly what data was used for reporting

### For Auditors
✅ **Drill-Down:** Click any amount to see source transactions
✅ **Verification:** Cross-reference with source tables
✅ **Documentation:** Clear mapping of report lines to database tables
✅ **Reconciliation:** Easily reconcile Cash Flow with other reports

### For Analysis
✅ **Scenario Testing:** What-if analysis by excluding certain transactions
✅ **Trend Analysis:** Filter by customer, vendor, payment method, etc.
✅ **Data Quality:** Identify outliers or errors in source data
✅ **Segmentation:** Analyze cash flow by business unit, region, etc.

---

## Testing Checklist

### Visual Testing
- [ ] Full width layout displays correctly on various screen sizes
- [ ] Settings icons appear next to all line items in all three sections
- [ ] Icon colors match section theme (green/blue/orange)
- [ ] Hover states work correctly
- [ ] Dialog opens and closes smoothly

### Functional Testing (Current)
- [ ] Clicking Settings icon opens dialog
- [ ] Selected line item code displays in dialog header
- [ ] Table name and description show correctly for all 10 account codes
- [ ] Cancel button closes dialog
- [ ] Apply button closes dialog

### Functional Testing (Future Implementation)
- [ ] API endpoints return correct transaction data
- [ ] Checkbox selection updates state correctly
- [ ] Select All / Deselect All works
- [ ] Total recalculates when selections change
- [ ] Applying selection updates main report amounts
- [ ] Selections persist during session
- [ ] Export functionality works correctly
- [ ] Filtering and search work as expected

---

## Next Steps

### Priority 1: API Development
1. Create `/api/finance/customer-payments` endpoint
2. Create `/api/finance/vendor-payments` endpoint
3. Create `/api/finance/payroll` endpoint
4. Update existing endpoints to support filtering

### Priority 2: Dialog Implementation
1. Add transaction data fetching logic
2. Implement checkbox state management
3. Build real transaction table component
4. Add real-time total calculation
5. Implement Apply Selection logic to update main report

### Priority 3: Enhanced Features
1. Add filtering by date, amount, customer/vendor
2. Add sorting by any column
3. Add text search across descriptions
4. Add bulk selection actions
5. Add export to Excel/CSV functionality

### Priority 4: Polish
1. Add loading states while fetching data
2. Add error handling and retry logic
3. Add empty state when no records found
4. Add pagination for large datasets
5. Add keyboard shortcuts (Ctrl+A for select all, etc.)
6. Add tooltips for better UX
7. Save user preferences (selected records) to localStorage

---

## Code References

**Main Component:** `src/components/finance/reports/CashFlowReport.tsx`

**Key Lines:**
- Line 15: Settings icon import
- Line 77-78: State variables for dialog
- Line 216-266: getLineItemDataSource() function
- Line 603-619: Operating Activities Settings button
- Line 672-688: Investing Activities Settings button  
- Line 741-757: Financing Activities Settings button
- Line 905-998: Data Source Selection Dialog component

**API Route:** `src/app/api/finance/reports/[reportType]/route.ts`
- Cash Flow calculation logic
- Data source queries

---

## Related Documentation

- [CASH_FLOW_STATEMENT_IMPLEMENTATION.md](./CASH_FLOW_STATEMENT_IMPLEMENTATION.md) - Original Cash Flow implementation
- [FINANCE_IMPLEMENTATION_GUIDE.md](./FINANCE_IMPLEMENTATION_GUIDE.md) - Overall finance system
- [COMPREHENSIVE_FIX_SUMMARY.md](./COMPREHENSIVE_FIX_SUMMARY.md) - All finance fixes

---

**Status:** ✅ Phase 1 Complete (UI Framework)  
**Next:** Phase 2 - API Integration & Data Fetching  
**Last Updated:** 2024-01-XX  
**Version:** 1.0
