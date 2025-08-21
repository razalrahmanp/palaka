const { createClient } = require('@supabase/supabase-js');

// Configure Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDatabaseValues() {
    console.log('=== DEBUGGING DATABASE VALUES ===');

    // Check inventory items with highest values
    console.log('\n1. Checking inventory items...');
    const { data: inventoryItems, error: inventoryError } = await supabase
        .from('inventory_items')
        .select(`
      id,
      quantity,
      products!inner(id, name, cost, supplier_id)
    `)
        .order('quantity', { ascending: false })
        .limit(10);

    if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
    } else {
        console.log('Top 10 inventory items by quantity:');
        inventoryItems ? .forEach(item => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const value = (item.quantity || 0) * (product ? .cost || 0);
            console.log(`- ${product?.name}: Qty ${item.quantity} × Cost ₹${product?.cost} = ₹${value.toLocaleString()}`);
        });

        const totalInventory = inventoryItems ? .reduce((sum, item) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            return sum + ((item.quantity || 0) * (product ? .cost || 0));
        }, 0) || 0;
        console.log(`Total inventory value from top 10: ₹${totalInventory.toLocaleString()}`);
    }

    // Check chart of accounts with highest balances
    console.log('\n2. Checking chart of accounts...');
    const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .order('current_balance', { ascending: false })
        .limit(10);

    if (accountsError) {
        console.error('Error fetching accounts:', accountsError);
    } else {
        console.log('Top 10 accounts by balance:');
        accounts ? .forEach(account => {
            console.log(`- ${account.name} (${account.account_type}): ₹${(account.current_balance || 0).toLocaleString()}`);
        });

        const totalAssets = accounts ? .filter(acc => acc.account_type === 'ASSET' && acc.is_active)
            .reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;
        console.log(`Total asset accounts value from top 10: ₹${totalAssets.toLocaleString()}`);
    }

    // Check totals
    console.log('\n3. Getting overall totals...');

    // All inventory
    const { data: allInventory } = await supabase
        .from('inventory_items')
        .select(`quantity, products!inner(cost)`);

    const totalAllInventory = allInventory ? .reduce((sum, item) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        return sum + ((item.quantity || 0) * (product ? .cost || 0));
    }, 0) || 0;

    // All asset accounts (excluding inventory)
    const { data: allAssetAccounts } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('account_type', 'ASSET')
        .eq('is_active', true);

    const totalNonInventoryAssets = allAssetAccounts ? .filter(account =>
        account.account_subtype !== 'INVENTORY' &&
        !account.name ? .toLowerCase().includes('inventory') &&
        !account.name ? .toLowerCase().includes('stock')
    ).reduce((sum, acc) => sum + (acc.current_balance || 0), 0) || 0;

    console.log(`Total ALL inventory assets: ₹${totalAllInventory.toLocaleString()}`);
    console.log(`Total ALL non-inventory assets: ₹${totalNonInventoryAssets.toLocaleString()}`);
    console.log(`Combined total: ₹${(totalAllInventory + totalNonInventoryAssets).toLocaleString()}`);
}

debugDatabaseValues().catch(console.error);