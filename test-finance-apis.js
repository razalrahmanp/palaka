#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';

async function testAPI(endpoint, description) {
  console.log(`\n🧪 Testing ${description}...`);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${description} - SUCCESS (${response.status})`);
      console.log(`📊 Data count: ${Array.isArray(data.data) ? data.data.length : 'N/A'}`);
      
      if (data.error) {
        console.log(`⚠️  Warning: ${data.error}`);
      }
    } else {
      console.log(`❌ ${description} - FAILED (${response.status})`);
      console.log(`💥 Error: ${data.error || JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`💥 ${description} - CONNECTION ERROR`);
    console.log(`🔌 Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🏦 Finance System API Testing Suite');
  console.log('=====================================');
  
  const today = new Date().toISOString().split('T')[0];
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  
  // Test all finance APIs
  await testAPI('/api/finance/opening-balances', 'Opening Balances API');
  await testAPI('/api/finance/account-balances', 'Account Balances API');
  await testAPI('/api/finance/payments', 'Enhanced Payments API');
  await testAPI(`/api/finance/reports/balance-sheet?as_of_date=${today}`, 'Balance Sheet Report');
  await testAPI(`/api/finance/reports/profit-loss?start_date=${yearStart}&end_date=${today}`, 'Profit & Loss Report');
  await testAPI(`/api/finance/reports/trial-balance?as_of_date=${today}`, 'Trial Balance Report');
  
  console.log('\n🎉 Finance API Testing Complete!');
  console.log('\n💡 Next Steps:');
  console.log('  1. Deploy stored procedures in Supabase SQL Editor');
  console.log('  2. Deploy database triggers for automatic accounting');
  console.log('  3. Test creating opening balances and payments');
  console.log('  4. Navigate to /finance in your ERP to use the enhanced system');
}

runTests().catch(console.error);
