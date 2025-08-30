// Test Bajaj Finance Data Flow - Button Click Verification
// This simulates exactly what happens when "Create Quote & Sales Order" button is clicked

console.log("=== Bajaj Finance Data Flow Test ===");

// Simulate order data (₹22,500 example)
const orderAmount = 22500;
const hasBajajCard = false;
const selectedPlan = "10/2";

console.log(`Order Amount: ₹${orderAmount.toLocaleString()}`);

// Step 1: BajajFinanceCalculator calculations (what gets stored in bajajFinanceData)
const bajajServiceCharge = Math.round(orderAmount * 0.08);
const billAmountForEMI = orderAmount + bajajServiceCharge;
const cardFee = hasBajajCard ? 0 : 530;
const processingFee = 768;

const monthlyEMI = Math.round(billAmountForEMI / 10); // For 10/2 plan
const downPaymentEMI = monthlyEMI * 2; // 2 months advance
const totalDownPayment = downPaymentEMI + cardFee + processingFee;
const financeAmount = billAmountForEMI; // Full amount gets financed
const remainingEMIs = 8; // 10 - 2 advance
const totalCustomerPays = totalDownPayment + (monthlyEMI * remainingEMIs);

// This is what BajajFinanceCalculator stores in bajajFinanceData
const bajajFinanceData = {
  orderAmount: orderAmount,
  financeAmount: financeAmount,
  downPayment: totalDownPayment,
  plan: {
    code: "10/2",
    months: 10,
    downPaymentMonths: 2,
    processingFee: processingFee
  },
  monthlyEMI: monthlyEMI,
  processingFee: processingFee,
  additionalCharges: cardFee,
  hasBajajCard: hasBajajCard,
  grandTotal: totalCustomerPays,
  bajajServiceCharge: bajajServiceCharge
};

console.log("\n=== BajajFinanceCalculator Data ===");
console.log("bajajFinanceData:", {
  orderAmount: bajajFinanceData.orderAmount,
  financeAmount: bajajFinanceData.financeAmount,
  downPayment: bajajFinanceData.downPayment,
  monthlyEMI: bajajFinanceData.monthlyEMI,
  grandTotal: bajajFinanceData.grandTotal,
  plan: bajajFinanceData.plan
});

// Step 2: InvoiceBillingDashboard.getCurrentBillingData() (what gets passed to button click)
const billingData = {
  customer: { customer_id: "CUST123", name: "Test Customer" },
  items: [{ /* mock items */ }],
  paymentMethods: [{ type: "emi", amount: bajajFinanceData.financeAmount, reference: "Bajaj Finance EMI" }],
  finalTotal: orderAmount, // This is the order total before Bajaj charges
  bajajFinanceData: bajajFinanceData, // The complete calculator data
  selectedSalesman: { user_id: "SALES123", name: "Test Salesman" }
};

console.log("\n=== BillingData Passed to API ===");
console.log("billingData.finalTotal:", billingData.finalTotal);
console.log("billingData.bajajFinanceData:", billingData.bajajFinanceData);

// Step 3: Billing page processing (what happens in handleCreateQuoteAndSalesOrder)
const hasBajajFinance = billingData.paymentMethods?.find(pm => pm.type === 'emi') !== undefined;
const totalAmount = billingData.finalTotal;

let emiPlan = null;
let monthlyEmiAmount = 0;
let bajajCharges = null;

if (hasBajajFinance && billingData.bajajFinanceData?.plan) {
  // Use BajajFinanceCalculator data (this is the correct path)
  emiPlan = {
    type: billingData.bajajFinanceData.plan.code,
    totalMonths: billingData.bajajFinanceData.plan.months,
    emiMonths: billingData.bajajFinanceData.plan.months - billingData.bajajFinanceData.plan.downPaymentMonths,
    downPaymentMonths: billingData.bajajFinanceData.plan.downPaymentMonths,
    interestRate: 0,
    processingFee: billingData.bajajFinanceData.plan.processingFee,
    newCustomerFee: billingData.bajajFinanceData.additionalCharges,
    isNewCustomer: !billingData.bajajFinanceData.hasBajajCard
  };
  
  monthlyEmiAmount = billingData.bajajFinanceData.monthlyEMI;
  
  bajajCharges = {
    processing_fee_rate: 8.0,
    processing_fee_amount: billingData.bajajFinanceData.processingFee,
    convenience_charges: billingData.bajajFinanceData.additionalCharges,
    total_customer_payment: billingData.bajajFinanceData.grandTotal,
    merchant_receivable: totalAmount,
    card_fee: billingData.bajajFinanceData.additionalCharges,
    bill_amount: totalAmount
  };
}

console.log("\n=== API Payload Data ===");
console.log("emiPlan:", emiPlan);
console.log("monthlyEmiAmount:", monthlyEmiAmount);
console.log("bajajCharges:", bajajCharges);

// Step 4: What gets sent to quotes/sales order API
const apiPayload = {
  customer_id: billingData.customer?.customer_id,
  total_price: billingData.finalTotal,
  emi_enabled: hasBajajFinance,
  emi_plan: emiPlan,
  emi_monthly: monthlyEmiAmount,
  bajaj_finance_amount: hasBajajFinance ? billingData.finalTotal + emiPlan.newCustomerFee : 0,
  bajaj_processing_fee_rate: bajajCharges?.processing_fee_rate,
  bajaj_processing_fee_amount: bajajCharges?.processing_fee_amount,
  bajaj_convenience_charges: bajajCharges?.convenience_charges,
  bajaj_total_customer_payment: bajajCharges?.total_customer_payment,
  bajaj_merchant_receivable: bajajCharges?.merchant_receivable
};

console.log("\n=== Final API Payload ===");
console.log("API Payload:", apiPayload);

console.log("\n=== Verification ===");
console.log("✓ Monthly EMI:", monthlyEmiAmount, "= ₹2,430");
console.log("✓ Down Payment:", billingData.bajajFinanceData.downPayment, "= ₹6,158");
console.log("✓ Finance Amount:", billingData.bajajFinanceData.financeAmount, "= ₹24,300");
console.log("✓ Total Customer Pays:", bajajCharges.total_customer_payment, "= ₹25,598");
console.log("✓ Plan Type:", emiPlan.type, "= 10/2");
console.log("✓ Processing Fee:", bajajCharges.processing_fee_amount, "= ₹768");
console.log("✓ Card Fee:", bajajCharges.convenience_charges, "= ₹530");

// Calculate expected values
const expected = {
  monthlyEMI: 2430,
  downPayment: 6158,
  financeAmount: 24300,
  totalCustomerPays: 25598,
  processingFee: 768,
  cardFee: 530
};

console.log("\n=== Match Check ===");
console.log("Monthly EMI Match:", monthlyEmiAmount === expected.monthlyEMI ? "✅" : "❌");
console.log("Down Payment Match:", billingData.bajajFinanceData.downPayment === expected.downPayment ? "✅" : "❌");
console.log("Finance Amount Match:", billingData.bajajFinanceData.financeAmount === expected.financeAmount ? "✅" : "❌");
console.log("Total Payable Match:", bajajCharges.total_customer_payment === expected.totalCustomerPays ? "✅" : "❌");
console.log("Processing Fee Match:", bajajCharges.processing_fee_amount === expected.processingFee ? "✅" : "❌");
console.log("Card Fee Match:", bajajCharges.convenience_charges === expected.cardFee ? "✅" : "❌");
