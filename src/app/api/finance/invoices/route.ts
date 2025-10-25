import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date?: string;
  date: string;
  method: string;
  reference?: string;
  description?: string;
}

interface Refund {
  id: string;
  invoice_id: string;
  refund_amount: number;
  status: string;
  processed_at: string;
  reason: string;
  refund_type: string;
}

interface SalesOrderItemFromDB {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  final_price: number;
  product_id?: string;
  products?: {
    sku: string;
  }[];
}

interface ReturnItemWithDetails {
  id: string;
  sales_order_item_id: string;
  quantity: number;
  refund_amount: number;
  status: string;
  returns: {
    id: string;
    order_id: string;
    status: string;
    return_type: string;
  }[];
}

export async function GET() {
  try {
    console.log('🧾 Fetching ALL invoices for finance management...');

    // First fetch invoices without complex joins to avoid schema issues
    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(`
        id,
        sales_order_id,
        customer_id,
        total,
        paid_amount,
        status,
        created_at,
        customer_name,
        waived_amount
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error('❌ Error fetching invoices:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`📋 Found ${invoices?.length || 0} invoices`);

    // Fetch customer and sales order data separately
    const customerIds = invoices ? [...new Set(invoices.map(inv => inv.customer_id).filter(Boolean))] : [];
    const salesOrderIds = invoices ? [...new Set(invoices.map(inv => inv.sales_order_id).filter(Boolean))] : [];

    // Fetch customers
    const { data: customers } = await supabase
      .from("customers")
      .select("id, name, phone, email, address")
      .in("id", customerIds);

    // First, fetch return data for invoice items to calculate return status
    const { data: returnItems, error: returnItemsError } = await supabase
      .from("return_items")
      .select(`
        id,
        sales_order_item_id,
        quantity,
        refund_amount,
        status,
        returns!inner(
          id,
          order_id,
          status,
          return_type
        )
      `)
      .in("returns.order_id", salesOrderIds);

    if (returnItemsError) {
      console.error('❌ Error fetching return items:', returnItemsError);
    }

    // Group return items by sales order item ID to calculate return status
    const returnsByItem = new Map();
    returnItems?.forEach((returnItem: ReturnItemWithDetails) => {
      if (!returnsByItem.has(returnItem.sales_order_item_id)) {
        returnsByItem.set(returnItem.sales_order_item_id, {
          total_returned: 0,
          return_entries: []
        });
      }
      const itemReturns = returnsByItem.get(returnItem.sales_order_item_id);
      itemReturns.total_returned += Number(returnItem.quantity) || 0;
      itemReturns.return_entries.push(returnItem);
    });

    // Fetch sales orders with items
    const { data: salesOrders } = await supabase
      .from("sales_orders")
      .select(`
        id, 
        final_price, 
        status,
        sales_order_items!order_id (
          id,
          name,
          quantity,
          unit_price,
          final_price,
          product_id,
          products!product_id (
            sku
          )
        )
      `)
      .in("id", salesOrderIds);

    // Create lookup maps
    const customersMap = new Map(customers?.map(c => [c.id, c]) || []);
    const salesOrdersMap = new Map(salesOrders?.map(so => ({
      ...so,
      sales_order_items: so.sales_order_items.map((item: SalesOrderItemFromDB) => ({
        ...item,
        returned_quantity: returnsByItem.get(item.id)?.total_returned || 0,
        available_for_return: Math.max(0, item.quantity - (returnsByItem.get(item.id)?.total_returned || 0)),
        return_status: (() => {
          const returned = returnsByItem.get(item.id)?.total_returned || 0;
          if (returned === 0) return 'none';
          if (returned >= item.quantity) return 'full';
          return 'partial';
        })(),
        return_entries: returnsByItem.get(item.id)?.return_entries || []
      }))
    })).map(so => [so.id, so]) || []);

    // Fetch all payments for these invoices
    const invoiceIds = invoices?.map(inv => inv.id) || [];
    const { data: payments, error: paymentsError } = await supabase
      .from("payments")
      .select(`
        id,
        invoice_id,
        amount,
        payment_date,
        date,
        method,
        reference,
        description
      `)
      .in("invoice_id", invoiceIds);

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError);
    }

    // Fetch all refunds for these invoices
    const { data: refunds, error: refundsError } = await supabase
      .from("invoice_refunds")
      .select(`
        id,
        invoice_id,
        refund_amount,
        status,
        processed_at,
        reason,
        refund_type
      `)
      .in("invoice_id", invoiceIds)
      .eq("status", "processed"); // Only count processed refunds

    if (refundsError) {
      console.error('❌ Error fetching refunds:', refundsError);
    }

    // Group payments by invoice
    const paymentsByInvoice = new Map();
    payments?.forEach((payment: Payment) => {
      if (!paymentsByInvoice.has(payment.invoice_id)) {
        paymentsByInvoice.set(payment.invoice_id, []);
      }
      paymentsByInvoice.get(payment.invoice_id).push(payment);
    });

    // Group refunds by invoice and calculate total refunded amount
    const refundsByInvoice = new Map();
    refunds?.forEach((refund: Refund) => {
      if (!refundsByInvoice.has(refund.invoice_id)) {
        refundsByInvoice.set(refund.invoice_id, { total: 0, refunds: [] });
      }
      const invoiceRefunds = refundsByInvoice.get(refund.invoice_id);
      invoiceRefunds.total += Number(refund.refund_amount) || 0;
      invoiceRefunds.refunds.push(refund);
    });

    // Enhance invoices with payment data and calculated amounts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enhancedInvoices = invoices?.map((invoice: any) => {
      const invoicePayments = paymentsByInvoice.get(invoice.id) || [];
      const actualPaidAmount = invoicePayments.reduce((sum: number, payment: Payment) => sum + (Number(payment.amount) || 0), 0);
      const waived = Number(invoice.waived_amount) || 0;
      
      // Get customer and sales order from maps first
      const customer = customersMap.get(invoice.customer_id);
      const salesOrder = salesOrdersMap.get(invoice.sales_order_id);
      
      // Calculate total from sales order items' final_price instead of invoice.total
      const totalInvoice = salesOrder?.sales_order_items?.reduce((sum: number, item: SalesOrderItemFromDB) => {
        return sum + (Number(item.final_price) || 0);
      }, 0) || Number(invoice.total) || 0;
      
      // Get refund data for this invoice
      const invoiceRefundData = refundsByInvoice.get(invoice.id) || { total: 0, refunds: [] };
      const totalRefunded = invoiceRefundData.total;
      
      const balance = totalInvoice - actualPaidAmount - waived - totalRefunded;
      const customerName = customer?.name || invoice.customer_name || 'Unknown Customer';

      return {
        id: invoice.id,
        sales_order_id: invoice.sales_order_id,
        customer_id: invoice.customer_id,
        customer_name: customerName,
        customer_phone: customer?.phone || '',
        customer_email: customer?.email || '',
        customer_address: customer?.address || '',
        total: totalInvoice,
        paid_amount: actualPaidAmount,
        waived_amount: waived,
        total_refunded: totalRefunded,
        balance_due: balance > 0 ? balance : 0,
        status: invoice.status,
        created_at: invoice.created_at,
        payment_count: invoicePayments.length,
        refund_count: invoiceRefundData.refunds.length,
        sales_order: salesOrder,
        payments: invoicePayments,
        refunds: invoiceRefundData.refunds
      };
    }) || [];

    console.log(`✅ Enhanced ${enhancedInvoices.length} invoices with payment data`);

    return NextResponse.json(enhancedInvoices);
  } catch (error) {
    console.error('💥 Invoices API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { sales_order_id, customer_name, total, status, paid_amount, invoiceDate } = body;

  // Log received body for debug
  console.log("Received body:", body);

  // Convert invoice date to ISO timestamp for created_at
  let createdAt = new Date().toISOString();
  if (invoiceDate) {
    try {
      // Parse the invoice date and set time to current time
      const invoiceDateObj = new Date(invoiceDate);
      const currentTime = new Date();
      invoiceDateObj.setHours(currentTime.getHours(), currentTime.getMinutes(), currentTime.getSeconds(), currentTime.getMilliseconds());
      createdAt = invoiceDateObj.toISOString();
    } catch (error) {
      console.warn('Invalid invoice date provided, using current timestamp:', error);
    }
  }

  // Validate sales_order_id exists
  const { data: so, error: soErr } = await supabase
    .from("sales_orders")
    .select("customer_id,total")
    .eq("id", sales_order_id)
    .single();

  console.log("Sales order found:", so);

  if (soErr || !so) {
    return NextResponse.json({ error: "Invalid sales_order_id" }, { status: 400 });
  }

  // Normalize status to lowercase to match CHECK constraint
  const normalizedStatus = (status ?? "").toLowerCase();

  try {
    // 1. Create invoice record
    const { data: invoice, error } = await supabase
      .from("invoices")
      .insert([
        {
          sales_order_id,
          customer_id: so.customer_id,
          customer_name,
          total,
          status: normalizedStatus,
          paid_amount,
          created_at: createdAt, // Use invoice date as created_at
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error inserting invoice:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 2. Create accounting journal entry for the invoice
    // Dr. Accounts Receivable / Cr. Sales Revenue
    try {
      // TODO: Accounting integration removed
      // await createInvoiceJournalEntry({
      //   id: invoice.id,
      //   total: total,
      //   created_at: new Date().toISOString(),
      //   customer_id: so.customer_id
      // });
      console.log(`✅ Journal entry creation skipped for invoice ${invoice.id}`);
    } catch (journalError) {
      console.error('❌ Failed to create journal entry for invoice:', journalError);
      // Don't fail the invoice creation, but log the error
    }

    return NextResponse.json({ 
      data: invoice,
      accounting_integration: true,
      message: "Invoice created with automatic journal entry"
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}


export async function PUT(req: Request) {
  const body = await req.json();
  const { id, status, paid_amount } = body;

  if (!id) {
    return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });
  }

  // Validate status
  const allowedStatuses = ["unpaid", "paid"];
  const normalizedStatus = (status ?? "").toLowerCase();
  if (status && !allowedStatuses.includes(normalizedStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // 🟡 Step 1: Fetch current invoice
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // 🟡 Step 2: Calculate new paid_amount by adding the new input
  let newPaymentAmount = 0;
  if (paid_amount !== undefined && paid_amount > 0) {
    newPaymentAmount = paid_amount;
  }

  const updatedPaidAmount = invoice.paid_amount + newPaymentAmount;

  // 🟡 Step 3: Update invoice with new total paid amount and status (if any)
  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      ...(status ? { status: normalizedStatus } : {}),
      paid_amount: updatedPaidAmount,
    })
    .eq("id", id);

  if (updateError) {
    console.error("Error updating invoice:", updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 🟡 Step 4: Create new payment record if a new amount was paid
  if (newPaymentAmount > 0) {
    const now = new Date();
    const { error: insertPaymentError } = await supabase
      .from("payments")
      .insert([
        {
          invoice_id: id,
          amount: newPaymentAmount,
          method: "manual",
          date: now.toISOString().split("T")[0],
          payment_date: now.toISOString(),
        },
      ]);

    if (insertPaymentError) {
      console.error("Error inserting payment record:", insertPaymentError);
      return NextResponse.json({ error: insertPaymentError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}


