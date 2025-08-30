# Fix: Bajaj Finance Card Fee (₹530) Not Calculating

## Problem
When selecting "No, I don't have" in the Bajaj EMI option, the ₹530 card fee was not being calculated properly because the billing logic was hardcoded to always assume new customers.

## Root Cause
The main billing page (`src/app/(erp)/billing/page.tsx`) had this hardcoded logic:
```typescript
const isNewCustomer = true; // Default to new customer
const newCustomerFee = isNewCustomer ? 530 : 0;
```

This meant that regardless of what the user selected in the `BajajFinanceCalculator` component, the card fee was always applied.

## Solution Implemented

### 1. Updated BillingData Interface
Added `bajajFinanceData` to the `BillingData` interface in `src/types/index.ts`:
```typescript
bajajFinanceData?: {
  hasBajajCard: boolean;
  additionalCharges: number;
  orderAmount: number;
  financeAmount: number;
  monthlyEMI: number;
  plan: {
    months: number;
    type: string;
  };
} | null;
```

### 2. Updated InvoiceBillingDashboard
Modified `getCurrentBillingData()` in `src/components/billing/InvoiceBillingDashboard.tsx` to include Bajaj Finance data:
```typescript
bajajFinanceData, // Include Bajaj Finance data with card status
```

### 3. Fixed Billing Page Logic
Updated the billing page (`src/app/(erp)/billing/page.tsx`) to use the actual card status:
```typescript
// Get card status from Bajaj Finance data if available, otherwise default to new customer
const hasCard = data.bajajFinanceData?.hasBajajCard ?? false;
const isNewCustomer = !hasCard; // If no card, then new customer
const newCustomerFee = isNewCustomer ? 530 : 0;
```

### 4. Added Debug Logging
Added console logging to track card status:
```typescript
console.log("Bajaj Finance Card Status:", {
  hasBajajCard: hasCard,
  isNewCustomer: isNewCustomer,
  cardFee: newCustomerFee,
  source: data.bajajFinanceData ? "BajajFinanceCalculator" : "default (new customer)"
});
```

## How It Works Now

### User Flow:
1. User selects EMI payment method
2. User clicks "Calculate Bajaj Finance" to open the calculator
3. User selects card status:
   - **"Yes, I have Bajaj Finance Card"** → `hasBajajCard: true` → Card fee: ₹0
   - **"No, I don't have"** → `hasBajajCard: false` → Card fee: ₹530
4. Calculator passes this information to billing data
5. Billing page uses actual card status for fee calculation

### Charge Calculation:
```typescript
// Example: ₹10,000 bill with different card statuses

// With Bajaj Card:
Bill Amount: ₹10,000
Card Fee: ₹0
Processing Fee (8%): ₹800
Total Customer Pays: ₹10,800
Merchant Receives: ₹10,000

// Without Bajaj Card:
Bill Amount: ₹10,000
Card Fee: ₹530
Processing Fee (8%): ₹800
Total Customer Pays: ₹11,330
Merchant Receives: ₹10,000
```

## Testing
To test the fix:
1. Go to `/billing` page
2. Add items and select a customer
3. Select EMI payment method
4. Click "Calculate Bajaj Finance"
5. Try both card status options:
   - Select "Yes, I have" → Should see no card fee
   - Select "No, I don't have" → Should see ₹530 card fee
6. Check browser console for debug logs showing card status

## Files Modified
1. `src/types/index.ts` - Added bajajFinanceData to BillingData interface
2. `src/components/billing/InvoiceBillingDashboard.tsx` - Include Bajaj data in billing data
3. `src/app/(erp)/billing/page.tsx` - Use actual card status instead of hardcoded value

## Database Impact
The fix affects these database fields:
- `bajaj_finance_amount` - Now correctly includes/excludes the ₹530 fee
- `bajaj_processing_fee_amount` - Processing fee calculation remains the same
- `bajaj_total_customer_payment` - Now correctly reflects total with/without card fee
