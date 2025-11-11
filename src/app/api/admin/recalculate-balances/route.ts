import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    console.log('🔄 Starting balance recalculation...');

    // Step 1: Get all bank accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, name')
      .in('account_type', ['BANK', 'UPI', 'CASH']);

    if (accountsError) {
      throw new Error(`Failed to fetch accounts: ${accountsError.message}`);
    }

    console.log(`📊 Found ${accounts?.length || 0} accounts to process`);

    let updatedTransactionCount = 0;
    let accountsUpdated = 0;

    // Step 2: Process each account - recalculate transaction balances
    for (const account of accounts || []) {
      console.log(`💰 Processing account: ${account.name}`);
      
      const { data: transactions, error: txError } = await supabaseAdmin
        .from('bank_transactions')
        .select('id, date, type, amount')
        .eq('bank_account_id', account.id)
        .order('date', { ascending: true })
        .order('id', { ascending: true });

      if (txError) {
        console.error(`❌ Error fetching transactions for account ${account.name}:`, txError);
        continue;
      }

      console.log(`  📝 Processing ${transactions?.length || 0} transactions for ${account.name}`);

      // Calculate running balance
      let runningBalance = 0;
      for (const tx of transactions || []) {
        if (tx.type === 'deposit' || tx.type === 'credit' || tx.type === 'CREDIT') {
          runningBalance += tx.amount;
        } else {
          runningBalance -= tx.amount;
        }

        // Update transaction balance
        const { error: updateTxError } = await supabaseAdmin
          .from('bank_transactions')
          .update({ balance: runningBalance })
          .eq('id', tx.id);

        if (updateTxError) {
          console.error(`❌ Error updating transaction ${tx.id}:`, updateTxError);
        } else {
          updatedTransactionCount++;
        }
      }

      // Step 3: Update bank account current_balance to match the latest transaction
      if (transactions && transactions.length > 0) {
        const { error: updateAcctError } = await supabaseAdmin
          .from('bank_accounts')
          .update({ current_balance: runningBalance })
          .eq('id', account.id);

        if (updateAcctError) {
          console.error(`❌ Error updating account ${account.name}:`, updateAcctError);
        } else {
          accountsUpdated++;
          console.log(`  ✅ Updated ${account.name} balance to ₹${runningBalance.toLocaleString()}`);
        }
      }
    }

    const summary = {
      accounts_updated: accountsUpdated,
      total_transactions: updatedTransactionCount,
      timestamp: new Date().toISOString()
    };

    console.log('✅ Balance recalculation completed:', summary);

    return NextResponse.json({
      success: true,
      message: 'Bank account balances recalculated successfully',
      data: summary
    });

  } catch (error) {
    console.error('❌ Error recalculating balances:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
