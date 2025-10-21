// Reversal Payment Collection API
// File: src/app/api/vendors/[id]/bills/[billId]/collect-payment/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabasePool';

interface CollectPaymentPayload {
  method: 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'card';
  bank_account_id?: string;
  cheque_number?: string;
  reference_number?: string;
  notes?: string;
  collected_by: string;
}

// POST - Collect reversal payment for processed returns
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; billId: string }> }
) {
  try {
    const { id: vendorId, billId } = await params;
    const payload: CollectPaymentPayload = await request.json();

    // Validate required fields
    if (!payload.method || !payload.collected_by) {
      return NextResponse.json(
        { error: 'Missing required fields: method, collected_by' },
        { status: 400 }
      );
    }

    // Get processed returns for this bill
    const { data: processedReturns, error: returnsError } = await supabase
      .from('purchase_returns')
      .select(`
        *,
        vendor_bills(bill_number, total_amount),
        suppliers(name)
      `)
      .eq('vendor_bill_id', billId)
      .eq('supplier_id', vendorId)
      .eq('status', 'processed')
      .eq('is_payment_collected', false);

    if (returnsError) throw returnsError;

    if (!processedReturns || processedReturns.length === 0) {
      return NextResponse.json(
        { error: 'No processed returns found for payment collection' },
        { status: 404 }
      );
    }

    // Calculate total payment amount
    const totalPaymentAmount = processedReturns.reduce((sum, ret) => sum + ret.net_return_amount, 0);

    // Create payment collection record
    const { data: paymentCollection, error: paymentError } = await supabase
      .from('purchase_return_payments')
      .insert({
        vendor_bill_id: billId,
        supplier_id: vendorId,
        total_amount: totalPaymentAmount,
        payment_method: payload.method,
        bank_account_id: payload.bank_account_id,
        cheque_number: payload.cheque_number,
        reference_number: payload.reference_number,
        payment_date: new Date().toISOString().split('T')[0],
        notes: payload.notes,
        collected_by: payload.collected_by,
        status: 'completed'
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Create bank transaction if bank method is used
    if (payload.bank_account_id && ['bank_transfer', 'cheque', 'upi', 'card'].includes(payload.method)) {
      const { error: bankTransactionError } = await supabase
        .from('bank_transactions')
        .insert({
          bank_account_id: payload.bank_account_id,
          date: new Date().toISOString().split('T')[0],
          type: 'deposit',
          amount: totalPaymentAmount,
          description: `Purchase return payment collection - ${processedReturns.map(r => r.return_number).join(', ')}`,
          reference: payload.reference_number || paymentCollection.id
        });

      if (bankTransactionError) {
        console.error('Error creating bank transaction:', bankTransactionError);
      } else {
        // Update bank account balance
        const { error: balanceError } = await supabase.rpc('update_bank_balance', {
          account_id: payload.bank_account_id,
          amount_change: totalPaymentAmount
        });

        if (balanceError) {
          console.error('Error updating bank balance:', balanceError);
        }
      }
    }

    // Create expense reversal entry
    const { error: expenseError } = await supabase
      .from('expenses')
      .insert({
        date: new Date().toISOString().split('T')[0],
        category: 'Purchase Returns',
        description: `Purchase return payment collection - ${processedReturns.map(r => r.return_number).join(', ')}`,
        amount: -totalPaymentAmount, // Negative amount for return
        payment_method: payload.method,
        entity_type: 'supplier',
        entity_id: vendorId,
        vendor_bill_id: billId
      });

    if (expenseError) {
      console.error('Error creating expense reversal record:', expenseError);
    }

    // Update all processed returns to mark payment as collected
    const returnIds = processedReturns.map(r => r.id);
    const { error: updateReturnsError } = await supabase
      .from('purchase_returns')
      .update({
        is_payment_collected: true,
        payment_collected_at: new Date().toISOString(),
        status: 'completed'
      })
      .in('id', returnIds);

    if (updateReturnsError) {
      console.error('Error updating returns payment status:', updateReturnsError);
    }

    // Link returns to payment collection
    const paymentLinkInserts = returnIds.map(returnId => ({
      purchase_return_id: returnId,
      payment_collection_id: paymentCollection.id
    }));

    const { error: linkError } = await supabase
      .from('purchase_return_payment_links')
      .insert(paymentLinkInserts);

    if (linkError) {
      console.error('Error linking returns to payment:', linkError);
    }

    return NextResponse.json({
      ...paymentCollection,
      processed_returns: processedReturns,
      total_amount: totalPaymentAmount
    }, { status: 201 });

  } catch (error) {
    console.error('Error collecting reversal payment:', error);
    return NextResponse.json(
      { error: 'Failed to collect reversal payment' },
      { status: 500 }
    );
  }
}

// GET - Get payment collection history for a bill
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; billId: string }> }
) {
  try {
    const { billId } = await params;

    const { data: payments, error } = await supabase
      .from('purchase_return_payments')
      .select(`
        *,
        purchase_return_payment_links(
          purchase_return_id,
          purchase_returns(return_number, net_return_amount)
        )
      `)
      .eq('vendor_bill_id', billId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(payments || []);
  } catch (error) {
    console.error('Error fetching payment collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment collections' },
      { status: 500 }
    );
  }
}