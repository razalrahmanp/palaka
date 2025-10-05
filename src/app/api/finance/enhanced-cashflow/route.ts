import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Calculate date range - prioritize explicit date params over period
    let startDate: Date;
    let endDate: Date;
    
    if (startDateParam && endDateParam) {
      // Use explicit start and end dates from URL parameters
      startDate = new Date(`${startDateParam}T00:00:00.000Z`);
      endDate = new Date(`${endDateParam}T23:59:59.999Z`);
    } else if (period === 'all_time') {
      // All time - use a very wide date range
      startDate = new Date('2020-01-01T00:00:00.000Z');
      endDate = new Date('2030-12-31T23:59:59.999Z');
    } else {
      // Default to current month for backwards compatibility
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    console.log('🔍 Enhanced Cashflow Date Range:', {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    // Get chart of accounts for expense categorization
    const { data: chartOfAccounts, error: chartError } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_type, account_subtype, current_balance')
      .eq('account_type', 'EXPENSE')
      .eq('is_active', true);

    if (chartError) {
      console.error('Error fetching chart of accounts:', chartError);
    }

    // Get journal entries for more accurate expense tracking
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines (
          account_id,
          debit_amount,
          credit_amount,
          chart_of_accounts (
            account_name,
            account_type,
            account_subtype
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (journalError) {
      console.error('Error fetching journal entries:', journalError);
    }

    // Get payments (cash inflows) - filtered by date range
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, date, payment_date, method, description')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Get expenses (cash outflows) - Primary source for expense analysis, filtered by date range
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount, date, subcategory, description, payment_method, category, entity_type')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
    }

    // Get bank account transactions for additional cash flow insights, filtered by date range
    const { data: bankTransactions, error: bankError } = await supabase
      .from('bank_transactions')
      .select('amount, type, date, description')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (bankError) {
      console.error('Error fetching bank transactions:', bankError);
    }

    // Calculate daily cash flow for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    interface DailyCashFlowItem {
      date: string;
      inflows: number;
      outflows: number;
      netFlow: number;
      runningBalance: number;
      displayDate: string;
    }

    const dailyCashFlow: DailyCashFlowItem[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      // Calculate inflows for this date
      const dayPayments = payments?.filter(p => 
        (p.date?.split('T')[0] === dateString || p.payment_date?.split('T')[0] === dateString)
      ) || [];
      const dayInflows = dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Calculate outflows for this date (use bank withdrawals as actual cash outflows)
      const dayBankOutflows = bankTransactions?.filter(t => 
        t.date?.split('T')[0] === dateString && t.type === 'withdrawal'
      )?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      dailyCashFlow.push({
        date: dateString,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        inflows: dayInflows,
        outflows: dayBankOutflows,
        netFlow: dayInflows - dayBankOutflows,
        runningBalance: 0 // Will calculate below
      });
    }

    // Calculate running balance
    let runningBalance = 0;
    dailyCashFlow.forEach(day => {
      runningBalance += day.netFlow;
      day.runningBalance = runningBalance;
    });

    // Monthly cash flow analysis for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyCashFlow = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthKey = monthDate.toISOString().substring(0, 7); // YYYY-MM

      // Monthly inflows
      const monthPayments = payments?.filter(p => 
        (p.date?.substring(0, 7) === monthKey || p.payment_date?.substring(0, 7) === monthKey)
      ) || [];
      const monthInflows = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Monthly outflows (use bank withdrawals as actual cash outflows)
      const monthBankOutflows = bankTransactions?.filter(t => 
        t.date?.substring(0, 7) === monthKey && t.type === 'withdrawal'
      )?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      monthlyCashFlow.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        inflows: monthInflows,
        outflows: monthBankOutflows,
        netFlow: monthInflows - monthBankOutflows,
        inflowsCount: monthPayments.length,
        outflowsCount: bankTransactions?.filter(t => 
          t.date?.substring(0, 7) === monthKey && t.type === 'withdrawal'
        )?.length || 0
      });
    }

    // Categorize expenses using expenses table as primary source
    const expenseCategories: { [key: string]: number } = {};
    
    // Primary: Process expenses table with category and subcategory fields
    expenses?.forEach(expense => {
      const category = expense.category || expense.subcategory || 'Operating Expenses';
      expenseCategories[category] = (expenseCategories[category] || 0) + (expense.amount || 0);
    });

    // Fallback 1: Use journal entries if expenses table is empty or insufficient
    if (Object.keys(expenseCategories).length === 0 || 
        Object.values(expenseCategories).reduce((sum, val) => sum + val, 0) < 1000) {
      
      journalEntries?.forEach(entry => {
        entry.journal_entry_lines?.forEach((line: {
          account_id: string;
          debit_amount: number;
          credit_amount: number;
          chart_of_accounts: {
            account_name: string;
            account_type: string;
            account_subtype: string;
          };
        }) => {
          if (line.chart_of_accounts?.account_type === 'EXPENSE' && line.debit_amount > 0) {
            const category = line.chart_of_accounts?.account_subtype || 
                            line.chart_of_accounts?.account_name || 
                            'Other Expenses';
            expenseCategories[category] = (expenseCategories[category] || 0) + (line.debit_amount || 0);
          }
        });
      });
    }

    // Fallback 2: Use chart of accounts current balances as last resort
    if (Object.keys(expenseCategories).length === 0 || 
        Object.values(expenseCategories).reduce((sum, val) => sum + val, 0) < 1000) {
      
      chartOfAccounts?.forEach(account => {
        if (account.current_balance && account.current_balance > 0) {
          const category = account.account_subtype?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 
                          account.account_name || 
                          'Operating Expenses';
          expenseCategories[category] = (expenseCategories[category] || 0) + Math.abs(account.current_balance);
        }
      });
    }
    
    // Note: We don't add bank withdrawals separately as they represent the payment method
    // for the expenses already categorized above

    // Create expense breakdown with better categorization
    const expenseBreakdown = Object.entries(expenseCategories)
      .map(([category, amount]) => ({ 
        category: category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), 
        amount 
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Create accounts summary from expenses table instead of chart of accounts
    const expenseAccounts: { [key: string]: { amount: number; count: number; subcategory?: string } } = {};
    
    expenses?.forEach(expense => {
      const accountKey = expense.subcategory || expense.category || 'Miscellaneous';
      if (!expenseAccounts[accountKey]) {
        expenseAccounts[accountKey] = { amount: 0, count: 0, subcategory: expense.subcategory };
      }
      expenseAccounts[accountKey].amount += expense.amount || 0;
      expenseAccounts[accountKey].count += 1;
    });

    const accountsSummary = Object.entries(expenseAccounts)
      .map(([accountName, data], index) => ({
        code: `EXP-${String(index + 1).padStart(3, '0')}`, // Generate expense account codes
        name: accountName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        type: data.subcategory ? 'SUBCATEGORY EXPENSE' : 'CATEGORY EXPENSE',
        balance: data.amount,
        count: data.count
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 15);

    // Payment method analysis
    const paymentMethods: { [key: string]: { amount: number; count: number } } = {};
    payments?.forEach(payment => {
      const method = payment.method || 'Unknown';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { amount: 0, count: 0 };
      }
      paymentMethods[method].amount += payment.amount || 0;
      paymentMethods[method].count += 1;
    });

    const paymentMethodBreakdown = Object.entries(paymentMethods)
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.amount - a.amount);

    // Summary calculations - Use bank withdrawals as the primary outflow source
    const totalInflows = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    
    // Calculate total expenses from expenses table (primary source)
    const totalExpensesFromTable = expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    
    // Use bank withdrawals as backup for cash flow analysis
    const bankWithdrawalsTotal = bankTransactions?.filter(t => t.type === 'withdrawal')
      ?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    
    // Use expenses table total as primary outflow, fallback to bank withdrawals if insufficient
    const totalOutflows = totalExpensesFromTable > 0 ? totalExpensesFromTable : bankWithdrawalsTotal;
    
    const netCashFlow = totalInflows - totalOutflows;
    
    // Operating cash flow (use same calculation)
    const operatingCashFlow = totalInflows - totalOutflows;

    // Cash flow velocity (average daily cash movement)
    const avgDailyInflow = dailyCashFlow.length > 0 
      ? dailyCashFlow.reduce((sum, day) => sum + day.inflows, 0) / dailyCashFlow.length 
      : 0;
    const avgDailyOutflow = dailyCashFlow.length > 0 
      ? dailyCashFlow.reduce((sum, day) => sum + day.outflows, 0) / dailyCashFlow.length 
      : 0;

    // Cash flow health indicators
    const cashFlowRatio = totalOutflows > 0 ? totalInflows / totalOutflows : 0;
    const positiveFlowDays = dailyCashFlow.filter(day => day.netFlow > 0).length;
    const cashFlowVolatility = dailyCashFlow.length > 0 
      ? Math.sqrt(dailyCashFlow.reduce((sum, day) => {
          const avgNetFlow = dailyCashFlow.reduce((s, d) => s + d.netFlow, 0) / dailyCashFlow.length;
          return sum + Math.pow(day.netFlow - avgNetFlow, 2);
        }, 0) / dailyCashFlow.length)
      : 0;

    return NextResponse.json({
      summary: {
        totalInflows,
        totalOutflows,
        netCashFlow,
        operatingCashFlow,
        cashFlowRatio,
        avgDailyInflow,
        avgDailyOutflow,
        positiveFlowDays,
        cashFlowVolatility
      },
      dailyCashFlow,
      monthlyCashFlow,
      expenseBreakdown,
      paymentMethodBreakdown,
      accountsSummary,
      metrics: {
        inflowTransactions: payments?.length || 0,
        outflowTransactions: expenses?.length || 0,
        avgTransactionSize: (payments && payments.length > 0) ? totalInflows / payments.length : 0,
        cashTurnoverRatio: totalInflows > 0 ? (totalInflows + totalOutflows) / totalInflows : 0,
        netMargin: totalInflows > 0 ? (netCashFlow / totalInflows) * 100 : 0
      },
      trends: {
        inflowTrend: monthlyCashFlow.slice(-3).reduce((sum, m) => sum + m.inflows, 0) / 3,
        outflowTrend: monthlyCashFlow.slice(-3).reduce((sum, m) => sum + m.outflows, 0) / 3,
        netFlowTrend: monthlyCashFlow.slice(-3).reduce((sum, m) => sum + m.netFlow, 0) / 3
      }
    });

  } catch (error) {
    console.error('Error in enhanced cash flow analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}