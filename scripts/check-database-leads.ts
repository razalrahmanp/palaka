import { createClient } from '@supabase/supabase-js';
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDatabaseLeads() {
  console.log('\n🔍 Checking leads in database...\n');

  // Get all leads grouped by campaign
  const { data: leads, error } = await supabase
    .from('meta_leads')
    .select('campaign_id, campaign_name, created_time, synced_at')
    .order('created_time', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Total leads in database: ${leads?.length || 0}\n`);

  // Group by campaign
  const campaignGroups = leads?.reduce((acc, lead) => {
    const key = lead.campaign_id || 'unknown';
    if (!acc[key]) {
      acc[key] = {
        name: lead.campaign_name || 'Unknown',
        leads: []
      };
    }
    acc[key].leads.push(lead);
    return acc;
  }, {} as Record<string, { name: string; leads: any[] }>);

  // Display by campaign
  console.log('Leads by campaign:');
  console.log('━'.repeat(80));
  
  Object.entries(campaignGroups || {}).forEach(([id, data]) => {
    const oldestLead = data.leads[data.leads.length - 1];
    const newestLead = data.leads[0];
    
    console.log(`\n📊 ${data.name}`);
    console.log(`   Campaign ID: ${id}`);
    console.log(`   Total leads: ${data.leads.length}`);
    console.log(`   Oldest: ${new Date(oldestLead.created_time).toLocaleDateString()}`);
    console.log(`   Newest: ${new Date(newestLead.created_time).toLocaleDateString()}`);
    console.log(`   Last synced: ${new Date(newestLead.synced_at).toLocaleString()}`);
  });

  console.log('\n' + '━'.repeat(80));
  console.log('\n💡 If you see old dates, click "Sync from Meta" to get latest leads');
}

checkDatabaseLeads();
