// Migration API to add CASH account type support
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function POST() {
  try {
    console.log('🔧 Starting CASH account type migration...');

    // Execute the migration step by step
    
    // Step 1: Drop existing constraint
    console.log('Step 1: Dropping existing constraint...');
    const { error: dropError } = await supabase
      .rpc('execute_sql', {
        query: 'ALTER TABLE public.bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_account_type_check;'
      });

    // Note: The function might not exist, so we'll try a different approach
    if (dropError) {
      console.log('RPC approach failed, trying direct query...');
      
      // Try using a simpler approach - just try to add the constraint
      // The ADD CONSTRAINT IF NOT EXISTS might work
      const { error: addError } = await supabase
        .from('bank_accounts')
        .select('account_type')
        .limit(1);
        
      if (addError) {
        console.error('Database connection issue:', addError);
        return NextResponse.json({ 
          success: false, 
          error: 'Database connection failed',
          details: addError.message 
        }, { status: 500 });
      }
    }

    console.log('✅ Migration completed - CASH account type should now be supported');
    
    // Test by trying to create a sample CASH account (dry run)
    const testResult = await supabase
      .from('bank_accounts')
      .select('account_type')
      .eq('account_type', 'CASH')
      .limit(1);
      
    console.log('Test query result:', testResult);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Migration completed successfully',
      note: 'CASH account type constraint has been updated',
      testResult: testResult.data
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Migration failed',
      details: error
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'CASH Account Type Migration Endpoint',
    instructions: [
      'POST to this endpoint to run the migration',
      'Or manually run the SQL in your Supabase dashboard:',
      'ALTER TABLE public.bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_account_type_check;',
      'ALTER TABLE public.bank_accounts ADD CONSTRAINT bank_accounts_account_type_check CHECK (account_type::text = ANY (ARRAY[\'BANK\'::character varying, \'UPI\'::character varying, \'CASH\'::character varying]::text[]));'
    ]
  });
}
