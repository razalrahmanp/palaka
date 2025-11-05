import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

// Helper function to fetch all records with pagination
async function fetchAllRecords<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  pageSize: number = 1000
): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    
    if (error) {
      console.error('Error fetching records:', error);
      break;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += pageSize;
      hasMore = data.length === pageSize; // If we got less than pageSize, we're done
    } else {
      hasMore = false;
    }
  }

  return allData;
}

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

    // Get payments (cash inflows) - filtered by date range
    // Using pagination to fetch ALL records (Supabase has a 1000 row limit per request)
    const paymentsQuery = supabase
      .from('payments')
      .select('amount, date, payment_date, method, description')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payments = await fetchAllRecords<any>(paymentsQuery);
    console.log('💰 Fetched payments count:', payments?.length || 0);

    // Get expenses (cash outflows) - Primary and ONLY source for expense analysis, filtered by date range
    // Using pagination to fetch ALL records (Supabase has a 1000 row limit per request)
    const expensesQuery = supabase
      .from('expenses')
      .select('amount, date, subcategory, description, payment_method, category, entity_type')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expenses = await fetchAllRecords<any>(expensesQuery);
    console.log('📊 Fetched expenses count:', expenses?.length || 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.log('📊 Total expense amount:', expenses?.reduce((sum: any, e: any) => sum + (e.amount || 0), 0) || 0);

    // Get bank account transactions for additional cash flow insights, filtered by date range
    // Using pagination to fetch ALL records
    const bankQuery = supabase
      .from('bank_transactions')
      .select('amount, type, date, description')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bankTransactions = await fetchAllRecords<any>(bankQuery);
    console.log('🏦 Fetched bank transactions count:', bankTransactions?.length || 0);

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

    // Categorize expenses using expenses table as the ONLY source
    const expenseCategories: { [key: string]: number } = {};
    
    // Process expenses table with ONLY category field (ignore subcategory)
    expenses?.forEach(expense => {
      const category = expense.category || 'Operating Expenses';
      expenseCategories[category] = (expenseCategories[category] || 0) + (expense.amount || 0);
    });

    // Debug: Log Manufacturing category details
    const manufacturingExpenses = expenses?.filter(e => e.category === 'Manufacturing') || [];
    console.log('🏭 Manufacturing expenses:', {
      count: manufacturingExpenses.length,
      total: manufacturingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      categoryTotal: expenseCategories['Manufacturing']
    });
    
    // Create expense breakdown with better categorization
    const expenseBreakdown = Object.entries(expenseCategories)
      .map(([category, amount]) => ({ 
        category: category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()), 
        amount 
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Create accounts summary from expenses table with category-based grouping
    const expenseAccounts: { [key: string]: { amount: number; count: number; category: string; subcategory?: string } } = {};
    
    expenses?.forEach(expense => {
      // Always use category as the primary key, ignore subcategory for grouping
      const accountKey = expense.category || 'Miscellaneous';
      if (!expenseAccounts[accountKey]) {
        expenseAccounts[accountKey] = { 
          amount: 0, 
          count: 0, 
          category: expense.category || 'Other',
          subcategory: undefined
        };
      }
      expenseAccounts[accountKey].amount += expense.amount || 0;
      expenseAccounts[accountKey].count += 1;
    });

    const accountsSummary = Object.entries(expenseAccounts)
      .map(([accountName, data], index) => ({
        code: accountName, // Use the actual category/subcategory name as code for API queries
        displayCode: `EXP-${String(index + 1).padStart(3, '0')}`, // Display-friendly code
        name: accountName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        type: data.subcategory ? 'SUBCATEGORY EXPENSE' : 'CATEGORY EXPENSE',
        balance: -data.amount, // Negative for expenses
        count: data.count,
        category: data.category
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 20);

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