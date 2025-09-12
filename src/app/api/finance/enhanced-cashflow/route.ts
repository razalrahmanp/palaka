import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get payments (cash inflows)
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, date, payment_date, method, description')
      .order('date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Get expenses (cash outflows)
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount, date, subcategory, description, payment_method')
      .order('date', { ascending: false });

    if (expensesError) {
      console.error('Error fetching expenses:', expensesError);
    }

    // Get bank account transactions for additional cash flow insights
    const { data: bankTransactions, error: bankError } = await supabase
      .from('bank_transactions')
      .select('amount, type, date, description')
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

      // Calculate outflows for this date
      const dayExpenses = expenses?.filter(e => 
        e.date?.split('T')[0] === dateString
      ) || [];
      const dayOutflows = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Add bank transaction outflows
      const dayBankOutflows = bankTransactions?.filter(t => 
        t.date?.split('T')[0] === dateString && t.type === 'withdrawal'
      )?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      dailyCashFlow.push({
        date: dateString,
        displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        inflows: dayInflows,
        outflows: dayOutflows + dayBankOutflows,
        netFlow: dayInflows - (dayOutflows + dayBankOutflows),
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

      // Monthly outflows
      const monthExpenses = expenses?.filter(e => 
        e.date?.substring(0, 7) === monthKey
      ) || [];
      const monthOutflows = monthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Bank transaction outflows
      const monthBankOutflows = bankTransactions?.filter(t => 
        t.date?.substring(0, 7) === monthKey && t.type === 'withdrawal'
      )?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

      monthlyCashFlow.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        inflows: monthInflows,
        outflows: monthOutflows + monthBankOutflows,
        netFlow: monthInflows - (monthOutflows + monthBankOutflows),
        inflowsCount: monthPayments.length,
        outflowsCount: monthExpenses.length
      });
    }

    // Categorize expenses for expense breakdown
    const expenseCategories: { [key: string]: number } = {};
    expenses?.forEach(expense => {
      const category = expense.subcategory || 'Uncategorized';
      expenseCategories[category] = (expenseCategories[category] || 0) + (expense.amount || 0);
    });

    const expenseBreakdown = Object.entries(expenseCategories)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

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

    // Summary calculations
    const totalInflows = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const totalOutflows = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    const netCashFlow = totalInflows - totalOutflows;
    
    // Operating cash flow (exclude non-operational items)
    const operationalExpenses = expenses?.filter(e => 
      !e.subcategory?.toLowerCase().includes('capital') && 
      !e.subcategory?.toLowerCase().includes('investment')
    )?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
    
    const operatingCashFlow = totalInflows - operationalExpenses;

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