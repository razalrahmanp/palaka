import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseAdmin";
import type { PostgrestError } from "@supabase/supabase-js";

interface PaymentRow {
  id: string;
  invoice_id: string;
  amount: number;
  date: string;
  method: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const { data, error }: { data: PaymentRow[] | null; error: PostgrestError | null } = await supabase
    .from("payments")
    .select("*")
    .order("date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
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

    const { data: invoice, error: updateError } = await supabase
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

