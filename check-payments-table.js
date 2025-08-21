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

async function checkPaymentsTable() {
  try {
    console.log('Checking payments table structure...');
    
    // Try to get one record to see the structure
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('Error accessing payments table:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Payments table exists with columns:', Object.keys(data[0]));
    } else {
      console.log('⚠️ Payments table exists but is empty');
      
      // Try to insert a test record to see what columns are available
      const { data: insertData, error: insertError } = await supabase
        .from('payments')
        .insert({
          payment_number: 'TEST-001',
          customer_id: '00000000-0000-0000-0000-000000000000', // placeholder UUID
          amount: 100,
          payment_date: '2025-01-01',
          method: 'CASH',
          status: 'completed'
        })
        .select();
        
      if (insertError) {
        console.error('Insert test failed:', insertError);
        console.log('This tells us about the table structure and constraints');
      } else {
        console.log('✅ Test insert successful, columns:', Object.keys(insertData[0]));
        
        // Clean up test record
        await supabase
          .from('payments')
          .delete()
          .eq('payment_number', 'TEST-001');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkPaymentsTable();
