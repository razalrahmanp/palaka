// app/api/manufacturing/work_orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET() {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  // nullify empty strings
  for (const k of Object.keys(b)) if (b[k] === '') b[k] = null;

  const { data, error } = await supabase
    .from('work_orders')
    .insert([{
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
      created_by:  b.created_by,
    }])
    .select()
    .single();

  if (error) {
    console.error('work_orders POST error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
  export async function PUT(req: NextRequest) {
    const b = await req.json();
    // nullify empty strings
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
      .eq('id', b.id)
      .select()
      .single();

    if (error) {
      console.error('work_orders PUT error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 200 });
  }

  export async function DELETE(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const { error } = await supabase
      .from('work_orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('work_orders DELETE error', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
  }
 