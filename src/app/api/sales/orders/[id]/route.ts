import { supabase } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

interface OrderItemWithProducts {
  order_id: string;
  quantity: number;
  unit_price: number | null;
  product_id?: string | null;
  name?: string | null;
  supplier_name?: string | null;
  products?: {
    name: string;
    price: number;
    sku?: string;
    suppliers?: { name: string }[];
  } | {
    name: string;
    price: number;
    sku?: string;
    suppliers?: { name: string }[];
  }[] | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  try {
    // Fetch sales order with customer details
    const { data: orderData, error: orderError } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customers:customer_id (
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          pincode
        )
      `)
      .eq('id', id)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Fetch order items from sales_order_items table with product details including SKU
    const { data: itemsData, error: itemsError } = await supabase
      .from('sales_order_items')
      .select(`
        *,
        products:product_id(name, sku, price, suppliers(name))
      `)
      .eq('order_id', id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Try to get sales representative from quotes if quote_id exists
    let salesRepresentative = null;
    if (orderData.quote_id) {
      const { data: quoteData } = await supabase
        .from('quotes')
        .select(`
          sales_representative_id,
          users:sales_representative_id (
            id,
            name,
            email
          )
        `)
        .eq('id', orderData.quote_id)
        .single();
      
      salesRepresentative = quoteData?.users || null;
    }

    // Map items to include SKU from products relationship
    const mappedItems = (itemsData || []).map((item: OrderItemWithProducts) => ({
      ...item,
      sku: item.products 
        ? Array.isArray(item.products) 
          ? (item.products.length > 0 ? item.products[0].sku : null)
          : item.products.sku
        : null,
      name: item.name || (item.products 
        ? Array.isArray(item.products) 
          ? (item.products.length > 0 ? item.products[0].name : null)
          : item.products.name
        : null)
    }));

    const orderWithDetails = {
      ...orderData,
      items: mappedItems,
      customer: orderData.customers,
      sales_representative: salesRepresentative
    };

    return NextResponse.json(orderWithDetails);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  const body = await req.json();
  const { status, items } = body;

  if (!status || !items || !Array.isArray(items)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Fetch existing order for comparison
  const { data: existingOrder, error: fetchError } = await supabase
    .from('sales_orders')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching order:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const previousStatus = existingOrder?.status;

  // Recalculate total
  const total = items.reduce((sum: number, item: { unit_price: number; quantity: number }) => {
    return sum + (item.unit_price || 0) * (item.quantity || 0);
  }, 0);

  // Update sales_orders
  const { error: updateError } = await supabase
    .from('sales_orders')
    .update({ status, total })
    .eq('id', id);

  if (updateError) {
    console.error('Error updating sales order:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Delete old order_items
  const { error: deleteItemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', id);

  if (deleteItemsError) {
    console.error('Error deleting order items:', deleteItemsError);
    return NextResponse.json({ error: deleteItemsError.message }, { status: 500 });
  }

  // Insert new order_items
  const { error: insertItemsError } = await supabase
    .from('order_items')
    .insert(
      items.map((i: {
        product_id: string;
        quantity: number;
        unit_price: number;
      }) => ({
        order_id: id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }))
    );

  if (insertItemsError) {
    console.error('Error inserting order items:', insertItemsError);
    return NextResponse.json({ error: insertItemsError.message }, { status: 500 });
  }

  // Handle delivery creation
  if (status !== 'cancelled' && previousStatus !== status) {
    const { data: deliveryExists, error: deliveryFetchError } = await supabase
      .from('deliveries')
      .select('id')
      .eq('sales_order_id', id)
      .maybeSingle();

    if (deliveryFetchError) {
      console.error('Error checking delivery:', deliveryFetchError);
      // Not critical, don't block update
    }

    if (!deliveryExists) {
      const { error: createDeliveryError } = await supabase
        .from('deliveries')
        .insert([{
          sales_order_id: id,
          status: 'pending',
          created_at: new Date().toISOString(),
        }]);

      if (createDeliveryError) {
        console.error('Error creating delivery:', createDeliveryError);
        // Optional: return error or just log
      }
    }
  }

  return NextResponse.json({ success: true });
}
