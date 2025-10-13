import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    console.log('🔍 Fetching customer transactions for:', customerId);

    // Fetch all customer-related data using the same approach as ledgers-summary API
    // Note: We fetch invoices only to get payment relationships, but don't include them in transactions
    const [salesOrders, invoices, payments, returns, refunds] = await Promise.all([
      supabaseAdmin
        .from('sales_orders')
        .select('id, customer_id, final_price, grand_total, created_at, status')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true }), // Oldest first for accounting
      supabaseAdmin
        .from('invoices')
        .select('id, customer_id, sales_order_id, total, paid_amount, created_at, status, customer_name')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true }), // Only for payment linking
      supabaseAdmin
        .from('payments')
        .select(`
          id,
          invoice_id,
          amount,
          payment_date,
          date,
          method,
          reference,
          description,
          created_at,
          invoices!inner(customer_id, total, customer_name)
        `)
        .eq('invoices.customer_id', customerId)
        .order('created_at', { ascending: true }), // Use created_at for more precise ordering
      supabaseAdmin
        .from('returns')
        .select(`
          id,
          order_id,
          return_value,
          return_type,
          status,
          reason,
          created_at,
          sales_orders!inner(customer_id)
        `)
        .eq('sales_orders.customer_id', customerId)
        .order('created_at', { ascending: true }), // Oldest first for accounting
      supabaseAdmin
        .from('invoice_refunds')
        .select(`
          id,
          invoice_id,
          refund_amount,
          refund_type,
          reason,
          status,
          created_at,
          processed_at,
          invoices!inner(customer_id)
        `)
        .eq('invoices.customer_id', customerId)
        .order('created_at', { ascending: true }) // Oldest first for accounting
    ]);

    console.log('📊 Customer transaction data:', {
      customerId,
      salesOrdersCount: salesOrders.data?.length || 0,
      invoicesCount: invoices.data?.length || 0, // Only for payment linking
      paymentsCount: payments.data?.length || 0,
      returnsCount: returns.data?.length || 0,
      refundsCount: refunds.data?.length || 0
    });

    // Transform the data for easier consumption
    // NOTE: We don't include invoices as separate transactions since they're generated from sales orders
    const transactions = {
      sales_orders: salesOrders.data?.map(order => ({
        id: order.id,
        type: 'Sales Order',
        date: order.created_at,
        amount: order.final_price || order.grand_total || 0,
        transaction_type: 'debit',
        description: `Sales Order #${order.id.slice(-8)}`,
        reference: order.id.slice(-8),
        status: order.status || 'pending'
      })) || [],
      
      payments: payments.data?.map(payment => ({
        id: payment.id,
        type: 'Payment',
        date: payment.created_at, // Use created_at for consistent chronological ordering
        amount: payment.amount || 0,
        transaction_type: 'credit',
        description: `Payment Received - ${payment.method || 'Payment'}`,
        reference: payment.reference || payment.id.slice(-8),
        status: 'completed',
        method: payment.method,
        invoice_id: payment.invoice_id,
        payment_date: payment.payment_date || payment.date // Keep original payment date for reference
      })) || [],
      
      returns: returns.data?.map(returnItem => ({
        id: returnItem.id,
        type: 'Sales Return',
        date: returnItem.created_at,
        amount: returnItem.return_value || 0,
        transaction_type: 'debit', // Sales returns reduce customer debt, so they appear as debit in customer ledger
        description: `Sales Return - ${returnItem.return_type || 'Product Return'}`,
        reference: returnItem.order_id?.slice(-8) || returnItem.id.slice(-8),
        status: returnItem.status || 'completed'
      })) || [],
      
      refunds: refunds.data?.map(refund => ({
        id: refund.id,
        type: 'Invoice Refund',
        date: refund.processed_at || refund.created_at,
        amount: refund.refund_amount || 0,
        transaction_type: 'credit',
        description: `Invoice Refund - ${refund.reason || 'Refund'}`,
        reference: refund.invoice_id?.slice(-8) || refund.id.slice(-8),
        status: refund.status || 'processed'
      })) || []
    };

    // Calculate totals (excluding invoices to avoid double counting)
    const totalDebit = [
      ...transactions.sales_orders,
      ...transactions.returns // Sales returns are now debits (increase customer obligation for return processing)
      // Note: Invoices are NOT included as they represent the same value as sales orders
    ].reduce((sum, txn) => sum + txn.amount, 0);

    const totalCredit = [
      ...transactions.payments,
      ...transactions.refunds // Only refunds are credits (actual settlement of returns)
    ].reduce((sum, txn) => sum + txn.amount, 0);

    const summary = {
      totalDebit,
      totalCredit,
      outstandingAmount: totalDebit - totalCredit,
      transactionCount: Object.values(transactions).reduce((sum, txns) => sum + txns.length, 0)
    };

    console.log('💰 Customer transaction summary:', summary);

    return NextResponse.json({
      success: true,
      customerId,
      transactions,
      summary
    });

  } catch (error) {
    console.error('❌ Error fetching customer transactions:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch customer transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}