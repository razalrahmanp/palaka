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
    
    // Get all payments for the order
    const { data: payments, error } = await supabase
      .from('sales_order_payments')
      .select(`
        id,
        payment_date,
        amount,
        payment_method,
        payment_type,
        reference_number,
        bank_name,
        cheque_number,
        upi_transaction_id,
        card_last_four,
        payment_gateway_reference,
        notes,
        status,
        created_at,
        created_by,
        users:created_by(name)
      `)
      .eq('sales_order_id', orderId)
      .order('payment_date', { ascending: false });
      
    if (error) {
      console.error('Supabase error fetching payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Get order total and payment summary
    const { data: orderSummary, error: summaryError } = await supabase
      .from('sales_order_payment_summary')
      .select('*')
      .eq('sales_order_id', orderId)
      .single();

    if (summaryError) {
      console.log('Summary error:', summaryError);
    }

    return NextResponse.json({
      payments: payments || [],
      summary: orderSummary || null
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
      payment_method,
      payment_type = 'advance',
      reference_number,
      bank_name,
      cheque_number,
      upi_transaction_id,
      card_last_four,
      payment_gateway_reference,
      notes,
      payment_date,
      created_by
    } = body;

    // Validate required fields
    if (!amount || !payment_method || !created_by) {
      return NextResponse.json(
        { error: 'Amount, payment method, and created_by are required' },
        { status: 400 }
      );
    }

    // Insert the payment
    const { data: payment, error } = await supabase
      .from('sales_order_payments')
      .insert({
        sales_order_id: orderId,
        amount: parseFloat(amount),
        payment_method,
        payment_type,
        reference_number,
        bank_name,
        cheque_number,
        upi_transaction_id,
        card_last_four,
        payment_gateway_reference,
        notes,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        status: 'completed',
        created_by,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        payment_date,
        amount,
        payment_method,
        payment_type,
        reference_number,
        status,
        created_at
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update invoice paid amount if invoice exists
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, paid_amount, total')
      .eq('sales_order_id', orderId)
      .single();

    if (invoice) {
      const newPaidAmount = (invoice.paid_amount || 0) + parseFloat(amount);
      const invoiceStatus = newPaidAmount >= invoice.total ? 'paid' : 'partial';
      
      await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          status: invoiceStatus
        })
        .eq('id', invoice.id);
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
