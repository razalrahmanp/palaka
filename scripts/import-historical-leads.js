// Script to fetch all historical leads from Facebook Lead Ads
// Run this with: node scripts/import-historical-leads.js

const https = require('https');

// Configuration
const PAGE_ID = '426495230775638';
const ACCESS_TOKEN = 'EAAVTJXGTV4gBP5lV4jCtc8ZCuvfRDYR5ik5GzYZCHD6sJzqxD8Mf4m8VF3LVSd2iPJK4c0kwCKjoTz49pnBZBnQZA94QGNrBphC9y1i6Ua0BJlyi5viJNQ1uP7FktSdZCemxkcVZBDQz5qZAQZBtZAkOQvtB7da5PbS7oGimrQF9N57LDT3infotSdGvvNAGiPtO76Qy5F9kQU0c9jmpYNexampjvKCs7zuV4oaEuDlcZD';
const WEBHOOK_URL = 'https://www.alramsfurniture.shop/api/crm/meta-webhook';

// Function to make API requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Function to post lead to webhook
function postLeadToWebhook(leadData) {
  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const postData = JSON.stringify({
      object: 'page',
      entry: [{
        id: PAGE_ID,
        time: Date.now(),
        changes: [{
          field: 'leadgen',
          value: leadData
        }]
      }]
    });

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function fetchAllLeads() {
  console.log('🔍 Fetching all lead forms...\n');

  try {
    // Step 1: Get all lead forms
    const formsUrl = `https://graph.facebook.com/v24.0/${PAGE_ID}/leadgen_forms?access_token=${ACCESS_TOKEN}`;
    const formsData = await makeRequest(formsUrl);
    
    if (!formsData.data || formsData.data.length === 0) {
      console.log('❌ No lead forms found');
      return;
    }

    console.log(`✅ Found ${formsData.data.length} lead forms\n`);

    let totalLeads = 0;

    // Step 2: For each form, get all leads
    for (const form of formsData.data) {
      console.log(`📋 Form: ${form.name || form.id}`);
      
      let leadsUrl = `https://graph.facebook.com/v24.0/${form.id}/leads?access_token=${ACCESS_TOKEN}`;
      let hasMore = true;
      let formLeadCount = 0;

      while (hasMore) {
        const leadsData = await makeRequest(leadsUrl);
        
        if (leadsData.data && leadsData.data.length > 0) {
          console.log(`  📥 Processing ${leadsData.data.length} leads...`);

          // Step 3: Get detailed data for each lead and send to webhook
          for (const lead of leadsData.data) {
            try {
              // Get full lead details including field_data
              const leadDetailsUrl = `https://graph.facebook.com/v24.0/${lead.id}?fields=id,created_time,ad_id,ad_name,form_id,field_data,platform&access_token=${ACCESS_TOKEN}`;
              const leadDetails = await makeRequest(leadDetailsUrl);

              // Extract field_data to get name, email, phone
              const fieldData = {};
              let full_name = '';
              let email = '';
              let phone = '';

              if (leadDetails.field_data) {
                leadDetails.field_data.forEach(field => {
                  const fieldName = field.name.toLowerCase();
                  const fieldValue = field.values[0];
                  
                  fieldData[fieldName] = fieldValue;

                  // Map standard fields
                  if (fieldName.includes('name') || fieldName === 'full_name') {
                    full_name = fieldValue;
                  } else if (fieldName.includes('email')) {
                    email = fieldValue;
                  } else if (fieldName.includes('phone') || fieldName.includes('mobile')) {
                    phone = fieldValue;
                  }
                });
              }

              // Skip if no name (required field)
              if (!full_name) {
                console.log(`    ⚠️  Skipping lead ${lead.id} - no name found`);
                continue;
              }

              // Send to webhook with field_data
              const webhookData = {
                leadgen_id: leadDetails.id,
                form_id: leadDetails.form_id,
                ad_id: leadDetails.ad_id,
                ad_name: leadDetails.ad_name,
                created_time: leadDetails.created_time,
                platform: leadDetails.platform || 'facebook',
                field_data: leadDetails.field_data, // Include field_data
                campaign_name: form.name // Use form name as campaign
              };

              await postLeadToWebhook(webhookData);
              formLeadCount++;
              totalLeads++;
              
              console.log(`    ✅ Lead ${lead.id} imported (${full_name})`);
              
              // Rate limiting - wait 100ms between requests
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
              console.log(`    ❌ Failed to import lead ${lead.id}:`, err.message);
            }
          }

          // Check if there are more pages
          if (leadsData.paging && leadsData.paging.next) {
            leadsUrl = leadsData.paging.next;
          } else {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      console.log(`  ✅ Imported ${formLeadCount} leads from this form\n`);
    }

    console.log(`\n🎉 Import Complete!`);
    console.log(`📊 Total leads imported: ${totalLeads}`);
    console.log(`\n✅ Check your CRM at: https://www.alramsfurniture.shop/crm/leads`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

// Run the import
console.log('🚀 Starting Historical Leads Import...\n');
console.log(`Page ID: ${PAGE_ID}`);
console.log(`Webhook: ${WEBHOOK_URL}\n`);

fetchAllLeads();
