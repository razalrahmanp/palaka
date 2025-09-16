import { NextRequest, NextResponse } from 'next/server';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClientComponentClient();
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const offset = (page - 1) * limit;

    // Build the query
    let query = supabase
      .from('returns')
      .select(`
        *,
        sales_orders:order_id (
          id,
          customer_id,
          grand_total,
          customers:customer_id (
            name,
            email,
            phone
          )
        ),
        return_items (
          *,
          sales_order_items:sales_order_item_id (
            name,
            quantity,
            unit_price
          )
        ),
        created_by_user:created_by (
          name,
          email
        ),
        sales_rep:sales_representative_id (
          name,
          email
        ),
        approved_by_user:approved_by (
          name,
          email
        )
      `)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (search) {
      query = query.or(`reason.ilike.%${search}%,inspection_notes.ilike.%${search}%`);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    if (type) {
      query = query.eq('return_type', type);
    }
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: returns, error } = await query;

    if (error) {
      console.error('Error fetching returns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch returns', details: error.message },
        { status: 500 }
      );
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('returns')
      .select('*', { count: 'exact', head: true });

    // Apply same filters for count
    if (search) {
      countQuery = countQuery.or(`reason.ilike.%${search}%,inspection_notes.ilike.%${search}%`);
    }
    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    if (type) {
      countQuery = countQuery.eq('return_type', type);
    }
    if (dateFrom) {
      countQuery = countQuery.gte('created_at', dateFrom);
    }
    if (dateTo) {
      countQuery = countQuery.lte('created_at', dateTo);
    }

    const { count } = await countQuery;
    const totalPages = Math.ceil((count || 0) / limit);

    // Transform the data to include customer information
    const transformedReturns = returns?.map(returnItem => ({
      ...returnItem,
      customer_name: returnItem.sales_orders?.customers?.name || 'Unknown Customer',
      customer_email: returnItem.sales_orders?.customers?.email || '',
      customer_phone: returnItem.sales_orders?.customers?.phone || '',
      order_number: `SO-${returnItem.sales_orders?.id?.slice(-8) || 'UNKNOWN'}`, // Generate order number from ID since order_number column doesn't exist
      order_total: returnItem.sales_orders?.grand_total || 0,
      created_by_name: returnItem.created_by_user?.name || 'Unknown',
      sales_rep_name: returnItem.sales_rep?.name || 'Unassigned',
      approved_by_name: returnItem.approved_by_user?.name || '',
      items_count: returnItem.return_items?.length || 0
    })) || [];

    return NextResponse.json({
      returns: transformedReturns,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        search,
        status,
        type,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Unexpected error in returns API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}