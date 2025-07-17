// src/app/api/sales/orders/route.ts
import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

type OrderRow = {
  id: string;
  quote_id?: string | null;
  customer_id: string;
  status: string;
  created_at: string;
  customer: { name: string } | null;
};

type ItemRow = {
  order_id: string;
  quantity: number;
  unit_price: number | null;
  product: {
    name: string;
    price: number;
    supplier: { name: string } | null;
  } | null;
  custom_product: {
    name: string;
    price: number;
    supplier: { name: string } | null;
  } | null;
};

type OrderItemInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export async function GET() {
  const { data: ordersRaw, error: ordersError } = await supabase
    .from("sales_orders")
    .select(`
      id,
      quote_id,
      customer_id,
      status,
      created_at,
      customers(name)
    `);

  if (ordersError) {
    return NextResponse.json({ error: ordersError.message }, { status: 500 });
  }

  const orders: OrderRow[] = (ordersRaw ?? []).map((o: any) => ({
    id: o.id,
    quote_id: o.quote_id,
    customer_id: o.customer_id,
    status: o.status,
    created_at: o.created_at,
    customer: o.customers ? { name: o.customers.name } : null,
  }));

  const { data: itemsRaw, error: itemsError } = await supabase
    .from("sales_order_items")
    .select(`
      order_id,
      quantity,
      unit_price,
      product:products(name, price, suppliers(name)),
      custom_product:custom_products(name, price, suppliers(name))
    `);

  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  const items: ItemRow[] = (itemsRaw ?? []).map((i: any) => ({
    order_id: i.order_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
    product: i.product ? {
      name: i.product.name,
      price: i.product.price,
      supplier: i.product.suppliers || null,
    } : null,
    custom_product: i.custom_product ? {
      name: i.custom_product.name,
      price: i.custom_product.price,
      supplier: i.custom_product.suppliers || null,
    } : null,
  }));

  const grouped = orders.map((order) => {
    const orderItems = items
      .filter((i) => i.order_id === order.id)
      .map((i) => ({
        name: i.product?.name ?? i.custom_product?.name ?? "(no name)",
        quantity: i.quantity ?? 0,
        price: i.unit_price ?? i.product?.price ?? i.custom_product?.price ?? 0,
        supplier_name:
          i.product?.supplier?.name ??
          i.custom_product?.supplier?.name ??
          "N/A",
      }));

    const total = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    return {
      id: order.id,
      quote_id: order.quote_id ?? null,
      customer: order.customer?.name ?? "(unknown)",
      date: order.created_at?.split("T")[0],
      status: order.status,
      supplier_name: orderItems[0]?.supplier_name ?? "N/A",
      total,
      items: orderItems,
    };
  });

  return NextResponse.json(grouped);
}


export async function POST(req: Request) {
  const body = await req.json();
  const {
    quote_id,
    customer_id,
    date,
    status,
    created_by,
    items,
  }: {
    quote_id?: string;
    customer_id: string;
    date?: string;
    status: string;
    created_by: string;
    items: {
      product_id?: string;
      custom_product_id?: string;
      quantity: number;
      unit_price: number;
      supplier_name?: string;
    }[];
  } = body;

  if (!customer_id || !Array.isArray(items) || items.length === 0 || !created_by) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: orderData, error: orderError } = await supabase
    .from("sales_orders")
    .insert([
      {
        quote_id: quote_id ?? null,
        customer_id,
        status,
        created_by,
        created_at: date ?? new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (orderError) {
    console.error("Error creating sales order:", orderError);
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  const orderId = orderData.id;

  const itemsToInsert = items.map((item) => ({
    order_id: orderId,
    product_id: item.product_id ?? null,
    custom_product_id: item.custom_product_id ?? null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    supplier_name: item.supplier_name ?? null,
  }));

  const { error: itemsError } = await supabase
    .from("sales_order_items")
    .insert(itemsToInsert);

  if (itemsError) {
    console.error("Error inserting order items:", itemsError);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, order_id: orderId });
}

export async function PUT(req: Request) {
  const body = await req.json();
  const {
    id,
    customer_id,
    status,
    delivery_address,
    delivery_date,
  }: {
    id: string;
    customer_id: string;
    status: string;
    items: OrderItemInput[];
    delivery_address: string;
    delivery_date?: string;
  } = body;

  if (!id || !customer_id) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: existingOrder, error: fetchError } = await supabase
    .from("sales_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) {
    console.error("Error fetching existing order:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const previousStatus = existingOrder?.status;

  const { error: updateOrderError } = await supabase
    .from("sales_orders")
    .update({
      customer_id,
      status,
      address: delivery_address,
    })
    .eq("id", id);

  if (updateOrderError) {
    console.error("Error updating sales order:", updateOrderError);
    return NextResponse.json({ error: updateOrderError.message }, { status: 500 });
  }

  if (status !== "cancelled" && previousStatus !== status) {
    const { data: deliveryExists, error: checkDeliveryError } = await supabase
      .from("deliveries")
      .select("id")
      .eq("sales_order_id", id)
      .maybeSingle();

    if (checkDeliveryError) {
      console.error("Error checking deliveries:", checkDeliveryError);
    }

    if (!deliveryExists) {
      const { error: createDeliveryError } = await supabase
        .from("deliveries")
        .insert([
          {
            sales_order_id: id,
            status: "pending",
            created_at: new Date().toISOString(),
            time_slot: delivery_date ?? null,
          },
        ]);

      if (createDeliveryError) {
        console.error("Error creating delivery record:", createDeliveryError);
      }
    }
  }

  if (status === "shipped" && previousStatus !== "shipped") {
  // Check if an invoice already exists
  const { data: existingInvoice, error: invoiceCheckError } = await supabase
    .from("invoices")
    .select("id")
    .eq("sales_order_id", id)
    .maybeSingle();

  if (invoiceCheckError) {
    console.error("Error checking invoice:", invoiceCheckError);
    return NextResponse.json({ error: invoiceCheckError.message }, { status: 500 });
  }

  if (!existingInvoice) {
    // Get order items
    const { data: orderItems, error: itemsError } = await supabase
      .from("sales_order_items")
      .select("quantity, unit_price")
      .eq("order_id", id);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const total =
      orderItems?.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0) ?? 0;

    // Get customer name
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("name")
      .eq("id", customer_id)
      .single();

    if (customerError) {
      console.error("Error fetching customer name:", customerError);
      return NextResponse.json({ error: customerError.message }, { status: 500 });
    }

    const customer_name = customerData?.name ?? "(Unknown)";

    // Insert invoice
    const { error: invoiceInsertError } = await supabase.from("invoices").insert([
      {
        sales_order_id: id,
        total,
        status: "unpaid",
        created_at: new Date().toISOString(),
        customer_id,
        paid_amount: 0,
        customer_name,
      },
    ]);

    if (invoiceInsertError) {
      console.error("Error creating invoice:", invoiceInsertError);
      return NextResponse.json({ error: invoiceInsertError.message }, { status: 500 });
    }
  }
}


  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { id }: { id: string } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { error: deleteItemsError } = await supabase
    .from("sales_order_items")
    .delete()
    .eq("order_id", id);

  if (deleteItemsError) {
    console.error("Error deleting order items:", deleteItemsError);
    return NextResponse.json({ error: deleteItemsError.message }, { status: 500 });
  }

  const { error: deleteOrderError } = await supabase
    .from("sales_orders")
    .delete()
    .eq("id", id);

  if (deleteOrderError) {
    console.error("Error deleting sales order:", deleteOrderError);
    return NextResponse.json({ error: deleteOrderError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
