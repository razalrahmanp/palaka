import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    console.log('Testing database connection...');
    
    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlStart: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'undefined'
    });

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Missing environment variables',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey
        }
      }, { status: 500 });
    }

    // Test simple query
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Database test failed:', error);
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: error.message,
        hint: error.hint,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Database connection working',
      recordsFound: data?.length || 0
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({ 
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
