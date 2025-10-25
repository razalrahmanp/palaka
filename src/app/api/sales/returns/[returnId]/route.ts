import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { returnId: string } }
) {
  try {
    const { returnId } = params;

    if (!returnId) {
      return NextResponse.json(
        { success: false, error: 'Return ID is required' },
        { status: 400 }
      );
    }

    // First check if the return exists
    const { data: existingReturn, error: fetchError } = await supabase
      .from('returns')
      .select('id, order_id, status, return_type')
      .eq('id', returnId)
      .single();

    if (fetchError || !existingReturn) {
      return NextResponse.json(
        { success: false, error: 'Return not found' },
        { status: 404 }
      );
    }

    // Check if return can be deleted (only allow deletion of pending/draft returns)
    if (existingReturn.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete completed returns. Contact administrator for assistance.' },
        { status: 400 }
      );
    }

    // Delete associated return items first (due to foreign key constraints)
    const { error: returnItemsError } = await supabase
      .from('return_items')
      .delete()
      .eq('return_id', returnId);

    if (returnItemsError) {
      console.error('Error deleting return items:', returnItemsError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete return items' },
        { status: 500 }
      );
    }

    // Delete any associated refunds that might be linked to this return
    const { error: refundsError } = await supabase
      .from('refunds')
      .delete()
      .eq('return_id', returnId);

    if (refundsError) {
      console.error('Error deleting associated refunds:', refundsError);
      // Don't fail the operation if refund deletion fails
      // as there might not be any refunds associated
    }

    // Delete the return record
    const { error: deleteError } = await supabase
      .from('returns')
      .delete()
      .eq('id', returnId);

    if (deleteError) {
      console.error('Error deleting return:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete return' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Return ${existingReturn.return_type} deleted successfully`
    });

  } catch (error) {
    console.error('Error in DELETE /api/sales/returns/[returnId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { returnId: string } }
) {
  try {
    const { returnId } = params;

    if (!returnId) {
      return NextResponse.json(
        { success: false, error: 'Return ID is required' },
        { status: 400 }
      );
    }

    // Fetch the return with associated items
    const { data: returnData, error } = await supabase
      .from('returns')
      .select(`
        *,
        return_items (
          id,
          sales_order_item_id,
          quantity,
          refund_amount,
          status,
          condition_notes,
          unit_price,
          sales_order_items (
            name,
            products (sku)
          )
        )
      `)
      .eq('id', returnId)
      .single();

    if (error || !returnData) {
      return NextResponse.json(
        { success: false, error: 'Return not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: returnData
    });

  } catch (error) {
    console.error('Error in GET /api/sales/returns/[returnId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}