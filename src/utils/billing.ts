// Billing utility functions

export function formatPrice(price: number | null | undefined): string {
  return Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price ?? 0);
}

export function formatNumber(num: number | null | undefined): string {
  return Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(num ?? 0);
}

export function calculateMargin(cost: number | null | undefined, price: number | null | undefined): number | null {
  if (typeof cost === "number" && typeof price === "number" && cost > 0) {
    return ((price - cost) / cost) * 100;
  }
  return null;
}

export function calculateMarkup(cost: number | null | undefined, price: number | null | undefined): number | null {
  if (typeof cost === "number" && typeof price === "number" && cost > 0) {
    return ((price - cost) / price) * 100;
  }
  return null;
}

export function calculateGST(amount: number, rate: number): number {
  return (amount * rate) / 100;
}

export function calculateTotalWithGST(amount: number, gstRate: number): number {
  return amount + calculateGST(amount, gstRate);
}

export function validateGSTIN(gstin: string): boolean {
  // Basic GSTIN validation pattern
  const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinPattern.test(gstin);
}

export function validatePAN(pan: string): boolean {
  // Basic PAN validation pattern
  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panPattern.test(pan);
}

export function generateInvoiceNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `INV-${timestamp}-${random}`.toUpperCase();
}

export function generateQuoteNumber(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `QT-${timestamp}-${random}`.toUpperCase();
}

export function calculateEMI(principal: number, rate: number, tenure: number): number {
  const monthlyRate = rate / (12 * 100);
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
              (Math.pow(1 + monthlyRate, tenure) - 1);
  return Math.round(emi);
}

export function calculateEMIDetails(principal: number, rate: number, tenure: number) {
  const monthlyEMI = calculateEMI(principal, rate, tenure);
  const totalAmount = monthlyEMI * tenure;
  const totalInterest = totalAmount - principal;
  
  return {
    monthlyEMI,
    totalAmount,
    totalInterest,
    principal
  };
}
