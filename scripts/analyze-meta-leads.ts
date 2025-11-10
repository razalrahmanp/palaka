require('dotenv').config({ path: '.env.local' });

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;

async function analyzeMetaLeads() {
  console.log('\n🔍 Analyzing Meta Campaigns & Lead Generation...\n');

  try {
    // 1. Check WhatsApp Business Account
    console.log('1️⃣ Checking WhatsApp Business Account...');
    const waba = await fetch(
      `https://graph.facebook.com/v19.0/me/businesses?access_token=${META_ACCESS_TOKEN}&fields=id,name`
    );
    const wabaData = await waba.json();
    console.log('WhatsApp Business:', JSON.stringify(wabaData, null, 2));

    // 2. Get all campaigns with lead objective
    console.log('\n2️⃣ Fetching OUTCOME_LEADS campaigns...');
    const campaignsUrl = `https://graph.facebook.com/v19.0/act_${META_AD_ACCOUNT_ID}/campaigns?access_token=${META_ACCESS_TOKEN}&fields=id,name,objective,status&filtering=[{"field":"objective","operator":"IN","value":["OUTCOME_LEADS"]}]&limit=100`;
    
    const campaignsRes = await fetch(campaignsUrl);
    const campaignsData = await campaignsRes.json();
    
    if (campaignsData.error) {
      console.error('❌ Error:', campaignsData.error.message);
      return;
    }

    const leadCampaigns = campaignsData.data || [];
    console.log(`Found ${leadCampaigns.length} OUTCOME_LEADS campaigns:`);
    leadCampaigns.forEach((c: any) => {
      console.log(`  - ${c.name} (${c.id}) - ${c.status}`);
    });

    // 3. For each lead campaign, check for ads and lead forms
    console.log('\n3️⃣ Checking ads and lead forms...');
    
    for (const campaign of leadCampaigns) {
      console.log(`\n📊 Campaign: ${campaign.name}`);
      
      // Get ads for this campaign
      const adsUrl = `https://graph.facebook.com/v19.0/${campaign.id}/ads?access_token=${META_ACCESS_TOKEN}&fields=id,name,status&limit=50`;
      const adsRes = await fetch(adsUrl);
      const adsData = await adsRes.json();
      const ads = adsData.data || [];
      
      console.log(`   Found ${ads.length} ads`);
      
      for (const ad of ads) {
        console.log(`   📢 Ad: ${ad.name} (${ad.id})`);
        
        // Try to get leads for this ad
        const leadsUrl = `https://graph.facebook.com/v19.0/${ad.id}/leads?access_token=${META_ACCESS_TOKEN}&fields=id,created_time,field_data&limit=10`;
        const leadsRes = await fetch(leadsUrl);
        const leadsData = await leadsRes.json();
        
        if (leadsData.data && leadsData.data.length > 0) {
          console.log(`      ✅ ${leadsData.data.length} leads found`);
          leadsData.data.slice(0, 2).forEach((lead: any) => {
            console.log(`         Lead ${lead.id} - ${new Date(lead.created_time).toLocaleDateString()}`);
            if (lead.field_data) {
              lead.field_data.forEach((field: any) => {
                console.log(`           ${field.name}: ${field.values.join(', ')}`);
              });
            }
          });
        } else {
          console.log(`      ℹ️ No leads (might be engagement ad)`);
        }
      }
    }

    // 4. Check for WhatsApp messaging permissions
    console.log('\n4️⃣ Checking WhatsApp permissions...');
    const permUrl = `https://graph.facebook.com/v19.0/me/permissions?access_token=${META_ACCESS_TOKEN}`;
    const permRes = await fetch(permUrl);
    const permData = await permRes.json();
    
    console.log('Current permissions:');
    if (permData.data) {
      permData.data.forEach((perm: any) => {
        if (perm.status === 'granted') {
          console.log(`  ✅ ${perm.permission}`);
        }
      });
    }

    // 5. Check if we can access WhatsApp conversations (requires WhatsApp Business API)
    console.log('\n5️⃣ Checking WhatsApp Business API access...');
    console.log('⚠️  Important: WhatsApp messages via "Click to WhatsApp" ads are NOT stored as leads');
    console.log('   - Lead Ads: Form submissions stored in Meta Graph API');
    console.log('   - WhatsApp Ads: Direct messages to WhatsApp Business number');
    console.log('   - To track WhatsApp conversations, you need WhatsApp Business API webhook');

    // 6. Suggest solution
    console.log('\n💡 SOLUTION:');
    console.log('━'.repeat(60));
    console.log('To capture WhatsApp conversations from "Click to WhatsApp" ads:');
    console.log('');
    console.log('Option 1: Use Lead Form Ads instead');
    console.log('  - Create ads with OUTCOME_LEADS objective');
    console.log('  - Attach lead forms to collect contact info');
    console.log('  - Forms appear before WhatsApp redirect');
    console.log('');
    console.log('Option 2: WhatsApp Business API Integration');
    console.log('  - Set up WhatsApp Business Platform account');
    console.log('  - Configure webhook to receive messages');
    console.log('  - Store conversations in your database');
    console.log('  - Requires business verification');
    console.log('');
    console.log('Option 3: Manual Import');
    console.log('  - Export chats from WhatsApp Business app');
    console.log('  - Manually upload to CRM');
    console.log('━'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

analyzeMetaLeads();
