import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log('🔄 Starting chart of accounts synchronization...');

    // Get all journal entry lines from DRAFT entries (not yet reflected in chart)
    const { data: journalLines, error: linesError } = await supabase
      .from('journal_entry_lines')
      .select(`
        account_id,
        debit_amount,
        credit_amount,
        journal_entries!inner(status, journal_number)
      `)
      .eq('journal_entries.status', 'DRAFT');

    if (linesError) {
      console.error('❌ Error fetching journal lines:', linesError);
      return NextResponse.json({ error: linesError.message }, { status: 500 });
    }

    const draftLines = journalLines || [];
    console.log(`📊 Found ${draftLines.length} DRAFT journal lines to process`);

    if (draftLines.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Chart of accounts is already up to date',
        processedLines: 0,
        updatedAccounts: 0
      });
    }

    // Group by account_id and calculate net changes
    const accountChanges = new Map<string, number>();

    for (const line of draftLines) {
      const { account_id, debit_amount = 0, credit_amount = 0 } = line;
      
      // Get account info to determine normal balance
      const { data: account, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('normal_balance, account_name')
        .eq('id', account_id)
        .single();

      if (accountError) {
        console.error(`⚠️ Account ${account_id} not found:`, accountError);
        continue;
      }

      // Calculate balance change based on normal balance type
      let balanceChange = 0;
      if (account.normal_balance === 'DEBIT') {
        balanceChange = debit_amount - credit_amount;
      } else {
        balanceChange = credit_amount - debit_amount;
      }

      // Accumulate changes for this account
      const currentChange = accountChanges.get(account_id) || 0;
      accountChanges.set(account_id, currentChange + balanceChange);
    }

    console.log(`🔢 Calculated changes for ${accountChanges.size} accounts`);

    // Apply changes to chart of accounts
    const updateResults = [];
    for (const [accountId, netChange] of accountChanges) {
      if (Math.abs(netChange) < 0.01) continue; // Skip tiny changes

      // Get current balance
      const { data: currentAccount, error: fetchError } = await supabase
        .from('chart_of_accounts')
        .select('current_balance, account_code, account_name')
        .eq('id', accountId)
        .single();

      if (fetchError) {
        console.error(`❌ Failed to fetch account ${accountId}:`, fetchError);
        continue;
      }

      const newBalance = (currentAccount.current_balance || 0) + netChange;

      const { data: updatedAccount, error: updateError } = await supabase
        .from('chart_of_accounts')
        .update({ 
          current_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId)
        .select('account_code, account_name, current_balance')
        .single();

      if (updateError) {
        console.error(`❌ Failed to update account ${accountId}:`, updateError);
        updateResults.push({ accountId, error: updateError.message });
      } else {
        console.log(`✅ Updated ${updatedAccount?.account_name}: ${netChange > 0 ? '+' : ''}₹${netChange} → ₹${newBalance}`);
        updateResults.push({ 
          accountId, 
          accountCode: updatedAccount?.account_code,
          accountName: updatedAccount?.account_name,
          change: netChange,
          newBalance: updatedAccount?.current_balance
        });
      }
    }

    // Mark all DRAFT journal entries as POSTED
    const journalEntryIds = [...new Set(draftLines
      .map(line => line.journal_entries && typeof line.journal_entries === 'object' && 'journal_number' in line.journal_entries 
        ? line.journal_entries.journal_number 
        : null)
      .filter(Boolean))];
    
    const { error: postError } = await supabase
      .from('journal_entries')
      .update({ 
        status: 'POSTED',
        posted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('status', 'DRAFT');

    if (postError) {
      console.error('⚠️ Warning: Failed to mark entries as POSTED:', postError);
    } else {
      console.log(`✅ Marked journal entries as POSTED`);
    }

    return NextResponse.json({
      success: true,
      message: `Chart of accounts synchronized successfully`,
      processedLines: draftLines.length,
      updatedAccounts: updateResults.filter(r => !r.error).length,
      postedEntries: journalEntryIds.length,
      errors: updateResults.filter(r => r.error).length,
      details: updateResults.filter(r => !r.error)
    });

  } catch (error) {
    console.error('❌ Synchronization error:', error);
    return NextResponse.json({ 
      error: 'Failed to synchronize chart of accounts',
      details: error 
    }, { status: 500 });
  }
}
