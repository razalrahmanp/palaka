import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

interface ReturnRequestItem {
  sales_order_item_id: string;
  product_id?: string | null;
  custom_product_id?: string | null;
  quantity_to_return?: number;
  quantity?: number; // Alternative field name
  reason: string;
  condition_notes?: string;
  is_custom_product?: boolean;
  resolution?: 'refund' | 'replace' | 'repair';
}

interface ReturnRequest {
  invoice_id: string;
  items: ReturnRequestItem[];
  return_type: 'return' | 'exchange';
  refund_method?: string;
  reason?: string;
  notes?: string;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await context.params;
    const body: ReturnRequest = await request.json();
    
    const { 
      items, 
      return_type, 
      refund_method = 'original_payment',
      reason,
      notes
    } = body;

    // Get current user for audit trail (optional for now)
    const currentUser = { id: null }; // Set to null since we don't have real user auth
    
    // Validate required fields
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Return items are required' },
        { status: 400 }
      );
    }

    // Validate invoice exists first
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

    // Validate sales order exists separately (without PostgREST relationship)
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
      .eq('id', invoice.sales_order_id)
      .single();

    if (salesOrderError || !salesOrder) {
      console.error('Sales order validation failed:', { 
        salesOrderId: invoice.sales_order_id, 
        error: salesOrderError 
      });
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      );
    }

    const salesOrderId = invoice.sales_order_id;
    console.log('✅ Invoice and sales order validation passed:', { 
      invoiceId, 
      salesOrderId,
      customerName: invoice.customer_name,
      salesOrderStatus: salesOrder.status
    });

    // Validate all sales order items exist and get complete product information
    const itemIds = items.map(item => item.sales_order_item_id);
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
      .in('id', itemIds)
      .eq('order_id', salesOrderId);

    if (itemsError || !salesOrderItems) {
      console.error('Sales order items validation failed:', itemsError);
      return NextResponse.json(
        { error: 'Invalid sales order items' },
        { status: 400 }
      );
    }

    console.log('✅ Sales order items found:', { 
      requested: itemIds.length, 
      found: salesOrderItems.length,
      items: salesOrderItems.map(item => ({
        id: item.id,
        name: item.name,
        product_id: item.product_id,
        custom_product_id: item.custom_product_id,
        is_custom: !!item.custom_product_id
      }))
    });

    // Fetch cost prices for all items (both regular and custom products)
    const productIds = salesOrderItems.filter(item => item.product_id).map(item => item.product_id);
    const customProductIds = salesOrderItems.filter(item => item.custom_product_id).map(item => item.custom_product_id);

    // Fetch regular product costs
    const regularProductCosts = new Map();
    if (productIds.length > 0) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, cost')
        .in('id', productIds);
      
      if (!productsError && products) {
        products.forEach(product => {
          regularProductCosts.set(product.id, product.cost || 0);
        });
      }
    }

    // Fetch custom product costs
    const customProductCosts = new Map();
    if (customProductIds.length > 0) {
      const { data: customProducts, error: customProductsError } = await supabase
        .from('custom_products')
        .select('id, cost_price')
        .in('id', customProductIds);
      
      if (!customProductsError && customProducts) {
        customProducts.forEach(customProduct => {
          customProductCosts.set(customProduct.id, customProduct.cost_price || 0);
        });
      }
    }

    console.log('📊 Cost data fetched:', {
      regularProducts: regularProductCosts.size,
      customProducts: customProductCosts.size,
      regularCosts: Array.from(regularProductCosts.entries()),
      customCosts: Array.from(customProductCosts.entries())
    });

    console.log('💰 Cost calculation details:', {
      items: items.map(item => {
        const salesOrderItem = salesOrderItems.find(soi => soi.id === item.sales_order_item_id);
        const isCustomProduct = !!salesOrderItem?.custom_product_id;
        let costPrice = 0;
        let costSource = 'none';
        
        if (salesOrderItem?.custom_product_id) {
          costPrice = customProductCosts.get(salesOrderItem.custom_product_id) || 0;
          costSource = 'custom_products.cost_price';
        } else if (salesOrderItem?.product_id) {
          costPrice = regularProductCosts.get(salesOrderItem.product_id) || 0;
          costSource = 'products.cost';
        } else {
          costPrice = salesOrderItem?.unit_price || 0;
          costSource = 'fallback_unit_price';
        }
        
        return {
          sales_order_item_id: item.sales_order_item_id,
          product_name: salesOrderItem?.name,
          is_custom: isCustomProduct,
          cost_price: costPrice,
          cost_source: costSource,
          quantity: item.quantity_to_return || item.quantity || 0,
          total_cost: costPrice * (item.quantity_to_return || item.quantity || 0)
        };
      })
    });

    // Check if quantities are valid (not exceeding available for return)
    const { data: existingReturns } = await supabase
      .from('return_items')
      .select(`
        sales_order_item_id,
        quantity,
        returns!inner(status)
      `)
      .in('sales_order_item_id', itemIds)
      .eq('returns.status', 'completed');

    // Calculate already returned quantities
    const returnedQuantities = new Map();
    existingReturns?.forEach(returnItem => {
      const itemId = returnItem.sales_order_item_id;
      const currentReturned = returnedQuantities.get(itemId) || 0;
      returnedQuantities.set(itemId, currentReturned + returnItem.quantity);
    });

    // Validate return quantities
    for (const returnItem of items) {
      const salesOrderItem = salesOrderItems.find(soi => soi.id === returnItem.sales_order_item_id);
      if (!salesOrderItem) {
        return NextResponse.json(
          { error: `Sales order item ${returnItem.sales_order_item_id} not found` },
          { status: 400 }
        );
      }

      // Use either quantity_to_return or quantity from the request
      const requestedQuantity = returnItem.quantity_to_return || returnItem.quantity || 0;
      const alreadyReturned = returnedQuantities.get(returnItem.sales_order_item_id) || 0;
      const availableForReturn = salesOrderItem.quantity - alreadyReturned;

      if (requestedQuantity > availableForReturn) {
        return NextResponse.json(
          { 
            error: `Cannot return ${requestedQuantity} of ${salesOrderItem.name}. Only ${availableForReturn} available for return.` 
          },
          { status: 400 }
        );
      }
    }

    // Calculate total return value
    const totalReturnValue = items.reduce((sum, returnItem) => {
      const salesOrderItem = salesOrderItems.find(soi => soi.id === returnItem.sales_order_item_id);
      const requestedQuantity = returnItem.quantity_to_return || returnItem.quantity || 0;
      const itemValue = (salesOrderItem?.final_price || 0) * requestedQuantity;
      return sum + itemValue;
    }, 0);

    // Calculate total cost value using proper cost prices from product tables
    const totalCostValue = items.reduce((sum, returnItem) => {
      const salesOrderItem = salesOrderItems.find(soi => soi.id === returnItem.sales_order_item_id);
      if (!salesOrderItem) return sum;
      
      const requestedQuantity = returnItem.quantity_to_return || returnItem.quantity || 0;
      let itemCost = 0;
      
      // Get cost based on product type
      if (salesOrderItem.custom_product_id) {
        // Custom product - use cost_price from custom_products table
        const costPrice = customProductCosts.get(salesOrderItem.custom_product_id) || 0;
        itemCost = costPrice * requestedQuantity;
      } else if (salesOrderItem.product_id) {
        // Regular product - use cost from products table
        const costPrice = regularProductCosts.get(salesOrderItem.product_id) || 0;
        itemCost = costPrice * requestedQuantity;
      } else {
        // Fallback to unit_price if no product data available
        itemCost = (salesOrderItem.unit_price || 0) * requestedQuantity;
      }
      
      return sum + itemCost;
    }, 0);

    // Create return record with ALL required fields including user information
    const { data: returnRecord, error: returnError } = await supabase
      .from('returns')
      .insert({
        order_id: salesOrderId,
        return_type: return_type,
        reason: reason || items[0]?.reason || 'Return from invoice',
        status: 'pending',
        return_value: totalReturnValue,
        cost_value: totalCostValue,
        created_by: salesOrder.created_by || null, // Use sales order creator
        sales_representative_id: salesOrder.sales_representative_id || null, // Use sales rep from order
        approved_by: null, // Will be set when approved
        images: null, // Can be updated later
        inspection_notes: notes || null, // From request body
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

    console.log('✅ Return record created:', { return_id: returnRecord.id, salesOrderId });

    // Create return items with ALL required fields and proper cost calculations
    const returnItems = items.map(item => {
      const salesOrderItem = salesOrderItems.find(soi => soi.id === item.sales_order_item_id);
      const requestedQuantity = item.quantity_to_return || item.quantity || 0;
      const isCustomProduct = !!salesOrderItem?.custom_product_id;
      
      // Calculate proper cost price for this item
      let itemCostPrice = 0;
      if (salesOrderItem?.custom_product_id) {
        // Custom product - use cost_price from custom_products table
        itemCostPrice = customProductCosts.get(salesOrderItem.custom_product_id) || 0;
      } else if (salesOrderItem?.product_id) {
        // Regular product - use cost from products table
        itemCostPrice = regularProductCosts.get(salesOrderItem.product_id) || 0;
      } else {
        // Fallback to unit_price if no product data available
        itemCostPrice = salesOrderItem?.unit_price || 0;
      }
      
      return {
        return_id: returnRecord.id,
        // Product handling: either product_id OR custom_product_id, never both
        product_id: isCustomProduct ? null : salesOrderItem?.product_id || null,
        custom_product_id: isCustomProduct ? salesOrderItem?.custom_product_id || null : null,
        sales_order_item_id: item.sales_order_item_id,
        quantity: requestedQuantity,
        unit_price: itemCostPrice, // Use proper cost price instead of selling price
        refund_amount: (salesOrderItem?.final_price || 0) * requestedQuantity, // Refund amount is still based on selling price
        is_custom_product: isCustomProduct,
        condition_notes: item.condition_notes || `Return of ${salesOrderItem?.name || 'item'}`,
        resolution: item.resolution || (return_type === 'exchange' ? 'replace' : 'refund'),
        status: 'pending'
      };
    });

    const { error: itemsInsertError } = await supabase
      .from('return_items')
      .insert(returnItems);

    if (itemsInsertError) {
      console.error('❌ Return items creation failed:', itemsInsertError);
      
      // Rollback: Delete the return record
      await supabase
        .from('returns')
        .delete()
        .eq('id', returnRecord.id);
        
      return NextResponse.json(
        { error: 'Failed to create return items' },
        { status: 500 }
      );
    }

    console.log('✅ Return items created successfully:', { 
      return_id: returnRecord.id, 
      items_count: returnItems.length 
    });

    // For regular products, update inventory (add quantities back)
    for (const item of items) {
      const salesOrderItem = salesOrderItems.find(soi => soi.id === item.sales_order_item_id);
      const requestedQuantity = item.quantity_to_return || item.quantity || 0;
      const isCustomProduct = !!salesOrderItem?.custom_product_id;
      
      if (!isCustomProduct && salesOrderItem?.product_id) {
        // Call inventory update function for regular products
        const { error: inventoryError } = await supabase.rpc('update_inventory_quantity', {
          p_product_id: salesOrderItem.product_id,
          p_quantity_change: requestedQuantity
        });

        if (inventoryError) {
          console.warn('⚠️ Inventory update failed for product:', {
            product_id: salesOrderItem.product_id,
            quantity: requestedQuantity,
            error: inventoryError
          });
          // Don't fail the return, but log the warning
        } else {
          console.log('✅ Inventory updated for return:', {
            product_id: salesOrderItem.product_id,
            quantity_added: requestedQuantity
          });
        }
      } else if (isCustomProduct) {
        console.log('ℹ️ Skipping inventory update for custom product:', {
          custom_product_id: salesOrderItem?.custom_product_id,
          quantity: requestedQuantity
        });
      }
    }

    // Create invoice refund record if this is a return (not exchange)
    if (return_type === 'return') {
      const { error: refundError } = await supabase
        .from('invoice_refunds')
        .insert({
          invoice_id: invoiceId,
          refund_amount: totalReturnValue,
          status: 'pending',
          reason: `Return of ${items.length} item(s)`,
          refund_type: 'partial',
          refund_method: refund_method,
          created_by: currentUser.id
        });

      if (refundError) {
        console.warn('⚠️ Failed to create invoice refund record:', refundError);
        // Don't fail the return, but log the warning
      } else {
        console.log('✅ Invoice refund record created');
      }
    }

    return NextResponse.json({ 
      success: true, 
      return_id: returnRecord.id,
      invoice_id: invoiceId,
      sales_order_id: salesOrderId,
      items_count: returnItems.length,
      total_refund_amount: totalReturnValue,
      message: `${return_type === 'return' ? 'Return' : 'Exchange'} request created successfully` 
    });

  } catch (error) {
    console.error('💥 Invoice return processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process return request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch return history for an invoice
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await context.params;

    // Get invoice and related sales order
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, sales_order_id')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Get return history for this sales order
    console.log('🔍 Fetching returns for invoice:', {
      invoiceId,
      salesOrderId: invoice.sales_order_id
    });

    const { data: returns, error: returnsError } = await supabase
      .from('returns')
      .select(`
        id,
        return_type,
        status,
        reason,
        return_value,
        created_at,
        return_items (
          id,
          quantity,
          unit_price,
          refund_amount,
          condition_notes,
          sales_order_item_id,
          sales_order_items (
            name,
            quantity
          )
        )
      `)
      .eq('order_id', invoice.sales_order_id)
      .order('created_at', { ascending: false });

    if (returnsError) {
      console.error('Error fetching returns:', returnsError);
      return NextResponse.json(
        { error: 'Failed to fetch return history' },
        { status: 500 }
      );
    }

    console.log('📦 Returns fetched from database:', {
      count: returns?.length || 0,
      returns: returns
    });

    return NextResponse.json({
      invoice_id: invoiceId,
      sales_order_id: invoice.sales_order_id,
      returns: returns || []
    });

  } catch (error) {
    console.error('Error fetching invoice return history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}