// src/app/api/finance/bank_accounts/summary/route.ts
import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('🏦 Calculating bank account summary with payment method mapping...');

    // Get all bank accounts
    const { data: bankAccounts, error: bankError } = await supabase
      .from("bank_accounts")
      .select("*")
      .eq("is_active", true);

    if (bankError) {
      console.error("Error fetching bank accounts:", bankError);
      return NextResponse.json({ error: bankError.message }, { status: 500 });
    }

    // Get all payments grouped by method
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select("amount, method");

    if (paymentsError) {
      console.error("Error fetching payments:", paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    // Calculate totals by payment method
    const paymentTotals = payments?.reduce((totals, payment) => {
      const method = payment.method || 'CASH';
      const amount = Number(payment.amount) || 0;
      totals[method] = (totals[method] || 0) + amount;
      return totals;
    }, {} as Record<string, number>) || {};

    // Map payment methods to account types
    const bankAccountBalance = (paymentTotals['BANK TRANSFER'] || 0) + (paymentTotals['CARD'] || 0);
    const upiAccountBalance = paymentTotals['UPI'] || 0;
    const cashBalance = paymentTotals['CASH'] || 0;

    // Get actual bank transactions if any
    const { data: bankTransactions } = await supabase
      .from("bank_transactions")
      .select("type, amount, bank_account_id");

    let bankTransactionTotals: Record<string, number> = {};
    if (bankTransactions) {
      bankTransactionTotals = bankTransactions.reduce((totals, transaction) => {
        const accountId = transaction.bank_account_id;
        const amount = Number(transaction.amount) || 0;
        const adjustedAmount = transaction.type === 'deposit' ? amount : -amount;
        totals[accountId] = (totals[accountId] || 0) + adjustedAmount;
        return totals;
      }, {} as Record<string, number>);
    }

    // Calculate summary
    const summary = {
      total_bank_balance: bankAccountBalance,
      total_upi_balance: upiAccountBalance,
      total_cash_balance: cashBalance,
      total_digital_balance: bankAccountBalance + upiAccountBalance,
      total_balance: bankAccountBalance + upiAccountBalance + cashBalance,
      payment_method_breakdown: paymentTotals,
      bank_accounts: bankAccounts?.map(account => {
        let accountBalance = 0;
        
        // Add payment method balances
        if (account.account_type === 'BANK') {
          accountBalance += bankAccountBalance / (bankAccounts.filter(acc => acc.account_type === 'BANK').length || 1);
        } else if (account.account_type === 'UPI') {
          accountBalance += upiAccountBalance / (bankAccounts.filter(acc => acc.account_type === 'UPI').length || 1);
        }
        
        // Add bank transaction balances
        accountBalance += bankTransactionTotals[account.id] || 0;

        return {
          ...account,
          calculated_balance: accountBalance,
          payment_contributions: account.account_type === 'BANK' ? bankAccountBalance : upiAccountBalance,
          transaction_balance: bankTransactionTotals[account.id] || 0
        };
      }) || []
    };

    console.log('🏦 Bank Account Summary:', {
      totalBankBalance: summary.total_bank_balance,
      totalUpiBalance: summary.total_upi_balance,
      totalCashBalance: summary.total_cash_balance,
      paymentBreakdown: summary.payment_method_breakdown
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('💥 Bank Account Summary Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
