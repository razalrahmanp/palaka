import { supabase } from '@/lib/supabasePool';
import { NextRequest, NextResponse } from 'next/server';

interface OrderItemWithProducts {
  id: string;
  order_id: string;
  quantity: number;
  unit_price: number | null;
  product_id?: string | null;
  custom_product_id?: string | null;
  name?: string | null;
  supplier_name?: string | null;
  discount_percentage?: number | null;
  final_price?: number | null;
  cost?: number | null;
  products?: {
    id: string;
    name: string;
    price: number;
    sku?: string;
    description?: string;
    category?: string;
    config_schema?: Record<string, unknown>;
    suppliers?: { name: string }[];
    boms?: { id: string; component: string; quantity: number }[];
  } | null;
  custom_products?: {
    id: string;
    name: string;
    sku?: string;
    description?: string;
    config_schema?: Record<string, unknown>;
    supplier_name?: string;
  } | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  try {
    // Fetch sales order with customer details, sales rep info and finance information
    const { data: orderData, error: orderError } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customers:customer_id (
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          pincode,
          floor,
          notes,
          formatted_address,
          status,
          source
        ),
        users:sales_representative_id (
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Fetch order items with product details, custom products, and return status
    const { data: itemsData, error: itemsError } = await supabase
      .from('sales_order_items')
      .select(`
        *,
        products:product_id(
          id,
          name, 
          sku, 
          description,
          category,
          price,
          cost,
          config_schema,
          suppliers(name),
          boms(id, component, quantity)
        ),
        custom_products:custom_product_id(
          id,
          name,
          sku,
          description,
          cost_price,
          config_schema,
          supplier_name
        )
      `)
      .eq('order_id', id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return NextResponse.json({ error: 'Failed to fetch order items' }, { status: 500 });
    }



    // Fetch return items to calculate return status for each sales order item
    const salesOrderItemIds = itemsData?.map(item => item.id) || [];
    const returnItemsMap = new Map<string, { returned_quantity: number; return_status: string }>();
    
    if (salesOrderItemIds.length > 0) {
      const { data: returnItems, error: returnItemsError } = await supabase
        .from('return_items')
        .select(`
          id,
          sales_order_item_id,
          quantity,
          status,
          returns!inner(
            id,
            status,
            reason
          )
        `)
        .in('sales_order_item_id', salesOrderItemIds);
      
      if (!returnItemsError && returnItems && returnItems.length > 0) {
        // Group return items by sales_order_item_id and sum returned quantities
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        returnItems.forEach((returnItem: any) => {
          const itemId = returnItem.sales_order_item_id;
          const returnStatus = returnItem.returns?.status || 'pending';
          const returnedQty = Number(returnItem.quantity || 0);
          
          // Only count returns that are not cancelled or rejected
          if (returnStatus !== 'cancelled' && returnStatus !== 'rejected') {
            const existingReturn = returnItemsMap.get(itemId);
            
            if (existingReturn) {
              existingReturn.returned_quantity += returnedQty;
            } else {
              returnItemsMap.set(itemId, {
                returned_quantity: returnedQty,
                return_status: 'partial' // Will be updated to 'full' if quantities match
              });
            }
          }
        });
      }
    }

    // Fetch quote custom items if this order was created from a quote
    let salesRepresentative = null;
    let quoteCustomItems: Array<{
      id: string;
      name: string;
      specifications?: string;
      materials?: unknown;
      dimensions?: string;
      finish?: string;
      color?: string;
      custom_instructions?: string;
      product_id?: string;
    }> = [];
    
    if (orderData.quote_id) {
      const { data: quoteData } = await supabase
        .from('quotes')
        .select(`
          sales_representative_id,
          users:sales_representative_id (
            id,
            name,
            email
          )
        `)
        .eq('id', orderData.quote_id)
        .single();
      
      salesRepresentative = quoteData?.users || null;

      // Fetch quote custom items for additional specifications
      const { data: customItemsData } = await supabase
        .from('quote_custom_items')
        .select(`
          id,
          name,
          specifications,
          materials,
          dimensions,
          finish,
          color,
          custom_instructions,
          product_id
        `)
        .eq('quote_id', orderData.quote_id);
      
      quoteCustomItems = customItemsData || [];
    }

    // Process items to include comprehensive product information and return status
    const processedItems = (itemsData || []).map((item: OrderItemWithProducts) => {
      const isCustomProduct = !!item.custom_product_id;
      const needsManufacturing = item.products?.boms && item.products.boms.length > 0;
      
      // Use final_price from database if available, otherwise calculate it
      const unitPrice = item.unit_price || 0;
      const quantity = item.quantity || 1;
      const discountPercentage = item.discount_percentage || 0;
      const lineTotal = unitPrice * quantity;
      const discountAmount = lineTotal * (discountPercentage / 100);
      
      // CRITICAL: Use the final_price from the database if it exists
      // Don't recalculate it as it may have been manually adjusted
      const finalPrice = item.final_price !== null && item.final_price !== undefined 
        ? item.final_price 
        : lineTotal - discountAmount;
      
      // Get specifications based on product type
      let specifications = null;
      let combinedSpecifications = '';
      
      // Find matching quote custom item if available
      const matchingQuoteItem = quoteCustomItems.find((qci) => 
        qci.product_id === item.product_id || 
        qci.name === (item.name || item.products?.name || item.custom_products?.name)
      );
      
      if (matchingQuoteItem) {
        // Combine all specification fields from quote_custom_items
        const specParts = [];
        
        if (matchingQuoteItem.specifications) {
          specParts.push(`Specifications: ${matchingQuoteItem.specifications}`);
        }
        
        if (matchingQuoteItem.materials && Array.isArray(matchingQuoteItem.materials) && matchingQuoteItem.materials.length > 0) {
          specParts.push(`Materials: ${matchingQuoteItem.materials.join(', ')}`);
        } else if (matchingQuoteItem.materials && typeof matchingQuoteItem.materials === 'string') {
          specParts.push(`Materials: ${matchingQuoteItem.materials}`);
        }
        
        if (matchingQuoteItem.dimensions) {
          specParts.push(`Dimensions: ${matchingQuoteItem.dimensions}`);
        }
        
        if (matchingQuoteItem.finish) {
          specParts.push(`Finish: ${matchingQuoteItem.finish}`);
        }
        
        if (matchingQuoteItem.color) {
          specParts.push(`Color: ${matchingQuoteItem.color}`);
        }
        
        if (matchingQuoteItem.custom_instructions) {
          specParts.push(`Custom Instructions: ${matchingQuoteItem.custom_instructions}`);
        }
        
        combinedSpecifications = specParts.join('\n');
        specifications = combinedSpecifications;
      } else {
        // Fallback to config_schema if no quote custom item found
        if (isCustomProduct && item.custom_products?.config_schema) {
          specifications = item.custom_products.config_schema;
        } else if (item.products?.config_schema) {
          specifications = item.products.config_schema;
        }
      }
      
      // Get return status information
      const returnInfo = returnItemsMap.get(item.id);
      const totalQuantity = Number(item.quantity || 0);
      const returnedQuantity = returnInfo?.returned_quantity || 0;
      
      // Determine return status based on quantities
      let return_status = 'none';
      if (returnedQuantity > 0) {
        return_status = returnedQuantity >= totalQuantity ? 'full' : 'partial';
      }
      
      return {
        ...item,
        // Product information
        sku: item.products?.sku || item.custom_products?.sku || null,
        name: item.name || item.products?.name || item.custom_products?.name || null,
        description: item.products?.description || item.custom_products?.description || null,
        category: item.products?.category || null,
        supplier_name: item.supplier_name || 
          (item.products?.suppliers && item.products.suppliers.length > 0 
            ? item.products.suppliers[0].name 
            : item.custom_products?.supplier_name || null),
        
        // Specifications from config_schema
        specifications: specifications,
        
        // Price calculations
        final_price: finalPrice,
        line_total: lineTotal,
        discount_amount: discountAmount,
        
        // Manufacturing and customization flags
        is_custom_product: isCustomProduct,
        needs_manufacturing: needsManufacturing,
        custom_config: item.custom_products?.config_schema || null,
        bom_info: item.products?.boms || null,
        
        // Product type for highlighting
        product_type: isCustomProduct ? 'custom' : (needsManufacturing ? 'manufacturing' : 'standard'),
        
        // Return status information
        return_status: return_status,
        returned_quantity: returnedQuantity
      };
    });


    const paymentsData: unknown[] = [];
    let totalPaidFromPayments = 0;

    // Fetch payments via invoices (actual database structure)
    try {
      const { data: invoicesData } = await supabase
        .from('invoices')
        .select('id, paid_amount')
        .eq('sales_order_id', id);

      if (invoicesData && invoicesData.length > 0) {
        const invoiceIds = invoicesData.map(inv => inv.id);
        
        // Get total paid amount from invoices
        totalPaidFromPayments = invoicesData.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
        
        // Get detailed payment records
        const { data: paymentsFromInvoices } = await supabase
          .from('payments')
          .select('*')
          .in('invoice_id', invoiceIds)
          .order('payment_date', { ascending: false });

        if (paymentsFromInvoices) {
          paymentsData.push(...paymentsFromInvoices);
        }
      }
    } catch (error) {
      console.log('Could not fetch payments via invoices:', error);
    }

    // Sales representative will be fetched later

    // Process items to include comprehensive product information and return status
    // (This logic is now moved to processedItems above which includes return status)

    // Deduplicate items that have the same product_id or custom_product_id
    const itemsMap = new Map();
    const mappedItems = processedItems.filter((item) => {
      const key = item.product_id ? `product_${item.product_id}` : `custom_${item.custom_product_id}`;
      
      if (!key || key === 'product_' || key === 'custom_') {
        // If no valid identifier, keep the item (shouldn't happen but safety check)
        return true;
      }

      if (itemsMap.has(key)) {
        // If duplicate found, merge quantities and calculate weighted average price
        const existingItem = itemsMap.get(key);
        const totalQuantity = existingItem.quantity + item.quantity;
        const existingPrice = existingItem.unit_price || 0;
        const itemPrice = item.unit_price || 0;
        const totalValue = (existingItem.quantity * existingPrice) + (item.quantity * itemPrice);
        const averagePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
        
        // Recalculate final price for merged item
        const discountPercentage = existingItem.discount_percentage || 0;
        const lineTotal = averagePrice * totalQuantity;
        const discountAmount = lineTotal * (discountPercentage / 100);
        const finalPrice = lineTotal - discountAmount;
        
        // Update the existing item with merged values
        existingItem.quantity = totalQuantity;
        existingItem.unit_price = Math.round(averagePrice * 100) / 100; // Round to 2 decimal places
        existingItem.final_price = Math.round(finalPrice * 100) / 100;
        existingItem.line_total = Math.round(lineTotal * 100) / 100;
        existingItem.discount_amount = Math.round(discountAmount * 100) / 100;
        
        console.log(`Merged duplicate item ${key}: new quantity ${totalQuantity}, average price ${existingItem.unit_price}, final price ${existingItem.final_price}`);
        return false; // Don't include this duplicate
      } else {
        itemsMap.set(key, item);
        return true; // Include this item
      }
    });

    // Calculate payment totals (using invoice paid amounts)
    const totalPaid = totalPaidFromPayments;
    const orderTotal = orderData.final_price || 0;
    const balance = orderTotal - totalPaid;
    
    // Determine finance information
    const isFinanced = orderData.emi_enabled || orderData.bajaj_finance_amount > 0;
    const financeDetails = isFinanced ? {
      is_financed: true,
      emi_enabled: orderData.emi_enabled,
      emi_plan: orderData.emi_plan,
      emi_monthly: orderData.emi_monthly,
      bajaj_finance_amount: orderData.bajaj_finance_amount,
      finance_type: orderData.bajaj_finance_amount > 0 ? 'bajaj' : 'other'
    } : {
      is_financed: false
    };

    const orderWithDetails = {
      ...orderData,
      items: mappedItems,
      customer: orderData.customers,
      customer_details: orderData.customers, // Add customer_details for easy access in billing form
      sales_representative: salesRepresentative,
      
      // Payment summary (using actual invoice/payment data)
      payment_summary: {
        total_amount: orderTotal,
        total_paid: totalPaid,
        balance: balance,
        payment_status: balance <= 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'unpaid'),
        number_of_payments: paymentsData.length,
        first_payment_date: paymentsData.length > 0 ? (paymentsData[paymentsData.length - 1] as Record<string, unknown>)?.payment_date : null,
        last_payment_date: paymentsData.length > 0 ? (paymentsData[0] as Record<string, unknown>)?.payment_date : null,
        payment_methods: paymentsData.map((p: unknown) => (p as Record<string, unknown>).method).filter((m, i, arr) => arr.indexOf(m) === i),
        payments: paymentsData
      },
      
      // Finance information
      finance_details: financeDetails,
      
      // Summary flags for easy checking
      has_custom_products: mappedItems.some(item => item.is_custom_product),
      has_manufacturing_items: mappedItems.some(item => item.needs_manufacturing),
      requires_special_handling: mappedItems.some(item => item.is_custom_product || item.needs_manufacturing)
    };

    return NextResponse.json(orderWithDetails);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  const body = await req.json();
  const { status, items } = body;

  if (!status || !items || !Array.isArray(items)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Fetch existing order for comparison
  const { data: existingOrder, error: fetchError } = await supabase
    .from('sales_orders')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Error fetching order:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const previousStatus = existingOrder?.status;

  // Recalculate total
  const total = items.reduce((sum: number, item: { unit_price: number; quantity: number }) => {
    return sum + (item.unit_price || 0) * (item.quantity || 0);
  }, 0);

  // Update sales_orders
  const { error: updateError } = await supabase
    .from('sales_orders')
    .update({ 
      status, 
      final_price: total,
      original_price: total // Update both final_price and original_price
    })
    .eq('id', id);

  if (updateError) {
    console.error('Error updating sales order:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Get existing sales order items
  const { data: existingItems, error: fetchItemsError } = await supabase
    .from('sales_order_items')
    .select('*')
    .eq('order_id', id);

  if (fetchItemsError) {
    console.error('Error fetching existing items:', fetchItemsError);
    return NextResponse.json({ error: fetchItemsError.message }, { status: 500 });
  }

  // Process items for update/insert/delete operations
  const existingItemsMap = new Map();
  existingItems?.forEach(item => {
    const key = item.product_id ? `product_${item.product_id}` : `custom_${item.custom_product_id}`;
    existingItemsMap.set(key, item);
  });

  const newItemsMap = new Map();
  const processedItems = items.filter((item: {
    product_id?: string;
    custom_product_id?: string;
    quantity: number;
    unit_price: number;
    name?: string;
    supplier_name?: string;
  }) => {
    // Create a unique key for each item
    const key = item.product_id ? `product_${item.product_id}` : `custom_${item.custom_product_id}`;
    
    if (!key || key === 'product_' || key === 'custom_') {
      console.warn('Skipping item with no valid product_id or custom_product_id:', item);
      return false;
    }

    if (newItemsMap.has(key)) {
      // If duplicate found, combine quantities
      const existingItem = newItemsMap.get(key);
      existingItem.quantity += item.quantity;
      console.log(`Merged duplicate item ${key}: new quantity ${existingItem.quantity}`);
      return false;
    } else {
      newItemsMap.set(key, item);
      return true;
    }
  });

  // Update existing items and collect new items for insertion
  const itemsToInsert: Array<{
    order_id: string;
    product_id?: string | null;
    custom_product_id?: string | null;
    quantity: number;
    unit_price: number;
    name?: string | null;
    supplier_name?: string | null;
  }> = [];
  const itemsToUpdate: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    name?: string | null;
    supplier_name?: string | null;
  }> = [];
  const itemsToDelete: string[] = [];

  // Process new/updated items
  for (const item of processedItems) {
    const key = item.product_id ? `product_${item.product_id}` : `custom_${item.custom_product_id}`;
    const existingItem = existingItemsMap.get(key);

    if (existingItem) {
      // Update existing item
      itemsToUpdate.push({
        id: existingItem.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        name: item.name || existingItem.name,
        supplier_name: item.supplier_name || existingItem.supplier_name
      });
    } else {
      // New item to insert
      itemsToInsert.push({
        order_id: id,
        product_id: item.product_id || null,
        custom_product_id: item.custom_product_id || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        name: item.name || null,
        supplier_name: item.supplier_name || null
      });
    }
  }

  // Find items to delete (existing items not in new list)
  existingItemsMap.forEach((existingItem, key) => {
    if (!newItemsMap.has(key)) {
      itemsToDelete.push(existingItem.id);
    }
  });

  // Perform updates
  for (const updateItem of itemsToUpdate) {
    const { error: updateItemError } = await supabase
      .from('sales_order_items')
      .update({
        quantity: updateItem.quantity,
        unit_price: updateItem.unit_price,
        name: updateItem.name,
        supplier_name: updateItem.supplier_name
      })
      .eq('id', updateItem.id);

    if (updateItemError) {
      console.error(`Error updating item ${updateItem.id}:`, updateItemError);
      return NextResponse.json({ error: updateItemError.message }, { status: 500 });
    }
  }

  // Insert new items
  if (itemsToInsert.length > 0) {
    const { error: insertItemsError } = await supabase
      .from('sales_order_items')
      .insert(itemsToInsert);

    if (insertItemsError) {
      console.error('Error inserting order items:', insertItemsError);
      return NextResponse.json({ error: insertItemsError.message }, { status: 500 });
    }
  }

  // Try to delete items that are no longer needed (skip if referenced by other tables)
  for (const itemId of itemsToDelete) {
    const { error: deleteItemError } = await supabase
      .from('sales_order_items')
      .delete()
      .eq('id', itemId);

    if (deleteItemError) {
      console.warn(`Could not delete item ${itemId}, likely referenced by other tables:`, deleteItemError);
      // Don't return error, just log warning - item might be referenced by deliveries, returns, etc.
    }
  }

  // Handle delivery creation
  if (status !== 'cancelled' && previousStatus !== status) {
    const { data: deliveryExists, error: deliveryFetchError } = await supabase
      .from('deliveries')
      .select('id')
      .eq('sales_order_id', id)
      .maybeSingle();

    if (deliveryFetchError) {
      console.error('Error checking delivery:', deliveryFetchError);
      // Not critical, don't block update
    }

    if (!deliveryExists) {
      const { error: createDeliveryError } = await supabase
        .from('deliveries')
        .insert([{
          sales_order_id: id,
          status: 'pending',
          created_at: new Date().toISOString(),
        }]);

      if (createDeliveryError) {
        console.error('Error creating delivery:', createDeliveryError);
        // Optional: return error or just log
      }
    }
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    console.log(`Updating sales order ${id} with data:`, body);

    // Prepare update data - only include fields that are provided
    const updateData: Record<string, unknown> = {};
    
    if (body.customer_id !== undefined) updateData.customer_id = body.customer_id;
    // Note: 'customer' field doesn't exist in sales_orders table, only customer_id
    // Note: 'items' field doesn't exist in sales_orders table, handled separately below
    // if (body.items !== undefined) updateData.items = body.items;
    // Note: 'total_price' field doesn't exist in sales_orders table, only final_price
    // if (body.total_price !== undefined) updateData.total_price = body.total_price;
    if (body.original_price !== undefined) updateData.original_price = body.original_price;
    if (body.final_price !== undefined) updateData.final_price = body.final_price;
    // Store the frontend-calculated discount amount (includes global + item discounts)
    const frontendCalculatedDiscount = body.discount_amount;
    if (body.discount_amount !== undefined) updateData.discount_amount = body.discount_amount;
    if (body.freight_charges !== undefined) updateData.freight_charges = body.freight_charges;
    if (body.tax_percentage !== undefined) updateData.tax_percentage = body.tax_percentage;
    if (body.tax_amount !== undefined) updateData.tax_amount = body.tax_amount;
    if (body.taxable_amount !== undefined) updateData.taxable_amount = body.taxable_amount;
    if (body.grand_total !== undefined) updateData.grand_total = body.grand_total;
    if (body.delivery_date !== undefined) updateData.expected_delivery_date = body.delivery_date; // Map to correct column
    if (body.delivery_floor !== undefined) updateData.delivery_floor = body.delivery_floor;
    if (body.first_floor_awareness !== undefined) updateData.first_floor_awareness = body.first_floor_awareness;
    // Note: payment_methods field doesn't exist in sales_orders table schema
    // if (body.payment_methods !== undefined) updateData.payment_methods = body.payment_methods;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.created_by !== undefined) updateData.created_by = body.created_by;
    if (body.invoiceDate !== undefined) updateData.created_at = body.invoiceDate; // Map invoiceDate to created_at
    if (body.emi_enabled !== undefined) updateData.emi_enabled = body.emi_enabled;
    if (body.emi_plan !== undefined) updateData.emi_plan = body.emi_plan;
    if (body.emi_monthly !== undefined) updateData.emi_monthly = body.emi_monthly;
    if (body.bajaj_finance_amount !== undefined) updateData.bajaj_finance_amount = body.bajaj_finance_amount;
    if (body.bajaj_approved_amount !== undefined) updateData.bajaj_approved_amount = body.bajaj_approved_amount;

    // Bajaj Finance charge tracking fields
    if (body.bajaj_processing_fee_rate !== undefined) updateData.bajaj_processing_fee_rate = body.bajaj_processing_fee_rate;
    if (body.bajaj_processing_fee_amount !== undefined) updateData.bajaj_processing_fee_amount = body.bajaj_processing_fee_amount;
    if (body.bajaj_convenience_charges !== undefined) updateData.bajaj_convenience_charges = body.bajaj_convenience_charges;
    if (body.bajaj_total_customer_payment !== undefined) updateData.bajaj_total_customer_payment = body.bajaj_total_customer_payment;
    if (body.bajaj_merchant_receivable !== undefined) updateData.bajaj_merchant_receivable = body.bajaj_merchant_receivable;

    console.log('Sales order update data prepared:', updateData);
    console.log('Freight charges in update:', {
      freight_charges: updateData.freight_charges,
      has_freight_charges: 'freight_charges' in updateData,
      freight_value: body.freight_charges
    });
    console.log('Schema mappings applied:', {
      delivery_date_mapped_to: 'expected_delivery_date',
      payment_methods_excluded: 'field does not exist in sales_orders table',
      items_excluded: 'items handled separately in sales_order_items table',
      total_price_excluded: 'field does not exist in sales_orders table, use final_price'
    });

    // Update the sales order
    const { data, error } = await supabase
      .from('sales_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update sales order' },
        { status: 500 }
      );
    }

    // Update items if provided - use smart update strategy to avoid foreign key constraints
    if (body.items && Array.isArray(body.items)) {
      // Fetch existing items
      const { data: existingItems, error: fetchItemsError } = await supabase
        .from('sales_order_items')
        .select('*')
        .eq('order_id', id);

      if (fetchItemsError) {
        console.error('Error fetching existing items:', fetchItemsError);
        return NextResponse.json({ error: fetchItemsError.message }, { status: 500 });
      }

      // Process items for update/insert/delete operations
      const existingItemsMap = new Map();
      existingItems?.forEach(item => {
        const key = item.product_id ? `product_${item.product_id}` : `custom_${item.custom_product_id}`;
        existingItemsMap.set(key, item);
      });

      const newItemsMap = new Map();
      const processedItems = body.items.filter((item: {
        product_id?: string;
        custom_product_id?: string;
        quantity: number;
        unit_price: number;
        name?: string;
        supplier_name?: string;
        final_price?: number;
        discount_percentage?: number;
        cost?: number;
        supplier_id?: string;
        image_url?: string;
      }) => {
        // Create a unique key for each item
        const key = item.product_id ? `product_${item.product_id}` : `custom_${item.custom_product_id}`;
        
        if (!key || key === 'product_' || key === 'custom_') {
          console.warn('Skipping item with no valid product_id or custom_product_id:', item);
          return false;
        }

        if (newItemsMap.has(key)) {
          // If duplicate found, combine quantities
          const existingItem = newItemsMap.get(key);
          existingItem.quantity += item.quantity;
          console.log(`Merged duplicate item ${key}: new quantity ${existingItem.quantity}`);
          return false;
        } else {
          newItemsMap.set(key, item);
          return true;
        }
      });

      // Update existing items and collect new items for insertion
      const itemsToInsert: Array<{
        order_id: string;
        product_id?: string | null;
        custom_product_id?: string | null;
        quantity: number;
        unit_price: number;
        final_price: number;
        cost: number;
        discount_percentage: number;
        name?: string | null;
        supplier_name?: string | null;
        supplier_id?: string | null;
        image_url?: string | null;
      }> = [];
      const itemsToUpdate: Array<{
        id: string;
        quantity: number;
        unit_price: number;
        final_price: number;
        discount_percentage: number;
        cost: number;
        name?: string | null;
        supplier_name?: string | null;
        supplier_id?: string | null;
        image_url?: string | null;
      }> = [];
      const itemsToDelete: string[] = [];

      // Process new/updated items
      for (const item of processedItems) {
        const key = item.product_id ? `product_${item.product_id}` : `custom_${item.custom_product_id}`;
        const existingItem = existingItemsMap.get(key);

        if (existingItem) {
          // Update existing item
          itemsToUpdate.push({
            id: existingItem.id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            final_price: item.final_price || item.unit_price || 0,
            discount_percentage: item.discount_percentage || 0,
            cost: item.cost || 0,
            name: item.name || existingItem.name,
            supplier_name: item.supplier_name || existingItem.supplier_name,
            supplier_id: item.supplier_id || existingItem.supplier_id,
            image_url: item.image_url || existingItem.image_url
          });
        } else {
          // New item to insert
          itemsToInsert.push({
            order_id: id,
            product_id: item.product_id || null,
            custom_product_id: item.custom_product_id || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            final_price: item.final_price || item.unit_price || 0,
            cost: item.cost || 0,
            discount_percentage: item.discount_percentage || 0,
            name: item.name || null,
            supplier_name: item.supplier_name || null,
            supplier_id: item.supplier_id || null,
            image_url: item.image_url || null
          });
        }
      }

      // Find items to delete (existing items not in new list)
      existingItemsMap.forEach((existingItem, key) => {
        if (!newItemsMap.has(key)) {
          itemsToDelete.push(existingItem.id);
        }
      });

      // Perform updates
      for (const updateItem of itemsToUpdate) {
        const { error: updateItemError } = await supabase
          .from('sales_order_items')
          .update({
            quantity: updateItem.quantity,
            unit_price: updateItem.unit_price,
            final_price: updateItem.final_price,
            discount_percentage: updateItem.discount_percentage,
            cost: updateItem.cost,
            name: updateItem.name,
            supplier_name: updateItem.supplier_name,
            supplier_id: updateItem.supplier_id,
            image_url: updateItem.image_url
          })
          .eq('id', updateItem.id);

        if (updateItemError) {
          console.error(`Error updating item ${updateItem.id}:`, updateItemError);
          return NextResponse.json({ error: updateItemError.message }, { status: 500 });
        }
      }

      // Insert new items
      if (itemsToInsert.length > 0) {
        const { error: insertItemsError } = await supabase
          .from('sales_order_items')
          .insert(itemsToInsert);

        if (insertItemsError) {
          console.error('Error inserting order items:', insertItemsError);
          return NextResponse.json({ error: insertItemsError.message }, { status: 500 });
        }
      }

      // Try to delete items that are no longer needed (skip if referenced by other tables)
      for (const itemId of itemsToDelete) {
        const { error: deleteItemError } = await supabase
          .from('sales_order_items')
          .delete()
          .eq('id', itemId);

        if (deleteItemError) {
          console.warn(`Could not delete item ${itemId}, likely referenced by other tables:`, deleteItemError);
          // Don't return error, just log warning - item might be referenced by deliveries, returns, etc.
        }
      }

      console.log(`Items processing completed: ${itemsToUpdate.length} updated, ${itemsToInsert.length} inserted, ${itemsToDelete.length} deletion attempts`);
      
      // Calculate total discount amount from all items after processing
      let totalItemDiscountAmount = 0;
      let totalOriginalAmount = 0;

      // Calculate from updated/inserted items
      for (const item of [...itemsToUpdate, ...itemsToInsert]) {
        const lineTotal = item.unit_price * item.quantity;
        const discountAmount = lineTotal * (item.discount_percentage / 100);
        totalItemDiscountAmount += discountAmount;
        totalOriginalAmount += lineTotal;
      }

      // Add discount amounts from existing items that weren't updated
      const processedItemKeys = new Set();
      processedItems.forEach((item: { product_id?: string; custom_product_id?: string }) => {
        const key = item.product_id ? `product_${item.product_id}` : `custom_${item.custom_product_id}`;
        processedItemKeys.add(key);
      });

      existingItemsMap.forEach((existingItem, key) => {
        if (!processedItemKeys.has(key) && !itemsToDelete.includes(existingItem.id)) {
          const lineTotal = existingItem.unit_price * existingItem.quantity;
          const discountAmount = lineTotal * (existingItem.discount_percentage / 100);
          totalItemDiscountAmount += discountAmount;
          totalOriginalAmount += lineTotal;
        }
      });

      // Handle global discount if provided
      if (body.global_discount_percentage && body.global_discount_percentage > 0) {
        const globalDiscountAmount = totalOriginalAmount * (body.global_discount_percentage / 100);
        totalItemDiscountAmount += globalDiscountAmount;
        console.log(`Applied global discount: ${body.global_discount_percentage}% = ₹${globalDiscountAmount}`);
      } else if (body.global_discount_amount && body.global_discount_amount > 0) {
        totalItemDiscountAmount += body.global_discount_amount;
        console.log(`Applied global discount amount: ₹${body.global_discount_amount}`);
      }

      // Use frontend-calculated discount if provided, otherwise use our calculation
      const finalDiscountAmount = frontendCalculatedDiscount !== undefined ? frontendCalculatedDiscount : totalItemDiscountAmount;
      const finalOriginalPrice = body.original_price !== undefined ? body.original_price : totalOriginalAmount;
      const finalFinalPrice = body.final_price !== undefined ? body.final_price : (finalOriginalPrice - finalDiscountAmount);
      
      // Update the sales order with the correct discount amount
      const finalUpdateData = {
        ...updateData,
        discount_amount: finalDiscountAmount,
        original_price: finalOriginalPrice,
        final_price: finalFinalPrice
      };

      console.log(`Discount calculation: Original ₹${finalOriginalPrice}, Total Discounts ₹${finalDiscountAmount} (${frontendCalculatedDiscount !== undefined ? 'frontend-calculated' : 'API-calculated'}), Final ₹${finalFinalPrice}`);

      // Update sales order with calculated discount
      const { data: finalData, error: finalUpdateError } = await supabase
        .from('sales_orders')
        .update(finalUpdateData)
        .eq('id', id)
        .select()
        .single();

      if (finalUpdateError) {
        console.error('Error updating sales order with calculated discounts:', finalUpdateError);
        return NextResponse.json({ error: 'Failed to update discount calculations' }, { status: 500 });
      }

      // Return the updated data
      return NextResponse.json({
        message: 'Sales order updated successfully',
        order: finalData
      });
    }

    console.log(`Sales order ${id} updated successfully`);

    return NextResponse.json({
      message: 'Sales order updated successfully',
      order: data
    });

  } catch (error) {
    console.error('Update sales order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
