import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('custom_products')
      .select(`
        id,
        name,
        description,
        price,
        cost_price,
        sku,
        supplier_name,
        supplier_id,
        config_schema,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
    }

    const { data: customProducts, error } = await query.limit(limit);

    if (error) {
      console.error('Custom products fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch custom products' },
        { status: 500 }
      );
    }

    return NextResponse.json({ products: customProducts || [] });
  } catch (error) {
    console.error('Custom products API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const {
      name,
      description,
      price,
      cost_price,
      sku,
      supplier_name,
      supplier_id,
      config_schema
    } = data;

    // Validate required fields
    if (!name || !price) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    const { data: customProduct, error } = await supabase
      .from('custom_products')
      .insert([{
        name,
        description,
        price,
        cost_price: cost_price || null, // Include cost_price, will trigger auto-calculation if null
        sku,
        supplier_name,
        supplier_id,
        config_schema: config_schema || {}
      }])
      .select()
      .single();

    if (error) {
      console.error('Custom product creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create custom product' },
        { status: 500 }
      );
    }

    return NextResponse.json(customProduct, { status: 201 });
  } catch (error) {
    console.error('Custom product creation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
