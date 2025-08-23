// app/api/sales/quotes/route.ts
import { supabase } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase GET quotes error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 1) Insert the quote
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      customer_id:  body.customer_id,
      customer:     body.customer,
      items:        body.items,
      total_price:  body.total_price,
      status:       body.status,
      created_by:   body.created_by
    })
    .select()
    .single();

  if (quoteError || !quote) {
    console.error('Error inserting quote:', quoteError);
    return NextResponse.json({ error: quoteError?.message }, { status: 500 });
  }

  // 2) Insert any custom‐configured lines into quote_custom_items
  //    We assume items with a non‐empty `configuration` field are "custom".
interface CustomLineItem {
  type: string;
  name: string;
  quantity: number;
  price: number;
  configuration?: Record<string, unknown>;
  product_id?: string;
  supplier_id?: string;
  supplier_name?: string;
}

const customLines: CustomLineItem[] = Array.isArray(body.items)
  ? body.items.filter((i: CustomLineItem) => i.type === "custom")
  : [];

if (customLines.length) {

const insertPayload = customLines.map((i: CustomLineItem) => ({
  quote_id: quote.id,
  name: i.name,
  quantity: i.quantity,
  unit_price: i.price,
  configuration: i.configuration || {},
  product_id: i.product_id && i.product_id.trim() !== "" ? i.product_id : null,
  supplier_id: i.supplier_id || null,
  supplier_name: i.supplier_name || null,
}));



  const { error: customError } = await supabase
    .from("quote_custom_items")
    .insert(insertPayload);

  if (customError) {
    console.error("Error inserting quote_custom_items:", customError);
  }
}
  // 3) Return the newly created quote back to the client
  return NextResponse.json(quote);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...updateData } = body;

  const { data, error } = await supabase
    .from('quotes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Supabase PUT quote error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
