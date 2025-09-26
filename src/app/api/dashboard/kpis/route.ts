import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  
  try {
    // Set up date filter (defaults to current month if not provided)
    let dateFilter: { startDate: string; endDate: string };
    if (startDate && endDate) {
      dateFilter = {
        startDate,
        endDate
      };
    } else {
      // Default to current month if no dates provided
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      dateFilter = {
        startDate: monthStart,
        endDate: monthEnd
      };
    }

    // Fetch sales orders with items for profit calculation
    let salesOrdersQuery = supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        created_at,
        customer_id,
        sales_order_items(
          quantity,
          final_price,
          product_id,
          custom_product_id,
          cost,
          products(cost),
          custom_products(cost_price)
        )
      `);

    if (dateFilter.startDate && dateFilter.endDate) {
      salesOrdersQuery = salesOrdersQuery
        .gte('created_at', dateFilter.startDate)
        .lte('created_at', dateFilter.endDate + 'T23:59:59.999Z');
    }

    // Fetch customers for new customer calculation
    const customersQuery = supabase
      .from('customers')
      .select('id, created_at')
      .gte('created_at', dateFilter.startDate)
      .lte('created_at', dateFilter.endDate + 'T23:59:59.999Z');

    // Fetch date-filtered revenue from sales orders (same as finance API)
    const revenueQuery = supabase
      .from('sales_orders')
      .select('grand_total')
      .in('status', ['confirmed', 'delivered', 'ready_for_delivery'])
      .gte('created_at', dateFilter.startDate)
      .lte('created_at', dateFilter.endDate + 'T23:59:59.999Z');

    const [
      salesOrdersResult,
      customersResult,
      revenueResult,
      customPendingResult,
      lowStockResult,
      openPOsResult,
      onTimeDeliveryResult
    ] = await Promise.all([
      // Sales orders for profit calculation
      salesOrdersQuery,

      // New customers for customer metrics
      customersQuery,

      // Date-filtered revenue from payments
      revenueQuery,

      // Custom Orders Pending from view (not date-dependent)
      supabase
        .from('view_custom_orders_pending')
        .select('*')
        .single(),

      // Low Stock Count from view (not date-dependent)
      supabase
        .from('view_low_stock_items')
        .select('*')
        .single(),

      // Open Purchase Orders from view (not date-dependent)
      supabase
        .from('view_open_purchase_orders')
        .select('*')
        .single(),

      // On-time Delivery from view
      supabase
        .from('view_on_time_delivery_pct_7d')
        .select('*')
        .single()
    ]);

    // Calculate revenue from sales orders (same as finance API)
    const totalRevenue = revenueResult.data?.reduce((sum, order) => sum + (order.grand_total || 0), 0) || 0;

    // Fetch expenses to calculate net profit (like finance overview)
    const [
      expenseResult,
      vendorPaymentResult,
      withdrawalResult
    ] = await Promise.all([
      // Regular expenses
      supabase
        .from('expenses')
        .select('amount')
        .gte('created_at', dateFilter.startDate)
        .lte('created_at', dateFilter.endDate + 'T23:59:59.999Z'),

      // Vendor payment expenses  
      supabase
        .from('vendor_payment_history')
        .select('amount')
        .gte('created_at', dateFilter.startDate)
        .lte('created_at', dateFilter.endDate + 'T23:59:59.999Z'),

      // Withdrawal expenses
      supabase
        .from('withdrawals')
        .select('amount')
        .gte('created_at', dateFilter.startDate)
        .lte('created_at', dateFilter.endDate + 'T23:59:59.999Z')
    ]);

    // Calculate gross profit from sales orders
    let grossProfit = 0;
    let orderCount = 0;
    const uniqueCustomers = new Set();

    salesOrdersResult.data?.forEach(order => {
      orderCount++;
      if (order.customer_id) {
        uniqueCustomers.add(order.customer_id);
      }

      // Calculate profit from order items
      order.sales_order_items?.forEach(item => {
        const itemRevenue = (item.final_price || 0) * item.quantity;
        let itemCost = 0;

        // Calculate cost based on product type
        if (item.product_id && item.products) {
          // Regular product
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          itemCost = (product?.cost || 0) * item.quantity;
        } else if (item.custom_product_id && item.custom_products) {
          // Custom product
          const customProduct = Array.isArray(item.custom_products) ? item.custom_products[0] : item.custom_products;
          itemCost = (customProduct?.cost_price || 0) * item.quantity;
        } else {
          // Fallback to item cost field
          itemCost = (item.cost || 0) * item.quantity;
        }

        grossProfit += (itemRevenue - itemCost);
      });
    });

    // Calculate total expenses (same as finance overview)
    const regularExpenses = expenseResult.data?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    const vendorPaymentExpenses = vendorPaymentResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const withdrawalExpenses = withdrawalResult.data?.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0) || 0;
    
    const totalExpenses = regularExpenses + vendorPaymentExpenses + withdrawalExpenses;

    // Calculate net profit (gross profit - expenses) to match finance overview
    const totalProfit = grossProfit - totalExpenses;

    // Calculate both gross and net profit margins
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Log calculation for debugging (same format as finance overview)
    console.log('📊 KPI Profit Calculation:', {
      totalRevenue: `₹${totalRevenue.toLocaleString()}`,
      grossProfit: `₹${grossProfit.toLocaleString()}`,
      grossProfitMargin: `${grossProfitMargin.toFixed(1)}%`,
      totalExpenses: `₹${totalExpenses.toLocaleString()}`,
      netProfit: `₹${totalProfit.toLocaleString()}`,
      netProfitMargin: `${netProfitMargin.toFixed(1)}%`
    });

    // Count new customers in date range
    const newCustomers = customersResult.data?.length || 0;

    // Calculate customer acquisition from sales orders (customers who made their first order in this period)
    const customersWithFirstOrder = uniqueCustomers.size;

    const customPendingCount = customPendingResult.data?.custom_orders_pending || 0;
    const lowStockCount = lowStockResult.data?.low_stock_count || 0;
    
    const openPurchaseOrders = {
      count: openPOsResult.data?.open_pos || 0,
      value: openPOsResult.data?.open_po_value || 0
    };

    const onTimeDeliveryRate = onTimeDeliveryResult.data?.on_time_pct || 100;
    const totalDeliveries = onTimeDeliveryResult.data?.total_deliveries || 0;

    return NextResponse.json({
      success: true,
      data: {
        mtdRevenue: totalRevenue, // Now filtered by date range
        grossProfit: grossProfit,
        totalProfit: totalProfit,
        grossProfitMargin: grossProfitMargin,
        profitMargin: netProfitMargin, // Net profit margin (current display)
        newCustomers: newCustomers,
        activeCustomers: customersWithFirstOrder,
        orderCount: orderCount,
        customOrdersPending: customPendingCount,
        lowStockItems: lowStockCount,
        openPurchaseOrders,
        onTimeDeliveryRate,
        deliveryStats: {
          onTimePercentage: onTimeDeliveryRate,
          totalDeliveries
        },
        dateRange: {
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate
        }
      }
    });

  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch KPI data' },
      { status: 500 }
    );
  }
}
