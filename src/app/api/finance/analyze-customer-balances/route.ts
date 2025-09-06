import { NextResponse } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST() {
  try {
    console.log('Analyzing customer ledger balance calculation...');

    // Get all sales orders
    const { data: salesOrders, error: soError } = await supabaseAdmin
      .from('sales_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (soError) {
      console.error('Error fetching sales orders:', soError);
      return NextResponse.json({ error: soError.message }, { status: 500 });
    }

    // Get all payments
    const { data: payments, error: payError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (payError) {
      console.error('Error fetching payments:', payError);
      return NextResponse.json({ error: payError.message }, { status: 500 });
    }

    // Get all customers
    const { data: customers, error: custError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('is_deleted', false)
      .order('name');

    if (custError) {
      console.error('Error fetching customers:', custError);
      return NextResponse.json({ error: custError.message }, { status: 500 });
    }

    // Simple analysis without complex typing
    const totalSalesOrders = salesOrders?.length || 0;
    const totalPayments = payments?.length || 0;
    const totalCustomers = customers?.length || 0;

    // Check payment linking
    const paymentsWithoutSO = payments?.filter((p: any) => !p.sales_order_id) || [];
    const paymentsWithSO = payments?.filter((p: any) => p.sales_order_id) || [];

    // Sample customer analysis
    const sampleCustomer = customers?.[0];
    let sampleAnalysis = null;

    if (sampleCustomer && salesOrders && payments) {
      const customerOrders = salesOrders.filter((order: any) => order.customer_id === sampleCustomer.id);
      const customerPayments = payments.filter((payment: any) => {
        const relatedOrder = salesOrders.find((order: any) => order.id === payment.sales_order_id);
        return relatedOrder?.customer_id === sampleCustomer.id;
      });

      const totalSales = customerOrders.reduce((sum: number, order: any) => sum + (order.final_price || 0), 0);
      const totalPaid = customerPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);

      sampleAnalysis = {
        customer_name: sampleCustomer.name,
        total_orders: customerOrders.length,
        total_sales: totalSales,
        payments_count: customerPayments.length,
        total_paid: totalPaid,
        balance_due: totalSales - totalPaid,
        has_orders_but_no_payments: customerOrders.length > 0 && customerPayments.length === 0
      };
    }

    return NextResponse.json({
      success: true,
      message: 'Customer ledger balance analysis completed',
      analysis: {
        totals: {
          sales_orders: totalSalesOrders,
          payments: totalPayments,
          customers: totalCustomers
        },
        payment_linking: {
          payments_without_sales_order: paymentsWithoutSO.length,
          payments_with_sales_order: paymentsWithSO.length,
          sample_unlinked_payment: paymentsWithoutSO[0] || null
        },
        sample_customer_analysis: sampleAnalysis,
        issues_identified: [
          "1. All customers with sales orders appear in ledger regardless of balance",
          "2. Need to check if payments are properly linked to customers via sales_order_id",
          "3. Consider adding filter to show only customers with outstanding balances",
          "4. Review payment-to-customer mapping logic"
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
