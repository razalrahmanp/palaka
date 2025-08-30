// Test Bajaj Finance Calculation Logic
console.log("=== Bajaj Finance Calculation Test ===\n");

// Test scenario from user
const orderAmount = 22500;
const bajajServiceCharge = Math.round(orderAmount * 0.08); // 1800
const hasBajajCard = false;
const cardFee = hasBajajCard ? 0 : 530;
const processingFee = 768;

console.log("Input Values:");
console.log("Order Amount: ₹" + orderAmount.toLocaleString());
console.log("Bajaj Service Charge (8%): ₹" + bajajServiceCharge.toLocaleString());
console.log("Card Fee: ₹" + cardFee.toLocaleString());
console.log("Processing Fee: ₹" + processingFee.toLocaleString());
console.log("");

// 10/2 Plan Calculation
const plan = {
  code: '10/2',
  months: 10,
  downPaymentMonths: 2
};

const billAmountForEMI = orderAmount + bajajServiceCharge; // 24300
const monthlyEMI = Math.round(billAmountForEMI / plan.months); // 2430
const downPaymentEMI = monthlyEMI * plan.downPaymentMonths; // 4860
const totalDownPayment = downPaymentEMI + cardFee + processingFee; // 6158
const financeAmount = billAmountForEMI; // 24300 (full amount financed by Bajaj)
const remainingEMIs = billAmountForEMI - downPaymentEMI; // 19440 (what remains after down payment)

console.log("=== 10/2 Plan Calculations ===");
console.log("Bill Amount for EMI: ₹" + billAmountForEMI.toLocaleString());
console.log("Monthly EMI: ₹" + monthlyEMI.toLocaleString());
console.log("2 Months EMI (advance): ₹" + downPaymentEMI.toLocaleString());
console.log("Total Down Payment (2 EMI + fees): ₹" + totalDownPayment.toLocaleString());
console.log("Finance Amount (by Bajaj): ₹" + financeAmount.toLocaleString());
console.log("Remaining EMIs (8 months): ₹" + remainingEMIs.toLocaleString());
console.log("");

console.log("=== Expected vs Current ===");
console.log("Expected Finance Amount: ₹24,300");
console.log("Current Finance Amount: ₹" + financeAmount.toLocaleString());
console.log("Match: " + (financeAmount === 24300 ? "✅ YES" : "❌ NO"));
console.log("");

console.log("=== Payment Breakdown ===");
console.log("Customer pays upfront: ₹" + totalDownPayment.toLocaleString() + " (2 EMI + fees)");
console.log("Bajaj finances: ₹" + financeAmount.toLocaleString() + " (full amount)");
console.log("Customer pays monthly: ₹" + monthlyEMI.toLocaleString() + " × 8 months = ₹" + remainingEMIs.toLocaleString());
