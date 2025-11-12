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
    
    console.log('📦 Fetching Inventory Dashboard Data:', { startDate, endDate });

    // Fetch all required data in parallel
    const [
      inventoryResult,
      productsResult,
      salesOrderItemsResult
    ] = await Promise.all([
      // Inventory items - use inventory_items table (not inventory)
      supabase
        .from('inventory_items')
        .select('id, product_id, quantity, updated_at'),

      // Products - using correct field names: cost and price (not cost_price and selling_price)
      supabase
        .from('products')
        .select('id, name, category, price, cost'),

      // Sales order items for COGS and Products Sold (All time)
      // Name is already in sales_order_items table!
      supabase
        .from('sales_order_items')
        .select('id, quantity, unit_price, product_id, final_price, order_id, name')
        .limit(1000)
    ]);

    // Calculate Total Inventory Value - join with products for cost
    const inventoryValue = inventoryResult.data?.reduce((sum, item) => {
      const product = productsResult.data?.find(p => p.id === item.product_id);
      const itemCost = product?.cost || 0;
      return sum + ((item.quantity || 0) * itemCost);
    }, 0) || 0;

    // Calculate Stock Turnover
    const totalSalesQty = salesOrderItemsResult.data?.reduce((sum, item) => 
      sum + (item.quantity || 0), 0
    ) || 0;
    const avgInventoryQty = inventoryResult.data?.reduce((sum, item) => 
      sum + (item.quantity || 0), 0
    ) || 1;
    const stockTurnover = avgInventoryQty > 0 
      ? (totalSalesQty / avgInventoryQty * 12).toFixed(1)
      : '0.0';

    // Low & Overstock Items
    const lowStockItems = inventoryResult.data?.filter(item => (item.quantity || 0) < 10).length || 0;
    const overstockItems = inventoryResult.data?.filter(item => (item.quantity || 0) > 100).length || 0;

    // Calculate COGS
    const cogs = salesOrderItemsResult.data?.reduce((sum, item) => {
      const product = productsResult.data?.find(p => p.id === item.product_id);
      const costPrice = product?.cost || item.unit_price * 0.6;
      return sum + ((item.quantity || 0) * costPrice);
    }, 0) || 0;

    // Calculate Gross Margin
    const revenue = salesOrderItemsResult.data?.reduce((sum, item) => 
      sum + ((item.quantity || 0) * (item.unit_price || 0)), 0
    ) || 0;
    const grossMargin = revenue > 0 ? (((revenue - cogs) / revenue) * 100).toFixed(1) : '0.0';

    // Products Sold (by name and values) - Use data directly from sales_order_items
    const productsSoldMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    
    console.log('📦 Processing items:', {
      salesOrderItemsCount: salesOrderItemsResult.data?.length || 0,
      sampleItem: salesOrderItemsResult.data?.[0]
    });
    
    // Process sales_order_items - the name is already in the table!
    salesOrderItemsResult.data?.forEach((item) => {
      const productName = item.name || 'Unknown Product';
      // Use final_price which is the actual selling price after discounts
      const revenue = (item.quantity || 0) * (item.final_price || item.unit_price || 0);
      
      if (productName !== 'Unknown Product') {
        if (!productsSoldMap[productName]) {
          productsSoldMap[productName] = { name: productName, quantity: 0, revenue: 0 };
        }
        
        productsSoldMap[productName].quantity += item.quantity || 0;
        productsSoldMap[productName].revenue += revenue;
      }
    });

    const productsSold = Object.values(productsSoldMap)
      .filter(product => product.name !== 'Unknown Product') // Exclude unknown products
      .map(product => ({
        name: product.name,
        quantity: product.quantity,
        value: Math.round(product.revenue)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 products

    console.log('📦 Products Sold:', {
      totalProducts: Object.keys(productsSoldMap).length,
      finalCount: productsSold.length,
      topProducts: productsSold.slice(0, 3) // Show top 3 for debugging
    });
    
    // Current Stock Items with Cost and MRP - Aggregate by product name to avoid duplicates
    const stockItemsMap: Record<string, { name: string; quantity: number; totalCost: number; totalMrp: number }> = {};
    
    inventoryResult.data
      ?.filter(item => (item.quantity || 0) > 0) // Only items in stock
      .forEach(item => {
        const product = productsResult.data?.find(p => p.id === item.product_id);
        const productName = product?.name || item.product_id || 'Unknown';
        const costPrice = product?.cost || 0;
        const mrp = product?.price || 0;
        const itemTotalCost = (item.quantity || 0) * costPrice;
        const itemTotalMrp = (item.quantity || 0) * mrp;
        
        if (!stockItemsMap[productName]) {
          stockItemsMap[productName] = { 
            name: productName, 
            quantity: 0, 
            totalCost: 0, 
            totalMrp: 0 
          };
        }
        
        stockItemsMap[productName].quantity += item.quantity || 0;
        stockItemsMap[productName].totalCost += itemTotalCost;
        stockItemsMap[productName].totalMrp += itemTotalMrp;
      });
    
    const currentStockItems = Object.values(stockItemsMap)
      .sort((a, b) => b.totalMrp - a.totalMrp)
      .slice(0, 15) // Top 15 products by MRP value
      .map(item => ({
        name: item.name,
        quantity: item.quantity,
        totalCost: Math.round(item.totalCost),
        totalMrp: Math.round(item.totalMrp)
      }));

    console.log('📦 Products Sold:', productsSold.length, 'products');
    console.log('📊 Current Stock Items:', {
      uniqueProducts: currentStockItems.length,
      sample: currentStockItems.slice(0, 3)
    });

    // Stock Movement (last 7 days) - Using real data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Get purchase orders (inbound) for last 7 days
    const { data: recentPOs } = await supabase
      .from('purchase_order_items')
      .select('quantity, created_at')
      .gte('created_at', sevenDaysAgo.toISOString());
    
    // Get sales orders (outbound) for last 7 days - join with sales_orders for date
    const { data: recentSOs } = await supabase
      .from('sales_orders')
      .select(`
        created_at,
        sales_order_items:sales_order_items(quantity)
      `)
      .gte('created_at', sevenDaysAgo.toISOString());
    
    console.log('📊 Stock Movement Data:', {
      recentPOs: recentPOs?.length || 0,
      recentSOs: recentSOs?.length || 0,
      totalPOQty: recentPOs?.reduce((sum, po) => sum + (po.quantity || 0), 0) || 0,
      totalSOQty: recentSOs?.reduce((sum, so) => {
        const items = so.sales_order_items as Array<{ quantity?: number }> | undefined;
        return sum + (items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0);
      }, 0) || 0
    });
    
    const stockMovement = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Count inbound from purchase orders
      const inbound = recentPOs?.filter(po => 
        po.created_at?.startsWith(dateStr)
      ).reduce((sum, po) => sum + (po.quantity || 0), 0) || 0;
      
      // Count outbound from sales orders
      const outbound = recentSOs?.filter(so => 
        so.created_at?.startsWith(dateStr)
      ).reduce((sum, so) => {
        // Sum all item quantities in this order
        const items = so.sales_order_items as Array<{ quantity?: number }> | undefined;
        const orderQty = items?.reduce((itemSum, item) => 
          itemSum + (item.quantity || 0), 0) || 0;
        return sum + orderQty;
      }, 0) || 0;

      stockMovement.push({
        date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        inbound,
        outbound,
        net: inbound - outbound
      });
    }

    // Inventory Aging - use updated_at instead of last_updated, join with products for cost
    const agingRanges = {
      '0-30 days': { value: 0, items: 0 },
      '31-60 days': { value: 0, items: 0 },
      '61-90 days': { value: 0, items: 0 },
      '90+ days': { value: 0, items: 0 },
    };

    inventoryResult.data?.forEach(item => {
      const daysSinceUpdate = item.updated_at 
        ? Math.floor((now.getTime() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      
      const product = productsResult.data?.find(p => p.id === item.product_id);
      const itemValue = (item.quantity || 0) * (product?.cost || 0);
      
      if (daysSinceUpdate <= 30) {
        agingRanges['0-30 days'].value += itemValue;
        agingRanges['0-30 days'].items += 1;
      } else if (daysSinceUpdate <= 60) {
        agingRanges['31-60 days'].value += itemValue;
        agingRanges['31-60 days'].items += 1;
      } else if (daysSinceUpdate <= 90) {
        agingRanges['61-90 days'].value += itemValue;
        agingRanges['61-90 days'].items += 1;
      } else {
        agingRanges['90+ days'].value += itemValue;
        agingRanges['90+ days'].items += 1;
      }
    });

    const inventoryAging = Object.entries(agingRanges).map(([range, data]) => ({
      range,
      value: Math.round(data.value),
      items: data.items
    }));
    
    console.log('📊 Inventory Aging:', {
      totalInventoryItems: inventoryResult.data?.length || 0,
      itemsWithQuantity: inventoryResult.data?.filter(i => (i.quantity || 0) > 0).length || 0,
      agingSummary: inventoryAging
    });

    // Category Value Distribution
    const categoryValues: Record<string, number> = {};
    inventoryResult.data?.forEach(item => {
      const product = productsResult.data?.find(p => p.id === item.product_id);
      const category = product?.category || 'Others';
      const value = (item.quantity || 0) * (product?.cost || 0);
      categoryValues[category] = (categoryValues[category] || 0) + value;
    });

    const categoryValue = Object.entries(categoryValues)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Stock by Category (legacy support)
    const stockByCategory = Object.entries(categoryValues).map(([category, value]) => ({
      category,
      totalQuantity: 0,
      value: Math.round(value)
    }));

    // Low Stock Alerts (legacy support)
    const lowStockAlerts = inventoryResult.data
      ?.filter(item => (item.quantity || 0) < 10)
      .slice(0, 20)
      .map(item => {
        const product = productsResult.data?.find(p => p.id === item.product_id);
        return {
          id: item.id,
          name: product?.name || 'Unknown Product',
          currentStock: item.quantity || 0,
          reorderPoint: 10,
          category: product?.category || 'Unknown',
          supplier: 'Unknown'
        };
      }) || [];

    return NextResponse.json({
      success: true,
      data: {
        inventoryValue: Math.round(inventoryValue),
        stockTurnover,
        lowStockItems,
        overstockItems,
        cogs: Math.round(cogs),
        grossMargin,
        productsSold,
        currentStockItems,
        stockMovement,
        inventoryAging,
        categoryValue,
        stockByCategory,
        lowStockAlerts,
        summary: {
          totalItems: inventoryResult.data?.length || 0,
          totalProducts: productsResult.data?.length || 0,
          avgItemValue: inventoryResult.data && inventoryResult.data.length > 0
            ? Math.round(inventoryValue / inventoryResult.data.length)
            : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching inventory data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch inventory data' 
      },
      { status: 500 }
    );
  }
}
