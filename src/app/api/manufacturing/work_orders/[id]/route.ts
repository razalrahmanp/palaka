// app/api/manufacturing/work_orders/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.pathname.split('/').pop();
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const id = req.nextUrl.pathname.split('/').pop();
  const b = await req.json();
  for (const k of Object.keys(b)) if (b[k] === '') b[k] = null;

  const { data, error } = await supabase
    .from('work_orders')
    .update({
      bom_id:      b.bom_id,
      product_id:  b.product_id,
      quantity:    b.quantity,
      status:      b.status,
      progress:    b.progress,
      stage:       b.stage,
      order_id:    b.order_id,
      assigned_to: b.assigned_to,
      start_date:  b.start_date,
      due_date:    b.due_date,
      notes:       b.notes,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('work_orders PUT error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.pathname.split('/').pop();
  const { error } = await supabase
    .from('work_orders')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('work_orders DELETE error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
