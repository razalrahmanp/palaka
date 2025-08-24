const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createSampleTransactions() {
    console.log('🏦 Creating sample bank account transactions...');

    // First, let's get existing bank accounts
    const { data: accounts, error: accountError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('account_type', 'BANK')
        .limit(1);

    if (accountError) {
        console.error('❌ Error fetching accounts:', accountError);
        return;
    }

    if (!accounts || accounts.length === 0) {
        console.log('⚠️  No bank accounts found. Please create a bank account first.');
        return;
    }

    const bankAccount = accounts[0];
    console.log(`📋 Using bank account: ${bankAccount.account_name} (${bankAccount.account_number})`);

    // Sample transactions
    const sampleTransactions = [{
            bank_account_id: bankAccount.id,
            type: 'CREDIT',
            amount: 25000.00,
            description: 'Customer Payment - Invoice #INV-001',
            reference: 'TXN-001',
            transaction_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
            balance_after: 125000.00
        },
        {
            bank_account_id: bankAccount.id,
            type: 'DEBIT',
            amount: 5000.00,
            description: 'Office Supplies Purchase',
            reference: 'TXN-002',
            transaction_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
            balance_after: 120000.00
        },
        {
            bank_account_id: bankAccount.id,
            type: 'CREDIT',
            amount: 15000.00,
            description: 'UPI Payment from Customer',
            reference: 'UPI-003',
            transaction_date: new Date().toISOString(), // Today
            balance_after: 135000.00
        },
        {
            bank_account_id: bankAccount.id,
            type: 'DEBIT',
            amount: 2500.00,
            description: 'Bank Transfer to Supplier',
            reference: 'TXN-004',
            transaction_date: new Date().toISOString(), // Today
            balance_after: 132500.00
        }
    ];

    // Insert sample transactions
    const { data: transactions, error: insertError } = await supabase
        .from('bank_account_transactions')
        .insert(sampleTransactions)
        .select();

    if (insertError) {
        console.error('❌ Error inserting transactions:', insertError);
        return;
    }

    console.log(`✅ Successfully created ${transactions.length} sample transactions`);
    console.log('📊 Sample transactions created:');
    transactions.forEach(tx => {
        console.log(`  - ${tx.type} ₹${tx.amount} - ${tx.description}`);
    });

    console.log('🎉 Sample transaction data created successfully!');
}

createSampleTransactions().catch(console.error);