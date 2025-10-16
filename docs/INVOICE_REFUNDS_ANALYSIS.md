# Invoice Refunds Deep Analysis

## Schema Structure

### `invoice_refunds` Table
```sql
- id: uuid (PK)
- invoice_id: uuid (FK → invoices.id) NOT NULL
- return_id: uuid (FK → returns.id) - OPTIONAL
- refund_amount: numeric (>0) NOT NULL
- refund_type: 'full' | 'partial' | 'return_based'
- reason: text NOT NULL
- refund_method: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'adjustment'
- bank_account_id: uuid (FK → bank_accounts.id) - OPTIONAL
- reference_number: varchar - OPTIONAL
- status: 'pending' | 'approved' | 'processed' | 'rejected' | 'cancelled' | 'reversed' (DEFAULT: 'pending')
- requested_by: uuid (FK → users.id) NOT NULL
- approved_by: uuid (FK → users.id) - OPTIONAL
- processed_by: uuid (FK → users.id) - OPTIONAL
- approved_at: timestamp - OPTIONAL
- processed_at: timestamp - OPTIONAL
- created_at: timestamp (DEFAULT: now())
- updated_at: timestamp (DEFAULT: now())
- notes: text - OPTIONAL
```

### Related Tables

#### `invoices` Table
```sql
- id: uuid (PK)
- sales_order_id: uuid
- customer_id: uuid (FK → customers.id)
- customer_name: text
- total: numeric
- paid_amount: numeric (DEFAULT: 0)
- status: invoice_status (DEFAULT: 'unpaid')
- total_refunded: numeric (DEFAULT: 0)
- refund_status: 'none' | 'partial' | 'full' (DEFAULT: 'none')
- waived_amount: numeric (DEFAULT: 0)
- created_at: timestamp
```

#### `customers` Table
```sql
- id: uuid (PK)
- name: text NOT NULL
- email: text UNIQUE
- phone: text
- address: text
- city: varchar
- state: varchar
- status: text (DEFAULT: 'Lead')
- created_at: timestamp
```

## Current API Query Analysis

### API Endpoint: `/api/finance/refunds`

**Query Structure:**
```javascript
supabase
  .from('invoice_refunds')
  .select(`
    *,
    invoice:invoice_id (
      id, sales_order_id, customer_id, customer_name, total, paid_amount,
      customers:customer_id (name, email, phone)
    ),
    return:return_id (id, return_type, reason),
    bank_account:bank_account_id (name, account_number),
    requested_by_user:requested_by (name, email),
    approved_by_user:approved_by (name, email),
    processed_by_user:processed_by (name, email)
  `)
```

### Relationship Chain for Customer Info

**The query attempts this join path:**
```
invoice_refunds
  → invoice (via invoice_id)
    → customers (via customer_id)
```

**CRITICAL ISSUE IDENTIFIED:**
The `invoices` table has BOTH:
1. `customer_id` (uuid FK to customers table)
2. `customer_name` (text - denormalized copy)

The query tries: `customers:customer_id (name, email, phone)`

**This is nested relationship syntax that may fail if:**
- The invoice doesn't have a customer_id (only customer_name)
- The customer_id references a deleted customer
- RLS policies block the nested query

## Data Transformation Logic

```typescript
customer_name: refund.invoice?.customer_name || refund.invoice?.customers?.name || 'Unknown Customer'
customer_email: refund.invoice?.customers?.email || ''
customer_phone: refund.invoice?.customers?.phone || ''
```

**Fallback Chain:**
1. Try `invoice.customer_name` (denormalized text field) ✅
2. Try `invoice.customers.name` (joined customer record)
3. Default to 'Unknown Customer'

## Status Filtering

**Frontend Request:**
```
/api/finance/refunds?status=pending,approved&limit=1000
```

**API Filter Logic:**
```javascript
const statuses = ['pending', 'approved']
query = query.in('status', statuses)
```

**Valid Status Values:**
- 'pending' (default)
- 'approved'
- 'processed' (excluded - refund completed)
- 'rejected' (excluded - refund denied)
- 'cancelled' (excluded - refund cancelled)
- 'reversed' (excluded - refund reversed)

## Potential Issues

### 1. **Empty Table**
- Most likely: No records in `invoice_refunds` table
- Check: Console log will show `total: 0`

### 2. **Status Mismatch**
- All refunds might be 'processed', 'rejected', or 'cancelled'
- Check: Console log will show statuses array

### 3. **Nested Join Failure**
- The `customers:customer_id` nested join might be failing
- Solution: Use invoice.customer_name instead of relying on join

### 4. **RLS Policies**
- Row Level Security might block the query
- Using SUPABASE_SERVICE_ROLE_KEY should bypass this

### 5. **Amount Filter**
- Frontend filters `refund_amount > 0`
- This is redundant (schema constraint already enforces this)

## Recommended Fixes

### Option 1: Simplify the Query (RECOMMENDED)
Remove nested customer join, rely on denormalized `customer_name`:

```typescript
.select(`
  *,
  invoice:invoice_id (
    id,
    customer_name,
    total
  ),
  bank_account:bank_account_id (name, account_number),
  requested_by_user:requested_by (name, email)
`)
```

Then transform:
```typescript
customer_name: refund.invoice?.customer_name || 'Unknown Customer'
```

### Option 2: Separate Customer Query
If customer contact info is needed, query separately:

```typescript
// 1. Get refunds
const refunds = await supabase.from('invoice_refunds')...

// 2. Get customer IDs from invoices
const customerIds = refunds.map(r => r.invoice?.customer_id).filter(Boolean)

// 3. Fetch customer details
const customers = await supabase.from('customers')
  .select('id, name, email, phone')
  .in('id', customerIds)

// 4. Merge data
```

### Option 3: Use Left Join
Ensure the join doesn't fail if customer is missing:

```typescript
invoice:invoice_id!left (
  id,
  customer_name,
  customers:customer_id!left (name, email, phone)
)
```

## Testing Checklist

### Server-Side Logs (Check Terminal)
```
🔍 Invoice Refunds Query Result:
  - totalFound: ? (number of records)
  - statusFilter: "pending,approved"
  - firstRefund: {...} (sample record)
  - allStatuses: ['pending', 'approved', ...] (all status values)
```

### Client-Side Logs (Check Browser Console)
```
📋 ALL Invoice Refunds (no filter):
  - total: ? (total records in table)
  - count: ? (records returned)
  - statuses: [...] (all status values)

🔍 Invoice Refunds API Response:
  - totalRefunds: ? (filtered count)
  - firstRefund: {...} (sample record)

✅ Pending Invoice Refunds to Display:
  - Final array that will be shown
```

## Expected Behavior

**If table is empty:**
```
total: 0, count: 0, statuses: []
```

**If refunds exist but wrong status:**
```
total: 5, count: 0, statuses: ['processed', 'rejected']
```

**If refunds exist with correct status:**
```
total: 5, count: 2, statuses: ['pending', 'approved', 'processed']
✅ Pending Invoice Refunds to Display: 2 [...]
```

## Schema Insights

### Refund Lifecycle
1. **pending** - Initial state, awaiting approval
2. **approved** - Approved by manager, awaiting processing
3. **processed** - Money refunded to customer (NOT shown in payables)
4. **rejected** - Refund denied
5. **cancelled** - Refund cancelled
6. **reversed** - Refund reversed after processing

### Why Only 'pending' and 'approved'?
These represent **money owed to customers** (liabilities). Once 'processed', the company has paid the customer back, so it's no longer a liability.

### Refund Types
- **full** - Full invoice amount refunded
- **partial** - Partial refund
- **return_based** - Refund tied to a product return (has return_id)

### Refund Methods
- cash
- bank_transfer
- credit_card
- cheque
- adjustment (credit note)

## Next Steps

1. **Check Console Logs** - Determine if table is empty or status mismatch
2. **Simplify Query** - Remove nested customer join if causing issues
3. **Add Sample Data** - If table is empty, create test refund records
4. **Update Frontend** - Adjust filtering/display based on findings

## SQL to Check Data

```sql
-- Check if any refunds exist
SELECT COUNT(*) FROM invoice_refunds;

-- Check status distribution
SELECT status, COUNT(*) 
FROM invoice_refunds 
GROUP BY status;

-- Check pending/approved refunds
SELECT 
  ir.id,
  ir.refund_amount,
  ir.status,
  i.customer_name,
  c.name as customer_name_from_join,
  c.email,
  c.phone
FROM invoice_refunds ir
LEFT JOIN invoices i ON ir.invoice_id = i.id
LEFT JOIN customers c ON i.customer_id = c.id
WHERE ir.status IN ('pending', 'approved')
ORDER BY ir.created_at DESC;
```
