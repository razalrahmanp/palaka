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

  // 1) Insert the quote with all columns
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .insert({
      customer_id: body.customer_id,
      customer: body.customer,
      items: body.items,
      total_price: body.total_price,
      original_price: body.original_price || body.total_price,
      final_price: body.final_price || body.total_price,
      discount_amount: body.discount_amount || 0,
      freight_charges: body.freight_charges || 0,
      notes: body.notes || '',
      status: body.status || 'draft',
      created_by: body.created_by,
      emi_enabled: body.emi_enabled || false,
      emi_plan: body.emi_plan || null,
      emi_monthly: body.emi_monthly || 0,
      bajaj_finance_amount: body.bajaj_finance_amount || 0,
      bajaj_approved_amount: body.bajaj_approved_amount || null
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
  price?: number;
  unit_price?: number;
  total_price?: number;
  configuration?: Record<string, unknown>;
  product_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  image_url?: string;
  discount_percentage?: number;
  base_product_name?: string;
  specifications?: string;
  materials?: Record<string, unknown>[];
  dimensions?: string;
  finish?: string;
  color?: string;
  custom_instructions?: string;
  estimated_delivery_days?: number;
  complexity_level?: string;
  status?: string;
  notes?: string;
}

const customLines: CustomLineItem[] = Array.isArray(body.items)
  ? body.items.filter((i: CustomLineItem) => i.type === "custom" || i.type === "new")
  : [];

if (customLines.length) {

const insertPayload = customLines.map((i: CustomLineItem) => ({
  quote_id: quote.id,
  name: i.name,
  quantity: i.quantity,
  unit_price: i.unit_price || i.price || 0,
  configuration: i.configuration || {},
  product_id: i.product_id && i.product_id.trim() !== "" ? i.product_id : null,
  supplier_id: i.supplier_id || null,
  supplier_name: i.supplier_name || null,
  image_url: i.image_url || null,
  discount_percentage: i.discount_percentage || 0,
  item_type: 'new', // Changed from 'custom' to 'new'
  base_product_name: i.base_product_name || i.name,
  specifications: i.specifications || null,
  materials: i.materials || [],
  dimensions: i.dimensions || null,
  finish: i.finish || null,
  color: i.color || null,
  custom_instructions: i.custom_instructions || null,
  estimated_delivery_days: i.estimated_delivery_days || 30,
  complexity_level: i.complexity_level || 'medium',
  status: i.status || 'pending',
  notes: i.notes || null,
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
