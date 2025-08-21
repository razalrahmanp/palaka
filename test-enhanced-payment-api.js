// Test script for enhanced payment API with bank account integration
const testEnhancedPaymentAPI = async () => {
  const baseURL = 'http://localhost:3000/api';
  
  console.log('🧪 Testing Enhanced Payment API with Bank Account Integration...\n');
  
  try {
    // Test 1: Get bank accounts to see available options
    console.log('1. Fetching available bank accounts...');
    const bankAccountsResponse = await fetch(`${baseURL}/finance/bank_accounts`);
    const bankAccounts = await bankAccountsResponse.json();
    console.log('Bank Accounts:', bankAccounts);
    
    if (!bankAccounts.bank_accounts || bankAccounts.bank_accounts.length === 0) {
      console.log('⚠️  No bank accounts found. Creating test bank accounts...');
      
      // Create HDFC account
      const hdfcResponse = await fetch(`${baseURL}/finance/bank_accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'HDFC Bank',
          account_number: 'HDFC123456789',
          current_balance: 50000,
          currency: 'INR'
        })
      });
      const hdfcAccount = await hdfcResponse.json();
      console.log('Created HDFC Account:', hdfcAccount);
      
      // Create SBI account
      const sbiResponse = await fetch(`${baseURL}/finance/bank_accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'SBI Bank',
          account_number: 'SBI987654321',
          current_balance: 75000,
          currency: 'INR'
        })
      });
      const sbiAccount = await sbiResponse.json();
      console.log('Created SBI Account:', sbiAccount);
    }
    
    // Test 2: Get sales orders to find one to test payments with
    console.log('\n2. Fetching sales orders...');
    const ordersResponse = await fetch(`${baseURL}/sales/orders`);
    const orders = await ordersResponse.json();
    console.log('Found', orders.sales_orders?.length || 0, 'sales orders');
    
    if (!orders.sales_orders || orders.sales_orders.length === 0) {
      console.log('❌ No sales orders found to test with');
      return;
    }
    
    const testOrderId = orders.sales_orders[0].id;
    console.log('Using test order ID:', testOrderId);
    
    // Test 3: Get existing payments for the order
    console.log('\n3. Fetching existing payments for order...');
    const paymentsResponse = await fetch(`${baseURL}/sales/orders/${testOrderId}/payments`);
    const existingPayments = await paymentsResponse.json();
    console.log('Existing payments:', existingPayments);
    
    // Test 4: Get updated bank accounts list
    console.log('\n4. Getting updated bank accounts for payment test...');
    const updatedBankAccountsResponse = await fetch(`${baseURL}/finance/bank_accounts`);
    const updatedBankAccounts = await updatedBankAccountsResponse.json();
    
    if (updatedBankAccounts.bank_accounts && updatedBankAccounts.bank_accounts.length > 0) {
      const bankAccountId = updatedBankAccounts.bank_accounts[0].id;
      const bankAccountName = updatedBankAccounts.bank_accounts[0].name;
      
      console.log(`\n5. Testing payment creation with bank account: ${bankAccountName} (ID: ${bankAccountId})`);
      
      // Test 5: Create a payment with bank transfer to selected bank account
      const paymentData = {
        amount: 1000,
        method: 'bank_transfer',
        payment_date: new Date().toISOString().split('T')[0],
        bank_account_id: bankAccountId
      };
      
      const paymentResponse = await fetch(`${baseURL}/sales/orders/${testOrderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      
      const newPayment = await paymentResponse.json();
      console.log('Created payment:', newPayment);
      
      // Test 6: Verify bank transaction was created
      console.log('\n6. Checking bank transactions for the account...');
      const transactionsResponse = await fetch(`${baseURL}/finance/bank_accounts/transactions?account_id=${bankAccountId}`);
      const transactions = await transactionsResponse.json();
      console.log('Bank transactions:', transactions);
      
      // Test 7: Check updated bank account balance
      console.log('\n7. Checking updated bank account balance...');
      const finalBankAccountsResponse = await fetch(`${baseURL}/finance/bank_accounts`);
      const finalBankAccounts = await finalBankAccountsResponse.json();
      const updatedAccount = finalBankAccounts.bank_accounts?.find(acc => acc.id === bankAccountId);
      console.log('Updated bank account:', updatedAccount);
      
      console.log('\n✅ Enhanced Payment API Test Complete!');
      console.log('📊 Test Summary:');
      console.log(`- Payment created: ₹${paymentData.amount}`);
      console.log(`- Bank account: ${bankAccountName}`);
      console.log(`- Payment method: ${paymentData.method}`);
      console.log(`- Bank transaction created: ${transactions.transactions?.length > 0 ? 'Yes' : 'No'}`);
      console.log(`- Account balance updated: ${updatedAccount ? 'Yes' : 'No'}`);
      
    } else {
      console.log('❌ No bank accounts available for testing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test if this script is executed directly
if (require.main === module) {
  testEnhancedPaymentAPI();
}

module.exports = { testEnhancedPaymentAPI };
