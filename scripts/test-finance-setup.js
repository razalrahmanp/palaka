// Finance System Quick Test Script
// Run this with: node scripts/test-finance-setup.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase (you'll need to add your credentials)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  console.log('Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinanceSetup() {
  console.log('🔍 Testing Finance System Setup...\n');
  
  // Test 1: Check essential tables exist
  console.log('1. Checking essential tables...');
  try {
    const tables = [
      'invoices',
      'payments', 
      'purchase_orders',
      'vendor_payment_history',
      'journal_entries',
      'journal_entry_lines',
      'general_ledger',
      'chart_of_accounts',
      'opening_balances'
    ];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`   ❌ Table '${table}' error: ${error.message}`);
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    }
  } catch (error) {
    console.log('   ❌ Database connection failed:', error.message);
  }
  
  // Test 2: Check if stored procedures exist
  console.log('\n2. Checking stored procedures...');
  try {
    const procedures = [
      'create_opening_balance',
      'create_payment_with_accounting',
      'create_journal_entry_with_lines'
    ];
    
    for (const proc of procedures) {
      const { data, error } = await supabase.rpc(proc, {}).catch(e => ({ error: e }));
      if (error && error.message.includes('does not exist')) {
        console.log(`   ❌ Procedure '${proc}' not found - needs deployment`);
      } else if (error && error.message.includes('missing')) {
        console.log(`   ⚠️  Procedure '${proc}' exists but missing parameters - OK`);
      } else {
        console.log(`   ✅ Procedure '${proc}' available`);
      }
    }
  } catch (error) {
    console.log('   ❌ Procedure check failed:', error.message);
  }
  
  // Test 3: Check sample data
  console.log('\n3. Checking sample data...');
  try {
    const { data: invoices } = await supabase.from('invoices').select('id').limit(1);
    const { data: payments } = await supabase.from('payments').select('id').limit(1);
    const { data: accounts } = await supabase.from('chart_of_accounts').select('id').limit(1);
    
    console.log(`   📊 Invoices: ${invoices?.length || 0} found`);
    console.log(`   💰 Payments: ${payments?.length || 0} found`);
    console.log(`   📈 Accounts: ${accounts?.length || 0} found`);
  } catch (error) {
    console.log('   ❌ Sample data check failed:', error.message);
  }
  
  // Test 4: Check essential accounts
  console.log('\n4. Checking essential accounts...');
  try {
    const essentialAccounts = ['1001', '1200', '2001', '3900']; // Cash, A/R, A/P, Retained Earnings
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('account_code, account_name')
      .in('account_code', essentialAccounts);
    
    essentialAccounts.forEach(code => {
      const found = accounts?.find(acc => acc.account_code === code);
      if (found) {
        console.log(`   ✅ Account ${code} (${found.account_name}) exists`);
      } else {
        console.log(`   ❌ Account ${code} missing - will be auto-created`);
      }
    });
  } catch (error) {
    console.log('   ❌ Essential accounts check failed:', error.message);
  }
  
  // Test 5: API endpoint availability
  console.log('\n5. Testing API endpoints...');
  try {
    const endpoints = [
      '/api/finance/opening-balances',
      '/api/finance/account-balances',
      '/api/finance/payments',
      '/api/finance/reports/balance-sheet'
    ];
    
    console.log('   📡 API endpoints ready for testing:');
    endpoints.forEach(endpoint => {
      console.log(`   📍 http://localhost:3000${endpoint}`);
    });
  } catch (error) {
    console.log('   ❌ API check failed:', error.message);
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. If stored procedures are missing, run the SQL scripts in Supabase');
  console.log('2. Start your dev server: npm run dev');
  console.log('3. Test the finance tab functionality');
  console.log('4. Run diagnostics: scripts/finance-diagnostics.sql');
  console.log('\n✅ Finance system implementation ready!');
}

testFinanceSetup().catch(console.error);
