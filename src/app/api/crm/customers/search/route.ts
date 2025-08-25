import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return NextResponse.json({
        customers: [],
        count: 0
      });
    }

    // Search customers by name, phone, or email
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Customer search error:', error);
      return NextResponse.json(
        { error: 'Failed to search customers' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      customers: customers || [],
      count: customers?.length || 0
    });

  } catch (error) {
    console.error('Customer search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
