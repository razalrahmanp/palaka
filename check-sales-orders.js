const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSalesOrdersTable() {
  try {
    console.log('=== Checking sales_orders table structure ===');
    
    const { data: ordersData, error: ordersError } = await supabase
      .from('sales_orders')
      .select('*')
      .limit(1);
      
    if (ordersError) {
      console.error('Error accessing sales_orders table:', ordersError);
    } else if (ordersData && ordersData.length > 0) {
      console.log('✅ Sales orders table columns:', Object.keys(ordersData[0]));
      console.log('Sample order data:', ordersData[0]);
    } else {
      console.log('⚠️ Sales orders table exists but is empty');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSalesOrdersTable();
