import { supabase } from '@/lib/supabaseClient';

export async function migrateOwnerDrawings() {
  try {
    console.log('Starting Owner Drawings migration...');

    // Step 1: Add columns to expenses table
    console.log('Adding columns to expenses table...');
    
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'EXPENSE';`
    });
    if (error1) console.log('Column account_type:', error1.message);

    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS chart_account_id UUID;`
    });
    if (error2) console.log('Column chart_account_id:', error2.message);

    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_owner_drawing BOOLEAN DEFAULT FALSE;`
    });
    if (error3) console.log('Column is_owner_drawing:', error3.message);

    // Step 2: Create owner drawing categories table
    console.log('Creating owner_drawing_categories table...');
    const { error: error4 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS owner_drawing_categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_name TEXT NOT NULL UNIQUE,
          description TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_by UUID,
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now()
        );
      `
    });
    if (error4) console.log('Table creation:', error4.message);

    // Step 3: Insert default categories
    console.log('Inserting default categories...');
    const defaultCategories = [
      { name: 'Home Expenses', desc: 'Household and personal expenses' },
      { name: 'Personal Withdrawals', desc: 'Owner personal withdrawals' },
      { name: 'Gold Load', desc: 'Gold purchases and investments' },
      { name: 'Servant Salary', desc: 'Domestic help payments' },
      { name: 'Asharaf Withdrawal', desc: 'Asharaf personal withdrawals' },
      { name: 'Shahid Withdrawal', desc: 'Shahid personal withdrawals' },
      { name: 'Main Loan', desc: 'Main loan payments' },
      { name: 'Small Loan', desc: 'Small loan payments' }
    ];

    for (const cat of defaultCategories) {
      const { error } = await supabase
        .from('owner_drawing_categories')
        .upsert({ 
          category_name: cat.name, 
          description: cat.desc 
        }, { 
          onConflict: 'category_name',
          ignoreDuplicates: true 
        });
      if (error) console.log(`Category ${cat.name}:`, error.message);
    }

    console.log('✅ Migration completed successfully!');
    return { success: true };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}