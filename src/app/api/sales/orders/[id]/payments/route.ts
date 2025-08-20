// src/app/api/sales/orders/[id]/payments/route.ts
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is awaited properly
    const { id: orderId } = await Promise.resolve(params);
    
    // Log the orderId for debugging
    console.log('Fetching payments for orderId:', orderId);
    
    // Get all invoices for this sales order
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('id')
      .eq('sales_order_id', orderId);
      
    if (invoiceError) {
      console.error('Error fetching invoices:', invoiceError);
      return NextResponse.json({
        payments: [],
        summary: { total_paid: 0, payment_count: 0 }
      });
    }
    
    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        payments: [],
        summary: { total_paid: 0, payment_count: 0 }
      });
    }
    
    const invoiceIds = invoices.map(inv => inv.id);
    
    // Get payments for these invoices using actual database columns only
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, invoice_id, amount, date, method')
      .in('invoice_id', invoiceIds)
      .order('date', { ascending: false });
      
    if (error) {
      console.error('Supabase error fetching payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Calculate summary data
    const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

    return NextResponse.json({
      payments: payments || [],
      summary: {
        total_paid: totalPaid,
        payment_count: payments?.length || 0
      }
    });

  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is awaited properly
    const { id: orderId } = await Promise.resolve(params);
    const body = await request.json();

    const {
      amount,
      method,
      payment_date
    } = body;

    // Validate required fields
    if (!amount || !method) {
      return NextResponse.json(
        { error: 'Amount and payment method are required' },
        { status: 400 }
      );
    }

    // Get the sales order details using correct column names
    const { data: orderData, error: orderError } = await supabase
      .from('sales_orders')
      .select('customer_id, final_price')
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      console.error('Sales order not found:', orderError);
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      );
    }

    // Check if invoice exists for this order, create if not
    let { data: invoice } = await supabase
      .from('invoices')
      .select('id, paid_amount, total')
      .eq('sales_order_id', orderId)
      .single();

    // If no invoice exists, create one automatically
    if (!invoice) {
      // Get customer name for invoice
      const { data: customerData } = await supabase
        .from('customers')
        .select('name')
        .eq('id', orderData.customer_id)
        .single();
      
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          sales_order_id: orderId,
          customer_id: orderData.customer_id,
          customer_name: customerData?.name || 'Unknown Customer',
          total: orderData.final_price || 0,
          paid_amount: parseFloat(amount),
          status: parseFloat(amount) >= (orderData.final_price || 0) ? 'paid' : 'unpaid'
        })
        .select('id, paid_amount, total')
        .single();

      if (invoiceError) {
        console.error('Error creating invoice:', invoiceError);
        return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
      } else {
        invoice = newInvoice;
      }
    } else {
      // Update existing invoice
      const newPaidAmount = (invoice.paid_amount || 0) + parseFloat(amount);
      const invoiceStatus = newPaidAmount >= invoice.total ? 'paid' : 'unpaid';
      
      await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          status: invoiceStatus
        })
        .eq('id', invoice.id);
    }

    // Insert the payment using the actual database structure
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        invoice_id: invoice.id,
        amount: parseFloat(amount),
        method,
        date: payment_date || new Date().toISOString().split('T')[0]
      })
      .select('id, invoice_id, amount, date, method')
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(payment);

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
