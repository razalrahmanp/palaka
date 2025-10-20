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
    console.log('Starting vendor stats API call...');
    
    // Get basic vendor data
    const { data: vendors, error: vendorsError } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (vendorsError) {
      console.error('Vendors error:', vendorsError);
      throw vendorsError;
    }

    console.log(`Found ${vendors?.length || 0} vendors`);
    
    // Check if SPAZIO is in the vendors list
    const spazioVendor = vendors?.find(v => v.name.includes('SPAZIO'));
    console.log('SPAZIO vendor found:', spazioVendor);

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

    // Group data by vendor_id for efficient processing
    const purchaseOrdersByVendor = new Map<string, PurchaseOrder[]>();
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

    // Use individual queries for each vendor to ensure accuracy (same as individual stock API)
    const vendorStats = await Promise.all(vendors.map(async (vendor: Vendor) => {
      // Get inventory items for this specific vendor using the same query as individual API
      const { data: vendorProducts } = await supabase
        .from('inventory_items')
        .select(`
          quantity,
          products!inner(
            price,
            cost,
            supplier_id
          )
        `)
        .eq('products.supplier_id', vendor.id);

      const purchaseOrders = purchaseOrdersByVendor.get(vendor.id) || [];
      const vendorBills = billsByVendor.get(vendor.id) || [];
      const products = vendorProducts || [];

        // Calculate current stock metrics - only count items with quantity > 0
        const currentStockQuantity = products.reduce((sum: number, item: InventoryItem) => {
          const quantity = Number(item.quantity) || 0;
          return quantity > 0 ? sum + quantity : sum;
        }, 0);
        const currentStockValue = products.reduce((sum: number, item: InventoryItem) => {
          const quantity = Number(item.quantity) || 0;
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const price = Number(product?.price) || 0;
          // Only include items with quantity > 0 to match individual stock API behavior
          if (quantity > 0) {
            return sum + (quantity * price);
          }
          return sum;
        }, 0);

        // Calculate total purchase cost (what was paid to vendor) - using same logic as individual stock API
        const totalPurchaseCost = products.reduce((sum: number, item: InventoryItem) => {
          const quantity = Number(item.quantity) || 0;
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const cost = Number(product?.cost) || 0;
          // Only include items with quantity > 0 to match individual stock API behavior
          if (quantity > 0) {
            return sum + (quantity * cost);
          }
          return sum;
        }, 0);

        // Calculate stock availability metrics
        const outOfStockItems = products.filter((item: InventoryItem) => {
          const quantity = Number(item.quantity) || 0;
          return quantity === 0;
        }).length;

        const availableProducts = products.filter((item: InventoryItem) => {
          const quantity = Number(item.quantity) || 0;
          return quantity > 0;
        }).length;

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
          products_count: products.length, // Total products regardless of stock
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
          status: totalPurchaseOrders > 0 || products.length > 0 ? 'Active' : 'Inactive',
          // Stock availability metrics
          out_of_stock_items: outOfStockItems,
          available_products: availableProducts
        };
      }));

    // Sort vendors by current stock value (highest first)
    const sortedVendorStats = vendorStats.sort((a, b) => {
      return (b.current_stock_value || 0) - (a.current_stock_value || 0);
    });

    return NextResponse.json(sortedVendorStats, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('GET /api/vendors/stats error', error);
    return NextResponse.json({ error: 'Failed to fetch vendor statistics' }, { status: 500 });
  }
}
