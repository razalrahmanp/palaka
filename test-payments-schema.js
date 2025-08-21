const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ndrzgxifrboajiziicmt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPaymentsTable() {
  console.log('Checking payments table structure...');
  
  // Get table columns
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error accessing payments table:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Payments table columns:', Object.keys(data[0]));
  } else {
    console.log('No data in payments table, checking with describe');
    
    // Try a raw SQL query to describe the table
    const { data: describeData, error: describeError } = await supabase.rpc('describe_table', { table_name: 'payments' });
    
    if (describeError) {
      console.error('Error describing table:', describeError);
    } else {
      console.log('Table description:', describeData);
    }
  }
  
  // Also try to see if there's any specific information schema query we can use
  console.log('\nTrying to query information_schema...');
  const { data: schemaData, error: schemaError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_name', 'payments')
    .eq('table_schema', 'public');
    
  if (schemaError) {
    console.error('Error querying information_schema:', schemaError);
  } else {
    console.log('Schema columns:', schemaData);
  }
}

checkPaymentsTable().catch(console.error);
