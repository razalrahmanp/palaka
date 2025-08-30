// Quick Bajaj Finance Test Script
// Run this in browser console to verify data flow

const testBajajFinanceFlow = () => {
  console.log('🧪 Testing Bajaj Finance Integration...');
  
  // Test data
  const testData = {
    orderAmount: 25000,
    hasBajajCard: false, // Test new customer scenario
    processingFeeRate: 8,
  };
  
  // Calculate expected values
  const expectedProcessingFee = testData.orderAmount * (testData.processingFeeRate / 100);
  const expectedCardFee = testData.hasBajajCard ? 0 : 530;
  const expectedBillAmount = testData.orderAmount + expectedCardFee;
  const expectedTotalCustomerPayment = testData.orderAmount + expectedCardFee + expectedProcessingFee;
  const expectedMerchantReceivable = testData.orderAmount;
  
  console.log('📊 Expected Calculations:');
  console.log('Order Amount:', testData.orderAmount);
  console.log('Card Fee:', expectedCardFee);
  console.log('Processing Fee:', expectedProcessingFee);
  console.log('Bill Amount (with card fee):', expectedBillAmount);
  console.log('Total Customer Payment:', expectedTotalCustomerPayment);
  console.log('Merchant Receivable:', expectedMerchantReceivable);
  
  // Check if BajajFinanceCalculator is available
  const bajajCalculator = document.querySelector('[data-testid="bajaj-finance-calculator"]');
  if (bajajCalculator) {
    console.log('✅ BajajFinanceCalculator component found');
  } else {
    console.log('❌ BajajFinanceCalculator component not found');
  }
  
  // Check if billing page is loaded
  const billingPage = document.querySelector('.billing-dashboard, [data-testid="billing-dashboard"]');
  if (billingPage) {
    console.log('✅ Billing page loaded');
  } else {
    console.log('❌ Billing page not found');
  }
  
  // Test card status detection
  const cardStatusTest = {
    hasBajajCard: false,
    isNewCustomer: true,
    cardFee: 530,
    source: "Test"
  };
  
  console.log('🎯 Card Status Test:', cardStatusTest);
  
  return {
    expected: {
      orderAmount: testData.orderAmount,
      cardFee: expectedCardFee,
      processingFee: expectedProcessingFee,
      billAmount: expectedBillAmount,
      totalCustomerPayment: expectedTotalCustomerPayment,
      merchantReceivable: expectedMerchantReceivable
    },
    testData: cardStatusTest
  };
};

// Auto-run the test
const testResults = testBajajFinanceFlow();
console.log('🔍 Test Results:', testResults);

// Export for manual testing
window.bajajFinanceTest = testBajajFinanceFlow;
