// app/api/vendors/[id]/payments/route.ts
import { supabase } from '@/lib/supabaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;

    // First try to get from new vendor_payment_history table
    const { data: newPayments, error: newError } = await supabase
      .from('vendor_payment_history')
      .select(`
        id,
        amount,
        payment_date as date,
        payment_method as method,
        reference_number as reference,
        notes as description,
        status
      `)
      .eq('supplier_id', vendorId)
      .order('payment_date', { ascending: false });

    if (!newError && newPayments && newPayments.length > 0) {
      return NextResponse.json(newPayments);
    }

    // Fallback to purchase_order_payments for existing data
    const { data: poPayments, error: poError } = await supabase
      .from('purchase_order_payments')
      .select(`
        id,
        amount,
        payment_date,
        purchase_orders!inner(supplier_id)
      `)
      .eq('purchase_orders.supplier_id', vendorId)
      .order('payment_date', { ascending: false });

    if (poError) throw poError;

    // Format the data consistently
    const formattedPayments = poPayments?.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      date: payment.payment_date,
      method: 'cash', // default for old records
      reference: null,
      description: 'Purchase Order Payment',
      status: 'Paid'
    })) || [];

    return NextResponse.json(formattedPayments);
  } catch (error) {
    console.error('GET /api/vendors/[id]/payments error', error);
    return NextResponse.json({ error: 'Failed to fetch payment data' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vendorId } = await params;
    const body = await request.json();

    const {
      amount,
      payment_date,
      payment_method = 'cash',
      reference_number,
      notes,
      purchase_order_id,
      created_by
    } = body;

    // Insert into vendor_payment_history table
    const { data: payment, error: paymentError } = await supabase
      .from('vendor_payment_history')
      .insert({
        supplier_id: vendorId,
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes,
        purchase_order_id,
        created_by,
        status: 'completed'
      })
      .select()
      .single();

    if (paymentError) {
      // Fallback to purchase_order_payments for compatibility
      const { data: poPayment, error: poError } = await supabase
        .from('purchase_order_payments')
        .insert({
          purchase_order_id,
          amount,
          payment_date
        })
        .select()
        .single();

      if (poError) throw poError;

      // Update purchase order paid amount
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({ 
          paid_amount: supabase.rpc('coalesce_sum', { value: amount })
        })
        .eq('id', purchase_order_id);

      if (updateError) console.error('Error updating PO paid amount:', updateError);

      return NextResponse.json(poPayment, { status: 201 });
    }

    // Update purchase order paid amount if PO is provided
    if (purchase_order_id) {
      const { data: currentPO } = await supabase
        .from('purchase_orders')
        .select('paid_amount')
        .eq('id', purchase_order_id)
        .single();

      const newPaidAmount = (currentPO?.paid_amount || 0) + amount;

      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({ paid_amount: newPaidAmount })
        .eq('id', purchase_order_id);

      if (updateError) console.error('Error updating PO paid amount:', updateError);
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
