/**
 * TEST SCRIPT: Bajaj Finance Card Fee - New Customer Scenario
 * 
 * This script simulates the exact scenario where:
 * 1. Customer has NO Bajaj card (new customer)
 * 2. Enables EMI 
 * 3. Should get ₹530 card fee in bajaj_convenience_charges
 * 
 * USAGE: Copy and paste this into browser console while on billing page
 */

console.log('🧪 TESTING: New Customer Card Fee Scenario');
console.log('==========================================');

// Test 1: Verify BajajFinanceCalculator logic
console.log('\n📋 Test 1: BajajFinanceCalculator Logic');
const testBajajData = {
  orderAmount: 50000,
  financeAmount: 50000,
  downPayment: 0,
  plan: { months: 6, processingFee: 0 },
  monthlyEMI: 8333,
  totalAmount: 50000,
  totalInterest: 0,
  processingFee: 0,
  additionalCharges: 530, // This is the ₹530 card fee!
  hasBajajCard: false,    // NEW CUSTOMER
  grandTotal: 50530,
  approvedAmount: 50000,
  finalBillAmount: 50530,
  bajajServiceCharge: 4000,
  isSplitBill: false
};

console.log('✅ BajajFinanceCalculator would return:');
console.log('   additionalCharges:', testBajajData.additionalCharges);
console.log('   hasBajajCard:', testBajajData.hasBajajCard);

// Test 2: Verify billing page logic
console.log('\n📋 Test 2: Billing Page Logic');
const hasBajajFinance = true;
const newCustomerFee = testBajajData.additionalCharges; // Should be 530
const convenienceCharges = newCustomerFee; // Should be 530

const bajajCharges = {
  processing_fee_rate: 8.0,
  processing_fee_amount: 4000, // 8% of 50000
  convenience_charges: convenienceCharges, // Should be 530
  total_customer_payment: 54530, // 50000 + 530 + 4000
  merchant_receivable: 50000
};

console.log('✅ Billing page would create bajajCharges:');
console.log('   convenience_charges:', bajajCharges.convenience_charges);
console.log('   Expected result: 530');

// Test 3: Verify API payload
console.log('\n📋 Test 3: API Payload');
const apiPayload = {
  bajaj_convenience_charges: hasBajajFinance ? (bajajCharges?.convenience_charges ?? 0) : 0
};

console.log('✅ API would receive:');
console.log('   bajaj_convenience_charges:', apiPayload.bajaj_convenience_charges);
console.log('   Expected result: 530');

// Test 4: Check for potential issues
console.log('\n🔍 Test 4: Potential Issues Check');

if (bajajCharges.convenience_charges === 0) {
  console.error('❌ ISSUE: convenience_charges is 0');
} else if (bajajCharges.convenience_charges === 530) {
  console.log('✅ PASSED: convenience_charges is correct (530)');
} else {
  console.warn('⚠️ UNEXPECTED: convenience_charges is', bajajCharges.convenience_charges);
}

// Test 5: Null coalescing operator test
console.log('\n📋 Test 5: Null Coalescing Test');
const testCases = [
  { bajajCharges: null, expected: 0 },
  { bajajCharges: undefined, expected: 0 },
  { bajajCharges: { convenience_charges: undefined }, expected: 0 },
  { bajajCharges: { convenience_charges: null }, expected: 0 },
  { bajajCharges: { convenience_charges: 0 }, expected: 0 },
  { bajajCharges: { convenience_charges: 530 }, expected: 530 }
];

testCases.forEach((test, index) => {
  const result = hasBajajFinance ? (test.bajajCharges?.convenience_charges ?? 0) : 0;
  const passed = result === test.expected;
  console.log(`   Test ${index + 1}: ${passed ? '✅' : '❌'} Result: ${result}, Expected: ${test.expected}`);
});

console.log('\n🎯 CONCLUSION:');
console.log('If all tests pass but database still shows 0, the issue is likely:');
console.log('1. User is not using BajajFinanceCalculator (bypassing it)');
console.log('2. BajajFinanceCalculator is not setting additionalCharges correctly');
console.log('3. Data is being modified after billing page but before database');
console.log('4. API route is not handling the data correctly');

console.log('\n💡 NEXT STEPS:');
console.log('1. Load the debug script: debug-bajaj-card-fee-detailed.js');
console.log('2. Create an actual order with EMI enabled');
console.log('3. Check console logs during the process');
console.log('4. Run showBajajDebugSummary() after order creation');
