import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createVendorPaymentJournalEntry } from '@/lib/journalHelper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      amount,
      payment_date,
      payment_method,
      bank_account_id,
      reference_number,
      notes
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount is required and must be greater than 0' },
        { status: 400 }
      );
    }

    // Get the purchase order first
    const { data: purchaseOrder, error: poError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', params.id)
      .single();

    if (poError || !purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    // Check if payment amount doesn't exceed outstanding balance
    const outstandingAmount = purchaseOrder.total - (purchaseOrder.paid_amount || 0);
    if (amount > outstandingAmount) {
      return NextResponse.json(
        { error: `Payment amount (${amount}) cannot exceed outstanding balance (${outstandingAmount})` },
        { status: 400 }
      );
    }

    // Create payment record in vendor_payment_history
    const { data: payment, error: paymentError } = await supabase
      .from('vendor_payment_history')
      .insert({
        supplier_id: purchaseOrder.supplier_id,
        amount: amount,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        payment_method: payment_method || 'cash',
        bank_account_id: bank_account_id || null,
        reference_number: reference_number || null,
        description: notes || `Payment for PO ${purchaseOrder.purchase_order_number || purchaseOrder.id}`,
        status: 'completed',
        purchase_order_id: params.id
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // Update purchase order paid amount
    const newPaidAmount = (purchaseOrder.paid_amount || 0) + amount;
    const newStatus = newPaidAmount >= purchaseOrder.total ? 'paid' : 'partial';

    const { error: updateError } = await supabase
      .from('purchase_orders')
      .update({
        paid_amount: newPaidAmount,
        status: newStatus
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating purchase order:', updateError);
      // Try to rollback payment
      await supabase
        .from('vendor_payment_history')
        .delete()
        .eq('id', payment.id);
      
      return NextResponse.json(
        { error: 'Failed to update purchase order' },
        { status: 500 }
      );
    }

    // Create journal entry for the payment
    const journalResult = await createVendorPaymentJournalEntry({
      paymentId: payment.id,
      amount: amount,
      date: payment_date || new Date().toISOString().split('T')[0],
      reference: reference_number,
      description: `Payment for PO ${purchaseOrder.purchase_order_number || purchaseOrder.id}`,
      vendorId: purchaseOrder.supplier_id,
      paymentMethod: payment_method || 'cash',
      bankAccountId: bank_account_id
    });

    if (!journalResult.success) {
      console.warn('Journal entry creation failed:', journalResult.error);
      // Continue without journal entry for now, but log the error
    } else {
      console.log('✅ Journal entry created successfully:', journalResult.journalEntryId);
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: payment,
        purchase_order: {
          ...purchaseOrder,
          paid_amount: newPaidAmount,
          status: newStatus
        },
        journal_entry_id: journalResult.success ? journalResult.journalEntryId : null
      }
    });

  } catch (error) {
    console.error('Error processing PO payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
