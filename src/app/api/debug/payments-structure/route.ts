import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    console.log('🔍 Checking payments table structure...');

    // Check table structure
    const { data: structure, error: structureError } = await supabase
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'payments' 
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      });

    if (structureError) {
      console.error('❌ Error checking structure:', structureError);
      
      // Fallback: Try to get column info using DESCRIBE equivalent
      const { data: columns, error: columnsError } = await supabase
        .from('payments')
        .select('*')
        .limit(1);

      if (columnsError) {
        console.error('❌ Error getting columns:', columnsError);
        return NextResponse.json({ error: columnsError.message }, { status: 500 });
      }

      // Get the keys from the first row to understand structure
      const sampleStructure = columns.length > 0 ? Object.keys(columns[0]) : [];
      
      return NextResponse.json({ 
        method: 'fallback',
        columns: sampleStructure,
        sample_data: columns[0] || null,
        note: 'Used fallback method due to RPC error'
      });
    }

    // Get sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from('payments')
      .select('*')
      .limit(3);

    if (sampleError) {
      console.error('❌ Error getting sample data:', sampleError);
    }

    console.log('✅ Successfully retrieved payments structure');

    return NextResponse.json({
      method: 'direct',
      structure: structure || [],
      sample_data: sampleData || [],
      sample_count: sampleData?.length || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
