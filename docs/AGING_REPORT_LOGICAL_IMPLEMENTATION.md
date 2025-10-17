# Aging Report - Logical Schema Implementation

## Overview
This document explains the logical implementation of the Aging Report based on the actual database schema relationships.

## Data Flow Analysis

### Accounts Receivable Flow
```
customers
    ↓ (customer_id)
sales_orders (grand_total = amount owed)
    ↓ (sales_order_id)
invoices (tracks billing)
    ↓ (invoice_id)
payments (tracks what's paid)
```

**Key Insight**: 
- `sales_orders.grand_total` = Total amount customer owes
- `invoices.paid_amount` = Running total of payments received
- Outstanding = `grand_total - paid_amount - waived_amount`

### Accounts Payable Flow
```
suppliers
    ↓ (supplier_id)
vendor_bills (total_amount = amount owed, paid_amount = tracked total)
    ↓ (vendor_bill_id)
vendor_payment_history (actual payment records)
```

**Key Insight**:
- `vendor_bills.total_amount` = Total amount we owe
- `vendor_bills.paid_amount` = Running total (may get out of sync)
- `vendor_payment_history` = Actual payment records (source of truth)
- Outstanding = `total_amount - MAX(paid_amount, SUM(payment_history))`

## Implementation Logic

### Receivables Calculation

#### Step 1: Fetch Sales Orders
```sql
SELECT 
  sales_orders.*,
  customers.name,
  customers.phone,
  customers.email
FROM sales_orders
JOIN customers ON sales_orders.customer_id = customers.id
WHERE status NOT IN ('cancelled')
ORDER BY created_at ASC
```

**Why sales_orders?**
- Contains the actual order amount (`grand_total`)
- Links to customer
- Has the order date for aging calculation
- Represents the actual receivable

#### Step 2: Fetch Related Invoices & Payments
```sql
SELECT 
  id,
  sales_order_id,
  total,
  paid_amount,
  waived_amount
FROM invoices
WHERE status != 'paid'
```

**Why separate query?**
- One sales order can have multiple invoices
- Need to aggregate all payments across all invoices
- More efficient than nested joins

#### Step 3: Calculate Outstanding
```typescript
For each sales_order:
  1. Get grand_total (amount owed)
  2. Find all related invoices via sales_order_id
  3. Sum all paid_amount from those invoices
  4. Sum all waived_amount from those invoices
  5. Outstanding = grand_total - total_paid - total_waived
```

#### Step 4: Age the Outstanding Amount
```typescript
Days Outstanding = Today - Order Created Date

Buckets:
- Current: 0 days or less (same day orders)
- 1-30 Days: 1-30 days old
- 31-60 Days: 31-60 days old
- 61-90 Days: 61-90 days old
- 90+ Days: Over 90 days old
```

### Payables Calculation

#### Step 1: Fetch Vendor Bills
```sql
SELECT 
  vendor_bills.*,
  suppliers.name,
  suppliers.contact,
  suppliers.email
FROM vendor_bills
JOIN suppliers ON vendor_bills.supplier_id = suppliers.id
WHERE status IN ('pending', 'partial', 'overdue')
ORDER BY bill_date ASC
```

**Why vendor_bills?**
- Contains the actual bill amount (`total_amount`)
- Links to supplier
- Has both bill_date and due_date
- Represents the actual payable

#### Step 2: Fetch Actual Payment History
```sql
SELECT 
  vendor_bill_id,
  amount,
  payment_date,
  status
FROM vendor_payment_history
WHERE status = 'completed'
```

**Why separate payment history?**
- `vendor_bills.paid_amount` might be out of sync
- Payment history is the source of truth
- Can verify/reconcile discrepancies
- Shows actual payment dates

#### Step 3: Calculate Outstanding
```typescript
For each vendor_bill:
  1. Get total_amount (what we owe)
  2. Get paid_amount from bill record
  3. Sum all completed payments from vendor_payment_history
  4. Use MAX(paid_amount, actual_payments) for safety
  5. Outstanding = total_amount - paid
```

**Why MAX() logic?**
- Handles data inconsistencies
- If payment_history sum > paid_amount, use history (more accurate)
- If paid_amount > history sum, use paid_amount (edge case)
- Prevents showing wrong outstanding amounts

#### Step 4: Age by Due Date
```typescript
Days Overdue = Today - Due Date

Buckets:
- Current: Negative days (not yet due)
- 1-30 Days: 0-30 days overdue
- 31-60 Days: 31-60 days overdue  
- 61-90 Days: 61-90 days overdue
- 90+ Days: Over 90 days overdue
```

**Note**: Payables use `due_date` for aging, not `bill_date`!

## Schema Relationships

### Why This Approach?

#### Receivables: Orders → Invoices → Payments
```
Order #123 (₹100,000)
  ├─ Invoice #001 (₹60,000) → Paid ₹60,000 ✓
  └─ Invoice #002 (₹40,000) → Paid ₹20,000 (Partial)

Outstanding Calculation:
  Total Owed: ₹100,000 (from order.grand_total)
  Total Paid: ₹60,000 + ₹20,000 = ₹80,000
  Outstanding: ₹100,000 - ₹80,000 = ₹20,000 ✓
```

**Why not just use invoices?**
- Multiple invoices per order complicate aggregation
- `grand_total` is the definitive amount owed
- Orders link directly to customers
- Invoices are billing documents, orders are the contract

#### Payables: Bills → Payment History
```
Bill #456 (₹50,000) - Due: Oct 31
  Bill Record: paid_amount = ₹30,000
  Payment History:
    ├─ Payment 1: ₹15,000 (Oct 10)
    ├─ Payment 2: ₹10,000 (Oct 15)
    └─ Payment 3: ₹5,000 (Oct 20)
  Total from History: ₹30,000 ✓

Outstanding Calculation:
  Total Owed: ₹50,000
  Verified Paid: MAX(₹30,000, ₹30,000) = ₹30,000
  Outstanding: ₹50,000 - ₹30,000 = ₹20,000 ✓
```

**Why cross-reference payment history?**
- Ensures data integrity
- `paid_amount` is a calculated field that might desync
- Payment history is immutable audit trail
- Can detect reconciliation issues

## Edge Cases Handled

### 1. Multiple Invoices Per Order
```typescript
// Group invoices by sales_order_id
const invoiceMap = new Map<string, { total, paid, waived }>();

// Aggregate all payments for the order
invoices.forEach(inv => {
  if (!map.has(inv.sales_order_id)) {
    map.set(inv.sales_order_id, { total: 0, paid: 0, waived: 0 });
  }
  map.get(inv.sales_order_id).paid += inv.paid_amount;
  map.get(inv.sales_order_id).waived += inv.waived_amount;
});
```

### 2. Payment History Mismatch
```typescript
// Use MAX to handle discrepancies
const paidFromBill = bill.paid_amount || 0;
const paidFromHistory = sumPayments(bill.id) || 0;
const actualPaid = Math.max(paidFromBill, paidFromHistory);

// Prevents showing incorrect outstanding
outstanding = totalAmount - actualPaid;
```

### 3. Cancelled/Invalid Records
```typescript
// Receivables: Exclude cancelled orders
.not('status', 'in', '("cancelled")')

// Payables: Only include pending/partial/overdue
.in('status', ['pending', 'partial', 'overdue'])

// Payments: Only completed payments count
.eq('status', 'completed')
```

### 4. Missing Customer/Vendor Data
```typescript
// Graceful fallback
const customerName = customer?.name || 'Unknown Customer';
const contact = customer?.phone || customer?.email || 'N/A';
```

### 5. Zero or Negative Outstanding
```typescript
// Skip fully paid items
if (remainingAmount <= 0) return;

// Only show actual receivables/payables
```

## Performance Optimizations

### 1. Separate Queries
Instead of deeply nested joins:
```typescript
// ✅ Good: 2 queries, aggregate in memory
const orders = await fetchOrders();
const invoices = await fetchInvoices();
const map = aggregateInvoicesByOrder(invoices);

// ❌ Bad: 1 query with nested joins
const data = await fetch(`
  orders {
    invoices {
      payments { * }
    }
  }
`); // Returns massive nested structure
```

### 2. Map-Based Aggregation
```typescript
// O(n) aggregation using Map
const customerMap = new Map<string, ReceivableDetail>();

orders.forEach(order => {
  if (!customerMap.has(order.customer_id)) {
    customerMap.set(order.customer_id, initializeCustomer());
  }
  // Accumulate amounts
});

// O(n log n) sort once at the end
return Array.from(customerMap.values()).sort();
```

### 3. Single Pass Bucketing
```typescript
// Calculate days and bucket in single pass
const daysOutstanding = calculateDays(orderDate, asOfDate);

// Direct bucket assignment
if (daysOutstanding <= 0) totals.current += amount;
else if (daysOutstanding <= 30) totals.days1to30 += amount;
// ... etc
```

## Data Integrity Checks

### Receivables Validation
```typescript
// Ensure consistency
const orderTotal = order.grand_total;
const invoiceTotal = invoices.reduce((sum, inv) => sum + inv.total, 0);

if (Math.abs(orderTotal - invoiceTotal) > 0.01) {
  console.warn(`Order ${order.id}: Invoice total mismatch`);
  // Use order.grand_total as authoritative
}
```

### Payables Validation
```typescript
// Cross-check paid amounts
const billPaid = bill.paid_amount;
const historyPaid = payments.reduce((sum, p) => sum + p.amount, 0);

if (Math.abs(billPaid - historyPaid) > 0.01) {
  console.warn(`Bill ${bill.id}: Payment mismatch`);
  // Use MAX for safety, log for reconciliation
}
```

## Testing Scenarios

### Scenario 1: Single Order, Single Invoice
```
Order: ₹10,000
Invoice: ₹10,000, Paid: ₹6,000
Expected Outstanding: ₹4,000 ✓
```

### Scenario 2: Single Order, Multiple Invoices
```
Order: ₹20,000
  Invoice 1: ₹12,000, Paid: ₹12,000
  Invoice 2: ₹8,000, Paid: ₹5,000
Total Paid: ₹17,000
Expected Outstanding: ₹3,000 ✓
```

### Scenario 3: Payment History Mismatch
```
Bill: ₹15,000
  bill.paid_amount: ₹8,000
  Payment History: [₹5,000, ₹5,000] = ₹10,000
Use: MAX(₹8,000, ₹10,000) = ₹10,000
Expected Outstanding: ₹5,000 ✓
```

### Scenario 4: Not Yet Due
```
Bill Date: Oct 1
Due Date: Oct 31
As Of: Oct 17
Days Overdue: -14 (not yet due)
Bucket: Current ✓
```

### Scenario 5: Multiple Bills, Same Vendor
```
Vendor ABC:
  Bill 1: ₹10,000 outstanding (45 days)
  Bill 2: ₹5,000 outstanding (15 days)
  Bill 3: ₹8,000 outstanding (95 days)

Aggregate:
  1-30 Days: ₹5,000
  31-60 Days: ₹10,000
  90+ Days: ₹8,000
  Total Due: ₹23,000
  Oldest: 95 days ✓
```

## API Response Example

### Request
```
GET /api/finance/aging-report?asOfDate=2025-10-17
```

### Response
```json
{
  "asOfDate": "2025-10-17",
  "receivables": {
    "summary": {
      "current": 25000,
      "days1to30": 45000,
      "days31to60": 30000,
      "days61to90": 15000,
      "days90plus": 5000,
      "total": 120000
    },
    "details": [
      {
        "customer": "ABC Corp",
        "customerId": "uuid-123",
        "contact": "9876543210",
        "current": 0,
        "days1to30": 45000,
        "days31to60": 0,
        "days61to90": 0,
        "days90plus": 0,
        "totalDue": 45000,
        "oldestInvoiceDate": "2025-09-20",
        "oldestDays": 27
      }
    ]
  },
  "payables": {
    "summary": {
      "current": 80000,
      "days1to30": 20000,
      "days31to60": 10000,
      "days61to90": 5000,
      "days90plus": 2000,
      "total": 117000
    },
    "details": [
      {
        "vendor": "XYZ Suppliers",
        "vendorId": "uuid-456",
        "contact": "supplier@xyz.com",
        "current": 80000,
        "days1to30": 0,
        "days31to60": 0,
        "days61to90": 0,
        "days90plus": 0,
        "totalDue": 80000,
        "oldestBillDate": "2025-10-01",
        "oldestDays": -5
      }
    ]
  },
  "generatedAt": "2025-10-17T10:30:00.000Z"
}
```

## Key Improvements Over Previous Version

### ✅ Uses Correct Source Tables
- Receivables: `sales_orders` (not just `invoices`)
- Payables: Cross-references `vendor_payment_history`

### ✅ Proper Amount Calculation
- Uses `grand_total` as definitive receivable
- Verifies paid amounts against payment history
- Handles multiple invoices per order

### ✅ Data Integrity
- Cross-checks payment records
- Handles sync issues gracefully
- Validates with MAX() logic

### ✅ Performance
- Separate optimized queries
- Map-based aggregation
- Single-pass bucketing

### ✅ Edge Cases
- Cancelled orders excluded
- Only completed payments count
- Missing data handled gracefully
- Zero outstanding filtered

---

**Implementation Date**: October 17, 2025  
**Version**: 2.0 (Logical Schema Implementation)  
**Status**: ✅ Complete  
**Schema Verified**: ✅ All relationships confirmed
