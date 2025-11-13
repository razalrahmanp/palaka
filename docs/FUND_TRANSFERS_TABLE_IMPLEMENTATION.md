# Fund Transfers Table Implementation

## Overview
Created a dedicated `fund_transfers` table to properly track fund transfer records between bank accounts. This provides a centralized location for transfer history and enables better audit trails.

## Database Schema

### Fund Transfers Table
```sql
CREATE TABLE public.fund_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_account_id UUID NOT NULL,
    to_account_id UUID NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    reference TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fund_transfers_from_account_fkey FOREIGN KEY (from_account_id) 
        REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fund_transfers_to_account_fkey FOREIGN KEY (to_account_id) 
        REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fund_transfers_created_by_fkey FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL,
    
    -- Business logic constraints
    CONSTRAINT fund_transfers_different_accounts CHECK (from_account_id != to_account_id)
);
```

### Indexes
- `idx_fund_transfers_from_account` on `from_account_id`
- `idx_fund_transfers_to_account` on `to_account_id`
- `idx_fund_transfers_transfer_date` on `transfer_date`
- `idx_fund_transfers_status` on `status`
- `idx_fund_transfers_created_at` on `created_at`

## API Implementation

### POST /api/finance/fund-transfer

**Updated Flow:**
1. **Create fund_transfer record** (NEW)
   - Stores complete transfer metadata
   - Returns transfer ID

2. **Create withdrawal bank_transaction**
   - Links to fund_transfer via `source_record_id`
   - `transaction_type: 'fund_transfer'`

3. **Create deposit bank_transaction**
   - Links to same fund_transfer via `source_record_id`
   - `transaction_type: 'fund_transfer'`

4. **Return transfer details**
   - Includes `transfer_id` for reference

**Code Changes:**
```typescript
// Before: Generated UUID
const transferId = crypto.randomUUID();

// After: Create record first, use real ID
const { data: fundTransfer } = await supabaseAdmin
  .from('fund_transfers')
  .insert({
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    amount: amount,
    transfer_date: date,
    description: transferDescription,
    reference: transferReference,
    status: 'completed'
  })
  .select()
  .single();

const transferId = fundTransfer.id; // Use real ID
```

### GET /api/finance/fund-transfer

**Query Parameters:**
- `account_id` - Filter by specific account (matches either from or to)
- `start_date` - Filter by start date
- `end_date` - Filter by end date
- `limit` - Results per page (default: 50)
- `page` - Page number (default: 1)

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2025-11-13",
      "amount": 10000,
      "description": "Fund transfer from Cash to Bank",
      "reference": "TXN-1731456789",
      "status": "completed",
      "fromAccount": {
        "id": "uuid",
        "name": "Cash Account",
        "accountNumber": null,
        "accountType": "CASH"
      },
      "toAccount": {
        "id": "uuid",
        "name": "HDFC Bank",
        "accountNumber": "12345678",
        "accountType": "BANK"
      },
      "createdAt": "2025-11-13T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

## Benefits

### 1. Proper Data Structure
- Dedicated table for transfers (not just scattered transactions)
- Complete transfer metadata in one place
- Real foreign keys to both accounts

### 2. Better Audit Trail
- Each transfer has a unique ID
- Status tracking (pending, completed, failed, cancelled)
- Timestamp tracking (created_at, updated_at)
- User tracking (created_by)

### 3. Easy Reconciliation
- Query all transfers between specific accounts
- Find transfers by date range
- Track transfer status
- Link back to bank_transactions via `source_record_id`

### 4. Reporting
- Get transfer history for any account
- Calculate total transfers per period
- Analyze transfer patterns between accounts
- Track pending/failed transfers

## Relationship with Bank Transactions

Each fund_transfer creates **TWO** bank_transactions:

1. **Withdrawal** from source account
   - `type: 'withdrawal'`
   - `transaction_type: 'fund_transfer'`
   - `source_record_id: fund_transfer.id`

2. **Deposit** to destination account
   - `type: 'deposit'`
   - `transaction_type: 'fund_transfer'`
   - `source_record_id: fund_transfer.id`

Both transactions reference the same `fund_transfers.id`, making it easy to:
- Find both sides of a transfer
- Verify transfer integrity
- Track fund movement between accounts

## Migration Steps

1. **Run Migration Script:**
   ```bash
   psql -d your_database -f database/migrations/create_fund_transfers_table.sql
   ```

2. **Verify Table Creation:**
   ```sql
   \d fund_transfers
   -- Should show all columns, constraints, and indexes
   ```

3. **Deploy API Changes:**
   - Deploy updated `src/app/api/finance/fund-transfer/route.ts`

4. **Test:**
   - Create a fund transfer via UI
   - Verify fund_transfers record created
   - Verify two bank_transactions created with same source_record_id
   - Query GET endpoint to see transfer history

## Query Examples

### Get all transfers for an account
```sql
SELECT 
  ft.*,
  fa.name as from_account_name,
  ta.name as to_account_name
FROM fund_transfers ft
JOIN bank_accounts fa ON ft.from_account_id = fa.id
JOIN bank_accounts ta ON ft.to_account_id = ta.id
WHERE ft.from_account_id = 'account-uuid' 
   OR ft.to_account_id = 'account-uuid'
ORDER BY ft.transfer_date DESC;
```

### Find linked bank_transactions for a transfer
```sql
SELECT 
  bt.*,
  ba.name as account_name
FROM bank_transactions bt
JOIN bank_accounts ba ON bt.bank_account_id = ba.id
WHERE bt.source_record_id = 'fund-transfer-uuid'
  AND bt.transaction_type = 'fund_transfer'
ORDER BY bt.type; -- withdrawal first, then deposit
```

### Verify transfer integrity (should always be 2 transactions per transfer)
```sql
SELECT 
  ft.id,
  ft.amount,
  ft.status,
  COUNT(bt.id) as transaction_count,
  SUM(CASE WHEN bt.type = 'withdrawal' THEN bt.amount ELSE 0 END) as withdrawal_amount,
  SUM(CASE WHEN bt.type = 'deposit' THEN bt.amount ELSE 0 END) as deposit_amount
FROM fund_transfers ft
LEFT JOIN bank_transactions bt ON bt.source_record_id = ft.id
WHERE ft.transfer_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ft.id, ft.amount, ft.status
HAVING COUNT(bt.id) != 2; -- Find any transfers that don't have exactly 2 transactions
```

### Get transfer summary by account
```sql
SELECT 
  ba.name as account_name,
  COUNT(DISTINCT ft.id) as total_transfers,
  SUM(CASE WHEN ft.from_account_id = ba.id THEN ft.amount ELSE 0 END) as total_outgoing,
  SUM(CASE WHEN ft.to_account_id = ba.id THEN ft.amount ELSE 0 END) as total_incoming
FROM bank_accounts ba
LEFT JOIN fund_transfers ft ON ba.id IN (ft.from_account_id, ft.to_account_id)
WHERE ft.transfer_date >= '2025-11-01'
  AND ft.transfer_date <= '2025-11-30'
GROUP BY ba.id, ba.name
ORDER BY total_transfers DESC;
```

## Frontend Updates (Optional Enhancement)

Consider adding a Fund Transfer History view in the UI:
- Display transfer list from GET endpoint
- Show from/to accounts with arrows
- Color code by status (completed, pending, failed)
- Add filters (date range, account, status)
- Link to source transactions in bank statement

## Summary

✅ **New Table Created**: `fund_transfers` with proper structure and indexes  
✅ **API Updated**: POST creates record first, GET queries from new table  
✅ **Integration Complete**: bank_transactions properly linked via `source_record_id`  
✅ **Better Tracking**: Full audit trail with status, timestamps, and user tracking  

Fund transfers now have a proper home in the database with complete metadata tracking! 🎉
