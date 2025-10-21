// app/api/vendors/[id]/route.ts
import { supabase } from '@/lib/supabasePool'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;

    // Get vendor basic info
    const { data: vendor, error: vendorError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Get purchase orders stats
    const { data: purchaseOrders } = await supabase
      .from('purchase_orders')
      .select('id, quantity, status, total, created_at')
      .eq('supplier_id', vendorId);

    // Get current stock and value from inventory_items (which contains the actual data)
    const { data: vendorProducts } = await supabase
      .from('inventory_items')
      .select(`
        quantity,
        products!inner(price, cost, supplier_id)
      `)
      .eq('products.supplier_id', vendorId);

    // Calculate current stock metrics
    const currentStockQuantity = vendorProducts?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    const currentStockValue = vendorProducts?.reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const price = product?.price || 0;
      return sum + (quantity * price);
    }, 0) || 0;

    // Calculate total purchase cost (what was paid to vendor)
    const totalPurchaseCost = vendorProducts?.reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const cost = product?.cost || 0;
      return sum + (quantity * cost);
    }, 0) || 0;

    // Calculate profit from this vendor's products
    const totalProfitPotential = currentStockValue - totalPurchaseCost;

    // Calculate metrics
    const totalPurchaseOrders = purchaseOrders?.length || 0;
    const totalSpent = purchaseOrders?.reduce((sum, po) => sum + (po.total || 0), 0) || 0;
    const pendingOrders = purchaseOrders?.filter(po => po.status === 'pending').length || 0;

    // Get last order date
    const lastOrder = purchaseOrders?.sort((a, b) => 
      new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    )?.[0];

    const vendorDetails = {
      ...vendor,
      total_purchase_orders: totalPurchaseOrders,
      total_spent: totalSpent,
      pending_orders: pendingOrders,
      current_stock_value: currentStockValue,
      current_stock_quantity: currentStockQuantity,
      total_purchase_cost: totalPurchaseCost,
      profit_potential: totalProfitPotential,
      products_count: vendorProducts?.length || 0,
      // Financial metrics in INR
      total_cost_inr: totalPurchaseCost,
      total_mrp_inr: currentStockValue,
      profit_margin_inr: totalProfitPotential,
      profit_percentage: totalPurchaseCost > 0 ? ((totalProfitPotential / totalPurchaseCost) * 100) : 0,
      last_order_date: lastOrder?.created_at || null,
      status: totalPurchaseOrders > 0 || (vendorProducts?.length || 0) > 0 ? 'Active' : 'Inactive'
    };

    return NextResponse.json(vendorDetails);
  } catch (error) {
    console.error('GET /api/vendors/[id] error', error);
    return NextResponse.json({ error: 'Failed to fetch vendor details' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;
    const body = await request.json();
    const { name, contact, email, address } = body;

    const { data, error } = await supabase
      .from('suppliers')
      .update({ 
        name, 
        contact, 
        email, 
        address,
        updated_at: new Date().toISOString()
      })
      .eq('id', vendorId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('PUT /api/vendors/[id] error', error);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;

    // Check if vendor has any purchase orders
    const { data: purchaseOrders } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('supplier_id', vendorId)
      .limit(1);

    if (purchaseOrders && purchaseOrders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vendor with existing purchase orders' }, 
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', vendorId);

    if (error) throw error;

    return NextResponse.json({ message: 'Vendor deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/vendors/[id] error', error);
    return NextResponse.json({ error: 'Failed to delete vendor' }, { status: 500 });
  }
}
