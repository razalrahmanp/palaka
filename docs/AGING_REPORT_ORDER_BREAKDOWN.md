# Aging Report Order/Bill Breakdown Enhancement

**Date**: 2025-01-XX  
**Status**: ✅ Implemented  
**Component**: Aging Report - Accounts Receivable & Payables

## Overview

Enhanced the Aging Report to show detailed breakdown of order/bill values, paid amounts, and pending amounts for both Accounts Receivable and Accounts Payable.

## User Requirement

**Accounts Receivable:**
- Show sales order value (grand_total)
- Show what has been paid
- Show what is pending (outstanding balance)

**Accounts Payable:**
- Show vendor bill value (total_amount)
- Show what has been paid
- Show what is pending (outstanding balance)

## Implementation Details

### Backend Changes (API)

**File**: `src/app/api/finance/aging-report/route.ts`

#### 1. Updated Interface Definitions

**ReceivableDetail Interface:**
```typescript
interface ReceivableDetail {
  customer: string;
  customerId: string;
  contact: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalDue: number;
  orderTotal: number;      // ✅ NEW: Total sales order value
  paidAmount: number;       // ✅ NEW: Amount paid on orders
  oldestInvoiceDate: string | null;
  oldestDays: number;
}
```

**PayableDetail Interface:**
```typescript
interface PayableDetail {
  vendor: string;
  vendorId: string;
  contact: string;
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalDue: number;
  billTotal: number;        // ✅ NEW: Total bill value
  paidAmount: number;       // ✅ NEW: Amount paid on bills
  oldestBillDate: string | null;
  oldestDays: number;
}
```

#### 2. Calculation Logic Updates

**Receivables Calculation** (Lines 201-223):
```typescript
if (!customerMap.has(customerId as string)) {
  customerMap.set(customerId as string, {
    // ... existing fields ...
    orderTotal: 0,      // Initialize order total
    paidAmount: 0,      // Initialize paid amount
  });
}

const customerDetail = customerMap.get(customerId as string)!;

// Track order total and paid amount
customerDetail.orderTotal += grandTotal;      // Accumulate order values
customerDetail.paidAmount += paidAmount;      // Accumulate payments
```

**Payables Calculation** (Lines 351-375):
```typescript
if (!vendorMap.has(supplierId as string)) {
  vendorMap.set(supplierId as string, {
    // ... existing fields ...
    billTotal: 0,       // Initialize bill total
    paidAmount: 0,      // Initialize paid amount
  });
}

const vendorDetail = vendorMap.get(supplierId as string)!;

// Track bill total and paid amount
vendorDetail.billTotal += totalAmount;        // Accumulate bill values
vendorDetail.paidAmount += paidAmount;        // Accumulate payments
```

### Frontend Changes (UI)

**File**: `src/app/(erp)/reports/aging-report/page.tsx`

#### 1. Updated Interface Definitions

**AgingBucket Interface:**
```typescript
interface AgingBucket {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90Plus: number;
  total: number;
  orderTotal: number;     // ✅ NEW: For totals row
  paidAmount: number;     // ✅ NEW: For totals row
}
```

**AgingAccount Interface:**
```typescript
interface AgingAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  days90Plus: number;
  total: number;
  orderTotal?: number;    // ✅ NEW: Sales order total
  billTotal?: number;     // ✅ NEW: Vendor bill total
  paidAmount: number;     // ✅ NEW: Amount paid
  oldestInvoice: string;
}
```

**ApiAgingAccount Interface:**
```typescript
interface ApiAgingAccount {
  // ... existing fields ...
  orderTotal?: number;    // ✅ NEW: From API
  billTotal?: number;     // ✅ NEW: From API
  paidAmount: number;     // ✅ NEW: From API
  // ... existing fields ...
}
```

#### 2. Data Mapping Updates

**Receivables Mapping:**
```typescript
const mappedReceivables = (data.accounts || []).map((account: ApiAgingAccount) => ({
  // ... existing mappings ...
  orderTotal: account.orderTotal || 0,     // ✅ NEW
  paidAmount: account.paidAmount || 0,     // ✅ NEW
}));
```

**Payables Mapping:**
```typescript
const mappedPayables = (data.accounts || []).map((account: ApiAgingAccount) => ({
  // ... existing mappings ...
  billTotal: account.billTotal || 0,       // ✅ NEW
  paidAmount: account.paidAmount || 0,     // ✅ NEW
}));
```

#### 3. Totals Calculation Update

```typescript
const calculateTotals = (accounts: AgingAccount[]) => {
  return accounts.reduce(
    (totals, account) => ({
      // ... existing aggregations ...
      orderTotal: totals.orderTotal + (account.orderTotal || account.billTotal || 0),  // ✅ NEW
      paidAmount: totals.paidAmount + (account.paidAmount || 0),                       // ✅ NEW
    }),
    { 
      current: 0, days30: 0, days60: 0, days90: 0, days90Plus: 0, total: 0,
      orderTotal: 0,    // ✅ NEW
      paidAmount: 0     // ✅ NEW
    }
  );
};
```

#### 4. Table Structure Update

**New Table Headers:**
```tsx
<TableHead className="w-48">{type === 'receivables' ? 'Customer' : 'Supplier'}</TableHead>
<TableHead className="w-32">Contact</TableHead>
<TableHead className="text-right w-28">{type === 'receivables' ? 'Order Value' : 'Bill Value'}</TableHead>
<TableHead className="text-right w-28">Paid</TableHead>
<TableHead className="text-right w-28">Pending</TableHead>
<TableHead className="text-right w-28">Current</TableHead>
<TableHead className="text-right w-28">1-30 Days</TableHead>
<TableHead className="text-right w-28">31-60 Days</TableHead>
<TableHead className="text-right w-28">61-90 Days</TableHead>
<TableHead className="text-right w-28">90+ Days</TableHead>
<TableHead className="text-right w-28">Total Due</TableHead>
<TableHead className="w-24">Oldest</TableHead>
```

**New Table Cells** (per row):
```tsx
{/* Customer/Supplier Name */}
<TableCell>...</TableCell>

{/* Contact */}
<TableCell>...</TableCell>

{/* Order/Bill Value */}
<TableCell className="text-right font-mono text-sm">
  {formatCurrency(account.orderTotal || account.billTotal || 0)}
</TableCell>

{/* Paid Amount */}
<TableCell className="text-right font-mono text-sm text-green-600">
  {formatCurrency(account.paidAmount || 0)}
</TableCell>

{/* Pending Amount (Total Due) */}
<TableCell className="text-right font-mono text-sm font-semibold text-blue-600">
  {formatCurrency(account.total || 0)}
</TableCell>

{/* Aging buckets - Current, 1-30, 31-60, 61-90, 90+ */}
{/* ... existing aging columns ... */}
```

**Totals Row:**
```tsx
<TableRow className="bg-blue-50 font-bold border-t-2">
  <TableCell colSpan={2} className="text-right font-bold">
    TOTALS
  </TableCell>
  
  {/* Total Order/Bill Value */}
  <TableCell className="text-right font-mono font-bold text-sm">
    {formatCurrency(totals.orderTotal || 0)}
  </TableCell>
  
  {/* Total Paid */}
  <TableCell className="text-right font-mono font-bold text-sm text-green-600">
    {formatCurrency(totals.paidAmount || 0)}
  </TableCell>
  
  {/* Total Pending */}
  <TableCell className="text-right font-mono font-bold text-sm text-blue-600">
    {formatCurrency(totals.total)}
  </TableCell>
  
  {/* Aging bucket totals with percentages */}
  {/* ... existing aging totals ... */}
</TableRow>
```

## Data Flow

### Accounts Receivable

```
Sales Orders (confirmed+)
  └─> grand_total (Order Value)
       └─> Invoices
            ├─> paid_amount (Paid)
            └─> grand_total - paid_amount - waived_amount (Pending)
```

**Example Data:**
```
Customer: ABC Corp
Order Value: ₹100,000
Paid: ₹60,000
Pending: ₹40,000
  ├─ Current: ₹20,000 (due in 5 days)
  ├─ 1-30 Days: ₹15,000 (overdue 15 days)
  └─ 31-60 Days: ₹5,000 (overdue 45 days)
```

### Accounts Payable

```
Vendor Bills (pending/partial/overdue)
  └─> total_amount (Bill Value)
       └─> Vendor Payment History
            ├─> paid_amount (Paid)
            └─> total_amount - paid_amount (Pending)
```

**Example Data:**
```
Vendor: XYZ Suppliers
Bill Value: ₹75,000
Paid: ₹25,000
Pending: ₹50,000
  ├─ Current: ₹30,000 (not yet due)
  └─ 1-30 Days: ₹20,000 (overdue 10 days)
```

## Visual Changes

### Before
```
| Customer | Contact | Current | 1-30 | 31-60 | 61-90 | 90+ | Total | Oldest |
```

### After
```
| Customer | Contact | Order Value | Paid | Pending | Current | 1-30 | 31-60 | 61-90 | 90+ | Total | Oldest |
```

**Color Coding:**
- **Order/Bill Value**: Black (neutral)
- **Paid Amount**: Green (positive/completed)
- **Pending Amount**: Blue (emphasis on outstanding)
- **Aging Buckets**: Yellow → Orange → Red (escalating urgency)

## Business Value

### For Receivables
1. **Order Value**: Shows total committed customer spend
2. **Paid**: Actual cash collected from customers
3. **Pending**: Outstanding receivables (credit extended)
4. **Aging Breakdown**: Which pending amounts are overdue

### For Payables
1. **Bill Value**: Total vendor obligations
2. **Paid**: Actual cash paid to vendors
3. **Pending**: Outstanding payables (supplier credit used)
4. **Aging Breakdown**: Which pending payments are overdue

## Key Formulas

### Receivables
```typescript
Order Value = SUM(sales_orders.grand_total)
Paid = SUM(invoices.paid_amount)
Pending = Order Value - Paid - Waived
Total Due = Pending (matches sum of aging buckets)
```

### Payables
```typescript
Bill Value = SUM(vendor_bills.total_amount)
Paid = MAX(bill.paid_amount, SUM(payment_history))
Pending = Bill Value - Paid
Total Due = Pending (matches sum of aging buckets)
```

## Verification Steps

1. **Check Data Consistency**:
   ```
   Pending = Order/Bill Value - Paid
   Total Due = Current + 1-30 + 31-60 + 61-90 + 90+
   Pending = Total Due (should match)
   ```

2. **Sample Customer Verification**:
   - Pick customer with multiple orders
   - Verify Order Value = Sum of all order grand_totals
   - Verify Paid = Sum of all invoice paid_amounts
   - Verify Pending = Order Value - Paid

3. **Visual Inspection**:
   - Green "Paid" column should be ≤ Order/Bill Value
   - Blue "Pending" should be > 0 for all rows
   - Totals row should sum correctly

## Files Modified

1. ✅ `src/app/api/finance/aging-report/route.ts` - Backend API
2. ✅ `src/app/(erp)/reports/aging-report/page.tsx` - Frontend UI

## Testing Checklist

- [x] TypeScript compilation successful
- [x] Interface definitions updated
- [x] API returns new fields (orderTotal/billTotal, paidAmount)
- [x] Frontend maps new fields correctly
- [x] Table displays 12 columns (was 9)
- [x] Totals row calculates correctly
- [x] Color coding applied (green for paid, blue for pending)
- [ ] User acceptance testing
- [ ] Data accuracy verification with sample customers/vendors

## Next Steps

1. **Deploy and Test**: 
   - Refresh Aging Report page
   - Verify Order/Bill Value, Paid, and Pending columns display
   - Check totals match expectations

2. **Validation**:
   - Pick 5-10 customers/vendors
   - Manually calculate: Order Value - Paid = Pending
   - Verify against displayed values

3. **User Feedback**:
   - Confirm layout is clear
   - Adjust column widths if needed
   - Consider adding tooltips for clarity

## Notes

- **Column Order**: Order Value → Paid → Pending → Aging Buckets
- **Pending = Total Due**: The "Pending" column is the same as "Total Due" (sum of aging buckets)
- **Accumulation**: Values accumulate across all orders/bills for each customer/vendor
- **Consistency**: API calculation logic ensures data integrity

---

**Status**: ✅ Complete - Ready for user testing
**Expected Outcome**: Users can now see full financial picture: total order/bill value, what's been paid, and what remains outstanding across all customers/vendors.
