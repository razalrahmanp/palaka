import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get quote with customer details
    const { data: quote, error: quoteError } = await supabase
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
      .eq('id', id)
      .single();

    if (quoteError) {
      console.error('Failed to fetch quote:', quoteError);
      return NextResponse.json(
        { error: 'Quote not found', details: quoteError.message },
        { status: 404 }
      );
    }

    // Get user info separately if created_by exists
    let userData = null;
    if (quote.created_by) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('id', quote.created_by)
        .single();

      if (!userError && user) {
        userData = user;
      }
    }

    // Get quote custom items if any
    const { data: customItems, error: customItemsError } = await supabase
      .from('quote_custom_items')
      .select('*')
      .eq('quote_id', id);

    if (customItemsError) {
      console.error('Failed to fetch custom items:', customItemsError);
    }

    // Parse items from quote.items (if it's JSON) and add custom items
    let items = [];
    
    // Add regular items from quote.items JSON field
    if (quote.items) {
      try {
        const regularItems = typeof quote.items === 'string' 
          ? JSON.parse(quote.items) 
          : quote.items;
        items = Array.isArray(regularItems) ? regularItems : [];
      } catch (error) {
        console.error('Failed to parse quote items:', error);
        items = [];
      }
    }

    // Add custom items
    if (customItems && customItems.length > 0) {
      const customItemsFormatted = customItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        description: item.specifications || '',
        category: 'Custom',
        cost: item.unit_price * 0.7, // Assume 30% margin
        isCustom: true,
        custom_instructions: item.custom_instructions,
        materials: item.materials,
        dimensions: item.dimensions,
        finish: item.finish,
        color: item.color
      }));
      items = [...items, ...customItemsFormatted];
    }

    const responseData = {
      ...quote,
      items,
      users: userData
    };

    return NextResponse.json({ quote: responseData }, { status: 200 });

  } catch (error) {
    console.error('Quote fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
