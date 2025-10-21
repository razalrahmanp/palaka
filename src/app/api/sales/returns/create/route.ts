import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

interface ReturnItem {
  sales_order_item_id: string;
  product_id?: string | null;
  custom_product_id?: string | null;
  quantity: number;
  unit_price: number;
  cost: number;
  is_custom_product: boolean;
  condition_notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      order_id, 
      items, 
      return_type, // 'return' or 'exchange'
      reason,
      sales_representative_id 
    }: {
      order_id: string;
      items: ReturnItem[];
      return_type: 'return' | 'exchange';
      reason: string;
      sales_representative_id?: string;
    } = body;

    // Validate required fields
    if (!order_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Order ID and items are required' },
        { status: 400 }
      );
    }

    // Validate that the order exists before creating the return
    const { data: orderExists, error: orderCheckError } = await supabase
      .from('sales_orders')
      .select('id, status, customer_id')
      .eq('id', order_id)
      .single();

    if (orderCheckError || !orderExists) {
      console.error('Order validation failed:', { order_id, error: orderCheckError });
      
      // Determine specific error message based on error code
      let userMessage = 'Sales order not found';
      let suggestions: string[] = [];
      
      if (orderCheckError?.code === 'PGRST116') {
        userMessage = 'The specified sales order does not exist';
        suggestions = [
          'Verify the order ID is correct',
          'Check if the order was deleted',
          'Ensure you have permission to access this order'
        ];
        
        // Get some recent valid orders as suggestions
        try {
          const { data: recentOrders } = await supabase
            .from('sales_orders')
            .select('id, customer_id')
            .order('created_at', { ascending: false })
            .limit(3);
            
          if (recentOrders && recentOrders.length > 0) {
            suggestions.push(`Recent order IDs: ${recentOrders.map(o => o.id.substring(0, 8) + '...').join(', ')}`);
          }
        } catch {
          // Ignore errors when fetching suggestions
        }
      }
      
      return NextResponse.json(
        { 
          error: userMessage,
          order_id: order_id,
          suggestions: suggestions,
          details: 'Cannot create return for non-existent order',
          debug: {
            error_code: orderCheckError?.code,
            error_message: orderCheckError?.message
          }
        },
        { status: 400 }
      );
    }

    console.log('✅ Order validation passed:', { order_id, status: orderExists.status });

    // Start transaction
    const { data: returnRecord, error: returnError } = await supabase
      .from('returns')
      .insert({
        order_id,
        return_type,
        reason,
        sales_representative_id,
        status: 'pending',
        return_value: items.reduce((sum: number, item: ReturnItem) => sum + (item.unit_price * item.quantity), 0),
        cost_value: items.reduce((sum: number, item: ReturnItem) => sum + (item.cost * item.quantity), 0)
      })
      .select()
      .single();

    if (returnError) {
      console.error('❌ Return creation failed:', {
        error: returnError,
        order_id,
        return_type,
        items_count: items.length
      });
      throw returnError;
    }

    console.log('✅ Return record created:', { return_id: returnRecord.id, order_id });

    // Insert return items
    const returnItems = items.map((item: ReturnItem) => ({
      return_id: returnRecord.id,
      product_id: item.is_custom_product ? null : item.product_id,
      custom_product_id: item.is_custom_product ? item.custom_product_id : null,
      sales_order_item_id: item.sales_order_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      refund_amount: item.unit_price * item.quantity,
      is_custom_product: item.is_custom_product,
      condition_notes: item.condition_notes || '',
      resolution: return_type === 'exchange' ? 'replace' : 'refund'
    }));

    const { error: itemsError } = await supabase
      .from('return_items')
      .insert(returnItems);

    if (itemsError) {
      console.error('❌ Return items creation failed:', {
        error: itemsError,
        return_id: returnRecord.id,
        items_count: returnItems.length
      });
      throw itemsError;
    }

    console.log('✅ Return items created successfully:', { 
      return_id: returnRecord.id, 
      items_count: returnItems.length 
    });

    return NextResponse.json({ 
      success: true, 
      return_id: returnRecord.id,
      order_id: order_id,
      items_count: returnItems.length,
      message: `${return_type === 'return' ? 'Return' : 'Exchange'} request created successfully` 
    });

  } catch (error) {
    console.error('Create return error:', error);
    return NextResponse.json(
      { error: 'Failed to process return request' },
      { status: 500 }
    );
  }
}