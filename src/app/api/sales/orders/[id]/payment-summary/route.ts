// src/app/api/sales/orders/[id]/payment-summary/route.ts
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure params is awaited properly
    const { id: orderId } = await params;

    // Get order details using actual database structure
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        customer_id
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Get customer name separately
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', order.customer_id)
      .single();

    // Get all invoices for this sales order
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id')
      .eq('sales_order_id', orderId);
      
    if (invoiceError) {
      console.error('Error fetching invoices:', invoiceError);
      return NextResponse.json({ error: invoiceError.message }, { status: 500 });
    }

    let totalPaid = 0;
    let paymentCount = 0;

    if (invoices && invoices.length > 0) {
      const invoiceIds = invoices.map(inv => inv.id);
      
      // Get payments for these invoices
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount')
        .in('invoice_id', invoiceIds);
        
      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError);
      } else {
        totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
        paymentCount = payments?.length || 0;
      }
    }

    const orderTotal = order.final_price || 0;
    const balanceDue = orderTotal - totalPaid;

    return NextResponse.json({
      sales_order_id: orderId,
      customer_name: customer?.name || 'Unknown',
      order_total: orderTotal,
      total_paid: totalPaid,
      balance_due: balanceDue,
      payment_status: totalPaid >= orderTotal ? 'paid' : totalPaid > 0 ? 'partial' : 'pending',
      payment_count: paymentCount
    });

  } catch (error) {
    console.error('Error fetching payment summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment summary' },
      { status: 500 }
    );
  }
}
