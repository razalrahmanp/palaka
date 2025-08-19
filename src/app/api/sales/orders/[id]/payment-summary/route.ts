// src/app/api/sales/orders/[id]/payment-summary/route.ts
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is awaited properly
    const { id: orderId } = await Promise.resolve(params);

    // Get payment summary from the view
    const { data: summary, error } = await supabase
      .from('sales_order_payment_summary')
      .select('*')
      .eq('sales_order_id', orderId)
      .single();

    if (error) {
      console.log('Payment summary error:', error);
      // If view doesn't exist or has issues, calculate manually
      
      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .select(`
          id,
          final_price,
          total_paid,
          payment_status,
          customers:customer_id(name)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        return NextResponse.json({ error: orderError.message }, { status: 500 });
      }

      // Get total payments
      const { data: payments, error: paymentsError } = await supabase
        .from('sales_order_payments')
        .select('amount')
        .eq('sales_order_id', orderId)
        .eq('status', 'completed');

      if (paymentsError) {
        return NextResponse.json({ error: paymentsError.message }, { status: 500 });
      }

      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const orderTotal = order.final_price || 0;
      const balanceDue = orderTotal - totalPaid;

      return NextResponse.json({
        sales_order_id: orderId,
        customer_name: order.customers?.[0]?.name || 'Unknown',
        order_total: orderTotal,
        total_paid: totalPaid,
        balance_due: balanceDue,
        payment_status: order.payment_status || 'pending',
        payment_count: payments?.length || 0
      });
    }

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Error fetching payment summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment summary' },
      { status: 500 }
    );
  }
}
