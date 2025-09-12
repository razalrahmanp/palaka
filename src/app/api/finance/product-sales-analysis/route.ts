import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get sales orders with detailed product information
    const { data: salesOrders, error: ordersError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        final_price,
        original_price,
        discount_amount,
        waived_amount,
        date,
        supplier_name,
        is_custom_order,
        status
      `)
      .order('date', { ascending: false });

    if (ordersError) {
      console.error('Error fetching sales orders:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch sales orders' }, { status: 500 });
    }

    // Get sales order items for detailed product analysis
    const { data: orderItems, error: itemsError } = await supabase
      .from('sales_order_items')
      .select(`
        sales_order_id,
        item_name,
        quantity,
        unit_price,
        total_price,
        category
      `);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
    }

    // Get inventory items to understand product costs
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('name, category, selling_price, cost_price, stock_quantity');

    if (inventoryError) {
      console.error('Error fetching inventory items:', inventoryError);
    }

    // Split orders into regular and custom
    const regularOrders = salesOrders?.filter(order => !order.is_custom_order) || [];
    const customOrders = salesOrders?.filter(order => order.is_custom_order) || [];

    // Calculate regular products performance
    const regularRevenue = regularOrders.reduce((sum, order) => sum + (order.final_price || 0), 0);
    const regularOriginalValue = regularOrders.reduce((sum, order) => sum + (order.original_price || 0), 0);
    const regularDiscounts = regularOrders.reduce((sum, order) => sum + (order.discount_amount || 0), 0);
    const regularAverageOrderValue = regularOrders.length > 0 ? regularRevenue / regularOrders.length : 0;

    // Calculate custom products performance
    const customRevenue = customOrders.reduce((sum, order) => sum + (order.final_price || 0), 0);
    const customOriginalValue = customOrders.reduce((sum, order) => sum + (order.original_price || 0), 0);
    const customDiscounts = customOrders.reduce((sum, order) => sum + (order.discount_amount || 0), 0);
    const customAverageOrderValue = customOrders.length > 0 ? customRevenue / customOrders.length : 0;

    // Product category analysis (from order items)
    const categoryAnalysis: { [key: string]: {
      revenue: number;
      quantity: number;
      orders: number;
      avgPrice: number;
      totalCost: number;
      grossProfit: number;
    }} = {};

    orderItems?.forEach(item => {
      const category = item.category || 'Uncategorized';
      if (!categoryAnalysis[category]) {
        categoryAnalysis[category] = {
          revenue: 0,
          quantity: 0,
          orders: 0,
          avgPrice: 0,
          totalCost: 0,
          grossProfit: 0
        };
      }

      const revenue = item.total_price || (item.quantity * item.unit_price) || 0;
      categoryAnalysis[category].revenue += revenue;
      categoryAnalysis[category].quantity += item.quantity || 0;
      categoryAnalysis[category].orders += 1;

      // Find cost from inventory
      const inventoryItem = inventoryItems?.find(inv => 
        inv.name.toLowerCase().includes(item.item_name?.toLowerCase() || '')
      );
      const itemCost = inventoryItem?.cost_price || 0;
      const totalCost = itemCost * (item.quantity || 0);
      categoryAnalysis[category].totalCost += totalCost;
      categoryAnalysis[category].grossProfit += revenue - totalCost;
    });

    // Calculate average prices for categories
    Object.keys(categoryAnalysis).forEach(category => {
      const data = categoryAnalysis[category];
      data.avgPrice = data.quantity > 0 ? data.revenue / data.quantity : 0;
    });

    const topCategories = Object.entries(categoryAnalysis)
      .map(([name, data]) => ({ name, ...data, marginPercent: data.revenue > 0 ? (data.grossProfit / data.revenue) * 100 : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Supplier performance analysis
    const supplierAnalysis: { [key: string]: {
      regularRevenue: number;
      customRevenue: number;
      totalRevenue: number;
      regularOrders: number;
      customOrders: number;
      totalOrders: number;
      avgOrderValue: number;
      discountGiven: number;
    }} = {};

    salesOrders?.forEach(order => {
      const supplier = order.supplier_name || 'Direct Sales';
      if (!supplierAnalysis[supplier]) {
        supplierAnalysis[supplier] = {
          regularRevenue: 0,
          customRevenue: 0,
          totalRevenue: 0,
          regularOrders: 0,
          customOrders: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          discountGiven: 0
        };
      }

      const revenue = order.final_price || 0;
      const discount = order.discount_amount || 0;

      supplierAnalysis[supplier].totalRevenue += revenue;
      supplierAnalysis[supplier].totalOrders += 1;
      supplierAnalysis[supplier].discountGiven += discount;

      if (order.is_custom_order) {
        supplierAnalysis[supplier].customRevenue += revenue;
        supplierAnalysis[supplier].customOrders += 1;
      } else {
        supplierAnalysis[supplier].regularRevenue += revenue;
        supplierAnalysis[supplier].regularOrders += 1;
      }
    });

    // Calculate average order values for suppliers
    Object.keys(supplierAnalysis).forEach(supplier => {
      const data = supplierAnalysis[supplier];
      data.avgOrderValue = data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;
    });

    const topSuppliers = Object.entries(supplierAnalysis)
      .map(([name, data]) => ({ 
        name, 
        ...data,
        customOrderRatio: data.totalOrders > 0 ? (data.customOrders / data.totalOrders) * 100 : 0,
        discountRate: data.totalRevenue > 0 ? (data.discountGiven / data.totalRevenue) * 100 : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    // Monthly sales trend for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlySales: {
      month: string;
      regularRevenue: number;
      customRevenue: number;
      totalRevenue: number;
      regularOrders: number;
      customOrders: number;
      totalOrders: number;
      avgOrderValue: number;
      customOrderRatio: number;
    }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthKey = monthDate.toISOString().substring(0, 7);

      const monthOrders = salesOrders?.filter(order => 
        order.date?.substring(0, 7) === monthKey
      ) || [];

      const monthRegularOrders = monthOrders.filter(order => !order.is_custom_order);
      const monthCustomOrders = monthOrders.filter(order => order.is_custom_order);

      const monthRegularRevenue = monthRegularOrders.reduce((sum, order) => sum + (order.final_price || 0), 0);
      const monthCustomRevenue = monthCustomOrders.reduce((sum, order) => sum + (order.final_price || 0), 0);
      const monthTotalRevenue = monthRegularRevenue + monthCustomRevenue;

      monthlySales.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        regularRevenue: monthRegularRevenue,
        customRevenue: monthCustomRevenue,
        totalRevenue: monthTotalRevenue,
        regularOrders: monthRegularOrders.length,
        customOrders: monthCustomOrders.length,
        totalOrders: monthOrders.length,
        avgOrderValue: monthOrders.length > 0 ? monthTotalRevenue / monthOrders.length : 0,
        customOrderRatio: monthOrders.length > 0 ? (monthCustomOrders.length / monthOrders.length) * 100 : 0
      });
    }

    // Best performing products (from order items)
    const productPerformance: { [key: string]: {
      revenue: number;
      quantity: number;
      orders: number;
      avgPrice: number;
      lastOrderDate: string;
    }} = {};

    orderItems?.forEach(item => {
      const productName = item.item_name || 'Unknown Product';
      if (!productPerformance[productName]) {
        productPerformance[productName] = {
          revenue: 0,
          quantity: 0,
          orders: 0,
          avgPrice: 0,
          lastOrderDate: ''
        };
      }

      const revenue = item.total_price || (item.quantity * item.unit_price) || 0;
      productPerformance[productName].revenue += revenue;
      productPerformance[productName].quantity += item.quantity || 0;
      productPerformance[productName].orders += 1;

      // Find the order date for this item
      const orderDate = salesOrders?.find(order => order.id === item.sales_order_id)?.date || '';
      if (orderDate > productPerformance[productName].lastOrderDate) {
        productPerformance[productName].lastOrderDate = orderDate;
      }
    });

    // Calculate average prices for products
    Object.keys(productPerformance).forEach(product => {
      const data = productPerformance[product];
      data.avgPrice = data.quantity > 0 ? data.revenue / data.quantity : 0;
    });

    const topProducts = Object.entries(productPerformance)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    // Calculate growth rates
    const recentThreeMonths = monthlySales.slice(-3);
    const previousThreeMonths = monthlySales.slice(-6, -3);

    const recentAvgRevenue = recentThreeMonths.reduce((sum, m) => sum + m.totalRevenue, 0) / 3;
    const previousAvgRevenue = previousThreeMonths.reduce((sum, m) => sum + m.totalRevenue, 0) / 3;
    const revenueGrowthRate = previousAvgRevenue > 0 ? ((recentAvgRevenue - previousAvgRevenue) / previousAvgRevenue) * 100 : 0;

    const recentCustomRatio = recentThreeMonths.reduce((sum, m) => sum + m.customOrderRatio, 0) / 3;
    const previousCustomRatio = previousThreeMonths.reduce((sum, m) => sum + m.customOrderRatio, 0) / 3;

    return NextResponse.json({
      summary: {
        totalRevenue: regularRevenue + customRevenue,
        totalOrders: salesOrders?.length || 0,
        regularProductsShare: (regularRevenue / (regularRevenue + customRevenue)) * 100,
        customProductsShare: (customRevenue / (regularRevenue + customRevenue)) * 100,
        revenueGrowthRate,
        avgOrderValue: (salesOrders?.length || 0) > 0 ? (regularRevenue + customRevenue) / salesOrders.length : 0
      },
      regularProducts: {
        revenue: regularRevenue,
        orders: regularOrders.length,
        avgOrderValue: regularAverageOrderValue,
        discountsGiven: regularDiscounts,
        discountRate: regularRevenue > 0 ? (regularDiscounts / regularRevenue) * 100 : 0,
        grossMargin: regularOriginalValue > 0 ? ((regularRevenue - regularOriginalValue) / regularRevenue) * 100 : 0
      },
      customProducts: {
        revenue: customRevenue,
        orders: customOrders.length,
        avgOrderValue: customAverageOrderValue,
        discountsGiven: customDiscounts,
        discountRate: customRevenue > 0 ? (customDiscounts / customRevenue) * 100 : 0,
        grossMargin: customOriginalValue > 0 ? ((customRevenue - customOriginalValue) / customRevenue) * 100 : 0
      },
      monthlySales,
      topCategories,
      topSuppliers,
      topProducts,
      trends: {
        recentCustomRatio,
        previousCustomRatio,
        customRatioChange: previousCustomRatio > 0 ? ((recentCustomRatio - previousCustomRatio) / previousCustomRatio) * 100 : 0,
        avgMonthlyGrowth: monthlySales.length > 1 ? 
          monthlySales.slice(1).reduce((sum, month, index) => {
            const prevRevenue = monthlySales[index].totalRevenue;
            const growth = prevRevenue > 0 ? ((month.totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
            return sum + growth;
          }, 0) / (monthlySales.length - 1) : 0
      },
      metrics: {
        totalProductsSold: orderItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
        uniqueProducts: new Set(orderItems?.map(item => item.item_name)).size || 0,
        averageItemsPerOrder: (salesOrders?.length || 0) > 0 ? 
          (orderItems?.length || 0) / salesOrders.length : 0,
        repeatCustomerRate: 0 // Would need customer analysis for this
      }
    });

  } catch (error) {
    console.error('Error in product sales analysis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}