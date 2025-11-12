import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    // For sales trend - last 7 days
    const last7DaysStart = new Date();
    last7DaysStart.setDate(last7DaysStart.getDate() - 6);
    const trendStartDate = last7DaysStart.toISOString().split('T')[0];
    
    // For status breakdown - last 30 days to ensure we have data
    const last30DaysStart = new Date();
    last30DaysStart.setDate(last30DaysStart.getDate() - 30);
    const statusStartDate = last30DaysStart.toISOString().split('T')[0];

    console.log('📊 Fetching Sales Dashboard Data:', { startDate, endDate, trendStartDate, statusStartDate });

    // Fetch all required data in parallel
    const [
      salesOrdersResult,
      leadsResult,
      quotesResult,
      itemsResult,
      trendOrdersResult,
      statusOrdersResult,
      invoicesResult,
      paymentsResult
    ] = await Promise.all([
      // Sales orders (MTD)
      supabase
        .from('sales_orders')
        .select('id, final_price, status, created_at, customer_id, sales_representative_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z'),

      // Leads (All time for better conversion rate calculation)
      supabase
        .from('leads')
        .select('id, status, created_at'),

      // Quotes
      supabase
        .from('quotes')
        .select('id, status, total_price, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z'),

      // Sales order items for product categories
      supabase
        .from('sales_order_items')
        .select(`
          quantity,
          unit_price,
          product_id,
          products(name, category)
        `),

      // Sales orders for trend (last 7 days)
      supabase
        .from('sales_orders')
        .select('id, final_price, created_at')
        .gte('created_at', trendStartDate)
        .lte('created_at', new Date().toISOString()),

      // Sales orders for status breakdown (all active orders)
      supabase
        .from('sales_orders')
        .select('id, status, created_at, final_price')
        .order('created_at', { ascending: false }),

      // Invoices for payment collection (all invoices) with sales order status
      supabase
        .from('invoices')
        .select(`
          id, 
          total, 
          paid_amount, 
          status, 
          created_at,
          sales_order_id
        `)
        .order('created_at', { ascending: false })
        .limit(1000),

      // Payments linked to invoices
      supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false })
        .limit(1000)
    ]);

    if (salesOrdersResult.error) {
      console.error('❌ Error fetching sales orders:', salesOrdersResult.error);
    }
    if (trendOrdersResult.error) {
      console.error('❌ Error fetching trend orders:', trendOrdersResult.error);
    }
    if (statusOrdersResult.error) {
      console.error('❌ Error fetching status orders:', statusOrdersResult.error);
    }
    if (invoicesResult.error) {
      console.error('❌ Error fetching invoices:', invoicesResult.error);
    }
    if (paymentsResult.error) {
      console.error('❌ Error fetching payments:', paymentsResult.error);
    }

    console.log('💳 Invoices fetched:', {
      count: invoicesResult.data?.length || 0,
      sample: invoicesResult.data?.slice(0, 3)
    });

    console.log('💰 Payments fetched:', {
      count: paymentsResult.data?.length || 0,
      sample: paymentsResult.data?.slice(0, 3)
    });

    // Calculate Sales Revenue
    const salesRevenue = salesOrdersResult.data?.reduce((sum, order) => 
      sum + (order.final_price || 0), 0
    ) || 0;

    // Calculate Average Order Value
    const orderCount = salesOrdersResult.data?.length || 0;
    const avgOrderValue = orderCount > 0 ? Math.round(salesRevenue / orderCount) : 0;

    // Calculate Conversion Rate (Orders / Leads * 100)
    const leadsCount = leadsResult.data?.length || 0;
    const ordersCount = salesOrdersResult.data?.length || 0;
    const conversionRate = leadsCount > 0 
      ? parseFloat(((ordersCount / leadsCount) * 100).toFixed(1))
      : 0;

    console.log('📊 Conversion Rate Calculation:', {
      leadsCount,
      ordersCount,
      conversionRate,
      dateRange: { startDate, endDate }
    });

    // Active Customers (unique customers who placed orders)
    const activeCustomers = new Set(
      salesOrdersResult.data?.map(order => order.customer_id).filter(Boolean)
    ).size;

    // Customer Acquisition Cost (simplified - you can fetch marketing expenses later)
    const marketingExpenses = 0; // TODO: Fetch from expenses table with category 'marketing'
    const cac = activeCustomers > 0 ? Math.round(marketingExpenses / activeCustomers) : 0;

    // Sales Trend (last 7 days)
    const salesTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySales = trendOrdersResult.data?.filter(order => 
        order.created_at?.startsWith(dateStr)
      ).reduce((sum, order) => sum + (order.final_price || 0), 0) || 0;

      const dayOrders = trendOrdersResult.data?.filter(order => 
        order.created_at?.startsWith(dateStr)
      ).length || 0;

      salesTrend.push({
        date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        sales: daySales,
        orders: dayOrders
      });
    }

    console.log('📈 Sales Trend Calculation:', {
      trendDataPoints: trendOrdersResult.data?.length || 0,
      calculatedTrend: salesTrend
    });

    // Sales Order Status Breakdown
    const statusCounts: Record<string, number> = {};
    const totalOrders = statusOrdersResult.data?.length || 0;
    
    console.log('🔍 Sales Orders Data for Status:', {
      totalOrdersFound: totalOrders,
      sampleOrders: statusOrdersResult.data?.slice(0, 5).map(o => ({ id: o.id, status: o.status, created_at: o.created_at })),
      allStatuses: statusOrdersResult.data?.map(o => o.status)
    });
    
    statusOrdersResult.data?.forEach(order => {
      const status = order.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Define order status labels
    const statusLabels: Record<string, string> = {
      'draft': 'Draft',
      'confirmed': 'Confirmed',
      'shipped': 'Shipped',
      'delivered': 'Delivered',
      'ready_for_delivery': 'Ready for Delivery',
      'partial_delivery_ready': 'Partial Delivery Ready',
      'cancelled': 'Cancelled',
      'unknown': 'Unknown'
    };

    const orderStatusBreakdown = Object.entries(statusCounts)
      .map(([status, count]) => ({
        stage: statusLabels[status] || status,
        count,
        percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    console.log('📊 Order Status Breakdown:', {
      totalOrders,
      statusCounts,
      breakdown: orderStatusBreakdown
    });

    // Product Revenue - aggregate by product name instead of category
    const productStats: Record<string, number> = {};
    const unknownProductItems: Array<{ 
      productId: string | null; 
      productName: string | undefined;
      quantity: number;
      unitPrice: number;
      revenue: number;
    }> = [];
    
    itemsResult.data?.forEach((item) => {
      const productData = item.products as { name?: string; id?: string } | null;
      const productName = productData?.name || 'Unknown Product';
      const revenue = (item.quantity || 0) * (item.unit_price || 0);
      
      productStats[productName] = (productStats[productName] || 0) + revenue;
      
      // Track items with missing/null product names
      if (!productData?.name) {
        unknownProductItems.push({
          productId: item.product_id,
          productName: productData?.name,
          quantity: item.quantity || 0,
          unitPrice: item.unit_price || 0,
          revenue
        });
      }
    });

    console.log('📦 Product Revenue Analysis:', {
      totalProducts: Object.keys(productStats).length,
      unknownProductCount: unknownProductItems.length,
      unknownProductRevenue: productStats['Unknown Product'] || 0,
      unknownProductSample: unknownProductItems.slice(0, 20).map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        revenue: item.revenue
      })),
      topProducts: Object.entries(productStats)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, revenue]) => ({ name, revenue }))
    });

    // Get top 10 products, excluding "Unknown Product"
    const productCategories = Object.entries(productStats)
      .filter(([name]) => name !== 'Unknown Product')
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Top Salespeople
    const salesBySalesRep: Record<string, { sales: number; orders: number }> = {};
    
    salesOrdersResult.data?.forEach(order => {
      const repId = order.sales_representative_id || 'unassigned';
      if (!salesBySalesRep[repId]) {
        salesBySalesRep[repId] = { sales: 0, orders: 0 };
      }
      salesBySalesRep[repId].sales += order.final_price || 0;
      salesBySalesRep[repId].orders += 1;
    });

    // Fetch user names for sales representatives
    const repIds = Object.keys(salesBySalesRep).filter(id => id !== 'unassigned');
    let salesRepNames: Record<string, string> = {};
    
    if (repIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', repIds);
      
      salesRepNames = users?.reduce((acc, user) => {
        acc[user.id] = user.name || 'Unknown';
        return acc;
      }, {} as Record<string, string>) || {};
    }

    const topSalespeople = Object.entries(salesBySalesRep)
      .map(([id, data]) => ({
        name: salesRepNames[id] || 'Unassigned',
        sales: Math.round(data.sales),
        orders: data.orders
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
    
    console.log('👥 Top Salespeople:', {
      totalReps: Object.keys(salesBySalesRep).length,
      topSalespeople
    });

    // Payment Collection Analysis
    const invoices = invoicesResult.data || [];
    
    console.log('💳 Invoice Query Result:', {
      error: invoicesResult.error,
      count: invoices.length,
      sample: invoices.slice(0, 2),
      hasData: invoices.length > 0
    });
    
    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaidAmount = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalPendingAmount = totalInvoiceAmount - totalPaidAmount;
    
    // Categorize orders by payment status based on actual amounts
    const invoicesByOrderId: Record<string, { total: number; paid: number }> = {};
    invoices.forEach(inv => {
      const orderId = inv.sales_order_id;
      if (orderId) {
        if (!invoicesByOrderId[orderId]) {
          invoicesByOrderId[orderId] = { total: 0, paid: 0 };
        }
        invoicesByOrderId[orderId].total += inv.total || 0;
        invoicesByOrderId[orderId].paid += inv.paid_amount || 0;
      }
    });

    let fullyPaidOrdersCount = 0;
    let partiallyPaidOrdersCount = 0;
    let unpaidOrdersCount = 0;

    Object.values(invoicesByOrderId).forEach(orderInvoice => {
      const total = orderInvoice.total;
      const paid = orderInvoice.paid;
      
      if (paid >= total && total > 0) {
        fullyPaidOrdersCount++;
      } else if (paid > 0 && paid < total) {
        partiallyPaidOrdersCount++;
      } else {
        unpaidOrdersCount++;
      }
    });

    const collectionRate = totalInvoiceAmount > 0 
      ? ((totalPaidAmount / totalInvoiceAmount) * 100).toFixed(1)
      : '0.0';

    console.log('💰 Payment Status Breakdown:', {
      fullyPaid: fullyPaidOrdersCount,
      partiallyPaid: partiallyPaidOrdersCount,
      unpaid: unpaidOrdersCount,
      total: Object.keys(invoicesByOrderId).length
    });

    // Payment Collection by Order Status
    const orderStatusLabels: Record<string, string> = {
      draft: 'Draft',
      confirmed: 'Confirmed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      ready_for_delivery: 'Ready for Delivery',
      partial_delivery_ready: 'Partial Delivery Ready'
    };

    const paymentByStatus: Record<string, { total: number; collected: number; pending: number; invoiceCount: number }> = {};
    
    // Create a map of order_id to status from statusOrdersResult
    const orderStatusMap: Record<string, string> = {};
    statusOrdersResult.data?.forEach(order => {
      orderStatusMap[order.id] = order.status;
    });
    
    invoices.forEach(inv => {
      const orderId = inv.sales_order_id;
      const orderStatus = orderId ? (orderStatusMap[orderId] || 'no_order') : 'no_order';
      
      if (!paymentByStatus[orderStatus]) {
        paymentByStatus[orderStatus] = { total: 0, collected: 0, pending: 0, invoiceCount: 0 };
      }
      
      const total = inv.total || 0;
      const collected = inv.paid_amount || 0;
      const pending = total - collected;
      
      paymentByStatus[orderStatus].total += total;
      paymentByStatus[orderStatus].collected += collected;
      paymentByStatus[orderStatus].pending += pending;
      paymentByStatus[orderStatus].invoiceCount += 1;
    });

    console.log('📊 Payment by Status:', paymentByStatus);

    const paymentByOrderStatus = Object.entries(paymentByStatus)
      .map(([status, data]) => ({
        status: orderStatusLabels[status] || status,
        statusKey: status,
        totalAmount: Math.round(data.total),
        collectedAmount: Math.round(data.collected),
        pendingAmount: Math.round(data.pending),
        invoiceCount: data.invoiceCount,
        collectionRate: data.total > 0 ? parseFloat(((data.collected / data.total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Fallback: If no invoices, use sales orders data with payments
    let paymentCollection;
    if (invoices.length === 0) {
      console.log('⚠️ No invoices found, using sales orders as fallback');
      
      const orderPaymentByStatus: Record<string, { total: number; collected: number; orderCount: number }> = {};
      
      statusOrdersResult.data?.forEach(order => {
        const status = order.status;
        const orderTotal = order.final_price || 0;
        const collected = 0; // No invoices = no payments tracked
        
        if (!orderPaymentByStatus[status]) {
          orderPaymentByStatus[status] = { total: 0, collected: 0, orderCount: 0 };
        }
        orderPaymentByStatus[status].total += orderTotal;
        orderPaymentByStatus[status].collected += collected;
        orderPaymentByStatus[status].orderCount += 1;
      });

      const fallbackPaymentByStatus = Object.entries(orderPaymentByStatus)
        .map(([status, data]) => ({
          status: orderStatusLabels[status] || status,
          statusKey: status,
          totalAmount: Math.round(data.total),
          collectedAmount: Math.round(data.collected),
          pendingAmount: Math.round(data.total - data.collected),
          invoiceCount: data.orderCount,
          collectionRate: data.total > 0 ? parseFloat(((data.collected / data.total) * 100).toFixed(1)) : 0
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);

      const totalOrderAmount = statusOrdersResult.data?.reduce((sum, order) => sum + (order.final_price || 0), 0) || 0;

      const fullyPaidCount = 0;
      const partiallyPaidCount = 0;
      const unpaidCount = statusOrdersResult.data?.length || 0;

      paymentCollection = {
        totalAmount: Math.round(totalOrderAmount),
        collectedAmount: 0,
        pendingAmount: Math.round(totalOrderAmount),
        collectionRate: 0,
        invoiceBreakdown: {
          paid: fullyPaidCount,
          partial: partiallyPaidCount,
          unpaid: unpaidCount,
          total: statusOrdersResult.data?.length || 0
        },
        byOrderStatus: fallbackPaymentByStatus,
        isEstimate: true // Flag to indicate this is based on orders, not invoices
      };
      
      console.log('📊 Fallback Payment Collection:', paymentCollection);
    } else {
      paymentCollection = {
        totalAmount: Math.round(totalInvoiceAmount),
        collectedAmount: Math.round(totalPaidAmount),
        pendingAmount: Math.round(totalPendingAmount),
        collectionRate: parseFloat(collectionRate),
        invoiceBreakdown: {
          paid: fullyPaidOrdersCount,
          partial: partiallyPaidOrdersCount,
          unpaid: unpaidOrdersCount,
          total: Object.keys(invoicesByOrderId).length
        },
        byOrderStatus: paymentByOrderStatus,
        isEstimate: false
      };
    }

    console.log('💰 Payment Collection:', paymentCollection);

    const response = {
      success: true,
      data: {
        salesRevenue: Math.round(salesRevenue),
        avgOrderValue,
        conversionRate,
        activeCustomers,
        cac,
        salesTrend,
        orderStatusBreakdown,
        productCategories,
        topSalespeople,
        paymentCollection,
        summary: {
          totalOrders: orderCount,
          totalLeads: leadsCount,
          totalQuotes: quotesResult.data?.length || 0,
          statusBreakdown: statusCounts
        }
      }
    };

    console.log('✅ Sales Dashboard Data:', response.data);

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error fetching sales data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch sales data' 
      },
      { status: 500 }
    );
  }
}
