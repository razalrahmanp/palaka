import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // Get current month date range
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    console.log('📊 Fetching Overview Dashboard Data:', { startDate, endDate });

    // Parallel fetch all required data
    const [
      salesOrdersResult,
      paymentsResult,
      expensesResult,
      bankAccountsResult,
      inventoryResult,
      salesOrderItemsResult,
      purchaseOrdersResult
    ] = await Promise.all([
      // Sales Orders (MTD)
      supabase
        .from('sales_orders')
        .select('id, final_price, status, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z'),

      // Payments (MTD)
      supabase
        .from('payments')
        .select('amount, date')
        .gte('date', startDate)
        .lte('date', endDate),

      // Expenses (MTD)
      supabase
        .from('expenses')
        .select('amount, date')
        .gte('date', startDate)
        .lte('date', endDate),

      // Bank Accounts (current balance)
      supabase
        .from('bank_accounts')
        .select('current_balance, account_type'),

      // Inventory (current value)
      supabase
        .from('inventory')
        .select('quantity, unit_cost'),

      // Sales Order Items for top products (MTD) - with order details
      supabase
        .from('sales_order_items')
        .select(`
          order_id,
          name,
          quantity,
          unit_price,
          final_price,
          discount_percentage
        `),

      // Purchase Orders (MTD) - for top suppliers
      supabase
        .from('purchase_orders')
        .select('supplier_id, suppliers(name), total, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59.999Z')
    ]);

    if (salesOrdersResult.error) throw salesOrdersResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    if (expensesResult.error) throw expensesResult.error;

    // Calculate metrics
    const revenue = salesOrdersResult.data?.reduce((sum, order) => sum + (order.final_price || 0), 0) || 0;
    const collected = paymentsResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    const pendingCollections = revenue - collected;
    const expenses = expensesResult.data?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    const profit = revenue - expenses;
    
    // Cash position (all bank accounts)
    const cashPosition = bankAccountsResult.data?.reduce((sum, account) => 
      sum + (account.current_balance || 0), 0
    ) || 0;

    // Active orders (pending, processing, in_production)
    const activeOrders = salesOrdersResult.data?.filter(order => 
      ['pending', 'processing', 'in_production'].includes(order.status)
    ).length || 0;

    // Inventory value
    const inventoryValue = inventoryResult.data?.reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.unit_cost || 0)), 0
    ) || 0;

    // Quick Ratio = (Cash + Receivables) / Current Liabilities
    // Simplified: Cash / (Pending Collections * 0.3)
    const currentLiabilities = Math.max(pendingCollections * 0.3, 1); // Prevent division by zero
    const quickRatio = cashPosition / currentLiabilities;

    // Revenue trend (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRevenue = salesOrdersResult.data?.filter(order => 
        order.created_at?.startsWith(dateStr)
      ).reduce((sum, order) => sum + (order.final_price || 0), 0) || 0;

      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
        profit: dayRevenue * 0.3 // Simplified profit calculation
      });
    }

    // Top Products by Revenue - Filter items from MTD orders
    const mtdOrderIds = new Set(salesOrdersResult.data?.map(order => order.id) || []);
    const productRevenue: Record<string, number> = {};
    
    console.log('🔍 Sales Order Items Debug:', {
      totalItems: salesOrderItemsResult.data?.length || 0,
      mtdOrdersCount: mtdOrderIds.size,
      sampleItem: salesOrderItemsResult.data?.[0],
      sampleMTDOrderId: Array.from(mtdOrderIds)[0]
    });

    let matchedItems = 0;
    salesOrderItemsResult.data?.forEach(item => {
      // Only include items from MTD orders
      if (mtdOrderIds.has(item.order_id)) {
        matchedItems++;
        const productName = item.name || 'Unknown Product';
        // Calculate revenue: use final_price if available, otherwise unit_price * quantity
        let itemRevenue = 0;
        if (item.final_price && item.final_price > 0) {
          itemRevenue = item.final_price;
        } else if (item.unit_price && item.quantity) {
          // Calculate with discount if applicable
          const basePrice = item.unit_price * item.quantity;
          const discount = item.discount_percentage || 0;
          itemRevenue = basePrice * (1 - discount / 100);
        }
        
        if (itemRevenue > 0) {
          productRevenue[productName] = (productRevenue[productName] || 0) + itemRevenue;
        }
      }
    });

    console.log('💰 Product Revenue Calculation:', {
      matchedItems,
      uniqueProducts: Object.keys(productRevenue).length,
      productRevenue
    });

    const topProducts = Object.entries(productRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    console.log('📦 Top Products Data:', {
      totalItems: salesOrderItemsResult.data?.length || 0,
      mtdOrderCount: mtdOrderIds.size,
      productCount: Object.keys(productRevenue).length,
      topProducts
    });

    // Top Suppliers by Order Count (MTD)
    const supplierOrders: Record<string, { count: number; totalValue: number }> = {};
    
    purchaseOrdersResult.data?.forEach(order => {
      const supplierName = (order.suppliers as { name?: string })?.name || 'Unknown Supplier';
      if (!supplierOrders[supplierName]) {
        supplierOrders[supplierName] = { count: 0, totalValue: 0 };
      }
      supplierOrders[supplierName].count++;
      supplierOrders[supplierName].totalValue += order.total || 0;
    });

    const topSuppliers = Object.entries(supplierOrders)
      .map(([name, data]) => ({ 
        name, 
        orders: data.count,
        value: Math.round(data.totalValue)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    console.log('🏭 Top Suppliers Data:', {
      totalPurchaseOrders: purchaseOrdersResult.data?.length || 0,
      uniqueSuppliers: Object.keys(supplierOrders).length,
      topSuppliers
    });

    const response = {
      success: true,
      data: {
        revenue: Math.round(revenue),
        profit: Math.round(profit),
        cashPosition: Math.round(cashPosition),
        pendingCollections: Math.round(pendingCollections),
        activeOrders,
        quickRatio: quickRatio.toFixed(2),
        inventoryValue: Math.round(inventoryValue),
        collected: Math.round(collected),
        expenses: Math.round(expenses),
        revenueTrend: last7Days,
        topProducts,
        topSuppliers,
        summary: {
          totalOrders: salesOrdersResult.data?.length || 0,
          avgOrderValue: salesOrdersResult.data?.length 
            ? Math.round(revenue / salesOrdersResult.data.length) 
            : 0,
          collectionRate: revenue > 0 
            ? Math.round((collected / revenue) * 100) 
            : 0
        }
      }
    };

    console.log('✅ Overview Dashboard Data:', response.data);

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error fetching overview data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch overview data' 
      },
      { status: 500 }
    );
  }
}
