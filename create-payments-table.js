const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPaymentsTable() {
  try {
    console.log('Creating sales_order_payments table and view...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'sales_order_payments.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error executing SQL:', error);
      
      // Try alternative approach - execute individual statements
      console.log('Trying to execute statements individually...');
      
      // Split SQL into individual statements and execute them
      const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        const trimmedStatement = statement.trim();
        if (trimmedStatement) {
          console.log('Executing:', trimmedStatement.substring(0, 100) + '...');
          const { error: stmtError } = await supabase.rpc('exec_sql', { 
            sql_query: trimmedStatement + ';' 
          });
          if (stmtError) {
            console.error('Error in statement:', stmtError);
          }
        }
      }
    } else {
      console.log('✅ Successfully created sales_order_payments table and view');
    }
    
    // Test if table exists now
    const { data: testData, error: testError } = await supabase
      .from('sales_order_payments')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.error('❌ Table still not accessible:', testError);
    } else {
      console.log('✅ Table is accessible');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createPaymentsTable();
