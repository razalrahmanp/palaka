// Enhanced TypeScript interfaces for Bajaj Finance charge tracking

export interface BajajFinanceCharges {
  // Processing fee configuration
  processing_fee_rate: number; // Usually 8%
  processing_fee_amount: number; // Calculated: bill_amount * rate / 100
  
  // Additional charges
  convenience_charges: number; // Any additional charges by Bajaj Finance
  
  // Total amounts
  total_customer_payment: number; // Total customer pays to Bajaj Finance
  merchant_receivable: number; // Amount merchant receives from Bajaj Finance
  
  // EMI details
  emi_tenure: number; // Number of months
  monthly_emi: number; // Monthly EMI amount
}

export interface BajajFinanceCalculation {
  bill_amount: number;
  processing_fee_rate: number;
  convenience_charges: number;
  processing_fee_amount: number;
  total_customer_payment: number;
  merchant_receivable: number;
}

// Updated Quote interface with Bajaj Finance charges
export interface QuoteWithBajajFinance {
  id: string;
  customer_id: string;
  status: string;
  final_price: number;
  original_price: number;
  total_price: number;
  discount_amount: number;
  freight_charges: number;
  
  // Existing Bajaj fields
  bajaj_finance_amount: number;
  bajaj_approved_amount?: number;
  emi_enabled: boolean;
  emi_plan: Record<string, unknown> | null;
  emi_monthly: number;
  
  // New Bajaj Finance charge tracking fields
  bajaj_processing_fee_rate?: number;
  bajaj_processing_fee_amount?: number;
  bajaj_convenience_charges?: number;
  bajaj_total_customer_payment?: number;
  bajaj_merchant_receivable?: number;
}

// Updated Sales Order interface with Bajaj Finance charges
export interface SalesOrderWithBajajFinance {
  id: string;
  quote_id: string;
  customer_id: string;
  total_price: number;
  original_price: number;
  final_price: number;
  discount_amount: number;
  freight_charges: number;
  
  // EMI fields
  emi_enabled: boolean;
  emi_plan: Record<string, unknown> | null;
  emi_monthly: number;
  
  // Enhanced Bajaj Finance fields
  bajaj_finance_amount: number;
  bajaj_processing_fee_rate?: number;
  bajaj_processing_fee_amount?: number;
  bajaj_convenience_charges?: number;
  bajaj_total_customer_payment?: number;
  bajaj_merchant_receivable?: number;
  
  status: string;
  created_at: string;
  created_by?: string;
}

// Utility function to calculate Bajaj Finance charges
export function calculateBajajFinanceCharges(
  billAmount: number,
  processingFeeRate: number = 8.0,
  convenienceCharges: number = 0
): BajajFinanceCalculation {
  const processingFeeAmount = Math.round((billAmount * processingFeeRate / 100) * 100) / 100;
  const totalCustomerPayment = Math.round((billAmount + processingFeeAmount + convenienceCharges) * 100) / 100;
  const merchantReceivable = billAmount; // Merchant gets the original bill amount
  
  return {
    bill_amount: billAmount,
    processing_fee_rate: processingFeeRate,
    convenience_charges: convenienceCharges,
    processing_fee_amount: processingFeeAmount,
    total_customer_payment: totalCustomerPayment,
    merchant_receivable: merchantReceivable
  };
}

// Example usage:
/*
const charges = calculateBajajFinanceCharges(10000, 8, 200);
console.log(charges);
// Output:
// {
//   bill_amount: 10000,
//   processing_fee_rate: 8,
//   convenience_charges: 200,
//   processing_fee_amount: 800,
//   total_customer_payment: 11000,
//   merchant_receivable: 10000
// }
*/
