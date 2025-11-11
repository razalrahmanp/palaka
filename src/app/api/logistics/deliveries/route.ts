
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET(req: NextRequest) {
  const driverId = req.nextUrl.searchParams.get('driver_id');

  let builder = supabase
    .from('deliveries')
    .select(`
      *,
      driver: users!deliveries_driver_id_fkey (
        id,
        email
      ),
      collected_by_user: users!deliveries_collected_by_fkey (
        id,
        email
      ),
      sales_order: sales_orders (
        id,
        status,
        address,
        expected_delivery_date,
        customer: customers (
          id,
          name
        )
      )
    `)
    .order('updated_at', { ascending: false });

  if (driverId) builder = builder.eq('driver_id', driverId);

  const { data, error } = await builder;
  if (error) {
    console.error('GET /deliveries error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

/**
 * POST /api/logistics/deliveries
 * body: { sales_order_id, driver_id, tracking_number }
 */
export async function POST(req: NextRequest) {
  const { sales_order_id, driver_id, tracking_number } = await req.json()
  const { data, error } = await supabase
    .from('deliveries')
    .insert([{ sales_order_id, driver_id, status: 'pending', tracking_number }])
    .select()
    .single()

  if (error) {
    console.error('POST /deliveries error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

/**
 * PUT /api/logistics/deliveries
 * body: { id, status }
 */
export async function PUT(req: NextRequest) {
  const { id, status } = await req.json()
  const { data, error } = await supabase
    .from('deliveries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('PUT /deliveries error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

/**
 * DELETE /api/logistics/deliveries?id={id}
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }
  const { error } = await supabase.from('deliveries').delete().eq('id', id)
  if (error) {
    console.error('DELETE /deliveries error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
