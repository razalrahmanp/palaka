// Debug component to check Bajaj Finance data flow
// Add this to your billing page temporarily to debug

console.log("=== BAJAJ FINANCE DEBUG TOOL ===");

// Test the exact flow from UI to API
const debugBajajFinanceFlow = () => {
  // Simulate the exact scenario from your logs
  const testData = {
    finalTotal: 26500,
    bajajFinanceData: {
      hasBajajCard: false,
      additionalCharges: 530, // This should be the card fee
      orderAmount: 26500,
      financeAmount: 27030
    },
    paymentMethods: [
      { type: 'emi', amount: 27030 }
    ]
  };

  console.log("1. Input data:", testData);

  // Check EMI payment detection
  const emiPayment = testData.paymentMethods?.find(pm => pm.type === 'emi');
  const hasBajajFinance = emiPayment !== undefined;
  console.log("2. EMI payment detected:", hasBajajFinance, emiPayment);

  if (hasBajajFinance) {
    const totalAmount = testData.finalTotal;
    
    // Get card status (this is the critical part)
    const hasCard = testData.bajajFinanceData?.hasBajajCard ?? false;
    const isNewCustomer = !hasCard;
    
    // Try to get card fee from BajajFinanceCalculator data first
    const newCustomerFee = testData.bajajFinanceData?.additionalCharges ?? (isNewCustomer ? 530 : 0);
    
    console.log("3. Card status analysis:", {
      hasCard,
      isNewCustomer,
      additionalChargesFromCalculator: testData.bajajFinanceData?.additionalCharges,
      newCustomerFee,
      cardFeeSource: testData.bajajFinanceData?.additionalCharges !== undefined ? "BajajFinanceCalculator" : "fallback"
    });

    // Calculate charges
    const processingFeeRate = 8.0;
    const convenienceCharges = newCustomerFee; // Card fee should go here
    const processingFeeAmount = Math.round((totalAmount * processingFeeRate / 100) * 100) / 100;
    const totalCustomerPayment = Math.round((totalAmount + newCustomerFee + processingFeeAmount) * 100) / 100;
    const merchantReceivable = totalAmount;

    const bajajCharges = {
      processing_fee_rate: processingFeeRate,
      processing_fee_amount: processingFeeAmount,
      convenience_charges: convenienceCharges, // This should be 530!
      total_customer_payment: totalCustomerPayment,
      merchant_receivable: merchantReceivable,
      card_fee: newCustomerFee
    };

    console.log("4. Final bajajCharges object:", bajajCharges);
    console.log("5. What goes to database:", {
      bajaj_processing_fee_rate: bajajCharges.processing_fee_rate,
      bajaj_processing_fee_amount: bajajCharges.processing_fee_amount,
      bajaj_convenience_charges: bajajCharges.convenience_charges, // Should be 530
      bajaj_total_customer_payment: bajajCharges.total_customer_payment,
      bajaj_merchant_receivable: bajajCharges.merchant_receivable
    });

    // Check if card fee is properly mapped
    if (bajajCharges.convenience_charges === 530) {
      console.log("✅ SUCCESS: Card fee properly mapped to convenience_charges");
    } else {
      console.log("❌ ERROR: Card fee not properly mapped!", {
        expected: 530,
        actual: bajajCharges.convenience_charges,
        issue: bajajCharges.convenience_charges === 0 ? "Card fee is 0" : "Card fee is wrong value"
      });
    }
  }
};

// Run the debug
debugBajajFinanceFlow();

// Export for manual testing
if (typeof window !== 'undefined') {
  window.debugBajajFinanceFlow = debugBajajFinanceFlow;
}
