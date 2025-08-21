const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTablesStructure() {
  try {
    console.log('=== Checking invoices table ===');
    
    // Check invoices table structure
    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .limit(1);
      
    if (invoicesError) {
      console.error('Error accessing invoices table:', invoicesError);
    } else if (invoicesData && invoicesData.length > 0) {
      console.log('✅ Invoices table columns:', Object.keys(invoicesData[0]));
    } else {
      console.log('⚠️ Invoices table exists but is empty');
    }
    
    console.log('\n=== Checking payments table ===');
    
    // Check payments table structure again
    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .limit(1);
      
    if (paymentsError) {
      console.error('Error accessing payments table:', paymentsError);
    } else if (paymentsData && paymentsData.length > 0) {
      console.log('✅ Payments table columns:', Object.keys(paymentsData[0]));
    } else {
      console.log('⚠️ Payments table exists but is empty');
    }
    
    console.log('\n=== Checking sales_orders table for payment fields ===');
    
    // Check sales_orders table structure
    const { data: ordersData, error: ordersError } = await supabase
      .from('sales_orders')
      .select('id, order_number, payment_status, total_paid, final_price')
      .limit(3);
      
    if (ordersError) {
      console.error('Error accessing sales_orders table:', ordersError);
    } else if (ordersData && ordersData.length > 0) {
      console.log('✅ Sales orders with payment info:');
      ordersData.forEach(order => {
        console.log(`  Order ${order.order_number}:`);
        console.log(`    - Payment Status: ${order.payment_status}`);
        console.log(`    - Total Paid: ${order.total_paid}`);
        console.log(`    - Final Price: ${order.final_price}`);
        console.log(`    - Balance: ${(order.final_price || 0) - (order.total_paid || 0)}`);
      });
    } else {
      console.log('⚠️ No sales orders found');
    }
    
    console.log('\n=== Checking if there are any invoices linked to sales orders ===');
    
    // Check if invoices are linked to sales orders
    const { data: linkedInvoices, error: linkedError } = await supabase
      .from('invoices')
      .select('id, sales_order_id')
      .not('sales_order_id', 'is', null)
      .limit(5);
      
    if (linkedError) {
      console.error('Error checking linked invoices:', linkedError);
    } else {
      console.log(`Found ${linkedInvoices?.length || 0} invoices linked to sales orders`);
      if (linkedInvoices && linkedInvoices.length > 0) {
        console.log('Sample linked invoices:', linkedInvoices);
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkTablesStructure();
