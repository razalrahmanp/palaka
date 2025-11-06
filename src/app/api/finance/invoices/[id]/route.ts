import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;

    console.log('🗑️ Deleting invoice:', invoiceId);

    // Check if invoice exists and get related data
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, order_id, total, paid_amount')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { success: false, error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice has payments
    if (invoice.paid_amount > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete invoice with payments. Please delete payments first.' },
        { status: 400 }
      );
    }

    // Delete related payments (if any)
    const { error: deletePaymentsError } = await supabase
      .from('payments')
      .delete()
      .eq('invoice_id', invoiceId);

    if (deletePaymentsError) {
      console.error('Error deleting payments:', deletePaymentsError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete related payments' },
        { status: 500 }
      );
    }

    // Delete related refunds (if any)
    const { error: deleteRefundsError } = await supabase
      .from('refunds')
      .delete()
      .eq('invoice_id', invoiceId);

    if (deleteRefundsError) {
      console.error('Error deleting refunds:', deleteRefundsError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete related refunds' },
        { status: 500 }
      );
    }

    // Delete return items related to this invoice's order
    if (invoice.order_id) {
      const { error: deleteReturnItemsError } = await supabase
        .from('return_items')
        .delete()
        .eq('order_id', invoice.order_id);

      if (deleteReturnItemsError) {
        console.error('Error deleting return items:', deleteReturnItemsError);
      }

      // Delete returns
      const { error: deleteReturnsError } = await supabase
        .from('returns')
        .delete()
        .eq('order_id', invoice.order_id);

      if (deleteReturnsError) {
        console.error('Error deleting returns:', deleteReturnsError);
      }
    }

    // Finally, delete the invoice
    const { error: deleteInvoiceError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (deleteInvoiceError) {
      console.error('Error deleting invoice:', deleteInvoiceError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete invoice' },
        { status: 500 }
      );
    }

    console.log('✅ Invoice deleted successfully:', invoiceId);

    const response = NextResponse.json({ success: true });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    return response;

  } catch (error) {
    console.error('Error in DELETE /api/finance/invoices/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
