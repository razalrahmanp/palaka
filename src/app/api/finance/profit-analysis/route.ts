import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period));

    // Get all sales data with items for profit analysis (confirmed orders)
    const { data: salesData, error: salesError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        grand_total,
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
      .eq('status', 'confirmed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Get ALL sales orders for revenue analysis (including all statuses)
    const { data: allSalesData, error: allSalesError } = await supabase
      .from('sales_orders')
      .select('id, grand_total, created_at, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (salesError) {
      console.error('Sales data error:', salesError);
      return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
    }

    // Get expense data
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select('amount, created_at, category')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (expenseError) {
      console.error('Expense data error:', expenseError);
      return NextResponse.json({ error: 'Failed to fetch expense data' }, { status: 500 });
    }

    // Process sales data for profit analysis
    let totalRevenue = 0;
    let totalCost = 0;
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

      // Add the total bill value from sales_orders.grand_total to daily revenue
      const billValue = sale.grand_total || 0;
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
        profitByDay[saleDate].cost += itemCost;
        profitByDay[saleDate].profit += (itemRevenue - itemCost);
      });
    });

    // Calculate total expenses
    const totalExpenses = expenseData?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;

    // Calculate profit metrics
    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit - totalExpenses;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

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
        netProfitMargin
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
        confirmedOrdersRevenue: totalRevenue,
        totalAllOrdersRevenue: allSalesData?.reduce((sum, order) => sum + (order.grand_total || 0), 0) || 0,
        confirmedOrdersCount: salesData?.length || 0,
        totalAllOrdersCount: allSalesData?.length || 0,
        statusBreakdown: allSalesData?.reduce((acc: { [key: string]: { count: number; revenue: number } }, order) => {
          const status = order.status || 'unknown';
          if (!acc[status]) acc[status] = { count: 0, revenue: 0 };
          acc[status].count += 1;
          acc[status].revenue += order.grand_total || 0;
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