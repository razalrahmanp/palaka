import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = await params;

    // Get sales order items for this product with full details
    const { data: salesItems, error: salesError } = await supabase
      .from('sales_order_items')
      .select(`
        id,
        quantity,
        final_price,
        supplier_name,
        supplier_id,
        sales_orders (
          id,
          created_at,
          customer_name
        )
      `)
      .eq('product_id', productId);

    if (salesError) {
      console.error('Error fetching sales details:', salesError);
      throw salesError;
    }

    // Transform the data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sales = salesItems?.map((item: any) => {
      const order = Array.isArray(item.sales_orders) ? item.sales_orders[0] : item.sales_orders;

      return {
        order_id: order?.id || 'N/A',
        order_date: order?.created_at || new Date().toISOString(),
        customer_name: order?.customer_name || 'Unknown Customer',
        quantity: item.quantity || 0,
        unit_price: parseFloat(item.final_price || 0),
        total_amount: (item.quantity || 0) * parseFloat(item.final_price || 0),
        supplier_name: item.supplier_name || 'N/A',
        location: 'N/A', // Location not tracked in sales
      };
    }) || [];

    const totalSalesQty = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalSalesValue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);

    return NextResponse.json({
      success: true,
      sales,
      summary: {
        total_sales: sales.length,
        total_quantity: totalSalesQty,
        total_value: totalSalesValue,
        avg_sale_value: sales.length > 0 ? totalSalesValue / sales.length : 0,
      }
    });

  } catch (error) {
    console.error('Product sales details error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch product sales details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
