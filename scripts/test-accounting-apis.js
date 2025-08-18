// Test script for Accounting APIs
// Run this in the browser console to test the accounting endpoints

async function testAccountingAPIs() {
    console.log('🧪 Testing Accounting APIs...\n')

    try {
        // Test 1: Chart of Accounts
        console.log('📊 Testing Chart of Accounts API...')
        const chartResponse = await fetch('/api/accounting/chart-of-accounts')
        const chartData = await chartResponse.json()
        console.log('✅ Chart of Accounts:', chartData.success ? 'SUCCESS' : 'FAILED')
        if (chartData.data) {
            console.log(`   - Found ${chartData.data.length} accounts`)
        }
        console.log('')

        // Test 2: Journal Entries
        console.log('📝 Testing Journal Entries API...')
        const journalResponse = await fetch('/api/accounting/journal-entries')
        const journalData = await journalResponse.json()
        console.log('✅ Journal Entries:', journalData.success ? 'SUCCESS' : 'FAILED')
        if (journalData.data) {
            console.log(`   - Found ${journalData.data.entries?.length || 0} entries`)
        }
        console.log('')

        // Test 3: General Ledger
        console.log('📚 Testing General Ledger API...')
        const ledgerResponse = await fetch('/api/accounting/general-ledger')
        const ledgerData = await ledgerResponse.json()
        console.log('✅ General Ledger:', ledgerData.success ? 'SUCCESS' : 'FAILED')
        if (ledgerData.data) {
            console.log(`   - Found ${ledgerData.data.entries?.length || 0} entries`)
        }
        console.log('')

        // Test 4: Trial Balance
        console.log('⚖️ Testing Trial Balance API...')
        const trialResponse = await fetch('/api/accounting/reports/trial-balance')
        const trialData = await trialResponse.json()
        console.log('✅ Trial Balance:', trialData.success ? 'SUCCESS' : 'FAILED')
        if (trialData.data) {
            console.log(`   - Found ${trialData.data.accounts?.length || 0} accounts`)
            console.log(`   - Balanced: ${trialData.data.totals?.isBalanced ? 'YES' : 'NO'}`)
        }
        console.log('')

        // Test 5: Balance Sheet
        console.log('📋 Testing Balance Sheet API...')
        const balanceResponse = await fetch('/api/accounting/reports/balance-sheet')
        const balanceData = await balanceResponse.json()
        console.log('✅ Balance Sheet:', balanceData.success ? 'SUCCESS' : 'FAILED')
        if (balanceData.data) {
            console.log(`   - Total Assets: ${balanceData.data.totals?.totalAssets || 0}`)
            console.log(`   - Balanced: ${balanceData.data.totals?.isBalanced ? 'YES' : 'NO'}`)
        }
        console.log('')

        // Test 6: Income Statement
        console.log('💰 Testing Income Statement API...')
        const incomeResponse = await fetch('/api/accounting/reports/income-statement')
        const incomeData = await incomeResponse.json()
        console.log('✅ Income Statement:', incomeData.success ? 'SUCCESS' : 'FAILED')
        if (incomeData.data) {
            console.log(`   - Total Revenue: ${incomeData.data.revenue?.total || 0}`)
            console.log(`   - Net Income: ${incomeData.data.netIncome || 0}`)
        }
        console.log('')

        // Test 7: Daysheet
        console.log('📅 Testing Daysheet API...')
        const daysheetResponse = await fetch('/api/accounting/reports/daysheet')
        const daysheetData = await daysheetResponse.json()
        console.log('✅ Daysheet:', daysheetData.success ? 'SUCCESS' : 'FAILED')
        if (daysheetData.data) {
            console.log(`   - Journal Entries: ${daysheetData.data.journalEntries?.length || 0}`)
            console.log(`   - Balanced: ${daysheetData.data.isBalanced ? 'YES' : 'NO'}`)
        }
        console.log('')

        // Test 8: AR Aging
        console.log('👥 Testing AR Aging API...')
        const arResponse = await fetch('/api/accounting/reports/ar-aging')
        const arData = await arResponse.json()
        console.log('✅ AR Aging:', arData.success ? 'SUCCESS' : 'FAILED')
        if (arData.data) {
            console.log(`   - Customers: ${arData.data.customers?.length || 0}`)
            console.log(`   - Total Outstanding: ${arData.data.totals?.total_outstanding || 0}`)
        }
        console.log('')

        // Test 9: AP Aging
        console.log('🏪 Testing AP Aging API...')
        const apResponse = await fetch('/api/accounting/reports/ap-aging')
        const apData = await apResponse.json()
        console.log('✅ AP Aging:', apData.success ? 'SUCCESS' : 'FAILED')
        if (apData.data) {
            console.log(`   - Suppliers: ${apData.data.suppliers?.length || 0}`)
            console.log(`   - Total Outstanding: ${apData.data.totals?.total_outstanding || 0}`)
        }
        console.log('')

        console.log('🎉 All Accounting API tests completed!')

    } catch (error) {
        console.error('❌ Error testing APIs:', error)
    }
}

// Run the tests
testAccountingAPIs()