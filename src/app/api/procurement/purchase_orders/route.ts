import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseAdmin';

// Helper function to create vendor bill from purchase order
async function createVendorBillFromPO({
  purchase_order_id,
  supplier_id,
  total_amount
}: {
  purchase_order_id: string;
  supplier_id: string;
  total_amount: number;
}) {
  try {
    // Get supplier payment terms
    const { data: paymentTerms } = await supabase
      .from('vendor_payment_terms')
      .select('payment_terms_days')
      .eq('supplier_id', supplier_id)
      .eq('is_active', true)
      .single();

    const termsDays = paymentTerms?.payment_terms_days || 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + termsDays);

    // Generate bill number
    const billNumber = `PO-${purchase_order_id.substring(0, 8)}-${Date.now()}`;

    // Get system user for created_by
    const { data: systemUser } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    // Create vendor bill
    const { data: vendorBill, error: vendorBillError } = await supabase
      .from('vendor_bills')
      .insert({
        bill_number: billNumber,
        supplier_id: supplier_id,
        purchase_order_id: purchase_order_id,
        bill_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        total_amount: total_amount,
        paid_amount: 0,
        status: 'pending',
        description: `Vendor bill for Purchase Order ${purchase_order_id}`,
        reference_number: `PO-REF-${purchase_order_id}`,
        created_by: systemUser?.id,
        updated_by: systemUser?.id
      })
      .select()
      .single();

    if (vendorBillError) {
      throw vendorBillError;
    }

    return vendorBill;
  } catch (error) {
    console.error("Error creating vendor bill from PO:", error);
    throw error;
  }
}

type PurchaseOrderPayload = {
  supplier_id: string;
  product_id?: string;
  quantity: number;
  status: 'pending' | 'approved' | 'received';
  is_custom: boolean;
  custom_type: string | null;
  materials: string[] | null;
  description: string | null;
  images: string[] | null;
  created_by: string | null;
  total: number | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier_id');

    let query = supabase
      .from('purchase_orders')
      .select(`
        id,
        created_at,
        total,
        paid_amount,
        status,
        description,
        supplier_id,
        created_by,
        is_custom,
        custom_type,
        product_name,
        quantity,
        sales_order_id
      `)
      .order('created_at', { ascending: false });

    // Filter by supplier if provided
    if (supplierId) {
      query = query.eq('supplier_id', supplierId);
    }

    const { data: purchaseOrders, error } = await query;

    if (error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get all related data manually
    const supplierIds = [...new Set(purchaseOrders?.map(po => po.supplier_id).filter(Boolean) || [])];
    const creatorIds = [...new Set(purchaseOrders?.map(po => po.created_by).filter(Boolean) || [])];
    const salesOrderIds = [...new Set(purchaseOrders?.map(po => po.sales_order_id).filter(Boolean) || [])];

    // Fetch suppliers
    let suppliersData: Record<string, unknown>[] = [];
    if (supplierIds.length > 0) {
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('id, name')
        .in('id', supplierIds);
      suppliersData = suppliers || [];
    }

    // Fetch creators/users
    let creatorsData: Record<string, unknown>[] = [];
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('users')
        .select('id, name')
        .in('id', creatorIds);
      creatorsData = creators || [];
    }

    // Fetch sales orders with related data
    let salesOrdersData: Record<string, unknown>[] = [];
    if (salesOrderIds.length > 0) {
      const { data: salesOrders } = await supabase
        .from('sales_orders')
        .select(`
          id,
          created_by,
          customer_id,
          sales_representative_id
        `)
        .in('id', salesOrderIds);

      if (salesOrders && salesOrders.length > 0) {
        // Get sales rep and customer data for sales orders
        // Sales rep can be either created_by or sales_representative_id
        const allSalesRepIds = [
          ...salesOrders.map(so => so.created_by).filter(Boolean),
          ...salesOrders.map(so => so.sales_representative_id).filter(Boolean)
        ];
        const salesRepIds = [...new Set(allSalesRepIds)];
        const customerIds = [...new Set(salesOrders.map(so => so.customer_id).filter(Boolean))];

        let salesRepsData: Record<string, unknown>[] = [];
        let customersData: Record<string, unknown>[] = [];

        if (salesRepIds.length > 0) {
          const { data: salesReps } = await supabase
            .from('users')
            .select('id, name')
            .in('id', salesRepIds);
          salesRepsData = salesReps || [];
        }

        if (customerIds.length > 0) {
          const { data: customers } = await supabase
            .from('customers')
            .select('id, name')
            .in('id', customerIds);
          customersData = customers || [];
        }

        // Enrich sales orders with related data
        salesOrdersData = salesOrders.map(so => {
          // Try sales_representative_id first, then created_by
          const salesRepId = so.sales_representative_id || so.created_by;
          const salesRep = salesRepsData.filter(sr => sr.id === salesRepId);
          const customer = customersData.filter(c => c.id === so.customer_id);
          
          return {
            ...so,
            sales_rep: salesRep,
            customer: customer,
            customer_name: customer.length > 0 ? customer[0].name : null
          };
        });
      }
    }

    // Fetch images for purchase orders
    let imagesData: Record<string, unknown>[] = [];
    if (purchaseOrders && purchaseOrders.length > 0) {
      const purchaseOrderIds = purchaseOrders.map(po => po.id);
      const { data: images } = await supabase
        .from('purchase_order_images')
        .select('purchase_order_id, url')
        .in('purchase_order_id', purchaseOrderIds);
      imagesData = images || [];
    }

    // Join all data together
    const enrichedData = purchaseOrders?.map(po => {
      const salesOrder = salesOrdersData.find(so => so.id === po.sales_order_id);
      
      return {
        ...po,
        supplier: suppliersData.find(s => s.id === po.supplier_id) || null,
        creator: creatorsData.find(c => c.id === po.created_by) || null,
        sales_order: salesOrder || null,
        images: imagesData.filter(img => img.purchase_order_id === po.id).map(img => ({ url: img.url })),
        product: null // We'll handle products separately if needed
      };
    }) || [];

    return NextResponse.json(enrichedData);
  } catch (error) {
    console.error('Error in purchase orders GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  let total: number | null = null;

  // If not custom and product_id exists, fetch price
  if (!body.is_custom && body.product_id) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("price")
      .eq("id", body.product_id)
      .single();

    if (productError) {
      console.error(productError);
      return NextResponse.json({ error: "Error fetching product price" }, { status: 500 });
    }

    if (product?.price && body.quantity) {
      total = Number(product.price) * Number(body.quantity);
    }
  }

  const insertPayload: PurchaseOrderPayload = {
    supplier_id: body.supplier_id,
    quantity: body.quantity,
    status: body.status,
    is_custom: Boolean(body.is_custom),
    custom_type: body.custom_type ?? null,
    materials: body.materials ?? null,
    description: body.description ?? null,
    images: body.images ?? null,
    created_by: body.created_by ?? null,
    total, // <-- Save computed total
  };

  if (body.product_id) {
    insertPayload.product_id = body.product_id;
  }

  const { data, error } = await supabase
    .from("purchase_orders")
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}


export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // Get existing PO details before update for vendor bill creation
  const { data: existingPO, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("id, supplier_id, total, status")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const updatePayload: Partial<PurchaseOrderPayload> = {
    quantity: updates.quantity,
    status: updates.status,
    is_custom: updates.is_custom ?? false,
    custom_type: updates.custom_type ?? null,
    materials: updates.materials ?? null,
    description: updates.description ?? null,
    images: updates.images ?? null,
  };

  if (updates.product_id) {
    updatePayload.product_id = updates.product_id;
  }

  // If not custom and product_id exists, recompute total
  let total: number | null = null;
  if (!updates.is_custom && updates.product_id && updates.quantity) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("price")
      .eq("id", updates.product_id)
      .single();

    if (productError) {
      console.error(productError);
      return NextResponse.json({ error: "Error fetching product price" }, { status: 500 });
    }

    if (product?.price) {
      total = Number(product.price) * Number(updates.quantity);
      updatePayload.total = total;
    }
  } else {
    // If custom or missing info, reset total to null
    updatePayload.total = null;
  }

  const { data, error } = await supabase
    .from("purchase_orders")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create vendor bill when PO is approved
  if (updates.status && updates.status === 'approved' && existingPO?.status !== 'approved') {
    try {
      const vendorBillTotal = total || existingPO.total || 0;
      if (vendorBillTotal > 0) {
        await createVendorBillFromPO({
          purchase_order_id: id,
          supplier_id: existingPO.supplier_id,
          total_amount: vendorBillTotal
        });
        console.log(`✅ Vendor bill created for approved purchase order ${id}`);
      }
    } catch (vendorBillError) {
      console.error('❌ Failed to create vendor bill for purchase order:', vendorBillError);
      // Don't fail the entire request if vendor bill creation fails
    }
  }

  return NextResponse.json(data);
}


export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const { error } = await supabase
    .from('purchase_orders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
