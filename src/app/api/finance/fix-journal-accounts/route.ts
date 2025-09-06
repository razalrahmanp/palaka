/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    console.log('Starting journal entry account ID fix...');

    // Step 1: Update journal entry lines with correct account IDs
    const updates = [];

    // Map of fake IDs to real account IDs from the provided table
    const idMappings = [
      { 
        fakeId: 'af83d9b5-e269-4ca9-9f58-8a2e58a01234', 
        realId: '617b4bba-ff04-4a69-9d83-17f01335b6f1', 
        accountCode: '1200', 
        accountName: 'Accounts Receivable' 
      },
      { 
        fakeId: 'cf84e9c6-f379-5db0-0f69-9b3f69b01345', 
        realId: '0b25dd21-ff9c-4923-841b-7b971892a574', 
        accountCode: '4010', 
        accountName: 'Sales Revenue' 
      },
      { 
        fakeId: 'df85f0d7-f480-6ec1-1f70-0c4f70c01456', 
        realId: 'ee08529b-0cad-4a35-9aa9-97661410b78e', 
        accountCode: '1010', 
        accountName: 'Cash' 
      },
    ];

    for (const mapping of idMappings) {
      console.log(`Updating ${mapping.fakeId} to ${mapping.realId} (${mapping.accountName})`);

      const { error, count } = await supabase
        .from('journal_entry_lines')
        .update({ account_id: mapping.realId })
        .eq('account_id', mapping.fakeId);

      if (error) {
        console.error(`Error updating ${mapping.accountCode}:`, error);
        updates.push({ 
          accountCode: mapping.accountCode, 
          accountName: mapping.accountName,
          success: false, 
          error: error.message 
        });
      } else {
        console.log(`Successfully updated ${count} lines for ${mapping.accountName}`);
        updates.push({ 
          accountCode: mapping.accountCode, 
          accountName: mapping.accountName,
          success: true, 
          updatedLines: count 
        });
      }
    }

    // Step 2: Get summary of changes
    const realAccountIds = idMappings.map(m => m.realId);
    const { data: summary } = await supabase
      .from('journal_entry_lines')
      .select(`
        account_id,
        chart_of_accounts!inner(account_code, account_name),
        debit_amount,
        credit_amount
      `)
      .in('account_id', realAccountIds);

    const accountSummary: Record<string, any> = {};
    if (summary) {
      summary.forEach((line: any) => {
        const accountCode = line.chart_of_accounts.account_code;
        if (!accountSummary[accountCode]) {
          accountSummary[accountCode] = {
            account_name: line.chart_of_accounts.account_name,
            line_count: 0,
            total_debits: 0,
            total_credits: 0
          };
        }
        accountSummary[accountCode].line_count++;
        accountSummary[accountCode].total_debits += parseFloat(String(line.debit_amount || 0));
        accountSummary[accountCode].total_credits += parseFloat(String(line.credit_amount || 0));
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Journal entry account IDs updated successfully',
      updates,
      accountSummary,
      totalUpdatedAccounts: updates.filter(u => u.success).length
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
