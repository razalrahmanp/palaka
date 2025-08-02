// app/api/vendors/[id]/purchase-orders/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;

    const { data: purchaseOrders, error } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        quantity,
        status,
        total,
        created_at,
        product:products(id, name)
      `)
      .eq('supplier_id', vendorId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(purchaseOrders || []);
  } catch (error) {
    console.error('GET /api/vendors/[id]/purchase-orders error', error);
    return NextResponse.json({ error: 'Failed to fetch purchase orders' }, { status: 500 });
  }
}
