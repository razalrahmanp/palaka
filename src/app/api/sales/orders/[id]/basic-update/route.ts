import { supabase } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    
    // Only allow updating these specific fields for basic order edit
    const allowedFields = ['status', 'expected_delivery_date', 'delivery_floor', 'first_floor_awareness', 'notes'];
    const updateData: Record<string, string | boolean | null> = {};
    
    // Filter and validate the fields
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }
    
    // Validate that at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields provided for update. Allowed fields: ' + allowedFields.join(', ')
      }, { status: 400 });
    }

    console.log(`Updating sales order ${id} with basic data:`, updateData);

    // Update the sales order with only the allowed fields
    const { data, error } = await supabase
      .from('sales_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Sales order ${id} basic update successful`);

    return NextResponse.json({
      message: 'Order updated successfully',
      order: data
    });

  } catch (error) {
    console.error('Basic order update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
