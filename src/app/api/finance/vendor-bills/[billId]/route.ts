import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabasePool';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { billId: string } }
) {
  try {
    const { billId } = params;

    if (!billId) {
      return NextResponse.json(
        { success: false, error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    // First check if the bill exists
    const { data: existingBill, error: fetchError } = await supabaseAdmin
      .from('vendor_bills')
      .select('id, bill_number')
      .eq('id', billId)
      .single();

    if (fetchError || !existingBill) {
      return NextResponse.json(
        { success: false, error: 'Vendor bill not found' },
        { status: 404 }
      );
    }

    // Delete associated line items first (due to foreign key constraints)
    const { error: lineItemsError } = await supabaseAdmin
      .from('vendor_bill_line_items')
      .delete()
      .eq('vendor_bill_id', billId);

    if (lineItemsError) {
      console.error('Error deleting line items:', lineItemsError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete bill line items' },
        { status: 500 }
      );
    }

    // Delete the vendor bill
    const { error: deleteError } = await supabaseAdmin
      .from('vendor_bills')
      .delete()
      .eq('id', billId);

    if (deleteError) {
      console.error('Error deleting vendor bill:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete vendor bill' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Vendor bill ${existingBill.bill_number} deleted successfully`
    });

  } catch (error) {
    console.error('Error in DELETE /api/finance/vendor-bills/[billId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { billId: string } }
) {
  try {
    const { billId } = params;

    if (!billId) {
      return NextResponse.json(
        { success: false, error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    // Fetch the vendor bill with line items
    const { data: bill, error } = await supabaseAdmin
      .from('vendor_bills')
      .select(`
        *,
        vendor_bill_line_items (
          id,
          product_id,
          product_name,
          description,
          quantity,
          unit_price,
          line_total,
          purchase_order_id
        ),
        vendors!vendor_bills_supplier_id_fkey (
          id,
          name
        )
      `)
      .eq('id', billId)
      .single();

    if (error || !bill) {
      return NextResponse.json(
        { success: false, error: 'Vendor bill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: bill
    });

  } catch (error) {
    console.error('Error in GET /api/finance/vendor-bills/[billId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}