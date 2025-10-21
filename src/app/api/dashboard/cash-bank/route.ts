import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET() {
  try {    
    // Get all active bank accounts with current balances using the Finance API calculation
    const { data: bankAccounts, error: bankError } = await supabase
      .from('bank_accounts')
      .select(`
        id,
        name,
        account_number,
        current_balance,
        account_type,
        currency,
        is_active
      `)
      .eq('is_active', true)
      .order('account_type', { ascending: true });

    if (bankError) {
      console.error('Error fetching bank accounts:', bankError);
    }

    // Calculate realistic balances using transaction-based calculation (like Finance API)
    const enrichedBankAccounts = bankAccounts ? await Promise.all(
      bankAccounts.map(async (account) => {
        // Get bank transactions to calculate realistic balance
        const { data: transactions } = await supabase
          .from('bank_transactions')
          .select('type, amount')
          .eq('bank_account_id', account.id);

        let transactionBalance = 0;
        if (transactions) {
          transactionBalance = transactions.reduce((balance, transaction) => {
            if (transaction.type === 'deposit') {
              return balance + Number(transaction.amount);
            } else if (transaction.type === 'withdrawal') {
              return balance - Number(transaction.amount);
            }
            return balance;
          }, 0);
        }

        return {
          ...account,
          calculated_balance: transactionBalance
        };
      })
    ) : [];

    // Separate cash accounts from bank accounts
    const cashAccounts = enrichedBankAccounts?.filter(account => account.account_type === 'CASH') || [];
    const actualBankAccounts = enrichedBankAccounts?.filter(account => account.account_type === 'BANK') || [];
    const upiAccounts = enrichedBankAccounts?.filter(account => account.account_type === 'UPI') || [];

    // Calculate cash on hand (sum of all CASH type accounts)
    const cashOnHand = cashAccounts.reduce((sum, account) => sum + (account.calculated_balance || account.current_balance || 0), 0);

    // Format ONLY bank account balances for display (excluding UPI)
    const formattedBankBalances = actualBankAccounts.map(account => ({
      account_name: account.name,
      balance: account.calculated_balance || account.current_balance || 0,
      account_type: 'Bank',
      account_number: account.account_number || 'N/A'
    }));

    // Format UPI accounts separately
    const formattedUpiBalances = upiAccounts.map(account => ({
      account_name: account.name,
      balance: account.calculated_balance || account.current_balance || 0,
      account_type: 'UPI',
      account_number: account.account_number || 'N/A'
    }));

    // Calculate total liquid assets (cash + bank + UPI)
    const totalBankBalance = formattedBankBalances.reduce((sum, account) => sum + account.balance, 0);
    const totalUpiBalance = formattedUpiBalances.reduce((sum, account) => sum + account.balance, 0);
    const totalLiquidAssets = cashOnHand + totalBankBalance + totalUpiBalance;

    // Balance validation - Flag unrealistic amounts (check both bank and UPI)
    const UNREALISTIC_BALANCE_THRESHOLD = 1000000000; // ₹1 billion
    const allAccountsForValidation = [...formattedBankBalances, ...formattedUpiBalances];
    const accountsWithLargeBalances = allAccountsForValidation.filter(account => 
      Math.abs(account.balance) > UNREALISTIC_BALANCE_THRESHOLD
    );

    const balanceWarnings = accountsWithLargeBalances.map(account => ({
      account_name: account.account_name,
      balance: account.balance,
      warning: `Unrealistic balance detected: ₹${account.balance.toLocaleString()}`,
      suggested_fix: account.balance > UNREALISTIC_BALANCE_THRESHOLD 
        ? `Consider dividing by 1000: ₹${(account.balance / 1000).toLocaleString()}`
        : 'Review this negative balance'
    }));

    // Get the most recent update timestamp
    const lastUpdated = enrichedBankAccounts && enrichedBankAccounts.length > 0 
      ? new Date().toLocaleString() 
      : 'No data available';

    const cashBankData = {
      cash_on_hand: cashOnHand,
      bank_balances: formattedBankBalances, // Only BANK type accounts
      upi_balances: formattedUpiBalances,   // Only UPI type accounts
      total_liquid_assets: totalLiquidAssets,
      last_updated: lastUpdated,
      balance_warnings: balanceWarnings,
      debug: {
        total_accounts_found: enrichedBankAccounts?.length || 0,
        cash_accounts_count: cashAccounts.length,
        bank_accounts_count: actualBankAccounts.length,
        upi_accounts_count: upiAccounts.length,
        sample_accounts: enrichedBankAccounts?.slice(0, 3) || [],
        balance_correction_applied: true
      }
    };

    console.log('🏦 Cash & Bank Analysis:', {
      cashOnHand: `₹${cashOnHand.toLocaleString()}`,
      totalBankBalance: `₹${totalBankBalance.toLocaleString()}`,
      totalUpiBalance: `₹${totalUpiBalance.toLocaleString()}`,
      totalLiquidAssets: `₹${totalLiquidAssets.toLocaleString()}`,
      accountsCount: {
        total: enrichedBankAccounts?.length || 0,
        cash: cashAccounts.length,
        bank: actualBankAccounts.length,
        upi: upiAccounts.length
      },
      balanceCorrectionApplied: true
    });

    return NextResponse.json({
      success: true,
      data: cashBankData
    });

  } catch (error) {
    console.error('Error fetching cash bank data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch cash bank data',
        data: null
      },
      { status: 500 }
    );
  }
}