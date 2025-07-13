import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  // CORRECTED: Destructure 'quantity' instead of 'qty'
  const { product_id, type, quantity } = body;

  // CORRECTED: Validate 'quantity' and ensure it's a number
  if (!product_id || typeof quantity !== 'number' || !['increase','decrease'].includes(type)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Fetch current inventory
  const { data: inventoryRows, error: fetchError } = await supabase
    .from('inventory_items')
    .select('id, quantity')
    .eq('product_id', product_id)
    .limit(1);

  if (fetchError) {
    console.error('Error fetching inventory:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const record = inventoryRows?.[0];
  if (!record) {
    return NextResponse.json(
      { error: 'Inventory record not found' },
      { status: 404 }
    );
  }

  // Calculate new quantity
  const newQuantity =
    type === 'decrease'
      ? Math.max(0, record.quantity - quantity)
      : record.quantity + quantity;

  // Update inventory
  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({ quantity: newQuantity })
    .eq('id', record.id);

  if (updateError) {
    console.error('Error updating inventory:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, newQuantity });
}