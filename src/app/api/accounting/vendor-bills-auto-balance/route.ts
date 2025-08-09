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

export async function GET() {
  try {
    // Get all approved purchase orders
    const { data: approvedPOs, error: poError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        total,
        created_at,
        status,
        supplier_id,
        description,
        suppliers (
          name
        ),
        products (
          name
        )
      `)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (poError) {
      throw poError;
    }

    // Get existing vendor bills for these POs
    const poIds = approvedPOs?.map(po => po.id) || [];
    const { data: existingBills, error: billsError } = await supabase
      .from('vendor_bills')
      .select('purchase_order_id')
      .in('purchase_order_id', poIds);

    if (billsError) {
      throw billsError;
    }

    const existingBillPOIds = new Set(existingBills?.map(bill => bill.purchase_order_id) || []);

    // Filter POs that don't have vendor bills
    const posWithoutBills = approvedPOs?.filter(po => 
      !existingBillPOIds.has(po.id) && po.total && po.total > 0
    ) || [];

    const data = {
      total_purchase_orders: approvedPOs?.length || 0,
      missing_vendor_bills: posWithoutBills.length,
      approved_pos_without_bills: posWithoutBills.map(po => ({
        id: po.id,
        total: po.total || 0,
        created_at: po.created_at,
        status: po.status,
        supplier_name: Array.isArray(po.suppliers) && po.suppliers.length > 0 
          ? po.suppliers[0].name 
          : null,
        product_name: Array.isArray(po.products) && po.products.length > 0 
          ? po.products[0].name 
          : null,
        description: po.description
      }))
    };

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching vendor bill status:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch vendor bill status' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, purchase_order_ids } = await request.json();

    if (action !== 'create_missing_vendor_bills') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Get purchase orders to process
    let query = supabase
      .from('purchase_orders')
      .select(`
        id,
        supplier_id,
        total,
        status,
        suppliers (
          name
        )
      `)
      .eq('status', 'approved')
      .not('total', 'is', null)
      .gt('total', 0);

    if (purchase_order_ids && purchase_order_ids.length > 0) {
      query = query.in('id', purchase_order_ids);
    }

    const { data: purchaseOrders, error: poError } = await query;

    if (poError) {
      throw poError;
    }

    if (!purchaseOrders || purchaseOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No purchase orders found to process',
        data: {
          processed: 0,
          successful: 0,
          failed: 0,
          results: []
        }
      });
    }

    // Check which POs already have vendor bills
    const poIds = purchaseOrders.map(po => po.id);
    const { data: existingBills } = await supabase
      .from('vendor_bills')
      .select('purchase_order_id')
      .in('purchase_order_id', poIds);

    const existingBillPOIds = new Set(existingBills?.map(bill => bill.purchase_order_id) || []);

    // Filter out POs that already have vendor bills
    const posToProcess = purchaseOrders.filter(po => 
      !existingBillPOIds.has(po.id) && po.supplier_id
    );

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const po of posToProcess) {
      try {
        const vendorBill = await createVendorBillFromPO({
          purchase_order_id: po.id,
          supplier_id: po.supplier_id,
          total_amount: po.total
        });

        results.push({
          purchase_order_id: po.id,
          vendor_bill_id: vendorBill.id,
          bill_number: vendorBill.bill_number,
          status: 'success' as const,
          total: po.total
        });

        successful++;
        console.log(`✅ Created vendor bill ${vendorBill.bill_number} for PO ${po.id}`);

      } catch (error) {
        results.push({
          purchase_order_id: po.id,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : 'Unknown error',
          total: po.total
        });

        failed++;
        console.error(`❌ Failed to create vendor bill for PO ${po.id}:`, error);
      }
    }

    const processed = posToProcess.length;

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} purchase orders. ${successful} vendor bills created, ${failed} failed.`,
      data: {
        processed,
        successful,
        failed,
        results
      }
    });

  } catch (error) {
    console.error('Error creating vendor bills:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create vendor bills' 
      },
      { status: 500 }
    );
  }
}
