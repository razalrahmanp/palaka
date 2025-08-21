import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET() {
  try {
    // Get sales orders that are ready for delivery but don't have deliveries yet
    const { data: readyOrders, error: readyError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        status,
        address,
        expected_delivery_date,
        final_price,
        notes,
        created_at,
        customers!inner(
          id,
          name,
          phone,
          email
        )
      `)
      .in('status', ['ready_for_delivery'])
      .order('expected_delivery_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (readyError) {
      console.error('Error fetching ready orders:', readyError);
      return NextResponse.json({ error: readyError.message }, { status: 500 });
    }

    // Get existing deliveries to filter out orders that already have deliveries
    const { data: existingDeliveries, error: deliveryError } = await supabase
      .from('deliveries')
      .select('sales_order_id');

    if (deliveryError) {
      console.error('Error fetching existing deliveries:', deliveryError);
      return NextResponse.json({ error: deliveryError.message }, { status: 500 });
    }

    // Filter out orders that already have deliveries
    const existingOrderIds = new Set(existingDeliveries?.map(d => d.sales_order_id) || []);
    const ordersReadyForDelivery = readyOrders?.filter(order => !existingOrderIds.has(order.id)) || [];

    return NextResponse.json({
      ready_for_delivery: ordersReadyForDelivery,
      count: ordersReadyForDelivery.length
    });

  } catch (error) {
    console.error('Unexpected error in ready-for-delivery API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
