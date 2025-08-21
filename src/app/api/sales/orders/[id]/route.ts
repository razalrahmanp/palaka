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
          pincode
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
    const mappedItems = (itemsData || []).map((item: OrderItemWithProducts) => {
      const isCustomProduct = !!item.custom_product_id;
      const needsManufacturing = item.products?.boms && item.products.boms.length > 0;
      
      return {
        ...item,
        // Product information
        sku: item.products?.sku || item.custom_products?.sku || null,
        name: item.name || item.products?.name || item.custom_products?.name || null,
        supplier_name: item.supplier_name || 
          (item.products?.suppliers && item.products.suppliers.length > 0 
            ? item.products.suppliers[0].name 
            : item.custom_products?.supplier_name || null),
        
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
    .update({ status, total })
    .eq('id', id);

  if (updateError) {
    console.error('Error updating sales order:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Delete old order_items
  const { error: deleteItemsError } = await supabase
    .from('order_items')
    .delete()
    .eq('order_id', id);

  if (deleteItemsError) {
    console.error('Error deleting order items:', deleteItemsError);
    return NextResponse.json({ error: deleteItemsError.message }, { status: 500 });
  }

  // Insert new order_items
  const { error: insertItemsError } = await supabase
    .from('order_items')
    .insert(
      items.map((i: {
        product_id: string;
        quantity: number;
        unit_price: number;
      }) => ({
        order_id: id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
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
