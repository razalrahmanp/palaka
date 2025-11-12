import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInventoryAging() {
  console.log('🔍 Checking inventory table...\n');
  
  const { data: inventory, error } = await supabase
    .from('inventory')
    .select('*')
    .limit(5);
  
  console.log('📦 inventory count:', inventory?.length || 0);
  if (error) {
    console.error('❌ Error:', error);
  } else if (inventory && inventory.length > 0) {
    console.log('Sample inventory items:', JSON.stringify(inventory, null, 2));
    
    // Check if unit_cost is populated
    const withCost = inventory.filter(i => i.unit_cost && i.unit_cost > 0);
    console.log('\nItems with unit_cost > 0:', withCost.length);
    
    // Check last_updated dates
    inventory.forEach(item => {
      if (item.last_updated) {
        const daysSince = Math.floor((Date.now() - new Date(item.last_updated).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`Item ${item.id}: ${daysSince} days old, quantity: ${item.quantity}, unit_cost: ${item.unit_cost}`);
      }
    });
  }
  
  console.log('\n🔍 Checking inventory_items table...\n');
  
  const { data: invItems, error: invError } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(5);
  
  console.log('📦 inventory_items count:', invItems?.length || 0);
  if (invError) {
    console.error('❌ Error:', invError);
  } else if (invItems && invItems.length > 0) {
    console.log('Sample inventory_items:', JSON.stringify(invItems, null, 2));
  }
}

checkInventoryAging().catch(console.error);
