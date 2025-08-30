# Bajaj Finance Integration Testing Checklist

## ✅ Database Setup Complete
- [x] Added missing columns to `sales_orders` table
- [x] Added missing columns to `quotes` table
- [x] All Bajaj Finance fields now available

## 🧪 Test Scenarios

### Test Case 1: New Customer with No Bajaj Card
**Expected Behavior:** Card fee (₹530) should be included

1. **Setup:**
   - Go to `/billing` page
   - Add new customer (e.g., name: "Test Customer", phone: "9876543210")
   - Add items totaling ~₹25,000

2. **Bajaj Finance Flow:**
   - Select "EMI" payment method
   - Click "Calculate Bajaj Finance" 
   - Select "No, I don't have a Bajaj card"
   - Choose EMI plan (e.g., 6 months)

3. **UI Verification:**
   ```
   Expected Display:
   Original Order Amount: ₹25,000
   Bajaj Service Charge (8%): +₹2,000
   Card Fee (New Customer): +₹530  ⬅️ MUST APPEAR
   Final Bill Amount: ₹27,530        ⬅️ INCLUDES CARD FEE
   
   EMI Details:
   Monthly EMI: ₹4,588 (27,530 ÷ 6)
   Processing Fee: ₹2,000 (collected by Bajaj)
   Total Customer Payment: ₹29,530
   ```

4. **Database Verification:**
   - Create Quote & Sales Order
   - Check database tables should contain:
   ```sql
   bajaj_processing_fee_rate: 8.00
   bajaj_processing_fee_amount: 2000.00
   bajaj_convenience_charges: 530.00  ⬅️ CARD FEE
   bajaj_total_customer_payment: 29530.00
   bajaj_merchant_receivable: 25000.00
   bajaj_finance_amount: 27530.00     ⬅️ INCLUDES CARD FEE
   ```

### Test Case 2: Existing Customer with Bajaj Card
**Expected Behavior:** No card fee

1. **Setup:**
   - Same customer and items as Test Case 1

2. **Bajaj Finance Flow:**
   - Select "Yes, I have a Bajaj card"
   - Choose EMI plan (e.g., 6 months)

3. **UI Verification:**
   ```
   Expected Display:
   Original Order Amount: ₹25,000
   Bajaj Service Charge (8%): +₹2,000
   Card Fee: ₹0                      ⬅️ NO CARD FEE
   Final Bill Amount: ₹25,000        ⬅️ NO CARD FEE ADDED
   
   EMI Details:
   Monthly EMI: ₹4,167 (25,000 ÷ 6)
   Processing Fee: ₹2,000
   Total Customer Payment: ₹27,000
   ```

4. **Database Verification:**
   ```sql
   bajaj_convenience_charges: 0.00     ⬅️ NO CARD FEE
   bajaj_total_customer_payment: 27000.00
   bajaj_finance_amount: 25000.00      ⬅️ NO CARD FEE
   ```

### Test Case 3: Without Using Bajaj Finance Calculator
**Expected Behavior:** Fallback calculations should work

1. **Setup:**
   - Add customer and items
   - Select "EMI" payment method
   - **Skip** Bajaj Finance Calculator
   - Create Quote & Sales Order directly

2. **Expected Database Values:**
   ```sql
   bajaj_processing_fee_rate: 8.00
   bajaj_processing_fee_amount: 2000.00  (8% of 25000)
   bajaj_convenience_charges: 530.00     (default for new customer)
   bajaj_total_customer_payment: 27530.00
   bajaj_merchant_receivable: 25000.00
   bajaj_finance_amount: 27530.00
   ```

## 🔍 Console Log Checks

Look for these logs in browser console:

### Card Status Detection:
```javascript
Bajaj Finance Card Status: {
  hasBajajCard: false,
  isNewCustomer: true,
  cardFee: 530,
  source: "BajajFinanceCalculator"
}
```

### Charge Breakdown:
```javascript
Bajaj Finance Charge Breakdown: {
  billAmount: 25000,
  cardFee: 530,
  processingFeeRate: "8%",
  processingFeeAmount: 2000,
  totalCustomerPays: 29530,
  merchantReceives: 25000
}
```

## 📊 Database Queries for Verification

### Check Latest Sales Order:
```sql
SELECT 
  id,
  customer_id,
  total_price,
  emi_enabled,
  bajaj_finance_amount,
  bajaj_processing_fee_rate,
  bajaj_processing_fee_amount,
  bajaj_convenience_charges,
  bajaj_total_customer_payment,
  bajaj_merchant_receivable,
  created_at
FROM sales_orders 
WHERE emi_enabled = true 
ORDER BY created_at DESC 
LIMIT 1;
```

### Check Latest Quote:
```sql
SELECT 
  id,
  customer_id,
  total_price,
  emi_enabled,
  bajaj_finance_amount,
  bajaj_processing_fee_rate,
  bajaj_processing_fee_amount,
  bajaj_convenience_charges,
  bajaj_total_customer_payment,
  bajaj_merchant_receivable,
  created_at
FROM quotes 
WHERE emi_enabled = true 
ORDER BY created_at DESC 
LIMIT 1;
```

## ✅ Success Criteria

- [ ] No database column errors
- [ ] Card fee appears in UI when "No card" selected
- [ ] Card fee is ₹0 when "Yes, have card" selected
- [ ] All Bajaj Finance fields populated in database
- [ ] Correct total calculations (bill + card fee + processing fee)
- [ ] EMI calculations include card fee
- [ ] Console logs show proper charge breakdown
- [ ] Fallback calculation works without using calculator

## 🚨 Common Issues to Watch For

1. **Card Fee Not Showing:** Check if `BajajFinanceCalculator` is properly setting card status
2. **Database NULL Values:** Ensure all calculations are happening before database insert
3. **Wrong Total Calculations:** Verify card fee is included in `bajaj_finance_amount`
4. **Console Errors:** Check for any JavaScript errors during calculation
5. **EMI Calculation Wrong:** Ensure EMI includes card fee in the calculation base

## 🎯 Next Steps After Testing

1. If all tests pass → Integration complete ✅
2. If issues found → Check specific component logs and fix
3. Document any edge cases discovered
4. Consider adding automated tests for these scenarios

---

**Test Date:** {{ DATE }}
**Tester:** {{ TESTER_NAME }}
**Status:** {{ PASS/FAIL }}
**Notes:** {{ ADDITIONAL_NOTES }}
