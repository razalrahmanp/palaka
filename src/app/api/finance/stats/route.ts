import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get sales orders
    const { data: salesOrders, error: ordersError } = await supabase
      .from('sales_orders')
      .select('id, final_price');

    if (ordersError) {
      console.error('Error fetching sales orders:', ordersError);
      return NextResponse.json({
        totalSalesRevenue: 0,
        totalPaymentsReceived: 0,
        totalOutstanding: 0,
        collectionRate: 0,
        fullyPaidOrders: 0,
        partialPaidOrders: 0,
        pendingPaymentOrders: 0,
        totalOrders: 0
      });
    }

    if (!salesOrders || salesOrders.length === 0) {
      return NextResponse.json({
        totalSalesRevenue: 0,
        totalPaymentsReceived: 0,
        totalOutstanding: 0,
        collectionRate: 0,
        fullyPaidOrders: 0,
        partialPaidOrders: 0,
        pendingPaymentOrders: 0,
        totalOrders: 0
      });
    }

    // Get all invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, sales_order_id, total');

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
    }

    // Get all payments - use TOTAL actual payments for accurate collected amount
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount');

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Calculate total collected amount from ALL payments (not filtered by sales orders)
    const totalPaymentsReceived = payments?.reduce((sum, payment) => 
      sum + (payment.amount || 0), 0) || 0;

    // Calculate total sales revenue and payment status metrics
    let totalSalesRevenue = 0;
    let fullyPaidOrders = 0;
    let partialPaidOrders = 0;
    let pendingPaymentOrders = 0;

    // For order-level payment status, we still need to check individual orders
    // But for total collected, we use ALL payments
    salesOrders.forEach(order => {
      const orderTotal = order.final_price || 0;
      totalSalesRevenue += orderTotal;
      
      // Find invoices for this order
      const orderInvoices = invoices?.filter(inv => inv.sales_order_id === order.id) || [];
      
      // For status determination, estimate payment based on invoice totals
      // (This is simplified since we're now using total payments for accuracy)
      let orderPaidAmount = 0;
      if (orderInvoices.length > 0) {
        const invoiceTotal = orderInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        orderPaidAmount = Math.min(orderTotal, invoiceTotal); // Simplified estimation
      }
      
      // Determine payment status (this is approximate, but total collected is accurate)
      if (orderPaidAmount === 0) {
        pendingPaymentOrders++;
      } else if (orderPaidAmount >= orderTotal) {
        fullyPaidOrders++;
      } else {
        partialPaidOrders++;
      }
    });

    const totalOutstanding = totalSalesRevenue - totalPaymentsReceived;
    const collectionRate = totalSalesRevenue > 0 
      ? (totalPaymentsReceived / totalSalesRevenue) * 100 
      : 0;

    return NextResponse.json({
      totalSalesRevenue,
      totalPaymentsReceived,
      totalOutstanding,
      collectionRate,
      fullyPaidOrders,
      partialPaidOrders,
      pendingPaymentOrders,
      totalOrders: salesOrders.length,
      success: true,
      message: `Processed ${salesOrders.length} sales orders`
    });

  } catch (error) {
    console.error('Error in finance stats API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch finance stats',
        details: error instanceof Error ? error.message : 'Unknown error',
        totalSalesRevenue: 0,
        totalPaymentsReceived: 0,
        totalOutstanding: 0,
        collectionRate: 0,
        fullyPaidOrders: 0,
        partialPaidOrders: 0,
        pendingPaymentOrders: 0,
        totalOrders: 0
      },
      { status: 500 }
    );
  }
}
