// app/api/vendors/[id]/sales/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;

    // Get sales data for products from this vendor
    const { data: salesData, error } = await supabase
      .from('sales_order_items')
      .select(`
        quantity,
        unit_price,
        sales_order:sales_orders(created_at),
        product:products!inner(id, name, supplier_id)
      `)
      .eq('product.supplier_id', vendorId);

    if (error) throw error;

    // Aggregate sales by product
    const salesByProduct = new Map();

    salesData?.forEach(item => {
      // Handle potential array response from Supabase join
      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      const salesOrder = Array.isArray(item.sales_order) ? item.sales_order[0] : item.sales_order;
      
      if (!product) return;
      
      const productId = product.id;
      const productName = product.name;
      const revenue = item.quantity * item.unit_price;
      const saleDate = salesOrder?.created_at;

      if (salesByProduct.has(productId)) {
        const existing = salesByProduct.get(productId);
        existing.total_quantity_sold += item.quantity;
        existing.total_revenue += revenue;
        
        // Update last sale date if this sale is more recent
        if (saleDate && (!existing.last_sale_date || new Date(saleDate) > new Date(existing.last_sale_date))) {
          existing.last_sale_date = saleDate;
        }
      } else {
        salesByProduct.set(productId, {
          product_id: productId,
          product_name: productName,
          total_quantity_sold: item.quantity,
          total_revenue: revenue,
          last_sale_date: saleDate
        });
      }
    });

    const salesRecords = Array.from(salesByProduct.values());

    return NextResponse.json(salesRecords);
  } catch (error) {
    console.error('GET /api/vendors/[id]/sales error', error);
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 });
  }
}
