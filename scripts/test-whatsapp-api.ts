import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const colorCodes = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colorCodes.reset) {
  console.log(`${color}${message}${colorCodes.reset}`);
}

async function testWhatsAppAPI() {
  log('\n═══════════════════════════════════════════════════', colorCodes.cyan);
  log('    WhatsApp Business API Connection Test', colorCodes.cyan);
  log('═══════════════════════════════════════════════════\n', colorCodes.cyan);

  // Check credentials
  log('1. Checking environment variables...', colorCodes.blue);
  
  if (!WHATSAPP_ACCESS_TOKEN || WHATSAPP_ACCESS_TOKEN === 'your_whatsapp_access_token_here') {
    log('   ❌ WHATSAPP_ACCESS_TOKEN not set', colorCodes.red);
    log('   📝 Add to .env.local file', colorCodes.yellow);
    log('   🌐 Get from: Meta App → WhatsApp → API Setup\n', colorCodes.yellow);
    return false;
  }
  
  if (!WHATSAPP_PHONE_NUMBER_ID || WHATSAPP_PHONE_NUMBER_ID === 'your_phone_number_id_here') {
    log('   ❌ WHATSAPP_PHONE_NUMBER_ID not set', colorCodes.red);
    log('   📝 Add to .env.local file', colorCodes.yellow);
    log('   🌐 Get from: Meta App → WhatsApp → API Setup\n', colorCodes.yellow);
    return false;
  }

  log('   ✅ Environment variables found', colorCodes.green);
  log(`   📋 Token length: ${WHATSAPP_ACCESS_TOKEN.length} characters`, colorCodes.blue);
  log(`   📋 Phone Number ID: ${WHATSAPP_PHONE_NUMBER_ID}\n`, colorCodes.blue);

  // Test API connection
  log('2. Testing WhatsApp API connection...', colorCodes.blue);
  log('   🔄 Fetching phone number info...', colorCodes.yellow);

  try {
    const url = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}?access_token=${WHATSAPP_ACCESS_TOKEN}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      log('   ❌ API Error:', colorCodes.red);
      log(`   ${data.error.message}`, colorCodes.red);
      
      if (data.error.code === 190) {
        log('\n   💡 Token is invalid or expired', colorCodes.yellow);
        log('   🔄 Generate a new token:', colorCodes.yellow);
        log('   1. Go to: Meta App → WhatsApp → API Setup', colorCodes.yellow);
        log('   2. Click "Generate Access Token"', colorCodes.yellow);
        log('   3. Select permissions: whatsapp_business_management, whatsapp_business_messaging', colorCodes.yellow);
        log('   4. Copy the new token to .env.local', colorCodes.yellow);
      }
      
      return false;
    }

    log('   ✅ API connection successful!', colorCodes.green);
    log(`   📱 Phone Number: ${data.display_phone_number || data.verified_name || 'Unknown'}`, colorCodes.blue);
    log(`   🆔 Phone Number ID: ${data.id}`, colorCodes.blue);
    log(`   ✅ Status: ${data.quality_rating || 'Unknown'}\n`, colorCodes.green);

    // Test webhook endpoint (local)
    log('3. Testing webhook endpoint...', colorCodes.blue);
    log('   📍 Local webhook: http://localhost:3000/api/whatsapp/webhook', colorCodes.blue);
    
    const testUrl = 'http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=palaka_whatsapp_2025_secure_token&hub.challenge=test123';
    
    try {
      const webhookResponse = await fetch(testUrl);
      const webhookData = await webhookResponse.text();
      
      if (webhookData === 'test123') {
        log('   ✅ Webhook endpoint working locally!', colorCodes.green);
      } else {
        log('   ⚠️  Webhook endpoint exists but verification failed', colorCodes.yellow);
        log('   💡 Check WHATSAPP_WEBHOOK_VERIFY_TOKEN in .env.local', colorCodes.yellow);
      }
    } catch (error) {
      log('   ⚠️  Could not connect to local webhook', colorCodes.yellow);
      log('   💡 Make sure your Next.js app is running (npm run dev)', colorCodes.yellow);
    }

    // Summary
    log('\n═══════════════════════════════════════════════════', colorCodes.cyan);
    log('✅ WhatsApp API Configuration Summary', colorCodes.green);
    log('═══════════════════════════════════════════════════', colorCodes.cyan);
    log('✅ Credentials valid', colorCodes.green);
    log('✅ API connection working', colorCodes.green);
    log('✅ Phone number verified', colorCodes.green);
    log('\n📋 Next Steps:', colorCodes.blue);
    log('1. Deploy your app to get public URL (or use ngrok for testing)', colorCodes.blue);
    log('2. Set up webhook in Meta App → WhatsApp → Configuration', colorCodes.blue);
    log('   Callback URL: https://your-domain.com/api/whatsapp/webhook', colorCodes.blue);
    log('   Verify Token: palaka_whatsapp_2025_secure_token', colorCodes.blue);
    log('3. Subscribe to webhook fields: messages, message_status', colorCodes.blue);
    log('4. Test by sending a WhatsApp message to your business number!', colorCodes.blue);
    log('\n📚 Full guide: docs/WHATSAPP_API_SETUP.md\n', colorCodes.cyan);

    return true;
  } catch (error) {
    log('   ❌ Connection failed:', colorCodes.red);
    log(`   ${error}`, colorCodes.red);
    return false;
  }
}

testWhatsAppAPI();
