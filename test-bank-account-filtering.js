// Test script for bank account filtering in refund dialog
// Run this with: node test-bank-accounts.js

const testBankAccountFiltering = async () => {
  try {
    console.log('🧪 Testing bank account filtering for refunds...');
    
    // Test 1: Get all bank accounts
    console.log('\n📋 Testing GET /api/finance/bank-accounts (all accounts)...');
    const allResponse = await fetch('http://localhost:3000/api/finance/bank-accounts');
    const allResult = await allResponse.json();
    
    console.log('All Accounts Response:', {
      status: allResponse.status,
      success: allResult.success,
      accountCount: allResult.data?.length || 0,
      accountTypes: [...new Set(allResult.data?.map(acc => acc.account_type) || [])]
    });

    // Test 2: Get only BANK type accounts
    console.log('\n🏦 Testing GET /api/finance/bank-accounts?type=BANK (BANK accounts only)...');
    const bankResponse = await fetch('http://localhost:3000/api/finance/bank-accounts?type=BANK');
    const bankResult = await bankResponse.json();
    
    console.log('Bank Accounts Response:', {
      status: bankResponse.status,
      success: bankResult.success,
      accountCount: bankResult.data?.length || 0,
      accountTypes: [...new Set(bankResult.data?.map(acc => acc.account_type) || [])],
      accounts: bankResult.data?.map(acc => ({
        name: acc.name,
        type: acc.account_type,
        balance: acc.current_balance
      })) || []
    });

    // Test 3: Get UPI accounts (should be different)
    console.log('\n📱 Testing GET /api/finance/bank-accounts?type=UPI (UPI accounts only)...');
    const upiResponse = await fetch('http://localhost:3000/api/finance/bank-accounts?type=UPI');
    const upiResult = await upiResponse.json();
    
    console.log('UPI Accounts Response:', {
      status: upiResponse.status,
      success: upiResult.success,
      accountCount: upiResult.data?.length || 0,
      accountTypes: [...new Set(upiResult.data?.map(acc => acc.account_type) || [])]
    });

    console.log('\n✅ Bank account filtering test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testBankAccountFiltering();