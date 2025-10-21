import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET(request: Request) {
  try {    
    // Get date parameters from URL
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Default to today if no date range provided
    const today = new Date().toISOString().split('T')[0];
    const targetDate = startDate || today;
    const targetEndDate = endDate || today;
    
    console.log('💰 Money Flow API Date Range:', {
      startDate: targetDate,
      endDate: targetEndDate,
      isDateRange: startDate && endDate && startDate !== endDate
    });
    
    // Get sales orders that are due for payment in the date range or expected in the date range
    const { data: expectedOrders, error: expectedError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        original_price,
        created_at,
        status,
        customers(id, name)
      `)
      .gte('created_at', `${targetDate}T00:00:00`)
      .lte('created_at', `${targetEndDate}T23:59:59`)
      .order('created_at', { ascending: false });

    if (expectedError) {
      console.error('Error fetching expected orders:', expectedError);
    }

    // Get actual payments received in the date range
    const { data: todayPayments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_date,
        method,
        reference,
        invoice_id,
        invoices(
          id,
          sales_order_id,
          total
        )
      `)
      .gte('date', targetDate)
      .lte('date', targetEndDate)
      .order('payment_date', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Get pending invoices (overdue and due today) - Fix column names
    const { data: pendingInvoices, error: invoicesError } = await supabase
      .from('invoices')
      .select(`
        id,
        total,
        created_at,
        status,
        sales_order_id,
        paid_amount
      `)
      .in('status', ['unpaid', 'partial'])
      .order('created_at', { ascending: true })
      .limit(10);

    if (invoicesError) {
      console.error('Error fetching pending invoices:', invoicesError);
    }

    // Get customer names for pending invoices
    interface PendingInvoice {
      customer_name: string;
      amount: number;
      due_date: string;
      days_overdue: number;
    }
    
    let formattedPendingInvoices: PendingInvoice[] = [];
    if (pendingInvoices && pendingInvoices.length > 0) {
      const salesOrderIds = pendingInvoices.map(inv => inv.sales_order_id).filter(Boolean);
      
      const { data: salesOrdersWithCustomers } = await supabase
        .from('sales_orders')
        .select(`
          id,
          customers(name)
        `)
        .in('id', salesOrderIds);

      // Create lookup map
      const customerLookup = new Map<string, string>();
      salesOrdersWithCustomers?.forEach(order => {
        // Handle the customer data whether it's an array or object
        const customerData = order.customers;
        let customerName = 'Unknown Customer';
        
        if (customerData) {
          if (Array.isArray(customerData) && customerData.length > 0) {
            customerName = customerData[0].name || 'Unknown Customer';
          } else if (typeof customerData === 'object' && 'name' in customerData) {
            customerName = (customerData as { name: string }).name || 'Unknown Customer';
          }
        }
        
        customerLookup.set(order.id, customerName);
      });

      formattedPendingInvoices = pendingInvoices.map(invoice => {
        // Since we don't have due_date in schema, use created_at for calculation
        const createdDate = new Date(invoice.created_at);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          customer_name: customerLookup.get(invoice.sales_order_id) || 'Unknown Customer',
          amount: (invoice.total || 0) - (invoice.paid_amount || 0), // Outstanding amount
          due_date: invoice.created_at, // Using created_at as placeholder
          days_overdue: Math.max(0, daysDiff)
        };
      });
    }

    // Calculate totals
    const totalExpected = expectedOrders?.reduce((sum, order) => sum + (order.final_price || 0), 0) || 0;
    const totalCollected = todayPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const totalPending = pendingInvoices?.reduce((sum, invoice) => sum + ((invoice.total || 0) - (invoice.paid_amount || 0)), 0) || 0;
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    const moneyFlowData = {
      date: startDate && endDate && startDate !== endDate 
        ? `${targetDate} to ${targetEndDate}` 
        : targetDate,
      total_expected: totalExpected,
      collected: totalCollected,
      pending: totalPending,
      collection_rate: Math.round(collectionRate * 10) / 10,
      pending_invoices: formattedPendingInvoices,
      debug: {
        expected_orders_count: expectedOrders?.length || 0,
        payments_count: todayPayments?.length || 0,
        pending_invoices_count: pendingInvoices?.length || 0,
        sample_expected: expectedOrders?.slice(0, 2) || [],
        sample_payments: todayPayments?.slice(0, 2) || [],
        sample_pending: pendingInvoices?.slice(0, 3) || []
      }
    };

    console.log('💰 Money Flow Analysis:', {
      dateRange: `${targetDate} to ${targetEndDate}`,
      totalExpected: `₹${totalExpected.toLocaleString()}`,
      totalCollected: `₹${totalCollected.toLocaleString()}`,
      totalPending: `₹${totalPending.toLocaleString()}`,
      collectionRate: `${Math.round(collectionRate * 10) / 10}%`,
      expectedOrdersCount: expectedOrders?.length || 0,
      paymentsCount: todayPayments?.length || 0,
      pendingInvoicesCount: pendingInvoices?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: moneyFlowData
    });

  } catch (error) {
    console.error('Error fetching money flow data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch money flow data',
        data: null
      },
      { status: 500 }
    );
  }
}