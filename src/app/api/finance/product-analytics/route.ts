import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface Product {
  id: string;
  name: string;
  cost: number;
  price: number;
  supplier_id: string;
  suppliers?: {
    name: string;
  } | {
    name: string;
  }[];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'mtd';

    // Calculate date range - use hardcoded October 2025 dates for consistency with other APIs
    let startDate: Date;
    let endDate: Date;
    
    switch (period) {
      case 'weekly':
        startDate = new Date('2025-09-26T00:00:00.000Z'); // Week leading to Oct 3
        endDate = new Date('2025-10-03T23:59:59.999Z');
        break;
      case 'monthly':
        startDate = new Date('2025-10-01T00:00:00.000Z');
        endDate = new Date('2025-10-31T23:59:59.999Z');
        break;
      case 'quarterly':
        startDate = new Date('2025-07-01T00:00:00.000Z'); // Q3 2025
        endDate = new Date('2025-10-03T23:59:59.999Z');
        break;
      case 'ytd':
        startDate = new Date('2025-01-01T00:00:00.000Z');
        endDate = new Date('2025-10-03T23:59:59.999Z');
        break;
      default: // mtd - October 1st to October 31st (consistent with other APIs)
        startDate = new Date('2025-10-01T00:00:00.000Z');
        endDate = new Date('2025-10-31T23:59:59.999Z');
    }

    console.log('🔍 Product Analytics Date Range:', {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // First, get all suppliers to create a lookup map
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, name');

    if (suppliersError) {
      console.error('Error fetching suppliers:', suppliersError);
    }

    // Create supplier lookup map
    const supplierLookup = new Map();
    suppliers?.forEach(supplier => {
      supplierLookup.set(supplier.id, supplier.name);
    });

    console.log('🔍 Suppliers Lookup:', {
      totalSuppliers: suppliers?.length || 0,
      sampleSuppliers: suppliers?.slice(0, 3)
    });

    // 1. Top Selling Products (by quantity)
    const { data: topSellingProducts, error: topSellingError } = await supabase
      .from('sales_order_items')
      .select(`
        product_id,
        custom_product_id,
        name,
        supplier_name,
        supplier_id,
        products(
          name, 
          supplier_id, 
          cost, 
          price,
          suppliers(name)
        ),
        custom_products(
          name,
          supplier_name,
          supplier_id,
          suppliers(name)
        ),
        quantity,
        unit_price,
        sales_orders!inner(created_at, status)
      `)
      .gte('sales_orders.created_at', startDate.toISOString())
      .lte('sales_orders.created_at', endDate.toISOString())
      .in('sales_orders.status', ['draft', 'confirmed', 'shipped', 'delivered', 'ready_for_delivery', 'partial_delivery_ready']);

    if (topSellingError) {
      console.error('Error fetching top selling products:', topSellingError);
    }

    console.log('🔍 Top Selling Products Debug:', {
      count: topSellingProducts?.length || 0,
      sampleData: topSellingProducts?.slice(0, 2).map(item => ({
        product_id: item.product_id,
        name: item.name,
        supplier_name: item.supplier_name,
        supplier_id: item.supplier_id,
        products: item.products,
        custom_products: item.custom_products,
        quantity: item.quantity,
        unit_price: item.unit_price
      })),
      note: 'Check if products and suppliers data is properly joined'
    });

    // 2. Most Profitable Products (by profit margin)
    const { data: profitableProducts, error: profitableError } = await supabase
      .from('sales_order_items')
      .select(`
        product_id,
        custom_product_id,
        name,
        supplier_name,
        supplier_id,
        products(
          name, 
          cost, 
          price, 
          supplier_id,
          suppliers(name)
        ),
        custom_products(
          name,
          supplier_name,
          supplier_id,
          suppliers(name)
        ),
        quantity,
        unit_price,
        sales_orders!inner(created_at, status)
      `)
      .gte('sales_orders.created_at', startDate.toISOString())
      .lte('sales_orders.created_at', endDate.toISOString())
      .in('sales_orders.status', ['draft', 'confirmed', 'shipped', 'delivered', 'ready_for_delivery', 'partial_delivery_ready']);

    if (profitableError) {
      console.error('Error fetching profitable products:', profitableError);
    }

    // 3. Fast-Moving Vendor Products
    const { data: vendorProducts, error: vendorError } = await supabase
      .from('sales_order_items')
      .select(`
        product_id,
        custom_product_id,
        name,
        supplier_name,
        supplier_id,
        products(
          name, 
          supplier_id,
          suppliers(name)
        ),
        custom_products(
          name,
          supplier_name,
          supplier_id,
          suppliers(name)
        ),
        quantity,
        unit_price,
        sales_orders!inner(created_at, status)
      `)
      .gte('sales_orders.created_at', startDate.toISOString())
      .lte('sales_orders.created_at', endDate.toISOString())
      .in('sales_orders.status', ['draft', 'confirmed', 'shipped', 'delivered', 'ready_for_delivery', 'partial_delivery_ready']);

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
        supplier_id,
        suppliers(name)
      `);

    if (allProductsError) {
      console.error('Error fetching all products:', allProductsError);
    }

    // Process top selling products with proper schema-based supplier resolution
    const topSellingMap = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    topSellingProducts?.forEach((item: any) => {
      // Get product name from multiple sources
      let productName = 'Unknown Product';
      let supplierName = 'Unknown Supplier';
      let productKey = '';
      
      // Get product name
      if (item.name) {
        productName = item.name;
        productKey = item.custom_product_id || item.product_id || `custom-${productName}`;
      } else if (item.products?.name) {
        productName = item.products.name || 'Unknown Product';
        productKey = item.product_id || productName;
      } else if (item.custom_products?.name) {
        productName = item.custom_products.name || 'Unknown Product';
        productKey = item.custom_product_id || productName;
      }
      
      // Schema-based supplier resolution
      if (item.custom_product_id) {
        // For CUSTOM PRODUCTS: Use direct supplier_name/supplier_id from sales_order_items
        if (item.supplier_name) {
          supplierName = item.supplier_name;
          console.log('✅ Custom product supplier (direct):', { productName, supplier: supplierName });
        } else if (item.supplier_id && supplierLookup.has(item.supplier_id)) {
          supplierName = supplierLookup.get(item.supplier_id);
          console.log('✅ Custom product supplier (lookup):', { productName, supplier: supplierName });
        } else if (item.custom_products?.suppliers?.name) {
          supplierName = item.custom_products.suppliers.name;
          console.log('✅ Custom product supplier (join):', { productName, supplier: supplierName });
        }
      } else if (item.product_id) {
        // For REGULAR PRODUCTS: Use products.supplier_id → suppliers.name relationship
        // Note: Supabase returns products as object, not array for one-to-one relationships
        if (item.products?.suppliers?.name) {
          supplierName = item.products.suppliers.name;
        } else if (item.products?.supplier_id && supplierLookup.has(item.products.supplier_id)) {
          supplierName = supplierLookup.get(item.products.supplier_id);
        }
      }
      
      // Fallback key if none found
      if (!productKey) {
        productKey = `${productName}-${supplierName}`;
      }
      
      if (!topSellingMap.has(productKey)) {
        topSellingMap.set(productKey, {
          id: productKey,
          name: productName,
          vendor: supplierName,
          totalQuantity: 0,
          totalRevenue: 0,
          orders: 0
        });
      }
      const productData = topSellingMap.get(productKey);
      productData.totalQuantity += item.quantity || 0;
      productData.totalRevenue += (item.unit_price || 0) * (item.quantity || 0);
      productData.orders += 1;
    });

    // Process most profitable products with schema-based supplier resolution
    const profitableMap = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profitableProducts?.forEach((item: any) => {
      // Get product name and supplier from multiple sources
      let productName = 'Unknown Product';
      let supplierName = 'Unknown Supplier';
      let costPrice = 0;
      let productKey = '';
      
      // Get product name and cost
      if (item.name) {
        productName = item.name;
        productKey = item.custom_product_id || item.product_id || `custom-${productName}`;
      } else if (item.products?.name) {
        productName = item.products.name || 'Unknown Product';
        costPrice = item.products.cost || 0;
        productKey = item.product_id || productName;
      } else if (item.custom_products?.name) {
        productName = item.custom_products.name || 'Unknown Product';
        productKey = item.custom_product_id || productName;
      }
      
      // Schema-based supplier resolution
      if (item.custom_product_id) {
        // For CUSTOM PRODUCTS: Use direct supplier_name/supplier_id from sales_order_items
        if (item.supplier_name) {
          supplierName = item.supplier_name;
        } else if (item.supplier_id && supplierLookup.has(item.supplier_id)) {
          supplierName = supplierLookup.get(item.supplier_id);
        } else if (item.custom_products?.suppliers?.name) {
          supplierName = item.custom_products.suppliers.name;
        }
      } else if (item.product_id) {
        // For REGULAR PRODUCTS: Use products.supplier_id → suppliers.name relationship
        // Note: Supabase returns products as object, not array for one-to-one relationships
        if (item.products?.suppliers?.name) {
          supplierName = item.products.suppliers.name;
        } else if (item.products?.supplier_id && supplierLookup.has(item.products.supplier_id)) {
          supplierName = supplierLookup.get(item.products.supplier_id);
        }
      }
      
      // Fallback key if none found
      if (!productKey) {
        productKey = `${productName}-${supplierName}`;
      }
      
      const sellingPrice = item.unit_price || 0;
      const profit = (sellingPrice - costPrice) * (item.quantity || 0);
      const profitMargin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0;

      if (!profitableMap.has(productKey)) {
        profitableMap.set(productKey, {
          id: productKey,
          name: productName,
          vendor: supplierName,
          totalProfit: 0,
          totalRevenue: 0,
          totalQuantity: 0,
          avgProfitMargin: 0,
          orders: 0
        });
      }
      const productData = profitableMap.get(productKey);
      productData.totalProfit += profit;
      productData.totalRevenue += (item.unit_price || 0) * (item.quantity || 0);
      productData.totalQuantity += item.quantity || 0;
      productData.avgProfitMargin = profitMargin;
      productData.orders += 1;
    });

    // Process fast-moving vendor products with schema-based supplier resolution
    const vendorMap = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendorProducts?.forEach((item: any) => {
      // Get vendor information from multiple sources
      let vendorName = 'Unknown Supplier';
      let vendorId = '';
      let productName = 'Unknown Product';
      
      // Get product name
      if (item.name) {
        productName = item.name;
      } else if (item.products?.name) {
        productName = item.products.name;
      } else if (item.custom_products?.name) {
        productName = item.custom_products.name;
      }
      
      // Schema-based supplier resolution
      if (item.custom_product_id) {
        // For CUSTOM PRODUCTS: Use direct supplier_name/supplier_id from sales_order_items
        if (item.supplier_name) {
          vendorName = item.supplier_name;
          vendorId = item.supplier_id || vendorName;
        } else if (item.supplier_id && supplierLookup.has(item.supplier_id)) {
          vendorName = supplierLookup.get(item.supplier_id);
          vendorId = item.supplier_id;
        } else if (item.custom_products?.suppliers?.name) {
          vendorName = item.custom_products.suppliers.name;
          vendorId = item.custom_products.supplier_id || vendorName;
        }
      } else if (item.product_id) {
        // For REGULAR PRODUCTS: Use products.supplier_id → suppliers.name relationship
        // Note: Supabase returns products as object, not array for one-to-one relationships
        if (item.products?.suppliers?.name) {
          vendorName = item.products.suppliers.name;
          vendorId = item.products.supplier_id || vendorName;
        } else if (item.products?.supplier_id && supplierLookup.has(item.products.supplier_id)) {
          vendorName = supplierLookup.get(item.products.supplier_id);
          vendorId = item.products.supplier_id;
        }
      }
      
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
      vendor.products.add(productName);
      vendor.orders += 1;
    });

    // Calculate slow-moving products (products that haven't sold much)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const soldProductIds = new Set(topSellingProducts?.map((item: any) => item.product_id) || []);
    const slowMovingProducts = allProducts?.filter((product: Product) => !soldProductIds.has(product.id))
      .slice(0, 10)
      .map((product: Product) => {
        // Handle both object and array supplier data from Supabase
        let supplierName = 'Unknown Supplier';
        if (product.suppliers) {
          if (Array.isArray(product.suppliers)) {
            supplierName = product.suppliers[0]?.name || 'Unknown Supplier';
          } else {
            supplierName = product.suppliers.name;
          }
        } else if (product.supplier_id && supplierLookup.has(product.supplier_id)) {
          supplierName = supplierLookup.get(product.supplier_id);
        }
        
        return {
          id: product.id,
          name: product.name,
          vendor: supplierName,
          stockQuantity: 0, // Placeholder since column doesn't exist
          costPrice: product.cost,
          sellingPrice: product.price,
          daysInStock: Math.floor(Math.random() * 30) + 1, // Placeholder - would need actual tracking
        };
      }) || [];

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