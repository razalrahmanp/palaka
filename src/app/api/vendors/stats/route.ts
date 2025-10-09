// app/api/vendors/stats/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextResponse } from 'next/server'

// Type definitions
interface Vendor {
  id: string;
  name: string;
  contact: string;
}

interface PurchaseOrder {
  id: string;
  quantity: number;
  status: string;
  total: number;
  paid_amount: number;
  payment_status: string;
  created_at: string;
  supplier_id: string;
}

interface VendorBill {
  id: string;
  supplier_id: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
}

interface Product {
  price: number;
  cost: number;
  supplier_id: string;
}

interface InventoryItem {
  quantity: number;
  products: Product | Product[];
}

export async function GET() {
  try {
    // Get basic vendor data
    const { data: vendors, error: vendorsError } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true })

    if (vendorsError) throw vendorsError;

    // Bulk fetch all purchase orders for all vendors in one query
    const { data: allPurchaseOrders } = await supabase
      .from('purchase_orders')
      .select('id, quantity, status, total, paid_amount, payment_status, created_at, supplier_id')
      .in('supplier_id', vendors.map(v => v.id));

    // Bulk fetch all vendor bills for all vendors in one query
    const { data: allVendorBills } = await supabase
      .from('vendor_bills')
      .select('id, supplier_id, total_amount, paid_amount, status, created_at')
      .in('supplier_id', vendors.map(v => v.id));

    // Bulk fetch all inventory data for all vendors in one query
    const { data: allVendorProducts } = await supabase
      .from('inventory_items')
      .select(`
        quantity,
        products!inner(price, cost, supplier_id)
      `)
      .in('products.supplier_id', vendors.map(v => v.id));

    // Group data by vendor_id for efficient processing
    const purchaseOrdersByVendor = new Map<string, PurchaseOrder[]>();
    const productsByVendor = new Map<string, InventoryItem[]>();
    const billsByVendor = new Map<string, VendorBill[]>();

    // Group purchase orders by vendor
    allPurchaseOrders?.forEach(po => {
      if (!purchaseOrdersByVendor.has(po.supplier_id)) {
        purchaseOrdersByVendor.set(po.supplier_id, []);
      }
      purchaseOrdersByVendor.get(po.supplier_id)!.push(po);
    });

    // Group vendor bills by vendor
    allVendorBills?.forEach(bill => {
      if (!billsByVendor.has(bill.supplier_id)) {
        billsByVendor.set(bill.supplier_id, []);
      }
      billsByVendor.get(bill.supplier_id)!.push(bill);
    });

    // Group products by vendor
    allVendorProducts?.forEach((item: InventoryItem) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const vendorId = product?.supplier_id;
      if (vendorId) {
        if (!productsByVendor.has(vendorId)) {
          productsByVendor.set(vendorId, []);
        }
        productsByVendor.get(vendorId)!.push(item);
      }
    });

    // Process vendor stats using the grouped data
    const vendorStats = vendors.map((vendor: Vendor) => {
      const purchaseOrders = purchaseOrdersByVendor.get(vendor.id) || [];
      const vendorProducts = productsByVendor.get(vendor.id) || [];
      const vendorBills = billsByVendor.get(vendor.id) || [];

        // Calculate current stock metrics
        const currentStockQuantity = vendorProducts.reduce((sum: number, item: InventoryItem) => sum + (item.quantity || 0), 0);
        const currentStockValue = vendorProducts.reduce((sum: number, item: InventoryItem) => {
          const quantity = item.quantity || 0;
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const price = product?.price || 0;
          return sum + (quantity * price);
        }, 0);

        // Calculate total purchase cost (what was paid to vendor)
        const totalPurchaseCost = vendorProducts.reduce((sum: number, item: InventoryItem) => {
          const quantity = item.quantity || 0;
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const cost = product?.cost || 0;
          return sum + (quantity * cost);
        }, 0);

        // Calculate purchase order metrics
        const totalPurchaseOrders = purchaseOrders.length;
        const pendingOrders = purchaseOrders.filter((po: PurchaseOrder) => po.status === 'pending').length;

        // Calculate payment metrics from VENDOR BILLS (not POs) for accuracy
        const totalBillAmount = vendorBills.reduce((sum: number, bill: VendorBill) => sum + (bill.total_amount || 0), 0);
        const totalPaid = vendorBills.reduce((sum: number, bill: VendorBill) => sum + (bill.paid_amount || 0), 0);
        const totalPending = totalBillAmount - totalPaid;
        const unpaidBills = vendorBills.filter((bill: VendorBill) => bill.status !== 'paid').length;

        // Get last order date
        const lastOrder = purchaseOrders.sort((a: PurchaseOrder, b: PurchaseOrder) => 
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
          products_count: vendorProducts.length,
          // Enhanced Financial metrics in INR with payment tracking
          total_cost_inr: totalPurchaseCost, // Cost value of current stock
          total_mrp_inr: currentStockValue, // MRP value of current stock
          profit_margin_inr: currentStockValue - totalPurchaseCost,
          profit_percentage: totalPurchaseCost > 0 ? (((currentStockValue - totalPurchaseCost) / totalPurchaseCost) * 100) : 0,
          // Bills & Payment tracking (based on actual vendor bills)
          total_bill_amount: totalBillAmount, // Total amount billed
          total_paid: totalPaid, // Amount paid to vendor
          total_pending: totalPending, // Amount still owed to vendor
          unpaid_bills: unpaidBills, // Number of unpaid bills
          payment_status: totalPending > 0 ? 'pending' : 'paid',
          last_order_date: lastOrder?.created_at || null,
          status: totalPurchaseOrders > 0 || vendorProducts.length > 0 ? 'Active' : 'Inactive'
        };
      });

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
