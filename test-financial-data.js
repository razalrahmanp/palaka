const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rbukwqxndbwwrfdtasjv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJidWt3cXhuZGJ3d3JmZHRhc2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4ODczNTMsImV4cCI6MjA1MDQ2MzM1M30.lnKqd_wMoLp5TKE8DRe-Lf5kGu3RtKxOjAJVlEv1B78';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFinancialData() {
    console.log('=== CHECKING FINANCIAL DATA ===');

    // 1. Check chart of accounts data
    console.log('\n1. Chart of Accounts Data:');
    const { data: chartData, error: chartError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('account_name');

    if (chartError) {
        console.error('Error fetching chart of accounts:', chartError);
    } else {
        console.log('Total chart accounts:', chartData.length);
        chartData.forEach(account => {
            console.log(`- ${account.account_name}: ${account.account_type} | Balance: ${account.balance || 0}`);
        });
    }

    // 2. Check inventory items total cost
    console.log('\n2. Inventory Items Total Cost:');
    const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('cost, quantity')
        .not('cost', 'is', null)
        .not('quantity', 'is', null);

    if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
    } else {
        let totalInventoryCost = 0;
        inventoryData.forEach(item => {
            const itemCost = (parseFloat(item.cost) || 0) * (parseInt(item.quantity) || 0);
            totalInventoryCost += itemCost;
        });
        console.log('Total Inventory Items:', inventoryData.length);
        console.log('Total Inventory Cost:', totalInventoryCost);
    }

    // 3. Check sales orders outstanding
    console.log('\n3. Sales Orders Outstanding:');
    const { data: salesData, error: salesError } = await supabase
        .from('sales_orders')
        .select('final_price, order_date')
        .eq('payment_status', 'pending')
        .not('final_price', 'is', null);

    if (salesError) {
        console.error('Error fetching sales orders:', salesError);
    } else {
        let totalOutstanding = 0;
        salesData.forEach(order => {
            totalOutstanding += parseFloat(order.final_price) || 0;
        });
        console.log('Pending Orders Count:', salesData.length);
        console.log('Total Outstanding:', totalOutstanding);
    }

    // 4. Calculate the same way as the API
    console.log('\n4. Calculated Assets (like API):');

    // Non-inventory assets (excluding inventory from chart of accounts)
    const nonInventoryAssets = chartData ? .filter(account =>
        account.account_type === 'Asset' &&
        !account.account_name ? .toLowerCase().includes('inventory')
    ).reduce((sum, account) => sum + (parseFloat(account.balance) || 0), 0) || 0;

    // Inventory assets
    let inventoryAssets = 0;
    if (inventoryData) {
        inventoryAssets = inventoryData.reduce((sum, item) => {
            return sum + ((parseFloat(item.cost) || 0) * (parseInt(item.quantity) || 0));
        }, 0);
    }

    // Outstanding (accounts receivable)
    const accountsReceivable = salesData ? .reduce((sum, order) => sum + (parseFloat(order.final_price) || 0), 0) || 0;

    const calculatedTotalAssets = nonInventoryAssets + inventoryAssets + accountsReceivable;

    console.log(`Non-inventory Assets: ${nonInventoryAssets}`);
    console.log(`Inventory Assets: ${inventoryAssets}`);
    console.log(`Accounts Receivable: ${accountsReceivable}`);
    console.log(`Calculated Total Assets: ${calculatedTotalAssets}`);

    console.log('\n=== END FINANCIAL DATA CHECK ===');
}

checkFinancialData().catch(console.error);