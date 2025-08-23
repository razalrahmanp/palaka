// app/api/finance/sales-orders/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

interface InvoiceDetail {
  id: string;
  total: number;
  status: string;
  created_at: string;
  paid_amount: number;
  actual_paid_amount: number;
  payment_count: number;
}

interface PaymentDetail {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  date: string;
  method: string;
  reference: string;
  description: string;
}

export async function GET() {
  try {
    console.log('🔍 Finance Sales Orders API - Starting comprehensive fetch...');

    // Fetch sales orders with comprehensive payment and invoice data
    const { data: salesOrders, error: salesOrdersError } = await supabase
      .from("sales_orders")
      .select(`
        id,
        quote_id,
        customer_id,
        status,
        created_at,
        created_by,
        final_price,
        original_price,
        discount_amount,
        customers!customer_id(name, phone, email)
      `)
      .order("created_at", { ascending: false });

    if (salesOrdersError) {
      console.error('❌ Error fetching sales orders:', salesOrdersError);
      return NextResponse.json({ error: salesOrdersError.message }, { status: 500 });
    }

    console.log(`📦 Found ${salesOrders?.length || 0} sales orders`);

    // Fetch all invoices with their payment aggregations
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select(`
        id,
        sales_order_id,
        total,
        status,
        created_at,
        paid_amount,
        customer_name
      `);

    if (invoicesError) {
      console.error('❌ Error fetching invoices:', invoicesError);
      return NextResponse.json({ error: invoicesError.message }, { status: 500 });
    }

    console.log(`🧾 Found ${invoices?.length || 0} invoices`);

    // Fetch all payments with invoice information
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
      `);

    if (paymentsError) {
      console.error('❌ Error fetching payments:', paymentsError);
      return NextResponse.json({ error: paymentsError.message }, { status: 500 });
    }

    console.log(`💰 Found ${payments?.length || 0} payments`);

    // Fetch sales representatives
    const { data: salesReps, error: salesRepsError } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", salesOrders?.map(order => order.created_by).filter(Boolean) || []);

    if (salesRepsError) {
      console.error('❌ Error fetching sales representatives:', salesRepsError);
    }

    // Fetch order items separately
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select(`
        order_id,
        quantity,
        unit_price,
        product_name,
        product_id,
        sku,
        products(name, supplier_id, suppliers(name))
      `)
      .in("order_id", salesOrders?.map(order => order.id) || []);

    if (itemsError) {
      console.error('❌ Error fetching order items:', itemsError);
    }

    // Create maps for efficient lookups
    const invoicesBySalesOrder = new Map();
    const paymentsByInvoice = new Map();
    const salesRepMap = new Map();
    const itemsByOrder = new Map();

    // Group invoices by sales order
    invoices?.forEach(invoice => {
      if (!invoicesBySalesOrder.has(invoice.sales_order_id)) {
        invoicesBySalesOrder.set(invoice.sales_order_id, []);
      }
      invoicesBySalesOrder.get(invoice.sales_order_id).push(invoice);
    });

    // Group payments by invoice
    payments?.forEach(payment => {
      if (!paymentsByInvoice.has(payment.invoice_id)) {
        paymentsByInvoice.set(payment.invoice_id, []);
      }
      paymentsByInvoice.get(payment.invoice_id).push(payment);
    });

    // Create sales rep map
    salesReps?.forEach(rep => {
      salesRepMap.set(rep.id, rep);
    });

    // Group items by order
    orderItems?.forEach(item => {
      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      itemsByOrder.get(item.order_id).push(item);
    });

    // Process each sales order with comprehensive invoice and payment data
    const enrichedOrders = salesOrders?.map(order => {
      const orderInvoices = invoicesBySalesOrder.get(order.id) || [];
      const orderItemsList = itemsByOrder.get(order.id) || [];
      
      let totalPaid = 0;
      const invoiceDetails: InvoiceDetail[] = [];
      const paymentDetails: PaymentDetail[] = [];
      const isInvoiced = orderInvoices.length > 0;
      let invoiceStatus = 'not_invoiced';

      // Process each invoice for this order
      orderInvoices.forEach((invoice: any) => {
        const invoicePayments = paymentsByInvoice.get(invoice.id) || [];
        const invoicePaidAmount = invoicePayments.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);
        
        totalPaid += invoicePaidAmount;

        invoiceDetails.push({
          id: invoice.id,
          total: Number(invoice.total) || 0,
          status: invoice.status,
          created_at: invoice.created_at,
          paid_amount: Number(invoice.paid_amount) || 0,
          actual_paid_amount: invoicePaidAmount, // Calculated from actual payments
          payment_count: invoicePayments.length
        });

        // Add payment details
        invoicePayments.forEach((payment: any) => {
          paymentDetails.push({
            id: payment.id,
            invoice_id: payment.invoice_id,
            amount: Number(payment.amount) || 0,
            payment_date: payment.payment_date,
            date: payment.date,
            method: payment.method,
            reference: payment.reference,
            description: payment.description
          });
        });
      });

      // Determine overall invoice status
      if (orderInvoices.length > 0) {
        const allInvoicesFullyPaid = orderInvoices.every((invoice: any) => {
          const invoicePayments = paymentsByInvoice.get(invoice.id) || [];
          const invoicePaidAmount = invoicePayments.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);
          return invoicePaidAmount >= (Number(invoice.total) || 0);
        });

        const anyInvoicePartiallyPaid = orderInvoices.some((invoice: any) => {
          const invoicePayments = paymentsByInvoice.get(invoice.id) || [];
          const invoicePaidAmount = invoicePayments.reduce((sum: number, payment: any) => sum + (Number(payment.amount) || 0), 0);
          return invoicePaidAmount > 0 && invoicePaidAmount < (Number(invoice.total) || 0);
        });

        if (allInvoicesFullyPaid) {
          invoiceStatus = 'fully_paid';
        } else if (anyInvoicePartiallyPaid || totalPaid > 0) {
          invoiceStatus = 'partially_paid';
        } else {
          invoiceStatus = 'invoiced_unpaid';
        }
      }

      const finalPrice = Number(order.final_price) || 0;
      const balanceDue = finalPrice - totalPaid;

      let paymentStatus = 'pending';
      if (totalPaid >= finalPrice) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      // Get customer name from the customers relation
      const customerName = (order as any).customers && Array.isArray((order as any).customers) && (order as any).customers.length > 0 
        ? (order as any).customers[0].name 
        : 'Unknown Customer';

      return {
        id: order.id,
        quote_id: order.quote_id,
        customer: {
          name: customerName
        },
        date: order.created_at.split('T')[0], // Convert timestamp to date
        status: order.status,
        supplier_name: 'Various', // Will be derived from items
        total: finalPrice, // Use final_price as total
        final_price: finalPrice,
        original_price: Number(order.original_price) || 0,
        discount_amount: Number(order.discount_amount) || 0,
        items: orderItemsList,
        
        // Enhanced payment and invoice information
        total_paid: totalPaid,
        balance_due: balanceDue,
        payment_status: paymentStatus,
        payment_count: paymentDetails.length,
        
        // Invoice information
        is_invoiced: isInvoiced,
        invoice_status: invoiceStatus,
        invoice_count: orderInvoices.length,
        invoices: invoiceDetails,
        payments: paymentDetails,
        
        // Sales representative
        sales_representative: salesRepMap.get(order.created_by) || null
      };
    }) || [];

    console.log(`✅ Successfully processed ${enrichedOrders.length} orders with comprehensive data`);
    
    // Log sample for debugging
    if (enrichedOrders.length > 0) {
      console.log('📋 Sample enriched order:', JSON.stringify(enrichedOrders[0], null, 2));
    }

    return NextResponse.json({
      orders: enrichedOrders,
      count: enrichedOrders.length,
      summary: {
        total_orders: enrichedOrders.length,
        invoiced_orders: enrichedOrders.filter(o => o.is_invoiced).length,
        paid_orders: enrichedOrders.filter(o => o.payment_status === 'paid').length,
        partial_paid_orders: enrichedOrders.filter(o => o.payment_status === 'partial').length,
        pending_orders: enrichedOrders.filter(o => o.payment_status === 'pending').length
      }
    });

  } catch (error) {
    console.error('💥 Finance Sales Orders API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
