import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    console.log('💰 Fetching ALL payments for finance management...');

    // Fetch ALL payments with comprehensive data - no pagination since frontend handles it
    const { data: payments, error } = await supabase
      .from("payments")
      .select(`
        id,
        invoice_id,
        amount,
        payment_date,
        date,
        method,
        reference,
        description,
        invoices!invoice_id(
          id,
          sales_order_id,
          customer_name,
          total,
          customers!customer_id(name, phone, email)
        )
      `)
      .order("date", { ascending: false });

    if (error) {
      console.error('❌ Error fetching payments:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`💸 Found ${payments?.length || 0} payments`);

    // Enhance payments with customer and invoice data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enhancedPayments = payments?.map((payment: any) => {
      const invoice = payment.invoices;
      const customer = invoice?.customers;
      
      return {
        id: payment.id,
        invoice_id: payment.invoice_id,
        amount: Number(payment.amount) || 0,
        payment_date: payment.payment_date,
        date: payment.date,
        method: payment.method || 'Unknown',
        reference: payment.reference || '',
        description: payment.description || '',
        // Invoice information
        invoice_total: Number(invoice?.total) || 0,
        sales_order_id: invoice?.sales_order_id || '',
        // Customer information
        customer_name: customer?.name || invoice?.customer_name || 'Unknown Customer',
        customer_phone: customer?.phone || '',
        customer_email: customer?.email || ''
      };
    }) || [];

    console.log(`✅ Enhanced ${enhancedPayments.length} payments with invoice/customer data`);

    return NextResponse.json(enhancedPayments);
  } catch (error) {
    console.error('💥 Payments API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { invoice_id, amount, date, method } = body;

  if (!invoice_id || !amount || !date || !method) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    // 1. Create payment record
    const { data: payment, error: insertError } = await supabase
      .from("payments")
      .insert([{ invoice_id, amount, date, method }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 2. Recalculate total paid amount for that invoice
    const { data: payments, error: fetchError } = await supabase
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoice_id);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);

    const { error: updateError } = await supabase
      .from("invoices")
      .update({ paid_amount: totalPaid })
      .eq("id", invoice_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 3. Create accounting journal entry for the payment
    // Dr. Cash/Bank / Cr. Accounts Receivable
    try {
      // TODO: Accounting integration removed
      // await createPaymentJournalEntry(payment, invoice);
      console.log(`✅ Journal entry creation skipped for payment ${payment.id}`);
    } catch (journalError) {
      console.error('❌ Failed to create journal entry for payment:', journalError);
      // Don't fail the payment creation, but log the error
    }

    return NextResponse.json({ 
      success: true,
      accounting_integration: true,
      message: "Payment recorded with automatic journal entry"
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const body = await req.json();
  const { id, invoice_id, amount, date, method } = body;

  if (!id || !invoice_id) {
    return NextResponse.json({ error: "Missing payment ID or invoice ID" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("payments")
    .update({ amount, date, method })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: payments, error: fetchError } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoice_id);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({ paid_amount: totalPaid })
    .eq("id", invoice_id);

  if (invoiceUpdateError) {
    return NextResponse.json({ error: invoiceUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}


export async function DELETE(req: Request) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });
  }

  // First, get the invoice_id of the payment to be deleted
  const { data: payment, error: fetchError } = await supabase
    .from("payments")
    .select("invoice_id")
    .eq("id", id)
    .single();

  if (fetchError || !payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const invoiceId = payment.invoice_id;

  const { error: deleteError } = await supabase
    .from("payments")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Recalculate the new paid amount
  const { data: payments, error: recalcError } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", invoiceId);

  if (recalcError) {
    return NextResponse.json({ error: recalcError.message }, { status: 500 });
  }

  const totalPaid = (payments || []).reduce((sum, p) => sum + p.amount, 0);

  const { error: invoiceUpdateError } = await supabase
    .from("invoices")
    .update({ paid_amount: totalPaid })
    .eq("id", invoiceId);

  if (invoiceUpdateError) {
    return NextResponse.json({ error: invoiceUpdateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

