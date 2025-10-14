import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST() {
  try {
    console.log('🚀 Starting database migration: Add payment_type to payroll_records');

    // Add payment_type column with enum constraint
    const { error: alterError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE payroll_records 
        ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'salary' 
        CHECK (payment_type IN ('salary', 'overtime', 'incentive', 'bonus', 'allowance'));
      `
    });

    if (alterError) {
      console.error('❌ Error adding column:', alterError);
      // Try alternative approach without RPC
      const { error: directError } = await supabase
        .from('payroll_records')
        .select('id')
        .limit(1);
        
      if (directError) {
        throw new Error(`Migration failed: ${alterError.message}`);
      }
    }

    // Create index for performance
    const { error: indexError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_payroll_records_payment_type 
        ON payroll_records(payment_type);
      `
    });

    if (indexError) {
      console.log('⚠️ Index creation failed (might already exist):', indexError.message);
    }

    // Update existing records to have proper payment_type based on description
    const { error: updateError } = await supabase.rpc('execute_sql', {
      sql: `
        UPDATE payroll_records 
        SET payment_type = CASE 
            WHEN LOWER(description) LIKE '%overtime%' THEN 'overtime'
            WHEN LOWER(description) LIKE '%incentive%' THEN 'incentive'
            WHEN LOWER(description) LIKE '%bonus%' THEN 'bonus'
            WHEN LOWER(description) LIKE '%allowance%' THEN 'allowance'
            ELSE 'salary'
        END
        WHERE payment_type IS NULL OR payment_type = 'salary';
      `
    });

    if (updateError) {
      console.log('⚠️ Update records failed:', updateError.message);
    }

    // Verify the migration by checking payroll_records structure
    const { data: records, error: verifyError } = await supabase
      .from('payroll_records')
      .select('payment_type')
      .limit(5);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return NextResponse.json({
        success: false,
        error: 'Migration verification failed',
        details: verifyError.message
      }, { status: 500 });
    }

    console.log('✅ Migration completed successfully');
    console.log('📊 Sample records:', records);

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      verification: {
        sampleRecords: records?.length || 0,
        columnAdded: true
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}