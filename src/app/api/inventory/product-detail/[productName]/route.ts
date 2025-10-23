import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  location: string;
  category: string;
  subcategory: string;
  material: string;
  products: { id: string; name: string; sku: string; price: number; cost: number; category: string }[];
  suppliers: { id: string; name: string }[];
}

interface SalesItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  supplier_name: string;
  supplier_id: string;
  sales_orders: { id: string; order_number: string; order_date: string; customer_name: string; status: string }[];
  products: { name: string; sku: string }[];
}

interface SalesOrder {
  order_id: string;
  order_number: string;
  order_date: string;
  customer_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  supplier_name: string;
}

interface VariantData {
  product_id: string;
  product_name: string;
  sku: string;
  category: string;
  subcategory: string;
  material: string;
  total_quantity: number;
  total_stock_value: number;
  total_stock_cost: number;
  price: number;
  cost: number;
  locations: string[];
  suppliers: { id: string; name: string }[];
  total_sales_qty: number;
  total_sales_value: number;
  sales_orders: SalesOrder[];
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productName: string }> }
) {
  try {
    const { productName } = await context.params;
    const decodedProductName = decodeURIComponent(productName);

    // Get all product variants with the same name from inventory_items
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select(`
        id,
        product_id,
        quantity,
        location,
        category,
        subcategory,
        material,
        products!inventory_items_product_id_fkey (
          id,
          name,
          sku,
          price,
          cost,
          category
        ),
        suppliers!inventory_items_supplier_id_fkey (
          id,
          name
        )
      `)
      .eq('products.name', decodedProductName)
      .limit(100000)
      .order('quantity', { ascending: false });

    if (inventoryError) {
      console.error('Error fetching inventory items:', inventoryError);
      return NextResponse.json(
        { error: 'Failed to fetch inventory items', details: inventoryError.message },
        { status: 500 }
      );
    }

    // Get sales data for all variants of this product name
    const { data: salesItems, error: salesError } = await supabase
      .from('sales_order_items')
      .select(`
        id,
        product_id,
        quantity,
        unit_price,
        total_amount,
        supplier_name,
        supplier_id,
        sales_orders!inner (
          id,
          order_number,
          order_date,
          customer_name,
          status
        ),
        products!sales_order_items_product_id_fkey (
          name,
          sku
        )
      `)
      .eq('products.name', decodedProductName)
      .limit(100000)
      .order('sales_orders.order_date', { ascending: false });

    if (salesError) {
      console.error('Error fetching sales items:', salesError);
    }

    // Process and group data by product_id (SKU)
    const variantMap = new Map<string, VariantData>();

    inventoryItems?.forEach((item: InventoryItem) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const supplier = Array.isArray(item.suppliers) ? item.suppliers[0] : item.suppliers;
      
      if (!product) return;

      const productId = item.product_id;
      
      if (!variantMap.has(productId)) {
        variantMap.set(productId, {
          product_id: productId,
          product_name: product.name || 'Unknown',
          sku: product.sku || 'N/A',
          category: item.category || product.category || 'Uncategorized',
          subcategory: item.subcategory || '',
          material: item.material || '',
          total_quantity: 0,
          total_stock_value: 0,
          total_stock_cost: 0,
          price: Number(product.price || 0),
          cost: Number(product.cost || 0),
          locations: [] as string[],
          suppliers: [] as { id: string; name: string }[],
          total_sales_qty: 0,
          total_sales_value: 0,
          sales_orders: [] as SalesOrder[],
        });
      }

      const variantData = variantMap.get(productId);
      if (!variantData) return;

      const quantity = item.quantity || 0;
      const cost = Number(product.cost) || 0;
      const price = Number(product.price) || 0;

      variantData.total_quantity += quantity;
      variantData.total_stock_cost += quantity * cost;
      variantData.total_stock_value += quantity * price;
      
      if (item.location && !variantData.locations.includes(item.location)) {
        variantData.locations.push(item.location);
      }
      
      if (supplier?.id && !variantData.suppliers.find((s) => s.id === supplier.id)) {
        variantData.suppliers.push({
          id: supplier.id,
          name: supplier.name,
        });
      }
    });

    // Add sales data to variants
    salesItems?.forEach((sale: SalesItem) => {
      if (!sale.product_id) return;
      
      const variantData = variantMap.get(sale.product_id);
      if (!variantData) return;

      const quantity = sale.quantity || 0;
      const totalAmount = sale.total_amount || 0;

      variantData.total_sales_qty += quantity;
      variantData.total_sales_value += totalAmount;

      // Add sales order details
      const salesOrder = Array.isArray(sale.sales_orders) ? sale.sales_orders[0] : sale.sales_orders;
      if (salesOrder) {
        variantData.sales_orders.push({
          order_id: salesOrder.id,
          order_number: salesOrder.order_number,
          order_date: salesOrder.order_date,
          customer_name: salesOrder.customer_name,
          quantity: quantity,
          unit_price: sale.unit_price,
          total_amount: totalAmount,
          supplier_name: sale.supplier_name,
        });
      }
    });

    // Convert map to array and calculate aggregate statistics
    const variants = Array.from(variantMap.values());
    
    const aggregateStats = {
      product_name: decodedProductName,
      variant_count: variants.length,
      total_quantity: variants.reduce((sum, v) => sum + v.total_quantity, 0),
      total_stock_value: variants.reduce((sum, v) => sum + v.total_stock_value, 0),
      total_stock_cost: variants.reduce((sum, v) => sum + v.total_stock_cost, 0),
      total_sales_qty: variants.reduce((sum, v) => sum + v.total_sales_qty, 0),
      total_sales_value: variants.reduce((sum, v) => sum + v.total_sales_value, 0),
      categories: [...new Set(variants.map(v => v.category))],
      subcategories: [...new Set(variants.map(v => v.subcategory).filter(Boolean))],
    };

    return NextResponse.json({
      success: true,
      data: {
        aggregate: aggregateStats,
        variants: variants,
      },
    });

  } catch (error) {
    console.error('Error in product-detail API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
