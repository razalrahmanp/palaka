# Manual Test: Check Refunds API Response

## Test the API directly

### URL to test:
```
http://localhost:3000/api/finance/refunds?limit=1000
```

### Expected Response Format:
```json
{
  "refunds": [
    {
      "id": "...",
      "return_id": "...",  ← MUST BE PRESENT!
      "refund_amount": 5000,
      "status": "pending",  ← Should be 'pending', 'approved', or 'processed'
      "customer_name": "KV NASAR",
      ...
    },
    {
      "id": "...",
      "return_id": "...",
      "refund_amount": 1500,
      "status": "pending",
      "customer_name": "ASEES",
      ...
    }
  ],
  "pagination": {
    "total": 2
  }
}
```

### What to Check:

1. **Total count**: Should be 2 or 4 (depending on if you created the missing invoices)

2. **return_id field**: Each refund MUST have `return_id` populated
   - If NULL or missing → Frontend can't match to returns
   
3. **Status**: Should be 'pending', 'approved', or 'processed'
   - If 'cancelled' or 'rejected' → Frontend filters them out

4. **Amount**: Should match what we inserted (5000, 1500, etc.)

### If API returns empty array:
- Refunds weren't created in database
- Run the SQL verification queries

### If API returns refunds but return_id is NULL:
- Database has refunds but they're not linked to returns
- Need to UPDATE invoice_refunds SET return_id

### If API returns correct data but UI shows ₹0:
- Frontend caching issue
- Try incognito/private browsing mode
- Check browser console for errors
