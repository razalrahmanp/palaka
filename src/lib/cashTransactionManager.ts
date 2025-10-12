// Cash Transaction Utility for Frontend Components
// This utility handles cash transaction creation and cash balance updates

export interface CashTransactionData {
  amount: number;
  description: string;
  reference_number?: string;
  source_type: 'expense' | 'withdrawal' | 'investment' | 'liability_payment' | 'fund_transfer' | 'sales_payment' | 'refund';
  source_id: string;
  transaction_date: string;
  transaction_type: 'DEBIT' | 'CREDIT';
  notes?: string;
}

export class CashTransactionManager {
  
  /**
   * Create a cash transaction entry
   */
  static async createCashTransaction(data: CashTransactionData): Promise<boolean> {
    try {
      console.log('Creating cash transaction:', data);
      
      const response = await fetch('/api/finance/cash-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        console.log('Cash transaction created successfully');
        return true;
      } else {
        const error = await response.json();
        console.error('Error creating cash transaction:', error);
        return false;
      }
    } catch (error) {
      console.error('Error in createCashTransaction:', error);
      return false;
    }
  }

  /**
   * Handle cash payment for expenses (cash going out)
   */
  static async handleExpenseCashPayment(
    expenseId: string,
    amount: number,
    description: string,
    date: string,
    reference?: string
  ): Promise<boolean> {
    return this.createCashTransaction({
      amount: -Math.abs(amount), // Negative for cash going out
      description: `Expense: ${description}`,
      reference_number: reference,
      source_type: 'expense',
      source_id: expenseId,
      transaction_date: date,
      transaction_type: 'DEBIT',
      notes: `Cash payment for expense: ${description}`
    });
  }

  /**
   * Handle cash payment for investments (cash coming in)
   */
  static async handleInvestmentCashPayment(
    investmentId: string,
    amount: number,
    description: string,
    date: string,
    reference?: string
  ): Promise<boolean> {
    return this.createCashTransaction({
      amount: Math.abs(amount), // Positive for cash coming in
      description: `Investment: ${description}`,
      reference_number: reference,
      source_type: 'investment',
      source_id: investmentId,
      transaction_date: date,
      transaction_type: 'CREDIT',
      notes: `Cash investment: ${description}`
    });
  }

  /**
   * Handle cash payment for withdrawals (cash going out)
   */
  static async handleWithdrawalCashPayment(
    withdrawalId: string,
    amount: number,
    description: string,
    date: string,
    reference?: string
  ): Promise<boolean> {
    return this.createCashTransaction({
      amount: -Math.abs(amount), // Negative for cash going out
      description: `Withdrawal: ${description}`,
      reference_number: reference,
      source_type: 'withdrawal',
      source_id: withdrawalId,
      transaction_date: date,
      transaction_type: 'DEBIT',
      notes: `Cash withdrawal: ${description}`
    });
  }

  /**
   * Handle cash payment for liability payments (cash going out)
   */
  static async handleLiabilityCashPayment(
    liabilityId: string,
    amount: number,
    description: string,
    date: string,
    reference?: string
  ): Promise<boolean> {
    return this.createCashTransaction({
      amount: -Math.abs(amount), // Negative for cash going out
      description: `Liability Payment: ${description}`,
      reference_number: reference,
      source_type: 'liability_payment',
      source_id: liabilityId,
      transaction_date: date,
      transaction_type: 'DEBIT',
      notes: `Cash liability payment: ${description}`
    });
  }

  /**
   * Handle cash fund transfer (amount can be positive or negative based on direction)
   */
  static async handleFundTransferCash(
    transferId: string,
    amount: number,
    description: string,
    date: string,
    isFromCash: boolean,
    reference?: string
  ): Promise<boolean> {
    return this.createCashTransaction({
      amount: isFromCash ? -Math.abs(amount) : Math.abs(amount),
      description: `Fund Transfer: ${description}`,
      reference_number: reference,
      source_type: 'fund_transfer',
      source_id: transferId,
      transaction_date: date,
      transaction_type: isFromCash ? 'DEBIT' : 'CREDIT',
      notes: `Cash fund transfer: ${description}`
    });
  }

  /**
   * Check if payment method is cash
   */
  static isCashPayment(paymentMethod: string): boolean {
    return paymentMethod?.toLowerCase() === 'cash';
  }

  /**
   * Get cash account info
   */
  static async getCashAccountInfo(): Promise<{id: string; balance: number} | null> {
    try {
      const response = await fetch('/api/finance/cash-accounts');
      if (response.ok) {
        const data = await response.json();
        return data.cashAccount || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching cash account info:', error);
      return null;
    }
  }
}