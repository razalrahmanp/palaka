# Bajaj Finance EMI System - Charge Tracking Guide

## Overview
In Bajaj Finance EMI transactions, there are three key parties:
1. **Customer** - Pays total amount to Bajaj Finance
2. **Bajaj Finance** - Collects from customer, pays merchant minus charges
3. **Merchant (You)** - Receives bill amount from Bajaj Finance

## How Bajaj Finance Charges Work

### Traditional Payment Flow
```
Customer pays ₹10,000 → Merchant receives ₹10,000
```

### Bajaj Finance EMI Flow
```
Customer pays ₹10,800 → Bajaj Finance → Merchant receives ₹10,000
                ↑                              ↑
        (Bill + 8% + Charges)           (Original Bill Amount)
```

## Database Schema Changes

### New Fields Added to `quotes` and `sales_orders` tables:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `bajaj_processing_fee_rate` | DECIMAL(5,2) | Processing fee percentage (usually 8%) | 8.00 |
| `bajaj_processing_fee_amount` | DECIMAL(12,2) | Calculated processing fee | 800.00 |
| `bajaj_convenience_charges` | DECIMAL(12,2) | Additional charges by Bajaj | 0.00 |
| `bajaj_total_customer_payment` | DECIMAL(12,2) | Total customer pays to Bajaj | 10800.00 |
| `bajaj_merchant_receivable` | DECIMAL(12,2) | Amount merchant receives | 10000.00 |

## Example Calculation

### Scenario: Bill Amount = ₹10,000

```typescript
// Input
const billAmount = 10000;
const processingFeeRate = 8.0; // 8%
const convenienceCharges = 0;

// Calculations
const processingFeeAmount = billAmount * processingFeeRate / 100; // 800
const totalCustomerPayment = billAmount + processingFeeAmount + convenienceCharges; // 10800
const merchantReceivable = billAmount; // 10000

// Database values
{
  bajaj_processing_fee_rate: 8.00,
  bajaj_processing_fee_amount: 800.00,
  bajaj_convenience_charges: 0.00,
  bajaj_total_customer_payment: 10800.00,
  bajaj_merchant_receivable: 10000.00
}
```

## Implementation Steps

### 1. Database Setup
Run the SQL script to add new columns:
```bash
psql -d your_database -f scripts/add-bajaj-finance-charges-tracking.sql
```

### 2. API Changes
The billing system now automatically calculates these charges when Bajaj Finance EMI is selected.

### 3. UI Display

#### For Sales Team
- Show customer: "Total EMI amount: ₹10,800"
- Show merchant: "You will receive: ₹10,000"

#### For Reports
- Track total business volume including Bajaj Finance charges
- Monitor actual cash flow (merchant receivables)

## Business Benefits

### 1. Accurate Financial Tracking
- Know exactly how much customer pays vs. what you receive
- Proper accounting for Bajaj Finance charges

### 2. Better Customer Communication
- Transparent about total cost to customer
- Clear about EMI terms and charges

### 3. Improved Reporting
- Separate tracking of gross sales vs. net receipts
- Better understanding of EMI impact on cash flow

## Usage in Code

### Frontend (Billing Component)
```typescript
import { calculateBajajFinanceCharges } from '@/types/bajajFinance';

const charges = calculateBajajFinanceCharges(10000, 8, 0);
// Returns: { 
//   processing_fee_amount: 800,
//   total_customer_payment: 10800,
//   merchant_receivable: 10000 
// }
```

### API Route
The charges are automatically included when creating quotes/sales orders with Bajaj Finance EMI.

## Reports and Analytics

### Key Metrics to Track
1. **Total Customer Payments** - Full amount customers pay to Bajaj Finance
2. **Merchant Receivables** - Actual cash flow to business
3. **Bajaj Finance Charges** - Total charges paid to Bajaj Finance
4. **EMI Adoption Rate** - Percentage of sales through EMI

### Example Query
```sql
-- Monthly Bajaj Finance summary
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_emi_orders,
  SUM(bajaj_total_customer_payment) as total_customer_payments,
  SUM(bajaj_merchant_receivable) as total_merchant_receipts,
  SUM(bajaj_processing_fee_amount) as total_bajaj_charges
FROM sales_orders 
WHERE emi_enabled = true 
  AND bajaj_finance_amount > 0
GROUP BY month
ORDER BY month DESC;
```

## Customer Communication Template

### For Customer
> "Your total EMI amount with Bajaj Finance will be ₹10,800 (including ₹800 processing fee). 
> This will be divided into convenient monthly installments as per your chosen tenure."

### For Internal Team
> "Customer EMI: ₹10,800 total | Our receipt: ₹10,000 | Bajaj charges: ₹800"

## Troubleshooting

### Common Issues
1. **Charges not calculating** - Check if `emi_enabled` is true and `bajaj_finance_amount` > 0
2. **Wrong amounts** - Verify `processingFeeRate` is set correctly (usually 8.0)
3. **Missing data** - Ensure all new fields are included in API calls

### Validation Rules
- `bajaj_processing_fee_rate` should be between 0 and 20
- `bajaj_total_customer_payment` should equal `bill_amount + processing_fee + convenience_charges`
- `bajaj_merchant_receivable` should equal original `bill_amount`
