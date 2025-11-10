/**
 * Compare UI transactions with database transactions
 * Find what's missing and what's duplicated
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// UI visible transactions count by date (from the screenshot)
const uiTransactionsByDate: Record<string, number> = {
  '2025-10-06': 1,
  '2025-10-18': 2,
  '2025-10-28': 1,
  '2025-11-01': 61,
  '2025-11-03': 30,
  '2025-11-04': 48,
  '2025-11-05': 41,
  '2025-11-06': 16,
  '2025-11-07': 28,
  '2025-11-08': 8
};

async function compareTransactions() {
  console.log('\n🔍 COMPARING UI vs DATABASE TRANSACTIONS\n');
  console.log('='.repeat(80));

  // Get CASH-PETTY CASH account ID
  const { data: account } = await supabase
    .from('bank_accounts')
    .select('id, name, current_balance')
    .eq('account_type', 'CASH')
    .eq('name', 'CASH-PETTY CASH')
    .single();

  console.log('\n📊 Account Info:');
  console.log(`  Name: ${account?.name}`);
  console.log(`  Database Balance: ₹${parseFloat(account?.current_balance || '0').toLocaleString('en-IN', {minimumFractionDigits: 2})}`);

  // Get all transactions
  const { data: allTransactions } = await supabase
    .from('bank_transactions')
    .select('*')
    .eq('bank_account_id', account?.id)
    .order('date', { ascending: true })
    .order('id', { ascending: true });

  console.log(`\n📈 Total Transactions in Database: ${allTransactions?.length}`);
  console.log(`📱 Total Transactions in UI: 236`);
  console.log(`❌ Missing from UI: ${(allTransactions?.length || 0) - 236}`);

  // Group by date
  interface Transaction {
    id: string;
    date: string;
    type: string;
    amount: string;
    description: string;
  }
  
  const dbTransactionsByDate: Record<string, Transaction[]> = {};
  allTransactions?.forEach(t => {
    if (!dbTransactionsByDate[t.date]) {
      dbTransactionsByDate[t.date] = [];
    }
    dbTransactionsByDate[t.date].push(t);
  });

  console.log('\n📅 Transaction Count by Date:');
  console.log('-'.repeat(80));
  console.log('Date'.padEnd(15) + 'UI Count'.padEnd(12) + 'DB Count'.padEnd(12) + 'Difference');
  console.log('-'.repeat(80));

  const allDates = new Set([
    ...Object.keys(uiTransactionsByDate),
    ...Object.keys(dbTransactionsByDate)
  ]);

  let totalUiCount = 0;
  let totalDbCount = 0;
  const datesWithDifferences: string[] = [];

  Array.from(allDates).sort().forEach(date => {
    const uiCount = uiTransactionsByDate[date] || 0;
    const dbCount = dbTransactionsByDate[date]?.length || 0;
    const diff = dbCount - uiCount;
    
    totalUiCount += uiCount;
    totalDbCount += dbCount;

    if (diff !== 0) {
      datesWithDifferences.push(date);
    }

    const marker = diff > 0 ? '⚠️ ' : diff < 0 ? '❌ ' : '✅ ';
    console.log(
      marker +
      date.padEnd(13) +
      uiCount.toString().padEnd(12) +
      dbCount.toString().padEnd(12) +
      (diff !== 0 ? `+${diff}` : '0')
    );
  });

  console.log('-'.repeat(80));
  console.log('TOTALS:'.padEnd(15) + totalUiCount.toString().padEnd(12) + totalDbCount.toString().padEnd(12) + `+${totalDbCount - totalUiCount}`);

  // Show transactions on dates with differences
  console.log('\n\n🔍 EXTRA TRANSACTIONS IN DATABASE (Not in UI):');
  console.log('='.repeat(80));

  if (datesWithDifferences.length > 0) {
    for (const date of datesWithDifferences) {
      const dbCount = dbTransactionsByDate[date]?.length || 0;
      const uiCount = uiTransactionsByDate[date] || 0;
      
      if (dbCount > uiCount) {
        console.log(`\n📆 ${date} - Extra ${dbCount - uiCount} transaction(s):`);
        console.log('-'.repeat(80));
        
        dbTransactionsByDate[date].forEach((t, idx) => {
          console.log(`  ${idx + 1}. [${t.type.toUpperCase()}] ₹${parseFloat(t.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})} - ${t.description?.substring(0, 60)}`);
          console.log(`     ID: ${t.id}`);
        });
      }
    }
  }

  // Check for the known duplicates
  console.log('\n\n🔍 CHECKING KNOWN DUPLICATE IDs:');
  console.log('='.repeat(80));

  const duplicateIds = [
    '9801d3f8-7ff0-4479-b4fb-ab7fd3b38399', // Nov 1: Vendor payment ₹12,000
    '75e8c421-8066-4886-aa3b-3a443049b95b', // Nov 4: Vendor payment ₹5,000
    '0b35d0ec-ba53-469a-9b6a-a67a7f01c392', // Nov 4: Investment ₹3,000
    '912a87ef-a62c-431d-ae9d-90d7b124ea7d', // Nov 5: Vendor payment ₹2,000
    '4f80bb57-7e4e-4e59-afca-b2504bb52289', // Nov 7: Investment ₹500
  ];

  for (const dupId of duplicateIds) {
    const transaction = allTransactions?.find(t => t.id === dupId);
    if (transaction) {
      console.log(`✅ Found: ${transaction.date} | ${transaction.type} | ₹${parseFloat(transaction.amount).toLocaleString('en-IN', {minimumFractionDigits: 2})} | ${transaction.description?.substring(0, 50)}`);
    } else {
      console.log(`❌ Not found: ${dupId}`);
    }
  }

  // Calculate what balance should be after removing duplicates
  console.log('\n\n💰 BALANCE CALCULATION:');
  console.log('='.repeat(80));

  const totalDeposits = allTransactions?.reduce((sum, t) => 
    t.type === 'deposit' ? sum + parseFloat(t.amount) : sum, 0) || 0;
  const totalWithdrawals = allTransactions?.reduce((sum, t) => 
    t.type === 'withdrawal' ? sum + parseFloat(t.amount) : sum, 0) || 0;
  
  const duplicateWithdrawals = 12000 + 5000 + 2000; // Withdrawals
  const duplicateDeposits = 3000 + 500; // Deposits

  console.log(`Current Database Balance: ₹${parseFloat(account?.current_balance || '0').toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`\nWith ALL ${allTransactions?.length} transactions:`);
  console.log(`  Total Deposits: ₹${totalDeposits.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`  Total Withdrawals: ₹${totalWithdrawals.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`  Calculated Balance: ₹${(totalDeposits - totalWithdrawals).toLocaleString('en-IN', {minimumFractionDigits: 2})}`);

  console.log(`\nAfter removing 5 duplicates:`);
  console.log(`  Total Deposits: ₹${(totalDeposits - duplicateDeposits).toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`  Total Withdrawals: ₹${(totalWithdrawals - duplicateWithdrawals).toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
  console.log(`  Calculated Balance: ₹${(totalDeposits - duplicateDeposits - (totalWithdrawals - duplicateWithdrawals)).toLocaleString('en-IN', {minimumFractionDigits: 2})}`);

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ ANALYSIS COMPLETE\n');
}

compareTransactions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
