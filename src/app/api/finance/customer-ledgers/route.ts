import { NextResponse, NextRequest } from 'next/server';
import { supabase as supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hideZeroBalances = searchParams.get('hide_zero_balances') === 'true';
    const search = searchParams.get('search') || '';

    console.log('Fetching filtered customer ledgers...', { hideZeroBalances, search });

    // Get all sales orders
    const { data: allSalesOrders } = await supabaseAdmin
      .from('sales_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (!allSalesOrders || allSalesOrders.length === 0) {
      return NextResponse.json({ data: [], stats: { total: 0, outstanding: 0, settled: 0 } });
    }

    // Get unique customer IDs
    const customerIds = [...new Set(allSalesOrders.map(order => order.customer_id))].filter(Boolean);

    if (customerIds.length === 0) {
      return NextResponse.json({ data: [], stats: { total: 0, outstanding: 0, settled: 0 } });
    }

    // Get customer details
    let customerQuery = supabaseAdmin
      .from('customers')
      .select('*')
      .in('id', customerIds)
      .eq('is_deleted', false);

    if (search) {
      customerQuery = customerQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: customers } = await customerQuery;

    if (!customers || customers.length === 0) {
      return NextResponse.json({ data: [], stats: { total: 0, outstanding: 0, settled: 0 } });
    }

    // Get all payments - use the same approach as the working payments API
    const { data: allPayments } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        invoices!inner (
          id,
          sales_order_id,
          customer_id,
          customer_name
        )
      `);

    const customerLedgers = [];
    let outstandingCount = 0;
    let settledCount = 0;

    // Process each customer
    for (const customer of customers) {
      const customerOrders = allSalesOrders.filter(order => order.customer_id === customer.id);
      
      // Filter payments using the customer_id from the invoice
      const customerPayments = allPayments?.filter(payment => {
        return payment.invoices?.customer_id === customer.id;
      }) || [];

      const totalSales = customerOrders.reduce((sum, order) => sum + (order.final_price || 0), 0);
      const totalPaid = customerPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      const totalWaived = customerOrders.reduce((sum, order) => sum + (order.waived_amount || 0), 0);
      const balanceDue = totalSales - totalPaid - totalWaived;

      // Skip customers with zero balance if hideZeroBalances is true
      // Use a larger tolerance for practical purposes (up to 10 paise difference)
      const isSettled = Math.abs(balanceDue) < 0.10;
      if (hideZeroBalances && isSettled) {
        continue;
      }

      // Get last transaction date (include both order dates and payment dates)
      const allDates = [
        ...customerOrders.map(o => o.date || o.created_at),
        ...customerPayments.map(p => p.date || p.payment_date || p.created_at)
      ].filter(Boolean).sort().reverse();

      const customerLedger = {
        id: customer.id,
        name: customer.name,
        type: 'customer',
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        total_amount: totalSales,
        paid_amount: totalPaid,
        waived_amount: totalWaived,
        balance_due: balanceDue,
        transaction_count: customerOrders.length,
        total_transactions: customerOrders.length,
        payments_count: customerPayments.length,
        last_transaction: allDates[0] || customer.created_at,
        last_transaction_date: allDates[0] || customer.created_at,
        status: isSettled ? 'settled' : 'outstanding'
      };

      customerLedgers.push(customerLedger);

      // Count statistics (use the same tolerance)
      if (isSettled) {
        settledCount++;
      } else {
        outstandingCount++;
      }
    }

    // Sort by balance due (highest first)
    customerLedgers.sort((a, b) => b.balance_due - a.balance_due);

    const stats = {
      total: customerLedgers.length,
      outstanding: outstandingCount,
      settled: settledCount,
      total_outstanding_amount: customerLedgers.reduce((sum, c) => sum + (c.balance_due > 0 ? c.balance_due : 0), 0),
      total_settled_amount: customerLedgers.reduce((sum, c) => sum + (c.balance_due <= 0 ? Math.abs(c.total_amount) : 0), 0)
    };

    return NextResponse.json({
      success: true,
      data: customerLedgers,
      stats,
      filters_applied: {
        hide_zero_balances: hideZeroBalances,
        search: search || null
      }
    });

  } catch (error) {
    console.error('Error fetching filtered customer ledgers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer ledgers' },
      { status: 500 }
    );
  }
}
