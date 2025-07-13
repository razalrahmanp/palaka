// app/api/products/[id]/route.ts
import { supabase } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  const updates = await req.json();
  const { error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error(`PUT /api/products/${id} error`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id');
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`DELETE /api/products/${id} error`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
