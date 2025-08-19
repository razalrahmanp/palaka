// src/app/api/finance/sales-payment-summary/route.ts
import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Try to get data from the view first
    const { data: payments, error } = await supabase
      .from('sales_order_payment_summary')
      .select('*')
      .order('balance_due', { ascending: false });

    let paymentData = payments;

    // If view doesn't exist, calculate manually
    if (error) {
      console.log('View not available, calculating manually:', error);
      
      const { data: orders, error: ordersError } = await supabase
        .from('sales_orders')
        .select(`
          id,
          final_price,
          total_paid,
          payment_status,
          customer_id,
          customers:customer_id(name)
        `);

      if (ordersError) {
        return NextResponse.json({ error: ordersError.message }, { status: 500 });
      }

      // Get all payments for calculation
      const { data: allPayments, error: paymentsError } = await supabase
        .from('sales_order_payments')
        .select('sales_order_id, amount')
        .eq('status', 'completed');

      if (paymentsError) {
        console.log('Payments error:', paymentsError);
      }

      // Calculate payment summaries manually
      paymentData = orders?.map(order => {
        const orderPayments = allPayments?.filter(p => p.sales_order_id === order.id) || [];
        const totalPaid = orderPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const orderTotal = order.final_price || 0;
        const balanceDue = orderTotal - totalPaid;

        const customer = Array.isArray(order.customers) ? order.customers[0] : order.customers;

        return {
          sales_order_id: order.id,
          customer_name: customer?.name || 'Unknown',
          order_total: orderTotal,
          total_paid: totalPaid,
          balance_due: balanceDue,
          payment_status: order.payment_status || 'pending',
          payment_count: orderPayments.length,
          last_payment_date: null,
          invoice_number: null,
          invoice_status: null
        };
      }) || [];
    }

    // Ensure paymentData is not null
    const safePaymentData = paymentData || [];

    // Calculate metrics
    const metrics = {
      totalRevenue: safePaymentData.reduce((sum, p) => sum + (p.order_total || 0), 0),
      totalPaid: safePaymentData.reduce((sum, p) => sum + (p.total_paid || 0), 0),
      totalOutstanding: safePaymentData.reduce((sum, p) => sum + (p.balance_due || 0), 0),
      totalOrders: safePaymentData.length,
      paidOrders: safePaymentData.filter(p => p.payment_status === 'fully_paid').length,
      pendingOrders: safePaymentData.filter(p => p.payment_status === 'pending').length,
      overdueOrders: safePaymentData.filter(p => p.balance_due > 0 && p.payment_status !== 'fully_paid').length,
      averageOrderValue: safePaymentData.length > 0 ? safePaymentData.reduce((sum, p) => sum + (p.order_total || 0), 0) / safePaymentData.length : 0,
      collectionRate: safePaymentData.reduce((sum, p) => sum + (p.order_total || 0), 0) > 0 
        ? (safePaymentData.reduce((sum, p) => sum + (p.total_paid || 0), 0) / safePaymentData.reduce((sum, p) => sum + (p.order_total || 0), 0)) * 100 
        : 0
    };

    return NextResponse.json({
      payments: safePaymentData,
      metrics
    });

  } catch (error) {
    console.error('Error fetching sales payment summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales payment summary' },
      { status: 500 }
    );
  }
}
