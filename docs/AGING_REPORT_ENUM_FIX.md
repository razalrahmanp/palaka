# Aging Report Enum Fix - October 17, 2025

## Issue
API was throwing PostgreSQL enum validation error:
```
Error: invalid input value for enum sales_order_status: "cancelled"
code: '22P02'
```

## Root Cause
The query was trying to filter out "cancelled" status:
```typescript
.not('status', 'in', '("cancelled")')
```

But the `sales_order_status` enum doesn't have a "cancelled" value!

## Actual Enum Values

### sales_order_status enum (from database/enum.sql)
```
draft
confirmed
shipped
delivered
ready_for_delivery
partial_delivery_ready
```

**Note**: No "cancelled" status exists in the enum! ❌

## Fix Applied

### Changed Query Filter (Line 82-98)

**BEFORE (Wrong):**
```typescript
.not('status', 'in', '("cancelled")')  // ❌ Invalid enum value
```

**AFTER (Fixed):**
```typescript
// Only include orders that represent actual receivables
.in('status', [
  'confirmed',              // Order confirmed, awaiting delivery
  'shipped',                // Shipped to customer
  'delivered',              // Delivered, payment may be pending
  'ready_for_delivery',     // Ready for pickup/delivery
  'partial_delivery_ready'  // Partial order ready
])
```

## Why This Approach?

### Orders That Represent Receivables
1. **confirmed** - Customer committed, payment may be pending
2. **shipped** - In transit, invoice generated
3. **delivered** - Completed, customer owes payment
4. **ready_for_delivery** - Fulfilled, awaiting pickup
5. **partial_delivery_ready** - Partial fulfillment, partial payment due

### Orders Excluded (Draft)
- **draft** - Not yet confirmed, no obligation
  - Customer hasn't committed
  - No invoice generated
  - No receivable exists

## Business Logic

### When Does a Receivable Exist?

**Receivable Created:**
```
Customer places order → Status: draft
Customer confirms → Status: confirmed ✅ RECEIVABLE STARTS
System generates invoice → Invoice created
Customer pays → Payment recorded
```

**Receivable Cleared:**
```
Invoice fully paid → Status: paid
  OR
Amount waived → Waived recorded
  OR
Refund issued → Refund processed
```

### Why Not Just Exclude Draft?

We could use:
```typescript
.neq('status', 'draft')
```

But explicit inclusion is better because:
- ✅ More maintainable (explicit business rules)
- ✅ Handles future enum additions safely
- ✅ Self-documenting (shows which statuses matter)
- ✅ Prevents accidental inclusion of new statuses

## Testing

### Test Case 1: Confirmed Order
```
Order Status: confirmed
Grand Total: ₹50,000
Paid: ₹20,000
Expected: Show ₹30,000 in receivables ✓
```

### Test Case 2: Draft Order
```
Order Status: draft
Grand Total: ₹100,000
Paid: ₹0
Expected: NOT in receivables (not confirmed) ✓
```

### Test Case 3: Delivered Order
```
Order Status: delivered
Grand Total: ₹75,000
Paid: ₹75,000
Expected: NOT in receivables (fully paid) ✓
```

### Test Case 4: Shipped Order
```
Order Status: shipped
Grand Total: ₹30,000
Paid: ₹10,000
Expected: Show ₹20,000 in receivables ✓
```

## API Response After Fix

### Request
```
GET /api/finance/aging-report?type=receivables
```

### Response (Success)
```json
{
  "asOfDate": "2025-10-17",
  "receivables": {
    "summary": {
      "current": 150000,
      "days1to30": 80000,
      "days31to60": 45000,
      "days61to90": 20000,
      "days90plus": 10000,
      "total": 305000
    },
    "details": [
      {
        "customer": "ABC Corporation",
        "customerId": "uuid-123",
        "contact": "9876543210",
        "current": 50000,
        "days1to30": 30000,
        "days31to60": 0,
        "days61to90": 0,
        "days90plus": 0,
        "totalDue": 80000,
        "oldestInvoiceDate": "2025-09-20",
        "oldestDays": 27
      }
    ]
  },
  "generatedAt": "2025-10-17T..."
}
```

## Related Enum Values

### Other Status Enums in System

**invoice_status:**
```
unpaid
partial
paid
overdue
```

**vendor_bills.status:**
```
pending
partial
paid
overdue
cancelled  ← This one HAS cancelled!
```

**Key Difference:**
- ❌ `sales_order_status` - NO cancelled
- ✅ `vendor_bills.status` - HAS cancelled

## Future Considerations

### If "cancelled" Status Added
If the enum is updated to include "cancelled":
```sql
ALTER TYPE sales_order_status ADD VALUE 'cancelled';
```

Then update the query:
```typescript
// Option 1: Exclude cancelled
.neq('status', 'cancelled')

// Option 2: Still use explicit inclusion (recommended)
.in('status', ['confirmed', 'shipped', 'delivered', ...])
// Don't add 'cancelled' to the list
```

### Recommendation
Keep the explicit `.in()` approach:
- ✅ More maintainable
- ✅ Self-documenting
- ✅ Handles future changes safely
- ✅ Clear business intent

## Files Modified

**File:** `src/app/api/finance/aging-report/route.ts`

**Lines:** 82-98

**Change:** 
- Removed: `.not('status', 'in', '("cancelled")')`
- Added: `.in('status', ['confirmed', 'shipped', 'delivered', 'ready_for_delivery', 'partial_delivery_ready'])`

## Verification Steps

1. ✅ Check enum definition: `database/enum.sql` line 12
2. ✅ Verify valid values: `draft, confirmed, shipped, delivered, ready_for_delivery, partial_delivery_ready`
3. ✅ Confirm no "cancelled" value exists
4. ✅ Test API endpoint: `GET /api/finance/aging-report?type=receivables`
5. ✅ Verify 200 OK response
6. ✅ Check receivables data displays correctly

---

**Fixed Date**: October 17, 2025  
**Status**: ✅ Resolved  
**Error Code**: 22P02 (Invalid enum value)  
**Fix**: Changed from `.not('cancelled')` to `.in([valid statuses])`  
**Impact**: Receivables aging now loads successfully
