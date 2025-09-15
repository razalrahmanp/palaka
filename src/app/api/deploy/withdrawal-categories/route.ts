import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'deploy_categories') {
      // Create withdrawal_categories table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS withdrawal_categories (
          id SERIAL PRIMARY KEY,
          category_name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          chart_account_code VARCHAR(20) DEFAULT '3200',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: createTableQuery
      });

      if (createError) {
        console.error('Error creating withdrawal_categories table:', createError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create table',
          details: createError 
        }, { status: 500 });
      }

      // Insert default categories
      const categories = [
        { name: 'Personal Withdrawals', description: 'Regular personal withdrawals by partners', code: '3200' },
        { name: 'Home Expenses', description: 'Personal home and family expenses', code: '3210' },
        { name: 'Vehicle Expenses (Personal)', description: 'Personal vehicle fuel, maintenance', code: '3220' },
        { name: 'Personal Purchases', description: 'Personal shopping and purchases', code: '3230' },
        { name: 'Family Support', description: 'Support to family members', code: '3240' },
        { name: 'Personal Healthcare', description: 'Personal medical and healthcare expenses', code: '3250' },
        { name: 'Personal Education', description: 'Personal education and training expenses', code: '3260' },
        { name: 'Personal Travel', description: 'Personal vacation and travel expenses', code: '3270' },
        { name: 'Gold/Jewelry', description: 'Personal gold and jewelry purchases', code: '3280' },
        { name: 'Loans/Advances', description: 'Personal loans and advances taken', code: '3290' },
        { name: 'Emergency Withdrawals', description: 'Emergency personal withdrawals', code: '3295' }
      ];

      const insertResults = [];
      for (const category of categories) {
        const { error } = await supabase
          .from('withdrawal_categories')
          .upsert({
            category_name: category.name,
            description: category.description,
            chart_account_code: category.code
          }, {
            onConflict: 'category_name',
            ignoreDuplicates: true
          })
          .select();

        if (error) {
          console.error(`Error inserting category ${category.name}:`, error);
        } else {
          insertResults.push({ category: category.name, success: true });
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Withdrawal categories deployed successfully',
        results: insertResults,
        table_created: true
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Unknown action' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error in withdrawal categories deployment:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}