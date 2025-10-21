import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const supplier = searchParams.get('supplier') || '';
    
    // If page parameter is provided, use pagination format
    const usePagination = pageParam !== null;
    const page = parseInt(pageParam || '1');
    const offset = (page - 1) * limit;

    // Build the query
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        price,
        category,
        description,
        supplier_id,
        image_url,
        created_at,
        updated_at,
        cost
      `, { count: usePagination ? 'exact' : undefined });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (supplier) {
      query = query.eq('supplier_id', supplier);
    }

    // Apply pagination and ordering
    if (usePagination) {
      const { data: products, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return NextResponse.json({
        products: products || [],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    } else {
      // For backward compatibility, return simple array when no pagination
      const { data: products, error } = await query
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(products || []);
    }
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data: product, error } = await supabase
      .from('products')
      .insert([body])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('POST /api/products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
