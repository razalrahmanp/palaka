// app/api/vendors/[id]/purchase-orders/route.ts
import { supabase } from '@/lib/supabasePool'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;
    const { searchParams } = new URL(request.url);
    const excludeLinked = searchParams.get('exclude_linked') === 'true';

    const query = supabase
      .from('purchase_orders')
      .select(`
        id,
        quantity,
        status,
        total,
        created_at,
        description,
        is_custom,
        custom_type,
        product_name,
        sales_order_id,
        product:products(id, name)
      `)
      .eq('supplier_id', vendorId)
      .order('created_at', { ascending: false });

    const { data: purchaseOrders, error } = await query;

    if (error) throw error;

    let filteredPurchaseOrders = purchaseOrders || [];

    // If requested, filter out purchase orders that are already linked to vendor bills
    if (excludeLinked) {
      try {
        // Get all purchase order IDs that are already linked to vendor bills for this supplier
        const { data: linkedPOs, error: linkError } = await supabase
          .from('vendor_bill_po_links')
          .select(`
            purchase_order_id,
            vendor_bills!inner(supplier_id)
          `)
          .eq('vendor_bills.supplier_id', vendorId);

        if (linkError) {
          console.error('Error fetching linked POs:', linkError);
        } else {
          const linkedPOIds = new Set(linkedPOs?.map(link => link.purchase_order_id) || []);
          filteredPurchaseOrders = purchaseOrders?.filter(po => !linkedPOIds.has(po.id)) || [];
        }
      } catch (linkingError) {
        console.error('Error filtering linked purchase orders:', linkingError);
        // If filtering fails, return all purchase orders
      }
    }

    return NextResponse.json(filteredPurchaseOrders);
  } catch (error) {
    console.error('GET /api/vendors/[id]/purchase-orders error', error);
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
  }
}
