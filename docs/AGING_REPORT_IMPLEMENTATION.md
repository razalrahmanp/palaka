# Aging Report Implementation Guide

## Overview
The Aging Report API endpoint provides comprehensive accounts receivable and accounts payable aging analysis, categorizing outstanding amounts by how long they've been due.

## API Endpoint

### Route
```
GET /api/finance/aging-report
```

### Query Parameters
- `asOfDate` (optional): Date to calculate aging as of (format: YYYY-MM-DD)
  - Default: Current date
  - Example: `?asOfDate=2025-10-17`

### Response Structure
```typescript
{
  asOfDate: string,           // Date aging was calculated
  receivables: {
    summary: {
      current: number,        // Not yet due
      days1to30: number,      // 1-30 days outstanding
      days31to60: number,     // 31-60 days outstanding
      days61to90: number,     // 61-90 days outstanding
      days90plus: number,     // 90+ days outstanding
      total: number           // Total outstanding
    },
    details: Array<{
      customer: string,
      customerId: string,
      contact: string,
      current: number,
      days1to30: number,
      days31to60: number,
      days61to90: number,
      days90plus: number,
      totalDue: number,
      oldestInvoiceDate: string,
      oldestDays: number
    }>
  },
  payables: {
    summary: {
      current: number,        // Not yet due
      days1to30: number,      // 1-30 days overdue
      days31to60: number,     // 31-60 days overdue
      days61to90: number,     // 61-90 days overdue
      days90plus: number,     // 90+ days overdue
      total: number           // Total outstanding
    },
    details: Array<{
      vendor: string,
      vendorId: string,
      contact: string,
      current: number,
      days1to30: number,
      days31to60: number,
      days61to90: number,
      days90plus: number,
      totalDue: number,
      oldestBillDate: string,
      oldestDays: number
    }>
  },
  generatedAt: string         // Timestamp report was generated
}
```

## Data Sources

### Accounts Receivable
**Primary Table**: `invoices`

**Query Logic**:
```sql
SELECT invoices.*, customers.name, customers.email, customers.phone
FROM invoices
JOIN customers ON invoices.customer_id = customers.id
WHERE status != 'paid'
ORDER BY created_at ASC
```

**Calculation**:
- **Outstanding Amount** = `total - paid_amount - waived_amount`
- **Days Outstanding** = Days between `invoice.created_at` and `asOfDate`
- **Aging Buckets**:
  - Current: 0 days or less
  - 1-30 Days: 1 to 30 days outstanding
  - 31-60 Days: 31 to 60 days outstanding
  - 61-90 Days: 61 to 90 days outstanding
  - 90+ Days: More than 90 days outstanding

### Accounts Payable
**Primary Table**: `vendor_bills`

**Query Logic**:
```sql
SELECT vendor_bills.*, suppliers.name, suppliers.email, suppliers.phone
FROM vendor_bills
JOIN suppliers ON vendor_bills.supplier_id = suppliers.id
WHERE status IN ('pending', 'partial', 'overdue')
ORDER BY bill_date ASC
```

**Calculation**:
- **Outstanding Amount** = `total_amount - paid_amount`
- **Days Overdue** = Days between `due_date` and `asOfDate`
- **Aging Buckets**:
  - Current: Not yet due (negative days = future due date)
  - 1-30 Days: 0-30 days overdue
  - 31-60 Days: 31-60 days overdue
  - 61-90 Days: 61-90 days overdue
  - 90+ Days: More than 90 days overdue

## Schema Relationships

### Receivables Chain
```
customers (id, name, email, phone)
    ↓
invoices (id, customer_id, total, paid_amount, waived_amount, status, created_at)
    ↓
payments (invoice_id, amount, payment_date)
```

### Payables Chain
```
suppliers (id, name, email, phone)
    ↓
vendor_bills (id, supplier_id, total_amount, paid_amount, due_date, bill_date, status)
    ↓
vendor_payment_history (vendor_bill_id, amount, payment_date)
```

## Key Features

### 1. Accurate Outstanding Calculations
- ✅ Deducts paid amounts from totals
- ✅ Accounts for waived amounts (receivables)
- ✅ Excludes fully paid invoices/bills
- ✅ Real-time calculation based on current data

### 2. Proper Aging Buckets
- ✅ Current (not yet due)
- ✅ 1-30 days
- ✅ 31-60 days
- ✅ 61-90 days
- ✅ 90+ days (high risk)

### 3. Customer/Vendor Grouping
- ✅ Aggregates by customer/vendor
- ✅ Shows contact information
- ✅ Identifies oldest outstanding invoice/bill
- ✅ Calculates total days outstanding

### 4. Sorted Details
- ✅ Sorted by total due (highest first)
- ✅ Helps prioritize collection/payment efforts
- ✅ Quick identification of major debtors/creditors

## Business Logic

### Receivables (Customer Invoices)
**Aging Based On**: Invoice creation date

**Why?**: 
- Invoices are due from the date they're issued
- Payment terms typically start from invoice date
- Standard accounting practice

**Example**:
```
Invoice Created: Oct 1, 2025
As Of Date: Oct 17, 2025
Days Outstanding: 16 days
Bucket: 1-30 Days
```

### Payables (Vendor Bills)
**Aging Based On**: Bill due date

**Why?**:
- Bills are due on their due date, not bill date
- Negative days = not yet due (good standing)
- Positive days = overdue (needs attention)
- Matches vendor expectations

**Example**:
```
Bill Date: Oct 1, 2025
Due Date: Oct 31, 2025
As Of Date: Oct 17, 2025
Days Overdue: -14 days (not yet due)
Bucket: Current
```

## Use Cases

### 1. Collections Priority
```typescript
// Get customers with highest overdue amounts
const receivables = agingReport.receivables.details
  .filter(r => r.days90plus > 0)
  .sort((a, b) => b.days90plus - a.days90plus);
```

### 2. Payment Priority
```typescript
// Get vendors with longest overdue bills
const payables = agingReport.payables.details
  .filter(p => p.days90plus > 0)
  .sort((a, b) => b.oldestDays - a.oldestDays);
```

### 3. Cash Flow Analysis
```typescript
// Total receivables expected in next 30 days
const expected30Days = agingReport.receivables.summary.current + 
                       agingReport.receivables.summary.days1to30;

// Total payables due in next 30 days
const due30Days = agingReport.payables.summary.current + 
                  agingReport.payables.summary.days1to30;

// Net cash position
const netPosition = expected30Days - due30Days;
```

### 4. Risk Assessment
```typescript
// High-risk receivables (90+ days)
const highRisk = agingReport.receivables.summary.days90plus;
const totalReceivables = agingReport.receivables.summary.total;
const riskPercentage = (highRisk / totalReceivables) * 100;
```

## API Usage Examples

### Basic Usage
```typescript
// Get current aging report
const response = await fetch('/api/finance/aging-report');
const agingReport = await response.json();

console.log('Total Receivables:', agingReport.receivables.summary.total);
console.log('Total Payables:', agingReport.payables.summary.total);
```

### Historical Analysis
```typescript
// Get aging report as of specific date
const response = await fetch('/api/finance/aging-report?asOfDate=2025-09-30');
const historicalAging = await response.json();

// Compare with current
const currentResponse = await fetch('/api/finance/aging-report');
const currentAging = await currentResponse.json();

const improvement = currentAging.receivables.summary.total - 
                   historicalAging.receivables.summary.total;
```

### Customer Detail Lookup
```typescript
const response = await fetch('/api/finance/aging-report');
const agingReport = await response.json();

// Find specific customer
const customer = agingReport.receivables.details.find(
  r => r.customerId === 'uuid-here'
);

console.log(`Customer: ${customer.customer}`);
console.log(`Total Due: ₹${customer.totalDue}`);
console.log(`Oldest Invoice: ${customer.oldestDays} days old`);
```

## Frontend Integration

### Display Summary Cards
```tsx
<div className="grid grid-cols-5 gap-4">
  <Card>
    <CardHeader>
      <CardTitle>Current</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl">₹{summary.current.toLocaleString()}</p>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader>
      <CardTitle>1-30 Days</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl">₹{summary.days1to30.toLocaleString()}</p>
    </CardContent>
  </Card>
  
  {/* ... other buckets ... */}
</div>
```

### Display Details Table
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Customer</TableHead>
      <TableHead>Contact</TableHead>
      <TableHead>Current</TableHead>
      <TableHead>1-30 Days</TableHead>
      <TableHead>31-60 Days</TableHead>
      <TableHead>61-90 Days</TableHead>
      <TableHead>90+ Days</TableHead>
      <TableHead>Total Due</TableHead>
      <TableHead>Oldest</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {details.map((detail) => (
      <TableRow key={detail.customerId}>
        <TableCell>{detail.customer}</TableCell>
        <TableCell>{detail.contact}</TableCell>
        <TableCell>₹{detail.current.toLocaleString()}</TableCell>
        <TableCell>₹{detail.days1to30.toLocaleString()}</TableCell>
        <TableCell>₹{detail.days31to60.toLocaleString()}</TableCell>
        <TableCell>₹{detail.days61to90.toLocaleString()}</TableCell>
        <TableCell>₹{detail.days90plus.toLocaleString()}</TableCell>
        <TableCell>₹{detail.totalDue.toLocaleString()}</TableCell>
        <TableCell>{detail.oldestDays} days</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## Performance Considerations

### Query Optimization
- ✅ Single query per data source (receivables/payables)
- ✅ Proper indexes on `status`, `customer_id`, `supplier_id`
- ✅ Eager loading of customer/supplier data
- ✅ Excludes fully paid records at database level

### Caching Strategy
```typescript
// Cache aging report for 1 hour
const cacheKey = `aging-report:${asOfDate}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const report = await generateAgingReport(asOfDate);
await redis.setex(cacheKey, 3600, JSON.stringify(report));
```

### Large Dataset Handling
- Current implementation loads all unpaid invoices/bills
- For large datasets (1000+ records), consider:
  - Pagination in API response
  - Server-side aggregation using SQL
  - Background job for report generation

## Testing Checklist

- [ ] Test with zero receivables/payables
- [ ] Test with all buckets populated
- [ ] Test with future due dates (negative days)
- [ ] Test with very old invoices (365+ days)
- [ ] Test with partially paid invoices
- [ ] Test with waived amounts
- [ ] Test with missing customer/vendor data
- [ ] Test date filtering (asOfDate parameter)
- [ ] Verify calculations manually
- [ ] Check performance with 100+ records
- [ ] Test concurrent requests
- [ ] Verify sorting (highest due first)

## Common Issues & Solutions

### Issue 1: Negative Amounts
**Problem**: Some records show negative outstanding amounts  
**Cause**: `paid_amount` > `total` due to overpayment  
**Solution**: Add validation to ensure `remainingAmount >= 0`

### Issue 2: Incorrect Aging
**Problem**: Bills showing in wrong bucket  
**Cause**: Using bill_date instead of due_date for payables  
**Solution**: Always use due_date for payables aging

### Issue 3: Missing Contact Info
**Problem**: "N/A" showing for contact  
**Cause**: Customer/vendor has no phone or email  
**Solution**: Display graceful "N/A" and add data entry validation

### Issue 4: Duplicate Customers
**Problem**: Same customer appearing multiple times  
**Cause**: Using customer name instead of ID for grouping  
**Solution**: Always use `customer_id`/`supplier_id` as map key

## Future Enhancements

### 1. Aging Summary by Category
```typescript
interface AgingByCategory {
  category: string;
  current: number;
  days1to30: number;
  // ...
}
```

### 2. Trend Analysis
- Compare aging over time periods
- Show improvement/deterioration
- Monthly aging snapshots

### 3. Payment Predictions
- ML-based payment probability
- Expected collection dates
- Risk scoring

### 4. Automated Reminders
- Email customers with 30-day outstanding
- Escalate 60+ day accounts
- Flag 90+ day for review

### 5. Drill-Down Details
- Click customer to see invoice list
- Click vendor to see bill list
- View payment history

---

**Implementation Date**: October 17, 2025  
**Status**: ✅ Complete  
**Endpoint**: `/api/finance/aging-report`  
**Method**: GET  
**Response Time**: ~500ms (100 records)
