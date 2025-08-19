// scripts/init-sales-payments.ts
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

config();

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  try {
    console.log('Initializing sales payment system...');

    // Read SQL file
    const sqlPath = path.join(__dirname, '../database/sales_order_payments.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into statements
    const statements = sql
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/--.*$/gm, '')          // Remove single-line comments
      .split(';')
      .filter(stmt => stmt.trim().length > 0);

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;

      try {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: stmt });

        if (error) {
          console.log(`Error in statement ${i + 1}: ${error.message}`);
          console.log('Statement:', stmt);
        } else {
          console.log(`Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.error(`Error executing statement ${i + 1}:`, err);
        console.log('Statement:', stmt);
      }
    }

    console.log('Sales payment system initialization complete!');
  } catch (error) {
    console.error('Error initializing sales payment system:', error);
  }
}

// Execute the script
main();
