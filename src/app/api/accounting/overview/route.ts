import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  transactions: number;
}

export async function GET() {
  try {
    // Get account balances by type
    const { data: accountBalances, error: balanceError } = await supabase
      .from('chart_of_accounts')
      .select('account_type, account_subtype, current_balance, normal_balance')
      .not('current_balance', 'is', null);

    if (balanceError) throw balanceError;

    // Calculate financial totals
    const totals = accountBalances?.reduce((acc, account) => {
      const balance = account.current_balance || 0;
      const adjustedBalance = account.normal_balance === 'CREDIT' ? balance : -balance;
      
      switch (account.account_type) {
        case 'ASSET':
          acc.totalAssets += Math.abs(balance);
          if (account.account_subtype === 'CURRENT_ASSET') {
            acc.currentAssets += Math.abs(balance);
          }
          break;
        case 'LIABILITY':
          acc.totalLiabilities += Math.abs(balance);
          if (account.account_subtype === 'CURRENT_LIABILITY') {
            acc.currentLiabilities += Math.abs(balance);
          }
          break;
        case 'EQUITY':
          acc.totalEquity += adjustedBalance;
          break;
        case 'REVENUE':
          acc.totalRevenue += adjustedBalance;
          break;
        case 'EXPENSE':
          acc.totalExpenses += Math.abs(balance);
          break;
      }
      return acc;
    }, {
      totalAssets: 0,
      currentAssets: 0,
      totalLiabilities: 0,
      currentLiabilities: 0,
      totalEquity: 0,
      totalRevenue: 0,
      totalExpenses: 0
    }) || {
      totalAssets: 0,
      currentAssets: 0,
      totalLiabilities: 0,
      currentLiabilities: 0,
      totalEquity: 0,
      totalRevenue: 0,
      totalExpenses: 0
    };

    // Get cash position from bank accounts
    const { data: bankAccounts, error: bankError } = await supabase
      .from('bank_accounts')
      .select('current_balance, account_type')
      .eq('is_active', true);

    if (bankError) throw bankError;

    const cashPosition = bankAccounts?.reduce((sum, account) => 
      sum + (account.current_balance || 0), 0) || 0;

    // Get supplier outstanding from vendor bills
    const { data: supplierBills, error: supplierError } = await supabase
      .from('vendor_bills')
      .select('total_amount, paid_amount, status')
      .in('status', ['pending', 'partial', 'overdue']);

    if (supplierError) throw supplierError;

    const supplierOutstanding = supplierBills?.reduce((sum, bill) => 
      sum + ((bill.total_amount || 0) - (bill.paid_amount || 0)), 0) || 0;

    // Get customer receivables from invoices
    const { data: customerInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('total, paid_amount, status')
      .in('status', ['pending', 'partial', 'overdue']);

    if (invoiceError) throw invoiceError;

    const customerReceivables = customerInvoices?.reduce((sum, invoice) => 
      sum + ((invoice.total || 0) - (invoice.paid_amount || 0)), 0) || 0;

    // Get recent transactions for activity feed
    const { data: recentTransactions, error: transactionError } = await supabase
      .from('journal_entries')
      .select(`
        id,
        journal_number,
        entry_date,
        description,
        total_debit,
        total_credit,
        status,
        entry_type,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (transactionError) throw transactionError;

    // Calculate financial health metrics
    const workingCapital = totals.currentAssets - totals.currentLiabilities;
    const currentRatio = totals.currentLiabilities > 0 ? 
      totals.currentAssets / totals.currentLiabilities : 0;
    const debtToEquity = totals.totalEquity > 0 ? 
      totals.totalLiabilities / totals.totalEquity : 0;
    const netIncome = totals.totalRevenue - totals.totalExpenses;
    const grossMargin = totals.totalRevenue > 0 ? 
      ((totals.totalRevenue - totals.totalExpenses) / totals.totalRevenue) * 100 : 0;

    // Get monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: monthlyData, error: monthlyError } = await supabase
      .from('journal_entries')
      .select('entry_date, total_debit, total_credit, entry_type')
      .gte('entry_date', sixMonthsAgo.toISOString().split('T')[0])
      .eq('status', 'POSTED')
      .order('entry_date', { ascending: true });

    if (monthlyError) throw monthlyError;

    // Group by month for trends
    const monthlyTrends = monthlyData?.reduce((acc, entry) => {
      const month = entry.entry_date.substring(0, 7); // YYYY-MM format
      if (!acc[month]) {
        acc[month] = { month, revenue: 0, expenses: 0, transactions: 0 };
      }
      
      // This is a simplified calculation - in reality you'd need to identify revenue/expense entries
      if (entry.entry_type === 'SALE' || entry.entry_type === 'REVENUE') {
        acc[month].revenue += entry.total_credit || 0;
      } else if (entry.entry_type === 'EXPENSE' || entry.entry_type === 'PURCHASE') {
        acc[month].expenses += entry.total_debit || 0;
      }
      
      acc[month].transactions += 1;
      return acc;
    }, {} as Record<string, MonthlyTrend>) || {};

    return NextResponse.json({
      success: true,
      data: {
        financialSummary: {
          totalAssets: totals.totalAssets,
          totalLiabilities: totals.totalLiabilities,
          totalEquity: totals.totalEquity,
          netWorth: totals.totalAssets - totals.totalLiabilities,
          cashPosition,
          workingCapital,
          netIncome
        },
        operationalMetrics: {
          supplierOutstanding,
          customerReceivables,
          totalRevenue: totals.totalRevenue,
          totalExpenses: totals.totalExpenses,
          grossMargin
        },
        healthMetrics: {
          currentRatio,
          debtToEquity,
          cashRatio: totals.currentLiabilities > 0 ? cashPosition / totals.currentLiabilities : 0,
          assetTurnover: totals.totalRevenue > 0 && totals.totalAssets > 0 ? 
            totals.totalRevenue / totals.totalAssets : 0
        },
        accountBreakdown: {
          currentAssets: totals.currentAssets,
          nonCurrentAssets: totals.totalAssets - totals.currentAssets,
          currentLiabilities: totals.currentLiabilities,
          nonCurrentLiabilities: totals.totalLiabilities - totals.currentLiabilities,
          retainedEarnings: totals.totalEquity
        },
        recentActivity: recentTransactions || [],
        monthlyTrends: Object.values(monthlyTrends).slice(-6), // Last 6 months
        asOfDate: new Date().toISOString(),
        balanceSheet: {
          assets: {
            current: totals.currentAssets,
            nonCurrent: totals.totalAssets - totals.currentAssets,
            total: totals.totalAssets
          },
          liabilities: {
            current: totals.currentLiabilities,
            nonCurrent: totals.totalLiabilities - totals.currentLiabilities,
            total: totals.totalLiabilities
          },
          equity: {
            total: totals.totalEquity
          }
        },
        incomeStatement: {
          revenue: totals.totalRevenue,
          expenses: totals.totalExpenses,
          netIncome: totals.totalRevenue - totals.totalExpenses,
          period: 'Year to Date'
        }
      }
    });

  } catch (error) {
    console.error('Accounting overview error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounting overview' },
      { status: 500 }
    );
  }
}
