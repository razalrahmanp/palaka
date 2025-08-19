import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Get financial position data from accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('chart_of_accounts')
      .select('*');

    if (accountsError) {
      console.error('Error fetching chart of accounts:', accountsError);
      return NextResponse.json({ error: accountsError.message }, { status: 500 });
    }

    // Calculate financial metrics
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let cashBalance = 0;
    let accountsReceivable = 0;
    let accountsPayable = 0;

    accounts?.forEach(account => {
      if (account.is_active) {
        switch (account.account_type) {
          case 'ASSET':
            totalAssets += account.current_balance || 0;
            
            // Check for cash and accounts receivable
            if (account.account_subtype === 'CASH_AND_EQUIVALENTS') {
              cashBalance += account.current_balance || 0;
            }
            
            if (account.account_subtype === 'ACCOUNTS_RECEIVABLE') {
              accountsReceivable += account.current_balance || 0;
            }
            break;
            
          case 'LIABILITY':
            totalLiabilities += account.current_balance || 0;
            
            // Check for accounts payable
            if (account.account_subtype === 'ACCOUNTS_PAYABLE') {
              accountsPayable += account.current_balance || 0;
            }
            break;
            
          case 'EQUITY':
            totalEquity += account.current_balance || 0;
            break;
            
          case 'REVENUE':
            totalRevenue += account.current_balance || 0;
            break;
            
          case 'EXPENSE':
            totalExpenses += account.current_balance || 0;
            break;
        }
      }
    });

    // 2. Get invoice metrics
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*');

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
    }

    // Calculate invoice metrics
    const pendingInvoices = invoices?.filter(inv => inv.status === 'unpaid' || inv.status === 'partially_paid').length || 0;
    const overdueInvoices = invoices?.filter(inv => {
      // Consider invoice overdue if it has a due date in the past and is not fully paid
      const dueDate = inv.due_date ? new Date(inv.due_date) : null;
      return dueDate && dueDate < new Date() && 
        (inv.status === 'unpaid' || inv.status === 'partially_paid');
    }).length || 0;

    // 3. Get journal entries
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('status', 'DRAFT');

    if (journalError) {
      console.error('Error fetching journal entries:', journalError);
    }

    const unpostedJournals = journalEntries?.length || 0;

    // Calculate net income
    const netIncome = totalRevenue - totalExpenses;
    
    // Calculate current ratio (liquidity)
    const currentRatio = totalLiabilities === 0 ? 0 : totalAssets / totalLiabilities;
    
    // Calculate profit margin
    const profitMargin = totalRevenue === 0 ? 0 : (netIncome / totalRevenue) * 100;
    
    // Determine cash flow trend (simplified approach)
    let cashFlowTrend: 'up' | 'down' | 'stable' = 'stable';
    
    // For simplicity, we're using a positive net income as an indicator of positive cash flow
    if (netIncome > 0) {
      cashFlowTrend = 'up';
    } else if (netIncome < 0) {
      cashFlowTrend = 'down';
    }

    return NextResponse.json({
      financialSummary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalRevenue,
        totalExpenses,
        netIncome,
        cashBalance,
        accountsReceivable,
        accountsPayable,
        currentRatio
      },
      metrics: {
        pendingInvoices,
        overdueInvoices,
        unpostedJournals,
        cashFlowTrend,
        profitMargin
      }
    });

  } catch (error) {
    console.error('Error in financial-summary API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial summary' },
      { status: 500 }
    );
  }
}
