import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function POST(req: NextRequest) {
  const { delivery_id, type, url } = await req.json();
  const { data, error } = await supabase
    .from('delivery_proofs')
    .insert([{ delivery_id, type, url }])
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function GET(req: NextRequest) {
  const deliveryId = req.nextUrl.searchParams.get('delivery_id');
  if (!deliveryId) {
    return NextResponse.json({ error: 'Missing delivery_id' }, { status: 400 });
  }
  const { data, error } = await supabase
    .from('delivery_proofs')
    .select('*')
    .eq('delivery_id', deliveryId)
    .order('timestamp', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
