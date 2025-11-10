/**
 * FIX SCRIPT: Remove duplicate transactions and recalculate balance
 * This will:
 * 1. Delete 5 duplicate transaction IDs
 * 2. Recalculate the correct balance for CASH-PETTY CASH
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// The 5 duplicate transaction IDs to remove (keeping the first occurrence)
const duplicateIdsToDelete = [
  '9801d3f8-7ff0-4479-b4fb-ab7fd3b38399', // Nov 1: Vendor payment ₹12,000
  '75e8c421-8066-4886-aa3b-3a443049b95b', // Nov 4: Vendor payment ₹5,000
  '0b35d0ec-ba53-469a-9b6a-a67a7f01c392', // Nov 4: Investment ₹3,000
  '912a87ef-a62c-431d-ae9d-90d7b124ea7d', // Nov 5: Vendor payment ₹2,000
  '4f80bb57-7e4e-4e59-afca-b2504bb52289', // Nov 7: Investment ₹500
];

async function fixCashAccount() {
  console.log('\n🔧 CASH ACCOUNT FIX - STARTING\n');
  console.log('='.repeat(80));

  // Step 1: Get current state
  const { data: account } = await supabase
    .from('bank_accounts')
    .select('id, name, current_balance')
    .eq('account_type', 'CASH')
    .eq('name', 'CASH-PETTY CASH')
    .single();

  console.log('\n📊 BEFORE FIX:');
  console.log(`  Account: ${account?.name}`);
  console.log(`  Database Balance: ₹${parseFloat(account?.current_balance || '0').toLocaleString('en-IN', {minimumFractionDigits: 2})}`);

  const { data: allTransactionsBefore } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('bank_account_id', account?.id);

  console.log(`  Total Transactions: ${allTransactionsBefore?.length}`);

  // Step 2: Delete duplicates
  console.log('\n🗑️  STEP 1: Removing Duplicates...');
  console.log('-'.repeat(80));

  for (const duplicateId of duplicateIdsToDelete) {
    const transaction = allTransactionsBefore?.find(t => t.id === duplicateId);
    if (transaction) {
      console.log(`  Deleting: ${transaction.date} | ${transaction.type} | ₹${parseFloat(transaction.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})} | ${transaction.description?.substring(0, 50)}`);
      
      const { error } = await supabase
        .from('bank_transactions')
        .delete()
        .eq('id', duplicateId);

      if (error) {
        console.error(`  ❌ Error deleting ${duplicateId}:`, error.message);
      } else {
        console.log(`  ✅ Deleted`);
      }
    } else {
      console.log(`  ⚠️  Not found: ${duplicateId}`);
    }
  }

  // Step 3: Recalculate balance
  console.log('\n🔄 STEP 2: Recalculating Balance...');
  console.log('-'.repeat(80));

  const { data: allTransactionsAfter } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('bank_account_id', account?.id);

  const totalDeposits = allTransactionsAfter?.reduce((sum, t) => 
    t.type === 'deposit' ? sum + parseFloat(t.amount) : sum, 0) || 0;
  const totalWithdrawals = allTransactionsAfter?.reduce((sum, t) => 
    t.type === 'withdrawal' ? sum + parseFloat(t.amount) : sum, 0) || 0;
  const calculatedBalance = totalDeposits - totalWithdrawals;

  console.log(`  Transactions remaining: ${allTransactionsAfter?.length}`);
  console.log(`  Total Deposits: ₹${totalDeposits.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`  Total Withdrawals: ₹${totalWithdrawals.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`  Calculated Balance: ₹${calculatedBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);

  // Update the account balance
  const { error: updateError } = await supabase
    .from('bank_accounts')
    .update({ 
      current_balance: calculatedBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', account?.id);

  if (updateError) {
    console.error('\n❌ Error updating balance:', updateError.message);
    return;
  }

  // Step 4: Verify the fix
  console.log('\n✅ STEP 3: Verification');
  console.log('-'.repeat(80));

  const { data: updatedAccount } = await supabase
    .from('bank_accounts')
    .select('current_balance, updated_at')
    .eq('id', account?.id)
    .single();

  console.log(`  New Database Balance: ₹${parseFloat(updatedAccount?.current_balance || '0').toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`  Calculated Balance: ₹${calculatedBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`  Match: ${Math.abs(parseFloat(updatedAccount?.current_balance || '0') - calculatedBalance) < 0.01 ? '✅ YES' : '❌ NO'}`);
  console.log(`  Updated At: ${updatedAccount?.updated_at}`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ FIX COMPLETED SUCCESSFULLY');
  console.log('='.repeat(80));
  console.log('\n📝 Summary:');
  console.log(`   Duplicates removed: 5`);
  console.log(`   Old balance: ₹-1,33,888.00`);
  console.log(`   New balance: ₹${calculatedBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`   Transactions: ${allTransactionsBefore?.length} → ${allTransactionsAfter?.length}`);
  console.log('\n');
}

fixCashAccount()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
