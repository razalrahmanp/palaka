import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log('🔍 Analyzing actual sales and payment data...');

    // Get all sales orders
    const { data: salesOrders, error: salesError } = await supabase
      .from('sales_orders')
      .select('id, total, final_price, status, date')
      .order('date', { ascending: false });

    if (salesError) {
      return NextResponse.json({ error: salesError.message }, { status: 500 });
    }

    // Get all payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, method, date, invoice_id')
      .order('date', { ascending: false });

    if (paymentsError) {
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    // Calculate totals
    const totalSalesRevenue = salesOrders?.reduce((sum, order) => sum + (order.final_price || order.total || 0), 0) || 0;
    const totalPaymentsReceived = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    
    // Get payment breakdown by method
    const paymentsByMethod = payments?.reduce((acc, payment) => {
      const method = payment.method || 'unknown';
      acc[method] = (acc[method] || 0) + (payment.amount || 0);
      return acc;
    }, {} as Record<string, number>) || {};

    // Calculate accounts receivable (unpaid orders)
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total, paid_amount, status');

    const accountsReceivable = invoices?.reduce((sum, invoice) => {
      const unpaid = (invoice.total || 0) - (invoice.paid_amount || 0);
      return sum + Math.max(0, unpaid);
    }, 0) || 0;

    return NextResponse.json({
      success: true,
      actualData: {
        totalSalesOrders: salesOrders?.length || 0,
        totalSalesRevenue,
        totalPayments: payments?.length || 0,
        totalPaymentsReceived,
        accountsReceivable,
        paymentsByMethod,
        salesOrdersBreakdown: {
          confirmed: salesOrders?.filter(o => o.status === 'confirmed').length || 0,
          pending: salesOrders?.filter(o => o.status === 'pending').length || 0,
          cancelled: salesOrders?.filter(o => o.status === 'cancelled').length || 0
        }
      },
      expectedChartBalances: {
        salesRevenue_4010: totalSalesRevenue,
        cash_1010: paymentsByMethod.cash || 0,
        card_1030: paymentsByMethod.card || 0,
        bankTransfer_1020: paymentsByMethod.bank_transfer || 0,
        upi_1025: paymentsByMethod.upi || 0,
        accountsReceivable_1200: accountsReceivable
      }
    });

  } catch (error) {
    console.error('❌ Analysis error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze sales and payment data',
      details: error 
    }, { status: 500 });
  }
}
