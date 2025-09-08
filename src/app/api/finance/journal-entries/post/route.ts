import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Journal entry ID is required' }, { status: 400 });
    }

    // Check if entry exists and is in draft status
    const { data: existingEntry, error: fetchError } = await supabase
      .from('journal_entries')
      .select('id, status, journal_number')
      .eq('id', id)
      .single();

    if (fetchError || !existingEntry) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    if (existingEntry.status === 'POSTED') {
      return NextResponse.json({ error: 'Journal entry is already posted' }, { status: 400 });
    }

    // Verify that the journal entry is balanced
    const { data: lines, error: linesError } = await supabase
      .from('journal_entry_lines')
      .select('debit_amount, credit_amount')
      .eq('journal_entry_id', id);

    if (linesError) {
      console.error('Error fetching journal entry lines:', linesError);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    const totalDebits = lines?.reduce((sum, line) => sum + (line.debit_amount || 0), 0) || 0;
    const totalCredits = lines?.reduce((sum, line) => sum + (line.credit_amount || 0), 0) || 0;

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json(
        { error: 'Cannot post unbalanced journal entry. Debits must equal credits.' },
        { status: 400 }
      );
    }

    // Update journal entry status to POSTED
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        status: 'POSTED',
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error posting journal entry:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Now update the chart of accounts balances
    const { data: journalLines, error: postingLinesError } = await supabase
      .from('journal_entry_lines')
      .select('account_id, debit_amount, credit_amount')
      .eq('journal_entry_id', id);

    if (postingLinesError) {
      console.error('Error fetching journal lines for posting:', postingLinesError);
      return NextResponse.json({ error: 'Failed to fetch journal lines' }, { status: 500 });
    }

    // Update each account balance in the chart of accounts
    for (const line of journalLines || []) {
      const { account_id, debit_amount = 0, credit_amount = 0 } = line;
      
      // Get current account info
      const { data: account, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('current_balance, normal_balance, account_type')
        .eq('id', account_id)
        .single();

      if (accountError) {
        console.error(`Error fetching account ${account_id}:`, accountError);
        continue; // Skip this line but continue with others
      }

      // Calculate the new balance based on normal balance type
      let balanceChange = 0;
      
      if (account.normal_balance === 'DEBIT') {
        // For DEBIT accounts: debits increase, credits decrease
        balanceChange = debit_amount - credit_amount;
      } else {
        // For CREDIT accounts: credits increase, debits decrease  
        balanceChange = credit_amount - debit_amount;
      }

      const newBalance = (account.current_balance || 0) + balanceChange;

      // Update the account balance
      const { error: updateError } = await supabase
        .from('chart_of_accounts')
        .update({ 
          current_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', account_id);

      if (updateError) {
        console.error(`Error updating account ${account_id} balance:`, updateError);
        // Continue with other accounts even if one fails
      }
    }

    return NextResponse.json({ 
      data,
      message: `Journal entry ${existingEntry.journal_number} posted successfully and chart of accounts updated` 
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
