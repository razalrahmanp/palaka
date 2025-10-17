# Aging Report Schema Fix - October 17, 2025

## Issue
API was throwing PostgreSQL error when fetching vendor bills:
```
Error: column suppliers_1.phone does not exist
code: '42703'
```

## Root Cause
The `suppliers` table schema uses `contact` field instead of `phone` field:

```sql
CREATE TABLE public.suppliers (
  id uuid,
  name text,
  contact text,    -- ✅ Phone/contact info here
  email text,
  address text,
  -- NO phone column!
)
```

Meanwhile, the API was querying for `phone`:
```typescript
suppliers (
  id,
  name,
  email,
  phone  // ❌ This column doesn't exist!
)
```

## Fix Applied

### Changed Query (Line 192-204)
```typescript
// BEFORE (Wrong)
suppliers (
  id,
  name,
  email,
  phone  // ❌ Error!
)

// AFTER (Fixed)
suppliers (
  id,
  name,
  email,
  contact  // ✅ Correct column name
)
```

### Changed Field Access (Line 238)
```typescript
// BEFORE (Wrong)
const supplierContact = supplier?.phone || supplier?.email || 'N/A';

// AFTER (Fixed)
const supplierContact = supplier?.contact || supplier?.email || 'N/A';
```

## Verification

### Schema Comparison

**customers table** (has phone):
```sql
CREATE TABLE public.customers (
  phone text,  -- ✅ Has phone column
  email text
)
```

**suppliers table** (uses contact):
```sql
CREATE TABLE public.suppliers (
  contact text,  -- ✅ Uses contact column
  email text
)
```

### API Response Structure

**Receivables (correct)**:
```typescript
{
  customer: "Customer Name",
  contact: "9876543210",  // From customers.phone
  ...
}
```

**Payables (now fixed)**:
```typescript
{
  vendor: "Vendor Name",
  contact: "9876543210",  // From suppliers.contact ✅
  ...
}
```

## Testing

### Test API Endpoint
```bash
# Test receivables
curl http://localhost:3000/api/finance/aging-report?type=receivables

# Test payables
curl http://localhost:3000/api/finance/aging-report?type=payables

# Test both (default)
curl http://localhost:3000/api/finance/aging-report
```

### Expected Response
```json
{
  "asOfDate": "2025-10-17",
  "receivables": {
    "summary": { "total": 0, ... },
    "details": []
  },
  "payables": {
    "summary": { "total": 0, ... },
    "details": [
      {
        "vendor": "Supplier ABC",
        "contact": "9876543210",  // ✅ Now works!
        "totalDue": 50000,
        ...
      }
    ]
  },
  "generatedAt": "2025-10-17T..."
}
```

## Why Different Column Names?

### Historical Context
- **customers** table: Designed for B2C, includes separate `phone` field for direct customer contact
- **suppliers** table: Designed for B2B, uses generic `contact` field which can be phone, person name, or department

### Best Practice Going Forward
Should consider standardizing to one approach:

**Option 1**: Add `phone` column to suppliers
```sql
ALTER TABLE suppliers ADD COLUMN phone text;
UPDATE suppliers SET phone = contact WHERE contact ~ '^[0-9]+$';
```

**Option 2**: Rename `phone` to `contact` in customers (breaking change)
```sql
-- Not recommended due to existing code dependencies
```

**Option 3**: Keep as-is (current approach) ✅
- Document the difference
- Use abstraction in API layer
- Both approaches work, just need awareness

## Files Modified

1. **src/app/api/finance/aging-report/route.ts**
   - Line 192-204: Changed query from `phone` to `contact`
   - Line 238: Changed field access from `supplier?.phone` to `supplier?.contact`

## Impact

### Before Fix
- ❌ API returns 500 error
- ❌ Payables aging report fails to load
- ❌ Frontend shows "No payables aging data available"

### After Fix
- ✅ API returns 200 with valid data
- ✅ Payables aging report displays correctly
- ✅ Vendor contact information shows properly
- ✅ Both receivables and payables work

## Related Documentation

See also:
- `docs/AGING_REPORT_IMPLEMENTATION.md` - Full API documentation
- `database/schema.sql` lines 1917-1928 - Suppliers table definition
- `database/schema.sql` lines 411-432 - Customers table definition

---

**Fixed Date**: October 17, 2025  
**Status**: ✅ Resolved  
**Error Code**: 42703 (Column does not exist)  
**Fix**: Changed `phone` → `contact` for suppliers table
