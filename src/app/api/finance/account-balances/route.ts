import { supabase } from '@/lib/supabasePool';
import { NextResponse } from 'next/server';

interface AccountBalance {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  current_balance: number;
  opening_balance: number;
  transaction_count: number;
}

interface BalanceSummary {
  [key: string]: {
    total: number;
    accounts: AccountBalance[];
    count: number;
  };
}

interface GeneralLedgerTransaction {
  debit_amount: number;
  credit_amount: number;
  transaction_date: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountType = searchParams.get('account_type');
    const asOfDate = searchParams.get('as_of_date') || new Date().toISOString().split('T')[0];
    
    // Get real-time account balances using the view or a query
    let query = supabase
      .from('chart_of_accounts')
      .select(`
        id,
        account_code,
        account_name,
        account_type,
        normal_balance,
        current_balance,
        opening_balances(debit_amount, credit_amount),
        general_ledger(debit_amount, credit_amount, transaction_date)
      `)
      .order('account_code');
    
    if (accountType) {
      query = query.eq('account_type', accountType);
    }
    
    const { data: accounts, error } = await query;
    
    if (error) throw error;
    
    // Calculate balances for each account
    const balancesWithCalculations = accounts?.map(account => {
      // Calculate opening balance from debit/credit amounts
      const openingBalance = account.opening_balances?.[0] 
        ? (account.opening_balances[0].debit_amount || 0) - (account.opening_balances[0].credit_amount || 0)
        : 0;
      
      // Filter transactions up to the as_of_date
      const relevantTransactions = (account.general_ledger as GeneralLedgerTransaction[])?.filter(
        (gl: GeneralLedgerTransaction) => new Date(gl.transaction_date) <= new Date(asOfDate)
      ) || [];
      
      // Calculate running balance based on normal balance type
      const transactionBalance = relevantTransactions.reduce((sum: number, gl: GeneralLedgerTransaction) => {
        if (account.normal_balance === 'DEBIT') {
          return sum + (gl.debit_amount || 0) - (gl.credit_amount || 0);
        } else {
          return sum + (gl.credit_amount || 0) - (gl.debit_amount || 0);
        }
      }, 0);
      
      const currentBalance = openingBalance + transactionBalance;
      
      return {
        id: account.id,
        account_code: account.account_code,
        account_name: account.account_name,
        account_type: account.account_type,
        normal_balance: account.normal_balance,
        current_balance: currentBalance,
        opening_balance: openingBalance,
        transaction_count: relevantTransactions.length,
        last_transaction_date: relevantTransactions.length > 0 
          ? Math.max(...relevantTransactions.map((gl: GeneralLedgerTransaction) => new Date(gl.transaction_date).getTime()))
          : null
      };
    }) || [];
    
    // Calculate summary by account type
    const summary: BalanceSummary = balancesWithCalculations.reduce((acc: BalanceSummary, account) => {
      if (!acc[account.account_type]) {
        acc[account.account_type] = { total: 0, accounts: [], count: 0 };
      }
      acc[account.account_type].total += account.current_balance;
      acc[account.account_type].accounts.push(account);
      acc[account.account_type].count += 1;
      return acc;
    }, {} as BalanceSummary);
    
    // Calculate key financial metrics
    const assets = summary['ASSET']?.total || 0;
    const liabilities = summary['LIABILITY']?.total || 0;
    const equity = summary['EQUITY']?.total || 0;
    const revenue = summary['REVENUE']?.total || 0;
    const expenses = summary['EXPENSE']?.total || 0;
    
    const financialMetrics = {
      total_assets: assets,
      total_liabilities: liabilities,
      total_equity: equity,
      net_income: revenue - expenses,
      balance_check: assets - (liabilities + equity),
      working_capital: (summary['CURRENT_ASSET']?.total || 0) - (summary['CURRENT_LIABILITY']?.total || 0)
    };
    
    return NextResponse.json({ 
      data: balancesWithCalculations,
      summary,
      financial_metrics: financialMetrics,
      as_of_date: asOfDate,
      total_accounts: balancesWithCalculations.length
    });
  } catch (error) {
    console.error('Account balances fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Get balance for a specific account with transaction history
export async function POST(request: Request) {
  try {
    const { account_id, start_date, end_date } = await request.json();
    
    if (!account_id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }
    
    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('chart_of_accounts')
      .select(`
        *,
        opening_balances(balance_amount, balance_date)
      `)
      .eq('id', account_id)
      .single();
    
    if (accountError) throw accountError;
    
    // Get transaction history with running balance
    let glQuery = supabase
      .from('general_ledger')
      .select(`
        *,
        journal_entries(journal_number, description, entry_date),
        journal_entry_lines(description)
      `)
      .eq('account_id', account_id)
      .order('transaction_date', { ascending: true });
    
    if (start_date) {
      glQuery = glQuery.gte('transaction_date', start_date);
    }
    
    if (end_date) {
      glQuery = glQuery.lte('transaction_date', end_date);
    }
    
    const { data: transactions, error: glError } = await glQuery;
    
    if (glError) throw glError;
    
    // Calculate running balances
    let runningBalance = account.opening_balances?.[0]?.balance_amount || 0;
    const transactionsWithBalance = transactions?.map(transaction => {
      const balanceChange = account.normal_balance === 'DEBIT' 
        ? (transaction.debit_amount || 0) - (transaction.credit_amount || 0)
        : (transaction.credit_amount || 0) - (transaction.debit_amount || 0);
      
      runningBalance += balanceChange;
      
      return {
        ...transaction,
        balance_change: balanceChange,
        running_balance: runningBalance
      };
    }) || [];
    
    return NextResponse.json({
      account: account,
      transactions: transactionsWithBalance,
      opening_balance: account.opening_balances?.[0]?.balance_amount || 0,
      closing_balance: runningBalance,
      period: { start_date, end_date },
      transaction_count: transactionsWithBalance.length
    });
  } catch (error) {
    console.error('Account detail fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
