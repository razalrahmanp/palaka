import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const quoteData = await request.json();

    // Insert quote record
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        ...quoteData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Failed to create quote:', quoteError);
      return NextResponse.json(
        { error: 'Failed to create quote', details: quoteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(quote, { status: 201 });

  } catch (error) {
    console.error('Quote creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const customer_id = searchParams.get('customer_id');
    const created_by = searchParams.get('created_by');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('quotes')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone,
          address
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      const statusArray = status.split(',').map(s => s.trim());
      query = query.in('status', statusArray);
    }
    
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }
    
    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    const { data: quotesRaw, error } = await query;

    if (error) {
      console.error('Failed to fetch quotes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch quotes', details: error.message },
        { status: 500 }
      );
    }

    // Get unique user IDs from created_by
    const userIds = [...new Set((quotesRaw ?? []).map(q => q.created_by).filter(Boolean))];
    
    // Fetch users separately if there are any
    let usersRaw: Array<{ id: string; name: string; email: string }> = [];
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);

      if (usersError) {
        console.error('Failed to fetch users:', usersError);
      } else {
        usersRaw = users || [];
      }
    }

    // Create user map for efficient lookup
    const userMap = new Map(usersRaw.map(user => [user.id, user]));

    // Combine data
    const quotes = (quotesRaw ?? []).map(quote => ({
      ...quote,
      users: quote.created_by ? userMap.get(quote.created_by) : null
    }));

    return NextResponse.json({ quotes }, { status: 200 });

  } catch (error) {
    console.error('Quotes fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
