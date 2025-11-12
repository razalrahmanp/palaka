import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    console.log('💰 Fetching Finance Dashboard Data:', { startDate, endDate });

    // Fetch all required data in parallel
    const [
      expensesResult,
      salesOrdersResult,
      liabilitiesResult,
      withdrawalsResult,
      bankAccountsResult,
      bankTransactionsResult
    ] = await Promise.all([
      // Expenses
      supabase
        .from('expenses')
        .select('id, amount, category, created_at, description')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z'),

      // Sales orders for revenue calculation
      supabase
        .from('sales_orders')
        .select('id, final_price, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z'),

      // Liabilities
      supabase
        .from('liability_payments')
        .select('id, amount, status, due_date, created_at'),

      // Withdrawals
      supabase
        .from('withdrawals')
        .select('id, amount, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z'),

      // Bank accounts for cash position
      supabase
        .from('bank_accounts')
        .select('id, name, current_balance, account_type, is_active')
        .eq('is_active', true),

      // Get bank transactions for the period with account info
      supabase
        .from('bank_transactions')
        .select(`
          id, 
          amount, 
          type, 
          date, 
          bank_account_id,
          bank_accounts!inner(account_type)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
    ]);

    // Calculate Total Expenses
    const totalExpenses = expensesResult.data?.reduce((sum, expense) => 
      sum + (expense.amount || 0), 0
    ) || 0;

    // Calculate Revenue for Operating Margin
    const revenue = salesOrdersResult.data?.reduce((sum, order) => 
      sum + (order.final_price || 0), 0
    ) || 0;

    // Calculate Operating Margin
    const operatingProfit = revenue - totalExpenses;
    const operatingMargin = revenue > 0 
      ? ((operatingProfit / revenue) * 100).toFixed(1) 
      : '0.0';

    // Calculate Total Liabilities
    const totalLiabilities = liabilitiesResult.data?.reduce((sum, liability) => 
      sum + (liability.amount || 0), 0
    ) || 0;

    // Calculate Withdrawals
    const totalWithdrawals = withdrawalsResult.data?.reduce((sum, withdrawal) => 
      sum + (withdrawal.amount || 0), 0
    ) || 0;

    // Calculate Burn Rate (total expenses per month)
    const burnRate = totalExpenses;

    // Calculate Cash Position
    const cashPosition = bankAccountsResult.data?.reduce((sum, account) => 
      sum + (account.current_balance || 0), 0
    ) || 0;

    // Prepare bank accounts data grouped by type
    const bankAccounts = {
      cash: bankAccountsResult.data?.filter(acc => acc.account_type === 'CASH').map(acc => ({
        id: acc.id,
        name: acc.name,
        balance: acc.current_balance || 0,
        type: 'CASH'
      })) || [],
      bank: bankAccountsResult.data?.filter(acc => acc.account_type === 'BANK' || acc.account_type === 'UPI').map(acc => ({
        id: acc.id,
        name: acc.name,
        balance: acc.current_balance || 0,
        type: acc.account_type
      })) || []
    };

    // Calculate cash flow by CASH account type only for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const cashFlowTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Filter transactions from CASH accounts only
      const dayTransactions = bankTransactionsResult.data?.filter(txn => {
        const accountInfo = txn.bank_accounts as { account_type?: string } | undefined;
        return txn.date === dateStr && accountInfo?.account_type === 'CASH';
      }) || [];

      const cashIn = dayTransactions
        .filter(txn => txn.type === 'deposit')
        .reduce((sum, txn) => sum + (txn.amount || 0), 0);

      const cashOut = dayTransactions
        .filter(txn => txn.type === 'withdrawal')
        .reduce((sum, txn) => sum + (txn.amount || 0), 0);

      cashFlowTrend.push({
        date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        cashIn: Math.round(cashIn),
        cashOut: Math.round(cashOut),
        net: Math.round(cashIn - cashOut)
      });
    }

    // Calculate Cash Runway (in months)
    const cashRunway = burnRate > 0 
      ? (cashPosition / burnRate).toFixed(1) 
      : '0.0';

    // Expense Breakdown by Category
    const expensesByCategory: Record<string, number> = {};
    expensesResult.data?.forEach(expense => {
      const category = expense.category || 'Others';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + (expense.amount || 0);
    });

    const expenseBreakdown = Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Expense Trend (last 7 days)
    const expenseTrend = [];
    const dailyBudget = burnRate / 30; // Average daily budget

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayExpenses = expensesResult.data?.filter(expense => 
        expense.created_at?.startsWith(dateStr)
      ).reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

      expenseTrend.push({
        date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        expenses: dayExpenses,
        budget: Math.round(dailyBudget)
      });
    }

    // Running Capital Requirements (Daily and Monthly)
    const dailyCapitalNeeded = Math.round(burnRate / 30); // Average daily expenses
    const monthlyCapitalNeeded = Math.round(burnRate); // Total monthly expenses
    const dailyRevenue = Math.round(revenue / 30); // Average daily revenue
    const monthlyRevenue = Math.round(revenue); // Total monthly revenue

    // Running capital trend showing capital requirements
    const runningCapital = [
      { 
        period: 'Daily Avg', 
        expenses: dailyCapitalNeeded,
        revenue: dailyRevenue,
        net: dailyRevenue - dailyCapitalNeeded
      },
      { 
        period: 'Weekly Avg', 
        expenses: Math.round(dailyCapitalNeeded * 7),
        revenue: Math.round(dailyRevenue * 7),
        net: Math.round((dailyRevenue - dailyCapitalNeeded) * 7)
      },
      { 
        period: 'Monthly', 
        expenses: monthlyCapitalNeeded,
        revenue: monthlyRevenue,
        net: monthlyRevenue - monthlyCapitalNeeded
      }
    ];

    // Liability Aging
    const agingRanges = {
      'Current': { value: 0, items: 0 },
      '1-30 days': { value: 0, items: 0 },
      '31-60 days': { value: 0, items: 0 },
      '60+ days': { value: 0, items: 0 },
    };

    liabilitiesResult.data?.forEach(liability => {
      if (!liability.due_date) return;
      
      const daysOverdue = Math.floor((now.getTime() - new Date(liability.due_date).getTime()) / (1000 * 60 * 60 * 24));
      const amount = liability.amount || 0;
      
      if (daysOverdue < 0) {
        agingRanges['Current'].value += amount;
        agingRanges['Current'].items += 1;
      } else if (daysOverdue <= 30) {
        agingRanges['1-30 days'].value += amount;
        agingRanges['1-30 days'].items += 1;
      } else if (daysOverdue <= 60) {
        agingRanges['31-60 days'].value += amount;
        agingRanges['31-60 days'].items += 1;
      } else {
        agingRanges['60+ days'].value += amount;
        agingRanges['60+ days'].items += 1;
      }
    });

    const liabilityAging = Object.entries(agingRanges).map(([range, data]) => ({
      range,
      value: Math.round(data.value),
      items: data.items
    }));

    const response = {
      success: true,
      data: {
        totalExpenses: Math.round(totalExpenses),
        operatingMargin,
        totalLiabilities: Math.round(totalLiabilities),
        withdrawals: Math.round(totalWithdrawals),
        burnRate: Math.round(burnRate),
        cashRunway: `${cashRunway} mo`,
        expenseBreakdown,
        expenseTrend,
        runningCapital, // Daily, Weekly, Monthly capital requirements
        liabilityAging,
        bankAccounts, // Cash and Bank accounts grouped by type
        cashFlowTrend, // 7-day cash in/out trend
        summary: {
          revenue: Math.round(revenue),
          operatingProfit: Math.round(operatingProfit),
          cashPosition: Math.round(cashPosition),
          totalExpenseCount: expensesResult.data?.length || 0,
          totalLiabilityCount: liabilitiesResult.data?.length || 0
        }
      }
    };

    console.log('✅ Finance Dashboard Data:', response.data);

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error fetching finance data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch finance data' 
      },
      { status: 500 }
    );
  }
}
