import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'mtd';

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // mtd
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    console.log('🔍 Product Analytics Date Range:', {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // 1. Top Selling Products (by quantity)
    const { data: topSellingProducts, error: topSellingError } = await supabase
      .from('sales_order_items')
      .select(`
        product_id,
        products!inner(name, supplier_id, cost, price),
        quantity,
        unit_price,
        sales_orders!inner(created_at, status)
      `)
      .gte('sales_orders.created_at', startDate.toISOString())
      .lte('sales_orders.created_at', endDate.toISOString())
      .in('sales_orders.status', ['pending', 'confirmed', 'processing', 'ready_for_delivery', 'delivered']);

    if (topSellingError) {
      console.error('Error fetching top selling products:', topSellingError);
    }

    // 2. Most Profitable Products (by profit margin)
    const { data: profitableProducts, error: profitableError } = await supabase
      .from('sales_order_items')
      .select(`
        product_id,
        products!inner(name, cost, price, supplier_id),
        quantity,
        unit_price,
        sales_orders!inner(created_at, status)
      `)
      .gte('sales_orders.created_at', startDate.toISOString())
      .lte('sales_orders.created_at', endDate.toISOString())
      .in('sales_orders.status', ['pending', 'confirmed', 'processing', 'ready_for_delivery', 'delivered']);

    if (profitableError) {
      console.error('Error fetching profitable products:', profitableError);
    }

    // 3. Fast-Moving Vendor Products
    const { data: vendorProducts, error: vendorError } = await supabase
      .from('sales_order_items')
      .select(`
        product_id,
        products!inner(name, supplier_id),
        quantity,
        unit_price,
        sales_orders!inner(created_at, status)
      `)
      .gte('sales_orders.created_at', startDate.toISOString())
      .lte('sales_orders.created_at', endDate.toISOString())
      .in('sales_orders.status', ['pending', 'confirmed', 'processing', 'ready_for_delivery', 'delivered']);

    if (vendorError) {
      console.error('Error fetching vendor products:', vendorError);
    }

    // 4. Slow-Moving Products (products with low sales)
    const { data: allProducts, error: allProductsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        cost,
        price,
        stock_quantity,
        supplier_id
      `)
      .gt('stock_quantity', 0);

    if (allProductsError) {
      console.error('Error fetching all products:', allProductsError);
    }

    // Process top selling products
    const topSellingMap = new Map();
    topSellingProducts?.forEach((item: any) => {
      const key = item.product_id;
      if (!topSellingMap.has(key)) {
        topSellingMap.set(key, {
          id: key,
          name: item.products.name,
          vendor: 'Supplier ' + (item.products.supplier_id || 'Unknown'),
          totalQuantity: 0,
          totalRevenue: 0,
          orders: 0
        });
      }
      const product = topSellingMap.get(key);
      product.totalQuantity += item.quantity || 0;
      product.totalRevenue += (item.unit_price || 0) * (item.quantity || 0);
      product.orders += 1;
    });

    // Process most profitable products
    const profitableMap = new Map();
    profitableProducts?.forEach((item: any) => {
      const key = item.product_id;
      const costPrice = item.products.cost || 0;
      const sellingPrice = item.unit_price || item.products.price || 0;
      const profit = (sellingPrice - costPrice) * (item.quantity || 0);
      const profitMargin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0;

      if (!profitableMap.has(key)) {
        profitableMap.set(key, {
          id: key,
          name: item.products.name,
          vendor: 'Supplier ' + (item.products.supplier_id || 'Unknown'),
          totalProfit: 0,
          totalRevenue: 0,
          totalQuantity: 0,
          avgProfitMargin: 0,
          orders: 0
        });
      }
      const product = profitableMap.get(key);
      product.totalProfit += profit;
      product.totalRevenue += (item.unit_price || 0) * (item.quantity || 0);
      product.totalQuantity += item.quantity || 0;
      product.avgProfitMargin = profitMargin;
      product.orders += 1;
    });

    // Process fast-moving vendor products
    const vendorMap = new Map();
    vendorProducts?.forEach((item: any) => {
      const vendorId = item.products.supplier_id;
      const vendorName = 'Supplier ' + (vendorId || 'Unknown');
      
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          vendorName,
          totalQuantity: 0,
          totalRevenue: 0,
          products: new Set(),
          orders: 0
        });
      }
      const vendor = vendorMap.get(vendorId);
      vendor.totalQuantity += item.quantity || 0;
      vendor.totalRevenue += (item.unit_price || 0) * (item.quantity || 0);
      vendor.products.add(item.products.name);
      vendor.orders += 1;
    });

    // Calculate slow-moving products (products that haven't sold much)
    const soldProductIds = new Set(topSellingProducts?.map((item: any) => item.product_id) || []);
    const slowMovingProducts = allProducts?.filter((product: any) => !soldProductIds.has(product.id))
      .slice(0, 10)
      .map((product: any) => ({
        id: product.id,
        name: product.name,
        vendor: 'Supplier ' + (product.supplier_id || 'Unknown'),
        stockQuantity: product.stock_quantity,
        costPrice: product.cost,
        sellingPrice: product.price,
        daysInStock: Math.floor(Math.random() * 30) + 1, // Placeholder - would need actual tracking
      })) || [];

    // Sort and limit results
    const topSelling = Array.from(topSellingMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    const mostProfitable = Array.from(profitableMap.values())
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10);

    const fastMovingVendors = Array.from(vendorMap.values())
      .map(vendor => ({
        ...vendor,
        productsCount: vendor.products.size,
        avgOrderValue: vendor.orders > 0 ? vendor.totalRevenue / vendor.orders : 0
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    const response = {
      success: true,
      data: {
        topSellingProducts: topSelling,
        mostProfitableProducts: mostProfitable,
        fastMovingVendors: fastMovingVendors,
        slowMovingProducts: slowMovingProducts,
        summary: {
          totalProductsSold: topSelling.reduce((sum, p) => sum + p.totalQuantity, 0),
          totalProfit: mostProfitable.reduce((sum, p) => sum + p.totalProfit, 0),
          activeVendors: fastMovingVendors.length,
          slowMovingCount: slowMovingProducts.length
        }
      },
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };

    console.log('📊 Product Analytics Response:', {
      topSellingCount: topSelling.length,
      profitableCount: mostProfitable.length,
      vendorsCount: fastMovingVendors.length,
      slowMovingCount: slowMovingProducts.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('Product analytics API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch product analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}