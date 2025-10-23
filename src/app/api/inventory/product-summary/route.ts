import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET() {
  try {
    console.log('Fetching ALL inventory items from inventory_items table...');
    
    // Fetch ALL inventory items using pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allInventoryItems: any[] = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error, count } = await supabase
        .from('inventory_items')
        .select(`
          id,
          product_id,
          supplier_id,
          quantity,
          location,
          category,
          subcategory,
          material,
          products!inventory_items_product_id_fkey (
            id,
            name,
            sku,
            category,
            cost,
            price
          ),
          suppliers!inventory_items_supplier_id_fkey (
            id,
            name
          )
        `, { count: 'exact' })
        .range(from, from + batchSize - 1);

      if (error) {
        console.error('Error fetching inventory:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to fetch inventory items',
            details: error.message,
            hint: error.hint,
            code: error.code
          },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allInventoryItems = allInventoryItems.concat(data);
        from += batchSize;
        hasMore = data.length === batchSize;
        console.log(`📦 Batch ${Math.ceil(from/batchSize)}: Fetched ${data.length} items | Total: ${allInventoryItems.length}/${count || '?'} | HasMore: ${hasMore}`);
      } else {
        hasMore = false;
        console.log(`📦 No more data. Stopping pagination.`);
      }
    }

    const inventoryItems = allInventoryItems;
    const itemCount = inventoryItems?.length || 0;
    console.log(`✅ ========================================`);
    console.log(`✅ FINAL COUNT: ${itemCount} inventory items fetched from database`);
    console.log(`✅ ========================================`);

    // Fetch ALL sales data using pagination
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allSalesItems: any[] = [];
    let salesFrom = 0;
    let hasSalesMore = true;

    while (hasSalesMore) {
      const { data: salesData, error: salesError } = await supabase
        .from('sales_order_items')
        .select(`
          product_id,
          quantity,
          final_price,
          sales_orders!inner (
            created_at
          )
        `)
        .range(salesFrom, salesFrom + batchSize - 1);

      if (salesError) {
        console.error('Error fetching sales:', salesError);
        break;
      }

      if (salesData && salesData.length > 0) {
        allSalesItems = allSalesItems.concat(salesData);
        salesFrom += batchSize;
        hasSalesMore = salesData.length === batchSize;
      } else {
        hasSalesMore = false;
      }
    }

    const salesItems = allSalesItems;
    console.log(`✅ Fetched ${salesItems.length} sales order items`);

    // Group inventory by product_name (not product_id)
    const productMap = new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inventoryItems?.forEach((item: any) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const supplier = Array.isArray(item.suppliers) ? item.suppliers[0] : item.suppliers;
      
      if (!product) return;

      const productName = product.name || 'Unknown';
      
      if (!productMap.has(productName)) {
        productMap.set(productName, {
          product_name: productName,
          category: item.category || product.category || 'Uncategorized',
          subcategory: item.subcategory || '',
          variant_count: 0,
          skus: new Set(),
          total_quantity: 0,
          total_stock_value: 0,
          total_stock_cost: 0,
          locations: new Set(),
          suppliers: new Set(),
          total_sales_qty: 0,
          total_sales_value: 0,
          avg_selling_price: 0,
        });
      }

      const productData = productMap.get(productName);
      const quantity = item.quantity || 0;
      const cost = parseFloat(product.cost || 0);
      const price = parseFloat(product.price || 0);

      // Add SKU to track variants
      productData.skus.add(product.sku);
      productData.variant_count = productData.skus.size;

      productData.total_quantity += quantity;
      productData.total_stock_cost += quantity * cost;
      productData.total_stock_value += quantity * price;
      
      if (item.location) {
        productData.locations.add(item.location);
      }
      
      if (supplier?.id) {
        productData.suppliers.add(supplier.id);
      }
    });

    // Add sales data - need to match by product_id then group by name
    const productIdToNameMap = new Map<string, string>();
    inventoryItems?.forEach((item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      if (product) {
        productIdToNameMap.set(item.product_id, product.name);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    salesItems?.forEach((sale: any) => {
      if (!sale.product_id) return;
      
      const productName = productIdToNameMap.get(sale.product_id);
      if (!productName) return;
      
      const productData = productMap.get(productName);
      if (productData) {
        productData.total_sales_qty += sale.quantity || 0;
        productData.total_sales_value += (sale.quantity || 0) * parseFloat(sale.final_price || 0);
      }
    });

    // Convert to array and calculate averages
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const summary = Array.from(productMap.values()).map((product: any) => ({
      ...product,
      locations_count: product.locations.size,
      suppliers_count: product.suppliers.size,
      variant_count: product.skus.size,
      avg_selling_price: product.total_sales_qty > 0 
        ? product.total_sales_value / product.total_sales_qty 
        : 0,
      locations: undefined, // Remove Set from response
      suppliers: undefined, // Remove Set from response
      skus: undefined, // Remove Set from response
    }));

    // Sort by total stock value descending
    summary.sort((a, b) => b.total_stock_value - a.total_stock_value);

    // Calculate aggregate statistics
    const totalItems = inventoryItems?.length || 0;
    const totalStockValue = summary.reduce((sum, p) => sum + p.total_stock_value, 0);
    const totalStockCost = summary.reduce((sum, p) => sum + p.total_stock_cost, 0);
    const totalQuantity = summary.reduce((sum, p) => sum + p.total_quantity, 0);
    const totalSalesValue = summary.reduce((sum, p) => sum + p.total_sales_value, 0);

    return NextResponse.json({
      success: true,
      summary,
      stats: {
        total_items: totalItems,
        total_products: summary.length,
        total_quantity: totalQuantity,
        total_stock_value: totalStockValue,
        total_stock_cost: totalStockCost,
        total_sales_value: totalSalesValue,
      },
    });

  } catch (error) {
    console.error('Product summary error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch product summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
