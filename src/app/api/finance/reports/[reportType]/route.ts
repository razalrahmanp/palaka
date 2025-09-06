import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportType: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date') || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0];
    const asOfDate = searchParams.get('as_of_date') || new Date().toISOString().split('T')[0];
    
    // Await params in Next.js 15
    const { reportType } = await params;
    
    switch (reportType) {
      case 'profit-loss':
        return await generateProfitLossReport(startDate, endDate);
      case 'balance-sheet':
        return await generateBalanceSheetReport(asOfDate);
      case 'trial-balance':
        return await generateTrialBalanceReport(asOfDate);
      case 'cash-flow':
        return await generateCashFlowReport(startDate, endDate);
      case 'account-balances':
        return await generateAccountBalancesReport(asOfDate);
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Financial report error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function generateProfitLossReport(startDate: string, endDate: string) {
  try {
    // Try using stored procedure first
    const { data, error } = await supabase.rpc('generate_profit_loss_report', {
      p_start_date: startDate,
      p_end_date: endDate
    });
    
    if (error) {
      // Fallback to manual calculation
      return await generateProfitLossManual(startDate, endDate);
    }
    
    // Group data by section
    const sections = {
      REVENUE: [] as any[],
      COST_OF_GOODS_SOLD: [] as any[],
      EXPENSES: [] as any[]
    };
    
    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalExpenses = 0;
    
    data?.forEach((item: any) => {
      if (item.section === 'REVENUE') {
        sections.REVENUE.push(item);
        totalRevenue += parseFloat(item.amount || 0);
      } else if (item.section === 'COST_OF_GOODS_SOLD') {
        sections.COST_OF_GOODS_SOLD.push(item);
        totalCOGS += parseFloat(item.amount || 0);
      } else if (item.section === 'EXPENSES') {
        sections.EXPENSES.push(item);
        totalExpenses += parseFloat(item.amount || 0);
      }
    });
    
    const grossProfit = totalRevenue - totalCOGS;
    const netIncome = grossProfit - totalExpenses;
    
    return NextResponse.json({
      report_type: 'Profit & Loss Statement',
      period: { start_date: startDate, end_date: endDate },
      sections,
      summary: {
        total_revenue: totalRevenue,
        total_cogs: totalCOGS,
        gross_profit: grossProfit,
        total_expenses: totalExpenses,
        net_income: netIncome
      },
      data
    });
  } catch (error) {
    throw error;
  }
}

async function generateProfitLossManual(startDate: string, endDate: string) {
  // Manual P&L calculation when stored procedure is not available
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select(`
      id,
      account_code,
      account_name,
      account_type,
      general_ledger!inner(debit_amount, credit_amount, transaction_date)
    `)
    .in('account_type', ['REVENUE', 'EXPENSE']) // Use only known account types
    .gte('general_ledger.transaction_date', startDate)
    .lte('general_ledger.transaction_date', endDate);
  
  if (error) throw error;
  
  const sections = {
    REVENUE: [] as any[],
    EXPENSES: [] as any[]
  };
  
  data?.forEach((account: any) => {
    const amount = account.general_ledger?.reduce((sum: number, gl: any) => {
      if (account.account_type === 'REVENUE') {
        return sum + (gl.credit_amount - gl.debit_amount);
      } else {
        return sum + (gl.debit_amount - gl.credit_amount);
      }
    }, 0) || 0;
    
    if (amount !== 0) {
      const item = {
        account_code: account.account_code,
        account_name: account.account_name,
        amount,
        account_type: account.account_type
      };
      
      sections[account.account_type as keyof typeof sections].push(item);
    }
  });
  
  return NextResponse.json({
    report_type: 'Profit & Loss Statement (Manual)',
    period: { start_date: startDate, end_date: endDate },
    sections,
    data: [...sections.REVENUE, ...sections.EXPENSES],
    note: 'Manual calculation - expense categories combined'
  });
}

async function generateBalanceSheetReport(asOfDate: string) {
  try {
    // Try using stored procedure first
    const { data, error } = await supabase.rpc('generate_balance_sheet_report', {
      p_as_of_date: asOfDate
    });
    
    if (error) {
      return await generateBalanceSheetManual(asOfDate);
    }
    
    // Group data by section
    const sections = {
      ASSETS: [] as any[],
      LIABILITIES: [] as any[],
      EQUITY: [] as any[]
    };
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    data?.forEach((item: any) => {
      if (item.section === 'ASSETS') {
        sections.ASSETS.push(item);
        totalAssets += parseFloat(item.amount || 0);
      } else if (item.section === 'LIABILITIES') {
        sections.LIABILITIES.push(item);
        totalLiabilities += parseFloat(item.amount || 0);
      } else if (item.section === 'EQUITY') {
        sections.EQUITY.push(item);
        totalEquity += parseFloat(item.amount || 0);
      }
    });
    
    return NextResponse.json({
      report_type: 'Balance Sheet',
      as_of_date: asOfDate,
      sections,
      summary: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        balance_check: totalAssets - (totalLiabilities + totalEquity)
      },
      data
    });
  } catch (error) {
    throw error;
  }
}

async function generateBalanceSheetManual(asOfDate: string) {
  const { data, error } = await supabase
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
    .in('account_type', ['ASSET', 'LIABILITY', 'EQUITY']);
  
  if (error) throw error;
  
  const sections = {
    ASSETS: [] as any[],
    LIABILITIES: [] as any[],
    EQUITY: [] as any[]
  };
  
  data?.forEach((account: any) => {
    const openingBalance = account.opening_balances?.[0] 
      ? (account.opening_balances[0].debit_amount || 0) - (account.opening_balances[0].credit_amount || 0)
      : 0;
    const glTransactions = account.general_ledger?.filter(
      (gl: any) => new Date(gl.transaction_date) <= new Date(asOfDate)
    ) || [];
    
    const transactionBalance = glTransactions.reduce((sum: number, gl: any) => {
      if (account.normal_balance === 'DEBIT') {
        return sum + (gl.debit_amount - gl.credit_amount);
      } else {
        return sum + (gl.credit_amount - gl.debit_amount);
      }
    }, 0);
    
    const balance = openingBalance + transactionBalance;
    
    if (Math.abs(balance) > 0.01) {
      const item = {
        account_code: account.account_code,
        account_name: account.account_name,
        amount: balance,
        account_type: account.account_type
      };
      
      const section = account.account_type === 'ASSET' ? 'ASSETS' : 
                    account.account_type === 'LIABILITY' ? 'LIABILITIES' : 'EQUITY';
      sections[section].push(item);
    }
  });
  
  return NextResponse.json({
    report_type: 'Balance Sheet (Manual)',
    as_of_date: asOfDate,
    sections,
    data: [...sections.ASSETS, ...sections.LIABILITIES, ...sections.EQUITY]
  });
}

async function generateTrialBalanceReport(asOfDate: string) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select(`
      id,
      account_code,
      account_name,
      account_type,
      normal_balance,
      opening_balances(debit_amount, credit_amount),
      general_ledger(debit_amount, credit_amount, transaction_date)
    `)
    .order('account_code');
  
  if (error) throw error;
  
  let totalDebits = 0;
  let totalCredits = 0;
  
  const trialBalanceData = data?.map((account: any) => {
    const openingBalance = account.opening_balances?.[0] 
      ? (account.opening_balances[0].debit_amount || 0) - (account.opening_balances[0].credit_amount || 0)
      : 0;
    const glTransactions = account.general_ledger?.filter(
      (gl: any) => new Date(gl.transaction_date) <= new Date(asOfDate)
    ) || [];
    
    const totalDebits = glTransactions.reduce((sum: number, gl: any) => sum + (gl.debit_amount || 0), 0);
    const totalCreditsGl = glTransactions.reduce((sum: number, gl: any) => sum + (gl.credit_amount || 0), 0);
    
    const currentBalance = openingBalance + totalDebits - totalCreditsGl;
    
    let debitBalance = 0;
    let creditBalance = 0;
    
    if (account.normal_balance === 'DEBIT') {
      debitBalance = currentBalance;
    } else {
      creditBalance = currentBalance;
    }
    
    return {
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      debit_balance: debitBalance > 0 ? debitBalance : 0,
      credit_balance: creditBalance > 0 ? creditBalance : 0,
      opening_balance: openingBalance,
      period_debits: totalDebits,
      period_credits: totalCreditsGl
    };
  }).filter(account => 
    Math.abs(account.debit_balance) > 0.01 || Math.abs(account.credit_balance) > 0.01
  ) || [];
  
  trialBalanceData.forEach(account => {
    totalDebits += account.debit_balance;
    totalCredits += account.credit_balance;
  });
  
  return NextResponse.json({
    report_type: 'Trial Balance',
    as_of_date: asOfDate,
    data: trialBalanceData,
    summary: {
      total_debits: totalDebits,
      total_credits: totalCredits,
      difference: totalDebits - totalCredits,
      is_balanced: Math.abs(totalDebits - totalCredits) < 0.01
    }
  });
}

async function generateCashFlowReport(startDate: string, endDate: string) {
  // Basic cash flow report based on cash account transactions
  const { data, error } = await supabase
    .from('general_ledger')
    .select(`
      *,
      chart_of_accounts(account_code, account_name),
      journal_entries(description, entry_type)
    `)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .eq('chart_of_accounts.account_code', '1001') // Cash account
    .order('transaction_date');
  
  if (error) throw error;
  
  let openingCash = 0;
  let totalInflows = 0;
  let totalOutflows = 0;
  
  const cashFlows = data?.map((gl: any) => {
    const amount = gl.debit_amount - gl.credit_amount;
    if (amount > 0) {
      totalInflows += amount;
    } else {
      totalOutflows += Math.abs(amount);
    }
    
    return {
      date: gl.transaction_date,
      description: gl.description || gl.journal_entries?.description,
      amount,
      type: amount > 0 ? 'inflow' : 'outflow',
      entry_type: gl.journal_entries?.entry_type
    };
  }) || [];
  
  const closingCash = openingCash + totalInflows - totalOutflows;
  
  return NextResponse.json({
    report_type: 'Cash Flow Statement',
    period: { start_date: startDate, end_date: endDate },
    summary: {
      opening_cash: openingCash,
      total_inflows: totalInflows,
      total_outflows: totalOutflows,
      net_cash_flow: totalInflows - totalOutflows,
      closing_cash: closingCash
    },
    data: cashFlows
  });
}

async function generateAccountBalancesReport(asOfDate: string) {
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select(`
      id,
      account_code,
      account_name,
      account_type,
      normal_balance,
      current_balance
    `)
    .order('account_code');
  
  if (error) throw error;
  
  return NextResponse.json({
    report_type: 'Account Balances',
    as_of_date: asOfDate,
    data: data?.filter(account => Math.abs(account.current_balance || 0) > 0.01) || [],
    summary: {
      total_accounts: data?.length || 0,
      accounts_with_balance: data?.filter(account => Math.abs(account.current_balance || 0) > 0.01).length || 0
    }
  });
}
