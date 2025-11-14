# Bajaj Finance Reconciliation System

## Problem Statement

When customers purchase using Bajaj Finance EMI:
1. Bajaj deposits money to our ICICI bank account
2. We don't know the exact amount until we receive the bank statement
3. Bajaj may deduct charges (processing fees, GST, bank charges)
4. This causes discrepancies and negative balances in our system

## Solution Architecture

### 1. **Expected Deposits Tracking**
- When a sales order is created with Bajaj finance, automatically create an "expected deposit" record
- Track: Order amount, expected deposit amount, finance company, expected date

### 2. **Bank Statement Import & Reconciliation**
- Import bank statements (CSV/Excel)
- Match deposits with expected Bajaj payments
- Handle variances (charges deducted by Bajaj)

### 3. **Variance Management**
- Track charges: Processing fees, GST, bank charges
- Auto-calculate variance between expected and received
- Flag transactions needing manual review

## Database Schema

### Tables Created:

1. **`bajaj_expected_deposits`** - Tracks expected payments
   - Links to sales_order_id
   - Stores expected vs received amounts
   - Tracks reconciliation status

2. **`bajaj_charges`** - Records deductions
   - Processing fees, GST, bank charges
   - Links to expected deposit

3. **`bank_statement_imports`** - Import history
   - Tracks statement uploads
   - Statistics on matched/unmatched

4. **`unmatched_bank_deposits`** - Pending reconciliation
   - Deposits from bank statements
   - Not yet matched to orders

## Workflow

### Step 1: Order Creation
```
Customer purchases with Bajaj Finance
↓
Sales order created with payment_method = 'bajaj_finance'
↓
Trigger automatically creates bajaj_expected_deposits record
  - Expected amount: ₹50,000
  - Expected date: Order date + 7 days
  - Status: pending
```

### Step 2: Bank Statement Import
```
Download bank statement from ICICI
↓
Import CSV/Excel to system
↓
System creates unmatched_bank_deposits records
  - Date: 2025-11-15
  - Amount: ₹49,500 (Bajaj deducted ₹500 charges)
  - Reference: "BAJAJ-EMI-12345"
  - Status: unmatched
```

### Step 3: Reconciliation (Auto + Manual)
```
System auto-matches:
  - Matches by amount (within tolerance)
  - Matches by date range
  - Matches by reference keywords
↓
Manual review for variances:
  - Expected: ₹50,000
  - Received: ₹49,500
  - Variance: -₹500
↓
Create bajaj_charges record:
  - Type: bank_charges
  - Amount: ₹500
↓
Create bank_transaction:
  - Type: deposit
  - Amount: ₹49,500
  - Link to sales order
↓
Update expected_deposit:
  - Status: variance
  - Received: ₹49,500
  - Variance: -₹500
```

## API Endpoints Needed

### 1. Expected Deposits
```
GET  /api/finance/bajaj/expected-deposits
POST /api/finance/bajaj/expected-deposits
PUT  /api/finance/bajaj/expected-deposits/:id
```

### 2. Bank Statement Import
```
POST /api/finance/bank-statements/import
GET  /api/finance/bank-statements/unmatched
```

### 3. Reconciliation
```
POST /api/finance/bajaj/reconcile
GET  /api/finance/bajaj/reconciliation-dashboard
POST /api/finance/bajaj/manual-match
```

## UI Components Needed

### 1. **Bajaj Reconciliation Dashboard**
Location: `/finance/reconciliation/bajaj`

Features:
- List of pending expected deposits
- Import bank statement button
- Unmatched deposits list
- Quick match interface
- Variance approval workflow

### 2. **Bank Statement Import**
- Drag & drop CSV/Excel upload
- Column mapping (Date, Amount, Reference, Description)
- Preview before import
- Auto-match suggestions

### 3. **Reconciliation Interface**
- Side-by-side view: Expected vs Received
- Variance calculator
- Charge type selector
- Approve/Reject buttons
- Notes field

## Business Rules

### Auto-Matching Logic
```typescript
function autoMatch(deposit, expectedDeposits) {
  // Match criteria (in priority order):
  
  1. Exact amount match within date range (±14 days)
  2. Amount within 5% variance + date range
  3. Reference number contains order number
  4. Reference contains "BAJAJ" + amount close
  
  // If multiple matches found → flag for manual review
  // If no matches → add to unmatched list
}
```

### Variance Tolerance
- **Auto-approve**: Variance < ₹100 or < 2%
- **Review required**: Variance ≥ ₹100 or ≥ 2%
- **Alert**: Variance > ₹1,000 or > 5%

### Status Flow
```
pending → received (exact match)
pending → variance (charges deducted)
pending → partially_received (installment received)
variance → received (after approval)
```

## Implementation Priority

### Phase 1: Foundation (Week 1)
- [x] Create database schema
- [ ] Add bajaj_finance fields to sales_orders if not exist
- [ ] Create trigger for auto-creating expected deposits
- [ ] Build basic API endpoints

### Phase 2: Import & Matching (Week 2)
- [ ] Bank statement import API
- [ ] CSV parser with column mapping
- [ ] Auto-matching algorithm
- [ ] Manual matching interface

### Phase 3: Dashboard & Reporting (Week 3)
- [ ] Reconciliation dashboard UI
- [ ] Pending deposits list
- [ ] Unmatched deposits list
- [ ] Quick match interface
- [ ] Variance approval workflow

### Phase 4: Analytics & Automation (Week 4)
- [ ] Reconciliation reports
- [ ] Bajaj charges analysis
- [ ] Auto-reconciliation improvements
- [ ] Email notifications for overdue deposits

## Sample Queries

### Pending Deposits
```sql
SELECT * FROM v_bajaj_reconciliation_status 
WHERE reconciliation_status = 'pending' 
ORDER BY expected_date;
```

### Overdue Deposits
```sql
SELECT * FROM v_bajaj_reconciliation_status 
WHERE reconciliation_status = 'overdue';
```

### Variance Analysis
```sql
SELECT 
  finance_company,
  COUNT(*) as total_transactions,
  SUM(expected_deposit) as total_expected,
  SUM(received_amount) as total_received,
  SUM(variance_amount) as total_variance,
  AVG(variance_amount) as avg_variance
FROM bajaj_expected_deposits
WHERE status IN ('received', 'variance')
GROUP BY finance_company;
```

## Benefits

1. ✅ **Accurate Bank Balance**: Properly track all Bajaj deposits
2. ✅ **Variance Tracking**: Know exactly what charges Bajaj deducts
3. ✅ **Automated Matching**: Save hours of manual reconciliation
4. ✅ **Audit Trail**: Complete history of all deposits and matches
5. ✅ **Alerts**: Know when expected deposits are overdue
6. ✅ **Reporting**: Analyze Bajaj charges over time
7. ✅ **Multi-Finance**: Can extend to HDFC, other finance companies

## Next Steps

1. Run the schema file to create tables
2. Check if sales_orders has bajaj finance fields
3. Build the import API
4. Create reconciliation dashboard UI
5. Test with real bank statements

Would you like me to proceed with implementing any specific part?
