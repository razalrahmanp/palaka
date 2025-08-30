/**
 * BAJAJ FINANCE CARD FEE DEBUG SCRIPT
 * 
 * Run this in browser console during order creation to trace
 * the exact data flow from UI → API → Database
 */

// Override console.log to capture Bajaj Finance related logs
const originalLog = console.log;
const bajajLogs = [];

console.log = function(...args) {
  const message = args.join(' ');
  if (message.includes('Bajaj') || message.includes('bajaj') || message.includes('Card') || message.includes('card') || message.includes('EMI') || message.includes('emi')) {
    bajajLogs.push({
      timestamp: new Date().toISOString(),
      message: message,
      args: args
    });
  }
  originalLog.apply(console, args);
};

// Monitor fetch requests to catch API calls
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  if (url.includes('/api/sales/') && options?.method === 'POST') {
    const body = options.body ? JSON.parse(options.body) : {};
    
    console.log(`🔍 API CALL INTERCEPTED: ${url}`);
    console.log('📤 Request Body - Bajaj Finance Fields:');
    console.log('  bajaj_convenience_charges:', body.bajaj_convenience_charges);
    console.log('  bajaj_processing_fee_amount:', body.bajaj_processing_fee_amount);
    console.log('  bajaj_total_customer_payment:', body.bajaj_total_customer_payment);
    console.log('  bajaj_merchant_receivable:', body.bajaj_merchant_receivable);
    console.log('  emi_enabled:', body.emi_enabled);
    console.log('  bajaj_finance_amount:', body.bajaj_finance_amount);
    
    return originalFetch(url, options).then(async response => {
      const responseData = await response.json();
      console.log('📥 API Response:', responseData);
      
      if (responseData.bajaj_convenience_charges !== undefined) {
        console.log(`🎯 CONVENIENCE CHARGES IN RESPONSE: ${responseData.bajaj_convenience_charges}`);
        if (responseData.bajaj_convenience_charges === 0) {
          console.error('❌ ISSUE FOUND: convenience_charges is 0 in database response!');
        } else {
          console.log('✅ convenience_charges correctly stored in database');
        }
      }
      
      return new Response(JSON.stringify(responseData), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    });
  }
  
  return originalFetch(url, options);
};

// Function to display debug summary
window.showBajajDebugSummary = function() {
  console.log('\n📊 BAJAJ FINANCE DEBUG SUMMARY');
  console.log('================================');
  
  bajajLogs.forEach((log, index) => {
    console.log(`${index + 1}. [${log.timestamp}] ${log.message}`);
  });
  
  console.log('\n🔍 KEY CHECKPOINTS:');
  console.log('1. Look for "Bajaj Finance Card Status" - shows if calculator data is present');
  console.log('2. Look for "Bajaj Finance Charge Breakdown" - shows calculated values');
  console.log('3. Look for "API CALL INTERCEPTED" - shows actual values sent to API');
  console.log('4. Look for "CONVENIENCE CHARGES IN RESPONSE" - shows database result');
  console.log('\n💡 To debug: Create a quote/order and then run showBajajDebugSummary()');
};

// Auto-monitor for specific data patterns
let debugInterval;
window.startBajajMonitoring = function() {
  console.log('🔄 Starting Bajaj Finance monitoring...');
  debugInterval = setInterval(() => {
    // Check if BajajFinanceCalculator is in DOM
    const calculator = document.querySelector('[data-testid="bajaj-finance-calculator"]') || 
                     document.querySelector('.bajaj-finance-calculator') ||
                     document.querySelector('[class*="bajaj"]');
    
    if (calculator) {
      console.log('📱 BajajFinanceCalculator component detected in DOM');
    }
    
    // Check for EMI toggle
    const emiToggle = document.querySelector('[data-testid="emi-toggle"]') || 
                     document.querySelector('input[type="checkbox"][name*="emi"]') ||
                     document.querySelector('button[name*="emi"]');
    
    if (emiToggle) {
      console.log('🔘 EMI toggle detected, checked:', emiToggle.checked || emiToggle.getAttribute('data-checked'));
    }
  }, 2000);
  
  setTimeout(() => {
    clearInterval(debugInterval);
    console.log('⏹️ Monitoring stopped after 30 seconds');
  }, 30000);
};

// Auto-start monitoring
console.log('🚀 Bajaj Finance Debug Script Loaded!');
console.log('📋 Available functions:');
console.log('  - showBajajDebugSummary(): Show captured logs');
console.log('  - startBajajMonitoring(): Monitor for 30 seconds');

// Start monitoring immediately
window.startBajajMonitoring();
