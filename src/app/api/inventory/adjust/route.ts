// src/app/api/inventory/adjust/route.ts
import { supabase } from '@/lib/supabaseAdmin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const { product_id, type, quantity } = body;

  if (!product_id || typeof quantity !== 'number' || !['increase', 'decrease'].includes(type)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Determine the adjustment value (positive for increase, negative for decrease)
  const adjustment_quantity = type === 'increase' ? quantity : -quantity;

  // Call the atomic RPC
  const { data: newQuantity, error } = await supabase.rpc('adjust_inventory', {
    product_id_in: product_id,
    adjustment_quantity: adjustment_quantity
  });

  if (error) {
    console.error('Error in RPC adjust_inventory:', error);
    // Check if the error is the one we raised for a missing record
    if (error.message.includes('Inventory record not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, newQuantity });
}