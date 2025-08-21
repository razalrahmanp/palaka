// src/app/api/sales/orders/[id]/payments/route.ts
import { supabase } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure params is awaited properly
    const { id: orderId } = await params;
    
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
      .select(`
        id, 
        invoice_id, 
        amount, 
        payment_date, 
        method,
        reference
      `)
      .in('invoice_id', invoiceIds)
      .order('payment_date', { ascending: false });
      
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure params is awaited properly
    const { id: orderId } = await params;
    const body = await request.json();

    console.log('Payment creation request body:', body);
    console.log('Order ID:', orderId);

    const {
      amount,
      method,
      payment_date,
      bank_account_id
    } = body;

    // Validate required fields
    if (!amount || !method) {
      console.log('Validation failed: Missing amount or method', { amount, method });
      return NextResponse.json(
        { error: 'Amount and payment method are required' },
        { status: 400 }
      );
    }

    // Validate bank account for bank transfer and cheque methods
    if ((method === 'bank_transfer' || method === 'cheque') && (!bank_account_id || bank_account_id.trim() === '')) {
      console.log('Validation failed: Missing bank account for bank transfer/cheque', { method, bank_account_id });
      return NextResponse.json(
        { error: 'Bank account is required for bank transfer and cheque payments' },
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

    // If payment method is bank_transfer or cheque, create a bank transaction
    if ((method === 'bank_transfer' || method === 'cheque') && bank_account_id) {
      try {
        // Verify bank account exists
        const { data: bankAccount, error: bankAccountError } = await supabase
          .from('bank_accounts')
          .select('id, name, current_balance')
          .eq('id', bank_account_id)
          .single();

        if (bankAccountError || !bankAccount) {
          console.error('Bank account not found:', bankAccountError);
          // Don't fail the payment, just log the error
        } else {
          // Create bank transaction (credit - money coming in)
          const { error: transactionError } = await supabase
            .from('bank_transactions')
            .insert({
              bank_account_id: bank_account_id,
              type: 'credit',
              amount: parseFloat(amount),
              description: `Payment received for Sales Order #${orderId} via ${method}`,
              transaction_date: payment_date || new Date().toISOString().split('T')[0],
              reference_type: 'payment',
              reference_id: payment.id
            });

          if (transactionError) {
            console.error('Error creating bank transaction:', transactionError);
            // Don't fail the payment, just log the error
          } else {
            // Update bank account balance
            const newBalance = bankAccount.current_balance + parseFloat(amount);
            await supabase
              .from('bank_accounts')
              .update({ current_balance: newBalance })
              .eq('id', bank_account_id);
          }
        }
      } catch (bankError) {
        console.error('Error processing bank transaction:', bankError);
        // Don't fail the payment, just log the error
      }
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
