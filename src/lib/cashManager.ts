// ================================================================================================
// CASH MANAGEMENT UTILITY FUNCTIONS
// ================================================================================================
// Centralized utility functions for managing cash transactions across all ERP modules
// Used by: expenses, withdrawals, investments, liability payments, fund transfers, etc.
// ================================================================================================

import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

// ================================================================================================
// TYPES AND INTERFACES
// ================================================================================================

export interface CashTransaction {
  id?: string;
  transaction_date: string;
  amount: number;
  transaction_type: 'DEBIT' | 'CREDIT';
  description: string;
  reference_number?: string;
  source_type: 'expense' | 'withdrawal' | 'investment' | 'liability_payment' | 
                'fund_transfer' | 'refund' | 'purchase_return' | 'sales_payment' | 
                'manual_adjustment' | 'opening_balance';
  source_id?: string;
  cash_account_id?: string;
  notes?: string;
  created_by?: string;
  journal_entry_id?: string;
}

export interface CashBalance {
  cash_account_id: string;
  current_balance: number;
  cash_account_name: string;
  last_updated: string;
}

export interface CashAccount {
  id: string;
  name: string;
  account_number?: string;
  current_balance: number;
  is_active: boolean;
}

// ================================================================================================
// CORE CASH TRANSACTION FUNCTIONS
// ================================================================================================

/**
 * Create a new cash transaction using the centralized function
 */
export async function createCashTransaction(params: {
  transaction_date?: string;
  amount: number;
  transaction_type: 'DEBIT' | 'CREDIT';
  description: string;
  reference_number?: string;
  source_type: CashTransaction['source_type'];
  source_id?: string;
  cash_account_id?: string;
  notes?: string;
  created_by?: string;
  journal_entry_id?: string;
}): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  try {
    console.log('💰 Creating cash transaction:', params);

    // Use the database function for consistency and validation
    const { data, error } = await supabaseAdmin.rpc('create_cash_transaction', {
      p_transaction_date: params.transaction_date || new Date().toISOString().split('T')[0],
      p_amount: Math.abs(params.amount), // Function handles sign based on type
      p_transaction_type: params.transaction_type,
      p_description: params.description,
      p_reference_number: params.reference_number || null,
      p_source_type: params.source_type,
      p_source_id: params.source_id || null,
      p_cash_account_id: params.cash_account_id || null,
      p_notes: params.notes || null,
      p_created_by: params.created_by || null,
      p_journal_entry_id: params.journal_entry_id || null
    });

    if (error) {
      console.error('❌ Error creating cash transaction:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Cash transaction created with ID:', data);
    return { success: true, transaction_id: data };

  } catch (error) {
    console.error('❌ Exception in createCashTransaction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get current cash balance for a specific account
 */
export async function getCashBalance(cashAccountId: string): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_cash_balance', {
      p_cash_account_id: cashAccountId
    });

    if (error) {
      console.error('❌ Error getting cash balance:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('❌ Exception in getCashBalance:', error);
    return 0;
  }
}

/**
 * Get total cash balance across all accounts
 */
export async function getTotalCashBalance(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_total_cash_balance');

    if (error) {
      console.error('❌ Error getting total cash balance:', error);
      return 0;
    }

    return data || 0;
  } catch (error) {
    console.error('❌ Exception in getTotalCashBalance:', error);
    return 0;
  }
}

/**
 * Get all active cash accounts
 */
export async function getCashAccounts(): Promise<CashAccount[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name, account_number, current_balance, is_active')
      .eq('account_type', 'CASH')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error getting cash accounts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception in getCashAccounts:', error);
    return [];
  }
}

/**
 * Get cash balances for all accounts
 */
export async function getAllCashBalances(): Promise<CashBalance[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('cash_balances')
      .select(`
        cash_account_id,
        current_balance,
        last_updated,
        bank_accounts!inner(name)
      `)
      .eq('bank_accounts.is_active', true);

    if (error) {
      console.error('❌ Error getting cash balances:', error);
      return [];
    }

    return data?.map(item => ({
      cash_account_id: item.cash_account_id,
      current_balance: item.current_balance,
      cash_account_name: (item.bank_accounts as unknown as { name: string })?.name || 'Unknown Account',
      last_updated: item.last_updated
    })) || [];
  } catch (error) {
    console.error('❌ Exception in getAllCashBalances:', error);
    return [];
  }
}

// ================================================================================================
// SPECIALIZED TRANSACTION CREATION FUNCTIONS
// ================================================================================================

/**
 * Create cash transaction for expense payment
 */
export async function createExpenseCashTransaction(params: {
  expense_id: string;
  amount: number;
  description: string;
  date?: string;
  cash_account_id?: string;
  reference_number?: string;
  created_by?: string;
}): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  return createCashTransaction({
    transaction_date: params.date,
    amount: params.amount,
    transaction_type: 'DEBIT', // Expense reduces cash
    description: `Expense: ${params.description}`,
    reference_number: params.reference_number || `EXP-${params.expense_id.slice(-8)}`,
    source_type: 'expense',
    source_id: params.expense_id,
    cash_account_id: params.cash_account_id,
    notes: `Cash payment for expense ID: ${params.expense_id}`,
    created_by: params.created_by
  });
}

/**
 * Create cash transaction for withdrawal
 */
export async function createWithdrawalCashTransaction(params: {
  withdrawal_id: string;
  amount: number;
  description: string;
  date?: string;
  cash_account_id?: string;
  reference_number?: string;
  created_by?: string;
}): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  return createCashTransaction({
    transaction_date: params.date,
    amount: params.amount,
    transaction_type: 'DEBIT', // Withdrawal reduces cash
    description: `Withdrawal: ${params.description}`,
    reference_number: params.reference_number || `WDL-${params.withdrawal_id.slice(-8)}`,
    source_type: 'withdrawal',
    source_id: params.withdrawal_id,
    cash_account_id: params.cash_account_id,
    notes: `Cash withdrawal ID: ${params.withdrawal_id}`,
    created_by: params.created_by
  });
}

/**
 * Create cash transaction for investment
 */
export async function createInvestmentCashTransaction(params: {
  investment_id: string;
  amount: number;
  description: string;
  date?: string;
  cash_account_id?: string;
  reference_number?: string;
  created_by?: string;
}): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  return createCashTransaction({
    transaction_date: params.date,
    amount: params.amount,
    transaction_type: 'CREDIT', // Investment increases cash
    description: `Investment: ${params.description}`,
    reference_number: params.reference_number || `INV-${params.investment_id.slice(-8)}`,
    source_type: 'investment',
    source_id: params.investment_id,
    cash_account_id: params.cash_account_id,
    notes: `Cash investment ID: ${params.investment_id}`,
    created_by: params.created_by
  });
}

/**
 * Create cash transaction for liability payment
 */
export async function createLiabilityCashTransaction(params: {
  liability_id: string;
  amount: number;
  description: string;
  date?: string;
  cash_account_id?: string;
  reference_number?: string;
  created_by?: string;
}): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  return createCashTransaction({
    transaction_date: params.date,
    amount: params.amount,
    transaction_type: 'DEBIT', // Liability payment reduces cash
    description: `Liability Payment: ${params.description}`,
    reference_number: params.reference_number || `LIA-${params.liability_id.slice(-8)}`,
    source_type: 'liability_payment',
    source_id: params.liability_id,
    cash_account_id: params.cash_account_id,
    notes: `Cash liability payment ID: ${params.liability_id}`,
    created_by: params.created_by
  });
}

/**
 * Create cash transaction for sales payment
 */
export async function createSalesPaymentCashTransaction(params: {
  payment_id: string;
  amount: number;
  description: string;
  date?: string;
  cash_account_id?: string;
  reference_number?: string;
  created_by?: string;
}): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  return createCashTransaction({
    transaction_date: params.date,
    amount: params.amount,
    transaction_type: 'CREDIT', // Sales payment increases cash
    description: `Sales Payment: ${params.description}`,
    reference_number: params.reference_number || `PAY-${params.payment_id.slice(-8)}`,
    source_type: 'sales_payment',
    source_id: params.payment_id,
    cash_account_id: params.cash_account_id,
    notes: `Cash sales payment ID: ${params.payment_id}`,
    created_by: params.created_by
  });
}

/**
 * Create cash transaction for fund transfer (contra entry)
 */
export async function createFundTransferCashTransaction(params: {
  transfer_id: string;
  amount: number;
  description: string;
  transaction_type: 'DEBIT' | 'CREDIT'; // DEBIT for cash to bank, CREDIT for bank to cash
  date?: string;
  cash_account_id?: string;
  reference_number?: string;
  created_by?: string;
}): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  return createCashTransaction({
    transaction_date: params.date,
    amount: params.amount,
    transaction_type: params.transaction_type,
    description: `Fund Transfer: ${params.description}`,
    reference_number: params.reference_number || `TXF-${params.transfer_id.slice(-8)}`,
    source_type: 'fund_transfer',
    source_id: params.transfer_id,
    cash_account_id: params.cash_account_id,
    notes: `Fund transfer ID: ${params.transfer_id}`,
    created_by: params.created_by
  });
}

/**
 * Create cash transaction for refund
 */
export async function createRefundCashTransaction(params: {
  refund_id: string;
  amount: number;
  description: string;
  date?: string;
  cash_account_id?: string;
  reference_number?: string;
  created_by?: string;
}): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  return createCashTransaction({
    transaction_date: params.date,
    amount: params.amount,
    transaction_type: 'DEBIT', // Refund reduces cash
    description: `Refund: ${params.description}`,
    reference_number: params.reference_number || `REF-${params.refund_id.slice(-8)}`,
    source_type: 'refund',
    source_id: params.refund_id,
    cash_account_id: params.cash_account_id,
    notes: `Cash refund ID: ${params.refund_id}`,
    created_by: params.created_by
  });
}

/**
 * Create cash transaction for purchase return
 */
export async function createPurchaseReturnCashTransaction(params: {
  return_id: string;
  amount: number;
  description: string;
  date?: string;
  cash_account_id?: string;
  reference_number?: string;
  created_by?: string;
}): Promise<{ success: boolean; transaction_id?: string; error?: string }> {
  return createCashTransaction({
    transaction_date: params.date,
    amount: params.amount,
    transaction_type: 'CREDIT', // Purchase return increases cash
    description: `Purchase Return: ${params.description}`,
    reference_number: params.reference_number || `PRT-${params.return_id.slice(-8)}`,
    source_type: 'purchase_return',
    source_id: params.return_id,
    cash_account_id: params.cash_account_id,
    notes: `Cash purchase return ID: ${params.return_id}`,
    created_by: params.created_by
  });
}

// ================================================================================================
// CASH VALIDATION FUNCTIONS
// ================================================================================================

/**
 * Check if there's sufficient cash balance for a debit transaction
 */
export async function validateCashBalance(
  amount: number, 
  cash_account_id?: string
): Promise<{ valid: boolean; current_balance: number; error?: string }> {
  try {
    let current_balance: number;

    if (cash_account_id) {
      current_balance = await getCashBalance(cash_account_id);
    } else {
      current_balance = await getTotalCashBalance();
    }

    const valid = current_balance >= amount;

    return {
      valid,
      current_balance,
      error: valid ? undefined : `Insufficient cash balance. Available: ₹${current_balance.toFixed(2)}, Required: ₹${amount.toFixed(2)}`
    };
  } catch (error) {
    console.error('❌ Error validating cash balance:', error);
    return {
      valid: false,
      current_balance: 0,
      error: 'Unable to validate cash balance'
    };
  }
}

// ================================================================================================
// CASH LEDGER QUERY FUNCTIONS
// ================================================================================================

/**
 * Get cash transactions with pagination and filtering
 */
export async function getCashTransactions(params: {
  page?: number;
  limit?: number;
  cash_account_id?: string;
  source_type?: string;
  date_from?: string;
  date_to?: string;
  transaction_type?: 'DEBIT' | 'CREDIT';
} = {}): Promise<{
  transactions: CashTransaction[];
  total_count: number;
  current_page: number;
  total_pages: number;
}> {
  try {
    const page = params.page || 1;
    const limit = params.limit || 25;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('cash_ledger_view')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.cash_account_id) {
      query = query.eq('cash_account_id', params.cash_account_id);
    }
    if (params.source_type) {
      query = query.eq('source_type', params.source_type);
    }
    if (params.transaction_type) {
      query = query.eq('transaction_type', params.transaction_type);
    }
    if (params.date_from) {
      query = query.gte('transaction_date', params.date_from);
    }
    if (params.date_to) {
      query = query.lte('transaction_date', params.date_to);
    }

    // Apply pagination and ordering
    query = query
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error getting cash transactions:', error);
      return {
        transactions: [],
        total_count: 0,
        current_page: page,
        total_pages: 0
      };
    }

    const total_pages = Math.ceil((count || 0) / limit);

    return {
      transactions: data || [],
      total_count: count || 0,
      current_page: page,
      total_pages
    };
  } catch (error) {
    console.error('❌ Exception in getCashTransactions:', error);
    return {
      transactions: [],
      total_count: 0,
      current_page: 1,
      total_pages: 0
    };
  }
}

// ================================================================================================
// EXPORT ALL FUNCTIONS
// ================================================================================================
const cashManager = {
  // Core functions
  createCashTransaction,
  getCashBalance,
  getTotalCashBalance,
  getCashAccounts,
  getAllCashBalances,
  
  // Specialized creation functions
  createExpenseCashTransaction,
  createWithdrawalCashTransaction,
  createInvestmentCashTransaction,
  createLiabilityCashTransaction,
  createSalesPaymentCashTransaction,
  createFundTransferCashTransaction,
  createRefundCashTransaction,
  createPurchaseReturnCashTransaction,
  
  // Validation and queries
  validateCashBalance,
  getCashTransactions
};

export default cashManager;