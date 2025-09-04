import { supabase } from '@/lib/supabaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

interface OrderItemWithProducts {
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
    // Fetch sales order with customer details and finance information
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
        )
      `)
      .eq('id', id)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    // Fetch order items with product details, custom products, and manufacturing info
    const { data: itemsData, error: itemsError } = await supabase
      .from('sales_order_items')
      .select(`
        *,
        products:product_id(
          id,
          name, 
          sku, 
          price, 
          suppliers(name),
          boms(id, component, quantity)
        ),
        custom_products:custom_product_id(
          id,
          name,
          sku,
          description,
          config_schema,
          supplier_name
        )
      `)
      .eq('order_id', id);

    if (itemsError) {
      console.error('Error fetching order items:', itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Fetch payment information (temporarily disabled due to schema mismatch)
    // const { data: paymentsData, error: paymentsError } = await supabase
    //   .from('sales_order_payments')
    //   .select('*')
    //   .eq('sales_order_id', id)
    //   .order('payment_date', { ascending: false });

    // if (paymentsError) {
    //   console.error('Error fetching payments:', paymentsError);
    //   // Don't fail the request, just log the error
    // }

    // Fetch payment summary (temporarily disabled due to schema mismatch)
    // const { data: paymentSummaryData, error: paymentSummaryError } = await supabase
    //   .from('sales_order_payment_summary')
    //   .select('*')
    //   .eq('sales_order_id', id)
    //   .single();

    // if (paymentSummaryError) {
    //   console.error('Error fetching payment summary:', paymentSummaryError);
    //   // Don't fail the request, just log the error
    // }

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

    // Try to get sales representative from quotes if quote_id exists
    let salesRepresentative = null;
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
    }

    // Map items to include comprehensive product information
    const rawMappedItems = (itemsData || []).map((item: OrderItemWithProducts) => {
      const isCustomProduct = !!item.custom_product_id;
      const needsManufacturing = item.products?.boms && item.products.boms.length > 0;
      
      // Calculate final price considering discount
      const unitPrice = item.unit_price || 0;
      const quantity = item.quantity || 1;
      const discountPercentage = item.discount_percentage || 0;
      const lineTotal = unitPrice * quantity;
      const discountAmount = lineTotal * (discountPercentage / 100);
      const finalPrice = lineTotal - discountAmount;
      
      return {
        ...item,
        // Product information
        sku: item.products?.sku || item.custom_products?.sku || null,
        name: item.name || item.products?.name || item.custom_products?.name || null,
        supplier_name: item.supplier_name || 
          (item.products?.suppliers && item.products.suppliers.length > 0 
            ? item.products.suppliers[0].name 
            : item.custom_products?.supplier_name || null),
        
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
        
        // Additional details
        description: item.custom_products?.description || null
      };
    });

    // Deduplicate items that have the same product_id or custom_product_id
    const itemsMap = new Map();
    const mappedItems = rawMappedItems.filter((item) => {
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

  // Delete old sales_order_items
  const { error: deleteItemsError } = await supabase
    .from('sales_order_items')
    .delete()
    .eq('order_id', id);

  if (deleteItemsError) {
    console.error('Error deleting sales order items:', deleteItemsError);
    return NextResponse.json({ error: deleteItemsError.message }, { status: 500 });
  }

  // Validate and deduplicate items before inserting
  const itemsMap = new Map();
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

    if (itemsMap.has(key)) {
      // If duplicate found, combine quantities
      const existingItem = itemsMap.get(key);
      existingItem.quantity += item.quantity;
      console.log(`Merged duplicate item ${key}: new quantity ${existingItem.quantity}`);
      return false;
    } else {
      itemsMap.set(key, item);
      return true;
    }
  });

  // Add back the merged items
  itemsMap.forEach((item, key) => {
    if (!processedItems.some(pi => {
      const piKey = pi.product_id ? `product_${pi.product_id}` : `custom_${pi.custom_product_id}`;
      return piKey === key;
    })) {
      processedItems.push(item);
    }
  });

  // Insert new sales_order_items
  const { error: insertItemsError } = await supabase
    .from('sales_order_items')
    .insert(
      processedItems.map((i) => ({
        order_id: id,
        product_id: i.product_id || null,
        custom_product_id: i.custom_product_id || null,
        quantity: i.quantity,
        unit_price: i.unit_price,
        name: i.name || null,
        supplier_name: i.supplier_name || null,
      }))
    );

  if (insertItemsError) {
    console.error('Error inserting order items:', insertItemsError);
    return NextResponse.json({ error: insertItemsError.message }, { status: 500 });
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

    // Update items if provided
    if (body.items && Array.isArray(body.items)) {
      // Delete existing items
      const { error: deleteItemsError } = await supabase
        .from('sales_order_items')
        .delete()
        .eq('order_id', id);

      if (deleteItemsError) {
        console.error('Error deleting existing items:', deleteItemsError);
        return NextResponse.json({ error: 'Failed to update order items' }, { status: 500 });
      }

      // Insert new items
      const itemsToInsert = body.items.map((item: unknown) => {
        const itemData = item as Record<string, unknown>;
        return {
          order_id: id,
          product_id: itemData.product_id || null,
          custom_product_id: itemData.custom_product_id || null,
          quantity: itemData.quantity || 1,
          unit_price: itemData.unit_price || 0,
          final_price: itemData.final_price || itemData.unit_price || 0,
          total_price: itemData.total_price || 0,
          discount_percentage: itemData.discount_percentage || 0,
          name: itemData.name || null,
          supplier_name: itemData.supplier_name || null,
          supplier_id: itemData.supplier_id || null,
          type: itemData.type || 'existing',
          // Custom product fields
          image_url: itemData.image_url || null,
          base_product_name: itemData.base_product_name || null,
          specifications: itemData.specifications || null,
          materials: itemData.materials || null,
          dimensions: itemData.dimensions || null,
          finish: itemData.finish || null,
          color: itemData.color || null,
          custom_instructions: itemData.custom_instructions || null,
          estimated_delivery_days: itemData.estimated_delivery_days || null,
          complexity_level: itemData.complexity_level || null,
          status: itemData.status || null,
          notes: itemData.notes || null,
          configuration: itemData.configuration || null
        };
      });

      const { error: insertItemsError } = await supabase
        .from('sales_order_items')
        .insert(itemsToInsert);

      if (insertItemsError) {
        console.error('Error inserting updated items:', insertItemsError);
        return NextResponse.json({ error: 'Failed to update order items' }, { status: 500 });
      }
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
