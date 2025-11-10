
require('dotenv').config({ path: '.env.local' });

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testMetaCredentials() {
  log('\n═══════════════════════════════════════════════════', colors.cyan);
  log('      Meta API Credentials Test', colors.cyan);
  log('═══════════════════════════════════════════════════\n', colors.cyan);

  // Check if credentials exist
  log('1. Checking environment variables...', colors.blue);
  
  if (!META_ACCESS_TOKEN || META_ACCESS_TOKEN === 'your_access_token_here') {
    log('   ❌ META_ACCESS_TOKEN is not set or is placeholder', colors.red);
    log('   📝 Add your token to .env.local file', colors.yellow);
    log('   🌐 Get from: https://developers.facebook.com/tools/explorer/\n', colors.yellow);
    return false;
  }
  
  if (!META_AD_ACCOUNT_ID || META_AD_ACCOUNT_ID === 'your_ad_account_id_here') {
    log('   ❌ META_AD_ACCOUNT_ID is not set or is placeholder', colors.red);
    log('   📝 Add your Ad Account ID to .env.local file', colors.yellow);
    log('   🌐 Find in Ads Manager URL after "act="\n', colors.yellow);
    return false;
  }

  log('   ✅ Environment variables found', colors.green);
  log(`   📋 Token length: ${META_ACCESS_TOKEN.length} characters`, colors.blue);
  log(`   📋 Account ID: ${META_AD_ACCOUNT_ID}\n`, colors.blue);

  // Check token format
  log('2. Checking token format...', colors.blue);
  
  if (META_ACCESS_TOKEN.includes('"') || META_ACCESS_TOKEN.includes("'")) {
    log('   ❌ Token has quotes - remove them!', colors.red);
    log(`   ❌ Current: META_ACCESS_TOKEN="${META_ACCESS_TOKEN.substring(0, 20)}..."`, colors.red);
    log(`   ✅ Should be: META_ACCESS_TOKEN=${META_ACCESS_TOKEN.replace(/["']/g, '').substring(0, 20)}...`, colors.green);
    return false;
  }

  if (!META_ACCESS_TOKEN.startsWith('EAA')) {
    log('   ⚠️  Token doesn\'t start with "EAA" - might be invalid', colors.yellow);
  } else {
    log('   ✅ Token format looks correct', colors.green);
  }

  // Check Account ID format
  log('\n3. Checking Account ID format...', colors.blue);
  
  if (META_AD_ACCOUNT_ID.includes('act_')) {
    log('   ❌ Account ID has "act_" prefix - remove it!', colors.red);
    log(`   ❌ Current: META_AD_ACCOUNT_ID=${META_AD_ACCOUNT_ID}`, colors.red);
    log(`   ✅ Should be: META_AD_ACCOUNT_ID=${META_AD_ACCOUNT_ID.replace('act_', '')}`, colors.green);
    return false;
  }

  if (!/^\d+$/.test(META_AD_ACCOUNT_ID)) {
    log('   ❌ Account ID should contain only numbers', colors.red);
    return false;
  }

  log('   ✅ Account ID format looks correct\n', colors.green);

  // Test API connection
  log('4. Testing Meta API connection...', colors.blue);
  log('   🔄 Fetching account info...', colors.yellow);

  try {
    const url = `https://graph.facebook.com/v19.0/act_${META_AD_ACCOUNT_ID}?access_token=${META_ACCESS_TOKEN}&fields=id,name,account_status,currency`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      log('   ❌ API Error:', colors.red);
      log(`   ${data.error.message}`, colors.red);
      
      if (data.error.code === 190) {
        log('\n   💡 Token is invalid or expired', colors.yellow);
        log('   🔄 Generate a new token:', colors.yellow);
        log('   1. Go to: https://developers.facebook.com/tools/explorer/', colors.yellow);
        log('   2. Click "Generate Access Token"', colors.yellow);
        log('   3. Select permissions: ads_read, ads_management, leads_retrieval', colors.yellow);
        log('   4. Copy the new token to .env.local', colors.yellow);
        log('   5. Restart your server\n', colors.yellow);
      }
      
      return false;
    }

    log('   ✅ Successfully connected to Meta API!', colors.green);
    log(`\n   📊 Account Details:`, colors.blue);
    log(`      Name: ${data.name}`, colors.cyan);
    log(`      ID: ${data.id}`, colors.cyan);
    log(`      Status: ${data.account_status}`, colors.cyan);
    log(`      Currency: ${data.currency}`, colors.cyan);

  } catch (error) {
    log('   ❌ Failed to connect to Meta API', colors.red);
    log(`   ${error}`, colors.red);
    return false;
  }

  // Test fetching campaigns
  log('\n5. Testing campaign fetch...', colors.blue);
  log('   🔄 Fetching first 3 campaigns...', colors.yellow);

  try {
    const url = `https://graph.facebook.com/v19.0/act_${META_AD_ACCOUNT_ID}/campaigns?access_token=${META_ACCESS_TOKEN}&fields=id,name,status,objective&limit=3`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      log('   ❌ API Error:', colors.red);
      log(`   ${data.error.message}`, colors.red);
      return false;
    }

    if (!data.data || data.data.length === 0) {
      log('   ⚠️  No campaigns found in this ad account', colors.yellow);
      log('   💡 Create some campaigns in Meta Ads Manager first', colors.yellow);
      log('   🌐 https://business.facebook.com/adsmanager/', colors.yellow);
    } else {
      log(`   ✅ Found ${data.data.length} campaigns:`, colors.green);
      data.data.forEach((campaign: any, index: number) => {
        log(`\n      ${index + 1}. ${campaign.name}`, colors.cyan);
        log(`         ID: ${campaign.id}`, colors.blue);
        log(`         Status: ${campaign.status}`, colors.blue);
        log(`         Objective: ${campaign.objective || 'N/A'}`, colors.blue);
      });
    }

  } catch (error) {
    log('   ❌ Failed to fetch campaigns', colors.red);
    log(`   ${error}`, colors.red);
    return false;
  }

  // All tests passed
  log('\n═══════════════════════════════════════════════════', colors.green);
  log('   ✅ ALL TESTS PASSED!', colors.green);
  log('═══════════════════════════════════════════════════', colors.green);
  
  log('\n📋 Next Steps:', colors.blue);
  log('   1. Start your dev server: npm run dev', colors.cyan);
  log('   2. Open: http://localhost:3000/crm/meta-campaigns', colors.cyan);
  log('   3. Click "Sync from Meta" button', colors.cyan);
  log('   4. Your campaigns will appear! 🎉\n', colors.cyan);

  return true;
}

// Run the test
testMetaCredentials()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log(`\n❌ Unexpected error: ${error}`, colors.red);
    process.exit(1);
  });
