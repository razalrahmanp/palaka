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
      .select('sales_order_id, paid_amount, total');

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
    }

    // Calculate metrics
    let totalSalesRevenue = 0;
    let totalPaymentsReceived = 0;
    let fullyPaidOrders = 0;
    let partialPaidOrders = 0;
    let pendingPaymentOrders = 0;

    salesOrders.forEach(order => {
      const orderTotal = order.final_price || 0;
      totalSalesRevenue += orderTotal;
      
      // Find invoices for this order
      const orderInvoices = invoices?.filter(inv => inv.sales_order_id === order.id) || [];
      let orderPaidAmount = 0;
      
      if (orderInvoices.length > 0) {
        orderPaidAmount = orderInvoices.reduce((sum, invoice) => 
          sum + (invoice.paid_amount || 0), 0);
      }
      
      totalPaymentsReceived += orderPaidAmount;
      
      // Determine payment status
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
