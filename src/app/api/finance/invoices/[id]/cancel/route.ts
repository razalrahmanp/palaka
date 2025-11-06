import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await context.params;
    const body = await request.json();
    
    const { 
      reason = 'Order cancelled',
      notes 
    } = body;

    console.log('🚫 Starting order cancellation for invoice:', invoiceId);

    // Validate invoice exists
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        sales_order_id,
        customer_id,
        customer_name,
        total,
        status
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice validation failed:', { invoiceId, error: invoiceError });
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Check if invoice has a sales order ID
    if (!invoice.sales_order_id) {
      console.error('Invoice has no sales order ID:', { invoiceId });
      return NextResponse.json(
        { error: 'Invoice is not linked to a sales order' },
        { status: 400 }
      );
    }

    const salesOrderId = invoice.sales_order_id;

    // Validate sales order exists
    const { data: salesOrder, error: salesOrderError } = await supabase
      .from('sales_orders')
      .select(`
        id,
        customer_id,
        final_price,
        status,
        sales_representative_id,
        created_by
      `)
      .eq('id', salesOrderId)
      .single();

    if (salesOrderError || !salesOrder) {
      console.error('Sales order validation failed:', { 
        salesOrderId, 
        error: salesOrderError 
      });
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      );
    }

    console.log('✅ Invoice and sales order validated:', { 
      invoiceId, 
      salesOrderId,
      customerName: invoice.customer_name
    });

    // Get all sales order items
    const { data: salesOrderItems, error: itemsError } = await supabase
      .from('sales_order_items')
      .select(`
        id,
        name,
        quantity,
        unit_price,
        final_price,
        product_id,
        custom_product_id,
        order_id
      `)
      .eq('order_id', salesOrderId);

    if (itemsError || !salesOrderItems || salesOrderItems.length === 0) {
      console.error('Sales order items validation failed:', itemsError);
      return NextResponse.json(
        { error: 'No items found in sales order' },
        { status: 400 }
      );
    }

    console.log('✅ Sales order items found:', { 
      count: salesOrderItems.length,
      items: salesOrderItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        is_custom: !!item.custom_product_id
      }))
    });

    // Fetch product costs for non-custom products
    const regularProductIds = salesOrderItems
      .filter(item => item.product_id)
      .map(item => item.product_id);

    const regularProductCosts = new Map<string, number>();

    if (regularProductIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, cost')
        .in('id', regularProductIds);

      products?.forEach(p => {
        regularProductCosts.set(p.id, p.cost || 0);
      });
    }

    // Calculate total return value and cost
    const totalReturnValue = salesOrderItems.reduce((sum, item) => 
      sum + (item.final_price * item.quantity), 0
    );

    const totalCostValue = salesOrderItems.reduce((sum, item) => {
      if (item.custom_product_id) {
        return sum + (item.unit_price || 0) * item.quantity;
      } else if (item.product_id) {
        const costPrice = regularProductCosts.get(item.product_id) || 0;
        return sum + costPrice * item.quantity;
      } else {
        return sum + (item.unit_price || 0) * item.quantity;
      }
    }, 0);

    console.log('💰 Calculated totals:', { 
      totalReturnValue, 
      totalCostValue,
      itemCount: salesOrderItems.length
    });

    // Create return record for cancellation
    const { data: returnRecord, error: returnError } = await supabase
      .from('returns')
      .insert({
        order_id: salesOrderId,
        return_type: 'return',
        reason: reason,
        status: 'completed', // Auto-complete for cancellations
        return_value: totalReturnValue,
        cost_value: totalCostValue,
        created_by: salesOrder.created_by || null,
        sales_representative_id: salesOrder.sales_representative_id || null,
        approved_by: salesOrder.created_by || null, // Auto-approve
        images: null,
        inspection_notes: notes || 'Full order cancellation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (returnError) {
      console.error('❌ Return creation failed:', returnError);
      return NextResponse.json(
        { error: 'Failed to create return record' },
        { status: 500 }
      );
    }

    console.log('✅ Return record created:', { return_id: returnRecord.id });

    // Create return items for all sales order items
    const returnItems = salesOrderItems.map(item => {
      const isCustomProduct = !!item.custom_product_id;
      let itemCostPrice = 0;

      if (isCustomProduct) {
        itemCostPrice = item.unit_price || 0;
      } else if (item.product_id) {
        itemCostPrice = regularProductCosts.get(item.product_id) || item.unit_price || 0;
      } else {
        itemCostPrice = item.unit_price || 0;
      }

      return {
        return_id: returnRecord.id,
        product_id: isCustomProduct ? null : (item.product_id || null),
        custom_product_id: isCustomProduct ? (item.custom_product_id || null) : null,
        sales_order_item_id: item.id,
        quantity: item.quantity, // Return full quantity
        unit_price: itemCostPrice,
        refund_amount: item.final_price * item.quantity,
        is_custom_product: isCustomProduct,
        condition_notes: `Order cancelled - ${item.name}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });

    console.log('📦 Creating return items:', { count: returnItems.length });

    const { data: createdReturnItems, error: returnItemsError } = await supabase
      .from('return_items')
      .insert(returnItems)
      .select();

    if (returnItemsError) {
      console.error('❌ Return items creation failed:', returnItemsError);
      return NextResponse.json(
        { error: 'Failed to create return items' },
        { status: 500 }
      );
    }

    console.log('✅ Return items created:', { count: createdReturnItems.length });

    // Update inventory for returned items (add back to stock)
    for (const item of salesOrderItems) {
      const isCustomProduct = !!item.custom_product_id;

      if (!isCustomProduct && item.product_id) {
        // Get current inventory
        const { data: currentInventory, error: fetchError } = await supabase
          .from('inventory')
          .select('product_id, quantity_in_stock')
          .eq('product_id', item.product_id)
          .maybeSingle();

        if (fetchError) {
          console.error('❌ Failed to fetch current inventory:', {
            product_id: item.product_id,
            error: fetchError
          });
          continue;
        }

        const currentQty = currentInventory?.quantity_in_stock || 0;
        const newQty = currentQty + item.quantity;

        if (currentInventory) {
          // Update existing inventory record
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ 
              quantity_in_stock: newQty,
              updated_at: new Date().toISOString()
            })
            .eq('product_id', item.product_id);

          if (updateError) {
            console.error('❌ Failed to update inventory:', updateError);
          } else {
            console.log('✅ Inventory updated:', {
              product_id: item.product_id,
              previous_qty: currentQty,
              returned_qty: item.quantity,
              new_qty: newQty
            });
          }
        } else {
          // Create new inventory record
          const { error: insertError } = await supabase
            .from('inventory')
            .insert({
              product_id: item.product_id,
              quantity_in_stock: item.quantity,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('❌ Failed to create inventory:', insertError);
          } else {
            console.log('✅ Inventory created:', {
              product_id: item.product_id,
              quantity: item.quantity
            });
          }
        }
      } else if (isCustomProduct) {
        console.log('ℹ️ Skipping inventory update for custom product:', {
          custom_product_id: item.custom_product_id,
          quantity: item.quantity
        });
      }
    }

    // Update sales order status to cancelled
    const { error: orderUpdateError } = await supabase
      .from('sales_orders')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', salesOrderId);

    if (orderUpdateError) {
      console.warn('⚠️ Failed to update sales order status:', orderUpdateError);
    } else {
      console.log('✅ Sales order marked as cancelled');
    }

    // Update invoice status to cancelled
    const { error: invoiceUpdateError } = await supabase
      .from('invoices')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    if (invoiceUpdateError) {
      console.warn('⚠️ Failed to update invoice status:', invoiceUpdateError);
    } else {
      console.log('✅ Invoice marked as cancelled');
    }

    // Create invoice refund record
    const { error: refundError } = await supabase
      .from('invoice_refunds')
      .insert({
        invoice_id: invoiceId,
        refund_amount: totalReturnValue,
        status: 'pending',
        reason: `Order cancellation - ${reason}`,
        refund_type: 'full',
        refund_method: 'original_payment',
        created_by: salesOrder.created_by || null
      });

    if (refundError) {
      console.warn('⚠️ Failed to create invoice refund record:', refundError);
    } else {
      console.log('✅ Invoice refund record created');
    }

    return NextResponse.json({ 
      success: true, 
      return_id: returnRecord.id,
      invoice_id: invoiceId,
      sales_order_id: salesOrderId,
      items_count: salesOrderItems.length,
      total_refund_amount: totalReturnValue,
      message: 'Order cancelled successfully. All items have been returned to inventory.' 
    });

  } catch (error) {
    console.error('💥 Order cancellation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to cancel order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
