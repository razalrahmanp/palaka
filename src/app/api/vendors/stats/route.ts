// app/api/vendors/stats/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Get basic vendor data
    const { data: vendors, error: vendorsError } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true })

    if (vendorsError) throw vendorsError;

    // Get aggregated stats for each vendor
    const vendorStats = await Promise.all(
      vendors.map(async (vendor) => {
        // Purchase orders count and total spent with payment tracking
        const { data: purchaseOrders } = await supabase
          .from('purchase_orders')
          .select('id, quantity, status, total, paid_amount, payment_status, created_at')
          .eq('supplier_id', vendor.id);

        // Get current stock and value from inventory_items (which contains the actual data)
        const { data: vendorProducts } = await supabase
          .from('inventory_items')
          .select(`
            quantity,
            products!inner(price, cost, supplier_id)
          `)
          .eq('products.supplier_id', vendor.id);

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

        // Calculate purchase order metrics with payment tracking
        const totalPurchaseOrders = purchaseOrders?.length || 0;
        const totalSpent = purchaseOrders?.reduce((sum, po) => sum + (po.total || 0), 0) || 0;
        const totalPaid = purchaseOrders?.reduce((sum, po) => sum + (po.paid_amount || 0), 0) || 0;
        const totalPending = totalSpent - totalPaid;
        const pendingOrders = purchaseOrders?.filter(po => po.status === 'pending').length || 0;
        const unpaidOrders = purchaseOrders?.filter(po => po.payment_status !== 'paid').length || 0;

        // Get last order date
        const lastOrder = purchaseOrders?.sort((a, b) => 
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        )?.[0];

        return {
          id: vendor.id,
          name: vendor.name,
          contact: vendor.contact,
          total_purchase_orders: totalPurchaseOrders,
          total_spent: totalPaid, // Amount actually paid to vendor
          pending_orders: pendingOrders,
          current_stock_value: currentStockValue,
          current_stock_quantity: currentStockQuantity,
          total_purchase_cost: totalPurchaseCost,
          profit_potential: currentStockValue - totalPurchaseCost,
          products_count: vendorProducts?.length || 0,
          // Enhanced Financial metrics in INR with payment tracking
          total_cost_inr: totalPurchaseCost, // Cost value of current stock
          total_mrp_inr: currentStockValue, // MRP value of current stock
          profit_margin_inr: currentStockValue - totalPurchaseCost,
          profit_percentage: totalPurchaseCost > 0 ? (((currentStockValue - totalPurchaseCost) / totalPurchaseCost) * 100) : 0,
          // Purchase & Payment tracking
          total_purchase_value: totalSpent, // Total PO value (ordered)
          total_paid: totalPaid, // Amount paid to vendor
          total_pending: totalPending, // Amount still owed to vendor
          unpaid_orders: unpaidOrders, // Number of unpaid orders
          payment_status: totalPending > 0 ? 'pending' : 'paid',
          last_order_date: lastOrder?.created_at || null,
          status: totalPurchaseOrders > 0 || (vendorProducts?.length || 0) > 0 ? 'Active' : 'Inactive'
        };
      })
    );

    // Sort vendors by current stock value (highest first)
    const sortedVendorStats = vendorStats.sort((a, b) => {
      return (b.current_stock_value || 0) - (a.current_stock_value || 0);
    });

    return NextResponse.json(sortedVendorStats);
  } catch (error) {
    console.error('GET /api/vendors/stats error', error);
    return NextResponse.json({ error: 'Failed to fetch vendor statistics' }, { status: 500 });
  }
}
