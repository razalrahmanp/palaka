// Test script to verify finance system functionality
// Run this from browser console on finance page

const testFinanceSystem = async () => {
  console.log("🔍 Testing Finance System Components...");
  
  // Test 1: Chart of Accounts API
  try {
    const chartResponse = await fetch('/api/finance/chart-of-accounts');
    const chartData = await chartResponse.json();
    console.log("✅ Chart of Accounts API:", chartData.data?.length, "accounts found");
  } catch (error) {
    console.error("❌ Chart of Accounts API failed:", error);
  }
  
  // Test 2: General Ledger API
  try {
    const ledgerResponse = await fetch('/api/finance/general-ledger');
    const ledgerData = await ledgerResponse.json();
    console.log("✅ General Ledger API:", ledgerData.data?.length, "entries found");
  } catch (error) {
    console.error("❌ General Ledger API failed:", error);
  }
  
  // Test 3: Journal Entries API
  try {
    const journalResponse = await fetch('/api/finance/journal-entries');
    const journalData = await journalResponse.json();
    console.log("✅ Journal Entries API:", journalData.data?.length, "entries found");
  } catch (error) {
    console.error("❌ Journal Entries API failed:", error);
  }
  
  // Test 4: Financial Reports API - Trial Balance
  try {
    const reportResponse = await fetch('/api/finance/reports/trial-balance');
    const reportData = await reportResponse.json();
    console.log("✅ Trial Balance Report:", reportData.data?.length, "accounts found");
    console.log("📊 Trial Balance Summary:", reportData.summary);
  } catch (error) {
    console.error("❌ Trial Balance Report failed:", error);
  }
  
  // Test 5: Balance Sheet Report
  try {
    const balanceSheetResponse = await fetch('/api/finance/reports/balance-sheet');
    const balanceSheetData = await balanceSheetResponse.json();
    console.log("✅ Balance Sheet Report:", balanceSheetData.sections);
    console.log("📊 Balance Sheet Summary:", balanceSheetData.summary);
  } catch (error) {
    console.error("❌ Balance Sheet Report failed:", error);
  }
  
  // Test 6: Profit & Loss Report
  try {
    const plResponse = await fetch('/api/finance/reports/profit-loss');
    const plData = await plResponse.json();
    console.log("✅ Profit & Loss Report:", plData.sections);
    console.log("📊 P&L Summary:", plData.summary);
  } catch (error) {
    console.error("❌ Profit & Loss Report failed:", error);
  }
  
  console.log("🎉 Finance System Test Complete!");
};

// Auto-run if in browser
if (typeof window !== 'undefined') {
  testFinanceSystem();
}

module.exports = { testFinanceSystem };
