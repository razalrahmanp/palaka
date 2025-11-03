# Customer Status Management System

## Status Definitions

### 🔵 Lead
- **Definition**: Potential customer who hasn't made any purchase
- **Criteria**: No sales orders exist for this customer
- **Use Case**: New inquiries, prospects, potential customers

### 🟢 Active  
- **Definition**: Customer with outstanding payments
- **Criteria**: Has sales orders with invoices that are 'unpaid' or 'partial'
- **Use Case**: Current customers with pending payments or ongoing orders

### ⚫ Closed
- **Definition**: Customer who has completed all payments
- **Criteria**: All invoices are in 'paid' status (no unpaid/partial invoices)
- **Use Case**: Fully paid customers, completed transactions

## Implementation

### Manual Migration
Run this SQL to update all existing customer statuses:
```bash
psql -d your_database < database/migrations/update_customer_status.sql
```

### Automatic Updates (Triggers)
Install triggers for automatic status updates:
```bash
psql -d your_database < database/migrations/customer_status_triggers.sql
```

## Automatic Status Updates

Once triggers are installed, customer status will automatically update when:

1. **New Sales Order Created**: 
   - Lead → Active (customer makes first order)

2. **Invoice Status Changes**:
   - Invoice marked 'unpaid' or 'partial' → Customer becomes Active
   - All invoices marked 'paid' → Customer becomes Closed

3. **Invoice Deleted**:
   - If last invoice is deleted → Customer may revert to Lead

## Verification

Check current status distribution:
```sql
SELECT 
  status, 
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM customers
WHERE is_deleted = false
GROUP BY status;
```

## Dashboard Impact

The CRM Dashboard's "Revenue by Segment" chart will now show:
- Revenue by Lead (should be 0 ideally)
- Revenue by Active (current unpaid orders)
- Revenue by Closed (completed paid orders)

This provides better insight into your revenue pipeline!
