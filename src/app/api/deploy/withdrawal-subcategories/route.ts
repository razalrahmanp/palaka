import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'deploy_subcategories') {
      // Create withdrawal_subcategories table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS withdrawal_subcategories (
          id SERIAL PRIMARY KEY,
          category_id INTEGER REFERENCES withdrawal_categories(id) ON DELETE CASCADE,
          subcategory_name VARCHAR(255) NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(category_id, subcategory_name)
        );
      `;

      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: createTableQuery
      });

      if (createError) {
        console.error('Error creating withdrawal_subcategories table:', createError);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create table',
          details: createError 
        }, { status: 500 });
      }

      // Insert default subcategories
      const subcategories = [
        // Personal Withdrawals subcategories (category_id: 1)
        { category_id: 1, name: 'Monthly Salary', description: 'Regular monthly personal salary' },
        { category_id: 1, name: 'Bonus Withdrawal', description: 'Performance or year-end bonus' },
        { category_id: 1, name: 'Profit Distribution', description: 'Share of business profits' },

        // Home Expenses subcategories (category_id: 2)
        { category_id: 2, name: 'Groceries', description: 'Household groceries and food' },
        { category_id: 2, name: 'Utilities', description: 'Home electricity, water, gas bills' },
        { category_id: 2, name: 'House Rent/EMI', description: 'House rent or loan EMI' },
        { category_id: 2, name: 'House Maintenance', description: 'Home repairs and maintenance' },
        { category_id: 2, name: 'Servant Salary', description: 'Domestic help salary' },

        // Vehicle Expenses subcategories (category_id: 3)
        { category_id: 3, name: 'Fuel', description: 'Personal vehicle fuel' },
        { category_id: 3, name: 'Insurance', description: 'Personal vehicle insurance' },
        { category_id: 3, name: 'Maintenance', description: 'Personal vehicle servicing' },
        { category_id: 3, name: 'Registration', description: 'Vehicle registration and taxes' },

        // Personal Purchases subcategories (category_id: 4)
        { category_id: 4, name: 'Clothing', description: 'Personal clothing and accessories' },
        { category_id: 4, name: 'Electronics', description: 'Personal electronics and gadgets' },
        { category_id: 4, name: 'Gifts', description: 'Personal gifts and celebrations' },
        { category_id: 4, name: 'Entertainment', description: 'Personal entertainment expenses' },

        // Family Support subcategories (category_id: 5)
        { category_id: 5, name: 'Parents Support', description: 'Financial support to parents' },
        { category_id: 5, name: 'Siblings Support', description: 'Financial support to siblings' },
        { category_id: 5, name: 'Children Education', description: 'Children school and college fees' },
        { category_id: 5, name: 'Family Medical', description: 'Family medical expenses' },

        // Loans/Advances subcategories (category_id: 10)
        { category_id: 10, name: 'Main Loan', description: 'Main personal loan payments' },
        { category_id: 10, name: 'Small Loan', description: 'Small personal loan payments' },
        { category_id: 10, name: 'Advance to Family', description: 'Advances given to family' },
        { category_id: 10, name: 'Personal Emergency Loan', description: 'Emergency personal loans' }
      ];

      const insertResults = [];
      for (const subcategory of subcategories) {
        const { error } = await supabase
          .from('withdrawal_subcategories')
          .upsert({
            category_id: subcategory.category_id,
            subcategory_name: subcategory.name,
            description: subcategory.description
          }, {
            onConflict: 'category_id,subcategory_name',
            ignoreDuplicates: true
          })
          .select();

        if (error) {
          console.error(`Error inserting subcategory ${subcategory.name}:`, error);
          insertResults.push({ subcategory: subcategory.name, success: false, error: error.message });
        } else {
          insertResults.push({ subcategory: subcategory.name, success: true });
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Withdrawal subcategories deployed successfully',
        results: insertResults,
        table_created: true
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Unknown action' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error in withdrawal subcategories deployment:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}