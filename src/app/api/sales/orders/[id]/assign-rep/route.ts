import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { sales_rep_id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    if (!sales_rep_id) {
      return NextResponse.json({ error: 'Sales representative ID is required' }, { status: 400 });
    }

    // Verify that the sales rep exists
    const { data: salesRep, error: repError } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', sales_rep_id)
      .single();

    if (repError || !salesRep) {
      return NextResponse.json({ error: 'Invalid sales representative' }, { status: 400 });
    }

    // Update the sales order
    const { error: updateError } = await supabase
      .from('sales_orders')
      .update({ created_by: sales_rep_id })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating sales order:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sales representative updated to ${salesRep.name}` 
    });

  } catch (error) {
    console.error('Error assigning sales representative:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
