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
      // Default to current month MTD (dynamic based on current date)
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-based month
      
      // Create start and end dates for current month
      const currentMonthStart = new Date(Date.UTC(year, month, 1));
      const currentMonthEnd = new Date(Date.UTC(year, month + 1, 0));
      
      dateFilter = {
        startDate: currentMonthStart.toISOString().split('T')[0],
        endDate: currentMonthEnd.toISOString().split('T')[0]
      };
      
      console.log('📅 KPIs Default Date Applied:', {
        period: `Current Month (${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})`,
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        currentDate: now.toISOString().split('T')[0],
        note: 'Dynamic current month dates - will adjust automatically each month'
      });
    }

    // Fetch sales orders with items for profit calculation (MTD with ALL STATUSES)
    let salesOrdersQuery = supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        original_price,
        discount_amount,
        created_at,
        status,
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

    // Apply date filtering for MTD calculation using created_at field (order creation date)
    if (dateFilter.startDate && dateFilter.endDate) {
      salesOrdersQuery = salesOrdersQuery
        .gte('created_at', dateFilter.startDate + 'T00:00:00.000Z')
        .lte('created_at', dateFilter.endDate + 'T23:59:59.999Z');
      
      console.log('📅 MTD Date filter applied:', {
        startDate: dateFilter.startDate + 'T00:00:00.000Z',
        endDate: dateFilter.endDate + 'T23:59:59.999Z',
        statusFilter: 'ALL STATUSES INCLUDED',
        note: 'Month-to-date revenue using created_at field with all order statuses'
      });
    }

    // DEBUG: Test query without date filter to see if we can access sales_orders at all
    const testQuery = await supabase
      .from('sales_orders')
      .select('id, created_at, final_price')
      .limit(5);
    
    console.log('🧪 Test Query Result:', {
      totalRows: testQuery.data?.length || 0,
      error: testQuery.error,
      sampleData: testQuery.data?.slice(0, 2)
    });

    // Fetch customers for new customer calculation
    const customersQuery = supabase
      .from('customers')
      .select('id, created_at')
      .gte('created_at', dateFilter.startDate)
      .lte('created_at', dateFilter.endDate + 'T23:59:59.999Z');

    // Fetch withdrawals for MTD calculation
    const withdrawalsQuery = supabase
      .from('withdrawals')
      .select('amount, withdrawal_date, withdrawal_type')
      .gte('withdrawal_date', dateFilter.startDate)
      .lte('withdrawal_date', dateFilter.endDate);

    const [
      salesOrdersResult,
      customersResult,
      withdrawalsResult,
      customPendingResult,
      lowStockResult,
      openPOsResult,
      onTimeDeliveryResult
    ] = await Promise.all([
      // Sales orders for profit calculation
      salesOrdersQuery,

      // New customers for customer metrics
      customersQuery,

      // Withdrawals for MTD calculation
      withdrawalsQuery,

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

    // Debug the salesOrdersResult immediately after Promise.all
    console.log('🔍 Sales Orders Result Debug:', {
      error: salesOrdersResult.error,
      dataLength: salesOrdersResult.data?.length || 0,
      filterApplied: `${dateFilter.startDate}T00:00:00.000Z to ${dateFilter.endDate}T23:59:59.999Z`,
      sampleData: salesOrdersResult.data?.slice(0, 2)
    });

    // Debug logging for orders found
    console.log('🔍 Sales Orders Debug (MTD):', {
      totalOrdersFound: salesOrdersResult.data?.length || 0,
      dateRange: `${dateFilter.startDate} to ${dateFilter.endDate}`,
      statusFilter: 'ALL STATUSES INCLUDED',
      note: 'Month-to-date revenue calculation using created_at field with all order statuses',
      sampleOrders: salesOrdersResult.data?.slice(0, 3).map(order => ({
        id: order.id,
        created_at: order.created_at,
        status: order.status,
        final_price: order.final_price,
        original_price: order.original_price,
        discount_amount: order.discount_amount
      }))
    });

    // Calculate revenue and gross profit from sales orders (same method as finance overview)
    let totalRevenue = 0;
    let grossProfit = 0;
    let orderCount = 0;
    const uniqueCustomers = new Set();

    salesOrdersResult.data?.forEach(order => {
      orderCount++;
      if (order.customer_id) {
        uniqueCustomers.add(order.customer_id);
      }

      // Add revenue using same calculation as sales tab: final_price || total
      totalRevenue += (order.final_price || 0);

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

    // Fetch expenses to calculate net profit (exclude vendor payment entries to avoid double counting)
    const [
      expenseResult,
      liabilityPaymentResult,
      withdrawalResult,
      salesPaymentsResult,
      vendorPaymentsResult
    ] = await Promise.all([
      // Regular expenses (EXCLUDE vendor payment entries to avoid double counting)
      // Use 'date' field instead of 'created_at' for accurate MTD calculation
      supabase
        .from('expenses')
        .select('amount, description, entity_type, date')
        .gte('date', dateFilter.startDate)
        .lte('date', dateFilter.endDate)
        .neq('entity_type', 'supplier'), // Exclude vendor/supplier payment entries

      // Liability payment expenses (using date field for consistency)
      supabase
        .from('liability_payments')
        .select('amount, date')
        .gte('date', dateFilter.startDate)
        .lte('date', dateFilter.endDate),

      // Withdrawal expenses (using withdrawal_date field for consistency)
      supabase
        .from('withdrawals')
        .select('amount, withdrawal_date')
        .gte('withdrawal_date', dateFilter.startDate)
        .lte('withdrawal_date', dateFilter.endDate),

      // Sales payments to calculate collected amount
      supabase
        .from('payments')
        .select('amount, payment_date, date')
        .gte('date', dateFilter.startDate)
        .lte('date', dateFilter.endDate),

      // Vendor payments (treated as COGS, not expenses)
      supabase
        .from('vendor_payment_history')
        .select('amount, payment_date')
        .eq('status', 'completed')
        .gte('payment_date', dateFilter.startDate)
        .lte('payment_date', dateFilter.endDate)
    ]);

    // Calculate total expenses (exclude vendor payment entries to avoid double counting)
    const regularExpenses = expenseResult.data?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    const liabilityPaymentExpenses = liabilityPaymentResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const withdrawalExpenses = withdrawalResult.data?.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0) || 0;
    
    // Total operating expenses (excluding vendor payments to avoid double counting)
    const totalExpenses = regularExpenses + liabilityPaymentExpenses + withdrawalExpenses;

    // Calculate vendor payments (treat as COGS, not expenses)
    const vendorPayments = vendorPaymentsResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    // Debug: Count excluded vendor payment entries from expenses (using date field for consistency)
    const allExpensesResult = await supabase
      .from('expenses')
      .select('amount, description, entity_type, date')
      .gte('date', dateFilter.startDate)
      .lte('date', dateFilter.endDate);
    
    const vendorPaymentEntriesInExpenses = allExpensesResult.data?.filter(expense => 
      expense.entity_type === 'supplier'
    ) || [];
    
    const vendorPaymentAmountInExpenses = vendorPaymentEntriesInExpenses.reduce(
      (sum, expense) => sum + (expense.amount || 0), 0
    );

    console.log('💡 Vendor Payment Double-Count Prevention:', {
      vendorPaymentsFromHistory: `₹${vendorPayments.toLocaleString()}`,
      vendorPaymentEntriesInExpenses: vendorPaymentEntriesInExpenses.length,
      vendorPaymentAmountInExpenses: `₹${vendorPaymentAmountInExpenses.toLocaleString()}`,
      regularExpensesAfterFilter: `₹${regularExpenses.toLocaleString()}`,
      note: 'Excluded vendor payment entries from expenses to avoid double counting'
    });

    // Calculate payment collection data
    const totalCollected = salesPaymentsResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const totalOutstanding = totalRevenue - totalCollected;
    
    // Collection rate calculation: if revenue is 0 but payments exist, show 100% collected
    // This handles cases where payments are made for invoices from previous periods
    let collectionRate = 0;
    if (totalRevenue > 0) {
      collectionRate = Math.round((totalCollected / totalRevenue) * 100);
    } else if (totalCollected > 0) {
      // If no revenue in current period but payments exist, show high collection rate
      collectionRate = 100;
    }

    // Calculate delivered orders payment tracking
    const deliveredOrders = salesOrdersResult.data?.filter(order => 
      order.status === 'delivered' || order.status === 'Delivered'
    ) || [];
    
    const deliveredOrderIds = new Set(deliveredOrders.map(o => o.id));
    const deliveredRevenue = deliveredOrders.reduce((sum, order) => sum + (order.final_price || 0), 0);
    
    // Fetch invoices for delivered orders
    const deliveredInvoicesResult = await supabase
      .from('invoices')
      .select('id, sales_order_id, total, paid_amount, status')
      .in('sales_order_id', Array.from(deliveredOrderIds));
    
    const deliveredInvoices = deliveredInvoicesResult.data || [];
    const deliveredCollected = deliveredInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const deliveredInvoiceTotal = deliveredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const deliveredPending = deliveredInvoiceTotal - deliveredCollected;
    
    console.log('📦 Delivered Orders Payment Tracking:', {
      deliveredOrdersCount: deliveredOrders.length,
      deliveredRevenue: `₹${deliveredRevenue.toLocaleString()}`,
      deliveredInvoicesCount: deliveredInvoices.length,
      deliveredCollected: `₹${deliveredCollected.toLocaleString()}`,
      deliveredPending: `₹${deliveredPending.toLocaleString()}`,
      deliveredCollectionRate: deliveredInvoiceTotal > 0 ? `${Math.round((deliveredCollected / deliveredInvoiceTotal) * 100)}%` : '0%'
    });

    // Calculate profit: Gross Profit - Operating Expenses
    // FIXED: Vendor payments should NOT be subtracted from gross profit
    // Gross profit already accounts for COGS through product.cost fields
    // Net Profit = Gross Profit - Operating Expenses (vendor payments can be treated as operational expenses if needed)
    const totalProfit = grossProfit - totalExpenses; // Direct calculation without vendor payment adjustment

    // Calculate both gross and net profit margins
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Log calculation for debugging (FIXED: Removed incorrect vendor payment subtraction)
    console.log('📊 KPI Profit Calculation (FIXED - Removed Vendor Payment from Gross Profit):', {
      dateRange: `${dateFilter.startDate} to ${dateFilter.endDate}`,
      ordersFound: salesOrdersResult.data?.length || 0,
      totalRevenue: `₹${totalRevenue.toLocaleString()} (using final_price || total)`,
      grossProfit: `₹${grossProfit.toLocaleString()} (Revenue - COGS from product costs)`,
      grossProfitMargin: `${grossProfitMargin.toFixed(1)}%`,
      totalExpenses: `₹${totalExpenses.toLocaleString()} (operating expenses only)`,
      vendorPayments: `₹${vendorPayments.toLocaleString()} (tracked separately, not deducted from gross profit)`,
      netProfit: `₹${totalProfit.toLocaleString()} (Gross Profit - Operating Expenses)`,
      netProfitMargin: `${netProfitMargin.toFixed(1)}%`,
      note: 'Vendor payments are now correctly excluded from profit calculation'
    });

    // Count new customers in date range
    const newCustomers = customersResult.data?.length || 0;

    // Calculate customer acquisition from sales orders (customers who made their first order in this period)
    const customersWithFirstOrder = uniqueCustomers.size;

    // Calculate withdrawals metrics instead of customer conversion
    const totalWithdrawals = withdrawalsResult.data?.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0) || 0;
    const withdrawalCount = withdrawalsResult.data?.length || 0;
    const withdrawalsByType = withdrawalsResult.data?.reduce((acc, withdrawal) => {
      const type = withdrawal.withdrawal_type || 'unknown';
      acc[type] = (acc[type] || 0) + (withdrawal.amount || 0);
      return acc;
    }, {} as Record<string, number>) || {};

    console.log('📊 Withdrawals Calculation:', {
      dateRange: `${dateFilter.startDate} to ${dateFilter.endDate}`,
      totalWithdrawals: `₹${totalWithdrawals.toLocaleString()}`,
      withdrawalCount,
      withdrawalsByType,
      note: 'Replaced customer conversion with withdrawals metrics'
    });

    const customPendingCount = customPendingResult.data?.custom_orders_pending || 0;
    const lowStockCount = lowStockResult.data?.low_stock_count || 0;
    
    const openPurchaseOrders = {
      count: openPOsResult.data?.open_pos || 0,
      value: openPOsResult.data?.open_po_value || 0
    };

    const onTimeDeliveryRate = onTimeDeliveryResult.data?.on_time_pct || 100;
    const totalDeliveries = onTimeDeliveryResult.data?.total_deliveries || 0;

    // Fetch COGS breakdown data from profit-loss API
    let cogsBreakdown = {
      opening_stock: 0,
      purchases: 0,
      closing_stock: 0,
      total_cogs: 0
    };

    try {
      const plUrl = new URL('/api/finance/reports/profit-loss', request.url);
      plUrl.searchParams.set('start_date', dateFilter.startDate);
      plUrl.searchParams.set('end_date', dateFilter.endDate);

      const plResponse = await fetch(plUrl.toString());
      if (plResponse.ok) {
        const plData = await plResponse.json();
        
        // Extract COGS breakdown from profit-loss response
        cogsBreakdown = {
          opening_stock: plData.summary?.opening_stock || 0,
          purchases: plData.summary?.purchases || 0,
          closing_stock: plData.summary?.closing_stock || 0,
          total_cogs: plData.summary?.total_cogs || 0
        };
      }
    } catch (error) {
      console.error('Error fetching COGS breakdown:', error);
    }

    console.log('📦 COGS Breakdown:', {
      dateRange: `${dateFilter.startDate} to ${dateFilter.endDate}`,
      openingStock: `₹${cogsBreakdown.opening_stock?.toLocaleString() || '0'}`,
      purchases: `₹${cogsBreakdown.purchases?.toLocaleString() || '0'}`,
      closingStock: `₹${cogsBreakdown.closing_stock?.toLocaleString() || '0'}`,
      totalCOGS: `₹${cogsBreakdown.total_cogs?.toLocaleString() || '0'}`,
      calculatedCOGS: `₹${(totalRevenue - grossProfit).toLocaleString()}`,
      note: 'COGS breakdown from profit-loss API'
    });

    return NextResponse.json({
      success: true,
      data: {
        mtdRevenue: totalRevenue, // MTD revenue with all order statuses
        grossProfit: grossProfit,
        totalExpenses: totalExpenses, // Total operating expenses (excluding vendor payments)
        totalProfit: totalProfit,
        grossProfitMargin: grossProfitMargin,
        profitMargin: netProfitMargin, // Net profit margin (current display)
        totalCollected: totalCollected,
        totalOutstanding: totalOutstanding, // Outstanding = Revenue - Collected
        collectionRate: collectionRate,
        // Delivered orders payment tracking
        deliveredRevenue: deliveredRevenue,
        deliveredCollected: deliveredCollected,
        deliveredPending: deliveredPending,
        deliveredCollectionRate: deliveredInvoiceTotal > 0 ? Math.round((deliveredCollected / deliveredInvoiceTotal) * 100) : 0,
        vendorPayments: vendorPayments, // New vendor payments metric
        newCustomers: newCustomers,
        activeCustomers: customersWithFirstOrder,
        withdrawalsTotal: totalWithdrawals, // Replaced customer conversion with withdrawals
        withdrawalsCount: withdrawalCount,
        withdrawalsByType: withdrawalsByType,
        orderCount: orderCount,
        customOrdersPending: customPendingCount,
        lowStockItems: lowStockCount,
        openPurchaseOrders,
        onTimeDeliveryRate,
        deliveryStats: {
          onTimePercentage: onTimeDeliveryRate,
          totalDeliveries
        },
        cogsBreakdown: {
          openingStock: cogsBreakdown.opening_stock || 0,
          purchases: cogsBreakdown.purchases || 0,
          closingStock: cogsBreakdown.closing_stock || 0,
          totalCogs: cogsBreakdown.total_cogs || 0
        },
        dateRange: {
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate
        },
        note: 'MTD revenue includes all order statuses, delivered orders tracked separately for payment collection'
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
