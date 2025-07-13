import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

type PurchaseOrderPayload = {
  supplier_id: string;
  product_id?: string;
  quantity: number;
  status: 'pending' | 'approved' | 'received';
  is_custom: boolean;
  custom_type: string | null;
  materials: string[] | null;
  description: string | null;
  images: string[] | null;
  created_by: string | null;
  total: number | null;
};

export async function GET() {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier: suppliers(id,name),
      product: products(id,name),
      images: purchase_order_images(url)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  let total: number | null = null;

  // If not custom and product_id exists, fetch price
  if (!body.is_custom && body.product_id) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("price")
      .eq("id", body.product_id)
      .single();

    if (productError) {
      console.error(productError);
      return NextResponse.json({ error: "Error fetching product price" }, { status: 500 });
    }

    if (product?.price && body.quantity) {
      total = Number(product.price) * Number(body.quantity);
    }
  }

  const insertPayload: PurchaseOrderPayload = {
    supplier_id: body.supplier_id,
    quantity: body.quantity,
    status: body.status,
    is_custom: Boolean(body.is_custom),
    custom_type: body.custom_type ?? null,
    materials: body.materials ?? null,
    description: body.description ?? null,
    images: body.images ?? null,
    created_by: body.created_by ?? null,
    total, // <-- Save computed total
  };

  if (body.product_id) {
    insertPayload.product_id = body.product_id;
  }

  const { data, error } = await supabase
    .from("purchase_orders")
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}


export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const updatePayload: Partial<PurchaseOrderPayload> = {
    quantity: updates.quantity,
    status: updates.status,
    is_custom: updates.is_custom ?? false,
    custom_type: updates.custom_type ?? null,
    materials: updates.materials ?? null,
    description: updates.description ?? null,
    images: updates.images ?? null,
  };

  if (updates.product_id) {
    updatePayload.product_id = updates.product_id;
  }

  // If not custom and product_id exists, recompute total
  let total: number | null = null;
  if (!updates.is_custom && updates.product_id && updates.quantity) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("price")
      .eq("id", updates.product_id)
      .single();

    if (productError) {
      console.error(productError);
      return NextResponse.json({ error: "Error fetching product price" }, { status: 500 });
    }

    if (product?.price) {
      total = Number(product.price) * Number(updates.quantity);
      updatePayload.total = total;
    }
  } else {
    // If custom or missing info, reset total to null
    updatePayload.total = null;
  }

  const { data, error } = await supabase
    .from("purchase_orders")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}


export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
