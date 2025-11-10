/**
 * Diagnostic Script: Compare Cash Account Data
 * This script queries the database to find discrepancies between UI and database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnostic() {
  console.log('\n🔍 CASH ACCOUNT DIAGNOSTIC\n');
  console.log('=' .repeat(80));

  // Step 1: Get account info
  console.log('\n📊 STEP 1: Cash Account Info');
  console.log('-'.repeat(80));
  const { data: account } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('account_type', 'CASH')
    .eq('name', 'CASH-PETTY CASH')
    .single();

  console.log('Account:', account?.name);
  console.log('Database Balance:', account?.current_balance);
  console.log('Last Updated:', account?.updated_at);

  const accountId = account?.id;

  // Step 2: Get transaction summary
  console.log('\n🧮 STEP 2: Transaction Summary');
  console.log('-'.repeat(80));
  
  const { data: allTransactions } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('bank_account_id', accountId)
    .order('date', { ascending: true });

  const totalCount = allTransactions?.length || 0;
  const totalDeposits = allTransactions?.reduce((sum, t) => 
    t.type === 'deposit' ? sum + parseFloat(t.amount) : sum, 0) || 0;
  const totalWithdrawals = allTransactions?.reduce((sum, t) => 
    t.type === 'withdrawal' ? sum + parseFloat(t.amount) : sum, 0) || 0;
  const calculatedBalance = totalDeposits - totalWithdrawals;

  console.log(`Total Transactions: ${totalCount}`);
  console.log(`Total Deposits: ₹${totalDeposits.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`Total Withdrawals: ₹${totalWithdrawals.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`Calculated Balance: ₹${calculatedBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`Database Balance: ₹${parseFloat(account?.current_balance || '0').toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`Discrepancy: ₹${(parseFloat(account?.current_balance || '0') - calculatedBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})}`);

  // Step 3: UI Date Range vs All Data
  console.log('\n📅 STEP 3: UI Date Range Comparison (Oct 6 - Nov 8, 2025)');
  console.log('-'.repeat(80));

  const uiTransactions = allTransactions?.filter(t => {
    const date = new Date(t.date);
    return date >= new Date('2025-10-06') && date <= new Date('2025-11-08');
  }) || [];

  const uiDeposits = uiTransactions.reduce((sum, t) => 
    t.type === 'deposit' ? sum + parseFloat(t.amount) : sum, 0);
  const uiWithdrawals = uiTransactions.reduce((sum, t) => 
    t.type === 'withdrawal' ? sum + parseFloat(t.amount) : sum, 0);
  const uiBalance = uiDeposits - uiWithdrawals;

  console.log('UI Date Range (Oct 6 - Nov 8):');
  console.log(`  Transactions: ${uiTransactions.length}`);
  console.log(`  Deposits: ₹${uiDeposits.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`  Withdrawals: ₹${uiWithdrawals.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`  Calculated: ₹${uiBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);

  const beforeOct6 = allTransactions?.filter(t => new Date(t.date) < new Date('2025-10-06')) || [];
  if (beforeOct6.length > 0) {
    const beforeDeposits = beforeOct6.reduce((sum, t) => 
      t.type === 'deposit' ? sum + parseFloat(t.amount) : sum, 0);
    const beforeWithdrawals = beforeOct6.reduce((sum, t) => 
      t.type === 'withdrawal' ? sum + parseFloat(t.amount) : sum, 0);
    const beforeBalance = beforeDeposits - beforeWithdrawals;

    console.log('\n⚠️  Transactions BEFORE Oct 6 (NOT shown in UI):');
    console.log(`  Transactions: ${beforeOct6.length}`);
    console.log(`  Net Effect: ₹${beforeBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
    console.log('\n  Latest 10 transactions before Oct 6:');
    beforeOct6.slice(-10).forEach(t => {
      console.log(`    ${t.date} | ${t.type.padEnd(10)} | ₹${parseFloat(t.amount).toLocaleString('en-IN', {minimumFractionDigits: 2}).padStart(12)} | ${t.description?.substring(0, 40)}`);
    });
  }

  // Step 4: Find duplicates
  console.log('\n🔍 STEP 4: Duplicate Detection');
  console.log('-'.repeat(80));

  const duplicates = new Map();
  allTransactions?.forEach(t => {
    const key = `${t.date}|${t.type}|${t.amount}|${t.description}|${t.reference}`;
    if (!duplicates.has(key)) {
      duplicates.set(key, []);
    }
    duplicates.get(key).push(t.id);
  });

  const duplicateGroups = Array.from(duplicates.entries())
    .filter(([, ids]) => ids.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`Found ${duplicateGroups.length} duplicate transaction groups`);
  
  if (duplicateGroups.length > 0) {
    console.log('\nTop 10 duplicates:');
    duplicateGroups.slice(0, 10).forEach(([key, ids]) => {
      const [date, type, amount, desc] = key.split('|');
      console.log(`  ${date} | ${type} | ₹${parseFloat(amount).toLocaleString('en-IN', {minimumFractionDigits: 2})} | ${desc?.substring(0, 30)} (${ids.length} copies)`);
      console.log(`    IDs: ${ids.join(', ')}`);
    });

    const totalDuplicateAmount = duplicateGroups.reduce((sum, [key, ids]) => {
      const [, type, amount] = key.split('|');
      const duplicateCount = ids.length - 1; // -1 because one is legitimate
      const duplicateAmount = parseFloat(amount) * duplicateCount;
      return sum + (type === 'deposit' ? duplicateAmount : -duplicateAmount);
    }, 0);

    console.log(`\n💰 Total impact of duplicates: ₹${totalDuplicateAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  }

  // Step 5: Nov 1 transactions (where duplicates were visible in UI)
  console.log('\n📆 STEP 5: Nov 1, 2025 Transactions (Visible Duplicates)');
  console.log('-'.repeat(80));

  const nov1Transactions = allTransactions?.filter(t => t.date === '2025-11-01') || [];
  console.log(`Found ${nov1Transactions.length} transactions on Nov 1, 2025\n`);

  nov1Transactions.forEach(t => {
    console.log(`  ID: ${t.id} | ${t.type.padEnd(10)} | ₹${parseFloat(t.amount).toLocaleString('en-IN', {minimumFractionDigits: 2}).padStart(12)} | ${t.description}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ DIAGNOSTIC COMPLETE');
  console.log('='.repeat(80));
  console.log('\n📝 Summary:');
  console.log(`   Database shows: ₹${parseFloat(account?.current_balance || '0').toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`   Should be: ₹${calculatedBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`   Discrepancy: ₹${Math.abs(parseFloat(account?.current_balance || '0') - calculatedBalance).toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`   Duplicate groups found: ${duplicateGroups.length}`);
  console.log(`   Transactions before UI range: ${beforeOct6.length}`);
  console.log('\n');
}

runDiagnostic()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
