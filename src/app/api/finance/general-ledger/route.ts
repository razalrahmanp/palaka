import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('account_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    let query = supabase
      .from('journal_entry_lines')
      .select(`
        *,
        journal_entries:journal_entry_id (
          id,
          entry_date,
          description,
          reference_number,
          status
        ),
        chart_of_accounts:account_id (
          id,
          account_code,
          account_name,
          account_type
        )
      `)
      .order('journal_entries(entry_date)', { ascending: true });

    // Filter by account if specified
    if (accountId && accountId !== 'all') {
      query = query.eq('account_id', accountId);
    }

    // Filter by date range if specified
    if (dateFrom) {
      query = query.gte('journal_entries.entry_date', dateFrom);
    }
    if (dateTo) {
      query = query.lte('journal_entries.entry_date', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching general ledger:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to include running balances
    const transformedData = [];
    const accountBalances: Record<string, number> = {};

    for (const entry of data || []) {
      const accountId = entry.account_id;
      const debitAmount = entry.debit_amount || 0;
      const creditAmount = entry.credit_amount || 0;
      
      // Initialize account balance if not exists
      if (!(accountId in accountBalances)) {
        accountBalances[accountId] = 0;
      }
      
      // Update running balance based on account type
      const accountType = entry.chart_of_accounts?.account_type;
      if (['ASSET', 'EXPENSE'].includes(accountType)) {
        // Debit increases, credit decreases
        accountBalances[accountId] += (debitAmount - creditAmount);
      } else {
        // LIABILITY, EQUITY, REVENUE: Credit increases, debit decreases
        accountBalances[accountId] += (creditAmount - debitAmount);
      }

      transformedData.push({
        id: entry.id,
        journal_entry_id: entry.journal_entry_id,
        account_id: entry.account_id,
        account_code: entry.chart_of_accounts?.account_code || '',
        account_name: entry.chart_of_accounts?.account_name || '',
        account_type: entry.chart_of_accounts?.account_type || '',
        transaction_date: entry.journal_entries?.entry_date || '',
        description: entry.journal_entries?.description || '',
        reference_number: entry.journal_entries?.reference_number || '',
        debit_amount: debitAmount,
        credit_amount: creditAmount,
        running_balance: accountBalances[accountId],
        journal_status: entry.journal_entries?.status || 'DRAFT',
      });
    }

    return NextResponse.json({ data: transformedData });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
