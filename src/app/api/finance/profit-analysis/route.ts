import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'mtd';
    
    // Calculate date range - use exact same logic as KPIs API for consistency
    let startDate: Date;
    let endDate: Date;
    
    if (period === 'mtd') {
      // Month-to-date (exact same calculation as main dashboard KPIs API)
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    } else {
      // Legacy: last N days
      const days = parseInt(period) || 30;
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - days);
    }

    console.log('📅 Profit Analysis Date Range:', {
      period,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      note: 'Using same date calculation as KPIs API for consistency'
    });

    // Get all sales data with items for profit analysis (ALL statuses to match KPIs API)
    const { data: salesData, error: salesError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        created_at,
        status,
        sales_order_items (
          quantity,
          unit_price,
          final_price,
          product_id,
          custom_product_id,
          cost,
          name,
          products (
            name,
            cost,
            price
          ),
          custom_products (
            name,
            cost_price,
            price
          )
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get ALL sales orders for revenue analysis (including all statuses)
    const { data: allSalesData, error: allSalesError } = await supabase
      .from('sales_orders')
      .select('id, final_price, created_at, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (salesError) {
      console.error('Sales data error:', salesError);
      return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
    }

    if (allSalesError) {
      console.error('All sales data error:', allSalesError);
      return NextResponse.json({ error: 'Failed to fetch all sales data' }, { status: 500 });
    }

    // Get expense data (exclude vendor payment entries to avoid double counting)
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, created_at, category, entity_type, description')
      .neq('entity_type', 'supplier')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (expenseError) {
      console.error('Expense data error:', expenseError);
      return NextResponse.json({ error: 'Failed to fetch expense data' }, { status: 500 });
    }

    // Get liability payment data (loan/equipment payments)
    const { data: liabilityPaymentData, error: liabilityPaymentError } = await supabase
      .from('liability_payments')
      .select('amount, payment_date, created_at, liability_type')
      .gte('payment_date', startDate.toISOString().split('T')[0])
      .lte('payment_date', endDate.toISOString().split('T')[0]);

    if (liabilityPaymentError) {
      console.error('Liability payment data error:', liabilityPaymentError);
      // Continue without liability payments rather than failing completely
    }

    // Get withdrawal data (partner withdrawals are business expenses)
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('amount, withdrawal_date, created_at, description')
      .gte('withdrawal_date', startDate.toISOString().split('T')[0])
      .lte('withdrawal_date', endDate.toISOString().split('T')[0]);

    if (withdrawalError) {
      console.error('Withdrawal data error:', withdrawalError);
      // Continue without withdrawals rather than failing completely
    }

    // Get vendor payment data (treat as COGS, not operating expenses)
    const { data: vendorPaymentData, error: vendorPaymentError } = await supabase
      .from('vendor_payment_history')
      .select('amount, payment_date, created_at, status')
      .eq('status', 'completed')
      .gte('payment_date', startDate.toISOString().split('T')[0])
      .lte('payment_date', endDate.toISOString().split('T')[0]);

    if (vendorPaymentError) {
      console.error('Vendor payment data error:', vendorPaymentError);
      // Continue without vendor payments rather than failing completely
    }

    // Process sales data for profit analysis (updated to match KPIs API calculation method)
    let totalRevenue = 0;
    let totalCost = 0; // Keep for backwards compatibility
    let grossProfit = 0; // Calculate like KPIs API: sum of (itemRevenue - itemCost)
    let regularProductRevenue = 0;
    let customProductRevenue = 0;
    let unclassifiedProductRevenue = 0;
    let regularProductCost = 0;
    let customProductCost = 0;
    let unclassifiedProductCost = 0;
    let regularProductCount = 0;
    let customProductCount = 0;
    let unclassifiedProductCount = 0;

    const profitByDay: { [key: string]: { revenue: number; cost: number; profit: number } } = {};

    salesData?.forEach((sale) => {
      const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
      
      if (!profitByDay[saleDate]) {
        profitByDay[saleDate] = { revenue: 0, cost: 0, profit: 0 };
      }

      // Add the total bill value from sales_orders.final_price to daily revenue
      const billValue = sale.final_price || 0;
      profitByDay[saleDate].revenue += billValue;
      totalRevenue += billValue;

      // If there are no sales_order_items, treat the entire sale as unclassified
      if (!sale.sales_order_items || sale.sales_order_items.length === 0) {
        unclassifiedProductRevenue += billValue;
        unclassifiedProductCount += 1;
        profitByDay[saleDate].profit += billValue;
        return;
      }

      sale.sales_order_items?.forEach((item) => {
        let itemRevenue = 0;
        let itemCost = 0;

        // Calculate item revenue from final_price * quantity
        itemRevenue = (item.final_price || 0) * item.quantity;

        // Check if it's a regular product (has product_id and products data)
        if (item.product_id && item.products) {
          // Handle both single object and array cases
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const costPrice = product?.cost || 0;
          itemCost = costPrice * item.quantity;
          regularProductRevenue += itemRevenue;
          regularProductCost += itemCost;
          regularProductCount += item.quantity;
          
          // Debug logging for regular products
          if (costPrice === 0) {
            console.log(`Regular product ${item.product_id} has zero cost. Product data:`, product);
          }
        }
        // Check if it's a custom product (has custom_product_id and custom_products data)
        else if (item.custom_product_id && item.custom_products) {
          // Handle both single object and array cases
          const customProduct = Array.isArray(item.custom_products) ? item.custom_products[0] : item.custom_products;
          const costPrice = customProduct?.cost_price || 0;
          itemCost = costPrice * item.quantity;
          customProductRevenue += itemRevenue;
          customProductCost += itemCost;
          customProductCount += item.quantity;
          
          // Debug logging for custom products
          if (costPrice === 0) {
            console.log(`Custom product ${item.custom_product_id} has zero cost. Product data:`, customProduct);
          }
        }
        // Check if has product_id but no joined data (regular product without cost data)
        else if (item.product_id) {
          // Use item.cost if available as fallback
          itemCost = (item.cost || 0) * item.quantity;
          regularProductRevenue += itemRevenue;
          regularProductCost += itemCost;
          regularProductCount += item.quantity;
        }
        // Check if has custom_product_id but no joined data (custom product without cost data)
        else if (item.custom_product_id) {
          // Use item.cost if available as fallback
          itemCost = (item.cost || 0) * item.quantity;
          customProductRevenue += itemRevenue;
          customProductCost += itemCost;
          customProductCount += item.quantity;
        }
        // Unclassified - no product_id or custom_product_id
        else {
          itemCost = (item.cost || 0) * item.quantity;
          unclassifiedProductRevenue += itemRevenue;
          unclassifiedProductCost += itemCost;
          unclassifiedProductCount += item.quantity;
        }

        totalCost += itemCost;
        grossProfit += (itemRevenue - itemCost); // Calculate like KPIs API
        profitByDay[saleDate].cost += itemCost;
        profitByDay[saleDate].profit += (itemRevenue - itemCost);
      });
    });

    // Calculate total expenses (exclude vendor payment entries to avoid double counting)
    const regularExpenses = expenseData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    const liabilityPaymentExpenses = liabilityPaymentData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const withdrawalExpenses = withdrawalData?.reduce((sum, withdrawal) => sum + (withdrawal.amount || 0), 0) || 0;
    
    // Calculate vendor payments (treat as COGS, not operating expenses)
    const vendorPayments = vendorPaymentData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    
    // Total operating expenses (excluding vendor payments to avoid double counting)
    const totalExpenses = regularExpenses + liabilityPaymentExpenses + withdrawalExpenses;

    // Debug: Count excluded vendor payment entries from expenses
    const allExpensesResult = await supabase
      .from('expenses')
      .select('amount, description, entity_type')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    const vendorPaymentEntriesInExpenses = allExpensesResult.data?.filter(expense => 
      expense.entity_type === 'supplier'
    ) || [];
    
    const vendorPaymentAmountInExpenses = vendorPaymentEntriesInExpenses.reduce(
      (sum, expense) => sum + (expense.amount || 0), 0
    );

    // Log expense breakdown for analysis (updated to show vendor payment exclusion)
    console.log('📊 Fixed Profit Analysis - Expense Breakdown:', {
      regularExpenses: `₹${regularExpenses.toLocaleString()} (filtered out vendor entries)`,
      liabilityPaymentExpenses: `₹${liabilityPaymentExpenses.toLocaleString()}`,
      withdrawalExpenses: `₹${withdrawalExpenses.toLocaleString()}`,
      vendorPayments: `₹${vendorPayments.toLocaleString()} (COGS)`,
      totalExpenses: `₹${totalExpenses.toLocaleString()} (excluding vendor payments)`,
      vendorPaymentEntriesExcluded: vendorPaymentEntriesInExpenses.length,
      vendorPaymentAmountExcluded: `₹${vendorPaymentAmountInExpenses.toLocaleString()}`,
      note: 'All expenses included for comprehensive financial analysis',
      liabilityPaymentCount: liabilityPaymentData?.length || 0,
      withdrawalCount: withdrawalData?.length || 0
    });

    // Calculate profit metrics (updated to match KPIs API calculation method)
    // grossProfit already calculated above by summing (itemRevenue - itemCost) like KPIs API
    
    // Net Profit = Gross Profit - Vendor Payments (COGS) - Operating Expenses
    const adjustedGrossProfit = grossProfit - vendorPayments; // Subtract vendor payments as COGS
    const netProfit = adjustedGrossProfit - totalExpenses; // Then subtract operating expenses
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Log corrected profit calculation for verification
    console.log('🔧 Fixed Profit Analysis Calculation:', {
      dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      totalRevenue: `₹${totalRevenue.toLocaleString()}`,
      grossProfit: `₹${grossProfit.toLocaleString()}`,
      grossProfitMargin: `${grossProfitMargin.toFixed(1)}%`,
      vendorPayments: `₹${vendorPayments.toLocaleString()} (COGS)`,
      adjustedGrossProfit: `₹${adjustedGrossProfit.toLocaleString()} (after vendor payments)`,
      operatingExpenses: `₹${totalExpenses.toLocaleString()} (excluding vendor payments)`,
      netProfit: `₹${netProfit.toLocaleString()}`,
      netProfitMargin: `${netProfitMargin.toFixed(1)}%`,
      formula: 'Net Profit = (Gross Profit - Vendor Payments) - Operating Expenses',
      note: 'Double-counting prevention applied - vendor payments excluded from expenses'
    });

    // Regular vs Custom product analysis
    const regularProfitMargin = regularProductRevenue > 0 ? 
      ((regularProductRevenue - regularProductCost) / regularProductRevenue) * 100 : 0;
    const customProfitMargin = customProductRevenue > 0 ? 
      ((customProductRevenue - customProductCost) / customProductRevenue) * 100 : 0;

    // Prepare daily profit chart data
    const dailyProfitData = Object.entries(profitByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.profit,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
      }));

    // Product type comparison
    const productComparison = [
      {
        type: 'Regular Products',
        revenue: regularProductRevenue,
        cost: regularProductCost,
        profit: regularProductRevenue - regularProductCost,
        margin: regularProfitMargin,
        quantity: regularProductCount
      },
      {
        type: 'Custom Products',
        revenue: customProductRevenue,
        cost: customProductCost,
        profit: customProductRevenue - customProductCost,
        margin: customProfitMargin,
        quantity: customProductCount
      }
    ];

    // Top performing products by profit
    const productProfitability: { [key: string]: { profit: number; revenue: number; quantity: number } } = {};

    salesData?.forEach((sale) => {
      sale.sales_order_items?.forEach((item) => {
        let productName = '';
        let itemCost = 0;
        let itemRevenue = 0;

        if (item.product_id && item.products && item.products.length > 0) {
          productName = item.products[0].name;
          // Revenue: final_price * quantity for regular products
          itemRevenue = (item.final_price || 0) * item.quantity;
          // Cost: products.cost * quantity
          itemCost = (item.products[0].cost || 0) * item.quantity;
        } else if (item.custom_product_id && item.custom_products && item.custom_products.length > 0) {
          productName = item.custom_products[0].name;
          // Revenue: final_price * quantity for custom products
          itemRevenue = (item.final_price || 0) * item.quantity;
          // Cost: custom_products.cost_price * quantity
          itemCost = (item.custom_products[0].cost_price || 0) * item.quantity;
        } else if (item.cost) {
          // Use the cost field if available as fallback
          itemRevenue = (item.final_price || 0) * item.quantity;
          itemCost = item.cost * item.quantity;
          productName = item.name || 'Unknown Product';
        }

        if (productName) {
          if (!productProfitability[productName]) {
            productProfitability[productName] = { profit: 0, revenue: 0, quantity: 0 };
          }
          productProfitability[productName].profit += (itemRevenue - itemCost);
          productProfitability[productName].revenue += itemRevenue;
          productProfitability[productName].quantity += item.quantity;
        }
      });
    });

    const topProducts = Object.entries(productProfitability)
      .map(([name, data]) => ({
        name,
        profit: data.profit,
        revenue: data.revenue,
        quantity: data.quantity,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalCost,
        grossProfit,
        netProfit,
        totalExpenses,
        grossProfitMargin,
        netProfitMargin,
        expenseBreakdown: {
          regularExpenses,
          liabilityPaymentExpenses,
          withdrawalExpenses,
          vendorPayments, // Add vendor payments to the summary
          liabilityPaymentCount: liabilityPaymentData?.length || 0,
          withdrawalCount: withdrawalData?.length || 0,
          vendorPaymentCount: vendorPaymentData?.length || 0,
          note: 'Fixed double-counting issue - vendor payments excluded from expenses'
        }
      },
      regularProducts: {
        count: regularProductCount,
        revenue: regularProductRevenue,
        grossMargin: regularProductRevenue > 0 ? ((regularProductRevenue - regularProductCost) / regularProductRevenue) * 100 : 0,
        avgOrderValue: regularProductCount > 0 ? regularProductRevenue / regularProductCount : 0,
        profit: regularProductRevenue - regularProductCost
      },
      customProducts: {
        count: customProductCount,
        revenue: customProductRevenue,
        grossMargin: customProductRevenue > 0 ? ((customProductRevenue - customProductCost) / customProductRevenue) * 100 : 0,
        avgOrderValue: customProductCount > 0 ? customProductRevenue / customProductCount : 0,
        profit: customProductRevenue - customProductCost
      },
      unclassifiedProducts: {
        count: unclassifiedProductCount,
        revenue: unclassifiedProductRevenue,
        grossMargin: unclassifiedProductRevenue > 0 ? ((unclassifiedProductRevenue - unclassifiedProductCost) / unclassifiedProductRevenue) * 100 : 0,
        avgOrderValue: unclassifiedProductCount > 0 ? unclassifiedProductRevenue / unclassifiedProductCount : 0,
        profit: unclassifiedProductRevenue - unclassifiedProductCost
      },
      productComparison,
      dailyProfitData,
      topProducts,
      monthlyTrends: dailyProfitData, // Use daily data as monthly for now
      revenueAnalysis: {
        processedOrdersRevenue: totalRevenue, // Now includes ALL order statuses to match KPIs API
        totalAllOrdersRevenue: allSalesData?.reduce((sum, order) => sum + (order.final_price || 0), 0) || 0,
        processedOrdersCount: salesData?.length || 0,
        totalAllOrdersCount: allSalesData?.length || 0,
        includedStatuses: 'ALL_STATUSES', // Updated to match KPIs API - includes all order statuses
        statusBreakdown: allSalesData?.reduce((acc: { [key: string]: { count: number; revenue: number } }, order) => {
          const status = order.status || 'unknown';
          if (!acc[status]) acc[status] = { count: 0, revenue: 0 };
          acc[status].count += 1;
          acc[status].revenue += order.final_price || 0;
          return acc;
        }, {}) || {}
      },
      metrics: {
        totalOrders: (salesData?.length || 0),
        averageOrderValue: totalRevenue / (salesData?.length || 1),
        customProductRatio: totalRevenue > 0 ? (customProductRevenue / totalRevenue) * 100 : 0,
        regularProductRatio: totalRevenue > 0 ? (regularProductRevenue / totalRevenue) * 100 : 0,
        unclassifiedProductRatio: totalRevenue > 0 ? (unclassifiedProductRevenue / totalRevenue) * 100 : 0,
        discountRate: 0 // Can be calculated later
      },
      period: parseInt(period)
    });

  } catch (error) {
    console.error('Error in profit analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}