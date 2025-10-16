# Accounts Payable & Receivable Report - Complete Implementation

## Overview
The Accounts Payable & Receivable page provides a comprehensive view of all money owed by the business (Payables) and money owed to the business (Receivables).

## File Locations

### Main Component
- **Path**: `src/app/(erp)/reports/accounts-payable-receivable/page.tsx`
- **Route**: `/reports/accounts-payable-receivable`

### API Endpoints Created/Used

1. **Ledgers Summary** (Existing)
   - `/api/finance/ledgers-summary?type=customer` - Customer receivables
   - `/api/finance/ledgers-summary?type=supplier` - Supplier payables
   - `/api/finance/ledgers-summary?type=employee` - Employee salary obligations
   - `/api/finance/ledgers-summary?type=loans` - Loan balances

2. **Sales Returns** (Existing)
   - `/api/sales/returns?limit=1000` - Product returns

3. **Invoice Refunds** (NEW)
   - `/api/finance/refunds?status=pending,approved&limit=1000` - Money refunds
   - **File**: `src/app/api/finance/refunds/route.ts`

## Database Schema

### Tables Used

1. **`returns`** - Sales Returns (Products)
   ```sql
   - id (uuid)
   - order_id (uuid) -> sales_orders
   - return_type (return/warranty/complaint/exchange)
   - status (pending/approved/completed/rejected)
   - return_value (numeric) - Amount to refund
   - created_at (timestamp)
   ```

2. **`invoice_refunds`** - Invoice Refunds (Money)
   ```sql
   - id (uuid)
   - invoice_id (uuid) -> invoices
   - return_id (uuid, nullable) -> returns
   - refund_amount (numeric) - Amount to refund
   - refund_type (full/partial/return_based)
   - status (pending/approved/processed/rejected/cancelled)
   - refund_method (cash/bank_transfer/credit_card/cheque/adjustment)
   - created_at (timestamp)
   ```

## Page Structure

### Summary Cards (Top)
1. **Accounts Receivable** (Green)
   - Total amount owed TO the business
   - Customer count
   
2. **Accounts Payable** (Red)
   - Total amount owed BY the business
   - Account count (suppliers + employees + loans + refunds)
   
3. **Net Position** (Blue/Orange)
   - Receivables - Payables
   - Positive = Surplus, Negative = Deficit

### Tabs

#### Receivables Tab
- Shows all customers with outstanding invoices
- Sorted by balance (highest first)
- Displays: Name, Contact, Total Invoiced, Paid, Balance, Status

#### Payables Tab - **4 Categorized Groups**

##### 1. Suppliers (Purple, Building2 Icon)
- **Data Source**: `/api/finance/ledgers-summary?type=supplier`
- **Shows**: Vendor bills awaiting payment
- **Fields**: Supplier Name, Contact, Total Bills, Paid, Balance Due, Status
- **Filter**: `balance > 0`

##### 2. Employees (Green, UserCheck Icon)
- **Data Source**: `/api/finance/ledgers-summary?type=employee`
- **Shows**: Employee salary obligations
- **Fields**: Employee Name, Contact, Total Salary, Paid, Balance Due, Status
- **Filter**: `balance > 0`

##### 3. Loans & Financing (Red, Banknote Icon)
- **Data Source**: `/api/finance/ledgers-summary?type=loans`
- **Shows**: Outstanding loan balances
- **Fields**: Loan Account, Contact, Total Loan, Paid, Balance Due, Status
- **Filter**: `balance > 0`

##### 4. Customer Returns & Refunds (Amber, RotateCcw Icon)
- **Data Source**: 
  - `/api/sales/returns` (Product Returns)
  - `/api/finance/refunds` (Invoice Refunds)
- **Shows**: Money owed back to customers
- **Fields**: Customer Name, Contact, Return Value, Refunded, Balance Due, Status
- **Filters**: 
  - Returns: `status IN ('pending', 'approved')` AND `status NOT IN ('completed', 'rejected')`
  - Refunds: `status IN ('pending', 'approved')` AND `status != 'processed'`
- **Labels**:
  - `(Return)` - From sales_returns table
  - `(Invoice Refund)` - From invoice_refunds table

### Features

1. **Collapsible Groups**
   - Each category can be expanded/collapsed
   - State managed in `expandedGroups` object
   - Default: All expanded

2. **Subtotals**
   - Each group shows its own subtotal
   - Color-coded to match group theme

3. **Grand Total Card**
   - Shows total outstanding across ALL payable categories
   - Displays total account count

4. **Status Badges**
   - **Unpaid**: Red (no payments made)
   - **Partial**: Orange (some payments made)
   - **Paid**: Green (fully paid)
   - **Pending**: Amber (for returns/refunds)
   - **Approved**: Amber (for returns/refunds)

## Data Flow

### Receivables
```typescript
fetch('/api/finance/ledgers-summary?type=customer&limit=1000')
  → Filter: balance > 0
  → Map to AccountSummary
  → setReceivables()
```

### Payables
```typescript
// Initialize empty array
allPayables = []

// 1. Fetch Suppliers
fetch('/api/finance/ledgers-summary?type=supplier&limit=1000')
  → Filter: balance > 0
  → Map with category: 'supplier'
  → Push to allPayables

// 2. Fetch Employees
fetch('/api/finance/ledgers-summary?type=employee&limit=1000')
  → Filter: balance > 0
  → Map with category: 'employee'
  → Push to allPayables

// 3. Fetch Loans
fetch('/api/finance/ledgers-summary?type=loans&limit=1000')
  → Filter: balance > 0
  → Map with category: 'loan'
  → Push to allPayables

// 4. Fetch Sales Returns
fetch('/api/sales/returns?limit=1000')
  → Filter: status='pending' OR 'approved'
  → Map with category: 'return', label: '(Return)'
  → Push to allPendingRefunds

// 5. Fetch Invoice Refunds
fetch('/api/finance/refunds?status=pending,approved&limit=1000')
  → Filter: status='pending' OR 'approved', NOT 'processed'
  → Map with category: 'return', label: '(Invoice Refund)'
  → Push to allPendingRefunds

// 6. Combine
allPayables.push(...allPendingRefunds)
setPayables(allPayables)
```

## Interface Definition

```typescript
interface AccountSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  category?: 'supplier' | 'employee' | 'loan' | 'return';
}
```

## Rendering Logic

### Payables Tab Rendering
```typescript
// Filter by category and render each group
payables.filter(p => p.category === 'supplier')  // Purple card
payables.filter(p => p.category === 'employee')  // Green card
payables.filter(p => p.category === 'loan')      // Red card
payables.filter(p => p.category === 'return')    // Amber card
```

### Group Display Conditions
- Group only appears if `payables.filter(p => p.category === X).length > 0`
- This ensures empty categories are hidden

## Status Meanings

### Returns Table (`returns`)
- **pending**: Return submitted, awaiting approval
- **approved**: Return approved, refund pending
- **completed**: Return processed, refund issued ✅ (NOT shown in payables)
- **rejected**: Return rejected ✅ (NOT shown in payables)

### Invoice Refunds Table (`invoice_refunds`)
- **pending**: Refund requested, awaiting approval
- **approved**: Refund approved, payment pending
- **processed**: Refund payment completed ✅ (NOT shown in payables)
- **rejected**: Refund rejected ✅ (NOT shown in payables)
- **cancelled**: Refund cancelled ✅ (NOT shown in payables)

## Debugging

### Console Logs Added
```javascript
console.log('Invoice Refunds Response:', refundsData);
console.log('Pending Invoice Refunds:', pendingRefunds.length);
console.log('Invoice Refunds API failed:', refundsResponse.status);
```

### How to Debug
1. Open browser DevTools (F12)
2. Go to Console tab
3. Refresh the Accounts Payable & Receivable page
4. Check for:
   - API response data
   - Number of pending refunds found
   - Any API errors

### Common Issues

1. **Returns showing but Refunds not showing**
   - Check if invoice_refunds table has data with status='pending' or 'approved'
   - Verify `/api/finance/refunds` endpoint is working
   - Check console for API errors

2. **Category not appearing**
   - Verify there's data with balance > 0 for that category
   - Check API response in console
   - Ensure status filters are correct

3. **Wrong totals**
   - Check if `paid_amount` field exists in API response
   - Verify balance calculation: `totalAmount - paidAmount`

## Future Enhancements

1. **Export Functionality**
   - Add CSV/Excel export for each category
   - Include filters in export

2. **Print Functionality**
   - Generate printable PDF report
   - Show expanded view of all categories

3. **Filters**
   - Date range filters
   - Amount range filters
   - Search by customer/supplier name

4. **Sorting**
   - Sort by different columns
   - Multi-column sorting

5. **Actions**
   - Quick payment button
   - Process refund button
   - Send reminder email

## Related Documentation
- `DASHBOARD_LIABILITIES_CATEGORIZATION.md` - Dashboard implementation
- `SALES_RETURN_EXCHANGE_IMPLEMENTATION.md` - Returns system
- `LIABILITY_PAYMENT_USER_GUIDE.md` - Payment processing
