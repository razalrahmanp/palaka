import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Insert quote items
    const { data: quoteItems, error } = await supabase
      .from('quote_items')
      .insert(items.map(item => ({
        ...item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })))
      .select();

    if (error) {
      console.error('Failed to create quote items:', error);
      return NextResponse.json(
        { error: 'Failed to create quote items', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ items: quoteItems }, { status: 201 });

  } catch (error) {
    console.error('Quote items creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
