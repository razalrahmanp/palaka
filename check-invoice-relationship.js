// Check invoices table structure and relationship
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkInvoicesRelationship() {
  try {
    console.log('=== Checking invoices table structure ===');
    
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1);
      
    if (invoicesError) {
      console.error('Error accessing invoices table:', invoicesError);
    } else if (invoicesData && invoicesData.length > 0) {
      console.log('✅ Invoices table columns:', Object.keys(invoicesData[0]));
      console.log('Sample invoice data:', invoicesData[0]);
    } else {
      console.log('⚠️ Invoices table exists but is empty');
    }
    
    // Try to find the correct relationship
    console.log('\n=== Testing different relationship queries ===');
    
    // Test 1: Direct join using sales_order_id
    console.log('Test 1: Using sales_order_id foreign key...');
    const { data: test1, error: error1 } = await supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        invoices!sales_order_id (
          id,
          total,
          paid_amount,
          status
        )
      `)
      .limit(1);
      
    if (error1) {
      console.log('❌ Test 1 failed:', error1.message);
    } else {
      console.log('✅ Test 1 successful:', test1);
    }
    
    // Test 2: Try without specifying the foreign key
    console.log('\nTest 2: Without specifying foreign key...');
    const { data: test2, error: error2 } = await supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        invoices (
          id,
          total,
          paid_amount,
          status
        )
      `)
      .limit(1);
      
    if (error2) {
      console.log('❌ Test 2 failed:', error2.message);
    } else {
      console.log('✅ Test 2 successful:', test2);
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkInvoicesRelationship();
