import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

interface ReturnItem {
  sales_order_item_id: string;
  product_id?: string | null;
  custom_product_id?: string | null;
  quantity: number;
  unit_price: number;
  cost: number;
  is_custom_product: boolean;
  condition_notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      order_id, 
      items, 
      return_type, // 'return' or 'exchange'
      reason,
      sales_representative_id 
    }: {
      order_id: string;
      items: ReturnItem[];
      return_type: 'return' | 'exchange';
      reason: string;
      sales_representative_id?: string;
    } = body;

    // Start transaction
    const { data: returnRecord, error: returnError } = await supabase
      .from('returns')
      .insert({
        order_id,
        return_type,
        reason,
        sales_representative_id,
        status: 'pending',
        return_value: items.reduce((sum: number, item: ReturnItem) => sum + (item.unit_price * item.quantity), 0),
        cost_value: items.reduce((sum: number, item: ReturnItem) => sum + (item.cost * item.quantity), 0)
      })
      .select()
      .single();

    if (returnError) {
      throw returnError;
    }

    // Insert return items
    const returnItems = items.map((item: ReturnItem) => ({
      return_id: returnRecord.id,
      product_id: item.is_custom_product ? null : item.product_id,
      custom_product_id: item.is_custom_product ? item.custom_product_id : null,
      sales_order_item_id: item.sales_order_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      refund_amount: item.unit_price * item.quantity,
      is_custom_product: item.is_custom_product,
      condition_notes: item.condition_notes || '',
      resolution: return_type === 'exchange' ? 'replace' : 'refund'
    }));

    const { error: itemsError } = await supabase
      .from('return_items')
      .insert(returnItems);

    if (itemsError) {
      throw itemsError;
    }

    return NextResponse.json({ 
      success: true, 
      return_id: returnRecord.id,
      message: `${return_type === 'return' ? 'Return' : 'Exchange'} request created successfully` 
    });

  } catch (error) {
    console.error('Create return error:', error);
    return NextResponse.json(
      { error: 'Failed to process return request' },
      { status: 500 }
    );
  }
}