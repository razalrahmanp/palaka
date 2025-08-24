// Simple test script using built-in fetch for bank account integration
async function testBankAccountIntegration() {
    console.log('🧪 Testing Bank Account Integration...\n');

    try {
        // Test 1: Create HDFC Bank Account
        console.log('1. Creating HDFC Bank Account...');
        const hdfcResponse = await fetch('/api/finance/bank_accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'HDFC Bank',
                account_number: 'HDFC123456789',
                current_balance: 50000,
                currency: 'INR'
            })
        });
        const hdfcResult = await hdfcResponse.json();
        console.log('HDFC Account:', hdfcResult);

        // Test 2: Create SBI Bank Account
        console.log('\n2. Creating SBI Bank Account...');
        const sbiResponse = await fetch('/api/finance/bank_accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'SBI Bank',
                account_number: 'SBI987654321',
                current_balance: 75000,
                currency: 'INR'
            })
        });
        const sbiResult = await sbiResponse.json();
        console.log('SBI Account:', sbiResult);

        // Test 3: Get all bank accounts
        console.log('\n3. Fetching all bank accounts...');
        const accountsResponse = await fetch('/api/finance/bank_accounts');
        const accounts = await accountsResponse.json();
        console.log('All Bank Accounts:', accounts);

        // Test 4: Create a bank transaction for HDFC
        if (accounts.bank_accounts && accounts.bank_accounts.length > 0) {
            const hdfcAccount = accounts.bank_accounts.find(acc => acc.name === 'HDFC Bank');
            if (hdfcAccount) {
                console.log('\n4. Creating test bank transaction...');
                const transactionResponse = await fetch('/api/finance/bank_accounts/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        bank_account_id: hdfcAccount.id,
                        type: 'credit',
                        amount: 5000,
                        description: 'Test transaction for payment integration',
                        transaction_date: new Date().toISOString().split('T')[0]
                    })
                });
                const transaction = await transactionResponse.json();
                console.log('Created Transaction:', transaction);

                // Test 5: Get transactions for HDFC account
                console.log('\n5. Fetching HDFC transactions...');
                const transactionsResponse = await fetch(`/api/finance/bank_accounts/transactions?account_id=${hdfcAccount.id}`);
                const transactions = await transactionsResponse.json();
                console.log('HDFC Transactions:', transactions);
            }
        }

        console.log('\n✅ Bank Account Integration Test Complete!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// To run this test in browser console:
// testBankAccountIntegration();

console.log('🔧 Bank Account Integration Test Script Loaded');
console.log('Run: testBankAccountIntegration() in the browser console');