/**
 * Test script to verify vendor payment journal entry creation with bank account selection
 * Run with: node test-vendor-payment-journal.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVendorPaymentJournal() {
  console.log('🧪 Testing Vendor Payment Journal Entry with Bank Account Selection...\n');

  try {
    // 1. Check if bank accounts exist
    console.log('1. Checking bank accounts...');
    const { data: bankAccounts, error: bankError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('is_active', true)
      .limit(5);

    if (bankError) {
      console.error('❌ Error fetching bank accounts:', bankError);
      return;
    }

    console.log(`✅ Found ${bankAccounts?.length || 0} active bank accounts`);
    if (bankAccounts && bankAccounts.length > 0) {
      console.log('📋 Bank Accounts:');
      bankAccounts.forEach(account => {
        console.log(`   - ${account.account_name} (${account.account_type}) - ID: ${account.id}`);
      });
    }

    // 2. Check chart of accounts for bank account entries
    console.log('\n2. Checking chart of accounts for bank account entries...');
    const { data: chartAccounts, error: chartError } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .like('account_code', '1020-%')
      .order('account_code');

    if (chartError) {
      console.error('❌ Error fetching chart accounts:', chartError);
      return;
    }

    console.log(`✅ Found ${chartAccounts?.length || 0} bank account entries in chart of accounts`);
    if (chartAccounts && chartAccounts.length > 0) {
      console.log('📋 Chart of Accounts - Bank Entries:');
      chartAccounts.forEach(account => {
        console.log(`   - ${account.account_code}: ${account.account_name} (Balance: ${account.current_balance || 0})`);
      });
    }

    // 3. Check core accounts (Cash and AP)
    console.log('\n3. Checking core accounts (Cash and Accounts Payable)...');
    const { data: coreAccounts, error: coreError } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .in('account_code', ['1010', '2100']);

    if (coreError) {
      console.error('❌ Error fetching core accounts:', coreError);
      return;
    }

    console.log(`✅ Found ${coreAccounts?.length || 0} core accounts`);
    if (coreAccounts && coreAccounts.length > 0) {
      console.log('📋 Core Accounts:');
      coreAccounts.forEach(account => {
        console.log(`   - ${account.account_code}: ${account.account_name} (Balance: ${account.current_balance || 0})`);
      });
    }

    // 4. Check recent vendor payment journal entries
    console.log('\n4. Checking recent vendor payment journal entries...');
    const { data: journalEntries, error: journalError } = await supabase
      .from('journal_entries')
      .select(`
        id,
        journal_number,
        description,
        entry_date,
        reference_number,
        status,
        journal_entry_lines(
          account_id,
          debit_amount,
          credit_amount,
          description,
          chart_of_accounts(account_code, account_name)
        )
      `)
      .like('journal_number', 'JE-VPAY-%')
      .order('created_at', { ascending: false })
      .limit(3);

    if (journalError) {
      console.error('❌ Error fetching journal entries:', journalError);
      return;
    }

    console.log(`✅ Found ${journalEntries?.length || 0} recent vendor payment journal entries`);
    if (journalEntries && journalEntries.length > 0) {
      console.log('📋 Recent Vendor Payment Journal Entries:');
      journalEntries.forEach(entry => {
        console.log(`\n   📄 ${entry.journal_number} - ${entry.description} (${entry.entry_date})`);
        console.log(`      Status: ${entry.status} | Reference: ${entry.reference_number || 'N/A'}`);
        
        if (entry.journal_entry_lines && entry.journal_entry_lines.length > 0) {
          console.log('      Journal Lines:');
          entry.journal_entry_lines.forEach(line => {
            const account = line.chart_of_accounts;
            console.log(`        - ${account?.account_code || 'N/A'}: ${account?.account_name || 'Unknown'}`);
            console.log(`          Dr: ${line.debit_amount || 0}, Cr: ${line.credit_amount || 0} | ${line.description || ''}`);
          });
        }
      });
    }

    console.log('\n✅ Vendor Payment Journal Test Complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Bank Accounts: ${bankAccounts?.length || 0}`);
    console.log(`   - Chart Bank Entries: ${chartAccounts?.length || 0}`);
    console.log(`   - Core Accounts: ${coreAccounts?.length || 0}/2 required`);
    console.log(`   - Recent Vendor Payments: ${journalEntries?.length || 0}`);

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testVendorPaymentJournal();
